import { db } from '@/lib/indexed-db/db'
import type { EntityRow } from '@/lib/indexed-db/schema'
import { restoreEntity } from '@/lib/indexed-db/repositories/entities'

export interface TrashItem {
  id: string
  resourceType: 'entity'
  title: string
  subtitle: string | null
  deletedAt: string
  entityType?: EntityRow['entity_type']
}

export async function listTrashItems(spaceId: string): Promise<TrashItem[]> {
  const entities = await db.entities.where('space_id').equals(spaceId).toArray()

  return entities
    .filter((e) => Boolean(e.deleted_at))
    .map((e) => ({
      id: e.id,
      resourceType: 'entity' as const,
      title: e.title,
      subtitle: e.subtitle,
      deletedAt: e.deleted_at!,
      entityType: e.entity_type,
    }))
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
}

export async function restoreTrashItem(
  item: TrashItem,
  spaceId: string,
  userId: string | null,
): Promise<void> {
  if (item.resourceType === 'entity') {
    await restoreEntity(item.id, spaceId, userId)
  }
}
