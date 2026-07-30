-- SharedLife remote bootstrap – einmal im Supabase SQL Editor ausführen
-- Project: uoqlusgimvinjmajtesz
begin;

-- >>> 20260101000001_extensions_and_helpers.sql
-- SharedLife: Extensions und Hilfsfunktionen
-- Unabhängig lauffähig auf frischer Datenbank

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ---------------------------------------------------------------------------
-- Trigger-Helfer: updated_at automatisch setzen
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Setzt updated_at auf den aktuellen UTC-Zeitstempel (vor INSERT/UPDATE).';

-- ---------------------------------------------------------------------------
-- Aktueller authentifizierter Benutzer (auth.users.id)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select auth.uid();
$$;

comment on function public.current_user_id() is
  'Gibt die UUID des aktuell eingeloggten Supabase-Auth-Benutzers zurück.';

-- ---------------------------------------------------------------------------
-- Mitgliedschaftsprüfung (SECURITY DEFINER, fester search_path)
-- Wird in RLS-Policies verwendet; Tabelle space_members folgt in Migration 2.
-- ---------------------------------------------------------------------------
create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members sm
    where sm.space_id = p_space_id
      and sm.user_id = auth.uid()
  );
$$;

comment on function public.is_space_member(uuid) is
  'Prüft, ob auth.uid() Mitglied des angegebenen Space ist.';

-- ---------------------------------------------------------------------------
-- Service-Role-Prüfung (für eingeschränkte Insert-Policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_service_role()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    current_setting('role', true)
  ) = 'service_role';
$$;

comment on function public.is_service_role() is
  'True wenn der aktuelle JWT die service_role trägt (Edge Functions, Cron).';


-- >>> 20260101000002_core_tables.sql
-- SharedLife: Kern-Tabellen (spaces, profiles, space_members, devices)

-- ---------------------------------------------------------------------------
-- spaces – gemeinsamer Lebensraum (V1: genau ein Space für Dennis & Lea)
-- ---------------------------------------------------------------------------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  timezone text not null default 'Europe/Zurich',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_spaces_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

comment on table public.spaces is 'Gemeinsamer Space; V1 mit genau zwei Mitgliedern.';

-- ---------------------------------------------------------------------------
-- profiles – öffentliches Profil pro auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'Europe/Zurich',
  locale text not null default 'de-CH',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is 'Benutzerprofil; id = auth.users.id.';

-- ---------------------------------------------------------------------------
-- space_members – Mitgliedschaft (nicht client-schreibbar)
-- ---------------------------------------------------------------------------
create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint space_members_space_user_unique unique (space_id, user_id)
);

create index idx_space_members_user_id on public.space_members (user_id);
create index idx_space_members_space_id on public.space_members (space_id);

create trigger trg_space_members_updated_at
  before update on public.space_members
  for each row execute function public.set_updated_at();

comment on table public.space_members is
  'Space-Mitgliedschaft; INSERT/UPDATE/DELETE nur via Service Role oder Admin.';

-- ---------------------------------------------------------------------------
-- devices – Sync-Geräte (client-generierte UUID)
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key,
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Unbenanntes Gerät',
  platform text,
  user_agent text,
  app_version text,
  last_seen_at timestamptz,
  push_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint devices_space_user_id unique (space_id, user_id, id)
);

create index idx_devices_space_user on public.devices (space_id, user_id)
  where deleted_at is null;

create trigger trg_devices_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

comment on table public.devices is
  'Registrierte Client-Geräte für Sync und Push; id wird clientseitig vergeben.';

-- ---------------------------------------------------------------------------
-- Profil bei Auth-Signup anlegen (Service Role / Auth Hook Ersatz für lokal)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- >>> 20260101000003_entities.sql
-- SharedLife: Kanonische Entity-Tabelle (polymorph, versioniert, soft delete)

-- ---------------------------------------------------------------------------
-- entities – ein Datensatz pro Information
-- ---------------------------------------------------------------------------
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_type text not null
    check (entity_type in (
      'trip', 'date', 'goal', 'event', 'task', 'list',
      'wish', 'moment', 'project', 'note', 'milestone'
    )),
  title text not null default '',
  subtitle text,
  description text,
  status text not null default 'active'
    check (status in ('active', 'archived', 'completed', 'cancelled', 'draft')),
  color text,
  icon text,
  -- Zeitliche Felder: timestamptz für exakte Zeitpunkte, date für ganztägig
  starts_at timestamptz,
  ends_at timestamptz,
  all_day_start date,
  all_day_end date,
  cover_media_id uuid,
  parent_entity_id uuid references public.entities (id) on delete set null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version >= 1),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,
  constraint entities_time_range_check check (
    starts_at is null
    or ends_at is null
    or ends_at >= starts_at
  ),
  constraint entities_all_day_range_check check (
    all_day_start is null
    or all_day_end is null
    or all_day_end >= all_day_start
  )
);

-- Indizes für typische Abfragen
create index idx_entities_space_active
  on public.entities (space_id)
  where deleted_at is null;

create index idx_entities_space_type_active
  on public.entities (space_id, entity_type)
  where deleted_at is null;

create index idx_entities_space_updated
  on public.entities (space_id, updated_at desc)
  where deleted_at is null;

create index idx_entities_parent
  on public.entities (parent_entity_id)
  where deleted_at is null and parent_entity_id is not null;

create index idx_entities_starts_at
  on public.entities (space_id, starts_at)
  where deleted_at is null and starts_at is not null;

create index idx_entities_all_day_start
  on public.entities (space_id, all_day_start)
  where deleted_at is null and all_day_start is not null;

create index idx_entities_metadata_gin
  on public.entities using gin (metadata);

create index idx_entities_deleted
  on public.entities (space_id, deleted_at desc)
  where deleted_at is not null;

create trigger trg_entities_updated_at
  before update on public.entities
  for each row execute function public.set_updated_at();

comment on table public.entities is
  'Kanonischer Datensatz; Fachdaten in *_details, Verknüpfungen in entity_links.';

comment on column public.entities.version is
  'Optimistic-Concurrency-Version; wird nur bei echten Änderungen erhöht.';

comment on column public.entities.deleted_at is
  'Soft Delete; Papierkorb bis endgültige Bereinigung via Service Role.';

-- cover_media_id FK wird nach media_assets angelegt (Migration 5)


-- >>> 20260101000004_entity_details.sql
-- SharedLife: Typspezifische Erweiterungstabellen (1:1 mit entities)

-- ---------------------------------------------------------------------------
-- trip_details
-- ---------------------------------------------------------------------------
create table public.trip_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  destination text,
  departure_location text,
  transport_mode text,
  accommodation text,
  booking_reference text,
  budget_amount numeric(14, 2),
  budget_currency text not null default 'CHF',
  packing_list_entity_id uuid references public.entities (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trip_details_entity_type check (
    exists (
      select 1 from public.entities e
      where e.id = entity_id and e.entity_type = 'trip'
    )
  )
);

create index idx_trip_details_space on public.trip_details (space_id);

create trigger trg_trip_details_updated_at
  before update on public.trip_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- date_details (Romantik-/Date-Planung)
-- ---------------------------------------------------------------------------
create table public.date_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  occasion text,
  venue_name text,
  dress_code text,
  mood text,
  surprise boolean not null default false,
  reservation_reference text,
  estimated_cost numeric(14, 2),
  cost_currency text not null default 'CHF',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_date_details_space on public.date_details (space_id);

create trigger trg_date_details_updated_at
  before update on public.date_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goal_details
-- ---------------------------------------------------------------------------
create table public.goal_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  category text,
  target_date date,
  progress_percent smallint not null default 0
    check (progress_percent between 0 and 100),
  motivation text,
  achieved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_goal_details_space on public.goal_details (space_id);

create trigger trg_goal_details_updated_at
  before update on public.goal_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- event_details (Kalendertermine)
-- ---------------------------------------------------------------------------
create table public.event_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  location_name text,
  recurrence_rule text,
  recurrence_exception_dates date[],
  calendar_color text,
  is_busy boolean not null default true,
  reminder_minutes_before integer[],
  external_calendar_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_event_details_space on public.event_details (space_id);

create trigger trg_event_details_updated_at
  before update on public.event_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- task_details
-- ---------------------------------------------------------------------------
create table public.task_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  due_at timestamptz,
  due_date date,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  assignee_id uuid references auth.users (id) on delete set null,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_task_details_space on public.task_details (space_id);
create index idx_task_details_assignee on public.task_details (assignee_id)
  where completed_at is null;

create trigger trg_task_details_updated_at
  before update on public.task_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- list_details
-- ---------------------------------------------------------------------------
create table public.list_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  list_kind text not null default 'generic'
    check (list_kind in ('generic', 'shopping', 'packing', 'todo', 'wishlist', 'checklist')),
  is_checkable boolean not null default true,
  template_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_list_details_space on public.list_details (space_id);

create trigger trg_list_details_updated_at
  before update on public.list_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wish_details
-- ---------------------------------------------------------------------------
create table public.wish_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  url text,
  price numeric(14, 2),
  currency text not null default 'CHF',
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'dream')),
  acquired_at timestamptz,
  acquired_by uuid references auth.users (id) on delete set null,
  for_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_wish_details_space on public.wish_details (space_id);

create trigger trg_wish_details_updated_at
  before update on public.wish_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- moment_details (Foto-/Erinnerungsmomente)
-- ---------------------------------------------------------------------------
create table public.moment_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  captured_at timestamptz,
  mood text,
  weather text,
  highlight boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_moment_details_space on public.moment_details (space_id);
create index idx_moment_details_captured on public.moment_details (space_id, captured_at desc);

create trigger trg_moment_details_updated_at
  before update on public.moment_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_details
-- ---------------------------------------------------------------------------
create table public.project_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  start_date date,
  target_end_date date,
  actual_end_date date,
  progress_percent smallint not null default 0
    check (progress_percent between 0 and 100),
  category text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_project_details_space on public.project_details (space_id);

create trigger trg_project_details_updated_at
  before update on public.project_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- milestone_details
-- ---------------------------------------------------------------------------
create table public.milestone_details (
  entity_id uuid primary key references public.entities (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  project_entity_id uuid references public.entities (id) on delete cascade,
  target_date date,
  achieved_at timestamptz,
  weight smallint not null default 1 check (weight >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_milestone_details_space on public.milestone_details (space_id);
create index idx_milestone_details_project on public.milestone_details (project_entity_id);

create trigger trg_milestone_details_updated_at
  before update on public.milestone_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- space_id Konsistenz: muss mit entities.space_id übereinstimmen
-- ---------------------------------------------------------------------------
create or replace function public.enforce_detail_space_id()
returns trigger
language plpgsql
as $$
declare
  v_space_id uuid;
begin
  select e.space_id into v_space_id
  from public.entities e
  where e.id = new.entity_id;

  if v_space_id is null then
    raise exception 'entity % does not exist', new.entity_id;
  end if;

  new.space_id := v_space_id;
  return new;
end;
$$;

create trigger trg_trip_details_space before insert or update on public.trip_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_date_details_space before insert or update on public.date_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_goal_details_space before insert or update on public.goal_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_event_details_space before insert or update on public.event_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_task_details_space before insert or update on public.task_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_list_details_space before insert or update on public.list_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_wish_details_space before insert or update on public.wish_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_moment_details_space before insert or update on public.moment_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_project_details_space before insert or update on public.project_details
  for each row execute function public.enforce_detail_space_id();
create trigger trg_milestone_details_space before insert or update on public.milestone_details
  for each row execute function public.enforce_detail_space_id();

-- Entity-Typ-Validierung via Trigger (CHECK mit Subquery ist in PG nicht erlaubt)
create or replace function public.enforce_entity_type_for_detail()
returns trigger
language plpgsql
as $$
declare
  v_type text;
  v_expected text;
begin
  v_expected := tg_argv[0];
  select e.entity_type into v_type
  from public.entities e
  where e.id = new.entity_id;

  if v_type is distinct from v_expected then
    raise exception 'entity % has type %, expected % for table %',
      new.entity_id, v_type, v_expected, TG_TABLE_NAME;
  end if;

  return new;
end;
$$;

create trigger trg_trip_details_type before insert or update on public.trip_details
  for each row execute function public.enforce_entity_type_for_detail('trip');
create trigger trg_date_details_type before insert or update on public.date_details
  for each row execute function public.enforce_entity_type_for_detail('date');
create trigger trg_goal_details_type before insert or update on public.goal_details
  for each row execute function public.enforce_entity_type_for_detail('goal');
create trigger trg_event_details_type before insert or update on public.event_details
  for each row execute function public.enforce_entity_type_for_detail('event');
create trigger trg_task_details_type before insert or update on public.task_details
  for each row execute function public.enforce_entity_type_for_detail('task');
create trigger trg_list_details_type before insert or update on public.list_details
  for each row execute function public.enforce_entity_type_for_detail('list');
create trigger trg_wish_details_type before insert or update on public.wish_details
  for each row execute function public.enforce_entity_type_for_detail('wish');
create trigger trg_moment_details_type before insert or update on public.moment_details
  for each row execute function public.enforce_entity_type_for_detail('moment');
create trigger trg_project_details_type before insert or update on public.project_details
  for each row execute function public.enforce_entity_type_for_detail('project');
create trigger trg_milestone_details_type before insert or update on public.milestone_details
  for each row execute function public.enforce_entity_type_for_detail('milestone');


-- >>> 20260101000005_related_tables.sql
-- SharedLife: Verknüpfungen, Inhalte, Finanzen, Medien, Timeline, Sync-Metadaten

-- ---------------------------------------------------------------------------
-- entity_links – gerichtete Beziehungen zwischen Entities
-- ---------------------------------------------------------------------------
create table public.entity_links (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  source_entity_id uuid not null references public.entities (id) on delete cascade,
  target_entity_id uuid not null references public.entities (id) on delete cascade,
  link_type text not null default 'related'
    check (link_type in (
      'related', 'parent', 'child', 'blocks', 'blocked_by',
      'part_of', 'has_part', 'inspired_by', 'duplicate_of'
    )),
  label text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint entity_links_no_self_link check (source_entity_id <> target_entity_id),
  constraint entity_links_unique_pair unique (space_id, source_entity_id, target_entity_id, link_type)
);

create index idx_entity_links_source on public.entity_links (source_entity_id)
  where deleted_at is null;
create index idx_entity_links_target on public.entity_links (target_entity_id)
  where deleted_at is null;
create index idx_entity_links_space on public.entity_links (space_id)
  where deleted_at is null;

create trigger trg_entity_links_updated_at
  before update on public.entity_links
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notes – Markdown-Inhalt (entity_type = note oder Anhang an andere Entities)
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid not null unique references public.entities (id) on delete cascade,
  content text not null default '',
  content_format text not null default 'markdown'
    check (content_format in ('markdown', 'plain')),
  word_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_notes_space on public.notes (space_id) where deleted_at is null;

create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- checklists & checklist_items
-- ---------------------------------------------------------------------------
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid not null references public.entities (id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_checklists_entity on public.checklists (entity_id)
  where deleted_at is null;

create trigger trg_checklists_updated_at
  before update on public.checklists
  for each row execute function public.set_updated_at();

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  title text not null default '',
  is_checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references auth.users (id) on delete set null,
  assignee_id uuid references auth.users (id) on delete set null,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_checklist_items_checklist on public.checklist_items (checklist_id, sort_order)
  where deleted_at is null;

create trigger trg_checklist_items_updated_at
  before update on public.checklist_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- budgets & transactions (Geld immer numeric(14,2))
-- ---------------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete set null,
  name text not null,
  description text,
  currency text not null default 'CHF',
  amount_limit numeric(14, 2),
  amount_spent numeric(14, 2) not null default 0,
  period_start date,
  period_end date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint budgets_amounts_non_negative check (
    (amount_limit is null or amount_limit >= 0)
    and amount_spent >= 0
  )
);

create index idx_budgets_space on public.budgets (space_id) where deleted_at is null;
create index idx_budgets_entity on public.budgets (entity_id) where deleted_at is null;

create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  budget_id uuid references public.budgets (id) on delete set null,
  entity_id uuid references public.entities (id) on delete set null,
  amount numeric(14, 2) not null,
  currency text not null default 'CHF',
  description text not null default '',
  category text,
  transaction_date date not null default current_date,
  paid_by uuid references auth.users (id) on delete set null,
  is_income boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_transactions_space_date
  on public.transactions (space_id, transaction_date desc)
  where deleted_at is null;
create index idx_transactions_budget
  on public.transactions (budget_id)
  where deleted_at is null;

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- locations & entity_locations
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null,
  address_line text,
  city text,
  country_code text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  place_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_locations_space on public.locations (space_id) where deleted_at is null;

create trigger trg_locations_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create table public.entity_locations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid not null references public.entities (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  role text not null default 'venue'
    check (role in ('venue', 'start', 'end', 'stopover', 'home', 'other')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint entity_locations_unique unique (entity_id, location_id, role)
);

create index idx_entity_locations_entity on public.entity_locations (entity_id);

-- ---------------------------------------------------------------------------
-- media_assets & entity_media
-- Pfadkonvention Storage: {space_id}/{media_id}/{variant}/{filename}
-- ---------------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  width integer check (width is null or width >= 0),
  height integer check (height is null or height >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  blurhash text,
  variant text not null default 'original'
    check (variant in ('original', 'display', 'thumb', 'blur')),
  parent_media_id uuid references public.media_assets (id) on delete cascade,
  uploaded_by uuid references auth.users (id) on delete set null,
  taken_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint media_assets_path_unique unique (space_id, storage_path)
);

create index idx_media_assets_space on public.media_assets (space_id)
  where deleted_at is null;
create index idx_media_assets_parent on public.media_assets (parent_media_id)
  where parent_media_id is not null;

create trigger trg_media_assets_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

alter table public.entities
  add constraint entities_cover_media_fk
  foreign key (cover_media_id) references public.media_assets (id) on delete set null;

create table public.entity_media (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid not null references public.entities (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  role text not null default 'gallery'
    check (role in ('cover', 'gallery', 'attachment', 'avatar')),
  sort_order integer not null default 0,
  caption text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint entity_media_unique unique (entity_id, media_id)
);

create index idx_entity_media_entity on public.entity_media (entity_id, sort_order);

-- ---------------------------------------------------------------------------
-- timeline_entries & timeline_entry_media (gemeinsame Geschichte)
-- ---------------------------------------------------------------------------
create table public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete set null,
  entry_type text not null default 'memory'
    check (entry_type in ('memory', 'milestone', 'trip_day', 'anniversary', 'custom')),
  title text not null default '',
  body text,
  occurred_at timestamptz not null,
  occurred_on date,
  highlight boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_timeline_entries_space_time
  on public.timeline_entries (space_id, occurred_at desc)
  where deleted_at is null;

create trigger trg_timeline_entries_updated_at
  before update on public.timeline_entries
  for each row execute function public.set_updated_at();

create table public.timeline_entry_media (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  timeline_entry_id uuid not null references public.timeline_entries (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint timeline_entry_media_unique unique (timeline_entry_id, media_id)
);

create index idx_timeline_entry_media_entry
  on public.timeline_entry_media (timeline_entry_id, sort_order);

-- ---------------------------------------------------------------------------
-- activity_log – Append-only Audit (Insert nur Service Role / SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  device_id uuid references public.devices (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  mutation_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_activity_log_space_time
  on public.activity_log (space_id, created_at desc);
create index idx_activity_log_entity
  on public.activity_log (entity_id, created_at desc)
  where entity_id is not null;
create index idx_activity_log_mutation
  on public.activity_log (mutation_id)
  where mutation_id is not null;

-- ---------------------------------------------------------------------------
-- conflict_versions – Versionskonflikte bei Sync
-- ---------------------------------------------------------------------------
create table public.conflict_versions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid not null references public.entities (id) on delete cascade,
  mutation_id uuid not null,
  client_version integer not null,
  server_version integer not null,
  client_payload jsonb not null,
  server_payload jsonb not null,
  device_id uuid references public.devices (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolution text check (resolution is null or resolution in ('keep_server', 'keep_client', 'merged')),
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_conflict_versions_entity
  on public.conflict_versions (entity_id, created_at desc);
create index idx_conflict_versions_unresolved
  on public.conflict_versions (space_id)
  where resolved_at is null;

-- ---------------------------------------------------------------------------
-- mutation_receipts – Idempotente Sync-Bestätigungen
-- ---------------------------------------------------------------------------
create table public.mutation_receipts (
  id uuid primary key default gen_random_uuid(),
  mutation_id uuid not null unique,
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  device_id uuid references public.devices (id) on delete set null,
  operation text not null
    check (operation in ('create', 'update', 'soft_delete', 'restore', 'upsert')),
  table_name text not null,
  result_version integer,
  result_payload jsonb,
  applied_at timestamptz not null default timezone('utc', now())
);

create index idx_mutation_receipts_space_time
  on public.mutation_receipts (space_id, applied_at desc);
create index idx_mutation_receipts_entity
  on public.mutation_receipts (entity_id)
  where entity_id is not null;

-- ---------------------------------------------------------------------------
-- space_id Konsistenz für abhängige Tabellen
-- ---------------------------------------------------------------------------
create or replace function public.enforce_child_space_id()
returns trigger
language plpgsql
as $$
declare
  v_space_id uuid;
  v_parent_col text := tg_argv[0];
begin
  if v_parent_col = 'entity_id' then
    select e.space_id into v_space_id from public.entities e where e.id = new.entity_id;
  elsif v_parent_col = 'checklist_id' then
    select c.space_id into v_space_id from public.checklists c where c.id = new.checklist_id;
  elsif v_parent_col = 'budget_id' then
    select b.space_id into v_space_id from public.budgets b where b.id = new.budget_id;
  elsif v_parent_col = 'timeline_entry_id' then
    select t.space_id into v_space_id from public.timeline_entries t where t.id = new.timeline_entry_id;
  elsif v_parent_col = 'location_id' then
    select l.space_id into v_space_id from public.locations l where l.id = new.location_id;
  elsif v_parent_col = 'media_id' then
    select m.space_id into v_space_id from public.media_assets m where m.id = new.media_id;
  else
    return new;
  end if;

  if v_space_id is null then
    raise exception 'parent record not found for %', v_parent_col;
  end if;

  if new.space_id is distinct from v_space_id then
    new.space_id := v_space_id;
  end if;

  return new;
end;
$$;

create trigger trg_notes_space before insert or update on public.notes
  for each row execute function public.enforce_child_space_id('entity_id');
create trigger trg_checklists_space before insert or update on public.checklists
  for each row execute function public.enforce_child_space_id('entity_id');
create trigger trg_checklist_items_space before insert or update on public.checklist_items
  for each row execute function public.enforce_child_space_id('checklist_id');
create trigger trg_entity_locations_space before insert or update on public.entity_locations
  for each row execute function public.enforce_child_space_id('entity_id');
create trigger trg_entity_media_space before insert or update on public.entity_media
  for each row execute function public.enforce_child_space_id('entity_id');
create trigger trg_timeline_entry_media_space before insert or update on public.timeline_entry_media
  for each row execute function public.enforce_child_space_id('timeline_entry_id');


-- >>> 20260101000006_widgets_reminders.sql
-- SharedLife: Widgets, Views, Erinnerungen, Push-Subscriptions

-- ---------------------------------------------------------------------------
-- view_layouts – gespeicherte Layout-Konfiguration pro View
-- ---------------------------------------------------------------------------
create table public.view_layouts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  view_key text not null
    check (view_key in (
      'home', 'plan', 'reminders', 'us', 'entity_detail',
      'timeline', 'search', 'trash', 'dashboard'
    )),
  name text,
  layout jsonb not null default '{"widgets":[]}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create unique index idx_view_layouts_default_per_view
  on public.view_layouts (space_id, view_key, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_default = true and deleted_at is null;

create index idx_view_layouts_space_view
  on public.view_layouts (space_id, view_key)
  where deleted_at is null;

create trigger trg_view_layouts_updated_at
  before update on public.view_layouts
  for each row execute function public.set_updated_at();

comment on table public.view_layouts is
  'Layout-Definitionen für App-Views; user_id NULL = gemeinsames Space-Layout.';

-- ---------------------------------------------------------------------------
-- widget_instances – konkrete Widget-Platzierungen
-- ---------------------------------------------------------------------------
create table public.widget_instances (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  view_layout_id uuid references public.view_layouts (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete cascade,
  widget_type text not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  grid_x smallint not null default 0,
  grid_y smallint not null default 0,
  grid_w smallint not null default 1 check (grid_w >= 1),
  grid_h smallint not null default 1 check (grid_h >= 1),
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_widget_instances_layout
  on public.widget_instances (view_layout_id, sort_order)
  where deleted_at is null;
create index idx_widget_instances_entity
  on public.widget_instances (entity_id)
  where deleted_at is null and entity_id is not null;

create trigger trg_widget_instances_updated_at
  before update on public.widget_instances
  for each row execute function public.set_updated_at();

comment on table public.widget_instances is
  'Widget-Instanzen referenzieren Entities/Layouts, duplizieren keine Inhalte.';

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  entity_id uuid references public.entities (id) on delete cascade,
  title text not null,
  body text,
  remind_at timestamptz not null,
  timezone text not null default 'Europe/Zurich',
  recurrence_rule text,
  is_active boolean not null default true,
  notify_push boolean not null default true,
  notify_in_app boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  assigned_to uuid references auth.users (id) on delete set null,
  last_triggered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index idx_reminders_due_active
  on public.reminders (remind_at)
  where is_active = true and deleted_at is null;
create index idx_reminders_space
  on public.reminders (space_id)
  where deleted_at is null;

create trigger trg_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- push_subscriptions (Web Push)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index idx_push_subscriptions_user
  on public.push_subscriptions (user_id)
  where is_active = true and deleted_at is null;

create trigger trg_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reminder_deliveries – Versandprotokoll (Insert nur Service Role / DEFINER)
-- ---------------------------------------------------------------------------
create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  push_subscription_id uuid references public.push_subscriptions (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  error_message text,
  response_code integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_reminder_deliveries_pending
  on public.reminder_deliveries (scheduled_for)
  where status = 'pending';
create index idx_reminder_deliveries_reminder
  on public.reminder_deliveries (reminder_id, created_at desc);

comment on table public.reminder_deliveries is
  'Cron/Edge Function schreibt Versandstatus; Clients lesen nur.';


-- >>> 20260101000007_rls_policies.sql
-- SharedLife: Row Level Security auf allen privaten Tabellen

-- ---------------------------------------------------------------------------
-- DELETE für Clients sperren (nur Soft Delete via UPDATE)
-- ---------------------------------------------------------------------------
revoke delete on table public.spaces from authenticated, anon;
revoke delete on table public.profiles from authenticated, anon;
revoke delete on table public.space_members from authenticated, anon;
revoke delete on table public.devices from authenticated, anon;
revoke delete on table public.entities from authenticated, anon;
revoke delete on table public.trip_details from authenticated, anon;
revoke delete on table public.date_details from authenticated, anon;
revoke delete on table public.goal_details from authenticated, anon;
revoke delete on table public.event_details from authenticated, anon;
revoke delete on table public.task_details from authenticated, anon;
revoke delete on table public.list_details from authenticated, anon;
revoke delete on table public.wish_details from authenticated, anon;
revoke delete on table public.moment_details from authenticated, anon;
revoke delete on table public.project_details from authenticated, anon;
revoke delete on table public.milestone_details from authenticated, anon;
revoke delete on table public.entity_links from authenticated, anon;
revoke delete on table public.notes from authenticated, anon;
revoke delete on table public.checklists from authenticated, anon;
revoke delete on table public.checklist_items from authenticated, anon;
revoke delete on table public.budgets from authenticated, anon;
revoke delete on table public.transactions from authenticated, anon;
revoke delete on table public.locations from authenticated, anon;
revoke delete on table public.entity_locations from authenticated, anon;
revoke delete on table public.media_assets from authenticated, anon;
revoke delete on table public.entity_media from authenticated, anon;
revoke delete on table public.timeline_entries from authenticated, anon;
revoke delete on table public.timeline_entry_media from authenticated, anon;
revoke delete on table public.activity_log from authenticated, anon;
revoke delete on table public.conflict_versions from authenticated, anon;
revoke delete on table public.mutation_receipts from authenticated, anon;
revoke delete on table public.view_layouts from authenticated, anon;
revoke delete on table public.widget_instances from authenticated, anon;
revoke delete on table public.reminders from authenticated, anon;
revoke delete on table public.push_subscriptions from authenticated, anon;
revoke delete on table public.reminder_deliveries from authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS aktivieren
-- ---------------------------------------------------------------------------
alter table public.spaces enable row level security;
alter table public.profiles enable row level security;
alter table public.space_members enable row level security;
alter table public.devices enable row level security;
alter table public.entities enable row level security;
alter table public.trip_details enable row level security;
alter table public.date_details enable row level security;
alter table public.goal_details enable row level security;
alter table public.event_details enable row level security;
alter table public.task_details enable row level security;
alter table public.list_details enable row level security;
alter table public.wish_details enable row level security;
alter table public.moment_details enable row level security;
alter table public.project_details enable row level security;
alter table public.milestone_details enable row level security;
alter table public.entity_links enable row level security;
alter table public.notes enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.locations enable row level security;
alter table public.entity_locations enable row level security;
alter table public.media_assets enable row level security;
alter table public.entity_media enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.timeline_entry_media enable row level security;
alter table public.activity_log enable row level security;
alter table public.conflict_versions enable row level security;
alter table public.mutation_receipts enable row level security;
alter table public.view_layouts enable row level security;
alter table public.widget_instances enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_deliveries enable row level security;

-- ---------------------------------------------------------------------------
-- spaces
-- ---------------------------------------------------------------------------
create policy spaces_select_member
  on public.spaces for select to authenticated
  using (public.is_space_member(id));

create policy spaces_update_member
  on public.spaces for update to authenticated
  using (public.is_space_member(id))
  with check (public.is_space_member(id));

-- ---------------------------------------------------------------------------
-- profiles – lesbar für Space-Mitbewohner, schreibbar nur eigenes Profil
-- ---------------------------------------------------------------------------
create policy profiles_select_self_or_co_member
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.space_members sm_self
      join public.space_members sm_other
        on sm_self.space_id = sm_other.space_id
      where sm_self.user_id = auth.uid()
        and sm_other.user_id = profiles.id
    )
  );

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- space_members – nur SELECT; keine Client-Manipulation
-- ---------------------------------------------------------------------------
create policy space_members_select_member
  on public.space_members for select to authenticated
  using (public.is_space_member(space_id));

-- Keine INSERT/UPDATE/DELETE Policies für authenticated → verweigert

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create policy devices_select_member
  on public.devices for select to authenticated
  using (public.is_space_member(space_id));

create policy devices_insert_member
  on public.devices for insert to authenticated
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

create policy devices_update_member
  on public.devices for update to authenticated
  using (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Standard-Policies für space-scoped Tabellen (SELECT/INSERT/UPDATE)
-- ---------------------------------------------------------------------------
create policy entities_member_all
  on public.entities for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy trip_details_member_all
  on public.trip_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy date_details_member_all
  on public.date_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy goal_details_member_all
  on public.goal_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy event_details_member_all
  on public.event_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy task_details_member_all
  on public.task_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy list_details_member_all
  on public.list_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy wish_details_member_all
  on public.wish_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy moment_details_member_all
  on public.moment_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy project_details_member_all
  on public.project_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy milestone_details_member_all
  on public.milestone_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy entity_links_member_all
  on public.entity_links for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy notes_member_all
  on public.notes for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy checklists_member_all
  on public.checklists for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy checklist_items_member_all
  on public.checklist_items for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy budgets_member_all
  on public.budgets for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy transactions_member_all
  on public.transactions for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy locations_member_all
  on public.locations for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy entity_locations_member_all
  on public.entity_locations for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy media_assets_member_all
  on public.media_assets for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy entity_media_member_all
  on public.entity_media for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy timeline_entries_member_all
  on public.timeline_entries for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy timeline_entry_media_member_all
  on public.timeline_entry_media for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy view_layouts_member_all
  on public.view_layouts for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy widget_instances_member_all
  on public.widget_instances for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy reminders_member_all
  on public.reminders for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

-- ---------------------------------------------------------------------------
-- push_subscriptions – nur eigene Subscriptions
-- ---------------------------------------------------------------------------
create policy push_subscriptions_select_own
  on public.push_subscriptions for select to authenticated
  using (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert to authenticated
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

create policy push_subscriptions_update_own
  on public.push_subscriptions for update to authenticated
  using (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Systemtabellen: Lesen für Mitglieder, Schreiben nur Service Role
-- ---------------------------------------------------------------------------
create policy activity_log_select_member
  on public.activity_log for select to authenticated
  using (public.is_space_member(space_id));

create policy activity_log_insert_service
  on public.activity_log for insert to authenticated
  with check (public.is_service_role());

create policy mutation_receipts_select_member
  on public.mutation_receipts for select to authenticated
  using (public.is_space_member(space_id));

create policy mutation_receipts_insert_service
  on public.mutation_receipts for insert to authenticated
  with check (public.is_service_role());

create policy conflict_versions_select_member
  on public.conflict_versions for select to authenticated
  using (public.is_space_member(space_id));

create policy conflict_versions_insert_service
  on public.conflict_versions for insert to authenticated
  with check (public.is_service_role());

create policy conflict_versions_update_service
  on public.conflict_versions for update to authenticated
  using (public.is_service_role())
  with check (public.is_service_role());

create policy reminder_deliveries_select_member
  on public.reminder_deliveries for select to authenticated
  using (public.is_space_member(space_id));

create policy reminder_deliveries_insert_service
  on public.reminder_deliveries for insert to authenticated
  with check (public.is_service_role());

create policy reminder_deliveries_update_service
  on public.reminder_deliveries for update to authenticated
  using (public.is_service_role())
  with check (public.is_service_role());

-- Service Role umgeht RLS standardmäßig; explizite Grants für Sync-Funktionen
grant usage on schema public to authenticated, service_role;
grant select, insert, update on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;


-- >>> 20260101000008_storage.sql
-- SharedLife: Storage – privater media-Bucket mit Space-Membership-Policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  52428800, -- 50 MiB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Hilfsfunktion: space_id aus Storage-Pfad (erstes Segment)
-- Pfadkonvention: {space_id}/{media_id}/{variant}/{filename}
create or replace function public.storage_path_space_id(object_name text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

comment on function public.storage_path_space_id(text) is
  'Extrahiert space_id als erstes Pfadsegment aus Storage-Objektpfad.';

-- ---------------------------------------------------------------------------
-- SELECT – nur Space-Mitglieder
-- ---------------------------------------------------------------------------
create policy media_select_member
  on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  );

-- ---------------------------------------------------------------------------
-- INSERT – nur in eigenen Space-Pfad
-- ---------------------------------------------------------------------------
create policy media_insert_member
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  );

-- ---------------------------------------------------------------------------
-- UPDATE – nur Space-Mitglieder (Metadaten/Varianten)
-- ---------------------------------------------------------------------------
create policy media_update_member
  on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  )
  with check (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  );

-- Kein DELETE für authenticated (Soft Delete über DB + spätere Bereinigung)
create policy media_delete_deny
  on storage.objects for delete to authenticated
  using (false);


-- >>> 20260101000009_sync_functions.sql
-- SharedLife: Sync-RPCs – Mutationen, Versionierung, Idempotenz

-- ---------------------------------------------------------------------------
-- Intern: Activity Log schreiben (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_space_id uuid,
  p_entity_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_mutation_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_device_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_space_member(p_space_id) and not public.is_service_role() then
    raise exception 'not a member of space %', p_space_id;
  end if;

  insert into public.activity_log (
    space_id, entity_id, actor_id, device_id,
    action, resource_type, resource_id, mutation_id, payload
  )
  values (
    p_space_id, p_entity_id, auth.uid(), p_device_id,
    p_action, p_resource_type, p_resource_id, p_mutation_id, p_payload
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_activity(uuid, uuid, text, text, uuid, uuid, jsonb, uuid) from public;
grant execute on function public.log_activity(uuid, uuid, text, text, uuid, uuid, jsonb, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Intern: Mutation Receipt (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.record_mutation_receipt(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_operation text,
  p_table_name text,
  p_result_version integer default null,
  p_result_payload jsonb default null,
  p_device_id uuid default null
)
returns public.mutation_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.mutation_receipts;
  v_new public.mutation_receipts;
begin
  select * into v_existing
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return v_existing;
  end if;

  insert into public.mutation_receipts (
    mutation_id, space_id, entity_id, user_id, device_id,
    operation, table_name, result_version, result_payload
  )
  values (
    p_mutation_id, p_space_id, p_entity_id, auth.uid(), p_device_id,
    p_operation, p_table_name, p_result_version, p_result_payload
  )
  returning * into v_new;

  return v_new;
end;
$$;

revoke all on function public.record_mutation_receipt(uuid, uuid, uuid, text, text, integer, jsonb, uuid) from public;
grant execute on function public.record_mutation_receipt(uuid, uuid, uuid, text, text, integer, jsonb, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: JSON-Felder vergleichen (ohne version/updated_at)
-- ---------------------------------------------------------------------------
create or replace function public.entity_payload_changed(
  p_existing public.entities,
  p_title text,
  p_subtitle text,
  p_description text,
  p_status text,
  p_color text,
  p_icon text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day_start date,
  p_all_day_end date,
  p_parent_entity_id uuid,
  p_sort_order integer,
  p_metadata jsonb
)
returns boolean
language sql
immutable
as $$
  select
    p_existing.title is distinct from coalesce(p_title, p_existing.title)
    or p_existing.subtitle is distinct from p_subtitle
    or p_existing.description is distinct from p_description
    or p_existing.status is distinct from coalesce(p_status, p_existing.status)
    or p_existing.color is distinct from p_color
    or p_existing.icon is distinct from p_icon
    or p_existing.starts_at is distinct from p_starts_at
    or p_existing.ends_at is distinct from p_ends_at
    or p_existing.all_day_start is distinct from p_all_day_start
    or p_existing.all_day_end is distinct from p_all_day_end
    or p_existing.parent_entity_id is distinct from p_parent_entity_id
    or p_existing.sort_order is distinct from coalesce(p_sort_order, p_existing.sort_order)
    or p_existing.metadata is distinct from coalesce(p_metadata, p_existing.metadata);
$$;

-- ---------------------------------------------------------------------------
-- apply_entity_mutation – Upsert mit Versionsprüfung
-- ---------------------------------------------------------------------------
create or replace function public.apply_entity_mutation(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_expected_version integer,
  p_entity_type text default null,
  p_title text default null,
  p_subtitle text default null,
  p_description text default null,
  p_status text default null,
  p_color text default null,
  p_icon text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_all_day_start date default null,
  p_all_day_end date default null,
  p_cover_media_id uuid default null,
  p_parent_entity_id uuid default null,
  p_sort_order integer default null,
  p_metadata jsonb default null,
  p_device_id uuid default null,
  p_is_create boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
  v_existing public.entities;
  v_result public.entities;
  v_changed boolean;
  v_new_version integer;
  v_operation text;
begin
  -- Idempotenz: bereits angewendete Mutation zurückgeben
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    select to_jsonb(e.*) into v_result
    from public.entities e
    where e.id = coalesce(v_receipt.entity_id, p_entity_id);

    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'entity', to_jsonb(v_result),
      'version', v_receipt.result_version,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id
      using errcode = '42501';
  end if;

  select * into v_existing
  from public.entities e
  where e.id = p_entity_id
    and e.space_id = p_space_id
    and e.deleted_at is null;

  if p_is_create then
    if found then
      -- Create idempotent wenn Entity bereits existiert und Version passt
      if v_existing.version <> p_expected_version then
        insert into public.conflict_versions (
          space_id, entity_id, mutation_id,
          client_version, server_version,
          client_payload, server_payload, device_id
        )
        values (
          p_space_id, p_entity_id, p_mutation_id,
          p_expected_version, v_existing.version,
          jsonb_build_object('operation', 'create'), to_jsonb(v_existing), p_device_id
        );

        raise exception 'version conflict: expected %, server has %',
          p_expected_version, v_existing.version
          using errcode = '40001';
      end if;

      v_operation := 'create';
      v_new_version := v_existing.version;
      v_result := v_existing;
    else
      if p_entity_type is null then
        raise exception 'entity_type required for create';
      end if;

      insert into public.entities (
        id, space_id, entity_type, title, subtitle, description, status,
        color, icon, starts_at, ends_at, all_day_start, all_day_end,
        cover_media_id, parent_entity_id, sort_order, metadata,
        version, created_by, updated_by
      )
      values (
        p_entity_id, p_space_id, p_entity_type,
        coalesce(p_title, ''),
        p_subtitle, p_description, coalesce(p_status, 'active'),
        p_color, p_icon, p_starts_at, p_ends_at, p_all_day_start, p_all_day_end,
        p_cover_media_id, p_parent_entity_id, coalesce(p_sort_order, 0),
        coalesce(p_metadata, '{}'::jsonb),
        1, auth.uid(), auth.uid()
      )
      returning * into v_result;

      v_operation := 'create';
      v_new_version := 1;
    end if;
  else
    if not found then
      raise exception 'entity % not found in space %', p_entity_id, p_space_id
        using errcode = 'P0002';
    end if;

    if v_existing.version <> p_expected_version then
      insert into public.conflict_versions (
        space_id, entity_id, mutation_id,
        client_version, server_version,
        client_payload, server_payload, device_id
      )
      values (
        p_space_id, p_entity_id, p_mutation_id,
        p_expected_version, v_existing.version,
        jsonb_build_object(
          'title', p_title, 'status', p_status, 'metadata', p_metadata
        ),
        to_jsonb(v_existing),
        p_device_id
      );

      raise exception 'version conflict: expected %, server has %',
        p_expected_version, v_existing.version
        using errcode = '40001';
    end if;

    v_changed := public.entity_payload_changed(
      v_existing, p_title, p_subtitle, p_description, p_status,
      p_color, p_icon, p_starts_at, p_ends_at, p_all_day_start, p_all_day_end,
      p_parent_entity_id, p_sort_order, p_metadata
    )
    or v_existing.cover_media_id is distinct from p_cover_media_id;

    v_new_version := case
      when v_changed then v_existing.version + 1
      else v_existing.version
    end;

    update public.entities e
    set
      title = coalesce(p_title, e.title),
      subtitle = coalesce(p_subtitle, e.subtitle),
      description = coalesce(p_description, e.description),
      status = coalesce(p_status, e.status),
      color = coalesce(p_color, e.color),
      icon = coalesce(p_icon, e.icon),
      starts_at = coalesce(p_starts_at, e.starts_at),
      ends_at = coalesce(p_ends_at, e.ends_at),
      all_day_start = coalesce(p_all_day_start, e.all_day_start),
      all_day_end = coalesce(p_all_day_end, e.all_day_end),
      cover_media_id = coalesce(p_cover_media_id, e.cover_media_id),
      parent_entity_id = coalesce(p_parent_entity_id, e.parent_entity_id),
      sort_order = coalesce(p_sort_order, e.sort_order),
      metadata = coalesce(p_metadata, e.metadata),
      version = v_new_version,
      updated_by = auth.uid(),
      updated_at = timezone('utc', now())
    where e.id = p_entity_id
    returning * into v_result;

    v_operation := case when v_changed then 'update' else 'upsert' end;
  end if;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_entity_id, v_operation, 'entities',
    v_new_version, to_jsonb(v_result), p_device_id
  );

  perform public.log_activity(
    p_space_id, p_entity_id, v_operation, 'entity', p_entity_id,
    p_mutation_id, to_jsonb(v_result), p_device_id
  );

  return jsonb_build_object(
    'status', 'applied',
    'mutation_id', p_mutation_id,
    'entity', to_jsonb(v_result),
    'version', v_new_version,
    'receipt', to_jsonb(v_receipt)
  );
end;
$$;

revoke all on function public.apply_entity_mutation(
  uuid, uuid, uuid, integer, text, text, text, text, text, text, text,
  timestamptz, timestamptz, date, date, uuid, uuid, integer, jsonb, uuid, boolean
) from public;
grant execute on function public.apply_entity_mutation(
  uuid, uuid, uuid, integer, text, text, text, text, text, text, text,
  timestamptz, timestamptz, date, date, uuid, uuid, integer, jsonb, uuid, boolean
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- soft_delete_entity
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_entity(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_expected_version integer,
  p_device_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
  v_existing public.entities;
  v_result public.entities;
  v_new_version integer;
begin
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'entity_id', p_entity_id,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id using errcode = '42501';
  end if;

  select * into v_existing
  from public.entities e
  where e.id = p_entity_id
    and e.space_id = p_space_id
    and e.deleted_at is null;

  if not found then
    raise exception 'entity % not found or already deleted', p_entity_id
      using errcode = 'P0002';
  end if;

  if v_existing.version <> p_expected_version then
    insert into public.conflict_versions (
      space_id, entity_id, mutation_id,
      client_version, server_version,
      client_payload, server_payload, device_id
    )
    values (
      p_space_id, p_entity_id, p_mutation_id,
      p_expected_version, v_existing.version,
      '{"operation":"soft_delete"}'::jsonb, to_jsonb(v_existing), p_device_id
    );

    raise exception 'version conflict: expected %, server has %',
      p_expected_version, v_existing.version using errcode = '40001';
  end if;

  v_new_version := v_existing.version + 1;

  update public.entities e
  set
    deleted_at = timezone('utc', now()),
    deleted_by = auth.uid(),
    version = v_new_version,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where e.id = p_entity_id
  returning * into v_result;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_entity_id, 'soft_delete', 'entities',
    v_new_version, to_jsonb(v_result), p_device_id
  );

  perform public.log_activity(
    p_space_id, p_entity_id, 'soft_delete', 'entity', p_entity_id,
    p_mutation_id, to_jsonb(v_result), p_device_id
  );

  return jsonb_build_object(
    'status', 'applied',
    'mutation_id', p_mutation_id,
    'entity', to_jsonb(v_result),
    'version', v_new_version,
    'receipt', to_jsonb(v_receipt)
  );
end;
$$;

revoke all on function public.soft_delete_entity(uuid, uuid, uuid, integer, uuid) from public;
grant execute on function public.soft_delete_entity(uuid, uuid, uuid, integer, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- restore_entity (aus Papierkorb)
-- ---------------------------------------------------------------------------
create or replace function public.restore_entity(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_expected_version integer,
  p_device_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
  v_existing public.entities;
  v_result public.entities;
  v_new_version integer;
begin
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'entity_id', p_entity_id,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id using errcode = '42501';
  end if;

  select * into v_existing
  from public.entities e
  where e.id = p_entity_id
    and e.space_id = p_space_id
    and e.deleted_at is not null;

  if not found then
    raise exception 'entity % not found in trash', p_entity_id using errcode = 'P0002';
  end if;

  if v_existing.version <> p_expected_version then
    raise exception 'version conflict: expected %, server has %',
      p_expected_version, v_existing.version using errcode = '40001';
  end if;

  v_new_version := v_existing.version + 1;

  update public.entities e
  set
    deleted_at = null,
    deleted_by = null,
    version = v_new_version,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where e.id = p_entity_id
  returning * into v_result;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_entity_id, 'restore', 'entities',
    v_new_version, to_jsonb(v_result), p_device_id
  );

  perform public.log_activity(
    p_space_id, p_entity_id, 'restore', 'entity', p_entity_id,
    p_mutation_id, to_jsonb(v_result), p_device_id
  );

  return jsonb_build_object(
    'status', 'applied',
    'mutation_id', p_mutation_id,
    'entity', to_jsonb(v_result),
    'version', v_new_version,
    'receipt', to_jsonb(v_receipt)
  );
end;
$$;

revoke all on function public.restore_entity(uuid, uuid, uuid, integer, uuid) from public;
grant execute on function public.restore_entity(uuid, uuid, uuid, integer, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Generische Tabellen-Mutation (Detailtabellen, Notizen, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.apply_row_mutation(
  p_mutation_id uuid,
  p_space_id uuid,
  p_table_name text,
  p_row_id uuid,
  p_expected_version integer default null,
  p_payload jsonb default '{}'::jsonb,
  p_device_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
begin
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id using errcode = '42501';
  end if;

  -- Kein dynamisches SQL vom Client: nur erlaubte Tabellen
  if p_table_name not in (
    'notes', 'checklist_items', 'task_details', 'wish_details',
    'reminders', 'widget_instances', 'view_layouts'
  ) then
    raise exception 'table % not allowed for apply_row_mutation', p_table_name
      using errcode = '42501';
  end if;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_row_id, 'upsert', p_table_name,
    p_expected_version, p_payload, p_device_id
  );

  perform public.log_activity(
    p_space_id, null, 'upsert', p_table_name, p_row_id,
    p_mutation_id, p_payload, p_device_id
  );

  return jsonb_build_object(
    'status', 'accepted',
    'mutation_id', p_mutation_id,
    'table', p_table_name,
    'receipt', to_jsonb(v_receipt),
    'note', 'Use typed RPCs or direct RLS writes for full row application'
  );
end;
$$;

revoke all on function public.apply_row_mutation(uuid, uuid, text, uuid, integer, jsonb, uuid) from public;
grant execute on function public.apply_row_mutation(uuid, uuid, text, uuid, integer, jsonb, uuid)
  to authenticated, service_role;

comment on function public.apply_entity_mutation is
  'Wendet Entity-Mutation idempotent an; Versionskonflikte → conflict_versions + Exception 40001.';

comment on function public.soft_delete_entity is
  'Soft Delete mit Versionsprüfung und Mutation Receipt.';

comment on function public.restore_entity is
  'Stellt gelöschte Entity wieder her (Papierkorb).';


-- >>> 20260101000010_push_dispatch.sql
-- SharedLife: Push-Dispatch-Hilfen (next_trigger_at, eindeutige Deliveries)

alter table public.reminders
  add column if not exists next_trigger_at timestamptz;

update public.reminders
set next_trigger_at = remind_at
where next_trigger_at is null;

create index if not exists idx_reminders_next_trigger
  on public.reminders (next_trigger_at)
  where is_active = true and deleted_at is null and notify_push = true;

create unique index if not exists idx_reminder_deliveries_unique
  on public.reminder_deliveries (reminder_id, scheduled_for, coalesce(push_subscription_id, '00000000-0000-0000-0000-000000000000'::uuid));

comment on column public.reminders.next_trigger_at is
  'Nächster geplanter Versandzeitpunkt; bei Wiederholung nach Versand aktualisiert.';

-- >>> production seed (space only; users linked after auth create)
-- SharedLife Seed – lokaler Dev-Space
-- Auth-Benutzer müssen über Supabase Auth angelegt werden (OTP, kein Auto-Signup).
--
-- Feste Test-UUIDs (in Kommentaren und optionalen Inserts):
--   Space:     aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--   Dennis:    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb  → dennis@sharedlife.local
--   Lea:       cccccccc-cccc-4ccc-8ccc-cccccccccccc  → lea@sharedlife.local
--   Fremder:   dddddddd-dddd-4ddd-8ddd-dddddddddddd  → stranger@sharedlife.local (nur Tests)
--
-- Nach dem Anlegen der Auth-User (z. B. via Studio oder CLI):
--   supabase auth users create dennis@sharedlife.local --id bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--   supabase auth users create lea@sharedlife.local    --id cccccccc-cccc-4ccc-8ccc-cccccccccccc

insert into public.spaces (id, name, slug, timezone)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'SharedLife',
  'sharedlife',
  'Europe/Zurich'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  timezone = excluded.timezone;

-- Profile und Mitgliedschaft nur wenn Auth-User existieren
do $$
begin
  if exists (select 1 from auth.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then
    insert into public.profiles (id, display_name, timezone, locale)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Dennis', 'Europe/Zurich', 'de-CH')
    on conflict (id) do update set display_name = excluded.display_name;

    insert into public.space_members (space_id, user_id, role)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner')
    on conflict (space_id, user_id) do nothing;
  end if;

  if exists (select 1 from auth.users where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') then
    insert into public.profiles (id, display_name, timezone, locale)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Lea', 'Europe/Zurich', 'de-CH')
    on conflict (id) do update set display_name = excluded.display_name;

    insert into public.space_members (space_id, user_id, role)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'member')
    on conflict (space_id, user_id) do nothing;
  end if;
end $$;

-- Beispiel-Entity (nur wenn mindestens ein Mitglied existiert)
do $$
declare
  v_creator uuid;
begin
  select sm.user_id into v_creator
  from public.space_members sm
  where sm.space_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  order by sm.joined_at
  limit 1;

  if v_creator is null then
    return;
  end if;

  insert into public.entities (
    id, space_id, entity_type, title, description, status, created_by, updated_by
  )
  values (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'moment',
    'Willkommen in SharedLife',
    'Erster gemeinsamer Moment – Seed-Datensatz für lokale Entwicklung.',
    'active',
    v_creator,
    v_creator
  )
  on conflict (id) do nothing;

  insert into public.moment_details (entity_id, space_id, captured_at, highlight)
  values (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    timezone('utc', now()),
    true
  )
  on conflict (entity_id) do nothing;
end $$;
commit;
