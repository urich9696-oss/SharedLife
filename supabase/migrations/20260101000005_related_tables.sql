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
