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
