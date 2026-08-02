import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ConflictCopyRow } from '@/lib/indexed-db/schema'
import { toUserMessage } from '@/lib/errors/to-user-message'
import { isAppError } from '@/lib/errors/types'
import { countPendingMutations } from '@/features/sync/outbox'
import {
  flushOutbox,
  getLastSyncAt,
  listUnresolvedConflicts,
} from '@/features/sync/sync-engine'
import {
  registerFlushHandler,
  startSyncTriggers,
  stopSyncTriggers,
} from '@/features/sync/sync-triggers'
import { subscribeToSpaceChanges, unsubscribeFromSpaceChanges } from '@/features/sync/realtime'
import { pullSpaceIntoDexie } from '@/features/sync/pull-space'
import { invalidateSpaceQueries } from '@/features/sync/invalidate-space-queries'
import { ensureRemoteDevice } from '@/features/sync/ensure-device'
import { useAuth } from '@/features/auth/AuthProvider'
import { DEMO_MODE } from '@/lib/demo'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncContextValue {
  status: SyncStatus
  online: boolean
  pendingCount: number
  syncing: boolean
  conflicts: ConflictCopyRow[]
  lastSyncAt: Date | null
  lastSyncedAt: Date | null
  lastError: string | null
  flushNow: () => Promise<void>
  triggerSync: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

async function refreshCounts(
  setPendingCount: (n: number) => void,
  setConflicts: (c: ConflictCopyRow[]) => void,
  setLastSyncAt: (d: Date | null) => void,
): Promise<void> {
  const [pending, conflicts, last] = await Promise.all([
    countPendingMutations(),
    listUnresolvedConflicts(),
    getLastSyncAt(),
  ])
  setPendingCount(pending)
  setConflicts(conflicts)
  setLastSyncAt(last)
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { session, spaceId } = useAuth()
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [conflicts, setConflicts] = useState<ConflictCopyRow[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const syncInFlight = useRef<Promise<void> | null>(null)

  const syncing = status === 'syncing'

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => {
      setOnline(false)
      setStatus('offline')
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    void refreshCounts(setPendingCount, setConflicts, setLastSyncAt)
  }, [])

  const runSyncCycle = useCallback(
    async (opts?: { pull?: boolean }) => {
      if (!session) return
      if (!online) {
        setStatus('offline')
        return
      }
      if (syncInFlight.current) {
        await syncInFlight.current
        return
      }

      const shouldPull = opts?.pull !== false
      const cycle = (async () => {
        setStatus('syncing')
        setLastError(null)
        try {
          if (!DEMO_MODE && spaceId) {
            await ensureRemoteDevice(spaceId, session.userId)
            if (shouldPull) {
              await pullSpaceIntoDexie(spaceId)
              invalidateSpaceQueries(queryClient, spaceId)
            }
          }
          const result = await flushOutbox()
          await refreshCounts(setPendingCount, setConflicts, setLastSyncAt)
          if (result.failed > 0 && result.applied === 0) {
            setStatus('error')
            setLastError(result.errors[0] ?? 'Synchronisation fehlgeschlagen')
          } else if (result.conflicts.length > 0) {
            setStatus('error')
            setLastError('Versionskonflikte müssen aufgelöst werden')
          } else {
            setStatus('idle')
          }
        } catch (err) {
          if (isAppError(err) && err.code === 'OFFLINE') {
            setStatus('offline')
          } else {
            setStatus('error')
            setLastError(toUserMessage(err))
          }
        } finally {
          void refreshCounts(setPendingCount, setConflicts, setLastSyncAt)
        }
      })()

      syncInFlight.current = cycle
      try {
        await cycle
      } finally {
        if (syncInFlight.current === cycle) syncInFlight.current = null
      }
    },
    [session, online, spaceId, queryClient],
  )

  const flushNow = useCallback(async () => {
    await runSyncCycle({ pull: true })
  }, [runSyncCycle])

  useEffect(() => {
    registerFlushHandler(() => runSyncCycle({ pull: true }))
    startSyncTriggers()
    return () => stopSyncTriggers()
  }, [runSyncCycle])

  useEffect(() => {
    if (!spaceId || !session) {
      unsubscribeFromSpaceChanges()
      return
    }
    subscribeToSpaceChanges(spaceId, queryClient)
    return () => unsubscribeFromSpaceChanges()
  }, [spaceId, session, queryClient])

  useEffect(() => {
    if (!session || !spaceId || !online) return

    let cancelled = false

    void (async () => {
      if (cancelled) return
      await runSyncCycle({ pull: true })
    })()

    return () => {
      cancelled = true
    }
  }, [session, spaceId, online]) // eslint-disable-line react-hooks/exhaustive-deps -- hydrate + flush on login/online

  const value = useMemo<SyncContextValue>(
    () => ({
      status: !online ? 'offline' : status,
      online,
      pendingCount,
      syncing,
      conflicts,
      lastSyncAt,
      lastSyncedAt: lastSyncAt,
      lastError,
      flushNow,
      triggerSync: flushNow,
    }),
    [
      status,
      online,
      pendingCount,
      syncing,
      conflicts,
      lastSyncAt,
      lastError,
      flushNow,
    ],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}

export function useSyncStatus(): SyncStatus {
  return useSync().status
}
