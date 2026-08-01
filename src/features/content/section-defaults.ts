import type { EntityType } from '@/lib/indexed-db/schema'
import type { WidgetType } from '@/features/widgets/registry'

export type DetailSectionKey =
  | 'media'
  | 'countdown'
  | 'checklist'
  | 'budget'
  | 'places'
  | 'notes'
  | 'milestones'
  | 'tasks'
  | 'reminders'
  | 'goal_progress'
  | 'links'

export interface DetailSectionSpec {
  key: DetailSectionKey
  /** Nutzerseitige Bezeichnung statt „Widget“ */
  label: string
  widgetType?: WidgetType
}

/**
 * Standardabschnitte pro Inhaltstyp.
 * Leere Abschnitte werden in der UI ausgeblendet.
 */
export const DEFAULT_SECTIONS_BY_TYPE: Record<EntityType, DetailSectionSpec[]> = {
  trip: [
    { key: 'countdown', label: 'Countdown', widgetType: 'countdown' },
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
    { key: 'checklist', label: 'Checkliste', widgetType: 'checklist' },
    { key: 'budget', label: 'Budget', widgetType: 'budget_progress' },
    { key: 'places', label: 'Orte', widgetType: 'places' },
    { key: 'notes', label: 'Notizen', widgetType: 'note_card' },
  ],
  date: [
    { key: 'countdown', label: 'Datum', widgetType: 'countdown' },
    { key: 'places', label: 'Ort', widgetType: 'places' },
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
  ],
  goal: [
    { key: 'goal_progress', label: 'Fortschritt', widgetType: 'goal_progress' },
    { key: 'milestones', label: 'Meilensteine', widgetType: 'milestones' },
    { key: 'tasks', label: 'Aufgaben', widgetType: 'tasks' },
    { key: 'budget', label: 'Budget', widgetType: 'budget_progress' },
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
  ],
  event: [
    { key: 'countdown', label: 'Termin', widgetType: 'countdown' },
    { key: 'places', label: 'Ort', widgetType: 'places' },
    { key: 'reminders', label: 'Erinnerung', widgetType: 'reminders' },
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
  ],
  task: [
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
    { key: 'reminders', label: 'Erinnerung', widgetType: 'reminders' },
  ],
  moment: [
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
    { key: 'places', label: 'Ort', widgetType: 'places' },
    { key: 'notes', label: 'Geschichte', widgetType: 'note_card' },
  ],
  wish: [
    { key: 'media', label: 'Bild', widgetType: 'photo_gallery' },
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
  ],
  gift: [
    { key: 'media', label: 'Bild', widgetType: 'photo_gallery' },
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
  ],
  recipe: [
    { key: 'media', label: 'Bild', widgetType: 'photo_gallery' },
    { key: 'checklist', label: 'Zutaten', widgetType: 'checklist' },
    { key: 'notes', label: 'Zubereitung', widgetType: 'note_card' },
  ],
  list: [{ key: 'checklist', label: 'Artikel', widgetType: 'checklist' }],
  project: [
    { key: 'tasks', label: 'Aufgaben', widgetType: 'tasks' },
    { key: 'checklist', label: 'Checkliste', widgetType: 'checklist' },
    { key: 'budget', label: 'Budget', widgetType: 'budget_progress' },
    { key: 'notes', label: 'Notizen', widgetType: 'note_card' },
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
  ],
  leisure: [
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
  ],
  household: [
    { key: 'tasks', label: 'Aufgaben', widgetType: 'tasks' },
    { key: 'checklist', label: 'Checkliste', widgetType: 'checklist' },
    { key: 'notes', label: 'Notizen', widgetType: 'note_card' },
  ],
  journal: [
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
    { key: 'notes', label: 'Eintrag', widgetType: 'note_card' },
  ],
  expense: [
    { key: 'budget', label: 'Budget', widgetType: 'budget_progress' },
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
  ],
  note: [{ key: 'notes', label: 'Notiz', widgetType: 'note_card' }],
  milestone: [
    { key: 'countdown', label: 'Datum', widgetType: 'countdown' },
    { key: 'media', label: 'Fotos', widgetType: 'photo_gallery' },
    { key: 'notes', label: 'Notiz', widgetType: 'note_card' },
  ],
}

export function defaultWidgetTypesForEntity(type: EntityType): WidgetType[] {
  return DEFAULT_SECTIONS_BY_TYPE[type]
    .map((s) => s.widgetType)
    .filter((t): t is WidgetType => Boolean(t))
}

export function sectionLabelForWidget(type: EntityType, widgetType: WidgetType): string {
  const match = DEFAULT_SECTIONS_BY_TYPE[type]?.find((s) => s.widgetType === widgetType)
  return match?.label ?? 'Abschnitt'
}
