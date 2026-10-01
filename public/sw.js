// Service worker sederhana: file app disimpan supaya halaman tetap terbuka tanpa sinyal.
// Network-first: selalu ambil versi terbaru saat online, pakai salinan tersimpan saat offline.
// Data cuaca disimpan terpisah oleh app (localStorage); API & tile peta tidak lewat sini.
const CACHE = 'cuaca-dieng-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = (await cache.match(req)) || (req.mode === 'navigate' ? await cache.match('./') : undefined);
        if (hit) return hit;
        throw err;
      }
    })(),
  );
});
