# FarmacoFlash: istruzioni di progetto

App di studio per l'esame di Farmacologia (Modulo I generale, Modulo II speciale).
Sito pubblico: https://mutablewarp.github.io/farmacoflash/ (GitHub Pages, repo pubblico `Mutablewarp/farmacoflash`).
Lingua dei contenuti: italiano (inglese secondario). Design: `PRODUCT.md`.

## Regole che non si discutono
1. **Anonimato.** Nessun nome di docente, università o persona reale in file versionati, commit, screenshot,
   messaggi o pagine. L'unico riferimento ammesso è la parola anonima "docente". Prima di ogni commit:
   `npm run privacy` (cerca i termini del file locale `.privacy-terms`, non versionato).
2. **Copyright.** `build/sources/` (testo del Goodman & Gilman, approfondimenti grezzi) e le sbobine restano locali
   e gitignored. Nelle carte si parafrasa e si cita la pagina, mai copia estesa.
3. **Contenuto clinico mai automatico.** Il feed Novità (`novita.json`) elenca link a fonti ufficiali; le carte si
   correggono solo a mano, dopo verifica sulla fonte.
4. **Firma d'autore.** I blocchi `giorgiom250698` (watermark in HTML, `SIGNATURE.*`) restano: scelta dell'autore.
5. **Non rieseguire `build/parse.js`:** riscriverebbe `cards.json` cancellando le revisioni.

## Struttura
| File | Cosa | Come nasce |
|---|---|---|
| `index.html` | Shell: Inizio, Flashcard, Atlante 3D, Novità, ricerca, giro guidato | a mano; `build/shell.js` riempie programma e indice carte tra i marcatori |
| `Flashcard-Farmacologia.html` | FarmacoFlash (ripetizione spaziata, sfoglia, statistiche) | **generato** da `build/app-template.html` |
| `Tabella-Farmaci.html` | Tabella dei nomi, ricerca, quiz | **generato** da `build/table-template.html` |
| `Canali-e-Recettori-3D.html` | Atlante 3D (Three.js da unpkg), classificazioni | a mano; `build/atlas-index.js` estrae `atlas-cards.json` |
| `sw.js`, `manifest.webmanifest`, `assets/` | PWA: installabile e offline | a mano |
| `novita.json` | Feed Novità (copia di riserva) | `build/novita.py`, ogni notte in CI |

Dati in `build/`: `cards.json` (mazzi e carte), `enrichments*.json` (approfondimenti), `i18n/` (inglese),
`memo/`, `drugs.json` + `brands.json` (tabella e ricerca), `atlas-cards.json` (carte con bersaglio nel 3D).
Mai modificare a mano i due HTML generati: si perde tutto al build successivo.

## Comandi
```bash
npm run build   # rigenera flashcard, tabella e programma in index.html
npm test        # dati, sintassi, build riproducibile, feed (python)
npm start       # http://127.0.0.1:8765 (serve solo i file pubblicati)
```

## Flusso di lavoro
1. Modifica la sorgente giusta (tabella sopra), poi `npm run build && npm test`.
2. Controlla nel browser con `npm start`: Inizio, una carta, la tabella, l'atlante; desktop e 375 px; tema chiaro e scuro.
3. Commit in stile Conventional Commits (`feat:`, `fix:`, `content:`), poi `git push`.
4. Il push su `main` pubblica da solo (`.github/workflows/pages.yml`): build, test, feed Novità,
   controllo privacy (secret `PRIVACY_TERMS`), deploy. Lo stesso workflow gira ogni notte.

### Aggiungere o correggere una carta
- Carta: `build/cards.json` (`id` = `<mazzo>__<slug>`, `segments` = coppie etichetta/valore in markdown `**grassetto**`).
- Approfondimento: `build/enrichments.json` con la stessa chiave; inglese in `build/i18n/en-G*.json` e `enrichments-en.json`.
- Nuove etichette di sezione: aggiungerle a `LABELMAP` in `build/app-template.html` (colore che regga il contrasto AA).
- Nuovo mazzo: oggetto in `decks` con `module: "I"` o `"II"` (lo richiede `build/shell.js`).

## Collegamenti tra le app
Shell ↔ iframe con `postMessage` (stessa origine): `{__farmaco:1,type:'ready'|'route'|'navigate'|'appearance'}`
(vedi `src/bridge.js`); l'atlante accetta anche il vecchio `{__fusion:…}`.
Link profondi: flashcard `#dash #study #browse #stats #deck=<id> #card=<id> #front=<id>`;
tabella `#q= #deck= #mod=I|II #vista=nomi|effetti|rubrica`; atlante `#card=<id> #target=<chiave> #q=<testo>`;
shell `#inizio`, `#novita`, `#<flashcard|catalog|canali>/<hash codificato>`.

## Feed Novità
`python3 build/novita.py --out novita.json [--prev <file|url>]`: EMA, AIFA, FDA (sicurezza) e PubMed (linee guida),
abbinati ai farmaci di `drugs.json`/`cards.json`. Schema: `{generated, sources[{id,name,ok,count,error}],
items[{id,source,kind,title,summary,url,date,drugs[],cards[],decks[]}]}`. La shell lo mostra in Novità; la carta
collegata mostra un avviso con link. Se una novità cambia davvero il contenuto: correggi la carta a mano e cita la fonte.

## Limiti noti
- Progressi solo nel browser (backup manuale in Progressi): nessuna sincronizzazione tra dispositivi.
- Il 3D e i caratteri richiedono rete al primo avvio; dopo, il service worker li tiene in cache.
- GitHub sospende i workflow programmati dopo 60 giorni senza commit: un commit qualsiasi li riattiva.
