-- SharedLife: Space-Inhalte leeren (Testdaten entfernen)
-- Behält Space, Mitglieder, Geräte und Einladungs-Metadaten.

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

  if not public.is_space_member(p_space_id) then
    raise exception 'not a space member';
  end if;

  -- Reihenfolge: abhängige Tabellen zuerst
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

  return jsonb_build_object(
    'space_id', p_space_id,
    'cleared_by', v_uid,
    'counts', v_counts
  );
end;
$$;

comment on function public.clear_space_content(uuid) is
  'Löscht alle Inhalte eines Spaces (Testdaten-Reset). Behält Space, Mitglieder, Geräte, Invites.';

revoke all on function public.clear_space_content(uuid) from public;
grant execute on function public.clear_space_content(uuid) to authenticated;
grant execute on function public.clear_space_content(uuid) to service_role;
