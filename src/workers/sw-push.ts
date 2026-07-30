const sw = self as unknown as ServiceWorkerGlobalScope

export function handlePushEvent(event: PushEvent): void {
  const data = event.data?.json() as
    | { title?: string; body?: string; url?: string; tag?: string }
    | undefined

  const title = data?.title ?? 'SharedLife'
  const options: NotificationOptions = {
    body: data?.body ?? 'Neue Erinnerung',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data?.tag,
    data: { url: data?.url ?? '/' },
  }

  event.waitUntil(sw.registration.showNotification(title, options))
}

export function handleNotificationClick(event: NotificationEvent): void {
  event.notification.close()
  const url = (event.notification.data?.url as string | undefined) ?? '/'

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients: readonly Client[]) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(sw.location.origin)) {
          void client.focus()
          if ('navigate' in client) void (client as WindowClient).navigate(url)
          return
        }
      }
      return sw.clients.openWindow(url)
    }),
  )
}
