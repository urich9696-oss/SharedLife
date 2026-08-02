import type { EntityType } from '@/lib/indexed-db/schema'
import type { DetailValues } from '@/features/entities/detail-payload-utils'
import type { DateDetailValues } from '@/features/dates/DateForm'
import type { EventDetailValues } from '@/features/calendar/EventForm'
import type { ExpenseDetailValues } from '@/features/finances/ExpenseForm'
import type { LeisureDetailValues } from '@/features/ideas/LeisureForm'
import type { MomentDetailValues } from '@/features/moments/MomentForm'
import type { TaskDetailValues } from '@/features/tasks/TaskForm'
import type { TripDetailValues } from '@/features/trips/TripForm'
import type { WishDetailValues } from '@/features/wishes/WishForm'
import { normalizeMoneyInput } from '@/lib/money'

/** Felder ohne eigene Detail-Tabelle (oder Pair-Rollen) → entities.metadata */
export function metadataFromDetail(
  type: EntityType,
  detail: DetailValues,
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  const meta = { ...existing }

  switch (type) {
    case 'task': {
      const d = detail as TaskDetailValues
      meta.assigneeRole = d.assigneeRole || ''
      meta.taskCategory = d.category || ''
      meta.taskAssignment = d.assignment || ''
      meta.taskAssignmentEntityId = d.assignmentEntityId || ''
      meta.belongsToEntityId = d.assignmentEntityId || ''
      meta.recurrenceRule = d.recurrenceRule || 'none'
      meta.subtasksText = d.subtasksText || ''
      break
    }
    case 'event': {
      const d = detail as EventDetailValues
      meta.assigneeRole = d.assigneeRole || ''
      meta.eventAssignment = d.assignment || 'termin'
      break
    }
    case 'date': {
      const d = detail as DateDetailValues
      meta.assigneeRole = d.assigneeRole || ''
      meta.reservationStatus = d.reservationStatus || 'none'
      meta.belongsToEntityId = d.belongsToEntityId || ''
      // Ort/Budget/Reservierung auch in Metadata — Entity-Sync trägt manchen
      // Partner-Stand auch dann, wenn date_details-Spalten verzögert nachziehen.
      meta.place = d.venueName || ''
      meta.estimatedCost = d.estimatedCost || ''
      meta.reservationReference = d.reservationReference || ''
      break
    }
    case 'moment': {
      const d = detail as MomentDetailValues
      meta.place = d.place || ''
      meta.momentCategory = d.category || ''
      meta.belonging = d.belonging || ''
      meta.belongsToEntityId = d.belongsToEntityId || ''
      break
    }
    case 'trip': {
      const d = detail as TripDetailValues
      meta.packingListText = d.packingListText || ''
      meta.placesText = d.placesText || ''
      meta.budgetAmount = d.budgetAmount || ''
      break
    }
    case 'wish':
    case 'gift': {
      const d = detail as WishDetailValues
      meta.occasion = d.occasion || ''
      meta.wishStatus = d.wishStatus || 'open'
      break
    }
    case 'leisure': {
      const d = detail as LeisureDetailValues
      meta.place = d.place || ''
      meta.link = d.link || ''
      meta.ideaCategory = 'date'
      // Datums-Vorschlag liegt auf entities.all_day_start (via EntityForm)
      break
    }
    case 'expense': {
      const d = detail as ExpenseDetailValues
      meta.amount = normalizeMoneyInput(d.amount || '') ?? (d.amount || '')
      meta.category = d.category || ''
      meta.paidBy = d.paidBy || 'gemeinsam'
      meta.financeKind = d.kind || 'expense'
      meta.recurrence = d.recurrence || 'once'
      break
    }
    default:
      break
  }

  return meta
}
