#!/usr/bin/env node
/**
 * Build finale: cards.json + memo/*.json (memofrasi) + enrichments.json → Flashcard-Farmacologia.html
 * I dati sono iniettati come base64 dell'UTF-8 del JSON (zero problemi di escape/HTML).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BUILD = __dirname;
const ROOT = path.resolve(BUILD, '..');
const OUT = path.join(ROOT, 'Flashcard-Farmacologia.html');

function readJsonIfExists(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

const data = JSON.parse(fs.readFileSync(path.join(BUILD, 'cards.json'), 'utf8'));
const byId = new Map(data.cards.map(c => [c.id, c]));

// --- memofrasi (memo/*.json: { entries: [{id, memo}] }) ---
const memoMap = new Map();
const memoDir = path.join(BUILD, 'memo');
if (fs.existsSync(memoDir)) {
  for (const f of fs.readdirSync(memoDir).filter(f => f.endsWith('.json')).sort()) {
    const j = readJsonIfExists(path.join(memoDir, f));
    for (const e of (j && j.entries || [])) if (e && e.id && e.memo) memoMap.set(e.id, e.memo);
  }
}
let withMemo = 0;
for (const c of data.cards) {
  const m = memoMap.get(c.id);
  c.popculture = undefined;        // rimuove i vecchi ganci meme/reddit dal dato renderizzato
  if (m) { c.memo = m; withMemo++; } else { c.memo = null; }
}

// --- traduzioni inglesi (card.en) ---
const enMap = new Map();
const i18nDir = path.join(BUILD, 'i18n');
if (fs.existsSync(i18nDir)) {
  for (const f of fs.readdirSync(i18nDir).filter(f => /^en-G\d+\.json$/.test(f))) {
    const j = readJsonIfExists(path.join(i18nDir, f));
    for (const e of (j && j.entries || [])) enMap.set(e.id, e);
  }
}
let withEn = 0;
for (const c of data.cards) {
  const e = enMap.get(c.id);
  if (!e) continue;
  c.en = {
    name: e.name || c.name, nameShort: e.nameShort || c.nameShort, memo: e.memo || null,
    segments: (e.segments || []).map(s => ({ label: s.label, value: s.value })),
    freetext: e.freetext || []
  };
  withEn++;
}
const enEnrich = new Map();
for (const e of ((readJsonIfExists(path.join(BUILD, 'enrichments-en.json')) || {}).entries || [])) enEnrich.set(e.id, e);
data.diagramsEn = readJsonIfExists(path.join(i18nDir, 'diagrams-en.json')) || {};

// --- arricchimenti Goodman (IT + EN, segmenti paralleli) ---
const enrich = readJsonIfExists(path.join(BUILD, 'enrichments.json'));
let mergedEnrich = 0;
if (enrich && enrich.entries) {
  for (const e of enrich.entries) {
    const c = byId.get(e.id);
    if (!c) continue;
    if (!c.segments.some(s => /Approfondimento/i.test(s.label))) {
      c.segments.push({ label: 'Approfondimento — ' + (e.source || 'Goodman & Gilman'), value: e.text });
      if (c.en) {
        const ee = enEnrich.get(e.id);
        c.en.segments.push({ label: 'In depth — ' + ((ee && ee.source) || e.source || 'Goodman & Gilman'), value: (ee && ee.text) || e.text });
      }
    }
    c.enriched = true; mergedEnrich++;
  }
}

const tpl = fs.readFileSync(path.join(BUILD, 'app-template.html'), 'utf8');
const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
fs.writeFileSync(OUT, tpl.replace('__DATA_B64__', b64));

const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`✓ Scritto ${path.basename(OUT)}  (${sizeMB} MB)`);
console.log(`  Carte: ${data.cards.length} · Mazzi: ${data.decks.length}`);
console.log(`  Memofrasi iniettate: ${withMemo}/${data.cards.length}`);
console.log(`  Card tradotte EN: ${withEn}/${data.cards.length}  ·  Diagrammi EN: ${Object.keys(data.diagramsEn).length}`);
console.log(`  Card arricchite da Goodman: ${mergedEnrich}`);
const missing = data.cards.filter(c => !c.memo).map(c => c.id);
if (missing.length) console.log(`  ⚠️  senza memofrase: ${missing.length}\n   ${missing.join('\n   ')}`);
