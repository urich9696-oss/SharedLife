import type { DetailType } from '@/lib/indexed-db/schema'

/** Mappt lokales UI-Payload auf Spalten der jeweiligen *_details-Tabelle. */
export function localPayloadToDetailColumns(
  detailType: DetailType,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  switch (detailType) {
    case 'trip':
      return {
        destination: (payload.destination as string) || null,
      }
    case 'date':
      return {
        occasion: (payload.occasion as string) || null,
        venue_name: (payload.venueName as string) || null,
        dress_code: (payload.dressCode as string) || null,
        mood: (payload.mood as string) || null,
        surprise: Boolean(payload.surprise),
      }
    case 'goal': {
      const kind = String(payload.progressKind ?? 'percent')
      const current = Number(payload.current ?? 0)
      const target = Number(payload.target ?? 100) || 100
      const progress =
        kind === 'percent' ? current : Math.round((current / target) * 100)
      return {
        progress_percent: Math.min(100, Math.max(0, progress)),
        motivation: (payload.milestones as string) || null,
      }
    }
    case 'task': {
      const priority = String(payload.priority ?? 'medium')
      return {
        priority: priority === 'medium' ? 'normal' : priority,
        assignee_id: (payload.assigneeId as string) || null,
        due_date: (payload.dueDate as string) || null,
      }
    }
    case 'wish':
      return {
        url: (payload.url as string) || null,
        price: payload.price ? Number(payload.price) : null,
        currency: (payload.currency as string) || 'CHF',
        priority: (payload.priority as string) || 'normal',
      }
    case 'moment':
      return {
        captured_at: (payload.capturedAt as string) || null,
        mood: (payload.mood as string) || null,
        weather: (payload.weather as string) || null,
        highlight: Boolean(payload.highlight),
      }
    case 'project':
      return {
        category: (payload.category as string) || null,
        start_date: (payload.startDate as string) || null,
        target_end_date: (payload.targetEndDate as string) || null,
        progress_percent: Number(payload.progressPercent ?? 0),
      }
    case 'list':
      return {
        list_kind: (payload.listKind as string) || 'generic',
        is_checkable: payload.isCheckable !== false,
      }
    case 'event':
      return {
        location_name: (payload.locationName as string) || null,
        recurrence_rule: (payload.recurrenceRule as string) || null,
        calendar_color: (payload.calendarColor as string) || null,
      }
    case 'milestone':
      return {
        project_entity_id: (payload.projectEntityId as string) || null,
        target_date: (payload.targetDate as string) || null,
        achieved_at: (payload.achievedAt as string) || null,
        weight: Number(payload.weight ?? 1),
      }
    default:
      return {}
  }
}

export function detailTableName(detailType: string): string {
  return `${detailType}_details`
}
