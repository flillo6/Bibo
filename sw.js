/**
 * BIBO - Service Worker (Offline Engine & PWA Cache)
 * 
 * Features:
 * - Cache-First strategy with Stale-While-Revalidate for static assets
 * - Instant offline boot for student deep work without internet
 * - Automatic cache cleanup on version updates
 * - Native iOS & Android PWA live revalidation
 */

const CACHE_NAME = 'bibo-pwa-v7.3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=7.3',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/config.js',
  './js/i18n.js',
  './js/app.js?v=7.3',
  './js/audio/AudioSynthesizer.js',
  './js/engine/SpriteAnimation.js',
  './js/engine/PetManager.js',
  './js/engine/StudyTimer.js',
  './js/engine/MonotonicWorkerTimer.js',
  './js/knowledge/StarterPack.js',
  './js/knowledge/KnowledgeEngine.js',
  './js/network/NetworkMesh.js',
  './js/storage/ProfileStorage.js',
  './js/storage/SovereignCrypto.js',
  './js/vendor/trystero-mqtt.js',
  './js/vendor/trystero-nostr.js',
  // Baby sprites
  './assets/sprites/baby/idle_base.png',
  './assets/sprites/baby/idle_affamato.png',
  './assets/sprites/baby/idle_stanco.png',
  './assets/sprites/baby/idle_sporco.png',
  './assets/sprites/baby/eat_biscuit.png',
  './assets/sprites/baby/clean_sponge.png',
  './assets/sprites/baby/sleep.png',
  './assets/sprites/baby/click_annoyed.png',
  './assets/sprites/baby/victory_hop.png',
  // Mid sprites
  './assets/sprites/mid/idle_base.png',
  './assets/sprites/mid/idle_affamato.png',
  './assets/sprites/mid/idle_stanco.png',
  './assets/sprites/mid/idle_sporco.png',
  './assets/sprites/mid/eat_biscuit.png',
  './assets/sprites/mid/clean_sponge.png',
  './assets/sprites/mid/sleep.png',
  './assets/sprites/mid/click_annoyed.png',
  './assets/sprites/mid/victory_hop.png',
  // Adult sprites
  './assets/sprites/adult/idle_base.png',
  './assets/sprites/adult/idle_affamato.png',
  './assets/sprites/adult/idle_stanco.png',
  './assets/sprites/adult/idle_sporco.png',
  './assets/sprites/adult/eat_biscuit.png',
  './assets/sprites/adult/clean_sponge.png',
  './assets/sprites/adult/sleep.png',
  './assets/sprites/adult/click_annoyed.png',
  './assets/sprites/adult/victory_hop.png'
];

// Install: Pre-cache all core application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets for v6.0...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up legacy caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for navigation (index.html) so updates arrive instantly,
// Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation & Script requests: Network-First with Cache Fallback (guarantees instant mesh & app updates on reload)
  if (
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }) || caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // 2. Static assets: Stale-While-Revalidate (with ignoreSearch to reliably hit pre-cached sprite assets)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
