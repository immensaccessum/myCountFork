const CACHE = 'mycount-v2';

/** Only cache immutable hashed build assets and images — never HTML. */
function isCacheableAsset(pathname) {
  return (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/cimg/') ||
    pathname === '/favicon.ico' ||
    pathname === '/og-card.png' ||
    pathname === '/manifest.webmanifest'
  );
}

function isHtmlNavigation(pathname) {
  return (
    pathname === '/' ||
    pathname.startsWith('/ru') ||
    pathname.startsWith('/en') ||
    pathname.startsWith('/do/') ||
    pathname.startsWith('/until/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/s/') || url.pathname.startsWith('/og/')) return;

  // HTML: always network-first so deploys and landing presets stay fresh.
  if (request.mode === 'navigate' || isHtmlNavigation(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request)),
    );
    return;
  }

  // Hashed assets: cache-first for offline speed.
  if (isCacheableAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (!response.ok) return response;
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
