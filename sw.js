const CACHE = 'stella-bday-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './assets/images/walt-disney-logo.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Google Fonts — stale-while-revalidate so text renders offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Only handle same-origin requests from here on
  if (url.origin !== self.location.origin) return;

  // Videos and audio — cache on first play, serve from cache thereafter
  if (/\.(mp4|mp3|webm|ogg)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // Images — cache-first
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // Shell (HTML, CSS, JS) — network-first, fall back to cache
  e.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) ?? new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then(r => { if (r.ok) cache.put(request, r.clone()); return r; })
    .catch(() => null);
  return cached ?? (await fresh) ?? new Response('', { status: 503, statusText: 'Offline' });
}
