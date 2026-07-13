// クロニクル・オブ・エターニア Service Worker
// 方針：インストール時にゲーム本体＋全画像を事前キャッシュ（オフライン/更新直後でも画像が確実に出る）。
//       HTMLはネットワーク優先で最新を取得、画像はキャッシュ優先で高速＆堅牢。
const VERSION = '2026.07.13-h';
const CACHE = 'etarnia-' + VERSION;

const ASSETS = [
  './', 'index.html', 'manifest.json',
  'assets/ally_archer.png','assets/ally_knight.png','assets/ally_mage.png','assets/ally_priest.png',
  'assets/area_cave.jpg','assets/area_coast.jpg','assets/area_forest.jpg','assets/area_snow.jpg','assets/area_temple.jpg',
  'assets/enemy_bat.png','assets/enemy_dragon.png','assets/enemy_goblin.png','assets/enemy_knight.png','assets/enemy_lord.png','assets/enemy_orc.png','assets/enemy_skeleton.png',
  'assets/hero_battle.png','assets/hero_map.png',
  'assets/npc_drake.png','assets/npc_elmia.png','assets/npc_gaston.png','assets/npc_ragan.png','assets/npc_sage.png',
  'assets/slime_blue.png','assets/slime_green.png','assets/slime_pink.png','assets/slime_purple.png','assets/slime_yellow.png',
  'assets/village.jpg'
];

self.addEventListener('install', (e) => {
  // 本体＋全画像を事前キャッシュしてから有効化
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 個別に追加し、1つ失敗しても全体を止めない
    await Promise.all(ASSETS.map(u => cache.add(u).catch(()=>{})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isImage(url){ return /\.(png|jpg|jpeg|gif|webp)$/i.test(url); }

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // 画像：キャッシュ優先（無ければ取得してキャッシュ）。確実に表示・高速。
  if (isImage(url.pathname)) {
    e.respondWith((async () => {
      const cached = await caches.match(e.request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res && res.ok) { const c = await caches.open(CACHE); c.put(e.request, res.clone()); }
        return res;
      } catch (_) {
        return caches.match('assets/hero_battle.png') || Response.error();
      }
    })());
    return;
  }

  // それ以外（HTML/JS等）：ネットワーク優先→失敗時キャッシュ
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request, { cache: 'no-store' });
      if (res && res.ok) { const cache = await caches.open(CACHE); cache.put(e.request, res.clone()); }
      return res;
    } catch (_) {
      const cached = await caches.match(e.request, { ignoreSearch: true });
      return cached || Response.error();
    }
  })());
});
