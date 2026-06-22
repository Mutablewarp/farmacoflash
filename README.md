# 🧬💊 Farmacologia · UniPa — studio integrato

🇮🇹 Italiano (questo file) · 🇬🇧 **[English version → README.en.md](README.en.md)**

**Un'unica app per studiare farmacologia.** Due strumenti collegati, nella stessa finestra, con la stessa grafica:

| | Strumento | A cosa serve |
|---|---|---|
| 🧬 | **Bersagli & Farmaci in 3D** | Esplori canali e recettori in **modelli 3D ruotabili**, vedi i **farmaci** per ogni bersaglio, le **animazioni** dei meccanismi e **62 classificazioni** d'esame con linee guida. |
| 📇 | **FarmacoFlash** | **Flashcard** a ripetizione spaziata: 214 card, 28 mazzi, ognuna con un approfondimento verificato (*Goodman & Gilman 14ª ed.* + PubMed). |

Passi da uno all'altro con le **linguette in alto**; da un farmaco nel 3D **salti alla sua flashcard** con un clic. Funziona **nel browser**, i tuoi dati restano **solo sul tuo dispositivo**.

---

## 🚀 Come iniziare la prima volta (dopo aver scaricato la repo)

Non c'è niente da installare: sono pagine web che si aprono nel browser.

1. **Scarica la repo.** Su GitHub: pulsante verde **`Code` → Download ZIP**.
   *(In alternativa, da terminale: `git clone https://github.com/Mutablewarp/farmacoflash.git`)*
2. **Estrai lo ZIP** (doppio clic sul file scaricato).
3. **Apri `index.html`** con un doppio clic: si apre nel browser (Safari, Chrome, Firefox…).
4. **Fatto.** Vedi la barra in alto con le due linguette: **🧬 Bersagli & Farmaci 3D** e **📇 FarmacoFlash**. Tocca una linguetta per cambiare strumento. I pulsanti **☀/☾** (tema) e **IT/EN** (lingua) valgono per entrambi.

> ⚠️ **Tieni tutti i file nella stessa cartella.** `index.html` carica gli altri file (`Canali-e-Recettori-3D.html`, `Flashcard-Farmacologia.html`, `Tabella-Farmaci.html`): se li sposti, i collegamenti si rompono.

> 🌐 **Serve internet la prima volta?** I **modelli 3D** e i **caratteri** si scaricano da internet, quindi per il 3D serve connessione. Le **flashcard funzionano anche offline**. Una volta caricato, il browser tiene in cache i contenuti.

> 💻 **Preferisci aprirla da un link?** Puoi pubblicarla su GitHub Pages (vedi *Sviluppatori*): diventa un sito da aprire all'indirizzo `https://mutablewarp.github.io/farmacoflash/`.

---

## 🧬 Bersagli & Farmaci in 3D

- **Esploratore**: canali ionici e recettori raggruppati per famiglia (voltaggio-dipendenti, nicotinici, glutammato, GPCR…). Tocca un bersaglio → **modello 3D ruotabile a 360°**, descrizione, e i **farmaci** che ci agiscono.
- **Animazioni · meccanismi**, **Tabella comparativa**, **Liganti Gs/Gi/Gq**, **Interazioni · CYP450**, **Antibiotici** (mappa), **Farmaci**.
- **Classificazioni**: 62 classificazioni d'esame espandibili, con **linee guida aggiornate** (📋) e i punti-chiave (★), basate sulle sbobine del corso.
- Da ogni farmaco, il pulsante **📇** apre la **flashcard** corrispondente in FarmacoFlash.

## 📇 FarmacoFlash — come si usa

1. **▶ Inizia** dalla schermata **Oggi**: compare il nome di un farmaco, pensa la risposta.
2. **Gira la card** (tocca) → leggi la spiegazione.
3. **Valuta** con un faccino: 😖 Male → torna subito · 😐 Così così → presto · 😄 Bene → tra qualche giorno · 🌟 Facile → tra molto. *(L'app decide da sola quando rifartela — ripetizione spaziata stile Anki.)*
4. **Sessione** su misura: Entrambe · 🆕 Solo nuove · 🔁 Solo ripasso · 🔥 Difficili. Oppure tocca il riquadro **🗂 scegli quali ripassare** per selezionarle a mano.
5. **Sfoglia** per cercare un farmaco (nome, meccanismo, effetto). **📋 Tabella dei nomi** per memorizzarli (viste 🧠 Solo nomi / 💊 Solo effetti / 🔤 A→Z + quiz).
6. **Statistiche**: ritenzione, costanza 🔥, carte da rinforzare. **⬇ Esporta backup** per spostare i progressi su un altro dispositivo (**⬆ Importa**).

## 📲 Installa come app sul telefono (offline)

Le flashcard funzionano senza internet, senza account.

- **iPhone:** apri il file in **Safari** → **Condividi** → **Aggiungi a Home**.
- **Android / Chrome:** apri il file → menù **⋮** → **Installa app**.

---

## 📸 Schermate (FarmacoFlash)

| Oggi | Studio: gira la card | Risposta + valuti |
|---|---|---|
| ![Oggi](screenshots/01-oggi.png) | ![Studio fronte](screenshots/02-studio-fronte.png) | ![Risposta](screenshots/03-studio-risposta.png) |

| Sfoglia & cerca | Statistiche | Tabella dei nomi |
|---|---|---|
| ![Sfoglia](screenshots/04-sfoglia.png) | ![Statistiche](screenshots/05-statistiche.png) | ![Tabella](screenshots/09-tabella-tutto.png) |

---

## 🔒 Privacy

I dati di studio vivono **solo nel tuo browser/dispositivo** (nessun server, nessun account). Per spostarli usa **Esporta/Importa backup**.
⚠️ GitHub Pages su piano gratuito è **pubblico** anche con repo privato: il workflow Pages incluso è **manuale** e non parte da solo.

## 📁 Struttura

```
index.html                    ← APRI QUESTO — home unica con le due app (shell a linguette)
Canali-e-Recettori-3D.html    ← Bersagli & Farmaci in 3D
Flashcard-Farmacologia.html   ← FarmacoFlash (single-file, offline, installabile)
Tabella-Farmaci.html          ← tabella dei nomi (collegata alle flashcard)
Flashcards_*.md / *.rtf       ← sorgenti delle card (sbobine)
screenshots/                  ← immagini di questo README
build/                        ← template, dati, script di build
```

> Le app condividono tema e lingua e si aprono dentro `index.html`; restano comunque utilizzabili anche aprendole singolarmente.

## 🛠️ Sviluppatori

```bash
node build/build.js          # → Flashcard-Farmacologia.html
node build/_gen-table.js     # → Tabella-Farmaci.html
```

`build/`: `app-template.html`, `table-template.html`, `cards.json`, `memo/*.json`, `enrichments.json` (+ `-en`), `i18n/`, `pwa-head.js`, icone. Dati iniettati in base64 (single-file).

**Pubblicare online (GitHub Pages):** Settings → Pages → Source: *GitHub Actions*, poi Actions → *Deploy FarmacoFlash (Pages)* → *Run workflow*. Pubblica `index.html` (la home unificata) con le due app.

## ⚠️ Note

- Materiale a **uso personale di studio**. Memofrasi e approfondimenti sono sintesi: **non** sostituiscono il libro né il giudizio clinico.
- Gli approfondimenti citano *Goodman & Gilman, 14ª ed.* e PubMed (PMID controllati). In caso di dubbio, **verifica sul libro**.
