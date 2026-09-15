// Web Push for Roamie, loaded into the generated service worker (vite.config.ts → workbox.importScripts).
// Messages come from the push-send Edge Function: { title, body, url, tag, lang }.

self.addEventListener('push', (event) => {
  let message = {}
  try {
    message = event.data ? event.data.json() : {}
  } catch {
    message = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(message.title || 'Roamie', {
      body: message.body || '',
      tag: message.tag,
      renotify: Boolean(message.tag),
      lang: message.lang,
      icon: '/pwa-192x192.png',
      data: { url: message.url || '/trips' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/trips', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        if ('navigate' in open) await open.navigate(target).catch(() => undefined)
        return
      }
      await self.clients.openWindow(target)
    })(),
  )
})
