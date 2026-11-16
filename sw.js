/* dc-version:1.5.0 */
/* DirittiChiari 2027 — service worker.
 * Navigazioni: rete prima, con attesa di 3,5 s, poi cache.
 * Asset con ?v=: prima la cache. L'installazione fallisce se manca un file del guscio. */
const VERSION = '1.5.0';
const CACHE = 'dc2027-' + VERSION;
const IT_PAGES = ['/', '/stima', '/risultati', '/ottimizzazione', '/checklist-dsu', '/diritti-pa', '/fonti', '/metodo', '/contatti', '/privacy'];
const PAGES = IT_PAGES.concat(
  IT_PAGES.map((p) => p === '/' ? '/en' : '/en' + p),
  IT_PAGES.map((p) => p === '/' ? '/bn' : '/bn' + p)
);
const SHELL = [
  '/',
  '/en',
  '/bn',
  '/404.html',
  '/en/404.html',
  '/bn/404.html',
  '/css/app.css?v=' + VERSION,
  '/css/modulo-contatti.css?v=' + VERSION,
  '/js/version.js?v=' + VERSION,
  '/js/messages.js?v=' + VERSION,
  '/js/i18n.js?v=' + VERSION,
  '/js/pages-data.js?v=' + VERSION,
  '/js/rules.js?v=' + VERSION,
  '/js/modulo-contatti.js?v=' + VERSION,
  '/js/installa.js?v=' + VERSION,
  '/js/app.js?v=' + VERSION,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon.svg',
  '/icons/apple-touch-icon.png'
];
const MAX_RUNTIME = 40;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) =>
      fetch(u, { cache: 'reload' }).then((r) => {
        if (!r.ok) throw new Error('precache failed: ' + u + ' ' + r.status);
        return c.put(u, r);
      })
    )))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('dc2027-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => { if (self.__reloadAll) return avvisaRicarica(); })
  );
});

async function avvisaRicarica() {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach((c) => c.postMessage({ type: 'RELOAD' }));
}

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') { self.__reloadAll = true; self.skipWaiting(); }
  if (e.data.type === 'GET_VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage({ version: VERSION });
});

function timeoutFetch(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });
}

function inShell(url) {
  const u = new URL(url, self.location.origin);
  const key = u.pathname + u.search;
  return SHELL.indexOf(key) !== -1 || SHELL.indexOf(u.pathname) !== -1;
}

async function trimCache(cache) {
  const keys = await cache.keys();
  const extras = keys.filter((k) => !inShell(k.url));
  const overflow = extras.length - MAX_RUNTIME;
  if (overflow > 0) {
    for (let i = 0; i < overflow; i++) await cache.delete(extras[i]);
  }
}

function cachePut(req, res, stripQuery) {
  if (!res || !res.ok || res.type !== 'basic' || res.status !== 200) return;
  const copy = res.clone();
  let key = req;
  if (stripQuery) {
    const u = new URL(req.url);
    key = new Request(u.origin + u.pathname, { method: 'GET' });
  }
  caches.open(CACHE).then(async (c) => { await c.put(key, copy); await trimCache(c); });
}

function pathOf(url) {
  return (new URL(url).pathname.replace(/\/+$/, '') || '/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/__l5e/')) {
    e.respondWith(fetch(req).catch(() => new Response(null, { status: 204 })));
    return;
  }

  const isNavigate = req.mode === 'navigate' || req.destination === 'document';
  const isVersioned = url.searchParams.has('v');

  if (isNavigate) {
    e.respondWith((async () => {
      try {
        const res = await timeoutFetch(req, 3500);
        cachePut(req, res, true);
        return res;
      } catch (err) {
        const path = pathOf(req.url);
        if (PAGES.indexOf(path) !== -1) {
          const fallback = path.indexOf('/bn') === 0 ? '/bn' : (path.indexOf('/en') === 0 ? '/en' : '/');
          return (await caches.match(path)) || (await caches.match(fallback)) || (await caches.match('/')) || Response.error();
        }
        const nf = path === '/bn' || path.indexOf('/bn/') === 0 ? '/bn/404.html' : (path === '/en' || path.indexOf('/en/') === 0 ? '/en/404.html' : '/404.html');
        const offline404 = (await caches.match(nf)) || (await caches.match('/404.html'));
        if (offline404) {
          return new Response(await offline404.blob(), {
            status: 404,
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }
          });
        }
        return Response.error();
      }
    })());
    return;
  }

  if (isVersioned) {
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((res) => { cachePut(req, res, false); return res; }))
    );
    return;
  }

  e.respondWith(
    fetch(req).then((res) => { cachePut(req, res, false); return res; })
      .catch(() => caches.match(req).then((m) => m || Response.error()))
  );
});
