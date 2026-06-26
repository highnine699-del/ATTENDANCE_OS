const CACHE_NAME = 'attendance-os-v2';
const ASSETS = [
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
    '/js/toast.js',
    '/js/icons.js',
    '/js/data-initial.js',
    '/js/modules/dashboard.js',
    '/js/modules/courses.js',
    '/js/modules/calculator.js',
    '/js/modules/sync.js',
    '/js/modules/settings.js',
    '/js/modules/analytics.js',
    '/manifest.json'
];

self.addEventListener('install', e =>
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
);

self.addEventListener('fetch', e => {
    // Network-first for API calls, cache-first for assets
    if (e.request.url.includes('att2.lmu.edu.ng')) return;
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
            if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            }
            return res;
        }))
    );
});

self.addEventListener('activate', e =>
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    )
);
