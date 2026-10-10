# FarmacoFlash — stato della revisione locale

## Aggiornamento 10 ottobre 2026
- Shell nuova (`index.html`): Inizio, Flashcard (Oggi · Studia · Sfoglia · Tabella dei nomi · Progressi), Atlante 3D, Novità; ricerca globale; giro guidato interattivo; PWA offline (`sw.js`).
- Contenuti: **255 carte in 35 mazzi**; nuovi G1–G7 (principi di farmacologia generale, Parte A lezioni 1–6; neurofarmacologia molecolare, Parte B lezioni 1–4).
- Collegamenti: carta ↔ bersaglio 3D (`#card=`), atlante → tabella, programma → mazzo (`#deck=`).
- Feed Novità (`build/novita.py`): EMA, AIFA, FDA, PubMed; ogni notte in CI; le carte non cambiano da sole.
- Flusso di lavoro e regole: vedi `CLAUDE.md`. Le sezioni sotto descrivono la revisione del 9 ottobre.

9 ottobre 2026. Incremento funzionante locale, **non pubblicato e non ancora completamento dell'intero brief**.

## Verificato

| Funzione | Implementazione | Prova | Stato |
|---|---|---|---|
| Build di flashcard e tabella | `build/build.js`, `build/table.js`, template versionati | Due build identiche, 214 ID univoci e script validi | Completato per gli asset attuali |
| Sezioni IT/EN | Chiavi semantiche; etichette della traduzione stessa | Controllo completo delle 214 schede | Corretto l'abbinamento; classificazioni EN mancanti segnalate |
| Quiz scritto | Obiettivo esatto, riscrittura obbligatoria, primo errore persistente | Errore → correzione: punteggio 0/1, scheda apribile | Verificato |
| Ripetizioni nel quiz | Nomi normalizzati esclusi dopo il primo tentativo | Domanda successiva diversa | Parziale: sinonimi tra principi attivi non ancora riconciliati |
| Quiz di classe | Domande esplicitamente riferite alla scheda, non al mazzo come classe | Distrattori escludono schede contenenti lo stesso nome | Non sostituisce un'ontologia farmacologica verificata |
| Navigazione | Cinque destinazioni, tre documenti indipendenti conservati | Quiz → scheda → quiz senza perdere risposta | Verificato |
| Schermo mobile | Menu inferiore fuori dal contenitore filtrato; barra voti fuori dall'animazione | Test a 320, 360, 390, 430, 768, 1280 px | Verificato in Chromium |
| Backup | Versione 2: studio, errori quiz e impostazioni; validazione e copia precedente | Esportazione/importazione reale e rifiuto file alterato senza perdita | Verificato per i dati implementati; niente sincronizzazione cloud |
| Dati illeggibili | Blocco della sovrascrittura in studio e quiz | Validatori e messaggi espliciti | Implementato; recupero manuale da backup |
| Messaggi tra documenti | Controllo origine e finestra mittente; destinazione esatta su HTTP(S) | Percorsi integrati provati | Implementato; non è un audit di sicurezza completo |
| Ricerca | Nome esatto, marchio, prefisso, contesto; suggerimenti dichiarati; greco normalizzato | Paracetamolo primo; controlli beta2/β₂ e refuso | Sul catalogo didattico, non ancora sull'intero registro AIFA |
| 3D | Caricato entrando in Esplora; ciclo sospeso quando nascosto; fallback senza CDN | CDN bloccata: 81 bersagli e spiegazioni ancora navigabili | Parziale: qualità adattiva, perdita del contesto e sequenze a passi da completare |
| Guida iniziale | Dialogo nativo bilingue, saltabile e riapribile | Prima apertura, mancata ripetizione, replay | Implementato; non ancora tour ancorato ai singoli controlli |
| Registro AIFA | Importatore standard-library, validazione, hash, staging e duplicati | Due esecuzioni reali: 160.084 confezioni, secondo controllo invariato | Candidato locale verificato, non inserito nel catalogo pubblico |
| Ore 03:00 | Workflow Europe/Rome subordinato a `CATALOG_SYNC_ENABLED` | Configurazione presente; nessuna esecuzione remota | **Non attivo** |

## Fonte AIFA e significato dei numeri

Fonte: [Anagrafica ufficiale AIFA](https://www.aifa.gov.it/en-US/web/guest/liste-dei-farmaci), licenza [CC-BY 4.0](https://www.aifa.gov.it/open-data).

L'importazione del 9 ottobre contiene **160.084 confezioni**, **338.971 righe principio attivo/confezione**, **7.214 righe ATC**. I file dichiarano aggiornamento dell'8 ottobre, intorno alle 23:02 UTC. Sono record amministrativi, inclusi stati storici: non un conteggio di molecole attive, disponibilità in farmacia o terapie raccomandate. Le spiegazioni delle flashcard non sono state aggiornate automaticamente.

Il candidato compresso, la provenienza e il registro delle esecuzioni rimangono nella cartella locale `catalog-review/`, esclusa da Git. Il secondo controllo ha riletto il candidato, verificato l'hash e mantenuto la stessa versione. Errori di download o schema non sostituiscono il candidato precedente.

La [documentazione GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule) supporta il fuso Europe/Rome. L'orario è un obiettivo, non una garanzia: il servizio può ritardare o saltare esecuzioni. Non sono ancora implementati allarme indipendente, recupero dei giorni saltati, pubblicazione atomica del catalogo approvato o ripristino in produzione.

## Ancora da completare prima della release completa

1. Decisione esplicita sulla privacy: il repository e il sito risultavano pubblici nell'audit, in conflitto con la richiesta precedente di anonimato. Nessun push, cambio visibilità o rimozione delle firme è stato eseguito.
2. Collegare il registro AIFA alla ricerca, distinguendo ingrediente, prodotto e confezione; riconciliare sali, associazioni, marchi, classi e bersagli senza unioni approssimative. Il registro importato non è ancora disponibile nell'interfaccia.
3. Mettere in produzione il controllo giornaliero soltanto dopo l'approvazione del punto 1, con versione consultabile, recupero ultimo dato valido, avvisi di ritardo e prova reale del job.
4. Verificare fonti EMA/IUPHAR, relazioni farmacologiche, pagine bibliografiche e traduzioni. In questa fase non è stata effettuata una nuova revisione medica completa delle spiegazioni.
5. Completa navigazione bersaglio → stessa scheda → stesso quiz; ricerca unificata e filtri farmacologici verificati. I documenti sono ancora collegati tramite iframe, non riscritti in un framework.
6. Installazione/offline reale con service worker e aggiornamenti differiti; al momento i vecchi metadati PWA non dimostrano disponibilità offline.
7. Traduzione integrale della tabella, classificazioni EN mancanti, sequenze animate controllabili, qualità 3D e movimento ridotto completo.
8. Test WebKit/iPhone, zoom 200%, tastiera virtuale, contrasto/accessibilità automatica e lettore di schermo. Non equiparare i test Chromium a una verifica su iPhone.

## Come verificare localmente

Node 20 o successivo. Nessuna dipendenza necessaria per build e controlli dati:

```sh
npm run build
npm test
npm start
```

Aprire `http://127.0.0.1:8765`. Il server ascolta solo sul computer locale e serve esclusivamente i quattro documenti dell'app, non libri, estratti o backup.

Test browser: `tests/browser.cjs` richiede Playwright; in questa verifica è stato usato Playwright 1.62.1 già disponibile nell'ambiente con Chrome installato (`BROWSER_CHANNEL=chrome`). Non è stata aggiunta una dipendenza di produzione. Non esiste ancora un lockfile per un ambiente browser di CI riproducibile.

```sh
python3 tests/catalog.py
python3 build/sync-catalog.py
```

L'ultimo comando scarica circa 95 MB e prepara solo un candidato. Per ispezionare una copia usare `catalog-review/candidate.json` e `last-run.json`. Non attivare il workflow confondendo un candidato con una release approvata.

## File modificati e preservati

Modificati: `index.html`, `Canali-e-Recettori-3D.html`, i due HTML generati, `build/app-template.html`, `build/table-template.html`, `build/build.js`, `build/serve.js`, `.gitignore`, `.github/workflows/pages.yml`, `README.md`, `README.en.md`.

Aggiunti: `src/core.js`, `src/bridge.js`, `build/table.js`, `build/sync-catalog.py`, `.github/workflows/catalog-check.yml`, `package.json`, `tests/`, questa documentazione e le immagini in `implementation/`.

Preservati: i 214 ID delle carte, `build/cards.json`, arricchimenti, traduzioni originali, memofrasi, fonti private, licenza e file `SIGNATURE.*`. Le firme originali sono una fotografia storica della versione precedente: non certificano i nuovi file generati. I test usano un profilo browser isolato, non i progressi reali dello studente.
