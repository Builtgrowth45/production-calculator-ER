const CACHE = 'er-v0.2.4';
const SHELL = [
  './',
  './index.html',
  './src/styles.css',
  './src/styles/tokens.css',
  './src/styles/shell.css',
  './src/styles/components.css',
  './src/styles/views.css',
  './src/styles/ux-release.css',
  './src/styles/surviving-reference.css',
  './src/store.js',
  './src/engine.js',
  './src/game_data.js',
  './src/balance_stats.js',
  './src/costs.js',
  './src/armor_classes.js',
  './src/factions.js',
  './data/icon_hashes.json',
  './icons/icon_catalog.json',
  './models/models_manifest.json',
  './src/app-core.js',
  './src/ui/motion.js',
  './src/ui/value-transition.js',
  './src/ui/r3f-loader.js',
  './src/ui/spatial-emphasis.js',
  './src/ui/legacy-3d-loader.js',
  './src/generated/er-3d-workbench.js',
  './src/app.js',
  './src/vendor/chart.min.js',
  './src/vendor/three/three.min.js',
  './src/vendor/three/OrbitControls.js',
  './src/vendor/three/GLTFLoader.js',
  './src/views/models.js',
  './src/views/reference.js',
  './src/views/gear.js',
  './src/views/inventory.js',
  './src/views/player.js',
  './src/app-init.js',
  './fonts/orbitron-latin.woff2',
  './fonts/jetbrains-mono-latin.woff2',
  './manifest.webmanifest',
  './favicon.svg'
];

  // Install: cache app shell — log failures, never swallow
  // The cache is scoped by the service-worker registration URL on Pages.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        SHELL.map(url =>
          cache.add(url).catch(err => {
            console.error('[SW] precache failed:', url, err.message);
            throw err;
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch: NETWORK-FIRST with cache fallback for everything.
// Cache-first shells repeatedly pinned users to stale HTML/JS whenever a
// deploy forgot to bump CACHE — network-first means online users always get
// the newest deploy, while offline users still get the last cached copy.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
