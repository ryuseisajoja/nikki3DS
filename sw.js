/* イラストこうかん日記 サービスワーカー
   役割: ホーム画面に追加（PWA）できるようにする＋アプリの外枠を素早く表示する。
   日記データは Firebase からリアルタイム取得するためキャッシュしない（常に最新）。 */
const CACHE = 'koukan-nikki-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
         .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 別オリジン（Firebase / Google Fonts など）はそのままネットワークへ
  if (url.origin !== self.location.origin) return;

  // 画面遷移はネットワーク優先（更新を取りこぼさない）→ 失敗時のみキャッシュ
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  // それ以外の同一オリジン資産はキャッシュ優先（速い）→ 無ければ取得してキャッシュ
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
