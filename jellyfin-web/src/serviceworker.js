/**
 * CapIAu Streaming — Service Worker
 * 
 * Estratégia de cache:
 * - App Shell (HTML, CSS, JS): Cache-first — carrega offline, atualiza em background
 * - API requests (Jellyfin): Network-first — sempre tenta rede, fallback cache
 * - Imagens (posters, backdrops): Cache-first com TTL de 7 dias
 * 
 * Isso garante que o app abre instantaneamente no celular, 
 * mesmo com conexão instável.
 */

const CACHE_NAME = 'capiau-v1';
const STATIC_CACHE = 'capiau-static-v1';
const IMAGE_CACHE = 'capiau-images-v1';
const API_CACHE = 'capiau-api-v1';

// App Shell resources to pre-cache
const APP_SHELL = [
    '/',
    '/index.html'
];

// Max items in image cache (prevent unlimited growth)
const MAX_IMAGE_CACHE = 200;

// Image cache TTL: 7 days
const IMAGE_TTL = 7 * 24 * 60 * 60 * 1000;

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('install', (event) => {
    console.log('[CapIAu SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => {
                console.log('[CapIAu SW] App Shell cached');
                /* eslint-disable-next-line no-restricted-globals */
                return self.skipWaiting();
            })
            .catch(err => {
                console.warn('[CapIAu SW] Pre-cache failed (non-fatal):', err);
                /* eslint-disable-next-line no-restricted-globals */
                return self.skipWaiting();
            })
    );
});

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('activate', (event) => {
    console.log('[CapIAu SW] Activating...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== STATIC_CACHE && key !== IMAGE_CACHE && key !== API_CACHE)
                    .map(key => {
                        console.log('[CapIAu SW] Removing old cache:', key);
                        return caches.delete(key);
                    })
            );
        })
        /* eslint-disable-next-line no-restricted-globals */
        .then(() => self.clients.claim())
    );
});

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip WebSocket and extension requests
    if (url.protocol === 'ws:' || url.protocol === 'wss:') return;
    if (url.protocol === 'chrome-extension:') return;

    // === Strategy: Image requests → Cache-first ===
    if (isImageRequest(url)) {
        event.respondWith(cacheFirstWithTTL(event.request, IMAGE_CACHE, IMAGE_TTL));
        return;
    }

    // === Strategy: API requests → Network-first ===
    if (isApiRequest(url)) {
        event.respondWith(networkFirst(event.request, API_CACHE));
        return;
    }

    // === Strategy: Static assets → Cache-first, update in background ===
    if (isStaticAsset(url)) {
        event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
        return;
    }

    // === Default: Network with cache fallback ===
    event.respondWith(networkFirst(event.request, STATIC_CACHE));
});

// --- Notification handling (preserved from original) ---

function getApiClient(serverId) {
    return Promise.resolve(window.connectionManager.getApiClient(serverId));
}

function executeAction(action, data, serverId) {
    return getApiClient(serverId).then(function (apiClient) {
        switch (action) {
            case 'cancel-install':
                return apiClient.cancelPackageInstallation(data.id);
            case 'restart':
                return apiClient.restartServer();
            default:
                /* eslint-disable-next-line no-restricted-globals */
                clients.openWindow('/');
                return Promise.resolve();
        }
    });
}

/* eslint-disable-next-line no-restricted-globals -- self is valid in a serviceworker environment */
self.addEventListener('notificationclick', function (event) {
    const notification = event.notification;
    notification.close();

    const data = notification.data;
    const serverId = data.serverId;
    const action = event.action;

    if (!action) {
        /* eslint-disable-next-line no-restricted-globals */
        clients.openWindow('/');
        event.waitUntil(Promise.resolve());
        return;
    }

    event.waitUntil(executeAction(action, data, serverId));
}, false);

// ============================================================
// Cache Strategy Helpers
// ============================================================

/**
 * Cache-first with TTL — for images (posters, backdrops)
 */
async function cacheFirstWithTTL(request, cacheName, ttl) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        // Check TTL via custom header
        const cachedDate = cached.headers.get('sw-cached-at');
        if (cachedDate && (Date.now() - parseInt(cachedDate)) < ttl) {
            return cached;
        }
    }

    // Fetch from network
    try {
        const response = await fetch(request);
        if (response.ok) {
            // Clone and add timestamp header
            const headers = new Headers(response.headers);
            headers.set('sw-cached-at', Date.now().toString());
            const timedResponse = new Response(await response.clone().blob(), {
                status: response.status,
                statusText: response.statusText,
                headers: headers
            });
            cache.put(request, timedResponse);

            // Prune old entries if needed
            pruneCache(cacheName, MAX_IMAGE_CACHE);
        }
        return response;
    } catch (err) {
        // Return stale cache if network fails
        if (cached) return cached;
        throw err;
    }
}

/**
 * Network-first — for API requests
 */
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw err;
    }
}

/**
 * Stale-while-revalidate — for static assets (JS, CSS)
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    // Start network fetch in background
    const fetchPromise = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);

    // Return cached immediately, or wait for network
    return cached || fetchPromise;
}

// --- URL Classification Helpers ---

function isImageRequest(url) {
    return url.pathname.includes('/Images/') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.jpg') ||
           url.pathname.endsWith('.webp');
}

function isApiRequest(url) {
    return url.pathname.startsWith('/Items') ||
           url.pathname.startsWith('/Users') ||
           url.pathname.startsWith('/Shows') ||
           url.pathname.startsWith('/Library') ||
           url.pathname.includes('/api/');
}

function isStaticAsset(url) {
    return url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.woff2') ||
           url.pathname.endsWith('.woff') ||
           url.pathname.endsWith('.html');
}

/**
 * Remove oldest entries if cache exceeds max size
 */
async function pruneCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        // Delete oldest entries (first in = oldest)
        const toDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(toDelete.map(key => cache.delete(key)));
    }
}
