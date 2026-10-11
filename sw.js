// Offline per l'app installata.
// Pagine e dati: rete prima (versione sempre aggiornata). Se la rete tarda più di 3 s e c'è una copia salvata, si serve
// la copia e la rete finisce in background aggiornandola; se la pagina era cambiata, lo shell mostra
// «Nuova versione disponibile · Aggiorna». Senza rete: la copia salvata.
// Una sola copia per file: la chiave è l'indirizzo senza ?query, così ?embed=1 e l'indirizzo nudo non divergono.
// Librerie CDN versionate: cache prima.
const CACHE = 'ff-v4';
// All'installazione solo lo shell e le icone: le app si salvano alla prima apertura (niente doppi download al primo avvio).
const CORE = ['./', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-180.png', 'assets/icon-192.png',
  'assets/icon-512.png', 'assets/icon-maskable-512.png'];
// Pagine confrontate col sito quando lo shell lo chiede (ritorno nell'app dopo ore): la più leggera per prima.
const PAGES = ['index.html', 'Flashcard-Farmacologia.html', 'Tabella-Farmaci.html', 'Canali-e-Recettori-3D.html'];
const CDN = /^(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
const SLOW = 3000;

const keyOf = u => { const x = new URL(u, self.registration.scope); return x.origin + (x.pathname.endsWith('/') ? x.pathname + 'index.html' : x.pathname); };
const isPage = u => /\.html$/.test(keyOf(u));
const storable = res => res && res.ok && res.type === 'basic' && !res.redirected;
const extend = (e, p) => { try { e.waitUntil(p); } catch (err) { /* evento già chiuso: il lavoro prosegue comunque */ } };
const tellStale = () => self.clients.matchAll({ type: 'window' })
  .then(cs => cs.forEach(c => c.postMessage({ __farmaco: 1, type: 'stale' })));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(p => fetch(p, { cache: 'no-cache' })
      .then(r => storable(r) ? c.put(keyOf(p), r) : null).catch(() => null))))
    .then(() => self.skipWaiting()));
});

// Le copie della versione precedente passano nella cache nuova (chiavi senza query), così l'offline non si perde.
async function migrate() {
  const c = await caches.open(CACHE);
  for (const name of await caches.keys()) {
    if (name === CACHE) continue;
    const old = await caches.open(name);
    for (const req of await old.keys()) {
      const same = new URL(req.url).origin === location.origin, key = same ? keyOf(req.url) : req;
      if (await c.match(key)) continue;
      const res = await old.match(req);
      if (res) await c.put(key, res);
    }
    await caches.delete(name);
  }
}
self.addEventListener('activate', e => {
  e.waitUntil(migrate().catch(() => {}).then(() => self.clients.claim()));
});

async function sameOrigin(e) {
  const req = e.request, key = keyOf(req.url), cache = await caches.open(CACHE);
  const hit = await cache.match(key, { ignoreVary: true });
  const net = fetch(req).then(res => { if (storable(res)) extend(e, cache.put(key, res.clone())); return res; });
  if (!hit) return net.catch(async () => (req.mode === 'navigate' && await cache.match(keyOf('index.html'))) || Response.error());
  const first = await Promise.race([net.catch(() => null), new Promise(r => setTimeout(() => r(null), SLOW))]);
  if (first) return first;
  // rete lenta o assente: si serve la copia; quando la rete risponde, la copia si aggiorna e, se era vecchia, lo si dice
  const before = isPage(req.url) ? hit.clone() : null;
  extend(e, net.then(async res => {
    if (before && storable(res) && (await res.clone().text()) !== (await before.text())) await tellStale();
  }).catch(() => {}));
  return hit;
}

// Controllo chiesto dallo shell: pagine già salvate confrontate con quelle del sito; alla prima diversa si avvisa.
async function check() {
  const cache = await caches.open(CACHE);
  for (const p of PAGES) {
    const key = keyOf(p), hit = await cache.match(key, { ignoreVary: true });
    if (!hit) continue;
    try {
      const res = await fetch(key, { cache: 'no-cache' });
      if (!storable(res)) continue;
      if ((await res.clone().text()) !== (await hit.text())) { await cache.put(key, res); return tellStale(); }
    } catch (err) { return; }
  }
}
self.addEventListener('message', e => {
  const d = e.data;
  if (d && d.__farmaco === 1 && d.type === 'check') e.waitUntil(check());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(sameOrigin(e));
  else if (CDN.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)
      .then(res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); } return res; })));
  }
});
