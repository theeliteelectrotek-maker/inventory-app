// Deprecated legacy service worker. Self-unregisters so the new unified
// firebase-messaging-sw.js service worker can handle all scopes.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach(client => {
        if (client.navigate) {
          client.navigate(client.url);
        }
      });
    });
});
