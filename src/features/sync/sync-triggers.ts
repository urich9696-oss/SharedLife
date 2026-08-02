type SyncHandler = () => Promise<void>

let syncHandler: SyncHandler | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let started = false

/** Pull + Flush Intervall – Partner-Änderungen sollen ohne Reload ankommen. */
const DEFAULT_INTERVAL_MS = 8_000

function triggerSync(): void {
  if (!syncHandler || typeof navigator === 'undefined' || !navigator.onLine) return
  void syncHandler().catch(() => {
    // errors surfaced via SyncProvider
  })
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') triggerSync()
}

export function registerFlushHandler(handler: SyncHandler): void {
  syncHandler = handler
}

/** @deprecated Alias – Handler führt inzwischen Pull + Flush aus. */
export function registerSyncHandler(handler: SyncHandler): void {
  syncHandler = handler
}

export function startSyncTriggers(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener('online', triggerSync)
  window.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', triggerSync)

  intervalId = setInterval(triggerSync, intervalMs)
}

export function stopSyncTriggers(): void {
  if (!started || typeof window === 'undefined') return
  started = false

  window.removeEventListener('online', triggerSync)
  window.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', triggerSync)

  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function isSyncTriggersStarted(): boolean {
  return started
}
