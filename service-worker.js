
self.addEventListener("install", event => {
    event.waitUntil(
      caches.open("bartending-flashcards").then(cache => {
        return cache.addAll([
          "./",
          "./index.html",
          "./style.css",
          "./script.js",
          "./data/cards.json"
        ]);
      })
    );
    self.skipWaiting();
  });
  
  self.addEventListener("fetch", event => {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  });
  