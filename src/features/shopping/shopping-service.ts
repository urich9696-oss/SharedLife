import { v4 as uuidv4 } from 'uuid'
import {
  createEntity,
  listEntitiesByType,
  updateEntity,
} from '@/lib/indexed-db/repositories/entities'
import {
  createChecklist,
  listChecklistsForEntity,
  listChecklistItems,
} from '@/lib/indexed-db/repositories/checklists'
import { upsertEntityDetail } from '@/lib/indexed-db/repositories/entity-details'
import type { ChecklistItemRow, EntityRow } from '@/lib/indexed-db/schema'

const SHOPPING_META_KEY = 'shoppingPrimary'

export async function findPrimaryShoppingEntity(spaceId: string): Promise<EntityRow | null> {
  const lists = await listEntitiesByType(spaceId, 'list')
  // Bevorzuge die gekennzeichnete Primärliste; sonst exakt „Einkauf“.
  // Kein Fallback auf lists[0] — sonst landet jeder Partner auf einer anderen Liste.
  const primary =
    lists.find((e) => e.metadata?.[SHOPPING_META_KEY] === true) ??
    lists.find((e) => e.title.trim().toLowerCase() === 'einkauf') ??
    null
  return primary
}

export async function ensureShoppingList(spaceId: string, userId?: string | null): Promise<{
  entity: EntityRow
  checklistId: string
}> {
  let entity = await findPrimaryShoppingEntity(spaceId)

  if (!entity) {
    const id = uuidv4()
    entity = await createEntity(
      {
        id,
        space_id: spaceId,
        entity_type: 'list',
        title: 'Einkauf',
        description: 'Gemeinsame Einkaufsliste',
        status: 'active',
        sort_order: 0,
        metadata: { [SHOPPING_META_KEY]: true },
      },
      userId ?? null,
    )
    await upsertEntityDetail({
      entityId: id,
      spaceId,
      detailType: 'list',
      payload: { listKind: 'shopping', isCheckable: true },
    })
  } else if (entity.metadata?.[SHOPPING_META_KEY] !== true) {
    entity = await updateEntity(
      entity.id,
      spaceId,
      { metadata: { ...entity.metadata, [SHOPPING_META_KEY]: true } },
      userId ?? null,
    )
  }

  let checklists = await listChecklistsForEntity(entity.id)
  let checklistId = checklists[0]?.id
  if (!checklistId) {
    const checklist = await createChecklist({
      id: uuidv4(),
      spaceId,
      entityId: entity.id,
      title: 'Einkaufsliste',
    })
    checklistId = checklist.id
    checklists = [checklist]
  }

  return { entity, checklistId }
}

export async function getActiveShoppingItems(spaceId: string): Promise<{
  entity: EntityRow | null
  checklistId: string | null
  active: ChecklistItemRow[]
  completed: ChecklistItemRow[]
}> {
  const entity = await findPrimaryShoppingEntity(spaceId)
  if (!entity) {
    return { entity: null, checklistId: null, active: [], completed: [] }
  }
  const checklists = await listChecklistsForEntity(entity.id)
  const checklistId = checklists[0]?.id ?? null
  if (!checklistId) {
    return { entity, checklistId: null, active: [], completed: [] }
  }
  const items = await listChecklistItems(checklistId)
  return {
    entity,
    checklistId,
    active: items.filter((i) => !i.is_checked),
    completed: items
      .filter((i) => i.is_checked)
      .sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? '')),
  }
}
