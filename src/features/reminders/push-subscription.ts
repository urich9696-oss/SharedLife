import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import { getSupabaseClient } from '@/lib/supabase/client'

export type PushPermissionState = NotificationPermission | 'unsupported'

export function getPushPermissionState(): PushPermissionState {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported'
  }
  return Notification.permission
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}

export interface PushSubscribeResult {
  ok: boolean
  error?: string
  permission?: PushPermissionState
}

export async function subscribeToPush(spaceId: string, _userId: string): Promise<PushSubscribeResult> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Push-Benachrichtigungen werden auf diesem Gerät nicht unterstützt.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Benachrichtigungen wurden nicht erlaubt.', permission }
  }

  const registration = await navigator.serviceWorker.ready
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  })

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: 'Push-Subscription unvollständig.' }
  }

  const deviceId = await getOrCreateDeviceId()
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('manage-push-subscription', {
    body: {
      action: 'upsert',
      spaceId,
      deviceId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      authKey: json.keys.auth,
      userAgent: navigator.userAgent,
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  if (!data?.ok) {
    return { ok: false, error: data?.error ?? 'Subscription konnte nicht gespeichert werden.' }
  }

  return { ok: true, permission }
}

export async function unsubscribeFromPush(spaceId: string): Promise<PushSubscribeResult> {
  if (!('serviceWorker' in navigator)) {
    return { ok: false, error: 'Service Worker nicht verfügbar.' }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    const supabase = getSupabaseClient()
    const { error } = await supabase.functions.invoke('manage-push-subscription', {
      body: { action: 'revoke', spaceId, endpoint },
    })

    if (error) return { ok: false, error: error.message }
  }

  return { ok: true }
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}
