import type { RealtimeChannel } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { DEMO_MODE } from '@/lib/demo'
import { db } from '@/lib/indexed-db/db'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { hasPendingOutboxForResource } from '@/features/sync/outbox'
import { invalidateSpaceQueries } from '@/features/sync/invalidate-space-queries'
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
]

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
