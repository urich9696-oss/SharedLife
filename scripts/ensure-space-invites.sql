-- SharedLife: space_invites für Partner-Einladung (idempotent)
-- Im Supabase Dashboard → SQL Editor ausführen, dann „Run“.

create table if not exists public.space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  invitee_label text,
  invitee_email text,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'revoked')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

alter table public.space_invites
  add column if not exists invitee_email text;

create index if not exists idx_space_invites_space
  on public.space_invites (space_id);

create unique index if not exists idx_space_invites_space_email_active
  on public.space_invites (space_id, lower(invitee_email))
  where invitee_email is not null and status in ('draft', 'ready');

alter table public.space_invites enable row level security;

revoke delete on table public.space_invites from authenticated, anon;
grant select, insert, update on table public.space_invites to authenticated;
grant all on table public.space_invites to service_role;

drop policy if exists space_invites_select_member on public.space_invites;
create policy space_invites_select_member
  on public.space_invites for select
  to authenticated
  using (public.is_space_member(space_id));

drop policy if exists space_invites_insert_member on public.space_invites;
create policy space_invites_insert_member
  on public.space_invites for insert
  to authenticated
  with check (
    public.is_space_member(space_id)
    and created_by = auth.uid()
    and status = 'draft'
    and sent_at is null
  );

drop policy if exists space_invites_update_member on public.space_invites;
create policy space_invites_update_member
  on public.space_invites for update
  to authenticated
  using (public.is_space_member(space_id) and created_by = auth.uid())
  with check (
    public.is_space_member(space_id)
    and created_by = auth.uid()
    and status in ('draft', 'ready', 'revoked')
  );

notify pgrst, 'reload schema';
