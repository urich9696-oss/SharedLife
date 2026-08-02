import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { EntityRow } from '@/lib/indexed-db/schema'
import {
  createEntityPayloadSchema,
  updateEntityPayloadSchema,
  type CreateEntityPayload,
  type UpdateEntityPayload,
} from '@/lib/validation/entity'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listEntities(spaceId: string, includeDeleted = false): Promise<EntityRow[]> {
  const rows = await db.entities.where('space_id').equals(spaceId).toArray()
  return includeDeleted ? rows : rows.filter((r) => !r.deleted_at)
}

export async function listEntitiesByType(
  spaceId: string,
  entityType: EntityRow['entity_type'],
  includeDeleted = false,
): Promise<EntityRow[]> {
  const rows = await db.entities
    .where('[space_id+entity_type]')
    .equals([spaceId, entityType])
    .toArray()
  return includeDeleted ? rows : rows.filter((r) => !r.deleted_at)
}

export async function listDeletedEntities(spaceId: string): Promise<EntityRow[]> {
  return db.entities
    .where('space_id')
    .equals(spaceId)
    .filter((r) => !!r.deleted_at)
    .toArray()
}

export async function searchEntities(
  spaceId: string,
  query: string,
  entityTypes?: EntityRow['entity_type'][],
): Promise<EntityRow[]> {
  const normalized = query.trim().toLowerCase()
  let rows = await listEntities(spaceId)
  if (entityTypes?.length) {
    rows = rows.filter((r) => entityTypes.includes(r.entity_type))
  }
  if (!normalized) return rows
  return rows.filter(
    (r) =>
      r.title.toLowerCase().includes(normalized) ||
      (r.description?.toLowerCase().includes(normalized) ?? false) ||
      (r.subtitle?.toLowerCase().includes(normalized) ?? false),
  )
}

export async function getEntity(id: string): Promise<EntityRow | undefined> {
  return db.entities.get(id)
}

export async function createEntity(
  payload: CreateEntityPayload,
  userId: string | null,
): Promise<EntityRow> {
  const parsed = createEntityPayloadSchema.parse(payload)
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: EntityRow = {
    id: parsed.id,
    space_id: parsed.space_id,
    entity_type: parsed.entity_type,
    title: parsed.title,
    subtitle: parsed.subtitle ?? null,
    description: parsed.description ?? null,
    status: parsed.status,
    color: parsed.color ?? null,
    icon: parsed.icon ?? null,
    starts_at: parsed.starts_at ?? null,
    ends_at: parsed.ends_at ?? null,
    all_day_start: parsed.all_day_start ?? null,
    all_day_end: parsed.all_day_end ?? null,
    cover_media_id: parsed.cover_media_id ?? null,
    parent_entity_id: parsed.parent_entity_id ?? null,
    sort_order: parsed.sort_order,
    metadata: parsed.metadata,
    version: 1,
    created_by: userId,
    updated_by: userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    deleted_by: null,
  }

  await db.transaction('rw', [db.entities, db.outbox], async () => {
    await db.entities.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: row.space_id,
        resourceType: 'entity',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: 1,
        payload: { ...parsed, is_create: true },
        createdAt: now,
      },
      { tx: db },
    )
  })

  // Sofort pushen — nicht auf SyncProvider-Intervall/Queue warten (Partner-Sync).
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { flushResources } = await import('@/features/sync/sync-engine')
      await flushResources([row.id])
    } catch {
      // Offline/Fehler: Outbox + SyncProvider übernehmen den Retry
    }
  }

  return row
}

export async function updateEntity(
  id: string,
  spaceId: string,
  patch: UpdateEntityPayload,
  userId: string | null,
): Promise<EntityRow> {
  const parsed = updateEntityPayloadSchema.parse(patch)
  const existing = await db.entities.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Entity nicht gefunden')
  }
  if (existing.deleted_at) {
    throw new Error('Gelöschte Entity kann nicht bearbeitet werden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  const nextVersion = existing.version + 1

  const updated: EntityRow = {
    ...existing,
    ...parsed,
    subtitle: parsed.subtitle !== undefined ? parsed.subtitle : existing.subtitle,
    description: parsed.description !== undefined ? parsed.description : existing.description,
    color: parsed.color !== undefined ? parsed.color : existing.color,
    icon: parsed.icon !== undefined ? parsed.icon : existing.icon,
    starts_at: parsed.starts_at !== undefined ? parsed.starts_at : existing.starts_at,
    ends_at: parsed.ends_at !== undefined ? parsed.ends_at : existing.ends_at,
    all_day_start:
      parsed.all_day_start !== undefined ? parsed.all_day_start : existing.all_day_start,
    all_day_end: parsed.all_day_end !== undefined ? parsed.all_day_end : existing.all_day_end,
    cover_media_id:
      parsed.cover_media_id !== undefined ? parsed.cover_media_id : existing.cover_media_id,
    parent_entity_id:
      parsed.parent_entity_id !== undefined ? parsed.parent_entity_id : existing.parent_entity_id,
    metadata: parsed.metadata !== undefined ? parsed.metadata : existing.metadata,
    version: nextVersion,
    updated_by: userId,
    updated_at: now,
  }

  await db.transaction('rw', [db.entities, db.outbox], async () => {
    await db.entities.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'entity',
        resourceId: id,
        operation: 'update',
        expectedVersion: existing.version,
        payload: parsed as Record<string, unknown>,
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}

export async function softDeleteEntity(
  id: string,
  spaceId: string,
  userId: string | null,
): Promise<EntityRow> {
  const existing = await db.entities.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Entity nicht gefunden')
  }
  if (existing.deleted_at) return existing

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  const nextVersion = existing.version + 1

  const updated: EntityRow = {
    ...existing,
    version: nextVersion,
    deleted_at: now,
    deleted_by: userId,
    updated_by: userId,
    updated_at: now,
  }

  await db.transaction('rw', [db.entities, db.outbox], async () => {
    await db.entities.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'entity',
        resourceId: id,
        operation: 'soft_delete',
        expectedVersion: existing.version,
        payload: {},
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}

export async function restoreEntity(
  id: string,
  spaceId: string,
  userId: string | null,
): Promise<EntityRow> {
  const existing = await db.entities.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Entity nicht gefunden')
  }
  if (!existing.deleted_at) return existing

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  const nextVersion = existing.version + 1

  const updated: EntityRow = {
    ...existing,
    version: nextVersion,
    deleted_at: null,
    deleted_by: null,
    updated_by: userId,
    updated_at: now,
  }

  await db.transaction('rw', [db.entities, db.outbox], async () => {
    await db.entities.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'entity',
        resourceId: id,
        operation: 'restore',
        expectedVersion: existing.version,
        payload: {},
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}
