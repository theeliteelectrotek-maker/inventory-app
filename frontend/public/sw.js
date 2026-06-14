const CACHE_NAME = 'tee-erp-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event: cache initial shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old service worker cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Stale-While-Revalidate caching for static assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass caching for API and Socket.IO calls
  if (requestUrl.pathname.startsWith('/api') || requestUrl.pathname.startsWith('/socket.io')) {
    return;
  }

  // Handle SPA navigation requests: serve /index.html from cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cachedIndex) => {
        return cachedIndex || fetch(event.request);
      })
    );
    return;
  }

  // Caching strategy: Stale-While-Revalidate for static files
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache successful GET requests
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET' &&
          (requestUrl.origin === self.location.origin)
        ) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Silently swallow fetch errors when offline for asset requests
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Future Firebase Cloud Messaging (FCM) push notification listener structure
self.addEventListener('push', (event) => {
  let data = { title: 'New Notification', body: 'You have a new message.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Notification', body: event.data.text() };
    }
  }
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    data: data.data || {}
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
