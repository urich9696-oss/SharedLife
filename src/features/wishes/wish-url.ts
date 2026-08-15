export interface SafeExternalUrl {
  href: string
  domain: string
}

/**
 * Normalisiert und validiert Wunsch-Links.
 * Nur http/https; fehlendes Protokoll → https://
 */
export function parseSafeExternalUrl(raw: unknown): SafeExternalUrl | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let candidate = trimmed
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname || url.hostname.includes(' ')) return null

  const domain = url.hostname.replace(/^www\./i, '')
  return { href: url.toString(), domain }
}

export function openWishLinkLabel(url: SafeExternalUrl | null): string | null {
  if (!url) return null
  return `Bei ${url.domain} öffnen`
}

/** Öffnet nur sichere http(s)-URLs in einem neuen Tab. */
export function openSafeExternalUrl(raw: unknown): boolean {
  const parsed = parseSafeExternalUrl(raw)
  if (!parsed) return false
  window.open(parsed.href, '_blank', 'noopener,noreferrer')
  return true
}
