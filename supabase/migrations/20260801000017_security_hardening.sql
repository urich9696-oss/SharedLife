-- SharedLife: Security Hardening
-- 1) clear_space_content nur für Space-Owner
-- 2) record_mutation_receipt prüft Mitgliedschaft
-- 3) Helper is_space_owner

create or replace function public.is_space_owner(p_space_id uuid)
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
      and sm.role = 'owner'
  );
$$;

revoke all on function public.is_space_owner(uuid) from public;
grant execute on function public.is_space_owner(uuid) to authenticated, service_role;

create or replace function public.clear_space_content(p_space_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_space_owner(p_space_id) then
    raise exception 'only space owner can clear content';
  end if;

  delete from public.timeline_entry_media where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('timeline_entry_media', v_n);

  delete from public.entity_media where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('entity_media', v_n);

  delete from public.entity_locations where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('entity_locations', v_n);

  delete from public.entity_links where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('entity_links', v_n);

  delete from public.checklist_items where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('checklist_items', v_n);

  delete from public.checklists where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('checklists', v_n);

  delete from public.notes where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('notes', v_n);

  delete from public.transactions where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('transactions', v_n);

  delete from public.budgets where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('budgets', v_n);

  delete from public.reminders where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('reminders', v_n);

  delete from public.reminder_deliveries where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('reminder_deliveries', v_n);

  delete from public.widget_instances where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('widget_instances', v_n);

  delete from public.view_layouts where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('view_layouts', v_n);

  delete from public.timeline_entries where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('timeline_entries', v_n);

  delete from public.media_assets where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('media_assets', v_n);

  delete from public.locations where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('locations', v_n);

  delete from public.trip_details where space_id = p_space_id;
  delete from public.date_details where space_id = p_space_id;
  delete from public.goal_details where space_id = p_space_id;
  delete from public.event_details where space_id = p_space_id;
  delete from public.task_details where space_id = p_space_id;
  delete from public.list_details where space_id = p_space_id;
  delete from public.wish_details where space_id = p_space_id;
  delete from public.moment_details where space_id = p_space_id;
  delete from public.project_details where space_id = p_space_id;
  delete from public.milestone_details where space_id = p_space_id;

  delete from public.conflict_versions where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('conflict_versions', v_n);

  delete from public.activity_log where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('activity_log', v_n);

  delete from public.entities where space_id = p_space_id;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('entities', v_n);

  -- Storage-Objekte unter {space_id}/… entfernen
  begin
    delete from storage.objects
    where bucket_id = 'media'
      and name like (p_space_id::text || '/%');
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('storage_objects', v_n);
  exception
    when undefined_table then
      v_counts := v_counts || jsonb_build_object('storage_objects', 0);
    when others then
      v_counts := v_counts || jsonb_build_object('storage_objects_error', SQLERRM);
  end;

  return jsonb_build_object(
    'space_id', p_space_id,
    'cleared_by', v_uid,
    'counts', v_counts
  );
end;
$$;

comment on function public.clear_space_content(uuid) is
  'Löscht Space-Inhalte inkl. Storage. Nur Space-Owner.';

create or replace function public.record_mutation_receipt(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_operation text,
  p_table_name text,
  p_result_version integer default null,
  p_result_payload jsonb default null,
  p_device_id uuid default null
)
returns public.mutation_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.mutation_receipts;
  v_new public.mutation_receipts;
begin
  if not public.is_space_member(p_space_id) and not public.is_service_role() then
    raise exception 'not a member of space %', p_space_id;
  end if;

  select * into v_existing
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return v_existing;
  end if;

  insert into public.mutation_receipts (
    mutation_id, space_id, entity_id, user_id, device_id,
    operation, table_name, result_version, result_payload
  )
  values (
    p_mutation_id, p_space_id, p_entity_id, auth.uid(), p_device_id,
    p_operation, p_table_name, p_result_version, p_result_payload
  )
  returning * into v_new;

  return v_new;
end;
$$;
