// İnternetsiz çalışma: önce ağdan dener, internet yoksa son kaydedilen kopyayı verir.
// Bu sayede güncellemeler hemen gelir, spor salonunda çekmese de uygulama açılır.
const CACHE = 'owl-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./')))
  );
});
