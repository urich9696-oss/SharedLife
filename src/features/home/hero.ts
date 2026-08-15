import {
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import { parseAllDayDate } from '@/lib/dates/timezone'
import { entityDetailPath } from '@/features/entities/entity-types'
import type { EntityRow } from '@/lib/indexed-db/schema'

export type HeroKind = 'loading' | 'next_trip' | 'next_date' | 'empty'

export interface HeroCandidate {
  id: string
  kind: HeroKind
  title: string
  subtitle: string
  eyebrow: string
  ctaLabel: string
  href: string
  entityId?: string
  entityType?: 'trip' | 'date'
  mediaPath?: string | null
  /** Frühere Startzeit gewinnt */
  sortAt: number
}

/** Normalisierte Hero-Quelle aus EntityRow (Adapter über bestehende Feldnamen). */
export interface PlannedHeroSource {
  id: string
  entityType: 'trip' | 'date'
  title: string
  status: EntityRow['status']
  deletedAt: string | null
  startsAt: string | null
  endsAt: string | null
  allDayStart: string | null
  allDayEnd: string | null
  mediaPath?: string | null
}

export interface GetNextPlannedInput {
  now: Date
  /** Rohdaten aus Dexie/Supabase-Entities */
  entities: EntityRow[]
  mediaByEntityId?: Record<string, string | null | undefined>
  /**
   * true erst wenn Entity-Query abgeschlossen ist.
   * Solange false → kind 'loading', kein Empty State.
   */
  entitiesLoaded: boolean
}

function normalizeAllDayRaw(value: string): string {
  return value.includes('T') ? value.slice(0, 10) : value
}

/** Startinstant: all_day_start lokal (kein UTC-Shift), sonst starts_at. */
export function plannedEntityStart(source: PlannedHeroSource): Date | null {
  if (source.allDayStart) {
    const day = parseAllDayDate(normalizeAllDayRaw(source.allDayStart))
    return Number.isNaN(day.getTime()) ? null : startOfDay(day)
  }
  if (source.startsAt) {
    const d = parseISO(source.startsAt)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function plannedEntityEnd(source: PlannedHeroSource): Date | null {
  if (source.allDayEnd) {
    const day = parseAllDayDate(normalizeAllDayRaw(source.allDayEnd))
    return Number.isNaN(day.getTime()) ? null : startOfDay(day)
  }
  if (source.endsAt) {
    const d = parseISO(source.endsAt)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Entity → Hero-Adapter.
 * Wichtig: trip.status `draft` = UI-Label „Geplant“ (kein Ausschlussgrund).
 * Reise-/Date-Ideen ohne verbindliches Datum werden hier schon verworfen.
 */
export function toPlannedHeroSource(
  entity: EntityRow,
  mediaPath?: string | null,
): PlannedHeroSource | null {
  if (entity.entity_type !== 'trip' && entity.entity_type !== 'date') return null
  if (entity.deleted_at) return null
  if (entity.status === 'cancelled' || entity.status === 'archived' || entity.status === 'completed') {
    return null
  }
  // Verbindliche Planung = Startdatum vorhanden (Idee ohne Termin ≠ Hero)
  if (!entity.starts_at && !entity.all_day_start) return null

  return {
    id: entity.id,
    entityType: entity.entity_type,
    title: entity.title,
    status: entity.status,
    deletedAt: entity.deleted_at,
    startsAt: entity.starts_at,
    endsAt: entity.ends_at,
    allDayStart: entity.all_day_start,
    allDayEnd: entity.all_day_end,
    mediaPath: mediaPath ?? null,
  }
}

export function isPlannedHeroUpcoming(source: PlannedHeroSource, now: Date): boolean {
  const start = plannedEntityStart(source)
  if (!start) return false
  const today = startOfDay(now)

  // Zukunft oder heute (Start noch nicht vorbei)
  if (!isBefore(start, now)) return true

  // Laufende Reise: Start vorbei, Ende noch nicht
  if (source.entityType === 'trip') {
    const end = plannedEntityEnd(source)
    if (end && !isBefore(end, today)) return true
    // Ganztägiger Start heute trotz Uhrzeit-Vergleich
    if (!isBefore(startOfDay(start), today) && !isBefore(today, startOfDay(start))) return true
  }

  // Date: nur Zukunft/heute, kein „laufend“ ohne Enddatum
  if (source.entityType === 'date' && !isBefore(startOfDay(start), today)) return true

  return false
}

function formatHeroSubtitle(start: Date, now: Date): string {
  const days = differenceInCalendarDays(startOfDay(start), startOfDay(now))
  if (days === 0) return 'Heute'
  if (days === 1) return 'Morgen'
  if (days > 1 && days <= 14) return `In ${days} Tagen`
  if (days < 0) return 'Unterwegs'
  return format(start, 'd. MMMM yyyy', { locale: de })
}

function emptyHero(): HeroCandidate {
  return {
    id: 'hero-empty',
    kind: 'empty',
    title: 'Als Nächstes',
    subtitle: 'Plant euer nächstes Date oder eure nächste Reise.',
    eyebrow: 'Vorfreude',
    ctaLabel: 'Date oder Reise planen',
    href: '/planen/neu?type=date',
    sortAt: Number.MAX_SAFE_INTEGER,
    mediaPath: null,
  }
}

function loadingHero(): HeroCandidate {
  return {
    id: 'hero-loading',
    kind: 'loading',
    title: 'Als Nächstes',
    subtitle: 'Wird geladen…',
    eyebrow: 'Vorfreude',
    ctaLabel: '',
    href: '/',
    sortAt: Number.MAX_SAFE_INTEGER,
    mediaPath: null,
  }
}

/**
 * Zentraler Hero-Selector: nächstes geplantes Date oder nächste geplante Reise.
 *
 * - Quellen: entities mit type trip|date (Dexie/Sync)
 * - Startdatum: starts_at ODER all_day_start (date-only lokal)
 * - Status: active und draft (trip draft = „Geplant“) erlaubt; completed/cancelled/archived/gelöscht raus
 * - Ideen ohne Datum ausgeschlossen
 * - Solange entitiesLoaded=false → kein Empty State
 */
export function getNextPlannedDateOrTrip(input: GetNextPlannedInput): HeroCandidate {
  if (!input.entitiesLoaded) return loadingHero()

  const { now, entities, mediaByEntityId = {} } = input
  const candidates: HeroCandidate[] = []

  for (const entity of entities) {
    const source = toPlannedHeroSource(entity, mediaByEntityId[entity.id])
    if (!source) continue
    if (!isPlannedHeroUpcoming(source, now)) continue

    const start = plannedEntityStart(source)!
    const isTrip = source.entityType === 'trip'
    candidates.push({
      id: source.id,
      kind: isTrip ? 'next_trip' : 'next_date',
      title: source.title || (isTrip ? 'Reise' : 'Date'),
      subtitle: formatHeroSubtitle(start, now),
      eyebrow: isTrip ? 'Nächste Reise' : 'Nächstes Date',
      ctaLabel: isTrip ? 'Reise ansehen' : 'Date ansehen',
      href: entityDetailPath(source.entityType, source.id),
      entityId: source.id,
      entityType: source.entityType,
      mediaPath: source.mediaPath ?? null,
      sortAt: start.getTime(),
    })
  }

  candidates.sort((a, b) => {
    if (a.sortAt !== b.sortAt) return a.sortAt - b.sortAt
    return a.id.localeCompare(b.id)
  })

  return candidates[0] ?? emptyHero()
}

/** @deprecated Alias — bitte getNextPlannedDateOrTrip nutzen. */
export function selectHomeHero(
  input: Omit<GetNextPlannedInput, 'entitiesLoaded'> & { entitiesLoaded?: boolean },
): HeroCandidate {
  return getNextPlannedDateOrTrip({
    ...input,
    entitiesLoaded: input.entitiesLoaded ?? true,
  })
}
