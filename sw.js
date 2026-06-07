/* ============================================================
   Service Worker – Atrakcje Dolnego Śląska PWA
   Strategia: Cache First dla zasobów lokalnych,
              Network First dla zewnętrznych obrazów
   ============================================================ */

const CACHE_NAME = 'dolny-slask-v1';

// Zasoby do cache'owania przy instalacji
const PRECACHE = [
  './dolny-slask-atrakcje.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700&display=swap'
];

// ── Instalacja: pre-cache lokalnych zasobów ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Dodaj po jednym, żeby błąd jednego nie blokował reszty
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// ── Aktywacja: usuń stare cache'e ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: obsługa żądań ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Zewnętrzne obrazy (Wikipedia) – Network First, fallback do cache
  if (url.hostname.includes('wikipedia.org') || url.hostname.includes('wikimedia.org')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Fonty Google – Cache First
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // Lokalne zasoby – Cache First
  if (url.origin === self.location.origin || request.url.startsWith('./')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }
});
