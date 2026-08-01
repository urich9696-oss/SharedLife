-- SharedLife: Paarprofil auf spaces + erweiterte Entity-Typen (nicht destruktiv)

-- ---------------------------------------------------------------------------
-- Pair / couple profile fields on spaces (visual only — not auth accounts)
-- ---------------------------------------------------------------------------
alter table public.spaces
  add column if not exists partner_a_name text,
  add column if not exists partner_b_name text,
  add column if not exists partner_a_avatar_path text,
  add column if not exists partner_b_avatar_path text,
  add column if not exists cover_media_path text,
  add column if not exists together_since date,
  add column if not exists couple_blurb text;

comment on column public.spaces.partner_a_name is 'Anzeigename Partner A (z. B. Dennis) — kein Auth-Konto.';
comment on column public.spaces.partner_b_name is 'Anzeigename Partner B (z. B. Lea) — kein Auth-Konto.';
comment on column public.spaces.together_since is 'Gemeinsames Startdatum für Countdown/Tage.';
comment on column public.spaces.couple_blurb is 'Kurzer gemeinsamer Text.';

-- ---------------------------------------------------------------------------
-- Extend entity_type check with new module types
-- ---------------------------------------------------------------------------
alter table public.entities drop constraint if exists entities_entity_type_check;

alter table public.entities
  add constraint entities_entity_type_check
  check (entity_type in (
    'trip', 'date', 'goal', 'event', 'task', 'list',
    'wish', 'moment', 'project', 'note', 'milestone',
    'recipe', 'gift', 'household', 'leisure', 'journal', 'expense'
  ));

-- ---------------------------------------------------------------------------
-- Invite preparation table (no auto-send; membership still admin-only)
-- ---------------------------------------------------------------------------
create table if not exists public.space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  invitee_label text,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'revoked')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create index if not exists idx_space_invites_space
  on public.space_invites (space_id);

alter table public.space_invites enable row level security;

create policy space_invites_select_member
  on public.space_invites for select
  to authenticated
  using (public.is_space_member(space_id));

create policy space_invites_insert_member
  on public.space_invites for insert
  to authenticated
  with check (
    public.is_space_member(space_id)
    and created_by = auth.uid()
    and status = 'draft'
    and sent_at is null
  );

create policy space_invites_update_member
  on public.space_invites for update
  to authenticated
  using (public.is_space_member(space_id) and created_by = auth.uid())
  with check (
    public.is_space_member(space_id)
    and created_by = auth.uid()
    and status in ('draft', 'ready', 'revoked')
    and sent_at is null
  );

-- spaces_update_member already exists from prior migration; pair-profile columns
-- are covered by the same membership-scoped UPDATE policy.
