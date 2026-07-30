import { db } from '@/lib/indexed-db/db'

const DEVICE_META_KEY = 'deviceId'

const USER_DATA_TABLES = [
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
  'outbox',
  'uploadQueue',
  'conflictCopies',
  'localMediaBlobs',
] as const

/** Wipes all private mirrored data on logout. Preserves device id for re-registration. */
export async function clearUserData(): Promise<void> {
  const deviceMeta = await db.syncMeta.get(DEVICE_META_KEY)

  await db.transaction('rw', [...USER_DATA_TABLES, 'syncMeta'], async () => {
    for (const tableName of USER_DATA_TABLES) {
      await db.table(tableName).clear()
    }
    await db.syncMeta.clear()
    if (deviceMeta) {
      await db.syncMeta.put(deviceMeta)
    }
  })
}
