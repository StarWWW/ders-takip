/* Servis çalışanı: uygulamanın internetsiz açılmasını sağlar.
 * - Kendi dosyaları: önce ağ (4 sn zaman aşımı), olmazsa önbellek → güncellemeler hemen gelir, internetsizken son sürüm açılır.
 * - Google Fonts: önce önbellek (yazı tipleri değişmez).
 * - Hesapların şifreli veri dosyaları (veri/) açıldıkça önbelleğe girer.
 * - GitHub API (eşitleme) hiçbir zaman önbelleğe alınmaz.
 */
const CACHE = 'ders-takip-v2';
const FONT_CACHE = 'ders-takip-fontlar-v1';
const PRECACHE = [
  './', 'index.html', 'style.css', 'tema.js', 'sabitler.js', 'kilit.js', 'core.js', 'views.js', 'esitle.js', 'app.js',
  'hesaplar.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];
const NETWORK_TIMEOUT = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Tek bir dosya eksik olsa bile kurulum başarısız olmasın
    await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [CACHE, FONT_CACHE];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('zaman aşımı')), ms);
    promise.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function networkFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT);
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      // Sürüm parametresi (?v=) değişince eski kopyayı da temizle
      event.waitUntil(cache.delete(request, { ignoreSearch: true }).then(() => cache.put(request, copy)));
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('index.html', { ignoreSearch: true });
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return; // GitHub API vb. dokunma
  if (url.pathname.includes('/ozel/')) return; // yerel geliştirme verisi önbelleğe girmesin

  event.respondWith(networkFirst(event));
});
