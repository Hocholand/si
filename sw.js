/* Офлайн-кэш «Ежок».
   Страница берётся из сети, когда сеть есть, и из памяти, когда её нет.
   При правке index.html подними номер версии ниже. */
const VERSION = 'ezhok-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-512.png'
];

/* Установка: качаем строго из сети, мимо кэша браузера. */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function isPage(request) {
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Страница: сначала сеть — тогда обновления видны сразу. */
  if (isPage(request)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(fresh => {
          if (fresh && fresh.ok) {
            const copy = fresh.clone();
            caches.open(VERSION).then(c => c.put('./index.html', copy));
          }
          return fresh;
        })
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  /* Иконки и манифест: из памяти, с тихим обновлением в фоне. */
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