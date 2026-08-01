import { useEffect, useState } from 'react'
import { db } from '@/lib/indexed-db/db'
import { getSupabaseClient } from '@/lib/supabase/client'

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/** Matches `{spaceId}/{mediaId}/{variant}/{filename}` */
export function parseStoragePath(storagePath: string): {
  spaceId: string
  mediaId: string
  variant: string
  filename: string
} | null {
  const parts = storagePath.split('/').filter(Boolean)
  if (parts.length < 4) return null
  const [spaceId, mediaId, variant, ...rest] = parts
  if (!spaceId || !mediaId || !variant || rest.length === 0) return null
  return { spaceId, mediaId, variant, filename: rest.join('/') }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function isBlobUrl(value: string): boolean {
  return value.startsWith('blob:')
}

function looksLikeStoragePath(value: string): boolean {
  if (!value || isHttpUrl(value) || isBlobUrl(value)) return false
  if (value.includes('\\') || value.startsWith('/') || value.startsWith('C:')) return true
  return value.includes('/') && !value.includes(' ')
}

export function isTechnicalMediaRef(value: string | null | undefined): boolean {
  if (!value) return false
  if (isHttpUrl(value) || isBlobUrl(value)) return false
  if (looksLikeStoragePath(value)) return true
  if (/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(value) && value.includes('/')) return true
  return false
}

export function humanizeMediaTitle(
  caption: string | null | undefined,
  originalFilename: string | null | undefined,
  fallback = 'Foto',
): string {
  if (caption && !isTechnicalMediaRef(caption)) return caption
  if (originalFilename && !isTechnicalMediaRef(originalFilename)) {
    return originalFilename.replace(/\.[^.]+$/, '') || fallback
  }
  return fallback
}

async function findLocalBlob(storagePath: string): Promise<Blob | null> {
  const remote = await db.localMediaBlobs.get(`remote:${storagePath}`)
  if (remote) return remote.blob

  const parsed = parseStoragePath(storagePath)
  if (!parsed) return null

  const variantKey = parsed.variant === 'thumb' ? 'thumb' : 'app'
  const byMedia = await db.localMediaBlobs.get(`${parsed.mediaId}:${variantKey}`)
  if (byMedia) return byMedia.blob

  // Fallback: any local variant for this media id
  const any = await db.localMediaBlobs.get(`${parsed.mediaId}:app`)
  return any?.blob ?? null
}

/**
 * Resolves a private storage path (or already-usable URL) into a displayable URL.
 * Prefers local IndexedDB blobs, then cached signed URLs, then createSignedUrl.
 */
export async function resolveMediaUrl(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null
  if (isBlobUrl(storagePath) || isHttpUrl(storagePath)) return storagePath

  const localBlob = await findLocalBlob(storagePath)
  if (localBlob) return URL.createObjectURL(localBlob)

  const cached = signedUrlCache.get(storagePath)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.storage.from('media').createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) return null
    signedUrlCache.set(storagePath, {
      url: data.signedUrl,
      expiresAt: Date.now() + 3_500_000,
    })
    return data.signedUrl
  } catch {
    return null
  }
}

export function clearSignedUrlCache(storagePath?: string): void {
  if (storagePath) signedUrlCache.delete(storagePath)
  else signedUrlCache.clear()
}

export function useMediaUrl(storagePath: string | undefined | null, _spaceId?: string) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!storagePath) {
      setUrl(null)
      setFailed(false)
      return
    }

    let cancelled = false
    let revoked: string | null = null

    void resolveMediaUrl(storagePath).then((resolved) => {
      if (cancelled) {
        if (resolved?.startsWith('blob:')) URL.revokeObjectURL(resolved)
        return
      }
      if (resolved?.startsWith('blob:')) revoked = resolved
      setUrl(resolved)
      setFailed(!resolved)
    })

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [storagePath])

  return { url, failed, loading: Boolean(storagePath) && !url && !failed }
}
