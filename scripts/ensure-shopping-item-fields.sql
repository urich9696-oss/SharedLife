-- SharedLife: Einkaufs-Felder auf checklist_items (idempotent)
-- Behebt Sync-Fehler wenn die App quantity/unit/category/is_favorite mitschickt.

alter table public.checklist_items
  add column if not exists quantity text,
  add column if not exists unit text,
  add column if not exists category text,
  add column if not exists is_favorite boolean not null default false;

create index if not exists idx_checklist_items_active_unchecked
  on public.checklist_items (checklist_id, sort_order)
  where deleted_at is null and is_checked = false;

notify pgrst, 'reload schema';
