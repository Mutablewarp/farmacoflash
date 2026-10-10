// Read-only repository checks. Run with Node.js from any directory.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const cards = json('build/cards.json');
const drugs = json('build/drugs.json');
const ids = new Set(cards.cards.map(c => c.id));
const translations = fs.readdirSync(path.join(root, 'build/i18n')).filter(f => /^en-G\d+\.json$/.test(f)).flatMap(f => json('build/i18n/' + f).entries);
const en = new Map(translations.map(c => [c.id, c]));
let captured;
const buildFile = path.join(root, 'build/build.js');
const realRequire = createRequire(buildFile);
const fakeFs = { ...fs, writeFileSync(p, data) { captured = data; }, statSync(p) { return {size: Buffer.byteLength(captured)}; } };
vm.runInNewContext(read('build/build.js'), {
  require: name => name === 'fs' ? fakeFs : realRequire(name),
  __dirname: path.dirname(buildFile), Buffer, console: {log() {}}
}, { filename: buildFile });
const built = read('Flashcard-Farmacologia.html');
const sig = json('SIGNATURE.json');
const result = {
  cards: cards.cards.length, decks: cards.decks.length,
  drugNames: new Set(Object.values(drugs).flat()).size,
  drugMentions: Object.values(drugs).flat().length,
  duplicateCardIds: cards.cards.length - ids.size,
  invalidDrugCardReferences: Object.keys(drugs).filter(id => !ids.has(id)),
  translationSegmentLengthMismatch: cards.cards.filter(c => en.has(c.id) && c.segments.length !== en.get(c.id).segments.length).map(c => ({id:c.id,it:c.segments.length,en:en.get(c.id).segments.length})),
  buildMatchesPublishedArtifact: captured === built,
  buildIncludesShellBridge: captured.includes('__fusion'),
  artifactIncludesShellBridge: built.includes('__fusion'),
  missingTableGenerator: !fs.existsSync(path.join(root, 'build/_gen-table.js')),
  signatureMatchesCurrentFiles: Object.fromEntries(Object.entries(sig.files).map(([p,hash]) => [p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex') === hash]))
};
assert.equal(result.duplicateCardIds, 0, 'Duplicate card IDs');
assert.deepEqual(result.invalidDrugCardReferences, [], 'Dangling drug/card references');
console.log(JSON.stringify(result,null,2));
