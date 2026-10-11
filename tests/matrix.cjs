// Regressione di tema, lingua e navigazione tra shell e app: Chrome e WebKit × file:// e http.
// Uso: npm run build, poi npm run test:matrix (Playwright raggiungibile da NODE_PATH).
// Il server http lo avvia il test stesso (porta MATRIX_PORT, altrimenti una libera); la rete esterna è
// bloccata e il feed delle novità pubblicato è servito dalla copia locale, così il test non dipende da internet.
// Variabili: MATRIX_BROWSERS=chrome,webkit  MATRIX_MODES=file,http
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium, webkit } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FEED = 'https://mutablewarp.github.io/farmacoflash/novita.json';
const BROWSERS = (process.env.MATRIX_BROWSERS || 'chrome,webkit').split(',');
const MODES = (process.env.MATRIX_MODES || 'file,http').split(',');
const FRAME = { flashcard: 'Flashcard-Farmacologia.html', catalog: 'Tabella-Farmaci.html', canali: 'Canali-e-Recettori-3D.html' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(+process.env.MATRIX_PORT || 0, '127.0.0.1', () => r(server)));
}
async function launch(name) {
  if (name === 'webkit') {
    const exe = path.join(process.env.HOME || '', 'Library/Caches/ms-playwright/webkit-2370/pw_run.sh');
    return webkit.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  }
  try { return await chromium.launch({ channel: 'chrome' }); } catch (e) { return chromium.launch(); }
}

async function until(what, fn, ms = 8000) {
  const t0 = Date.now(); let last;
  while (Date.now() - t0 < ms) {
    try { last = await fn(); if (last && last.ok !== false) return { ms: Date.now() - t0, v: last }; } catch (e) { last = { err: e.message.slice(0, 120) }; }
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error('Timeout: ' + what + ' · last state ' + JSON.stringify(last));
}

function harness(page, base) {
  const H = {};
  H.frame = app => page.frames().find(f => f.url().includes(FRAME[app]));
  H.app = async app => {
    const f = H.frame(app); if (!f) return null;
    return f.evaluate(() => {
      const r = document.documentElement, act = document.querySelector('.view.active');
      const bg = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number);
      return { theme: r.dataset.theme, lang: typeof LANG !== 'undefined' ? LANG : r.lang, docLang: r.lang, view: act ? act.id : '', hash: location.hash,
        marker: window.__mx || 0, lum: (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255, alpha: bg.length > 3 ? bg[3] : 1 };
    });
  };
  H.shell = () => page.evaluate(() => {
    const fr = {}; for (const k of ['flashcard', 'catalog', 'canali']) { const f = document.getElementById('if-' + k); fr[k] = { src: !!f.getAttribute('src'), shown: !!f.getAttribute('src') && !f.hidden && !f.classList.contains('wait') }; }
    return { theme: document.documentElement.dataset.theme, lang: document.documentElement.lang, hash: location.hash, frames: fr,
      sub: (document.querySelector('[data-sub][aria-current]') || {}).dataset?.sub || '', space: (document.querySelector('.sp[aria-current]') || {}).dataset?.space || '',
      news: newsState, loading: !document.getElementById('loading').hidden };
  });
  H.fresh = async (hash = '') => {
    await page.goto(base);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ff-tour-v2', 'done'); });
    await page.goto('about:blank');
    await page.goto(base + hash);
  };
  // l'app richiesta è visibile nello shell e mostra la vista attesa
  H.showing = (app, view) => until(`${app} ${view || ''}`, async () => {
    const s = await H.shell(); if (!s.frames[app].shown) return { ok: false, s };
    const a = await H.app(app); return a && (!view || a.view === view) ? a : { ok: false, a };
  });
  return H;
}

async function run(browserName, mode, base) {
  const browser = await launch(browserName);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  let feedDown = false;
  await ctx.route(url => !/^(file:|http:\/\/127\.0\.0\.1)/.test(url.href), r => {
    if (r.request().url() === FEED && !feedDown) return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: fs.readFileSync(path.join(ROOT, 'novita.json')) });
    return r.abort();
  });
  await ctx.route(/127\.0\.0\.1.*novita\.json/, r => feedDown ? r.abort() : r.continue());
  const page = await ctx.newPage(), problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (/postMessage|Unable to post message|recipient window's origin/i.test(m.text())) problems.push('console: ' + m.text()); });
  const H = harness(page, base), log = [];
  const step = (name, extra) => log.push(name + (extra != null ? ' ' + extra : ''));

  // 1. Primo accesso alle flashcard, subito (prima del precaricamento): Oggi, mai Sfoglia
  await H.fresh();
  await page.click('.sp[data-space="cards"]');
  let r = await H.showing('flashcard', 'v-dash', 15000);
  assert.equal((await H.shell()).sub, 'dash');
  step('first open → Oggi', r.ms + 'ms');
  await H.frame('flashcard').evaluate(() => { window.__mx = 1; });

  // 2. Sotto-navigazione: vista giusta, nessun ricaricamento, barra dello shell allineata
  const VIEW = { dash: 'v-dash', study: 'v-study', browse: 'v-browse', stats: 'v-stats' }, times = [];
  for (const sub of ['study', 'browse', 'names', 'stats', 'dash', 'names', 'browse', 'study', 'stats', 'dash']) {
    await page.click(`[data-sub="${sub}"]`);
    r = sub === 'names' ? await H.showing('catalog') : await H.showing('flashcard', VIEW[sub]);
    const s = await H.shell();
    assert.equal(s.sub, sub, 'shell highlight after ' + sub);
    if (sub !== 'names') assert.equal(r.v.marker, 1, 'flashcard reloaded on ' + sub);
    for (const k of ['flashcard', 'catalog', 'canali']) assert.equal(s.frames[k].shown, k === (sub === 'names' ? 'catalog' : 'flashcard'), 'only one app visible');
    times.push(sub + ':' + r.ms);
  }
  step('sub-nav', times.join(' '));
  // Indietro: una pressione = un passo, shell e app insieme (le app non aggiungono voci)
  await page.goBack({ waitUntil: 'commit' });
  r = await H.showing('flashcard', 'v-stats');
  assert.equal((await H.shell()).sub, 'stats');
  await page.goBack({ waitUntil: 'commit' });
  r = await H.showing('flashcard', 'v-study');
  assert.equal((await H.shell()).sub, 'study');
  step('back ×2 → Progressi, Studia');

  // 3. Vista cambiata dentro le flashcard: lo shell la segue
  await page.click('[data-sub="dash"]'); await H.showing('flashcard', 'v-dash');
  await H.frame('flashcard').evaluate(() => go('browse'));
  await until('shell follows in-app view', async () => (await H.shell()).sub === 'browse');
  assert.match(decodeURIComponent((await H.shell()).hash), /#flashcard\/#browse$/);
  step('in-app view → shell');

  // 4. Mazzo dal programma in Inizio, poi Oggi
  await page.click('.brand');
  await page.click('[data-go="flashcard:#deck=G1"]');
  r = await H.showing('flashcard', 'v-browse');
  assert.equal(await H.frame('flashcard').evaluate(() => browseFilter), 'G1');
  await page.click('[data-sub="dash"]'); await H.showing('flashcard', 'v-dash');
  step('course deck G1 → Sfoglia');

  // 5. Link dalla tabella alla carta
  await page.click('[data-sub="names"]'); await H.showing('catalog');
  const cat = H.frame('catalog');
  await cat.evaluate(() => { if (mode !== 'all') setMode('all'); });
  const id = await cat.evaluate(() => { const tr = document.querySelector('#tb tr.dr'); tr.click(); return tr.dataset.id; });
  r = await H.showing('flashcard', 'v-study');
  assert.equal(r.v.hash, '#front=' + id);
  assert.equal((await H.shell()).sub, 'study');
  step('table row → card', r.ms + 'ms');

  // 6. Ricerca dall'intestazione, due volte di fila (la seconda deve arrivare alla tabella già aperta)
  for (const q of ['insulina', 'Tachipirina']) {
    await page.fill('#q', q); await page.press('#q', 'Enter');
    await until('table search ' + q, async () => { await H.showing('catalog'); return (await H.frame('catalog').evaluate(() => state.q)) === q; });
  }
  step('header search ×2');

  // 7. Tema e lingua cambiati con le app già caricate: ogni iframe segue, anche lo sfondo
  await page.click('.sp[data-space="atlas"]'); await H.showing('canali');
  const before = (await H.shell()).theme, want = before === 'dark' ? 'light' : 'dark';
  await page.click('#theme'); await page.click('#lang');
  for (const app of ['flashcard', 'catalog', 'canali']) {
    r = await until(app + ' → ' + want + '/en', async () => { const a = await H.app(app); return a.theme === want && a.lang === 'en' && a.docLang === 'en' ? a : { ok: false, a }; }, 5000);
    if (r.v.alpha > 0) assert(want === 'dark' ? r.v.lum < 0.3 : r.v.lum > 0.6, app + ' background does not follow the theme: ' + r.v.lum.toFixed(2));
  }
  step('toggle theme+lang → all frames ' + want + '/en');
  await page.click('#theme'); await page.click('#lang');
  for (const app of ['flashcard', 'catalog', 'canali'])
    await until(app + ' → ' + before + '/it', async () => { const a = await H.app(app); return a.theme === before && a.lang === 'it' ? a : { ok: false, a }; }, 5000);
  step('toggle back → ' + before + '/it');
  // dopo un ricaricamento la scelta resta, anche nelle flashcard (chiave unica cr-lang)
  await page.click('#theme'); await page.click('#lang');
  await page.reload();
  await page.click('.sp[data-space="cards"]');
  r = await H.showing('flashcard');
  assert.equal(r.v.theme, want); assert.equal(r.v.lang, 'en');
  await page.click('[data-sub="names"]'); r = await H.showing('catalog');
  assert.equal(r.v.theme, want); assert.equal(r.v.lang, 'en');
  step('reload keeps ' + want + '/en');

  // 8. Novità: dal sito pubblicato su file://, dalla copia locale in http; con la data del feed
  await page.click('.sp[data-space="news"]');
  await until('news ok', async () => (await H.shell()).news === 'ok');
  assert((await page.locator('#news-list li.news').count()) > 0, 'news items');
  assert.match(await page.locator('#news-meta').innerText(), /\d{4}/, 'feed date shown');
  step('Novità ok');
  // ...e se nessuna fonte risponde (né cache): messaggio chiaro, niente «Caricamento» rimasto
  feedDown = true;
  await page.evaluate(() => localStorage.removeItem('ff-news-cache'));
  await page.reload();
  await until('news error', async () => (await H.shell()).news === 'error');
  const msg = await page.locator('#news-list').innerText();
  assert.doesNotMatch(msg, /Caricamento|Loading/);
  assert.match(msg, /internet/);
  feedDown = false;
  await page.click('#news-list button.link');
  await until('news retry', async () => (await H.shell()).news === 'ok');
  step('Novità offline message + retry');

  assert.deepEqual(problems, [], problems.join('\n'));
  await browser.close();
  return log;
}

(async () => {
  const server = await serve();
  const bases = { file: 'file://' + encodeURI(ROOT) + '/index.html', http: `http://127.0.0.1:${server.address().port}/index.html` };
  let failed = 0;
  for (const b of BROWSERS) for (const m of MODES) {
    try { const log = await run(b, m, bases[m]); console.log(`ok   ${b} × ${m}\n     ${log.join('\n     ')}`); }
    catch (e) { failed++; console.log(`FAIL ${b} × ${m}\n     ${e.stack.split('\n').slice(0, 3).join('\n     ')}`); }
  }
  server.close();
  if (failed) { console.error(failed + ' combination(s) failed'); process.exit(1); }
  console.log('Matrix passed: ' + BROWSERS.join('+') + ' × ' + MODES.join('+'));
})().catch(e => { console.error(e); process.exit(1); });
