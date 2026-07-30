import { db } from '@/lib/indexed-db/db'
import type { ActivityLogRow } from '@/lib/indexed-db/schema'

export async function listActivityLog(
  spaceId: string,
  limit = 50,
): Promise<ActivityLogRow[]> {
  const rows = await db.activityLog
    .where('[space_id+created_at]')
    .between([spaceId, ''], [spaceId, '\uffff'])
    .reverse()
    .limit(limit)
    .toArray()
  return rows
}

export async function mirrorActivityEntries(entries: ActivityLogRow[]): Promise<void> {
  if (entries.length === 0) return
  await db.activityLog.bulkPut(entries)
}
