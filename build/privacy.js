#!/usr/bin/env node
// Controllo anonimato prima del commit: cerca i termini di .privacy-terms (file locale, mai versionato)
// in tutti i file che finirebbero nel repo pubblico. Esce con 1 se trova qualcosa.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const termsFile = path.join(ROOT, '.privacy-terms');
if (!fs.existsSync(termsFile)) { console.log('privacy: nessun .privacy-terms locale, controllo saltato'); process.exit(0); }
const terms = fs.readFileSync(termsFile, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const re = new RegExp(terms.join('|'), 'i');

let files;
try { // esattamente i file che git includerebbe (tracciati + nuovi non ignorati)
  files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0').filter(Boolean);
} catch { // ponytail: senza git, visita la cartella saltando ciò che è sempre ignorato
  const SKIP = new Set(['.git', 'node_modules', 'sources', 'batches', 'catalog-review', '_site', 'logs']);
  const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e =>
    SKIP.has(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  files = walk('.').filter(f => !/(^|\/)(task_plan|notes)\.md$|\.privacy-terms$/.test(f));
}

let hits = 0;
for (const f of files) {
  if (/\.(png|jpe?g|gif|ico|ots|gz|pdf|zip)$/i.test(f)) continue;
  let text; try { text = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => { if (re.test(line)) { hits++; console.log(`${f}:${i + 1}`); } });
}
console.log(hits ? `privacy: ${hits} righe da anonimizzare` : `privacy: ok (${files.length} file controllati)`);
process.exit(hits ? 1 : 0);
