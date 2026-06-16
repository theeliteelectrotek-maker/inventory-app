
// ─── Injected by Vite build ───────────────────────────────────────────────────
self.FIREBASE_API_KEY             = "AIzaSyCPzU2dcISR8CQJZ-ML_rqnAMbJjNeudCU";
self.FIREBASE_AUTH_DOMAIN         = "tee-inventory-manager.firebaseapp.com";
self.FIREBASE_PROJECT_ID          = "tee-inventory-manager";
self.FIREBASE_STORAGE_BUCKET      = "tee-inventory-manager.firebasestorage.app";
self.FIREBASE_MESSAGING_SENDER_ID = "65274257324";
self.FIREBASE_APP_ID              = "1:65274257324:web:370a41afa7d1c16a21e409";
// ─────────────────────────────────────────────────────────────────────────────
// firebase-messaging-sw.js
// ─────────────────────────────────────────────────────────────────────────────
// This service worker handles FCM push notifications when the app is:
//   - Closed (not running)
//   - Backgrounded (minimised, screen locked)
//   - Installed as PWA on Android/iOS home screen
//
// Vite dev-server middleware (vite.config.js) injects self.FIREBASE_* globals
// before this file is served during development.
// Vite build plugin (vite.config.js) injects them before this file in dist/.
// ─────────────────────────────────────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ─── Firebase config ──────────────────────────────────────────────────────────
// Values are injected by Vite (self.FIREBASE_* globals prepended by the plugin).
// The inline strings are the real values and act as hardcoded fallbacks.
const firebaseConfig = {
  apiKey:            self.FIREBASE_API_KEY             || 'AIzaSyCPzU2dcISR8CQJZ-ML_rqnAMbJjNeudCU',
  authDomain:        self.FIREBASE_AUTH_DOMAIN         || 'tee-inventory-manager.firebaseapp.com',
  projectId:         self.FIREBASE_PROJECT_ID          || 'tee-inventory-manager',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET      || 'tee-inventory-manager.firebasestorage.app',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '65274257324',
  appId:             self.FIREBASE_APP_ID              || '1:65274257324:web:370a41afa7d1c16a21e409',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// ─── Background message handler ───────────────────────────────────────────────
// Called by FCM when a notification arrives and the app is NOT in the foreground.
// This covers: app closed, PWA minimised, screen locked, browser backgrounded.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background push received:', payload);

  const title   = payload.notification?.title || 'TEE Inventory';
  const body    = payload.notification?.body  || '';
  const icon    = payload.notification?.icon  || '/icon-192.png';
  const badge   = '/favicon.png';

  // clickAction comes from the FCM data payload sent by our backend
  const clickAction = payload.data?.clickAction || '/';

  const options = {
    body,
    icon,
    badge,
    // Vibration pattern: short-long-short
    vibrate: [100, 50, 100],
    // Keep notification visible until user taps it (Android)
    requireInteraction: false,
    // Tag prevents duplicate notifications for the same event
    tag: payload.data?.notifId || title,
    data: {
      clickAction,
      notifId: payload.data?.notifId || '',
      type:    payload.data?.type    || '',
    },
    // Action buttons (Android Chrome / Edge)
    actions: [
      { action: 'open',    title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  return self.registration.showNotification(title, options);
});

// ─── Notification click handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle action button clicks
  if (event.action === 'dismiss') return;

  const clickAction = event.notification.data?.clickAction || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Find any open app window and focus + navigate it
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE', url: clickAction });
            return;
          }
        }
        // No open window — launch the app and navigate to the relevant page
        if (self.clients.openWindow) {
          return self.clients.openWindow(clickAction);
        }
      })
  );
});

// ─── Push event fallback ──────────────────────────────────────────────────────
// Handles raw Web Push events in case Firebase SDK doesn't intercept them.
// This is a safety net — normally onBackgroundMessage handles everything above.
self.addEventListener('push', (event) => {
  // If Firebase SDK already handled this, skip
  if (!event.data) return;

  let payload = { title: 'TEE Inventory', body: '' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }

  const title = payload.notification?.title || payload.title || 'TEE Inventory';
  const body  = payload.notification?.body  || payload.body  || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icon-192.png',
      badge: '/favicon.png',
      data:  payload.data || {},
    })
  );
});

// ─── Caching and PWA Offline Support (Merged from sw.js) ─────────────────────
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

// Listener for simulated push events from client / E2E test script
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SIMULATE_PUSH') {
    const { title, body, data } = event.data;
    const options = {
      body,
      icon: '/icon-192.png',
      badge: '/favicon.png',
      data: data || {}
    };
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});
