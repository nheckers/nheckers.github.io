
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", (event) => {
  clients.claim(); // Take control of the page immediately
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
