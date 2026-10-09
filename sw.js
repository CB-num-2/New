const CACHE_NAME = 'chromebook-pwa-v1';

// Every single file your app needs to run must be listed here
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webjson'
];

// 1. Install Event: Save files into the local Chromebook storage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Chromebook PWA: Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting()) // Force immediate activation
  );
});

// 2. Activate Event: Clear old cache configurations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Chromebook PWA: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intercepts network calls to provide 100% offline access
// Chrome requires a legitimate response logic here to pass installation checks!
self.addEventListener('fetch', (event) => {
  // Only intercept standard GET requests (ignores chrome extensions, etc.)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return file from local Chromebook cache immediately
        return cachedResponse;
      }

      // Fallback to the web if the asset isn't cached yet
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Dynamically add newly requested assets to cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline Fallback: If network fails and file isn't in cache, return the main index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
