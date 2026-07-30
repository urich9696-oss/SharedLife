import { DEMO_MODE } from '@/lib/demo'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import { db } from '@/lib/indexed-db/db'
import { getSupabaseClient } from '@/lib/supabase/client'

function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Mac/i.test(ua)) return 'macos'
  if (/Win/i.test(ua)) return 'windows'
  if (/Linux/i.test(ua)) return 'linux'
  return 'web'
}

/** Registriert das lokale Gerät in Supabase (FK für mutation_receipts). */
export async function ensureRemoteDevice(spaceId: string, userId: string): Promise<string> {
  const deviceId = await getOrCreateDeviceId()
  if (DEMO_MODE) return deviceId

  const local = await db.device.get(deviceId)
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('devices').upsert(
    {
      id: deviceId,
      space_id: spaceId,
      user_id: userId,
      label: local?.label ?? 'Unbenanntes Gerät',
      platform: local?.platform ?? detectPlatform(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      last_seen_at: new Date().toISOString(),
      push_enabled: false,
    },
    { onConflict: 'id' },
  )

  if (error) throw new Error(`Gerät konnte nicht registriert werden: ${error.message}`)
  return deviceId
}
