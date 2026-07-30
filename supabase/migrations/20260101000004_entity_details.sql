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
