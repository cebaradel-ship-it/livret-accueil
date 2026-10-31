// Service worker : le livret reste consultable sans réseau une fois ouvert.
const CACHE = 'livret-v1';
const CORE = ['./', 'index.html', 'assets/css/guest.css', 'assets/js/guest.js', 'assets/js/core.js', 'assets/js/icons.js', 'data/booklet.json', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const same = url.origin === location.origin;
  if (same && (url.pathname.endsWith('.json') || url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    // Réseau d'abord (contenu à jour), cache en secours.
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
    return;
  }
  if (same || /tile\.openstreetmap|basemaps\.cartocdn|fonts\.(googleapis|gstatic)/.test(url.host)) {
    // Images, polices, tuiles de carte : cache d'abord.
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; })));
  }
});
