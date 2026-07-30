import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { DetailType, EntityDetailRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function getEntityDetail(
  entityId: string,
  detailType: DetailType,
): Promise<EntityDetailRow | undefined> {
  return db.entityDetails.get([entityId, detailType])
}

export async function upsertEntityDetail(input: {
  entityId: string
  spaceId: string
  detailType: DetailType
  payload: Record<string, unknown>
}): Promise<EntityDetailRow> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  const existing = await db.entityDetails.get([input.entityId, input.detailType])

  const row: EntityDetailRow = {
    entity_id: input.entityId,
    detail_type: input.detailType,
    space_id: input.spaceId,
    payload: input.payload,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }

  await db.transaction('rw', [db.entityDetails, db.outbox], async () => {
    await db.entityDetails.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'entity_detail',
        resourceId: input.entityId,
        operation: existing ? 'update' : 'create',
        expectedVersion: null,
        payload: {
          entity_id: input.entityId,
          detail_type: input.detailType,
          payload: input.payload,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}
