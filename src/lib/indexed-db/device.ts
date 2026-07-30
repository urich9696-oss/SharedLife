import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'

const DEVICE_META_KEY = 'deviceId'

function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Mac/i.test(ua)) return 'macos'
  if (/Win/i.test(ua)) return 'windows'
  if (/Linux/i.test(ua)) return 'linux'
  return 'web'
}

export async function getOrCreateDeviceId(): Promise<string> {
  const meta = await db.syncMeta.get(DEVICE_META_KEY)
  if (meta?.value) return meta.value

  const id = uuidv4()
  const now = new Date().toISOString()

  await db.transaction('rw', [db.syncMeta, db.device], async () => {
    await db.syncMeta.put({ key: DEVICE_META_KEY, value: id })
    await db.device.put({
      id,
      label: 'Unbenanntes Gerät',
      platform: detectPlatform(),
      createdAt: now,
    })
  })

  return id
}

export async function getDeviceId(): Promise<string | null> {
  const meta = await db.syncMeta.get(DEVICE_META_KEY)
  return meta?.value ?? null
}
