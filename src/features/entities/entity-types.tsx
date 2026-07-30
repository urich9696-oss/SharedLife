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
    label: 'Liste',
    labelPlural: 'Listen',
    description: 'Checkliste mit Punkten',
    creatable: true,
    planningSegment: true,
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
    planningSegment: true,
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
    label: 'Projekt',
    labelPlural: 'Projekte',
    description: 'Grösseres Vorhaben',
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
}

export const CREATABLE_ENTITY_TYPES = (Object.values(ENTITY_TYPE_META) as EntityTypeMeta[])
  .filter((m) => m.creatable)
  .map((m) => m.type)

export const PLANNING_SEGMENTS = [
  { key: 'trips', label: 'Reisen', entityType: 'trip' as const },
  { key: 'dates', label: 'Dates', entityType: 'date' as const },
  { key: 'goals', label: 'Ziele', entityType: 'goal' as const },
  { key: 'events', label: 'Termine', entityType: 'event' as const },
  { key: 'tasks', label: 'Aufgaben', entityType: 'task' as const },
  { key: 'lists', label: 'Listen', entityType: 'list' as const },
  { key: 'wishes', label: 'Wünsche', entityType: 'wish' as const },
  { key: 'projects', label: 'Projekte', entityType: 'project' as const },
  { key: 'budgets', label: 'Budgets', entityType: null },
  { key: 'reminders', label: 'Erinnerungen', entityType: null },
] as const

export function getEntityTypeMeta(type: EntityType): EntityTypeMeta {
  return ENTITY_TYPE_META[type]
}

export function getStatusLabel(type: EntityType, status: EntityStatus): string {
  return ENTITY_TYPE_META[type].statusLabels[status] ?? statusLabelsDe[status]
}

export function entityDetailPath(type: EntityType, id: string): string {
  return `/entities/${type}/${id}`
}
