#!/usr/bin/env node
// Inserisce in index.html il programma del corso e l'indice delle carte (id → nome), letti da build/cards.json.
// Scrive solo tra i marcatori <!--COURSE:…--> e <!--INDEX:…-->; il resto della pagina è scritto a mano.
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'index.html');
const { decks, cards } = JSON.parse(fs.readFileSync(path.join(__dirname, 'cards.json'), 'utf8'));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ACR = /\b(fans|bpco|tnf|raas|cyp\d*\w*|gaba|ssri|snc|ace|dna|rna|ppi|adr)\b/gi;
const title = t => { const s = String(t).toLowerCase().replace(ACR, m => m.toUpperCase()); return s.charAt(0).toUpperCase() + s.slice(1); };
// I mazzi degli antibiotici hanno titoli generici: nome e sigla leggibili.
const NAMES = {
  'Beta-lattamici': ['AB1', 'Antibiotici β-lattamici'],
  'Antibiotici-2': ['AB2', 'Antibiotici: parete e antimicobatterici'],
  'Antibiotici-3': ['AB3', 'Antibiotici: sintesi proteica e acidi nucleici'],
};
const count = id => cards.filter(c => c.deckId === id).length;
const row = d => {
  const [code, t] = NAMES[d.id] || [d.code || d.id, title(d.title)];
  return `<li><button class="deck" type="button" data-go="flashcard:#deck=${esc(d.id)}"><span class="code">${esc(code)}</span><span class="t">${esc(t)}</span><span class="n">${count(d.id)}</span></button></li>`;
};
// Ordine: principi generali (G…), argomenti, antibiotici AB1→AB3; a parità resta l'ordine di cards.json.
const rank = d => /^G\d/.test(d.id) ? 0 : NAMES[d.id] ? 2 : 1;
const mod = (m, k) => {
  const ds = decks.filter(d => d.module === m)
    .sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? NAMES[a.id][0].localeCompare(NAMES[b.id][0]) : 0));
  return `<div class="mod"><h3><span data-i="${k}"></span><small data-i="${k}s"></small></h3><ul class="decks">${ds.map(row).join('')}</ul></div>`;
};
const course = `<div class="course">${mod('I', 'mod1')}${mod('II', 'mod2')}</div>`;
const index = JSON.stringify({ total: cards.length, cards: Object.fromEntries(cards.map(c => [c.id, c.nameShort || c.name])) })
  .replace(/</g, '\\u003c');

const orphans = decks.filter(d => d.module !== 'I' && d.module !== 'II').map(d => d.id);
if (orphans.length) throw new Error('Mazzi senza modulo I/II: ' + orphans.join(', '));

const src = fs.readFileSync(FILE, 'utf8');
const out = src
  .replace(/<!--COURSE:START-->[\s\S]*?<!--COURSE:END-->/, `<!--COURSE:START-->${course}<!--COURSE:END-->`)
  .replace(/<!--INDEX:START-->[\s\S]*?<!--INDEX:END-->/, `<!--INDEX:START--><script id="ff-index" type="application/json">${index}</script><!--INDEX:END-->`);
if (!out.includes(course)) throw new Error('Marcatori COURSE/INDEX mancanti in index.html');
if (out !== src) fs.writeFileSync(FILE, out);
console.log(`index.html: ${decks.length} mazzi, ${cards.length} carte${out === src ? ' (invariato)' : ''}`);
