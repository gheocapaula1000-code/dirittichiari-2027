/* DirittiChiari 2027 — service worker.
 * Strategia: rete prima (contenuti sempre aggiornati), cache come riserva offline.
 * Il nuovo SW resta in attesa finché l'utente non tocca "Aggiorna" nel banner. */
const VERSION = '1.0.0'; // tenere allineato con APP_VERSION in js/app.js
const CACHE = 'dc2027-' + VERSION;
const SHELL = ['./', 'index.html', 'css/app.css?v=1.0.0', 'js/rules.js?v=1.0.0', 'js/app.js?v=1.0.0', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.svg', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => null));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('dc2027-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'GET_VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage({ version: VERSION });
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-store' }).then((res) => {
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: false }).then((m) => m || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
