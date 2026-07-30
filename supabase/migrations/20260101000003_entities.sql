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
