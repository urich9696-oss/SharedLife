-- Partner-Sync: Tabellen für Supabase Realtime freischalten.
-- Ohne Eintrag in supabase_realtime kommen keine postgres_changes-Events an.

do $$
declare
  tbl text;
  tables text[] := array[
    'entities',
    'notes',
    'checklists',
    'checklist_items',
    'budgets',
    'transactions',
    'media_assets',
    'entity_media',
    'timeline_entries',
    'reminders',
    'locations',
    'entity_locations',
    'entity_links',
    'trip_details',
    'date_details',
    'goal_details',
    'event_details',
    'task_details',
    'list_details',
    'wish_details',
    'moment_details',
    'project_details',
    'milestone_details',
    'widget_instances',
    'view_layouts'
  ];
begin
  foreach tbl in array tables loop
    if to_regclass(format('public.%I', tbl)) is null then
      continue;
    end if;
    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      continue;
    end if;
    execute format('alter publication supabase_realtime add table public.%I', tbl);
  end loop;
end $$;
