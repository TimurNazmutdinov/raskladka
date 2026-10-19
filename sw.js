// Кэш-first для файлов приложения; при смене файлов увеличь версию кэша.
const CACHE = 'raskladka-v8';
const FILES = ['./', 'index.html', 'app.js', 'calcview.js', 'defaults.js', 'engine.js', 'extras.js', 'gpx.js', 'gpxview.js', 'menu.js', 'method.js', 'params.js', 'products.js', 'productsview.js', 'pstore.js', 'settings.js', 'shop.js', 'store.js', 'trip.js', 'ui.js', 'styles.css', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
