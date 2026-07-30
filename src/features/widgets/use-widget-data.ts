import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/indexed-db/db'
import type {
  BudgetRow,
  ChecklistItemRow,
  ChecklistRow,
  EntityDetailRow,
  EntityLocationRow,
  EntityMediaRow,
  EntityRow,
  LocationRow,
  MediaAssetRow,
  NoteRow,
  ReminderRow,
  TimelineEntryRow,
  TransactionRow,
} from '@/lib/indexed-db/schema'

export function useEntity(spaceId: string, entityId?: string | null) {
  return useQuery({
    queryKey: ['entity', entityId],
    enabled: Boolean(entityId),
    queryFn: async () => {
      const row = await db.entities.get(entityId!)
      if (!row || row.space_id !== spaceId || row.deleted_at) return null
      return row
    },
  })
}

export function useEntitiesBySpace(spaceId: string, types?: EntityRow['entity_type'][]) {
  return useQuery({
    queryKey: ['entities', spaceId, types],
    queryFn: async () => {
      const rows = await db.entities.where('space_id').equals(spaceId).toArray()
      return rows.filter(
        (r) =>
          !r.deleted_at && (!types || types.length === 0 || types.includes(r.entity_type)),
      )
    },
  })
}

export function useEntityDetail(entityId?: string | null, detailType?: string) {
  return useQuery({
    queryKey: ['entityDetail', entityId, detailType],
    enabled: Boolean(entityId && detailType),
    queryFn: async () => {
      const row = await db.entityDetails.get([entityId!, detailType!])
      return row ?? null
    },
  })
}

export function useBudgets(spaceId: string, entityId?: string | null, budgetId?: string) {
  return useQuery({
    queryKey: ['budgets', spaceId, entityId, budgetId],
    queryFn: async () => {
      if (budgetId) {
        const row = await db.budgets.get(budgetId)
        return row && !row.deleted_at ? [row] : []
      }
      const rows = await db.budgets.where('space_id').equals(spaceId).toArray()
      return rows.filter(
        (b) => !b.deleted_at && (!entityId || b.entity_id === entityId),
      )
    },
  })
}

export function useTransactions(spaceId: string, entityId?: string | null, budgetId?: string) {
  return useQuery({
    queryKey: ['transactions', spaceId, entityId, budgetId],
    queryFn: async () => {
      const rows = await db.transactions.where('space_id').equals(spaceId).toArray()
      return rows
        .filter(
          (t) =>
            !t.deleted_at &&
            (!budgetId || t.budget_id === budgetId) &&
            (!entityId || t.entity_id === entityId),
        )
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    },
  })
}

export function useChecklists(entityId?: string | null, checklistId?: string) {
  return useQuery({
    queryKey: ['checklists', entityId, checklistId],
    queryFn: async () => {
      if (checklistId) {
        const row = await db.checklists.get(checklistId)
        return row && !row.deleted_at ? [row] : []
      }
      if (!entityId) return []
      return db.checklists
        .where('entity_id')
        .equals(entityId)
        .filter((c) => !c.deleted_at)
        .toArray()
    },
  })
}

export function useChecklistItems(checklistId?: string) {
  return useQuery({
    queryKey: ['checklistItems', checklistId],
    enabled: Boolean(checklistId),
    queryFn: async () => {
      return db.checklistItems
        .where('checklist_id')
        .equals(checklistId!)
        .filter((i) => !i.deleted_at)
        .sortBy('sort_order')
    },
  })
}

export function useNotes(entityId?: string | null, noteId?: string) {
  return useQuery({
    queryKey: ['notes', entityId, noteId],
    queryFn: async () => {
      if (noteId) {
        const row = await db.notes.get(noteId)
        return row && !row.deleted_at ? [row] : []
      }
      if (!entityId) return []
      return db.notes
        .where('entity_id')
        .equals(entityId)
        .filter((n) => !n.deleted_at)
        .toArray()
    },
  })
}

export function useReminders(spaceId: string, entityId?: string | null) {
  return useQuery({
    queryKey: ['reminders', spaceId, entityId],
    queryFn: async () => {
      const rows = await db.reminders.where('space_id').equals(spaceId).toArray()
      return rows
        .filter((r) => !r.deleted_at && r.is_active && (!entityId || r.entity_id === entityId))
        .sort((a, b) => a.remind_at.localeCompare(b.remind_at))
    },
  })
}

export function useTimelineEntries(spaceId: string, entityId?: string | null) {
  return useQuery({
    queryKey: ['timelineEntries', spaceId, entityId],
    queryFn: async () => {
      const rows = await db.timelineEntries.where('space_id').equals(spaceId).toArray()
      return rows
        .filter((e) => !e.deleted_at && (!entityId || e.entity_id === entityId))
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    },
  })
}

export function useEntityMedia(entityId?: string | null) {
  return useQuery({
    queryKey: ['entityMedia', entityId],
    enabled: Boolean(entityId),
    queryFn: async () => {
      return db.entityMedia
        .where('entity_id')
        .equals(entityId!)
        .sortBy('sort_order')
    },
  })
}

export function useMediaAssets(ids: string[]) {
  return useQuery({
    queryKey: ['mediaAssets', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(ids.map((id) => db.mediaAssets.get(id)))
      return rows.filter((r): r is MediaAssetRow => Boolean(r && !r.deleted_at))
    },
  })
}

export function useEntityLocations(entityId?: string | null) {
  return useQuery({
    queryKey: ['entityLocations', entityId],
    enabled: Boolean(entityId),
    queryFn: async () => {
      return db.entityLocations.where('entity_id').equals(entityId!).sortBy('sort_order')
    },
  })
}

export function useLocations(spaceId: string, ids: string[]) {
  return useQuery({
    queryKey: ['locations', spaceId, ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(ids.map((id) => db.locations.get(id)))
      return rows.filter((r): r is LocationRow => Boolean(r && r.space_id === spaceId && !r.deleted_at))
    },
  })
}

export type { BudgetRow, ChecklistItemRow, ChecklistRow, EntityDetailRow, EntityLocationRow, EntityMediaRow, EntityRow, LocationRow, NoteRow, ReminderRow, TimelineEntryRow, TransactionRow }
