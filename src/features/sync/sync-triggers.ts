type FlushHandler = () => Promise<void>

let flushHandler: FlushHandler | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let started = false

const DEFAULT_INTERVAL_MS = 30_000

export function registerFlushHandler(handler: FlushHandler): void {
  flushHandler = handler
}

export function startSyncTriggers(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (started || typeof window === 'undefined') return
  started = true

  const trigger = () => {
    if (!flushHandler || !navigator.onLine) return
    void flushHandler().catch(() => {
      // errors surfaced via SyncProvider
    })
  }

  window.addEventListener('online', trigger)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') trigger()
  })
  window.addEventListener('focus', trigger)

  intervalId = setInterval(trigger, intervalMs)
}

export function stopSyncTriggers(): void {
  if (!started || typeof window === 'undefined') return
  started = false

  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function isSyncTriggersStarted(): boolean {
  return started
}
