-- SharedLife: Sync-RPCs – Mutationen, Versionierung, Idempotenz

-- ---------------------------------------------------------------------------
-- Intern: Activity Log schreiben (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_space_id uuid,
  p_entity_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_mutation_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_device_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_space_member(p_space_id) and not public.is_service_role() then
    raise exception 'not a member of space %', p_space_id;
  end if;

  insert into public.activity_log (
    space_id, entity_id, actor_id, device_id,
    action, resource_type, resource_id, mutation_id, payload
  )
  values (
    p_space_id, p_entity_id, auth.uid(), p_device_id,
    p_action, p_resource_type, p_resource_id, p_mutation_id, p_payload
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_activity(uuid, uuid, text, text, uuid, uuid, jsonb, uuid) from public;
grant execute on function public.log_activity(uuid, uuid, text, text, uuid, uuid, jsonb, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Intern: Mutation Receipt (idempotent)
-- ---------------------------------------------------------------------------
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

revoke all on function public.record_mutation_receipt(uuid, uuid, uuid, text, text, integer, jsonb, uuid) from public;
grant execute on function public.record_mutation_receipt(uuid, uuid, uuid, text, text, integer, jsonb, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: JSON-Felder vergleichen (ohne version/updated_at)
-- ---------------------------------------------------------------------------
create or replace function public.entity_payload_changed(
  p_existing public.entities,
  p_title text,
  p_subtitle text,
  p_description text,
  p_status text,
  p_color text,
  p_icon text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day_start date,
  p_all_day_end date,
  p_parent_entity_id uuid,
  p_sort_order integer,
  p_metadata jsonb
)
returns boolean
language sql
immutable
as $$
  select
    p_existing.title is distinct from coalesce(p_title, p_existing.title)
    or p_existing.subtitle is distinct from p_subtitle
    or p_existing.description is distinct from p_description
    or p_existing.status is distinct from coalesce(p_status, p_existing.status)
    or p_existing.color is distinct from p_color
    or p_existing.icon is distinct from p_icon
    or p_existing.starts_at is distinct from p_starts_at
    or p_existing.ends_at is distinct from p_ends_at
    or p_existing.all_day_start is distinct from p_all_day_start
    or p_existing.all_day_end is distinct from p_all_day_end
    or p_existing.parent_entity_id is distinct from p_parent_entity_id
    or p_existing.sort_order is distinct from coalesce(p_sort_order, p_existing.sort_order)
    or p_existing.metadata is distinct from coalesce(p_metadata, p_existing.metadata);
$$;

-- ---------------------------------------------------------------------------
-- apply_entity_mutation – Upsert mit Versionsprüfung
-- ---------------------------------------------------------------------------
create or replace function public.apply_entity_mutation(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_expected_version integer,
  p_entity_type text default null,
  p_title text default null,
  p_subtitle text default null,
  p_description text default null,
  p_status text default null,
  p_color text default null,
  p_icon text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_all_day_start date default null,
  p_all_day_end date default null,
  p_cover_media_id uuid default null,
  p_parent_entity_id uuid default null,
  p_sort_order integer default null,
  p_metadata jsonb default null,
  p_device_id uuid default null,
  p_is_create boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
  v_existing public.entities;
  v_result public.entities;
  v_changed boolean;
  v_new_version integer;
  v_operation text;
begin
  -- Idempotenz: bereits angewendete Mutation zurückgeben
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    select to_jsonb(e.*) into v_result
    from public.entities e
    where e.id = coalesce(v_receipt.entity_id, p_entity_id);

    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'entity', to_jsonb(v_result),
      'version', v_receipt.result_version,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id
      using errcode = '42501';
  end if;

  select * into v_existing
  from public.entities e
  where e.id = p_entity_id
    and e.space_id = p_space_id
    and e.deleted_at is null;

  if p_is_create then
    if found then
      -- Create idempotent wenn Entity bereits existiert und Version passt
      if v_existing.version <> p_expected_version then
        insert into public.conflict_versions (
          space_id, entity_id, mutation_id,
          client_version, server_version,
          client_payload, server_payload, device_id
        )
        values (
          p_space_id, p_entity_id, p_mutation_id,
          p_expected_version, v_existing.version,
          jsonb_build_object('operation', 'create'), to_jsonb(v_existing), p_device_id
        );

        raise exception 'version conflict: expected %, server has %',
          p_expected_version, v_existing.version
          using errcode = '40001';
      end if;

      v_operation := 'create';
      v_new_version := v_existing.version;
      v_result := v_existing;
    else
      if p_entity_type is null then
        raise exception 'entity_type required for create';
      end if;

      insert into public.entities (
        id, space_id, entity_type, title, subtitle, description, status,
        color, icon, starts_at, ends_at, all_day_start, all_day_end,
        cover_media_id, parent_entity_id, sort_order, metadata,
        version, created_by, updated_by
      )
      values (
        p_entity_id, p_space_id, p_entity_type,
        coalesce(p_title, ''),
        p_subtitle, p_description, coalesce(p_status, 'active'),
        p_color, p_icon, p_starts_at, p_ends_at, p_all_day_start, p_all_day_end,
        p_cover_media_id, p_parent_entity_id, coalesce(p_sort_order, 0),
        coalesce(p_metadata, '{}'::jsonb),
        1, auth.uid(), auth.uid()
      )
      returning * into v_result;

      v_operation := 'create';
      v_new_version := 1;
    end if;
  else
    if not found then
      raise exception 'entity % not found in space %', p_entity_id, p_space_id
        using errcode = 'P0002';
    end if;

    if v_existing.version <> p_expected_version then
      insert into public.conflict_versions (
        space_id, entity_id, mutation_id,
        client_version, server_version,
        client_payload, server_payload, device_id
      )
      values (
        p_space_id, p_entity_id, p_mutation_id,
        p_expected_version, v_existing.version,
        jsonb_build_object(
          'title', p_title, 'status', p_status, 'metadata', p_metadata
        ),
        to_jsonb(v_existing),
        p_device_id
      );

      raise exception 'version conflict: expected %, server has %',
        p_expected_version, v_existing.version
        using errcode = '40001';
    end if;

    v_changed := public.entity_payload_changed(
      v_existing, p_title, p_subtitle, p_description, p_status,
      p_color, p_icon, p_starts_at, p_ends_at, p_all_day_start, p_all_day_end,
      p_parent_entity_id, p_sort_order, p_metadata
    )
    or v_existing.cover_media_id is distinct from p_cover_media_id;

    v_new_version := case
      when v_changed then v_existing.version + 1
      else v_existing.version
    end;

    update public.entities e
    set
      title = coalesce(p_title, e.title),
      subtitle = coalesce(p_subtitle, e.subtitle),
      description = coalesce(p_description, e.description),
      status = coalesce(p_status, e.status),
      color = coalesce(p_color, e.color),
      icon = coalesce(p_icon, e.icon),
      starts_at = coalesce(p_starts_at, e.starts_at),
      ends_at = coalesce(p_ends_at, e.ends_at),
      all_day_start = coalesce(p_all_day_start, e.all_day_start),
      all_day_end = coalesce(p_all_day_end, e.all_day_end),
      cover_media_id = coalesce(p_cover_media_id, e.cover_media_id),
      parent_entity_id = coalesce(p_parent_entity_id, e.parent_entity_id),
      sort_order = coalesce(p_sort_order, e.sort_order),
      metadata = coalesce(p_metadata, e.metadata),
      version = v_new_version,
      updated_by = auth.uid(),
      updated_at = timezone('utc', now())
    where e.id = p_entity_id
    returning * into v_result;

    v_operation := case when v_changed then 'update' else 'upsert' end;
  end if;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_entity_id, v_operation, 'entities',
    v_new_version, to_jsonb(v_result), p_device_id
  );

  perform public.log_activity(
    p_space_id, p_entity_id, v_operation, 'entity', p_entity_id,
    p_mutation_id, to_jsonb(v_result), p_device_id
  );

  return jsonb_build_object(
    'status', 'applied',
    'mutation_id', p_mutation_id,
    'entity', to_jsonb(v_result),
    'version', v_new_version,
    'receipt', to_jsonb(v_receipt)
  );
end;
$$;

revoke all on function public.apply_entity_mutation(
  uuid, uuid, uuid, integer, text, text, text, text, text, text, text,
  timestamptz, timestamptz, date, date, uuid, uuid, integer, jsonb, uuid, boolean
) from public;
grant execute on function public.apply_entity_mutation(
  uuid, uuid, uuid, integer, text, text, text, text, text, text, text,
  timestamptz, timestamptz, date, date, uuid, uuid, integer, jsonb, uuid, boolean
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- soft_delete_entity
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_entity(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_expected_version integer,
  p_device_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
  v_existing public.entities;
  v_result public.entities;
  v_new_version integer;
begin
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'entity_id', p_entity_id,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id using errcode = '42501';
  end if;

  select * into v_existing
  from public.entities e
  where e.id = p_entity_id
    and e.space_id = p_space_id
    and e.deleted_at is null;

  if not found then
    raise exception 'entity % not found or already deleted', p_entity_id
      using errcode = 'P0002';
  end if;

  if v_existing.version <> p_expected_version then
    insert into public.conflict_versions (
      space_id, entity_id, mutation_id,
      client_version, server_version,
      client_payload, server_payload, device_id
    )
    values (
      p_space_id, p_entity_id, p_mutation_id,
      p_expected_version, v_existing.version,
      '{"operation":"soft_delete"}'::jsonb, to_jsonb(v_existing), p_device_id
    );

    raise exception 'version conflict: expected %, server has %',
      p_expected_version, v_existing.version using errcode = '40001';
  end if;

  v_new_version := v_existing.version + 1;

  update public.entities e
  set
    deleted_at = timezone('utc', now()),
    deleted_by = auth.uid(),
    version = v_new_version,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where e.id = p_entity_id
  returning * into v_result;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_entity_id, 'soft_delete', 'entities',
    v_new_version, to_jsonb(v_result), p_device_id
  );

  perform public.log_activity(
    p_space_id, p_entity_id, 'soft_delete', 'entity', p_entity_id,
    p_mutation_id, to_jsonb(v_result), p_device_id
  );

  return jsonb_build_object(
    'status', 'applied',
    'mutation_id', p_mutation_id,
    'entity', to_jsonb(v_result),
    'version', v_new_version,
    'receipt', to_jsonb(v_receipt)
  );
end;
$$;

revoke all on function public.soft_delete_entity(uuid, uuid, uuid, integer, uuid) from public;
grant execute on function public.soft_delete_entity(uuid, uuid, uuid, integer, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- restore_entity (aus Papierkorb)
-- ---------------------------------------------------------------------------
create or replace function public.restore_entity(
  p_mutation_id uuid,
  p_space_id uuid,
  p_entity_id uuid,
  p_expected_version integer,
  p_device_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
  v_existing public.entities;
  v_result public.entities;
  v_new_version integer;
begin
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'entity_id', p_entity_id,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id using errcode = '42501';
  end if;

  select * into v_existing
  from public.entities e
  where e.id = p_entity_id
    and e.space_id = p_space_id
    and e.deleted_at is not null;

  if not found then
    raise exception 'entity % not found in trash', p_entity_id using errcode = 'P0002';
  end if;

  if v_existing.version <> p_expected_version then
    raise exception 'version conflict: expected %, server has %',
      p_expected_version, v_existing.version using errcode = '40001';
  end if;

  v_new_version := v_existing.version + 1;

  update public.entities e
  set
    deleted_at = null,
    deleted_by = null,
    version = v_new_version,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where e.id = p_entity_id
  returning * into v_result;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_entity_id, 'restore', 'entities',
    v_new_version, to_jsonb(v_result), p_device_id
  );

  perform public.log_activity(
    p_space_id, p_entity_id, 'restore', 'entity', p_entity_id,
    p_mutation_id, to_jsonb(v_result), p_device_id
  );

  return jsonb_build_object(
    'status', 'applied',
    'mutation_id', p_mutation_id,
    'entity', to_jsonb(v_result),
    'version', v_new_version,
    'receipt', to_jsonb(v_receipt)
  );
end;
$$;

revoke all on function public.restore_entity(uuid, uuid, uuid, integer, uuid) from public;
grant execute on function public.restore_entity(uuid, uuid, uuid, integer, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Generische Tabellen-Mutation (Detailtabellen, Notizen, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.apply_row_mutation(
  p_mutation_id uuid,
  p_space_id uuid,
  p_table_name text,
  p_row_id uuid,
  p_expected_version integer default null,
  p_payload jsonb default '{}'::jsonb,
  p_device_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.mutation_receipts;
begin
  select * into v_receipt
  from public.mutation_receipts mr
  where mr.mutation_id = p_mutation_id;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'mutation_id', p_mutation_id,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of space %', p_space_id using errcode = '42501';
  end if;

  -- Kein dynamisches SQL vom Client: nur erlaubte Tabellen
  if p_table_name not in (
    'notes', 'checklist_items', 'task_details', 'wish_details',
    'reminders', 'widget_instances', 'view_layouts'
  ) then
    raise exception 'table % not allowed for apply_row_mutation', p_table_name
      using errcode = '42501';
  end if;

  v_receipt := public.record_mutation_receipt(
    p_mutation_id, p_space_id, p_row_id, 'upsert', p_table_name,
    p_expected_version, p_payload, p_device_id
  );

  perform public.log_activity(
    p_space_id, null, 'upsert', p_table_name, p_row_id,
    p_mutation_id, p_payload, p_device_id
  );

  return jsonb_build_object(
    'status', 'accepted',
    'mutation_id', p_mutation_id,
    'table', p_table_name,
    'receipt', to_jsonb(v_receipt),
    'note', 'Use typed RPCs or direct RLS writes for full row application'
  );
end;
$$;

revoke all on function public.apply_row_mutation(uuid, uuid, text, uuid, integer, jsonb, uuid) from public;
grant execute on function public.apply_row_mutation(uuid, uuid, text, uuid, integer, jsonb, uuid)
  to authenticated, service_role;

comment on function public.apply_entity_mutation is
  'Wendet Entity-Mutation idempotent an; Versionskonflikte → conflict_versions + Exception 40001.';

comment on function public.soft_delete_entity is
  'Soft Delete mit Versionsprüfung und Mutation Receipt.';

comment on function public.restore_entity is
  'Stellt gelöschte Entity wieder her (Papierkorb).';
