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

export interface HomeTodayItem {
  id: string
  label: string
  meta: string
  href: string | null
}

function entityStart(entity: EntityRow): Date | null {
  if (entity.starts_at) return parseISO(entity.starts_at)
  if (entity.all_day_start) return parseISO(`${entity.all_day_start}T12:00:00`)
  return null
}

function entityEnd(entity: EntityRow): Date | null {
  if (entity.ends_at) return parseISO(entity.ends_at)
  if (entity.all_day_end) return parseISO(`${entity.all_day_end}T12:00:00`)
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

/** Leerzustand für „Heute für uns“. */
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
