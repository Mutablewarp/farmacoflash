# FarmacoFlash: audit e progetto di evoluzione

Data: 9 ottobre 2026. Repository: `Mutablewarp/farmacoflash`, branch `main`, commit `32e9e376e8e2152ca09b7dd1264b4676cfa915ec`.

## Conclusione

Il progetto contiene molto materiale utile e percorsi didattici già funzionanti. La priorità è rendere coerenti dati, navigazione e costruzione del sito. Un restyling da solo lascerebbe intatti errori nei quiz, etichette inglesi sbagliate e funzioni che si perdono ricostruendo l'app.

Consiglio una migrazione graduale a una sola applicazione mobile-first, con catalogo condiviso e aggiornamenti controllati. Conservare gli identificativi delle 214 carte e i progressi è un requisito, non un intervento successivo.

## Ambito e limiti dell'analisi

Ho inventariato i 91 file tracciati, controllato i flussi principali nei sorgenti, interrogato GitHub e provato il sito pubblicato in un browser di test a 390 × 844 px. Il riferimento locale coincide con quello remoto e all'inizio i file tracciati non avevano modifiche. Ho simulato la build in memoria, senza sovrascrivere l'app, e verificato integrità degli ID, collegamenti e sintassi degli script classici delle tre pagine HTML principali.

Questo è un audit strutturale e funzionale con prove rappresentative. Non è una certificazione di sicurezza, una revisione medica completa delle 214 carte, né un test su ogni telefono. Non ho misurato prestazioni su un iPhone fisico, eseguito un audit WCAG completo o validato la prova OpenTimestamps. I tre hash dei file in SIGNATURE.json coincidono con i file attuali.

Non ho modificato l'app, installato librerie, cambiato la visibilità, pubblicato aggiornamenti o attivato automazioni. I nuovi file sono solo nella cartella di audit e nei rapporti locali del browser.

## 1. Struttura attuale

| Parte | Contenuto e responsabilità |
|---|---|
| `index.html` | Contenitore con due iframe, cambio strumento, lingua e tema. |
| `Canali-e-Recettori-3D.html` | Circa 1,21 MB: modelli schematici Three.js, dati, testi IT/EN, animazioni e classificazioni nello stesso file. |
| `Flashcard-Farmacologia.html` | Circa 2,26 MB: applicazione e dati incorporati; 214 carte, 28 mazzi. |
| `Tabella-Farmaci.html` | Circa 0,59 MB: tabella, rubrica, ricerca e quiz. |
| `build/cards.json` | Carte con campi e segmenti testuali, ID e appartenenza ai mazzi. |
| `build/drugs.json`, `brands.json` | Nomi associati alle carte e alias commerciali; non un'anagrafica regolatoria completa. |
| `build/enrichments*.json`, `memo/`, `i18n/` | Approfondimenti, memofrasi e traduzioni. |
| `build/*template.html`, `build.js`, `parse.js` | Sorgenti e generazione parziale degli artefatti. |
| `.github/workflows/pages.yml` | Copia gli HTML già generati e li pubblica su GitHub Pages. |
| README, PRODUCT, LICENSE, SIGNATURE, screenshots | Guide, intenti di design, diritti, firme e 15 immagini dimostrative. |

Il sito è statico: non ci sono backend applicativo, account o servizio di aggiornamento dei farmaci. Lo studio vive nel browser, separato dal catalogo.

### Funzioni principali già presenti

- Flashcard con risposta, autovalutazione, ripetizione spaziata, nuove/ripasso/sessione mista, ordine casuale e selezione mirata.
- Registro delle risposte, statistiche, calendario e carte difficili.
- Tabella dei nomi, visualizzazione solo nomi/solo effetti, rubrica A–Z, quiz a scelta e scrittura dei nomi.
- Esploratore con 81 voci di bersagli visibili e 62 classificazioni espandibili. Una voce può raggruppare più sottotipi: non sono necessariamente 81 strutture molecolari distinte.
- Collegamenti farmaco → flashcard e passaggio tra 3D e studio.

### Funzioni secondarie da preservare

Tema chiaro/scuro, IT/EN nelle due applicazioni principali, memofrasi, diagrammi SVG, modelli esplosi, etichette selezionabili, sezione della membrana, tour delle parti del modello, animazioni dei meccanismi, confronto tra bersagli, Gs/Gi/Gq, CYP, antibiotici, simulazione orale, esportazione/importazione dei progressi flashcard.

Aspetti positivi verificati: zero ID carta duplicati, zero riferimenti inesistenti in drugs.json, tutte le 488 voci CARDMAP puntano a una carta esistente. Il 3D dichiara di mostrare schemi didattici, non strutture atomiche: questa distinzione va mantenuta.

## 2. Criticità ordinate per priorità

P0 = da correggere prima di ampliare o promuovere il prodotto. P1 = parte della prossima versione. P2 = miglioramento successivo.

| Priorità | Criticità e prova | Conseguenza / intervento |
|---|---|---|
| P0 | GitHub riporta **public**; il sito Pages è raggiungibile. Nei file SIGNATURE e nei watermark HTML compare un identificativo personale. | Contrasto con la precedente richiesta di anonimato. Decidere il perimetro di pubblicazione; mantenere la prova di paternità offline e valutare uno pseudonimo pubblico. Non modificare diritti o firme senza una decisione esplicita. |
| P0 | La build in memoria non coincide con Flashcard-Farmacologia.html; l'output generato non contiene il ponte `__fusion`, presente nell'HTML pubblicato. `build/_gen-table.js`, citato dal README, manca. | Una normale ricostruzione perde l'integrazione. Portare tutte le modifiche nei sorgenti e rendere ricostruibili le tre applicazioni. |
| P0 | Il quiz con target diazepam accetta lorazepam, mostra «Giusto, ma cercavo…» e assegna un punto. Anche una distanza ortografica di uno viene conteggiata come corretta. | Distinguerne l'esito: corretto, refuso da riscrivere, farmaco diverso. Non insegnare equivalenze scorrette. Il test non ha salvato risultati. |
| P0 | In BZD e glucocorticoidi ci sono 8 segmenti IT e 7 EN prima degli arricchimenti. `renderBack` associa le etichette per indice. Nel browser gli effetti avversi BZD appaiono sotto «Indications». | Associare contenuto e traduzioni tramite chiavi stabili; verificare tutte le intestazioni. |
| P0 | Su una risposta lunga la barra voti sta a circa y=5850 con viewport alto 844. Disattivando l'animazione del contenitore, il bordo inferiore torna a 844. | L'animazione con transform/fill mantiene un contenitore di posizionamento per i discendenti fixed. Separare la barra dall'antenato animato e testare inizio/fine risposta. |
| P1 | A 390 px il pulsante EN inizia a x=400,68; il tema è parzialmente fuori schermo. Alcuni comandi sono alti 27–35 px. | Navigazione mobile da riprogettare, con controlli raggiungibili e area di tocco di progetto almeno 44 px. |
| P1 | Cercare paracetamolo/Tachipirina restituisce 14 carte, con ASA e coxib prima della carta pertinente. `paracetmolo` dà 0; `β2` dà 42, `beta2` dà 0. | Indicizzare entità e alias; nome esatto prima delle citazioni nel testo; normalizzazione coerente e suggerimenti per errori. |
| P1 | drugs.json contiene 488 stringhe distinte e 591 occorrenze, derivate dalle carte. Non contiene un'anagrafica con AIC, stato, fonte e versione per prodotto. | Non chiamarlo «elenco completo aggiornato». Separare molecole, medicinali commerciali, confezioni, alias e materiale storico/d'esame. |
| P1 | La tabella farmaci interna al 3D usa un elenco fisso di sette canali, mentre l'esploratore contiene molti altri bersagli. Le ricerche 3D filtrano testo locale. | Il visitatore non trova tutti i collegamenti. Costruire una relazione condivisa farmaco–bersaglio, con ricerca unificata. |
| P1 | Aprire la tabella dalla shell sostituisce il documento nell'iframe flashcard. La tabella non gestisce il protocollo della shell, che continua a considerare pronto quel frame. | Lingua/tema e apertura di una carta dal 3D possono non raggiungere più FarmacoFlash. Usare routing comune e conservare il contesto di ritorno. |
| P1 | Il solo workflow pubblica su push, non contiene job giornalieri o controlli dati. I commenti dicono invece «solo manuale». | Correggere la documentazione e separare verifica, build, sincronizzazione dati e pubblicazione. |
| P1 | Manifest incorporato ma nessun service worker nei file o nel tree. Three.js e font arrivano da servizi esterni. | Non promettere installazione/offline affidabili sul telefono. Implementare cache versionata e verificare ricaricamento senza rete; i file locali sono un caso diverso. |
| P1 | Il modulo 3D importa Three.js staticamente. Il fallback dentro initThree non può intercettare il fallimento dell'import; cita inoltre un CDN diverso da quello usato. | La perdita di rete può bloccare l'intero modulo. Caricare il 3D su richiesta, con errore esplicito e vista testuale/2D disponibile. |
| P1 | Ciclo requestAnimationFrame continuo, post-processing e nessun controllo JS visibile per reduced-motion/visibilità nel loop. | Rischio consumo GPU e batteria; non misurato su dispositivo fisico. Pausa fuori vista, qualità adattiva e gestione perdita contesto WebGL. |
| P1 | Nodi cliccabili creati come div: chip, intestazioni espandibili, righe carte. Un contorno focus CSS non li rende raggiungibili da tastiera. | Usare button/details o semantica e tastiera complete; verificare modali, focus e lettore di schermo. |
| P1 | Export salva solo lo stato SRS, mentre errori quiz stanno in un'altra chiave. Import controlla quasi soltanto la presenza di `srs`. Il salvataggio quiz ignora gli errori. | Backup incompleto e rischio perdita/invalidazione dati. Backup unico versionato, validazione prima della sostituzione e messaggi di errore. |
| P1 | Messaggi tra frame accettati senza validare origin/source/schema; invii con destinazione `*`. `esc()` della tabella non protegge virgolette ma viene usato in un attributo value. | Correggere i confini di fiducia prima di importare dati esterni. Sono rischi di codice identificati, non una prova di furto dati. |
| P1 | Nessuna suite test o CI di validazione nel tree. JSON opzionali malformati possono essere ignorati da build.js. | Aggiungere test dei percorsi reali e far fallire la build su dati incompleti invece di pubblicare silenziosamente. |
| P1 | «Approfondimento verificato» e «linee guida aggiornate» non hanno un registro strutturato di verifica per affermazione. | Verificare fonti/edizioni/pagine, data e revisore. Questo audit non certifica l'accuratezza clinica di tutte le schede. |
| P2 | CSS stratificato con molte sovrascritture e contenuti duplicati tra JSON, HTML, traduzioni e file sorgente. | Consolidare token e moduli senza riscrivere il prodotto in un colpo solo. |
| P2 | Il server locale serve dalla radice repo, ascolta senza host esplicito e valida il percorso con un semplice startsWith. | Limitare a loopback e alla directory pubblicabile; validare percorsi e URI. Non è il server usato da GitHub Pages. |

Il tour già presente illustra parti del modello 3D: non sostituisce un onboarding iniziale che spieghi ricerca, ripasso, quiz, backup e limiti del catalogo.

## 3. Organizzazione proposta

Cinque sezioni sul telefono: **Oggi · Cerca · Studia · Esplora · Progressi**. Guida, lingua, tema e backup restano in un menu sempre raggiungibile. Il catalogo farmaci diventa parte di Cerca, non una pagina scollegata.

Percorso centrale: **farmaco → bersaglio → spiegazione/animazione → flashcard → quiz → ripasso mirato**. Indietro ripristina filtri, scorrimento e sessione. Nessun quiz si azzera perché si apre una spiegazione.

Ogni scheda farmaco distingue: identità e sinonimi; classificazione; bersagli diretti/indiretti; meccanismo; usi approvati e note di studio; effetti avversi; metabolismo/CYP; tolleranza; fonti e data. Per emivita separare molecola madre, metaboliti attivi, durata biologica e range dipendente dal contesto. Non presentare tutti i farmaci come ligandi diretti di un canale.

### Catalogo: che cosa significa completo

Per la prima versione: medicinali umani autorizzati in Italia presenti nell'anagrafica ufficiale selezionata, con un conteggio riconciliato a ogni import. Conservare revocati/storici con uno stato evidente e filtro dedicato. Integrare i medicinali EMA senza confondere l'autorizzazione europea con disponibilità commerciale o rimborsabilità italiana. Il materiale d'esame può comprendere molecole sperimentali e storiche, in un insieme distinto.

L'[anagrafica AIFA](https://www.aifa.gov.it/en-US/web/guest/liste-dei-farmaci) offre un CSV con informazioni regolatorie; le liste A/H o dei soli equivalenti non bastano per il catalogo generale. AIFA descrive la licenza dei propri [open data](https://www.aifa.gov.it/open-data). Verificare comunque licenza e schema dell'esatto file importato.

EMA offre [tabelle aggiornate durante la notte](https://www.ema.europa.eu/en/medicines/download-medicine-data). Per relazioni bersaglio-ligando valutare IUPHAR/BPS: il [download](https://www.guidetopharmacology.org/download.jsp) durante la verifica rinvia a una pagina di login, quindi accesso e condizioni d'uso vanno risolti prima di promettere un'integrazione automatica. Non inventare un'API pubblica.

### Aggiornamenti delle 03:00

Un job sul servizio di hosting o su GitHub controlla ogni giorno alle **03:00 Europe/Rome**, anche con telefoni e Mac spenti. Un timer nel browser non basta. Il controllo quotidiano non è tempo reale e non crea nuovi dati se la fonte non li ha pubblicati.

Flusso: scarica → verifica formato e provenienza → confronta → isola anomalie → pubblica uno snapshot valido → registra l'esito. Per variazioni cliniche o testo generato serve una revisione prima della pubblicazione. Conservare l'ultimo snapshot valido in caso di errore, mostrare ritardi e distinguere «controllato oggi» da «fonte aggiornata il…».

Le [istruzioni attuali di GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) supportano timezone IANA, ma avvertono che i job possono ritardare o essere scartati e che nelle repo pubbliche possono disattivarsi dopo inattività. Servono monitoraggio, recupero e verifica del primo run; nessuna promessa di puntualità al secondo.

### Grafica e tutorial

Mantenere crema, accento oro e titoli editoriali già presenti; ridurre il rumore e riutilizzare i disegni quando spiegano un meccanismo. Testo leggibile, tabelle semplificate su telefono, controlli con etichette, stato attivo evidente. Non aggiungere gradienti, effetti o decorazioni per riempire spazio.

Tutorial proposto, circa un minuto, saltabile e riapribile:

1. **Benvenuto.** «Cerca un farmaco, capisci come agisce e ripassalo.» Pulsanti Inizia/Salta.
2. **Cerca.** «Puoi usare il principio attivo, il nome commerciale o un bersaglio. I filtri restringono i risultati.»
3. **Esplora.** «Ruota il modello, tocca un'etichetta e avvia il meccanismo. Se preferisci, passa alla spiegazione 2D.»
4. **Studia.** «Prova a rispondere prima di girare la carta. Scegli nuove, ripasso o entrambe e valuta ciò che ricordi.»
5. **Scrivi e recupera.** «Scrivi il nome, correggi gli errori e apri la scheda collegata. In Progressi scegli cosa ripassare.»
6. **Conserva il lavoro.** «Esporta un backup. Controlla la data delle fonti: il materiale serve allo studio, non a decidere una terapia.»

Ogni passo offre Avanti, Indietro e Salta. Gli esempi non modificano il punteggio; il completamento è memorizzato per versione. Non mostrare i sei passi a ogni visita.

## 4. Strumenti consigliati, non installati

| Risorsa verificata | Uso mirato |
|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) | Revisione e rifinitura del design; leggere e verificare le skill prima di installarle. |
| [Frontend Design](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) | Direzione visiva, subordinata alla leggibilità e all'identità esistente. |
| [Humanizer](https://github.com/blader/humanizer) | Revisione stilistica opzionale. Non cambiare fatti farmacologici, citazioni o gradi di certezza. |
| [MiniSearch](https://github.com/lucaong/minisearch) | Ricerca locale con ranking, prefissi e tolleranza ai refusi se il benchmark ne conferma l'utilità. |
| [Driver.js](https://github.com/nilbuild/driver.js) | Tour ancorato agli elementi, solo se un tutorial nativo più semplice non basta. |
| [Playwright](https://github.com/microsoft/playwright) e [axe-core](https://github.com/dequelabs/axe-core) | Test di percorsi e accessibilità; non sostituiscono verifica manuale e su telefono reale. |
| [Mol*](https://github.com/molstar/molstar) | Solo per un futuro livello atomico basato su strutture documentate; mantenere Three.js per gli schemi attuali. |

I dati di strutture PDB hanno condizioni pubblicate da [RCSB](https://www.rcsb.org/pages/usage-policy); associare struttura, specie, stato e fonte. Nessuna animazione inventata deve essere presentata come misura sperimentale.

Canva/Figma possono servire per storyboard o disegni, senza caricare fonti private. Non sono necessari per correggere layout, ricerca e dati. Un prompt non può abilitare plugin o credenziali assenti: deve rilevare ciò che è disponibile e dichiarare i blocchi.

Le skill di pianificazione, UI/UX e revisione della prosa hanno guidato questo documento: priorità misurabili, controlli mobile, testo senza promesse assolute. Ho conservato la palette esistente anziché applicare la palette generica proposta dal helper UI.

## 5. Ordine di esecuzione consigliato

1. Risolvere decisione privacy, build, punteggio quiz, etichette EN e barra studio; aggiungere test di regressione.
2. Unificare entità/ID, ricerca e navigazione. Preservare backup e progressi con migrazione reversibile.
3. Integrare catalogo ufficiale, provenienza e job delle 03:00, provando errore, recupero e rollback.
4. Rifinire mobile, 3D su richiesta, modalità 2D/offline e tutorial. Verificare IT/EN e temi con screenshot.

Non aggiungerei ora social network, chatbot clinico, docking simulato o gamification competitiva. Il valore maggiore è trovare il farmaco giusto, comprenderlo e ripassare gli errori senza perdere il contesto.

Il file `IMPLEMENTATION-PROMPT-EN.md` trasforma queste decisioni in una consegna di sviluppo con criteri di accettazione. Richiede software funzionante e prove, non soltanto un mockup.
