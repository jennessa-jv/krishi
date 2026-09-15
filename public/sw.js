const CACHE_PREFIX = 'krishi-static-';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.includes('/assets/') && !url.pathname.includes('/guides/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(`${CACHE_PREFIX}${self.registration.scope}`);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});
