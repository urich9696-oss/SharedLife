/* global self, clients */
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {}
  const title = data.title ?? 'SharedLife'
  const options = {
    body: data.body ?? 'Neue Erinnerung',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          void client.focus()
          if ('navigate' in client) void client.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    }),
  )
})
