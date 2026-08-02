import { v4 as uuidv4 } from 'uuid'
import { DEMO_MODE } from '@/lib/demo'
import { db } from '@/lib/indexed-db/db'
import type { ConflictCopyRow, EntityRow, OutboxMutationRow } from '@/lib/indexed-db/schema'
import { toAppError } from '@/lib/errors/types'
import {
  listPendingMutations,
  markApplied,
  markFailed,
  markSyncing,
  resetSyncingToPending,
} from '@/features/sync/outbox'
import { getSupabaseClient } from '@/lib/supabase/client'

export interface SyncReceipt {
  mutationId: string
  resourceType: string
  resourceId: string
  version?: number
  serverRow?: Record<string, unknown>
}

export interface SyncConflict {
  mutationId: string
  resourceType: string
  resourceId: string
  serverRow: Record<string, unknown>
  localPayload: Record<string, unknown>
  clientVersion: number | null
  serverVersion: number | null
}

export interface FlushResult {
  applied: number
  conflicts: SyncConflict[]
  failed: number
  errors: string[]
}

function entityFromServerRow(row: Record<string, unknown>): EntityRow {
  return row as unknown as EntityRow
}

async function applyCanonicalRow(
  mutation: OutboxMutationRow,
  serverRow: Record<string, unknown>,
): Promise<void> {
  switch (mutation.resourceType) {
    case 'entity':
      await db.entities.put(entityFromServerRow(serverRow))
      break
    case 'checklist':
      await db.checklists.put(serverRow as never)
      break
    case 'checklist_item':
      await db.checklistItems.put(serverRow as never)
      break
    case 'budget':
      await db.budgets.put(serverRow as never)
      break
    case 'transaction':
      await db.transactions.put(serverRow as never)
      break
    default:
      break
  }
}

async function writeConflictCopy(
  mutation: OutboxMutationRow,
  conflict: SyncConflict,
): Promise<void> {
  const copy: ConflictCopyRow = {
    id: uuidv4(),
    mutationId: mutation.mutationId,
    spaceId: mutation.spaceId,
    resourceType: mutation.resourceType,
    resourceId: mutation.resourceId,
    clientVersion: conflict.clientVersion,
    serverVersion: conflict.serverVersion,
    clientPayload: conflict.localPayload,
    serverPayload: conflict.serverRow,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  }
  await db.conflictCopies.put(copy)
}

async function syncSingleMutation(mutation: OutboxMutationRow): Promise<{
  ok: boolean
  conflict?: SyncConflict
  error?: string
  retryable?: boolean
}> {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw toAppError('auth', 'NOT_AUTHENTICATED', 'Nicht angemeldet', { retryable: false })
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${supabaseUrl}/functions/v1/sync-mutations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ mutation }),
  })

  if (!response.ok) {
    const text = await response.text()
    let message = text || `HTTP ${response.status}`
    let retryable = response.status === 409 || response.status >= 500
    try {
      const json = JSON.parse(text) as {
        error?: string
        message?: string
        retryable?: boolean
      }
      message = json.error ?? json.message ?? message
      if (json.retryable) retryable = true
    } catch {
      // keep raw text
    }
    return { ok: false, error: message, retryable }
  }

  const result = (await response.json()) as {
    ok?: boolean
    receipt?: SyncReceipt
    conflict?: boolean
    serverRow?: Record<string, unknown>
    localPayload?: Record<string, unknown>
    clientVersion?: number | null
    serverVersion?: number | null
  }

  if (result.conflict && result.serverRow) {
    return {
      ok: false,
      conflict: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        serverRow: result.serverRow,
        localPayload: result.localPayload ?? mutation.payload,
        clientVersion: result.clientVersion ?? mutation.expectedVersion,
        serverVersion: result.serverVersion ?? null,
      },
    }
  }

  if (result.ok && result.receipt?.serverRow) {
    await applyCanonicalRow(mutation, result.receipt.serverRow)
  } else if (result.ok && result.receipt && mutation.resourceType === 'entity') {
    // Receipt without full row – keep optimistic local version
  }

  return { ok: true }
}

export async function flushOutbox(): Promise<FlushResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw toAppError('network', 'OFFLINE', 'Offline – Synchronisation nicht möglich', {
      retryable: true,
    })
  }

  await resetSyncingToPending()
  const pending = await listPendingMutations()

  const result: FlushResult = {
    applied: 0,
    conflicts: [],
    failed: 0,
    errors: [],
  }

  // Demo: lokale Daten bleiben kanonisch, Outbox wird als angewendet markiert.
  if (DEMO_MODE) {
    for (const mutation of pending) {
      await markApplied(mutation.mutationId)
      result.applied += 1
    }
    await db.syncMeta.put({ key: 'lastSyncAt', value: new Date().toISOString() })
    return result
  }

  const retryableIds: string[] = []

  for (const mutation of pending) {
    await markSyncing(mutation.mutationId)
    try {
      const outcome = await syncSingleMutation(mutation)
      if (outcome.conflict) {
        await writeConflictCopy(mutation, outcome.conflict)
        await markFailed(mutation.mutationId, 'Versionskonflikt')
        result.conflicts.push(outcome.conflict)
        result.failed += 1
        continue
      }
      if (!outcome.ok) {
        if (outcome.retryable) {
          retryableIds.push(mutation.mutationId)
          await db.outbox.update(mutation.mutationId, {
            status: 'pending',
            lastError: outcome.error ?? 'Retry',
            nextRetryAt: null,
            lastAttemptAt: new Date().toISOString(),
          })
        } else {
          await markFailed(mutation.mutationId, outcome.error ?? 'Unbekannter Fehler')
        }
        result.failed += 1
        result.errors.push(outcome.error ?? 'Unbekannter Fehler')
        continue
      }
      await markApplied(mutation.mutationId)
      result.applied += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Synchronisation fehlgeschlagen'
      await markFailed(mutation.mutationId, message)
      result.failed += 1
      result.errors.push(message)
    }
  }

  // Sofort nochmal: Details/Items, die auf Entity-Create gewartet haben
  for (const mutationId of retryableIds) {
    const mutation = await db.outbox.get(mutationId)
    if (!mutation || (mutation.status !== 'pending' && mutation.status !== 'failed')) continue
    await markSyncing(mutation.mutationId)
    try {
      const outcome = await syncSingleMutation(mutation)
      if (outcome.ok) {
        await markApplied(mutation.mutationId)
        result.applied += 1
        result.failed = Math.max(0, result.failed - 1)
      } else {
        await markFailed(mutation.mutationId, outcome.error ?? 'Unbekannter Fehler')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Synchronisation fehlgeschlagen'
      await markFailed(mutation.mutationId, message)
    }
  }

  if (result.applied > 0) {
    await db.syncMeta.put({ key: 'lastSyncAt', value: new Date().toISOString() })
  }

  return result
}

export async function getLastSyncAt(): Promise<Date | null> {
  const row = await db.syncMeta.get('lastSyncAt')
  return row ? new Date(row.value) : null
}

export async function listUnresolvedConflicts(): Promise<ConflictCopyRow[]> {
  return db.conflictCopies.filter((c) => !c.resolvedAt).toArray()
}

async function applyServerPayload(
  resourceType: ConflictCopyRow['resourceType'],
  serverPayload: Record<string, unknown>,
): Promise<void> {
  switch (resourceType) {
    case 'entity':
      await db.entities.put(serverPayload as unknown as EntityRow)
      break
    case 'checklist':
      await db.checklists.put(serverPayload as never)
      break
    case 'checklist_item':
      await db.checklistItems.put(serverPayload as never)
      break
    case 'budget':
      await db.budgets.put(serverPayload as never)
      break
    case 'transaction':
      await db.transactions.put(serverPayload as never)
      break
    case 'entity_detail':
      await db.entityDetails.put(serverPayload as never)
      break
    case 'note':
      await db.notes.put(serverPayload as never)
      break
    case 'reminder':
      await db.reminders.put(serverPayload as never)
      break
    case 'entity_link':
      await db.entityLinks.put(serverPayload as never)
      break
    case 'location':
      await db.locations.put(serverPayload as never)
      break
    default:
      break
  }
}

/** Accept server version and discard local pending mutation. */
export async function resolveConflictKeepServer(conflictId: string): Promise<void> {
  const conflict = await db.conflictCopies.get(conflictId)
  if (!conflict || conflict.resolvedAt) return

  await applyServerPayload(conflict.resourceType, conflict.serverPayload)
  await db.outbox.delete(conflict.mutationId)
  await db.conflictCopies.update(conflictId, { resolvedAt: new Date().toISOString() })
}

/** Keep local changes and re-queue mutation with updated expected version. */
export async function resolveConflictKeepLocal(conflictId: string): Promise<void> {
  const conflict = await db.conflictCopies.get(conflictId)
  if (!conflict || conflict.resolvedAt) return

  if (conflict.resourceType === 'entity') {
    const existing = await db.entities.get(conflict.resourceId)
    if (existing) {
      const merged = { ...existing, ...(conflict.clientPayload as Partial<EntityRow>) }
      await db.entities.put({
        ...merged,
        version: (conflict.serverVersion ?? existing.version) + 1,
        updated_at: new Date().toISOString(),
      })
    }
  }

  const mutation = await db.outbox.get(conflict.mutationId)
  if (mutation) {
    await db.outbox.update(conflict.mutationId, {
      status: 'pending',
      expectedVersion: conflict.serverVersion,
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
    })
  }

  await db.conflictCopies.update(conflictId, { resolvedAt: new Date().toISOString() })
}
