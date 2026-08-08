import {
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns'
import type { EntityRow, ReminderRow } from '@/lib/indexed-db/schema'
import { getUserFacingLabel } from '@/features/content/content-map'
import { entityDetailPath } from '@/features/entities/entity-types'
import type { TimelineItem } from '@/features/timeline/derive-timeline'

export interface HomeTodayItem {
  id: string
  label: string
  meta: string
  href: string | null
}

export interface AnticipationItem {
  id: string
  title: string
  meta: string
  href: string
  entityType: EntityRow['entity_type']
  mediaPath?: string | null
  startsAt: Date
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

export function selectTodayForUs(input: {
  entities: EntityRow[]
  reminders: ReminderRow[]
  now: Date
  excludeEntityId?: string | null
  limit?: number
}): HomeTodayItem[] {
  const { entities, reminders, now, excludeEntityId = null, limit = 4 } = input
  const items: HomeTodayItem[] = []

  for (const entity of entities) {
    if (!isActive(entity) || entity.id === excludeEntityId) continue
    const start = entityStart(entity)
    const end = entityEnd(entity)

    if (entity.entity_type === 'task' && entity.status === 'active') {
      if (!start) continue
      if (isSameDay(start, now) || isBefore(start, endOfDay(now))) {
        items.push({
          id: entity.id,
          label: entity.title,
          meta: getUserFacingLabel(entity.entity_type),
          href: entityDetailPath(entity.entity_type, entity.id),
        })
      }
      continue
    }

    if (['event', 'date', 'trip', 'milestone'].includes(entity.entity_type) && start) {
      const today =
        isSameDay(start, now) ||
        (end !== null &&
          !isBefore(end, startOfDay(now)) &&
          !isBefore(endOfDay(now), start))
      if (today) {
        items.push({
          id: entity.id,
          label: entity.title,
          meta: getUserFacingLabel(entity.entity_type),
          href: entityDetailPath(entity.entity_type, entity.id),
        })
      }
    }
  }

  for (const reminder of reminders) {
    if (reminder.deleted_at || !reminder.is_active) continue
    if (!isSameDay(parseISO(reminder.remind_at), now)) continue
    items.push({
      id: reminder.id,
      label: reminder.title,
      meta: 'Erinnerung',
      href: null,
    })
  }

  return items.slice(0, limit)
}

/**
 * Ob heute überhaupt Aktivität existiert — inklusive einer Entity,
 * die bereits als Hero hervorgehoben und aus der Liste ausgeschlossen wurde.
 */
export function hasTodayActivity(input: {
  entities: EntityRow[]
  reminders: ReminderRow[]
  now: Date
}): boolean {
  return (
    selectTodayForUs({
      entities: input.entities,
      reminders: input.reminders,
      now: input.now,
      excludeEntityId: null,
      limit: 1,
    }).length > 0
  )
}

/** Leerzustand für „Heute für uns“: ruhig nur wenn wirklich nichts heute ansteht. */
export function todaySectionEmptyKind(input: {
  todayItems: HomeTodayItem[]
  entities: EntityRow[]
  reminders: ReminderRow[]
  now: Date
}): 'list' | 'covered_by_hero' | 'calm' {
  if (input.todayItems.length > 0) return 'list'
  if (hasTodayActivity(input)) return 'covered_by_hero'
  return 'calm'
}

export function selectAnticipationItems(input: {
  entities: EntityRow[]
  now: Date
  mediaByEntityId?: Record<string, string | null | undefined>
  excludeEntityId?: string | null
  limit?: number
}): AnticipationItem[] {
  const {
    entities,
    now,
    mediaByEntityId = {},
    excludeEntityId = null,
    limit = 3,
  } = input

  const upcoming = entities
    .filter(isActive)
    .filter((e) => ['trip', 'date', 'event'].includes(e.entity_type))
    .filter((e) => e.id !== excludeEntityId)
    .map((e) => ({ entity: e, start: entityStart(e) }))
    .filter((x): x is { entity: EntityRow; start: Date } => x.start !== null && !isBefore(x.start, startOfDay(now)))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.entity.id.localeCompare(b.entity.id))

  return upcoming.slice(0, limit).map(({ entity, start }) => ({
    id: entity.id,
    title: entity.title,
    meta: getUserFacingLabel(entity.entity_type),
    href: entityDetailPath(entity.entity_type, entity.id),
    entityType: entity.entity_type,
    mediaPath: mediaByEntityId[entity.id] ?? null,
    startsAt: start,
  }))
}

export interface SharedHighlight {
  id: string
  kind: 'goal_progress' | 'milestone' | 'memory'
  title: string
  subtitle: string
  href: string
  progress?: number
}

export function selectSharedHighlight(input: {
  entities: EntityRow[]
  detailProgress?: Record<string, number>
  recentMomentIds?: string[]
}): SharedHighlight | null {
  const { entities, detailProgress = {} } = input

  const activeGoal = entities
    .filter((e) => e.entity_type === 'goal' && isActive(e) && e.status === 'active')
    .map((e) => ({ entity: e, progress: detailProgress[e.id] ?? 0 }))
    .filter((x) => x.progress > 0 && x.progress < 100)
    .sort((a, b) => b.progress - a.progress || a.entity.id.localeCompare(b.entity.id))[0]

  if (activeGoal) {
    return {
      id: activeGoal.entity.id,
      kind: 'goal_progress',
      title: activeGoal.entity.title,
      subtitle: `${activeGoal.progress}% erreicht`,
      href: entityDetailPath('goal', activeGoal.entity.id),
      progress: activeGoal.progress,
    }
  }

  const milestone = entities
    .filter((e) => e.entity_type === 'milestone' && !e.deleted_at && e.status === 'completed')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]

  if (milestone) {
    return {
      id: milestone.id,
      kind: 'milestone',
      title: milestone.title,
      subtitle: 'Kürzlich erreicht',
      href: entityDetailPath('milestone', milestone.id),
    }
  }

  const memory = entities
    .filter((e) => e.entity_type === 'moment' && !e.deleted_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]

  if (memory) {
    const isOldEnough =
      Date.now() - parseISO(memory.created_at).getTime() > 1000 * 60 * 60 * 24 * 30
    if (isOldEnough) {
      return {
        id: memory.id,
        kind: 'memory',
        title: memory.title,
        subtitle: 'Erinnerung aus eurer Geschichte',
        href: entityDetailPath('moment', memory.id),
      }
    }
  }

  return null
}

/** Timeline-Vorschau: echte Typ-Labels, kein „Moment“-Wording für Fremdtypen. */
export function selectTimelinePreview(
  items: TimelineItem[],
  options?: { excludeEntityIds?: string[]; limit?: number },
): TimelineItem[] {
  const exclude = new Set(options?.excludeEntityIds ?? [])
  const limit = options?.limit ?? 6
  return items
    .filter((item) => {
      if (item.entityId && exclude.has(item.entityId)) return false
      return true
    })
    .slice(0, limit)
}

export function timelinePreviewTypeLabel(item: TimelineItem): string {
  if (item.sourceType === 'media') return 'Foto'
  if (item.sourceLabel) return item.sourceLabel
  if (item.entityType) return getUserFacingLabel(item.entityType as EntityRow['entity_type'])
  return 'Eintrag'
}

export const HOME_QUICK_ACCESS = [
  { key: 'moment', label: 'Moment', path: '/erinnerungen/neu', accent: 'bg-pastel-2 text-text' },
  { key: 'planen', label: 'Planen', path: '/planen', accent: 'bg-pastel-1 text-text' },
  { key: 'einkauf', label: 'Einkauf', path: '/einkauf', accent: 'bg-sand/50 text-text' },
  { key: 'wuensche', label: 'Wünsche', path: '/module/geschenke', accent: 'bg-pastel-2 text-text' },
] as const
