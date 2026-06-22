# Firma d'autore nascosta — `giorgiom250698`

Questo progetto contiene una **firma d'autore nascosta e a prova di manomissione**, per dimostrare la paternità dell'opera se qualcuno la copia.

> Nota onesta: nessun testo dentro un file distribuito è *letteralmente* «impossibile da alterare» — chi ha il file può modificarlo. Questo è l'equivalente reale: **ridondante** (più copie nascoste), **steganografico** (una copia invisibile), **a prova di manomissione** (ogni modifica è dimostrabile via hash), **certificabile** (ancorabile a un timestamp immutabile).

## Dove (4 livelli, in `index.html`, `Canali-e-Recettori-3D.html`, `Flashcard-Farmacologia.html`)
1. **Commento HTML**: `<!-- authorship watermark … author=giorgiom250698 … -->`.
2. **Variabile CSS**: `:root { --author: "giorgiom250698" }`.
3. **Steganografia zero-width**: in `<span id="__auth" data-z="…">` la stringa è codificata in caratteri invisibili (U+200B=0, U+200C=1). Invisibile, sopravvive al copia-incolla, difficilissima da trovare/rimuovere.
4. **Oggetto JS auto-verificante**: `window.__authorship` (`Object.freeze`) con `author`, `sha256`, `verify()`.

## Verifica (console del browser)
```js
__authorship.verify()   // true
__authorship.author     // "giorgiom250698"
// decodifica steganografia:
const z=document.getElementById('__auth').dataset.z;
const b=[...z].filter(c=>c==='​'||c==='‌').map(c=>c==='​'?'0':'1').join('');
b.match(/.{8}/g).map(x=>String.fromCharCode(parseInt(x,2))).join('') // "giorgiom250698"
```

## Prova — `SIGNATURE.json`
SHA-256 di ogni file firmato + hash combinato → lega la firma ai byte esatti (manomissione dimostrabile).
- `author_sha256` = `7e89b191a704024f69214d2e5be7e71b95a3d374165994eb77a8021abb59ea6d`
- nome base64 = `Z2lvcmdpb20yNTA2OTg=`

## Renderla CERTIFICABILE (data certa)
1. **Git/GitHub** (già fatto): il commit della firma è datato e con SHA nei log GitHub.
2. **OpenTimestamps** (blockchain, gratis): `pip install opentimestamps-client && ots stamp SIGNATURE.json` → `SIGNATURE.json.ots` immutabile.
3. **GPG**: `gpg --armor --detach-sign SIGNATURE.json`.
4. **Email/PEC a te stesso** di `SIGNATURE.json` → data certa.

**Conserva offline una copia di `SIGNATURE.json` (+ `.ots`)**: è l'ancora che prova la priorità contro la copia del ladro.
