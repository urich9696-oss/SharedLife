import type { EntityStatus, EntityType } from '@/lib/indexed-db/schema'
import type { ReactNode } from 'react'

export interface EntityTypeMeta {
  type: EntityType
  label: string
  labelPlural: string
  description: string
  creatable: boolean
  planningSegment?: boolean
  statuses: EntityStatus[]
  statusLabels: Record<EntityStatus, string>
  icon: ReactNode
}

const defaultStatuses: EntityStatus[] = ['active', 'completed', 'archived', 'cancelled', 'draft']

const statusLabelsDe: Record<EntityStatus, string> = {
  active: 'Aktiv',
  archived: 'Archiviert',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
  draft: 'Entwurf',
}

function iconPath(d: string) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const ENTITY_TYPE_META: Record<EntityType, EntityTypeMeta> = {
  trip: {
    type: 'trip',
    label: 'Reise',
    labelPlural: 'Reisen',
    description: 'Gemeinsame Reise planen',
    creatable: true,
    planningSegment: true,
    statuses: ['draft', 'active', 'completed', 'cancelled'],
    statusLabels: { ...statusLabelsDe, draft: 'Geplant' },
    icon: iconPath('M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2z'),
  },
  date: {
    type: 'date',
    label: 'Date',
    labelPlural: 'Dates',
    description: 'Gemeinsame Zeit zu zweit',
    creatable: true,
    planningSegment: true,
    statuses: ['draft', 'active', 'completed', 'cancelled'],
    statusLabels: { ...statusLabelsDe, draft: 'Idee' },
    icon: iconPath('M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'),
  },
  goal: {
    type: 'goal',
    label: 'Ziel',
    labelPlural: 'Ziele',
    description: 'Gemeinsames Ziel verfolgen',
    creatable: true,
    planningSegment: true,
    statuses: ['active', 'completed', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.9L12 14.8 7.7 16.6l.8-4.9L5 8.3l4.8-.8L12 3z'),
  },
  event: {
    type: 'event',
    label: 'Termin',
    labelPlural: 'Termine',
    description: 'Kalendertermin mit Datum',
    creatable: true,
    planningSegment: true,
    statuses: ['active', 'completed', 'cancelled'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z'),
  },
  task: {
    type: 'task',
    label: 'Aufgabe',
    labelPlural: 'Aufgaben',
    description: 'Etwas erledigen',
    creatable: true,
    planningSegment: true,
    statuses: ['active', 'completed', 'cancelled'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'),
  },
  list: {
    type: 'list',
    label: 'Einkauf',
    labelPlural: 'Einkauf',
    description: 'Gemeinsame Einkaufsliste',
    creatable: true,
    planningSegment: false,
    statuses: ['active', 'completed', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  },
  wish: {
    type: 'wish',
    label: 'Wunsch',
    labelPlural: 'Wünsche',
    description: 'Gemeinsamer Wunsch',
    creatable: true,
    planningSegment: false,
    statuses: ['active', 'completed', 'archived'],
    statusLabels: { ...statusLabelsDe, completed: 'Erfüllt' },
    icon: iconPath('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  },
  moment: {
    type: 'moment',
    label: 'Moment',
    labelPlural: 'Momente',
    description: 'Besonderen Moment festhalten',
    creatable: true,
    statuses: ['active', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'),
  },
  project: {
    type: 'project',
    label: 'Vorhaben',
    labelPlural: 'Vorhaben',
    description: 'Gemeinsames Vorhaben',
    creatable: true,
    planningSegment: true,
    statuses: ['draft', 'active', 'completed', 'archived', 'cancelled'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'),
  },
  note: {
    type: 'note',
    label: 'Notiz',
    labelPlural: 'Notizen',
    description: 'Freie Notiz',
    creatable: true,
    statuses: ['active', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6'),
  },
  milestone: {
    type: 'milestone',
    label: 'Meilenstein',
    labelPlural: 'Meilensteine',
    description: 'Zwischenziel',
    creatable: false,
    statuses: defaultStatuses,
    statusLabels: statusLabelsDe,
    icon: iconPath('M12 2v20M5 12h14'),
  },
  recipe: {
    type: 'recipe',
    label: 'Rezept',
    labelPlural: 'Rezepte',
    description: 'Gemeinsames Lieblingsrezept',
    creatable: true,
    statuses: ['active', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M12 3v18M5 8h14M7 12h10M9 16h6'),
  },
  gift: {
    type: 'gift',
    label: 'Wunsch',
    labelPlural: 'Wünsche',
    description: 'Geschenkidee oder Wunsch merken',
    creatable: true,
    planningSegment: false,
    statuses: ['draft', 'active', 'completed', 'archived'],
    statusLabels: { ...statusLabelsDe, draft: 'Idee', completed: 'Übergeben' },
    icon: iconPath('M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z'),
  },
  household: {
    type: 'household',
    label: 'Zuhause',
    labelPlural: 'Zuhause',
    description: 'Haushaltsaufgabe, Inventar oder Wartung',
    creatable: true,
    planningSegment: false,
    statuses: ['active', 'completed', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z'),
  },
  leisure: {
    type: 'leisure',
    label: 'Idee',
    labelPlural: 'Ideen',
    description: 'Film, Restaurant, Buch oder Aktivität',
    creatable: true,
    planningSegment: false,
    statuses: ['draft', 'active', 'completed', 'archived'],
    statusLabels: { ...statusLabelsDe, draft: 'Idee', completed: 'Erledigt' },
    icon: iconPath('M5 5h14v14H5zM9 9h6v6H9z'),
  },
  journal: {
    type: 'journal',
    label: 'Moment',
    labelPlural: 'Momente',
    description: 'Gemeinsamen Moment in Worte fassen',
    creatable: true,
    statuses: ['active', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M4 4h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z'),
  },
  expense: {
    type: 'expense',
    label: 'Ausgabe',
    labelPlural: 'Ausgaben',
    description: 'Gemeinsame Ausgabe erfassen',
    creatable: true,
    planningSegment: false,
    statuses: ['active', 'archived'],
    statusLabels: statusLabelsDe,
    icon: iconPath('M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'),
  },
}

/** Primäre Plus-Aktionen (nutzerseitig verständlich) */
export const PRIMARY_CREATE_ACTIONS = [
  {
    key: 'moment',
    label: 'Moment festhalten',
    description: 'Foto oder Erinnerung speichern',
    kind: 'route' as const,
    path: '/erinnerungen/neu',
    contexts: ['momente', 'default'] as const,
  },
  {
    key: 'shopping-item',
    label: 'Einkaufsartikel hinzufügen',
    description: 'Schnell zur gemeinsamen Liste',
    kind: 'route' as const,
    path: '/einkauf?focus=1',
    contexts: ['einkauf', 'default'] as const,
  },
  {
    key: 'task',
    label: 'Aufgabe erstellen',
    description: 'Etwas gemeinsam erledigen',
    kind: 'entity' as const,
    entityType: 'task' as EntityType,
    contexts: ['aufgaben', 'default'] as const,
  },
  {
    key: 'event',
    label: 'Termin erstellen',
    description: 'Datum im Kalender festhalten',
    kind: 'entity' as const,
    entityType: 'event' as EntityType,
    contexts: ['kalender', 'default'] as const,
  },
  {
    key: 'trip-or-date',
    label: 'Reise oder Date planen',
    description: 'Gemeinsames Vorhaben starten',
    kind: 'chooser' as const,
    chooserTypes: ['trip', 'date'] as EntityType[],
    contexts: ['vorhaben', 'default'] as const,
  },
] as const

/** Sekundäre Create-Typen hinter „Mehr erstellen“ */
export const MORE_CREATE_TYPES: EntityType[] = [
  'goal',
  'project',
  'wish',
  'gift',
  'recipe',
  'note',
  'leisure',
  'household',
  'journal',
]

/** @deprecated Nutze PRIMARY_CREATE_ACTIONS / MORE_CREATE_TYPES */
export const QUICK_CREATE_TYPES: EntityType[] = [
  'moment',
  'task',
  'event',
  'trip',
  'date',
  ...MORE_CREATE_TYPES,
]

/** @deprecated Nutze PRIMARY_CREATE_ACTIONS */
export const QUICK_CREATE_ACTIONS = [
  {
    key: 'shopping-item',
    label: 'Einkaufsartikel hinzufügen',
    description: 'Schnell zur gemeinsamen Einkaufsliste',
    path: '/einkauf?focus=1',
  },
] as const

export const CREATABLE_ENTITY_TYPES = (Object.values(ENTITY_TYPE_META) as EntityTypeMeta[])
  .filter((m) => m.creatable)
  .map((m) => m.type)

/** V3: drei verständliche Hauptbereiche unter Planen */
export const PLANNING_TABS = [
  { key: 'kalender', label: 'Kalender' },
  { key: 'vorhaben', label: 'Vorhaben' },
  { key: 'aufgaben', label: 'Aufgaben' },
] as const

export type PlanningTabKey = (typeof PLANNING_TABS)[number]['key']

/** Legacy-Segmente bleiben für Deep-Link-Kompatibilität gemappt */
export const PLANNING_SEGMENTS = [
  { key: 'trips', label: 'Reisen', entityType: 'trip' as const, tab: 'vorhaben' as const },
  { key: 'dates', label: 'Dates', entityType: 'date' as const, tab: 'vorhaben' as const },
  { key: 'goals', label: 'Ziele', entityType: 'goal' as const, tab: 'vorhaben' as const },
  { key: 'projects', label: 'Vorhaben', entityType: 'project' as const, tab: 'vorhaben' as const },
  { key: 'events', label: 'Termine', entityType: 'event' as const, tab: 'kalender' as const },
  { key: 'tasks', label: 'Aufgaben', entityType: 'task' as const, tab: 'aufgaben' as const },
] as const

export type CreateContext =
  | 'default'
  | 'momente'
  | 'einkauf'
  | 'kalender'
  | 'aufgaben'
  | 'vorhaben'

export function resolveCreateContext(pathname: string, search = ''): CreateContext {
  const params = new URLSearchParams(search)
  const tab = params.get('tab')
  if (pathname.startsWith('/einkauf')) return 'einkauf'
  if (pathname.startsWith('/erinnerungen') || pathname.startsWith('/timeline') || pathname.startsWith('/momente')) {
    return 'momente'
  }
  if (pathname.startsWith('/calendar')) return 'kalender'
  if (pathname.startsWith('/planen')) {
    if (tab === 'aufgaben') return 'aufgaben'
    if (tab === 'vorhaben') return 'vorhaben'
    return 'kalender'
  }
  return 'default'
}

export function getEntityTypeMeta(type: EntityType): EntityTypeMeta {
  return ENTITY_TYPE_META[type]
}

export function getStatusLabel(type: EntityType, status: EntityStatus): string {
  return ENTITY_TYPE_META[type].statusLabels[status] ?? statusLabelsDe[status]
}

export function entityDetailPath(type: EntityType, id: string): string {
  return `/entities/${type}/${id}`
}
