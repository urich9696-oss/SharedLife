import type { EntityType } from '@/lib/indexed-db/schema'

export type ContentGroup = 'planen' | 'momente' | 'gemeinsam' | 'alltag' | 'finanzen' | 'system'

/** Obergruppe aus Modultyp — Nutzer wählt sie nicht selbst */
export function groupForEntityType(type: EntityType): ContentGroup {
  switch (type) {
    case 'event':
    case 'task':
    case 'date':
    case 'trip':
      return 'planen'
    case 'moment':
      return 'momente'
    case 'goal':
    case 'wish':
    case 'gift':
    case 'leisure':
      return 'gemeinsam'
    case 'list':
    case 'recipe':
      return 'alltag'
    case 'expense':
      return 'finanzen'
    default:
      return 'system'
  }
}

export function groupLabel(group: ContentGroup): string {
  switch (group) {
    case 'planen':
      return 'Planen'
    case 'momente':
      return 'Momente'
    case 'gemeinsam':
      return 'Gemeinsam'
    case 'alltag':
      return 'Alltag'
    case 'finanzen':
      return 'Finanzen'
    default:
      return 'Mehr'
  }
}

/** Typen mit dominantem Hero */
export function hasHeroMedia(type: EntityType): boolean {
  return [
    'date',
    'moment',
    'trip',
    'goal',
    'wish',
    'gift',
    'leisure',
    'recipe',
  ].includes(type)
}

/** Erlaubte Zugehörigkeits-Ziele für Momente */
export const MOMENT_BELONGING_TYPES: EntityType[] = ['trip', 'date', 'goal']

/** Erlaubte Zuordnungs-Ziele für Aufgaben */
export const TASK_ASSIGNMENT_TYPES: EntityType[] = ['trip', 'goal', 'date']
