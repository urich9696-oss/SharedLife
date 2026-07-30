import { differenceInDays, differenceInHours, isAfter, isBefore, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { computeGoalProgressPercent } from '@/lib/dates/goal-progress'
import type { GoalProgressInput } from '@/lib/validation/goal-progress'

export interface RelevanceContext {
  now: Date
  userId?: string | null
}

export interface ScoredItem<T> {
  item: T
  score: number
  reason: string
}

function entityStartDate(entity: EntityRow): Date | null {
  if (entity.starts_at) return parseISO(entity.starts_at)
  if (entity.all_day_start) return parseISO(entity.all_day_start)
  return null
}

function isUpcoming(date: Date | null, now: Date): boolean {
  return date !== null && !isBefore(date, now)
}

function proximityScore(date: Date | null, now: Date): number {
  if (!date) return 0
  const hours = Math.abs(differenceInHours(date, now))
  if (hours <= 24) return 100 - hours
  const days = Math.abs(differenceInDays(date, now))
  return Math.max(0, 80 - days * 5)
}

export function scoreEntityForHome(entity: EntityRow, ctx: RelevanceContext): number {
  if (entity.deleted_at) return 0
  if (entity.status === 'archived' || entity.status === 'cancelled') return 0

  let score = 0
  const start = entityStartDate(entity)

  switch (entity.entity_type) {
    case 'event':
      if (isUpcoming(start, ctx.now)) score += 50 + proximityScore(start, ctx.now)
      if (entity.status === 'active') score += 10
      break
    case 'trip':
      if (entity.status === 'active' || entity.status === 'draft') score += 40
      if (start && isUpcoming(start, ctx.now)) score += proximityScore(start, ctx.now)
      break
    case 'goal':
      if (entity.status === 'active') score += 35
      break
    case 'task': {
      if (entity.status === 'active') score += 30
      if (start) {
        const weekStart = startOfWeek(ctx.now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(ctx.now, { weekStartsOn: 1 })
        if (!isBefore(start, weekStart) && !isAfter(start, weekEnd)) score += 25
        if (isUpcoming(start, ctx.now)) score += proximityScore(start, ctx.now) * 0.5
      }
      break
    }
    case 'date':
      if (entity.status === 'active' || entity.status === 'draft') score += 30
      if (isUpcoming(start, ctx.now)) score += proximityScore(start, ctx.now)
      break
    case 'wish':
      if (entity.status === 'active') score += 15
      score += Math.min(10, differenceInDays(ctx.now, parseISO(entity.created_at)) * -0.5 + 10)
      break
    default:
      score += 5
  }

  return score
}

export function pickTopScored<T>(items: ScoredItem<T>[], limit = 1): T[] {
  return [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item)
}

export function getNextEvent(entities: EntityRow[], now: Date): EntityRow | null {
  const events = entities
    .filter((e) => e.entity_type === 'event' && !e.deleted_at && e.status === 'active')
    .map((e) => ({ entity: e, start: entityStartDate(e) }))
    .filter((e): e is { entity: EntityRow; start: Date } => e.start !== null && isUpcoming(e.start, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  return events[0]?.entity ?? null
}

export function getActiveTrip(entities: EntityRow[]): EntityRow | null {
  return (
    entities.find(
      (e) =>
        e.entity_type === 'trip' &&
        !e.deleted_at &&
        (e.status === 'active' || e.status === 'draft'),
    ) ?? null
  )
}

export function getActiveGoal(entities: EntityRow[]): EntityRow | null {
  const goals = entities
    .filter((e) => e.entity_type === 'goal' && !e.deleted_at && e.status === 'active')
    .map((e) => ({ entity: e, score: scoreEntityForHome(e, { now: new Date() }) }))
    .sort((a, b) => b.score - a.score)
  return goals[0]?.entity ?? null
}

export function getTasksThisWeek(entities: EntityRow[], now: Date): EntityRow[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  return entities
    .filter((e) => {
      if (e.entity_type !== 'task' || e.deleted_at || e.status !== 'active') return false
      const start = entityStartDate(e)
      // Undatierte Aufgaben gehören nicht automatisch in „diese Woche“.
      if (!start) return false
      return !isBefore(start, weekStart) && !isAfter(start, weekEnd)
    })
    .slice(0, 5)
}

export function getNextDate(entities: EntityRow[], now: Date): EntityRow | null {
  const dates = entities
    .filter(
      (e) =>
        e.entity_type === 'date' &&
        !e.deleted_at &&
        (e.status === 'active' || e.status === 'draft'),
    )
    .map((e) => ({ entity: e, start: entityStartDate(e) }))
    .filter((e): e is { entity: EntityRow; start: Date } => e.start !== null && isUpcoming(e.start, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  return dates[0]?.entity ?? null
}

export function getCountdownTarget(entities: EntityRow[], now: Date): { entity: EntityRow; days: number } | null {
  const candidates = entities
    .filter((e) => !e.deleted_at && (e.entity_type === 'trip' || e.entity_type === 'event'))
    .map((e) => ({ entity: e, start: entityStartDate(e) }))
    .filter((e): e is { entity: EntityRow; start: Date } => e.start !== null && isUpcoming(e.start, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const next = candidates[0]
  if (!next) return null
  return { entity: next.entity, days: differenceInDays(next.start, now) }
}

export function getGoalProgressFromPayload(
  payload: Record<string, unknown> | null,
): number | null {
  if (!payload) return null
  const kind = payload.progressKind as GoalProgressInput['kind'] | undefined
  if (!kind) return null
  try {
    if (kind === 'manual') {
      return computeGoalProgressPercent({
        kind: 'manual',
        percent: Number(payload.current ?? 0),
      })
    }
    return computeGoalProgressPercent({
      kind,
      current: Number(payload.current ?? 0),
      target: Number(payload.target ?? 100),
    } as GoalProgressInput)
  } catch {
    return null
  }
}

export function getRecentWishes(entities: EntityRow[]): EntityRow[] {
  return entities
    .filter((e) => e.entity_type === 'wish' && !e.deleted_at && e.status === 'active')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3)
}

export function getGreeting(now: Date, displayName?: string | null): string {
  const hour = now.getHours()
  const base =
    hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  return displayName ? `${base}, ${displayName}` : base
}
