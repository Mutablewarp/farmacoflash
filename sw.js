// Offline per l'app installata. Pagine e dati: rete prima (versione sempre aggiornata),
// copia in cache come riserva senza connessione. Librerie CDN versionate: cache prima.
const CACHE = 'ff-v2';
const CORE = ['./', 'index.html', 'Flashcard-Farmacologia.html', 'Tabella-Farmaci.html',
  'Canali-e-Recettori-3D.html', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-180.png', 'assets/icon-512.png'];
const CDN = /^(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const keep = (req, res) => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req)
      .then(res => res.ok ? keep(req, res) : res)
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else if (CDN.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)
      .then(res => (res.ok || res.type === 'opaque') ? keep(req, res) : res)));
  }
});
