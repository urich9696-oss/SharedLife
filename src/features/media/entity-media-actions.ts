import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import { enqueueMutation } from '@/features/sync/outbox'
import { updateEntity } from '@/lib/indexed-db/repositories/entities'

function nowIso() {
  return new Date().toISOString()
}

/** Setzt Cover auf Entity + markiert entity_media Rolle */
export async function setEntityCoverMedia(input: {
  spaceId: string
  entityId: string
  mediaId: string
  userId?: string | null
}): Promise<void> {
  const links = await db.entityMedia.where('entity_id').equals(input.entityId).toArray()
  const now = nowIso()

  await db.transaction('rw', [db.entityMedia], async () => {
    for (const link of links) {
      const isCover = link.media_id === input.mediaId
      await db.entityMedia.put({
        ...link,
        role: isCover ? 'cover' : link.role === 'cover' ? 'gallery' : link.role,
        sort_order: isCover ? 0 : Math.max(1, link.sort_order),
      })
    }
  })

  await updateEntity(
    input.entityId,
    input.spaceId,
    { cover_media_id: input.mediaId },
    input.userId ?? null,
  )

  // Touch updated_at locally for queries
  await db.entities.update(input.entityId, { updated_at: now })
}

/** Entfernt Medien-Link zur Entity (Asset bleibt, Cover wird geleert) */
export async function unlinkEntityMedia(input: {
  spaceId: string
  entityId: string
  storagePath: string
  userId?: string | null
}): Promise<void> {
  const assets = await db.mediaAssets.where('space_id').equals(input.spaceId).toArray()
  const asset = assets.find((a) => a.storage_path === input.storagePath && !a.deleted_at)
  if (!asset) return

  const links = await db.entityMedia
    .where('entity_id')
    .equals(input.entityId)
    .filter((l) => l.media_id === asset.id)
    .toArray()

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  await db.transaction('rw', [db.entityMedia, db.outbox, db.entities], async () => {
    for (const link of links) {
      await db.entityMedia.delete(link.id)
      await enqueueMutation(
        {
          mutationId: uuidv4(),
          deviceId,
          spaceId: input.spaceId,
          resourceType: 'entity_media',
          resourceId: link.id,
          operation: 'soft_delete',
          expectedVersion: null,
          payload: { deleted_at: now },
          createdAt: now,
        },
        { tx: db },
      )
    }
  })

  const entity = await db.entities.get(input.entityId)
  if (entity?.cover_media_id === asset.id) {
    await updateEntity(
      input.entityId,
      input.spaceId,
      { cover_media_id: null },
      input.userId ?? null,
    )
  }
}

export async function unlinkEntityMediaById(input: {
  spaceId: string
  entityId: string
  mediaId: string
  userId?: string | null
}): Promise<void> {
  const asset = await db.mediaAssets.get(input.mediaId)
  if (!asset) return
  await unlinkEntityMedia({
    spaceId: input.spaceId,
    entityId: input.entityId,
    storagePath: asset.storage_path,
    userId: input.userId,
  })
}
