import {
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns'
import { de } from 'date-fns/locale'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { entityDetailPath } from '@/features/entities/entity-types'

export type HeroKind = 'next_trip' | 'next_date' | 'empty'

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

export interface HeroSelectionInput {
  now: Date
  entities: EntityRow[]
  mediaByEntityId?: Record<string, string | null | undefined>
}

function entityStart(entity: EntityRow): Date | null {
  if (entity.starts_at) {
    const d = parseISO(entity.starts_at)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (entity.all_day_start) {
    // Ganztägig: lokaler Tagesbeginn, kein Off-by-one durch UTC-Mitternacht
    const d = parseISO(`${entity.all_day_start}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : startOfDay(d)
  }
  return null
}

function isHeroEligible(entity: EntityRow, now: Date): boolean {
  if (entity.entity_type !== 'trip' && entity.entity_type !== 'date') return false
  if (entity.deleted_at) return false
  if (entity.status === 'cancelled' || entity.status === 'archived') return false
  // Reine Ideen (leisure) und Entwürfe ohne verbindlichen Termin sind nicht hero-fähig
  if (entity.status === 'draft') return false
  const start = entityStart(entity)
  if (!start) return false
  // Jetzt oder Zukunft — laufende Reisen mit Start heute/früher und Ende in Zukunft:
  // Hero zeigt nur Start jetzt/Zukunft; laufende Reise mit Start in der Vergangenheit
  // bleibt zulässig, wenn Ende noch nicht vorbei ist.
  if (!isBefore(start, now)) return true
  if (entity.entity_type === 'trip') {
    const end = entity.ends_at
      ? parseISO(entity.ends_at)
      : entity.all_day_end
        ? startOfDay(parseISO(`${entity.all_day_end}T12:00:00`))
        : null
    if (end && !isBefore(end, startOfDay(now))) return true
    if (!end && !isBefore(start, startOfDay(now))) return true
  }
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

/**
 * V8 Hero: ausschließlich nächstes geplantes Date oder nächste geplante Reise.
 * Keine Ideen, Ziele, Events, Wünsche oder emotionalen Entity-Fallbacks.
 */
export function selectHomeHero(input: HeroSelectionInput): HeroCandidate {
  const { now, entities, mediaByEntityId = {} } = input

  const candidates: HeroCandidate[] = []

  for (const entity of entities) {
    if (!isHeroEligible(entity, now)) continue
    const start = entityStart(entity)!
    const isTrip = entity.entity_type === 'trip'
    candidates.push({
      id: entity.id,
      kind: isTrip ? 'next_trip' : 'next_date',
      title: entity.title || (isTrip ? 'Reise' : 'Date'),
      subtitle: formatHeroSubtitle(start, now),
      eyebrow: isTrip ? 'Nächste Reise' : 'Nächstes Date',
      ctaLabel: isTrip ? 'Reise ansehen' : 'Date ansehen',
      href: entityDetailPath(entity.entity_type, entity.id),
      entityId: entity.id,
      entityType: entity.entity_type as 'trip' | 'date',
      mediaPath: mediaByEntityId[entity.id] ?? null,
      sortAt: start.getTime(),
    })
  }

  candidates.sort((a, b) => {
    if (a.sortAt !== b.sortAt) return a.sortAt - b.sortAt
    return a.id.localeCompare(b.id)
  })

  if (candidates[0]) return candidates[0]

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
