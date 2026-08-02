import type { RealtimeChannel } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { DEMO_MODE } from '@/lib/demo'
import { db } from '@/lib/indexed-db/db'
import type { DetailType, EntityRow } from '@/lib/indexed-db/schema'
import { hasPendingOutboxForResource } from '@/features/sync/outbox'
import { invalidateSpaceQueries } from '@/features/sync/invalidate-space-queries'
import { detailRowToLocalPayload } from '@/features/sync/pull-space'
import { getSupabaseClient } from '@/lib/supabase/client'

let channel: RealtimeChannel | null = null

async function applyEntityChange(payload: { new: EntityRow; eventType: string }): Promise<void> {
  const row = payload.new
  if (!row?.id) return
  const hasPending = await hasPendingOutboxForResource('entity', row.id)
  if (hasPending) return

  if (payload.eventType === 'DELETE') {
    await db.entities.delete(row.id)
    return
  }

  await db.entities.put(row)
}

type SimpleTableConfig = {
  table: string
  resourceType: string
  put: (row: Record<string, unknown>) => Promise<unknown>
  del: (id: string) => Promise<unknown>
}

const SIMPLE_TABLES: SimpleTableConfig[] = [
  {
    table: 'checklists',
    resourceType: 'checklist',
    put: (row) => db.checklists.put(row as never),
    del: (id) => db.checklists.delete(id),
  },
  {
    table: 'checklist_items',
    resourceType: 'checklist_item',
    put: (row) => db.checklistItems.put(row as never),
    del: (id) => db.checklistItems.delete(id),
  },
  {
    table: 'budgets',
    resourceType: 'budget',
    put: (row) => db.budgets.put(row as never),
    del: (id) => db.budgets.delete(id),
  },
  {
    table: 'transactions',
    resourceType: 'transaction',
    put: (row) => db.transactions.put(row as never),
    del: (id) => db.transactions.delete(id),
  },
  {
    table: 'notes',
    resourceType: 'note',
    put: (row) => db.notes.put(row as never),
    del: (id) => db.notes.delete(id),
  },
  {
    table: 'media_assets',
    resourceType: 'media_asset',
    put: (row) => db.mediaAssets.put(row as never),
    del: (id) => db.mediaAssets.delete(id),
  },
  {
    table: 'entity_media',
    resourceType: 'entity_media',
    put: (row) => db.entityMedia.put(row as never),
    del: (id) => db.entityMedia.delete(id),
  },
  {
    table: 'reminders',
    resourceType: 'reminder',
    put: (row) => db.reminders.put(row as never),
    del: (id) => db.reminders.delete(id),
  },
  {
    table: 'timeline_entries',
    resourceType: 'timeline_entry',
    put: (row) => db.timelineEntries.put(row as never),
    del: (id) => db.timelineEntries.delete(id),
  },
  {
    table: 'entity_links',
    resourceType: 'entity_link',
    put: (row) => db.entityLinks.put(row as never),
    del: (id) => db.entityLinks.delete(id),
  },
]

const DETAIL_REALTIME_TABLES: Array<{ table: string; type: DetailType }> = [
  { table: 'trip_details', type: 'trip' },
  { table: 'date_details', type: 'date' },
  { table: 'goal_details', type: 'goal' },
  { table: 'event_details', type: 'event' },
  { table: 'task_details', type: 'task' },
  { table: 'list_details', type: 'list' },
  { table: 'wish_details', type: 'wish' },
  { table: 'moment_details', type: 'moment' },
  { table: 'project_details', type: 'project' },
  { table: 'milestone_details', type: 'milestone' },
]

async function applyDetailChange(
  detailType: DetailType,
  payload: { new: Record<string, unknown> | null; eventType: string },
): Promise<string | null> {
  const row = payload.new
  const entityId = row?.entity_id ? String(row.entity_id) : null
  if (!entityId) return null

  const hasPending = await hasPendingOutboxForResource('entity_detail', entityId)
  if (hasPending) return null

  if (payload.eventType === 'DELETE') {
    await db.entityDetails.delete([entityId, detailType])
    return entityId
  }

  const existing = await db.entityDetails.get([entityId, detailType])
  const serverPayload = detailRowToLocalPayload(detailType, row!)
  // Metadata-Felder (occasion, wishStatus, place …) bleiben lokal erhalten, falls Server sie nicht trägt
  const mergedPayload = {
    ...(existing?.payload ?? {}),
    ...serverPayload,
    ...(existing?.payload?.occasion ? { occasion: existing.payload.occasion } : {}),
    ...(existing?.payload?.wishStatus ? { wishStatus: existing.payload.wishStatus } : {}),
    ...(existing?.payload?.phase ? { phase: existing.payload.phase } : {}),
  }

  await db.entityDetails.put({
    entity_id: entityId,
    detail_type: detailType,
    space_id: String(row!.space_id ?? existing?.space_id ?? ''),
    payload: mergedPayload,
    created_at: String(row!.created_at ?? existing?.created_at ?? new Date().toISOString()),
    updated_at: String(row!.updated_at ?? new Date().toISOString()),
  })

  // Date-Ort zusätzlich in Entity-Metadata spiegeln, damit Listen/Partner-UI sofort Ort sehen
  if (detailType === 'date') {
    const venue = String(serverPayload.venueName ?? '')
    if (venue) {
      const entity = await db.entities.get(entityId)
      if (entity && !entity.deleted_at) {
        const meta = { ...(entity.metadata ?? {}) }
        if (meta.place !== venue) {
          await db.entities.put({
            ...entity,
            metadata: { ...meta, place: venue },
            updated_at: new Date().toISOString(),
          })
        }
      }
    }
  }

  return entityId
}

export function subscribeToSpaceChanges(
  spaceId: string,
  queryClient: QueryClient,
): RealtimeChannel | null {
  if (DEMO_MODE) return null

  if (channel) {
    void getSupabaseClient().removeChannel(channel)
    channel = null
  }

  const supabase = getSupabaseClient()
  let ch = supabase.channel(`space:${spaceId}`).on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'entities', filter: `space_id=eq.${spaceId}` },
    (payload) => {
      const row = payload.new as EntityRow
      void applyEntityChange({
        new: row,
        eventType: payload.eventType,
      }).then(() => {
        invalidateSpaceQueries(queryClient, spaceId, row?.id)
      })
    },
  )

  for (const cfg of SIMPLE_TABLES) {
    ch = ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: cfg.table, filter: `space_id=eq.${spaceId}` },
      (payload) => {
        void (async () => {
          const row = payload.new as { id?: string; checklist_id?: string } | null
          const id = row?.id
          if (!id) return
          if (await hasPendingOutboxForResource(cfg.resourceType, id)) return
          if (payload.eventType === 'DELETE') {
            await cfg.del(id)
          } else {
            await cfg.put(payload.new as Record<string, unknown>)
          }
          invalidateSpaceQueries(queryClient, spaceId)
          if (cfg.table === 'checklist_items' && row.checklist_id) {
            void queryClient.invalidateQueries({
              queryKey: ['checklist-items', row.checklist_id],
            })
            void queryClient.invalidateQueries({
              queryKey: ['checklistItems', row.checklist_id],
            })
          }
        })()
      },
    )
  }

  for (const { table, type } of DETAIL_REALTIME_TABLES) {
    ch = ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `space_id=eq.${spaceId}` },
      (payload) => {
        void applyDetailChange(type, {
          new: (payload.new as Record<string, unknown> | null) ?? null,
          eventType: payload.eventType,
        }).then((entityId) => {
          if (entityId) invalidateSpaceQueries(queryClient, spaceId, entityId)
        })
      },
    )
  }

  channel = ch.subscribe()
  return channel
}

export function unsubscribeFromSpaceChanges(): void {
  if (DEMO_MODE) {
    channel = null
    return
  }
  if (channel) {
    void getSupabaseClient().removeChannel(channel)
    channel = null
  }
}
