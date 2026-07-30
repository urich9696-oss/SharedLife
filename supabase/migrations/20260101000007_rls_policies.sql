-- SharedLife: Row Level Security auf allen privaten Tabellen

-- ---------------------------------------------------------------------------
-- DELETE für Clients sperren (nur Soft Delete via UPDATE)
-- ---------------------------------------------------------------------------
revoke delete on table public.spaces from authenticated, anon;
revoke delete on table public.profiles from authenticated, anon;
revoke delete on table public.space_members from authenticated, anon;
revoke delete on table public.devices from authenticated, anon;
revoke delete on table public.entities from authenticated, anon;
revoke delete on table public.trip_details from authenticated, anon;
revoke delete on table public.date_details from authenticated, anon;
revoke delete on table public.goal_details from authenticated, anon;
revoke delete on table public.event_details from authenticated, anon;
revoke delete on table public.task_details from authenticated, anon;
revoke delete on table public.list_details from authenticated, anon;
revoke delete on table public.wish_details from authenticated, anon;
revoke delete on table public.moment_details from authenticated, anon;
revoke delete on table public.project_details from authenticated, anon;
revoke delete on table public.milestone_details from authenticated, anon;
revoke delete on table public.entity_links from authenticated, anon;
revoke delete on table public.notes from authenticated, anon;
revoke delete on table public.checklists from authenticated, anon;
revoke delete on table public.checklist_items from authenticated, anon;
revoke delete on table public.budgets from authenticated, anon;
revoke delete on table public.transactions from authenticated, anon;
revoke delete on table public.locations from authenticated, anon;
revoke delete on table public.entity_locations from authenticated, anon;
revoke delete on table public.media_assets from authenticated, anon;
revoke delete on table public.entity_media from authenticated, anon;
revoke delete on table public.timeline_entries from authenticated, anon;
revoke delete on table public.timeline_entry_media from authenticated, anon;
revoke delete on table public.activity_log from authenticated, anon;
revoke delete on table public.conflict_versions from authenticated, anon;
revoke delete on table public.mutation_receipts from authenticated, anon;
revoke delete on table public.view_layouts from authenticated, anon;
revoke delete on table public.widget_instances from authenticated, anon;
revoke delete on table public.reminders from authenticated, anon;
revoke delete on table public.push_subscriptions from authenticated, anon;
revoke delete on table public.reminder_deliveries from authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS aktivieren
-- ---------------------------------------------------------------------------
alter table public.spaces enable row level security;
alter table public.profiles enable row level security;
alter table public.space_members enable row level security;
alter table public.devices enable row level security;
alter table public.entities enable row level security;
alter table public.trip_details enable row level security;
alter table public.date_details enable row level security;
alter table public.goal_details enable row level security;
alter table public.event_details enable row level security;
alter table public.task_details enable row level security;
alter table public.list_details enable row level security;
alter table public.wish_details enable row level security;
alter table public.moment_details enable row level security;
alter table public.project_details enable row level security;
alter table public.milestone_details enable row level security;
alter table public.entity_links enable row level security;
alter table public.notes enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.locations enable row level security;
alter table public.entity_locations enable row level security;
alter table public.media_assets enable row level security;
alter table public.entity_media enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.timeline_entry_media enable row level security;
alter table public.activity_log enable row level security;
alter table public.conflict_versions enable row level security;
alter table public.mutation_receipts enable row level security;
alter table public.view_layouts enable row level security;
alter table public.widget_instances enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_deliveries enable row level security;

-- ---------------------------------------------------------------------------
-- spaces
-- ---------------------------------------------------------------------------
create policy spaces_select_member
  on public.spaces for select to authenticated
  using (public.is_space_member(id));

create policy spaces_update_member
  on public.spaces for update to authenticated
  using (public.is_space_member(id))
  with check (public.is_space_member(id));

-- ---------------------------------------------------------------------------
-- profiles – lesbar für Space-Mitbewohner, schreibbar nur eigenes Profil
-- ---------------------------------------------------------------------------
create policy profiles_select_self_or_co_member
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.space_members sm_self
      join public.space_members sm_other
        on sm_self.space_id = sm_other.space_id
      where sm_self.user_id = auth.uid()
        and sm_other.user_id = profiles.id
    )
  );

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- space_members – nur SELECT; keine Client-Manipulation
-- ---------------------------------------------------------------------------
create policy space_members_select_member
  on public.space_members for select to authenticated
  using (public.is_space_member(space_id));

-- Keine INSERT/UPDATE/DELETE Policies für authenticated → verweigert

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create policy devices_select_member
  on public.devices for select to authenticated
  using (public.is_space_member(space_id));

create policy devices_insert_member
  on public.devices for insert to authenticated
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

create policy devices_update_member
  on public.devices for update to authenticated
  using (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Standard-Policies für space-scoped Tabellen (SELECT/INSERT/UPDATE)
-- ---------------------------------------------------------------------------
create policy entities_member_all
  on public.entities for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy trip_details_member_all
  on public.trip_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy date_details_member_all
  on public.date_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy goal_details_member_all
  on public.goal_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy event_details_member_all
  on public.event_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy task_details_member_all
  on public.task_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy list_details_member_all
  on public.list_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy wish_details_member_all
  on public.wish_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy moment_details_member_all
  on public.moment_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy project_details_member_all
  on public.project_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy milestone_details_member_all
  on public.milestone_details for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy entity_links_member_all
  on public.entity_links for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy notes_member_all
  on public.notes for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy checklists_member_all
  on public.checklists for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy checklist_items_member_all
  on public.checklist_items for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy budgets_member_all
  on public.budgets for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy transactions_member_all
  on public.transactions for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy locations_member_all
  on public.locations for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy entity_locations_member_all
  on public.entity_locations for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy media_assets_member_all
  on public.media_assets for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy entity_media_member_all
  on public.entity_media for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy timeline_entries_member_all
  on public.timeline_entries for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy timeline_entry_media_member_all
  on public.timeline_entry_media for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy view_layouts_member_all
  on public.view_layouts for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy widget_instances_member_all
  on public.widget_instances for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

create policy reminders_member_all
  on public.reminders for all to authenticated
  using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

-- ---------------------------------------------------------------------------
-- push_subscriptions – nur eigene Subscriptions
-- ---------------------------------------------------------------------------
create policy push_subscriptions_select_own
  on public.push_subscriptions for select to authenticated
  using (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert to authenticated
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

create policy push_subscriptions_update_own
  on public.push_subscriptions for update to authenticated
  using (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_space_member(space_id)
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Systemtabellen: Lesen für Mitglieder, Schreiben nur Service Role
-- ---------------------------------------------------------------------------
create policy activity_log_select_member
  on public.activity_log for select to authenticated
  using (public.is_space_member(space_id));

create policy activity_log_insert_service
  on public.activity_log for insert to authenticated
  with check (public.is_service_role());

create policy mutation_receipts_select_member
  on public.mutation_receipts for select to authenticated
  using (public.is_space_member(space_id));

create policy mutation_receipts_insert_service
  on public.mutation_receipts for insert to authenticated
  with check (public.is_service_role());

create policy conflict_versions_select_member
  on public.conflict_versions for select to authenticated
  using (public.is_space_member(space_id));

create policy conflict_versions_insert_service
  on public.conflict_versions for insert to authenticated
  with check (public.is_service_role());

create policy conflict_versions_update_service
  on public.conflict_versions for update to authenticated
  using (public.is_service_role())
  with check (public.is_service_role());

create policy reminder_deliveries_select_member
  on public.reminder_deliveries for select to authenticated
  using (public.is_space_member(space_id));

create policy reminder_deliveries_insert_service
  on public.reminder_deliveries for insert to authenticated
  with check (public.is_service_role());

create policy reminder_deliveries_update_service
  on public.reminder_deliveries for update to authenticated
  using (public.is_service_role())
  with check (public.is_service_role());

-- Service Role umgeht RLS standardmäßig; explizite Grants für Sync-Funktionen
grant usage on schema public to authenticated, service_role;
grant select, insert, update on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
