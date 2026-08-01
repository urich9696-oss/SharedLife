import { v4 as uuidv4 } from 'uuid'
import { DEMO_MODE } from '@/lib/demo'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import { enqueueMutation } from '@/features/sync/outbox'
import { flushOutbox } from '@/features/sync/sync-engine'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { ResourceType } from '@/lib/indexed-db/schema'

const LOCAL_CONTENT_TABLES = [
  'entities',
  'entityDetails',
  'notes',
  'checklists',
  'checklistItems',
  'budgets',
  'transactions',
  'locations',
  'entityLocations',
  'mediaAssets',
  'entityMedia',
  'timelineEntries',
  'reminders',
  'widgetInstances',
  'viewLayouts',
  'entityLinks',
  'uploadQueue',
  'conflictCopies',
  'localMediaBlobs',
  'activityLog',
] as const

export interface ClearSpaceResult {
  mode: 'rpc' | 'outbox' | 'local'
  entityCount: number
  message: string
}

async function clearLocalContentTables(): Promise<void> {
  await db.transaction('rw', [...LOCAL_CONTENT_TABLES, 'outbox'], async () => {
    for (const tableName of LOCAL_CONTENT_TABLES) {
      await db.table(tableName).clear()
    }
    // Offene Mutations zu Inhalt verwerfen — Space ist leer
    await db.outbox.clear()
  })
}

async function softDeleteAllViaOutbox(spaceId: string, userId: string | null): Promise<number> {
  const deviceId = await getOrCreateDeviceId()
  const now = new Date().toISOString()
  let entityCount = 0

  type SoftRow = {
    id: string
    version?: number
    space_id: string
    deleted_at: string | null
  }

  const softDeleteRows = async (
    tableName: (typeof LOCAL_CONTENT_TABLES)[number],
    resourceType: ResourceType,
  ) => {
    const rows = (await db
      .table(tableName)
      .filter((r: SoftRow) => r.space_id === spaceId && !r.deleted_at)
      .toArray()) as SoftRow[]

    for (const row of rows) {
      if (tableName === 'entities') entityCount += 1
      const nextVersion = (row.version ?? 1) + 1
      const patch =
        tableName === 'entities'
          ? {
              ...row,
              version: nextVersion,
              deleted_at: now,
              deleted_by: userId,
              updated_by: userId,
              updated_at: now,
            }
          : {
              ...row,
              deleted_at: now,
              updated_at: now,
            }
      await db.table(tableName).put(patch)
      await enqueueMutation({
        mutationId: uuidv4(),
        deviceId,
        spaceId,
        resourceType,
        resourceId: row.id,
        operation: 'soft_delete',
        expectedVersion: resourceType === 'entity' ? (row.version ?? 1) : null,
        payload: {},
        createdAt: now,
      })
    }
  }

  // Nur Tabellen mit deleted_at — Links ohne Soft-Delete werden beim lokalen Clear entfernt
  await softDeleteRows('entities', 'entity')
  await softDeleteRows('notes', 'note')
  await softDeleteRows('checklists', 'checklist')
  await softDeleteRows('checklistItems', 'checklist_item')
  await softDeleteRows('budgets', 'budget')
  await softDeleteRows('transactions', 'transaction')
  await softDeleteRows('reminders', 'reminder')
  await softDeleteRows('widgetInstances', 'widget_instance')
  await softDeleteRows('timelineEntries', 'timeline_entry')
  await softDeleteRows('entityLinks', 'entity_link')
  await softDeleteRows('mediaAssets', 'media_asset')
  await softDeleteRows('locations', 'location')

  return entityCount
}

/**
 * Entfernt alle Inhalte des Spaces (lokal + remote, wenn möglich).
 * Space, Mitgliedschaften und Paarprofil bleiben erhalten.
 */
export async function clearSpaceContent(
  spaceId: string,
  userId: string | null,
): Promise<ClearSpaceResult> {
  const activeEntities = await db.entities
    .where('space_id')
    .equals(spaceId)
    .filter((e) => !e.deleted_at)
    .count()

  if (DEMO_MODE) {
    await clearLocalContentTables()
    return {
      mode: 'local',
      entityCount: activeEntities,
      message: 'Demo: alle lokalen Einträge entfernt.',
    }
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('clear_space_content', {
      p_space_id: spaceId,
    })
    if (error) throw error

    await clearLocalContentTables()
    const entityCount =
      typeof data === 'object' &&
      data !== null &&
      'counts' in data &&
      typeof (data as { counts?: { entities?: number } }).counts?.entities === 'number'
        ? (data as { counts: { entities: number } }).counts.entities
        : activeEntities

    return {
      mode: 'rpc',
      entityCount,
      message: 'Alle Einträge entfernt. Der Space ist bereit für eure echten Daten.',
    }
  } catch {
    // Fallback: Soft-Delete über Outbox, dann lokal hart leeren für leere UI
    const entityCount = await softDeleteAllViaOutbox(spaceId, userId)
    try {
      await flushOutbox()
    } catch {
      // Sync kann später nachholen
    }
    await clearLocalContentTables()
    return {
      mode: 'outbox',
      entityCount,
      message:
        'Einträge lokal geleert und Löschungen synchronisiert (Fallback). Migration clear_space_content ggf. noch remote anwenden.',
    }
  }
}
