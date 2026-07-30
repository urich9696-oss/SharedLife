import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { ChecklistItemRow, ChecklistRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listChecklistsForEntity(entityId: string): Promise<ChecklistRow[]> {
  return db.checklists
    .where('entity_id')
    .equals(entityId)
    .filter((c) => !c.deleted_at)
    .toArray()
}

export async function listChecklistItems(checklistId: string): Promise<ChecklistItemRow[]> {
  return db.checklistItems
    .where('checklist_id')
    .equals(checklistId)
    .filter((i) => !i.deleted_at)
    .sortBy('sort_order')
}

export async function createChecklist(input: {
  id: string
  spaceId: string
  entityId: string
  title: string
}): Promise<ChecklistRow> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: ChecklistRow = {
    id: input.id,
    space_id: input.spaceId,
    entity_id: input.entityId,
    title: input.title,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.checklists, db.outbox], async () => {
    await db.checklists.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'checklist',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          entity_id: input.entityId,
          title: input.title,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function createChecklistItem(input: {
  id: string
  spaceId: string
  checklistId: string
  title: string
  sortOrder?: number
}): Promise<ChecklistItemRow> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const row: ChecklistItemRow = {
    id: input.id,
    space_id: input.spaceId,
    checklist_id: input.checklistId,
    title: input.title,
    is_checked: false,
    checked_at: null,
    checked_by: null,
    assignee_id: null,
    due_date: null,
    sort_order: input.sortOrder ?? 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.checklistItems, db.outbox], async () => {
    await db.checklistItems.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'checklist_item',
        resourceId: row.id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          checklist_id: input.checklistId,
          title: input.title,
          sort_order: row.sort_order,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function toggleChecklistItem(
  id: string,
  spaceId: string,
  checked: boolean,
  userId: string | null,
): Promise<ChecklistItemRow> {
  const existing = await db.checklistItems.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Checklistenpunkt nicht gefunden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const updated: ChecklistItemRow = {
    ...existing,
    is_checked: checked,
    checked_at: checked ? now : null,
    checked_by: checked ? userId : null,
    updated_at: now,
  }

  await db.transaction('rw', [db.checklistItems, db.outbox], async () => {
    await db.checklistItems.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'checklist_item',
        resourceId: id,
        operation: 'update',
        expectedVersion: null,
        payload: {
          is_checked: checked,
          checked_at: updated.checked_at,
          checked_by: updated.checked_by,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}

export async function updateChecklistItemTitle(
  id: string,
  spaceId: string,
  title: string,
): Promise<ChecklistItemRow> {
  const existing = await db.checklistItems.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Checklistenpunkt nicht gefunden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const updated: ChecklistItemRow = { ...existing, title, updated_at: now }

  await db.transaction('rw', [db.checklistItems, db.outbox], async () => {
    await db.checklistItems.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'checklist_item',
        resourceId: id,
        operation: 'update',
        expectedVersion: null,
        payload: { title },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}

export async function reorderChecklistItem(
  id: string,
  spaceId: string,
  sortOrder: number,
): Promise<ChecklistItemRow> {
  const existing = await db.checklistItems.get(id)
  if (!existing || existing.space_id !== spaceId) {
    throw new Error('Checklistenpunkt nicht gefunden')
  }

  const siblings = await listChecklistItems(existing.checklist_id)
  const fromIndex = siblings.findIndex((item) => item.id === id)
  if (fromIndex < 0) throw new Error('Checklistenpunkt nicht gefunden')

  const toIndex = Math.max(0, Math.min(sortOrder, siblings.length - 1))
  if (fromIndex === toIndex) return existing

  const reordered = [...siblings]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  let updatedMoved: ChecklistItemRow = existing

  await db.transaction('rw', [db.checklistItems, db.outbox], async () => {
    for (let index = 0; index < reordered.length; index += 1) {
      const item = reordered[index]
      if (item.sort_order === index) continue
      const updated: ChecklistItemRow = { ...item, sort_order: index, updated_at: now }
      await db.checklistItems.put(updated)
      await enqueueMutation(
        {
          mutationId: uuidv4(),
          deviceId,
          spaceId,
          resourceType: 'checklist_item',
          resourceId: item.id,
          operation: 'update',
          expectedVersion: null,
          payload: { sort_order: index },
          createdAt: now,
        },
        { tx: db },
      )
      if (item.id === id) updatedMoved = updated
    }
  })

  return updatedMoved
}

export async function softDeleteChecklistItem(id: string, spaceId: string): Promise<void> {
  const existing = await db.checklistItems.get(id)
  if (!existing || existing.space_id !== spaceId) return

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  await db.transaction('rw', [db.checklistItems, db.outbox], async () => {
    await db.checklistItems.put({ ...existing, deleted_at: now, updated_at: now })
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'checklist_item',
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
