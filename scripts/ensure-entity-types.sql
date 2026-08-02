-- SharedLife: erweiterte Entity-Typen inkl. recipe (idempotent)
-- Ohne diese Constraint scheitert der Sync für Rezepte, Geschenke, Haushalt usw.

alter table public.entities drop constraint if exists entities_entity_type_check;

alter table public.entities
  add constraint entities_entity_type_check
  check (entity_type in (
    'trip', 'date', 'goal', 'event', 'task', 'list',
    'wish', 'moment', 'project', 'note', 'milestone',
    'recipe', 'gift', 'household', 'leisure', 'journal', 'expense'
  ));

-- Pair-Profil-Spalten (aus derselben Migration, falls noch fehlend)
alter table public.spaces
  add column if not exists partner_a_name text,
  add column if not exists partner_b_name text,
  add column if not exists partner_a_avatar_path text,
  add column if not exists partner_b_avatar_path text,
  add column if not exists cover_media_path text,
  add column if not exists together_since date,
  add column if not exists couple_blurb text;

notify pgrst, 'reload schema';
