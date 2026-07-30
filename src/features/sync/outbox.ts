import type Dexie from 'dexie'
import { db, type SharedLifeDB } from '@/lib/indexed-db/db'
import type { OutboxMutationRow } from '@/lib/indexed-db/schema'
import { outboxMutationSchema, type OutboxMutationInput } from '@/lib/validation/mutation'

const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS = 60_000

export function computeBackoffDelayMs(attemptCount: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attemptCount)
  const jitter = Math.random() * exp * 0.25
  return Math.floor(exp + jitter)
}

interface EnqueueOptions {
  tx?: SharedLifeDB
}

export async function enqueueMutation(
  input: OutboxMutationInput,
  options?: EnqueueOptions,
): Promise<OutboxMutationRow> {
  const parsed = outboxMutationSchema.parse(input)
  const database = options?.tx ?? db

  const row: OutboxMutationRow = {
    ...parsed,
    status: 'pending',
    attemptCount: 0,
    lastAttemptAt: null,
    nextRetryAt: null,
    lastError: null,
  }

  await database.outbox.put(row)
  return row
}

export async function listPendingMutations(now = new Date()): Promise<OutboxMutationRow[]> {
  const nowIso = now.toISOString()
  const pending = await db.outbox.where('status').equals('pending').toArray()
  const failed = await db.outbox.where('status').equals('failed').toArray()

  return [...pending, ...failed]
    .filter((m) => !m.nextRetryAt || m.nextRetryAt <= nowIso)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function countPendingMutations(): Promise<number> {
  const rows = await db.outbox
    .where('status')
    .anyOf(['pending', 'failed', 'syncing'])
    .toArray()
  return rows.length
}

export async function markSyncing(mutationId: string): Promise<void> {
  await db.outbox.update(mutationId, {
    status: 'syncing',
    lastAttemptAt: new Date().toISOString(),
  })
}

export async function markApplied(mutationId: string): Promise<void> {
  await db.outbox.delete(mutationId)
}

export async function markFailed(mutationId: string, error: string): Promise<void> {
  const existing = await db.outbox.get(mutationId)
  if (!existing) return

  const attemptCount = existing.attemptCount + 1
  const delay = computeBackoffDelayMs(attemptCount)
  const nextRetryAt = new Date(Date.now() + delay).toISOString()

  await db.outbox.update(mutationId, {
    status: 'failed',
    attemptCount,
    lastError: error,
    nextRetryAt,
    lastAttemptAt: new Date().toISOString(),
  })
}

export async function resetSyncingToPending(): Promise<void> {
  const syncing = await db.outbox.where('status').equals('syncing').toArray()
  await db.transaction('rw', db.outbox, async () => {
    for (const row of syncing) {
      await db.outbox.update(row.mutationId, { status: 'pending' })
    }
  })
}

export async function hasPendingOutboxForResource(
  resourceType: string,
  resourceId: string,
): Promise<boolean> {
  const rows = await db.outbox
    .where('[resourceType+resourceId]')
    .equals([resourceType, resourceId])
    .toArray()
  return rows.some((r) => r.status === 'pending' || r.status === 'syncing' || r.status === 'failed')
}

export type { Dexie }
