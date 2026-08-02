import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { DetailType, EntityDetailRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'
import { normalizeMoneyInput } from '@/lib/money'

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeDetailPayload(
  detailType: DetailType,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (detailType !== 'wish') return payload
  const next = { ...payload }
  if (typeof next.price === 'string') {
    const normalized = normalizeMoneyInput(next.price)
    next.price = normalized ?? ''
  }
  if (next.wishStatus === 'bought') next.fulfilled = true
  if (next.priority === 'medium') next.priority = 'normal'
  return next
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
  const payload = normalizeDetailPayload(input.detailType, input.payload)

  const row: EntityDetailRow = {
    entity_id: input.entityId,
    detail_type: input.detailType,
    space_id: input.spaceId,
    payload,
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
          payload,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}
