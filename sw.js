// Offline per l'app installata.
// Pagine e dati: rete prima (versione sempre aggiornata). Se la rete tarda più di 3 s e c'è una copia salvata, si serve
// la copia e la rete finisce in background aggiornandola; se la pagina era cambiata, lo shell mostra
// «Nuova versione disponibile · Aggiorna». Senza rete: la copia salvata. Una risposta d'errore (404, 5xx durante un
// deploy) non scavalca mai una copia buona.
// Una sola copia per file: la chiave è l'indirizzo senza ?query, così ?embed=1 e l'indirizzo nudo non divergono.
// Librerie CDN versionate: cache prima.
const CACHE = 'ff-v4';
// All'installazione solo lo shell e le icone (installazione leggera). Le tre app e i moduli 3D si salvano subito dopo,
// quando lo shell lo chiede ('warm', a pagina caricata e mai con risparmio dati): così l'offline è completo dal primo avvio.
const CORE = ['./', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-180.png', 'assets/icon-192.png',
  'assets/icon-512.png', 'assets/icon-maskable-512.png'];
// Pagine confrontate col sito quando lo shell lo chiede (ritorno nell'app dopo ore): la più leggera per prima.
const PAGES = ['index.html', 'Flashcard-Farmacologia.html', 'Tabella-Farmaci.html', 'Canali-e-Recettori-3D.html'];
// Moduli 3D dell'atlante (importmap di Canali-e-Recettori-3D.html); i loro import relativi si seguono da soli.
const THREE = 'https://unpkg.com/three@0.160.0/';
const THREE_MODS = ['build/three.module.js', 'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/postprocessing/EffectComposer.js', 'examples/jsm/postprocessing/RenderPass.js',
  'examples/jsm/postprocessing/ShaderPass.js', 'examples/jsm/postprocessing/UnrealBloomPass.js',
  'examples/jsm/postprocessing/OutlinePass.js', 'examples/jsm/postprocessing/OutputPass.js',
  'examples/jsm/shaders/FXAAShader.js', 'examples/jsm/environments/RoomEnvironment.js'];
const CDN = /^(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
const SLOW = 3000;
// Solo le cache di questa app: su GitHub Pages l'origine è condivisa con gli altri siti dello stesso account.
const OURS = /^ff-v\d+$/;

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

// Le copie delle versioni precedenti passano nella cache nuova (chiavi senza query), così l'offline non si perde.
// Più copie vecchie per lo stesso file (per esempio quella dell'installazione e quella ?embed=1): vince la più recente.
const dated = res => Date.parse(res.headers.get('date') || '') || 0;
async function migrate() {
  const c = await caches.open(CACHE), best = new Map();
  for (const name of await caches.keys()) {
    if (name === CACHE || !OURS.test(name)) continue;
    const old = await caches.open(name);
    for (const req of await old.keys()) {
      const same = new URL(req.url).origin === location.origin, key = same ? keyOf(req.url) : req.url;
      const res = await old.match(req, { ignoreVary: true });
      if (!res) continue;
      const prev = best.get(key);
      if (!prev || dated(res) > dated(prev)) best.set(key, res);
    }
  }
  for (const [key, res] of best) if (!(await c.match(key, { ignoreVary: true }))) await c.put(key, res);
  for (const name of await caches.keys()) if (name !== CACHE && OURS.test(name)) await caches.delete(name);
}
self.addEventListener('activate', e => {
  e.waitUntil(migrate().catch(() => {}).then(() => self.clients.claim()));
});

// Pagina mostrata dentro lo shell quando una sezione non ancora salvata viene aperta senza rete: colori del tema,
// lingua scelta, «Riprova»; si ricarica da sola appena torna la rete. Mai lo shell dentro lo shell.
const OFFLINE = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>Offline</title><script>(function(){var d=document.documentElement,t,l;try{t=localStorage.getItem('cr-theme');l=localStorage.getItem('cr-lang')}catch(e){}
if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;d.lang=l==='en'?'en':'it';})();</script>
<style>:root{--bg:#f3f0e9;--ink:#1c1a15;--dim:#565049;--gold:#835c14;--on:#fff;color-scheme:only light}
:root[data-theme="dark"]{--bg:#13110d;--ink:#efe9db;--dim:#b3ab9a;--gold:#e3bd80;--on:#1c1a15;color-scheme:dark}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink)}
body{display:grid;place-items:center;padding:24px;box-sizing:border-box;font:400 16px/1.55 'Archivo',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;-webkit-text-size-adjust:100%}
main{max-width:34ch;text-align:center}
svg{width:40px;height:40px;fill:none;stroke:var(--gold);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
h1{margin:14px 0 8px;font:500 24px/1.2 'Fraunces',Georgia,'Times New Roman',serif;letter-spacing:-.01em}
p{margin:0;color:var(--dim)}
button{margin-top:20px;min-height:44px;padding:0 20px;border-radius:10px;border:1px solid var(--gold);background:var(--gold);color:var(--on);font-family:inherit;font-weight:600;font-size:15px;line-height:1;cursor:pointer}
button:focus-visible{outline:2px solid var(--gold);outline-offset:3px}</style></head>
<body><main><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 8.5a14 14 0 0 1 19 0M5.5 12a9.5 9.5 0 0 1 13 0M8.6 15.4a5 5 0 0 1 6.8 0"/><path d="M12 19.2v.1"/><path d="M3 3l18 18"/></svg>
<h1 id="t"></h1><p id="x"></p><button type="button" id="r"></button></main>
<script>(function(){var d=document.documentElement,S={it:['Non ancora disponibile offline','Questa sezione non è ancora salvata su questo dispositivo. Aprila una volta con la connessione: dopo funziona anche offline.','Riprova'],
en:['Not available offline yet','This section is not saved on this device yet. Open it once while online and it will work offline afterwards.','Try again']};
function paint(){var s=S[d.lang==='en'?'en':'it'];document.getElementById('t').textContent=s[0];document.getElementById('x').textContent=s[1];document.getElementById('r').textContent=s[2];}
paint();document.getElementById('r').addEventListener('click',function(){location.reload()});addEventListener('online',function(){location.reload()});
addEventListener('message',function(e){var m=e.data;if(e.source!==parent||e.origin!==location.origin||!m||m.__farmaco!==1||m.type!=='appearance')return;
if(m.theme==='light'||m.theme==='dark')d.dataset.theme=m.theme;if(m.lang==='it'||m.lang==='en')d.lang=m.lang;paint();
try{parent.postMessage({__farmaco:1,type:'painted',theme:d.dataset.theme},location.origin)}catch(err){}});})();</script></body></html>`;
const offlinePage = () => new Response(OFFLINE, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

// Navigazione senza rete e senza copia: il documento principale riceve lo shell salvato; un iframe (le app dentro
// lo shell, sempre con ?embed=1) riceve la pagina offline, mai un secondo shell con due testate e due barre.
async function offlineFallback(req, cache) {
  if (req.mode !== 'navigate') return Response.error();
  const framed = req.destination === 'iframe' || req.destination === 'frame' || /[?&]embed=1(?:&|$)/.test(new URL(req.url).search);
  if (framed) return offlinePage();
  return (await cache.match(keyOf('index.html'), { ignoreVary: true })) || Response.error();
}

async function sameOrigin(e) {
  const req = e.request, key = keyOf(req.url), cache = await caches.open(CACHE);
  const hit = await cache.match(key, { ignoreVary: true });
  const net = fetch(req).then(res => { if (storable(res)) extend(e, cache.put(key, res.clone())); return res; });
  if (!hit) return net.catch(() => offlineFallback(req, cache));
  const first = await Promise.race([net.catch(() => null), new Promise(r => setTimeout(() => r(null), SLOW))]);
  if (first && first.ok) return first;
  if (first) return hit; // errore del sito (404, 5xx): meglio la copia buona
  // rete lenta o assente: si serve la copia; quando la rete risponde, la copia si aggiorna e, se era vecchia, lo si dice
  const before = isPage(req.url) ? hit.clone() : null;
  extend(e, net.then(async res => {
    if (before && storable(res) && (await res.clone().text()) !== (await before.text())) await tellStale();
  }).catch(() => {}));
  return hit;
}

// Controllo chiesto dallo shell: le pagine che lo shell ha aperto (o, se non lo dice, quelle salvate) confrontate con
// quelle del sito; alla prima diversa si avvisa.
async function check(only) {
  const cache = await caches.open(CACHE);
  const list = Array.isArray(only) ? PAGES.filter(p => only.includes(p)) : PAGES;
  for (const p of list) {
    const key = keyOf(p), hit = await cache.match(key, { ignoreVary: true });
    if (!hit) continue;
    try {
      const res = await fetch(key, { cache: 'no-cache' });
      if (!storable(res)) continue;
      if ((await res.clone().text()) !== (await hit.text())) { await cache.put(key, res); return tellStale(); }
    } catch (err) { return; }
  }
}

// Riempimento chiesto dallo shell: le pagine non ancora salvate e i moduli 3D dell'atlante. Per le pagine vale la
// cache HTTP (l'iframe appena caricato non si riscarica); ci si ferma al primo errore di rete.
let warming = null;
async function warm() {
  const cache = await caches.open(CACHE);
  for (const p of PAGES) {
    const key = keyOf(p);
    if (await cache.match(key, { ignoreVary: true })) continue;
    try { const res = await fetch(key); if (storable(res)) await cache.put(key, res); } catch (err) { return; }
  }
  const queue = THREE_MODS.map(m => THREE + m), seen = new Set();
  while (queue.length) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    let res = await caches.match(u, { ignoreVary: true });
    if (!res) {
      try { res = await fetch(u, { mode: 'cors', credentials: 'omit' }); } catch (err) { return; }
      if (!res.ok) continue;
      await cache.put(u, res.clone());
    }
    const src = await res.text();
    for (const m of src.matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+\.js)['"]/g)) queue.push(new URL(m[1], u).href);
  }
}

self.addEventListener('message', e => {
  const d = e.data;
  if (!d || d.__farmaco !== 1) return;
  if (d.type === 'check') e.waitUntil(check(d.pages));
  else if (d.type === 'warm') e.waitUntil(warming || (warming = warm().catch(() => {}).then(() => { warming = null; })));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(sameOrigin(e));
  else if (CDN.test(url.hostname)) {
    e.respondWith(caches.match(req, { ignoreVary: true }).then(hit => hit || fetch(req)
      .then(res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); } return res; })));
  }
});
