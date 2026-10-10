#!/usr/bin/env node
// Atlas index: lists the FarmacoFlash card ids that have a target in the 3D atlas
// (Canali-e-Recettori-3D.html), so other apps can show an "open in the atlas" link
// only when the atlas deep link `#card=<id>` will actually find something.
//
// Usage: node build/atlas-index.js  ->  writes build/atlas-cards.json (sorted JSON array)
//
// No dependencies. Only the data literals (CARDMAP, RECDRUGS, CHDRUGS and their
// Object.assign(...) extensions) are evaluated, in an empty `vm` context with a timeout.
// Every RECDRUGS/CHDRUGS key is an atlas target (the page opens it with buildModel).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'Canali-e-Recettori-3D.html');
const OUT = path.join(__dirname, 'atlas-cards.json');
const NAMES = ['CARDMAP', 'RECDRUGS', 'CHDRUGS'];

/** Return the source of the statement starting at `start` (string/comment aware, bracket balanced). */
function readStatement(src, start) {
  let depth = 0, opened = false, quote = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) break; i = e + 1; continue; }
    if (ch === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = (e < 0 ? src.length : e) - 1; continue; }
    if (ch === '{' || ch === '[' || ch === '(') { depth++; opened = true; }
    else if (ch === '}' || ch === ']' || ch === ')') { if (--depth < 0) break; }
    else if (opened && depth === 0 && (ch === ';' || ch === '\n')) return src.slice(start, i);
  }
  throw new Error('atlas-index: unterminated statement at offset ' + start);
}

/** Evaluate the atlas data literals of the page and return {CARDMAP, RECDRUGS, CHDRUGS}. */
function loadAtlas(html) {
  const open = html.indexOf('<script type="module">');
  const close = html.indexOf('</script>', open);
  if (open < 0 || close < 0) throw new Error('atlas-index: module script not found');
  const src = html.slice(open, close);
  const alt = NAMES.join('|');
  const re = new RegExp(`\\b(?:(?:const|let|var)\\s+(?:${alt})\\s*=|Object\\.assign\\(\\s*(?:${alt})\\s*,)`, 'g');
  const parts = [];
  for (let m; (m = re.exec(src));) { parts.push(readStatement(src, m.index)); re.lastIndex = m.index + parts[parts.length - 1].length; }
  for (const n of NAMES) if (!parts.some(p => new RegExp(`^(?:const|let|var)\\s+${n}\\s*=`).test(p))) throw new Error('atlas-index: missing ' + n);
  const code = parts.join(';\n') + `;\n({${NAMES.join(',')}})`;
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  return vm.runInContext(code, ctx, { timeout: 5000, filename: 'atlas-data.js' });
}

/** Card ids reachable from a target, with the same rule as the page's `#card=` deep link. */
function atlasCardIds(data) {
  const { CARDMAP, RECDRUGS, CHDRUGS } = data;
  const card = n => CARDMAP[String(n || '').toLowerCase().trim()];
  const ids = new Set();
  const add = c => { if (typeof c === 'string' && c) ids.add(c); };
  for (const groups of Object.values(RECDRUGS)) {
    for (const g of groups) for (const x of g.d || []) { add(x.card); add(card(x.n)); }
  }
  for (const groups of Object.values(CHDRUGS)) {
    for (const g of groups) for (const n of g.drugs || []) add(card(n));
  }
  return [...ids].sort();
}

function main() {
  const data = loadAtlas(fs.readFileSync(HTML, 'utf8'));
  const ids = atlasCardIds(data);
  fs.writeFileSync(OUT, JSON.stringify(ids, null, 2) + '\n');
  const all = new Set(Object.values(data.CARDMAP));
  console.log(`atlas-index: ${ids.length} card ids with an atlas target (CARDMAP: ${Object.keys(data.CARDMAP).length} names -> ${all.size} ids) -> ${path.relative(ROOT, OUT)}`);
}

module.exports = { loadAtlas, atlasCardIds };
if (require.main === module) main();
