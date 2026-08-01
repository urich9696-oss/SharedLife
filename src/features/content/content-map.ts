import type { EntityType } from '@/lib/indexed-db/schema'

/** Sichtbare Hauptorte in der V3-Informationsarchitektur */
export type ContentHome =
  | 'home'
  | 'planen-kalender'
  | 'planen-vorhaben'
  | 'planen-aufgaben'
  | 'momente'
  | 'einkauf'
  | 'mehr-alltag'
  | 'mehr-inspiration'
  | 'mehr-finanzen'
  | 'mehr-einstellungen'
  | 'detail'

export interface ContentPlacement {
  entityType: EntityType
  /** Nutzerseitige Bezeichnung */
  userLabel: string
  /** Kanonischer Hauptort (keine Datenkopie) */
  primaryHome: ContentHome
  /** Aggregierte Ansichten dürfen denselben Datensatz zeigen */
  aggregateHomes?: ContentHome[]
  /** Ob der Typ in „Vorhaben“ erscheint */
  isVorhaben?: boolean
  /** Ob der Typ im Kalender aggregiert werden darf */
  calendarEligible?: boolean
}

/**
 * Kanonische Zuordnung interner Entity-Typen → sichtbare Orte.
 * Keine Datenmigration — reine UI-/Navigationszuordnung.
 */
export const CONTENT_PLACEMENT: Record<EntityType, ContentPlacement> = {
  trip: {
    entityType: 'trip',
    userLabel: 'Reise',
    primaryHome: 'planen-vorhaben',
    aggregateHomes: ['home', 'planen-kalender'],
    isVorhaben: true,
    calendarEligible: true,
  },
  date: {
    entityType: 'date',
    userLabel: 'Date',
    primaryHome: 'planen-vorhaben',
    aggregateHomes: ['home', 'planen-kalender'],
    isVorhaben: true,
    calendarEligible: true,
  },
  goal: {
    entityType: 'goal',
    userLabel: 'Ziel',
    primaryHome: 'planen-vorhaben',
    aggregateHomes: ['home'],
    isVorhaben: true,
    calendarEligible: true,
  },
  project: {
    entityType: 'project',
    userLabel: 'Vorhaben',
    primaryHome: 'planen-vorhaben',
    aggregateHomes: ['home'],
    isVorhaben: true,
    calendarEligible: true,
  },
  event: {
    entityType: 'event',
    userLabel: 'Termin',
    primaryHome: 'planen-kalender',
    aggregateHomes: ['home'],
    calendarEligible: true,
  },
  task: {
    entityType: 'task',
    userLabel: 'Aufgabe',
    primaryHome: 'planen-aufgaben',
    aggregateHomes: ['home'],
  },
  moment: {
    entityType: 'moment',
    userLabel: 'Moment',
    primaryHome: 'momente',
    aggregateHomes: ['home'],
  },
  journal: {
    entityType: 'journal',
    userLabel: 'Moment',
    primaryHome: 'momente',
    aggregateHomes: ['home'],
  },
  list: {
    entityType: 'list',
    userLabel: 'Einkauf',
    primaryHome: 'einkauf',
  },
  wish: {
    entityType: 'wish',
    userLabel: 'Wunsch',
    primaryHome: 'mehr-inspiration',
  },
  gift: {
    entityType: 'gift',
    userLabel: 'Wunsch',
    primaryHome: 'mehr-inspiration',
  },
  leisure: {
    entityType: 'leisure',
    userLabel: 'Date Idee',
    primaryHome: 'mehr-inspiration',
    isVorhaben: true,
  },
  recipe: {
    entityType: 'recipe',
    userLabel: 'Rezept',
    primaryHome: 'mehr-alltag',
  },
  household: {
    entityType: 'household',
    userLabel: 'Legacy',
    primaryHome: 'einkauf',
  },
  expense: {
    entityType: 'expense',
    userLabel: 'Ausgabe',
    primaryHome: 'mehr-finanzen',
  },
  note: {
    entityType: 'note',
    userLabel: 'Notiz',
    primaryHome: 'detail',
  },
  milestone: {
    entityType: 'milestone',
    userLabel: 'Meilenstein',
    primaryHome: 'planen-vorhaben',
    calendarEligible: true,
  },
}

/** Entity-Typen, die unter „Vorhaben“ gebündelt werden */
export const VORHABEN_TYPES: EntityType[] = ['trip', 'date', 'goal', 'project', 'leisure']

/** Entity-Typen für den zusammengeführten Kalender */
export const CALENDAR_TYPES: EntityType[] = ['event', 'date', 'trip', 'milestone', 'goal']

export function getContentPlacement(type: EntityType): ContentPlacement {
  return CONTENT_PLACEMENT[type]
}

export function getUserFacingLabel(type: EntityType): string {
  return CONTENT_PLACEMENT[type]?.userLabel ?? type
}

export function isVorhabenType(type: EntityType): boolean {
  return Boolean(CONTENT_PLACEMENT[type]?.isVorhaben)
}

export function primaryPathForEntityType(type: EntityType): string {
  const home = CONTENT_PLACEMENT[type]?.primaryHome
  switch (home) {
    case 'planen-kalender':
      return '/planen?tab=kalender'
    case 'planen-vorhaben':
      return '/planen?tab=vorhaben'
    case 'planen-aufgaben':
      return '/planen?tab=aufgaben'
    case 'momente':
      return '/erinnerungen'
    case 'einkauf':
      return '/einkauf'
    case 'mehr-alltag':
      return type === 'recipe' ? '/module/rezepte' : '/einkauf'
    case 'mehr-inspiration':
      return type === 'gift' || type === 'wish' ? '/module/geschenke' : '/module/freizeit'
    case 'mehr-finanzen':
      return '/module/finanzen'
    default:
      return '/planen'
  }
}
