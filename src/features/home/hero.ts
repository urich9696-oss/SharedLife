import {
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { getUserFacingLabel } from '@/features/content/content-map'
import { entityDetailPath } from '@/features/entities/entity-types'

export type HeroKind =
  | 'happening_today'
  | 'upcoming_special'
  | 'goal_deadline'
  | 'next_plan'
  | 'emotional_fallback'

export interface HeroCandidate {
  id: string
  kind: HeroKind
  title: string
  subtitle: string
  ctaLabel: string
  href: string
  entityId?: string
  entityType?: EntityRow['entity_type']
  mediaPath?: string | null
  /** Sortierschlüssel: niedriger = höhere Priorität */
  priority: number
  /** Tie-breaker: früherer Zeitpunkt gewinnt */
  sortAt: number
}

export interface HeroSelectionInput {
  now: Date
  entities: EntityRow[]
  mediaByEntityId?: Record<string, string | null | undefined>
  pairCoverPath?: string | null
  partnerAName?: string | null
  partnerBName?: string | null
  togetherDays?: number | null
  coupleBlurb?: string | null
}

function entityStart(entity: EntityRow): Date | null {
  if (entity.starts_at) return parseISO(entity.starts_at)
  if (entity.all_day_start) return parseISO(entity.all_day_start)
  return null
}

function entityEnd(entity: EntityRow): Date | null {
  if (entity.ends_at) return parseISO(entity.ends_at)
  if (entity.all_day_end) return parseISO(entity.all_day_end)
  return null
}

function isActive(entity: EntityRow): boolean {
  return !entity.deleted_at && entity.status !== 'archived' && entity.status !== 'cancelled'
}

function formatRelativeDay(date: Date, now: Date): string {
  const days = differenceInCalendarDays(startOfDay(date), startOfDay(now))
  if (days === 0) return 'Heute'
  if (days === 1) return 'Morgen'
  if (days > 1) return `In ${days} Tagen`
  if (days === -1) return 'Gestern'
  return `Vor ${Math.abs(days)} Tagen`
}

function specialTypes(): EntityRow['entity_type'][] {
  return ['date', 'trip', 'event']
}

/**
 * Deterministische Hero-Auswahl ohne Zufall.
 * Priorität:
 * 1. heute stattfindendes / laufendes Ereignis
 * 2. nächstes zeitnahes Date / Reise / besonderer Termin
 * 3. Ziel / Meilenstein mit naher Frist
 * 4. nächster relevanter gemeinsamer Plan
 * 5. emotionaler Fallback
 */
export function selectHomeHero(input: HeroSelectionInput): HeroCandidate {
  const { now, entities, mediaByEntityId = {} } = input
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const active = entities.filter(isActive)

  const candidates: HeroCandidate[] = []

  for (const entity of active) {
    const start = entityStart(entity)
    const end = entityEnd(entity)
    const mediaPath = mediaByEntityId[entity.id] ?? null
    const label = getUserFacingLabel(entity.entity_type)
    const href = entityDetailPath(entity.entity_type, entity.id)

    // 1) Heute / laufend
    const happensToday =
      start !== null &&
      (isSameDay(start, now) ||
        (end !== null && !isAfter(dayStart, end) && !isBefore(dayEnd, start)) ||
        (entity.entity_type === 'trip' &&
          entity.status === 'active' &&
          start !== null &&
          !isAfter(start, dayEnd) &&
          (end === null || !isBefore(end, dayStart))))

    if (happensToday && ['event', 'date', 'trip'].includes(entity.entity_type)) {
      candidates.push({
        id: entity.id,
        kind: 'happening_today',
        title: entity.title,
        subtitle: start ? `${label} · ${formatRelativeDay(start, now)}` : `${label} · Heute`,
        ctaLabel: 'Öffnen',
        href,
        entityId: entity.id,
        entityType: entity.entity_type,
        mediaPath,
        priority: 1,
        sortAt: start?.getTime() ?? Number.MAX_SAFE_INTEGER,
      })
      continue
    }

    // 2) Nächstes zeitnahes Date / Reise / Termin (14 Tage)
    if (
      start &&
      !isBefore(start, now) &&
      specialTypes().includes(entity.entity_type) &&
      differenceInCalendarDays(start, now) <= 14
    ) {
      candidates.push({
        id: entity.id,
        kind: 'upcoming_special',
        title: entity.title,
        subtitle: `${label} · ${formatRelativeDay(start, now)}`,
        ctaLabel: entity.entity_type === 'trip' ? 'Reise ansehen' : 'Details öffnen',
        href,
        entityId: entity.id,
        entityType: entity.entity_type,
        mediaPath,
        priority: 2,
        sortAt: start.getTime(),
      })
      continue
    }

    // 3) Ziel / Meilenstein mit naher Frist (30 Tage)
    if (
      start &&
      !isBefore(start, now) &&
      (entity.entity_type === 'goal' || entity.entity_type === 'milestone') &&
      differenceInCalendarDays(start, now) <= 30
    ) {
      candidates.push({
        id: entity.id,
        kind: 'goal_deadline',
        title: entity.title,
        subtitle: `${label} · Frist ${formatRelativeDay(start, now)}`,
        ctaLabel: 'Zum Ziel',
        href,
        entityId: entity.id,
        entityType: entity.entity_type,
        mediaPath,
        priority: 3,
        sortAt: start.getTime(),
      })
      continue
    }

    // 4) Nächster relevanter Plan
    if (
      start &&
      !isBefore(start, now) &&
      ['trip', 'date', 'event', 'goal', 'project'].includes(entity.entity_type)
    ) {
      candidates.push({
        id: entity.id,
        kind: 'next_plan',
        title: entity.title,
        subtitle: `${label} · ${formatRelativeDay(start, now)}`,
        ctaLabel: 'Ansehen',
        href,
        entityId: entity.id,
        entityType: entity.entity_type,
        mediaPath,
        priority: 4,
        sortAt: start.getTime(),
      })
    }
  }

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    if (a.sortAt !== b.sortAt) return a.sortAt - b.sortAt
    return a.id.localeCompare(b.id)
  })

  if (candidates[0]) return candidates[0]

  const a = input.partnerAName ?? 'Dennis'
  const b = input.partnerBName ?? 'Lea'
  const together =
    input.togetherDays !== null && input.togetherDays !== undefined
      ? `${input.togetherDays} gemeinsame Tage`
      : 'Euer gemeinsames Zuhause'
  const blurb = input.coupleBlurb?.trim()

  return {
    id: 'emotional-fallback',
    kind: 'emotional_fallback',
    title: `${a} & ${b}`,
    subtitle: blurb ? `${together} · ${blurb}` : together,
    ctaLabel: 'Paarprofil',
    href: '/settings/pair',
    mediaPath: input.pairCoverPath ?? null,
    priority: 5,
    sortAt: 0,
  }
}
