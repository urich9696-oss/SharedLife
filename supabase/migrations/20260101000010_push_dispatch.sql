-- SharedLife: Push-Dispatch-Hilfen (next_trigger_at, eindeutige Deliveries)

alter table public.reminders
  add column if not exists next_trigger_at timestamptz;

update public.reminders
set next_trigger_at = remind_at
where next_trigger_at is null;

create index if not exists idx_reminders_next_trigger
  on public.reminders (next_trigger_at)
  where is_active = true and deleted_at is null and notify_push = true;

create unique index if not exists idx_reminder_deliveries_unique
  on public.reminder_deliveries (reminder_id, scheduled_for, coalesce(push_subscription_id, '00000000-0000-0000-0000-000000000000'::uuid));

comment on column public.reminders.next_trigger_at is
  'Nächster geplanter Versandzeitpunkt; bei Wiederholung nach Versand aktualisiert.';
