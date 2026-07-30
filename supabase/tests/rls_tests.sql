-- SharedLife RLS Tests
-- Ausführen mit: npm run test:db  (supabase test db)
--
-- Szenarien:
--   Dennis (bbbbbbbb-...) und Lea (cccccccc-...) → Zugriff auf SharedLife-Space
--   Fremder (dddddddd-...) → kein Zugriff
--
-- Feste UUIDs (müssen mit seed.sql übereinstimmen):
--   space_id:  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--   dennis_id: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--   lea_id:    cccccccc-cccc-4ccc-8ccc-cccccccccccc
--   stranger:  dddddddd-dddd-4ddd-8ddd-dddddddddddd

begin;

-- pgTAP (falls installiert via supabase test db)
select plan(16);

-- ---------------------------------------------------------------------------
-- Test-Fixtures: Auth-User + Space + Mitgliedschaften
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'dennis@sharedlife.local',
    crypt('test-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Dennis"}'::jsonb,
    false
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'lea@sharedlife.local',
    crypt('test-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Lea"}'::jsonb,
    false
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'stranger@sharedlife.local',
    crypt('test-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Stranger"}'::jsonb,
    false
  )
on conflict (id) do nothing;

insert into public.spaces (id, name, slug)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SharedLife', 'sharedlife')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Dennis'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Lea'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Stranger')
on conflict (id) do nothing;

insert into public.space_members (space_id, user_id, role)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'member')
on conflict (space_id, user_id) do nothing;

insert into public.entities (id, space_id, entity_type, title)
values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'note',
  'RLS Test Notiz'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: JWT-Kontext für RLS simulieren
-- ---------------------------------------------------------------------------
create or replace function tests.set_auth_user(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Dennis: Space und Entities lesen
-- ---------------------------------------------------------------------------
select tests.set_auth_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

select is(
  (select count(*)::integer from public.spaces where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1,
  'Dennis kann den SharedLife-Space sehen'
);

select is(
  (select count(*)::integer from public.entities where space_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1,
  'Dennis kann Entities im Space sehen'
);

select is(
  (select count(*)::integer from public.profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  1,
  'Dennis kann Leas Profil als Co-Mitglied sehen'
);

-- Dennis kann eigene Mitgliedschaft sehen, aber nicht einfügen
select is(
  (select count(*)::integer from public.space_members
   where space_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  2,
  'Dennis sieht beide Space-Mitglieder'
);

select throws_ok(
  $$
    insert into public.space_members (space_id, user_id)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
  $$,
  '42501',
  null,
  'Dennis darf keine neuen Mitgliedschaften anlegen'
);

-- ---------------------------------------------------------------------------
-- Lea: gleicher Lesezugriff
-- ---------------------------------------------------------------------------
select tests.set_auth_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

select is(
  (select count(*)::integer from public.spaces where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1,
  'Lea kann den SharedLife-Space sehen'
);

select is(
  (select count(*)::integer from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1,
  'Lea kann Dennis Profil als Co-Mitglied sehen'
);

-- Lea darf nur eigenes Profil ändern
update public.profiles set display_name = 'Lea Updated' where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select is(
  (select display_name from public.profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'Lea Updated',
  'Lea kann eigenes Profil aktualisieren'
);

-- ---------------------------------------------------------------------------
-- Fremder: kein Zugriff
-- ---------------------------------------------------------------------------
select tests.set_auth_user('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

select is(
  (select count(*)::integer from public.spaces),
  0,
  'Fremder sieht keine Spaces'
);

select is(
  (select count(*)::integer from public.entities),
  0,
  'Fremder sieht keine Entities'
);

select is(
  (select count(*)::integer from public.space_members),
  0,
  'Fremder sieht keine Mitgliedschaften'
);

-- Fremder kann Entity nicht einfügen
select throws_ok(
  $$
    insert into public.entities (id, space_id, entity_type, title)
    values (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'task', 'Hack')
  $$,
  '42501',
  null,
  'Fremder darf keine Entities anlegen'
);

-- ---------------------------------------------------------------------------
-- Hard DELETE verweigert (REVOKE)
-- ---------------------------------------------------------------------------
select tests.set_auth_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

select throws_ok(
  $$
    delete from public.entities where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  $$,
  '42501',
  null,
  'Hard DELETE auf entities ist für authenticated gesperrt'
);

-- ---------------------------------------------------------------------------
-- activity_log: Client-Insert verweigert, SELECT für Mitglied erlaubt
-- ---------------------------------------------------------------------------
select throws_ok(
  $$
    insert into public.activity_log (space_id, action, resource_type)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'test', 'entity')
  $$,
  '42501',
  null,
  'Authenticated darf nicht direkt in activity_log schreiben'
);

-- Sync-Funktion darf schreiben (SECURITY DEFINER)
select lives_ok(
  $$
    select public.log_activity(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      'test', 'entity', 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    )
  $$,
  'log_activity (SECURITY DEFINER) funktioniert für Mitglieder'
);

select cmp_ok(
  (select count(*)::integer from public.activity_log
   where space_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  '>=',
  1,
  'Dennis kann activity_log lesen nach log_activity'
);

select * from finish();

rollback;
