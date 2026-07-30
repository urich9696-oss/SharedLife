import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { EntityLinkRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listLinksForEntity(entityId: string): Promise<EntityLinkRow[]> {
  const source = await db.entityLinks
    .where('source_entity_id')
    .equals(entityId)
    .filter((l) => !l.deleted_at)
    .toArray()
  const target = await db.entityLinks
    .where('target_entity_id')
    .equals(entityId)
    .filter((l) => !l.deleted_at)
    .toArray()
  const seen = new Set<string>()
  return [...source, ...target].filter((l) => {
    if (seen.has(l.id)) return false
    seen.add(l.id)
    return true
  })
}

export async function createEntityLink(input: {
  id: string
  spaceId: string
  sourceEntityId: string
  targetEntityId: string
  linkType?: string
  label?: string | null
  userId: string | null
}): Promise<EntityLinkRow> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: EntityLinkRow = {
    id: input.id,
    space_id: input.spaceId,
    source_entity_id: input.sourceEntityId,
    target_entity_id: input.targetEntityId,
    link_type: input.linkType ?? 'related',
    label: input.label ?? null,
    metadata: {},
    created_by: input.userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.entityLinks, db.outbox], async () => {
    await db.entityLinks.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'entity_link',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          source_entity_id: input.sourceEntityId,
          target_entity_id: input.targetEntityId,
          link_type: row.link_type,
          label: row.label,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function softDeleteEntityLink(id: string, spaceId: string): Promise<void> {
  const existing = await db.entityLinks.get(id)
  if (!existing || existing.space_id !== spaceId) return

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  await db.transaction('rw', [db.entityLinks, db.outbox], async () => {
    await db.entityLinks.put({ ...existing, deleted_at: now, updated_at: now })
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'entity_link',
        resourceId: id,
        operation: 'soft_delete',
        expectedVersion: null,
        payload: {},
        createdAt: now,
      },
      { tx: db },
    )
  })
}
