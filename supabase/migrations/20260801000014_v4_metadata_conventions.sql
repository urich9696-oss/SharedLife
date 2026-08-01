-- SharedLife V4: additive conventions (no destructive changes)
--
-- This migration documents client-side metadata conventions introduced in V4.
-- No table drops, no column renames. Existing RLS remains unchanged.
--
-- Entity metadata keys (entities.metadata jsonb):
--   roomKey          text   — household rooms: wohnzimmer|bad|kueche|schlafzimmer|balkon|sonstiges
--   assigneeRole     text   — task pair assignee: dennis|lea|gemeinsam
--   taskCategory     text   — optional task category label
--   ideaCategory     text   — leisure idea category
--   ideaStatus       text   — leisure workflow status
--   favorite         bool   — idea/wish favorite flag
--   fromDateId       uuid   — moment created from a date
--   convertedToMomentId uuid — date converted to moment
--   progressPercent  number — optional UI progress hint
--   v4Module         text   — originating module hint
--
-- Recipe ingredients continue to use public.checklists / checklist_items
-- with checklist.title = 'Zutaten' (quantity/unit/category already present).

comment on column public.entities.metadata is
  'Flexible JSON metadata. V4 conventions: roomKey, assigneeRole, taskCategory, ideaCategory, ideaStatus, favorite, fromDateId, convertedToMomentId, progressPercent, v4Module';
