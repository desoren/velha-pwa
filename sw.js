// sw.js — v5
const CACHE = 'velha-v5';
const ROOT = '/velha-pwa/';
const ASSETS = [
  ROOT,
  ROOT + 'index.html',
  ROOT + 'manifest.webmanifest',
  ROOT + 'icons/icon-192.png',
  ROOT + 'icons/icon-512.png'
];

let pending = [];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (new URL(req.url).origin === location.origin) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') return cache.match(ROOT + 'index.html');
      return new Response('Offline', { status: 200, headers: { 'Content-Type': 'text/plain' }});
    }
  })());
});

self.addEventListener('message', (e) => {
  const { type, payload } = e.data || {};
  if (type === 'QUEUE_ACTION') {
    pending.push(payload || { at: Date.now() });
  }
});

self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil((async () => {
      if (pending.length && self.registration && self.registration.showNotification) {
        await self.registration.showNotification('Sincronizado', {
          body: `Ações processadas: ${pending.length}`,
          icon: ROOT + 'icons/icon-192.png'
        });
      }
      pending = [];
    })());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-assets') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(ASSETS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res && res.ok) await cache.put(url, res.clone());
        } catch (_) { /* offline */ }
      }));
    })());
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Notificação', body: 'Exemplo de push' };
  event.waitUntil(self.registration.showNotification(data.title || 'Notificação', {
    body: data.body || 'Mensagem recebida',
    icon: ROOT + 'icons/icon-192.png'
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const url = ROOT;
    for (const c of all) { if (c.url.includes(url)) { return c.focus(); } }
    return clients.openWindow(url);
  })());
});
