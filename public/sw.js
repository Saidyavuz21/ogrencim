/* tofutr servis betiği: yalnızca telefon bildirimi (Web Push) ve ikon rozeti.
   Önbellekleme YOK (sayfalar her zaman ağdan gelir). Plan: docs/BILDIRIM_PLANI.md
   Push içeriği sunucuda üretilir ve kişisel bilgi içermez: { title, body, url, tag, badge } */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function setBadge(count) {
  const nav = self.navigator;
  if (!nav || typeof count !== 'number') return Promise.resolve();
  try {
    if (count > 0 && nav.setAppBadge) return nav.setAppBadge(count).catch(() => {});
    if (count <= 0 && nav.clearAppBadge) return nav.clearAppBadge().catch(() => {});
  } catch (e) {
    /* desteklenmiyor */
  }
  return Promise.resolve();
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || 'tofutr';
  const options = {
    body: data.body || 'Yeni bildirim',
    icon: '/android-chrome-192x192.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/giris' },
  };
  event.waitUntil(Promise.all([self.registration.showNotification(title, options), setBadge(data.badge)]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/giris', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.focus().then((c) => (c && 'navigate' in c ? c.navigate(target) : c)).catch(() => self.clients.openWindow(target));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
