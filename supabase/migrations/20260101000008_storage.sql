-- SharedLife: Storage – privater media-Bucket mit Space-Membership-Policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  52428800, -- 50 MiB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Hilfsfunktion: space_id aus Storage-Pfad (erstes Segment)
-- Pfadkonvention: {space_id}/{media_id}/{variant}/{filename}
create or replace function public.storage_path_space_id(object_name text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

comment on function public.storage_path_space_id(text) is
  'Extrahiert space_id als erstes Pfadsegment aus Storage-Objektpfad.';

-- ---------------------------------------------------------------------------
-- SELECT – nur Space-Mitglieder
-- ---------------------------------------------------------------------------
create policy media_select_member
  on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  );

-- ---------------------------------------------------------------------------
-- INSERT – nur in eigenen Space-Pfad
-- ---------------------------------------------------------------------------
create policy media_insert_member
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  );

-- ---------------------------------------------------------------------------
-- UPDATE – nur Space-Mitglieder (Metadaten/Varianten)
-- ---------------------------------------------------------------------------
create policy media_update_member
  on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  )
  with check (
    bucket_id = 'media'
    and public.is_space_member(public.storage_path_space_id(name))
  );

-- Kein DELETE für authenticated (Soft Delete über DB + spätere Bereinigung)
create policy media_delete_deny
  on storage.objects for delete to authenticated
  using (false);
