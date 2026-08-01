const RELOAD_FLAG = 'sharedlife:chunk-reload'

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message)
  )
}

async function clearAppCaches(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
}

/** Soft reload once; on repeat failure clear SW/caches then reload. */
export async function recoverFromStaleChunk(): Promise<void> {
  const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'

  if (!alreadyReloaded) {
    sessionStorage.setItem(RELOAD_FLAG, '1')
    window.location.reload()
    return
  }

  sessionStorage.removeItem(RELOAD_FLAG)
  try {
    await clearAppCaches()
  } catch {
    // ignore cleanup failures — reload is still the best next step
  }
  window.location.reload()
}

export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(RELOAD_FLAG)
}
