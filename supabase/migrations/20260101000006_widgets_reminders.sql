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
