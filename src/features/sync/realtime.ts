import type { RealtimeChannel } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { DEMO_MODE } from '@/lib/demo'
import { db } from '@/lib/indexed-db/db'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { hasPendingOutboxForResource } from '@/features/sync/outbox'
import { getSupabaseClient } from '@/lib/supabase/client'

let channel: RealtimeChannel | null = null

async function applyEntityChange(payload: { new: EntityRow; eventType: string }): Promise<void> {
  const row = payload.new
  const hasPending = await hasPendingOutboxForResource('entity', row.id)
  if (hasPending) return

  if (payload.eventType === 'DELETE') {
    await db.entities.delete(row.id)
    return
  }

  await db.entities.put(row)
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
  channel = supabase
    .channel(`space:${spaceId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'entities', filter: `space_id=eq.${spaceId}` },
      (payload) => {
        const row = payload.new as EntityRow
        void applyEntityChange({
          new: row,
          eventType: payload.eventType,
        }).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['entities', spaceId] })
          void queryClient.invalidateQueries({ queryKey: ['entity', row.id] })
        })
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'checklists', filter: `space_id=eq.${spaceId}` },
      async (payload) => {
        const id = (payload.new as { id: string }).id
        if (await hasPendingOutboxForResource('checklist', id)) return
        if (payload.eventType === 'DELETE') {
          await db.checklists.delete(id)
        } else {
          await db.checklists.put(payload.new as never)
        }
        void queryClient.invalidateQueries({ queryKey: ['checklists', spaceId] })
        void queryClient.invalidateQueries({ queryKey: ['shopping', spaceId] })
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'checklist_items', filter: `space_id=eq.${spaceId}` },
      async (payload) => {
        const row = payload.new as { id: string; checklist_id?: string }
        if (!row?.id) return
        if (await hasPendingOutboxForResource('checklist_item', row.id)) return
        if (payload.eventType === 'DELETE') {
          await db.checklistItems.delete(row.id)
        } else {
          await db.checklistItems.put(payload.new as never)
        }
        void queryClient.invalidateQueries({ queryKey: ['checklist-items'] })
        void queryClient.invalidateQueries({ queryKey: ['shopping', spaceId] })
        void queryClient.invalidateQueries({ queryKey: ['shopping-preview', spaceId] })
        if (row.checklist_id) {
          void queryClient.invalidateQueries({ queryKey: ['checklist-items', row.checklist_id] })
        }
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budgets', filter: `space_id=eq.${spaceId}` },
      async (payload) => {
        const id = (payload.new as { id: string }).id
        if (await hasPendingOutboxForResource('budget', id)) return
        if (payload.eventType === 'DELETE') {
          await db.budgets.delete(id)
        } else {
          await db.budgets.put(payload.new as never)
        }
        void queryClient.invalidateQueries({ queryKey: ['budgets', spaceId] })
      },
    )
    .subscribe()

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
