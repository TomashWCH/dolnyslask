/* ============================================================
   Service Worker – Atrakcje Dolnego Śląska PWA
   v2 - auto-update on new deploy
   ============================================================ */

const CACHE_NAME = 'dolny-slask-v3';

const PRECACHE = [
  './dolny-slask-atrakcje.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url).catch(() => {})))
    )
  );
  // Aktywuj od razu bez czekania na zamknięcie starej karty
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - zawsze sieć, bez cache
  if(url.hostname.includes('pixabay.com') ||
     url.hostname.includes('open-meteo.com') ||
     url.hostname.includes('overpass-api.de') ||
     url.hostname.includes('wikipedia.org')) {
    event.respondWith(fetch(request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Fonty i Leaflet - Cache First
  if(url.hostname.includes('fonts.googleapis.com') ||
     url.hostname.includes('fonts.gstatic.com') ||
     url.hostname.includes('unpkg.com')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // Lokalne zasoby (HTML, ikony) - Network First żeby zawsze mieć aktualną wersję
  if(url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});
