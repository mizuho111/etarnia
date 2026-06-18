// クロニクル・オブ・エターニア Service Worker
// 方針：ネットワーク優先（オンライン時は常に最新を取得し、取得できた内容をキャッシュ。
//       オフライン時のみキャッシュにフォールバック）→ 更新が確実に反映される。
const VERSION = '2026.06.18-c';
const CACHE = 'etarnia-' + VERSION;

self.addEventListener('install', () => {
  // 新しいSWを即座に有効化
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 古いバージョンのキャッシュを削除
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      // まずネットワークから最新を取得
      const res = await fetch(e.request, { cache: 'no-store' });
      const cache = await caches.open(CACHE);
      cache.put(e.request, res.clone());
      return res;
    } catch (_) {
      // オフライン時はキャッシュを使う
      const cached = await caches.match(e.request);
      return cached || Response.error();
    }
  })());
});
