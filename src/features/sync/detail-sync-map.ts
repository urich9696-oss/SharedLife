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
        accommodation: (payload.accommodation as string) || null,
        budget_amount: payload.budgetAmount ? Number(payload.budgetAmount) : null,
        notes: (payload.note as string) || null,
      }
    case 'date':
      return {
        occasion: (payload.occasion as string) || null,
        venue_name: (payload.venueName as string) || null,
        dress_code: (payload.dressCode as string) || null,
        mood: (payload.mood as string) || null,
        surprise: Boolean(payload.surprise),
        reservation_reference:
          (payload.reservationReference as string) ||
          (payload.reservationStatus as string) ||
          null,
        estimated_cost: payload.estimatedCost ? Number(payload.estimatedCost) : null,
      }
    case 'goal': {
      const kind = String(payload.progressKind ?? 'amount')
      const current = Number(payload.current ?? 0)
      const target = Number(payload.target ?? 100) || 100
      const progress =
        kind === 'percent' ? current : Math.round((current / target) * 100)
      return {
        progress_percent: Math.min(100, Math.max(0, progress || 0)),
        motivation: (payload.milestones as string) || null,
      }
    }
    case 'task': {
      const priority = String(payload.priority ?? 'medium')
      const assigneeId = String(payload.assigneeId ?? '')
      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          assigneeId,
        )
      return {
        priority: priority === 'medium' ? 'normal' : priority,
        assignee_id: looksLikeUuid ? assigneeId : null,
        due_date: (payload.dueDate as string) || null,
      }
    }
    case 'wish': {
      const rawPrice = payload.price
      let price: number | null = null
      if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) {
        price = rawPrice
      } else if (typeof rawPrice === 'string' && rawPrice.trim()) {
        let s = rawPrice.trim().replace(/\s/g, '').replace(/'/g, '')
        if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
        else if (s.includes(',')) s = s.replace(',', '.')
        const n = Number(s)
        price = Number.isFinite(n) ? n : null
      }
      const priorityRaw = String(payload.priority ?? 'normal')
      const priority = priorityRaw === 'medium' ? 'normal' : priorityRaw || 'normal'
      const fulfilledExplicit =
        payload.fulfilled === true || payload.wishStatus === 'bought'
          ? true
          : payload.fulfilled === false ||
              payload.wishStatus === 'open' ||
              payload.wishStatus === 'reserved'
            ? false
            : undefined
      return {
        url: (payload.url as string) || (payload.link as string) || null,
        price,
        currency: (payload.currency as string) || 'CHF',
        priority,
        acquired_at:
          fulfilledExplicit === true
            ? new Date().toISOString()
            : fulfilledExplicit === false
              ? null
              : undefined,
      }
    }
    case 'moment':
      return {
        captured_at: (payload.capturedAt as string) || null,
        mood: (payload.mood as string) || (payload.category as string) || null,
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
        recurrence_rule:
          payload.recurrenceRule && payload.recurrenceRule !== 'none'
            ? String(payload.recurrenceRule)
            : null,
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
