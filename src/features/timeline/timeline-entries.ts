import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { TimelineEntryRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function createTimelineEntry(input: {
  spaceId: string
  title: string
  body?: string | null
  occurredAt?: string
  userId?: string | null
  entityId?: string | null
}): Promise<TimelineEntryRow> {
  const id = uuidv4()
  const now = nowIso()
  const occurredAt = input.occurredAt ?? now
  const row: TimelineEntryRow = {
    id,
    space_id: input.spaceId,
    entity_id: input.entityId ?? null,
    entry_type: 'custom',
    title: input.title.trim(),
    body: input.body?.trim() || null,
    occurred_at: occurredAt,
    occurred_on: occurredAt.slice(0, 10),
    highlight: false,
    created_by: input.userId ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  const deviceId = await getOrCreateDeviceId()
  await db.transaction('rw', [db.timelineEntries, db.outbox], async () => {
    await db.timelineEntries.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'timeline_entry',
        resourceId: id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          entity_id: row.entity_id,
          entry_type: row.entry_type,
          title: row.title,
          body: row.body,
          occurred_at: row.occurred_at,
          occurred_on: row.occurred_on,
          highlight: row.highlight,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}
