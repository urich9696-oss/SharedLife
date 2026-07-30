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
