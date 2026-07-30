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
