/**
 * Service Worker for PWA support
 * Caches assets for offline access
 */

const CACHE_NAME = 'attendance-os-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/tokens.css',
    '/css/base.css',
    '/css/components.css',
    '/css/layout.css',
    '/js/main.js',
    '/js/state.js',
    '/js/engine.js',
    '/js/storage.js',
    '/js/utils.js',
    '/js/validator.js',
    '/js/extension-bridge.js',
    '/js/toast.js',
    '/js/icons.js',
    '/js/data-initial.js',
    '/js/modules/dashboard.js',
    '/js/modules/courses.js',
    '/js/modules/calculator.js',
    '/js/modules/sync.js',
    '/js/modules/settings.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Network-First or Stale-While-Revalidate for critical module dependencies
    if (event.request.url.includes('/js/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache with fresh version
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache-First for other assets
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
