// Service worker-«самоликвидатор»: v1 ставила кэш-first воркер, из-за него у установивших открывалась старая версия.
// Этот файл заменяет его: чистит кэши, удаляет себя и перезагружает открытые вкладки.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
