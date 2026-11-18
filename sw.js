'use strict';
const CACHE = 'bulssi-v8';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'js/data.js', 'js/game.js', 'js/render.js', 'js/ui.js', 'icons/icon-192.png', 'icons/icon-512.png',
  'assets/chars/bolt.png', 'assets/chars/candle.png', 'assets/chars/coal.png', 'assets/chars/crescent.png', 'assets/chars/ember.png', 'assets/chars/firefly.png', 'assets/chars/kiln.png', 'assets/chars/meteor.png', 'assets/enemies/brute.png', 'assets/enemies/charger.png', 'assets/enemies/maw.png', 'assets/enemies/mite.png', 'assets/enemies/runner.png', 'assets/enemies/shade.png', 'assets/enemies/spitter.png', 'assets/enemies/splitter.png', 'assets/enemies/swarm.png', 'assets/enemies/warden.png', 'assets/enemies/weaver.png', 'assets/enemies/wisp.png', 'assets/icons/h-rest.png', 'assets/icons/p-area.png', 'assets/icons/p-edge.png', 'assets/icons/p-haste.png', 'assets/icons/p-magnet.png', 'assets/icons/p-might.png', 'assets/icons/p-shell.png', 'assets/icons/p-speed.png', 'assets/icons/p-twin.png', 'assets/icons/p-warmth.png', 'assets/icons/p-wisdom.png', 'assets/icons/r-blast.png', 'assets/icons/r-clover.png', 'assets/icons/r-collector.png', 'assets/icons/r-dash.png', 'assets/icons/r-frost.png', 'assets/icons/r-glass.png', 'assets/icons/r-greed.png', 'assets/icons/r-hungry.png', 'assets/icons/r-rage.png', 'assets/icons/r-second.png', 'assets/icons/r-shadow.png', 'assets/icons/r-still.png', 'assets/icons/r-thorns.png', 'assets/icons/r-time.png', 'assets/icons/w-boomerang.png', 'assets/icons/w-chain.png', 'assets/icons/w-lance.png', 'assets/icons/w-mine.png', 'assets/icons/w-nova.png', 'assets/icons/w-orbit.png', 'assets/icons/w-rain.png', 'assets/icons/w-spark.png', 'assets/items/chest.png', 'assets/items/heal.png', 'assets/items/lantern.png', 'assets/items/magnet.png', 'assets/items/shrine-gamble.png', 'assets/items/shrine-heal.png', 'assets/items/shrine-pact.png', 'assets/items/shrine-wisdom.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 네트워크 우선으로 둔다. 캐시 우선으로 바꾸면 배포한 새 버전이 설치된 앱에 반영되지 않는다.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || (url.origin !== location.origin && !FONT_HOSTS.includes(url.hostname))) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
  );
});
