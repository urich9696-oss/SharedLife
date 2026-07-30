import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { WidgetInstanceRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'
import type { WidgetType } from '@/features/widgets/registry'
import { WIDGET_REGISTRY, WIDGET_SIZE_GRID } from '@/features/widgets/registry'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listWidgetInstancesForEntity(
  spaceId: string,
  entityId: string,
): Promise<WidgetInstanceRow[]> {
  const rows = await db.widgetInstances
    .where('entity_id')
    .equals(entityId)
    .filter((w) => w.space_id === spaceId && !w.deleted_at)
    .toArray()
  return rows.sort((a, b) => a.sort_order - b.sort_order)
}

export async function createWidgetInstance(input: {
  id?: string
  spaceId: string
  entityId: string
  widgetType: WidgetType
  title?: string | null
  config?: Record<string, unknown>
  size?: keyof typeof WIDGET_SIZE_GRID
  sortOrder?: number
  userId?: string | null
}): Promise<WidgetInstanceRow> {
  const def = WIDGET_REGISTRY[input.widgetType]
  const size = input.size ?? def.defaultSize
  const grid = WIDGET_SIZE_GRID[size]
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()
  const id = input.id ?? uuidv4()

  const existing = await listWidgetInstancesForEntity(input.spaceId, input.entityId)
  const sortOrder = input.sortOrder ?? existing.length

  const row: WidgetInstanceRow = {
    id,
    space_id: input.spaceId,
    view_layout_id: null,
    entity_id: input.entityId,
    widget_type: input.widgetType,
    title: input.title ?? def.label,
    config: input.config ?? def.defaultConfig(),
    grid_x: 0,
    grid_y: sortOrder,
    grid_w: grid.w,
    grid_h: grid.h,
    is_visible: true,
    sort_order: sortOrder,
    created_by: input.userId ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', [db.widgetInstances, db.outbox], async () => {
    await db.widgetInstances.put(row)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'widget_instance',
        resourceId: id,
        operation: 'create',
        expectedVersion: null,
        payload: {
          entity_id: input.entityId,
          widget_type: input.widgetType,
          title: row.title,
          config: row.config,
          grid_x: row.grid_x,
          grid_y: row.grid_y,
          grid_w: row.grid_w,
          grid_h: row.grid_h,
          is_visible: row.is_visible,
          sort_order: row.sort_order,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return row
}

export async function updateWidgetInstance(
  id: string,
  spaceId: string,
  patch: {
    title?: string | null
    config?: Record<string, unknown>
    grid_w?: number
    grid_h?: number
    sort_order?: number
    is_visible?: boolean
  },
): Promise<WidgetInstanceRow> {
  const existing = await db.widgetInstances.get(id)
  if (!existing || existing.space_id !== spaceId || existing.deleted_at) {
    throw new Error('Widget nicht gefunden')
  }

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  const updated: WidgetInstanceRow = {
    ...existing,
    title: patch.title !== undefined ? patch.title : existing.title,
    config: patch.config !== undefined ? patch.config : existing.config,
    grid_w: patch.grid_w !== undefined ? patch.grid_w : existing.grid_w,
    grid_h: patch.grid_h !== undefined ? patch.grid_h : existing.grid_h,
    sort_order: patch.sort_order !== undefined ? patch.sort_order : existing.sort_order,
    is_visible: patch.is_visible !== undefined ? patch.is_visible : existing.is_visible,
    updated_at: now,
  }

  await db.transaction('rw', [db.widgetInstances, db.outbox], async () => {
    await db.widgetInstances.put(updated)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'widget_instance',
        resourceId: id,
        operation: 'update',
        expectedVersion: null,
        payload: patch as Record<string, unknown>,
        createdAt: now,
      },
      { tx: db },
    )
  })

  return updated
}

export async function reorderWidgetInstances(
  spaceId: string,
  entityId: string,
  orderedIds: string[],
): Promise<void> {
  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  await db.transaction('rw', [db.widgetInstances, db.outbox], async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]
      const existing = await db.widgetInstances.get(id)
      if (!existing || existing.space_id !== spaceId || existing.entity_id !== entityId) continue

      const updated = { ...existing, sort_order: i, grid_y: i, updated_at: now }
      await db.widgetInstances.put(updated)
      await enqueueMutation(
        {
          mutationId: uuidv4(),
          deviceId,
          spaceId,
          resourceType: 'widget_instance',
          resourceId: id,
          operation: 'update',
          expectedVersion: null,
          payload: { sort_order: i, grid_y: i },
          createdAt: now,
        },
        { tx: db },
      )
    }
  })
}

export async function softDeleteWidgetInstance(id: string, spaceId: string): Promise<void> {
  const existing = await db.widgetInstances.get(id)
  if (!existing || existing.space_id !== spaceId) return

  const deviceId = await getOrCreateDeviceId()
  const now = nowIso()

  await db.transaction('rw', [db.widgetInstances, db.outbox], async () => {
    await db.widgetInstances.put({ ...existing, deleted_at: now, updated_at: now })
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType: 'widget_instance',
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

export async function resizeWidgetInstance(
  id: string,
  spaceId: string,
  size: keyof typeof WIDGET_SIZE_GRID,
): Promise<WidgetInstanceRow> {
  const grid = WIDGET_SIZE_GRID[size]
  return updateWidgetInstance(id, spaceId, { grid_w: grid.w, grid_h: grid.h })
}
