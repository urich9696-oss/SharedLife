import { useEffect, useState } from 'react'
import { db } from '@/lib/indexed-db/db'
import { getSupabaseClient } from '@/lib/supabase/client'

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

export async function resolveMediaUrl(storagePath: string): Promise<string | null> {
  const localKey = `remote:${storagePath}`
  const local = await db.localMediaBlobs.get(localKey)
  if (local) return URL.createObjectURL(local.blob)

  const cached = signedUrlCache.get(storagePath)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.storage.from('media').createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) return null
    signedUrlCache.set(storagePath, { url: data.signedUrl, expiresAt: Date.now() + 3_500_000 })
    return data.signedUrl
  } catch {
    return null
  }
}

export function useMediaUrl(storagePath: string | undefined, _spaceId: string) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!storagePath) {
      setUrl(null)
      return
    }
    let revoked: string | null = null
    void resolveMediaUrl(storagePath).then((resolved) => {
      if (resolved?.startsWith('blob:')) revoked = resolved
      setUrl(resolved)
    })
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [storagePath])

  return url
}
