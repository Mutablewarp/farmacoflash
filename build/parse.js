#!/usr/bin/env node
/**
 * Parser flashcard farmacologia.
 * Legge i .md (working dir) e i .txt convertiti da .rtf (build/) e produce cards.json.
 * Formato uniforme: ogni card = { name, fields canonici, segments[label,value], ... }.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = __dirname;

// Etichette canoniche -> chiave normalizzata
const CANON = [
  ["Meccanismo d'Azione / Target", 'mechanism'],
  ["Meccanismo d'Azione", 'mechanism'],
  ['Target Molecolare', 'target'],
  ['Parametri Farmacocinetici', 'pk'],
  ['Indicazioni Cliniche', 'indications'],
  ['Reazioni Avverse Comuni (ADR)', 'adr'],
  ['Reazioni Avverse (ADR)', 'adr'],
  ['Resistenze / Limiti di Efficacia', 'resistance'],
  ['Associazioni Farmacologiche / Adiuvanti', 'associations'],
];
// Etichette secondarie riconosciute anche nei .txt (card di classe / overview)
const SECONDARY = ['Molecole', 'Classi', 'Definizione', 'Struttura', 'Strategia',
  'Strategie', 'Principio', 'Generazioni', 'Controindicazioni', 'Prevenzione',
  'Origine/struttura', 'Origine', 'Note', 'Uso', 'Vantaggi', 'Svantaggi',
  'Tolleranza', 'Veicolo', 'Tipi', 'Effetti emodinamici', 'Effetti'];
const KNOWN = new Set([...CANON.map(c => c[0]), ...SECONDARY]);

function canonKey(label) {
  for (const [lab, key] of CANON) if (label === lab) return key;
  return null;
}
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function deckMetaFromName(file) {
  // Flashcards_A10_Diabete-Insulina  ->  code A10, slug Diabete-Insulina
  const base = file.replace(/^Flashcards_/, '').replace(/\.(md|txt)$/, '');
  const i = base.indexOf('_');
  const code = i > 0 ? base.slice(0, i) : base;
  const rest = i > 0 ? base.slice(i + 1) : '';
  return { code, rest };
}

function detectModule(source) {
  if (/🅰|Modulo\s*I\b/i.test(source)) return 'I';
  if (/🅱/.test(source) || /Modulo\s*I\b/.test(source)) return 'I';
  if (/🅲|Modulo\s*II/i.test(source)) return 'II';
  return '';
}

/** Spezza un blocco-card in segmenti [{label,value}] + freetext iniziale. */
function parseSegments(lines, isMd) {
  const segs = [];
  let cur = null;
  const pre = [];
  for (let raw of lines) {
    let line = raw.replace(/\s+$/, '');
    if (!line.trim()) { if (cur) cur.value += '\n'; continue; }
    let m = null;
    if (isMd) {
      // * **Label:** value   |   **Label:** value   |   - **Label:** value
      m = line.match(/^[\*\-]?\s*\*\*([^*]+?):\*\*\s*(.*)$/);
    }
    if (!m) {
      // testo .txt: "Label: value" solo se Label è noto
      const mm = line.match(/^([A-Za-zÀ-ù'’()\/ \-]{2,55}?):\s*(.*)$/);
      if (mm && KNOWN.has(mm[1].trim())) m = mm;
    }
    if (m) {
      cur = { label: m[1].trim(), value: m[2].trim() };
      segs.push(cur);
    } else if (cur) {
      // continuazione (sotto-bullet o testo): preserva a capo per i sotto-elenchi
      const cont = line.replace(/^\s*[-*]\s+/, '• ').trim();
      cur.value += (cur.value && !cur.value.endsWith('\n') ? '\n' : '') + cont;
    } else {
      pre.push(line.replace(/^\s*[-*]\s+/, '').trim());
    }
  }
  for (const s of segs) s.value = s.value.replace(/\n{2,}/g, '\n').replace(/\n+$/, '').trim();
  return { segs, freetext: pre.filter(Boolean) };
}

function parseFile(file, fullpath, isMd) {
  const text = fs.readFileSync(fullpath, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const { code, rest } = deckMetaFromName(file);

  let title = rest.replace(/[-_]/g, ' ');
  let source = '';
  // titolo dalla riga "💊 FLASHCARDS — X"
  for (const l of lines) {
    const t = l.match(/💊\s*FLASHCARDS\s*[—\-:]\s*(.+)$/i);
    if (t) { title = t[1].trim().replace(/\s*\(.*$/, '').trim() || title; break; }
  }
  for (const l of lines) {
    const s = l.match(/^\**\s*Fonte:\**\s*(.+)$/i);
    if (s) { source = s[1].replace(/\*\*/g, '').trim(); break; }
  }
  const deckId = code;
  const deck = { id: deckId, code, title, slug: slug(title), source, module: detectModule(source) };

  // Spezza in card sui marcatori 💊 (ignorando la riga FLASHCARDS) o sui --- (md)
  const cards = [];
  let block = null;
  const flush = () => {
    if (!block) return;
    const { segs, freetext } = parseSegments(block.body, isMd);
    const fields = {};
    for (const s of segs) { const k = canonKey(s.label); if (k && !fields[k]) fields[k] = s.value; }
    const allText = segs.map(s => s.value).join(' ') + ' ' + freetext.join(' ');
    const nd = (allText.match(/N\/D nei documenti/gi) || []).length;
    const thin = (!fields.mechanism && segs.length <= 2) || allText.replace(/\s+/g, '').length < 200 || nd >= 3;
    cards.push({
      id: `${deckId}__${slug(block.name)}`,
      deckId, name: block.name,
      nameShort: block.name.replace(/\s*\(.*$/, '').trim(),
      fields, segments: segs, freetext,
      tags: [], popculture: null, enriched: false,
      thin, ndCount: nd, charLen: allText.replace(/\s+/g, '').length,
    });
    block = null;
  };
  for (const l of lines) {
    const h = l.match(/^#{0,3}\s*💊\s*(.+?)\s*$/);
    if (h) {
      const name = h[1].trim();
      if (/^FLASHCARDS/i.test(name)) { continue; }   // riga titolo
      flush();
      block = { name, body: [] };
      continue;
    }
    if (/^\s*---\s*$/.test(l)) { continue; }          // separatore md
    if (block) block.body.push(l);
  }
  flush();
  deck.count = cards.length;
  return { deck, cards };
}

function main() {
  const mdFiles = fs.readdirSync(ROOT).filter(f => /^Flashcards_.*\.md$/.test(f));
  const txtFiles = fs.readdirSync(BUILD).filter(f => /^Flashcards_.*\.txt$/.test(f));
  const decks = [], cards = [];
  for (const f of mdFiles.sort()) {
    const r = parseFile(f, path.join(ROOT, f), true);
    decks.push(r.deck); cards.push(...r.cards);
  }
  for (const f of txtFiles.sort()) {
    const r = parseFile(f, path.join(BUILD, f), false);
    decks.push(r.deck); cards.push(...r.cards);
  }
  // ordina i mazzi: A* poi B* poi antibiotici
  const rank = d => /^A(\d+)/.test(d.code) ? 100 + (+d.code.slice(1))
    : /^B(\d+)/.test(d.code) ? 200 + parseInt(d.code.slice(1)) : 300;
  decks.sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code));
  const order = new Map(decks.map((d, i) => [d.id, i]));
  cards.sort((a, b) => order.get(a.deckId) - order.get(b.deckId));

  const out = { version: 1, decks, cards };
  fs.writeFileSync(path.join(BUILD, 'cards.json'), JSON.stringify(out, null, 1));
  // report
  const thin = cards.filter(c => c.thin);
  console.log(`Decks: ${decks.length}  Cards: ${cards.length}`);
  console.log(`Card "scarne" (da valutare per Goodman): ${thin.length}`);
  const noMech = cards.filter(c => !c.fields.mechanism).length;
  console.log(`Senza campo Meccanismo (card overview/classe): ${noMech}`);
  console.log('\nThin cards:');
  for (const c of thin) console.log(`  [${c.deckId}] ${c.name}  (${c.charLen} ch, ${c.segments.length} seg, ND=${c.ndCount})`);
}
main();
