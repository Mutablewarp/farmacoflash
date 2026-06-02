# 💊 FarmacoFlash

🇮🇹 Italiano (questo file) · 🇬🇧 **[English version → README.en.md](README.en.md)**

**Flashcard interattive di Farmacologia** — ripetizione spaziata, memofrasi d'impatto e disegni esplicativi disegnati a mano. Tutto in **un unico file HTML**, funziona **offline**, i progressi restano sul dispositivo.

> 214 card · 28 mazzi · estratte dalle sbobine (Moduli I–II) · ogni card ha un **approfondimento verificato** su *Goodman & Gilman, 14ª ed.* e **PubMed**

---

## 📸 Screenshot

| Oggi (dashboard) | Studio — fronte con diagramma | Risposta completa |
|---|---|---|
| ![Dashboard](screenshots/01-oggi.png) | ![Fronte eicosanoidi](screenshots/03-fronte-eicosanoidi.png) | ![Risposta completa](screenshots/02-risposta-completa.png) |

| Sfoglia | Statistiche |
|---|---|
| ![Sfoglia](screenshots/04-sfoglia.png) | ![Statistiche](screenshots/05-statistiche.png) |

**Diagrammi-meccanismo disegnati a mano** (su 43 card chiave):

| Antibiotici — ribosoma 30S/50S | Antiaritmici — Vaughan-Williams | Anticorpi — nomenclatura | Diabete — canale K-ATP |
|---|---|---|---|
| ![antibiotici](screenshots/06-diagramma-antibiotici.png) | ![antiaritmici](screenshots/07-diagramma-antiaritmici.png) | ![anticorpi](screenshots/08-diagramma-anticorpi.png) | ![diabete](screenshots/09-diagramma-diabete.png) |

---

## ✨ Cosa fa

- **Ripetizione spaziata (SM-2, stile Anki)** — valuti ogni card *Male / Così così / Bene / Facile* e l'app ricalcola quando rivederla.
- **Ordine casuale** 🔀 — un interruttore per studiare le card mescolate, senza seguire l'ordine del mazzo (più un tasto 🔀 in studio per rimescolare al volo).
- **Tracciamento giornaliero** — quante card hai studiato, com'è andata oggi, heatmap dei giorni di studio, streak 🔥.
- **Memofrase d'impatto** su post-it — una frase secca per card che fissa il concetto chiave.
- **Approfondimento su ogni card** (📘) — una nota clinica d'esame verificata su *Goodman & Gilman, 14ª ed.* e **PubMed** (PMID citati), distinta e complementare alla risposta base.
- **Disegni a mano esplicativi** — un'illustrazione per ogni argomento (sinapsi, nefrone, batterio, cuore…) e **30 diagrammi-meccanismo su 43 card chiave**: cascata COX/eicosanoidi, canale K-ATP, GLUT4, AMPK, SGLT2, scala OMS del dolore, recettore μ, GABA-A, RAAS, statine, emostasi, triade anestesia, vie dopaminergiche, classi di Vaughan-Williams, pompa protonica, PBP/β-lattamici, ribosoma 30S/50S, via dei folati, reuptake SSRI, siti diuretici, checkpoint immunitario, nomenclatura mAb, classi di Ambler, L-DOPA/carbidopa, eparina-ATIII, warfarin/VKOR, nitrati→NO, bifosfonati, incretine GLP-1, MAO/tiramina.
- **Sfoglia & cerca** full-text per nome, meccanismo, target o reazione avversa.
- **Statistiche** — composizione del mazzo, padronanza per argomento, ritenzione.
- **Backup** — export/import dei progressi in JSON.
- **Ottimizzata per Safari / iPhone** — safe-area, niente zoom al focus, *Aggiungi a Home* come web-app.

## 🚀 Come si usa

1. Apri **`Flashcard-Farmacologia.html`** con doppio clic (Safari/Chrome). Funziona offline.
2. Su iPhone: AirDrop del file → aprilo in Safari → **Condividi › Aggiungi a Home**.
3. I progressi sono salvati nel browser. Per spostarli su un altro dispositivo usa **Esporta backup** in *Statistiche* e poi **Importa** sull'altro.

### 📲 Installa come app (PWA, offline, privata)

Sia `Flashcard-Farmacologia.html` sia `Tabella-Farmaci.html` sono **app installabili**: icona dedicata 💊, schermo intero (senza barre del browser), funzionano **offline** e restano **private** (nessun server, nessun account).

- **iPhone (Safari):** trasferisci il file (AirDrop / app File) → aprilo → **Condividi › Aggiungi a Home**. Parte come app a schermo intero con la sua icona. *(Per un'installazione PWA "piena" con cache offline garantita, apri il file una volta da un indirizzo locale del Mac sulla stessa rete — es. `python3 -m http.server` nella cartella — poi Aggiungi a Home: da lì funziona offline.)*
- **Android/desktop (Chrome):** apri il file → menu ⋮ → **Installa app / Aggiungi a schermata Home**.

> Le due app sono collegate: dalla **Tabella** tocchi un farmaco → si apre la sua **scheda di studio** in FarmacoFlash; dalla dashboard di FarmacoFlash il pulsante **📋 Tabella dei nomi** riapre la tabella. Tienile **nella stessa cartella** perché i collegamenti funzionino offline.

### Deep-link (utile per condividere/screenshot)
`…Flashcard-Farmacologia.html#dash` · `#browse` · `#stats` · `#card=<id>` · `#front=<id>`

## 🛠️ Build (rigenerare il file)

```bash
node build/build.js
```

- `build/parse.js` → estrae le card dai `.md` / `.rtf` in `build/cards.json`
- `build/memo/*.json` → le memofrasi
- `build/enrichments.json` → approfondimenti dal Goodman & Gilman
- `build/app-template.html` → l'app (CSS + JS + disegni) con il segnaposto `__DATA_B64__`
- `build/build.js` → unisce tutto e scrive `Flashcard-Farmacologia.html` (dati iniettati in base64)

## 📁 Struttura

```
Flashcard-Farmacologia.html     ← l'app pronta (single-file, offline)
Flashcards_*.md / *.rtf         ← sorgenti delle card (sbobine)
build/                          ← parser, template, dati, script di build
  app-template.html  parse.js  build.js  cards.json
  memo/*.json        enrichments.json
screenshots/                    ← immagini per questo README
task_plan.md / notes.md         ← piano e appunti di lavoro
```

## 📲 Aprire ovunque (mantenendo il repo privato)

- **Offline (consigliato)** — apri `Flashcard-Farmacologia.html` sul dispositivo; su iPhone *Condividi › Aggiungi a Home*. Niente internet, niente account.
- **Sync via repo privato** — su un altro computer:
  ```bash
  gh repo clone Mutablewarp/farmacoflash
  open "farmacoflash/Flashcard-Farmacologia.html"   # macOS
  ```
  per aggiornare: `git pull`. (I *progressi* di studio restano locali al browser: usa **Esporta/Importa backup** per spostarli.)
- **GitHub Pages** — è incluso il workflow `.github/workflows/pages.yml` (avvio **manuale**). ⚠️ Su piano gratuito un sito Pages è **pubblico** anche con repo privato; per un sito **privato** serve GitHub Pro/Team. Per questo il workflow non parte da solo: pubblichi solo se lo avvii tu di proposito.

## ⚠️ Note

- Materiale a **uso personale di studio**. Le memofrasi sono sintesi mnemoniche, non sostituiscono il libro di testo né il giudizio clinico.
- Dati estratti dalle proprie sbobine. Ogni card ha un approfondimento con citazioni verificate su *Goodman & Gilman, 14ª ed.* e **PubMed** (i PMID sono stati controllati uno a uno; qualche citazione è di contesto più che diretta). Restano sintesi di studio: verifica sempre sul libro.

🤖 Costruita con [Claude Code](https://claude.com/claude-code)
