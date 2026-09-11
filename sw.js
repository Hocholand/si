/* Офлайн-кэш «Ежка».
   Правишь index.html — подними номер версии, иначе телефон
   будет показывать старую копию. */
const VERSION = 'ezhok-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) {
        fetch(request).then(fresh => {
          if (fresh && fresh.ok) caches.open(VERSION).then(c => c.put(request, fresh.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(request).then(fresh => {
        if (fresh && fresh.ok) {
          const copy = fresh.clone();
          caches.open(VERSION).then(c => c.put(request, copy));
        }
        return fresh;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
