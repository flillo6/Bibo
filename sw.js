/**
 * BIBO - Service Worker (Offline Engine & PWA Cache)
 * 
 * Features:
 * - Cache-First strategy with Stale-While-Revalidate for static assets
 * - Instant offline boot for student deep work without internet
 * - Automatic cache cleanup on version updates
 */

const CACHE_NAME = 'bibo-pwa-v3.1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=3.1',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/config.js',
  './js/i18n.js',
  './js/app.js?v=3.1',
  './js/audio/AudioSynthesizer.js',
  './js/engine/SpriteAnimation.js',
  './js/engine/PetManager.js',
  './js/engine/StudyTimer.js',
  './js/knowledge/StarterPack.js',
  './js/knowledge/KnowledgeEngine.js',
  './js/storage/ProfileStorage.js',
  './assets/sprites/baby/idle_base.png',
  './assets/sprites/baby/idle_affamato.png',
  './assets/sprites/baby/idle_stanco.png',
  './assets/sprites/baby/idle_sporco.png',
  './assets/sprites/baby/eat_biscuit.png',
  './assets/sprites/baby/clean_sponge.png',
  './assets/sprites/baby/sleep.png',
  './assets/sprites/baby/click_annoyed.png',
  './assets/sprites/baby/victory_hop.png'
];

// Install: Pre-cache all core application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets...');
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
            console.log('[ServiceWorker] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets, fallback to cache offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension and non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached asset immediately if found, then update in background
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
        .catch(() => {
          // If offline and request is an HTML navigation, return cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
