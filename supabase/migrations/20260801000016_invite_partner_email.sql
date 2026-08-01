-- SharedLife: Einladungen mit E-Mail für Partner-Zugang (Lea)

alter table public.space_invites
  add column if not exists invitee_email text;

comment on column public.space_invites.invitee_email is
  'E-Mail des eingeladenen Partners. Zugang wird über Edge Function invite-partner freigeschaltet.';

create unique index if not exists idx_space_invites_space_email_active
  on public.space_invites (space_id, lower(invitee_email))
  where invitee_email is not null and status in ('draft', 'ready');

-- Client darf E-Mail im Entwurf speichern; Freischaltung läuft über Service Role.
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
