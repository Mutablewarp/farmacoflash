# 🧬💊 Pharmacology — integrated study app

🇬🇧 English (this file) · 🇮🇹 **[Versione italiana → README.md](README.md)**

**One app to study pharmacology.** Two linked tools, in the same window, with the same look:

| | Tool | What it does |
|---|---|---|
| 🧬 | **Targets & Drugs in 3D** | Explore channels and receptors as **rotatable 3D models**, see the **drugs** for each target, mechanism **animations** and **62 exam classifications** with guidelines. |
| 📇 | **FarmacoFlash** | **Spaced-repetition flashcards**: 214 cards, 28 decks, each with an in-depth note verified against *Goodman & Gilman 14th ed.* + PubMed. |

Switch between them with the **tabs at the top**; from any drug in 3D, **jump to its flashcard** in one click. Runs **in the browser**, your data stays **only on your device**.

---

## 🚀 First run (after you download the repo)

Nothing to install — these are web pages that open in your browser.

1. **Download the repo.** On GitHub: green **`Code` → Download ZIP**.
   *(Or, in a terminal: `git clone https://github.com/Mutablewarp/farmacoflash.git`)*
2. **Unzip it** (double-click the downloaded file).
3. **Open `index.html`** (double-click): it opens in your browser (Safari, Chrome, Firefox…).
4. **Done.** The top bar has two tabs: **🧬 Targets & Drugs 3D** and **📇 FarmacoFlash**. Tap a tab to switch. The **☀/☾** (theme) and **IT/EN** (language) buttons apply to both.

> ⚠️ **Keep all files in the same folder.** `index.html` loads the others (`Canali-e-Recettori-3D.html`, `Flashcard-Farmacologia.html`, `Tabella-Farmaci.html`): moving them breaks the links.

> 🌐 **Do I need internet the first time?** The **3D models** and **fonts** are fetched online, so 3D needs a connection. The **flashcards work offline**. After the first load the browser caches the content.

> 💻 **Prefer a link?** You can publish it on GitHub Pages (see *Developers*): it becomes a site at `https://mutablewarp.github.io/farmacoflash/`.

---

## 🧬 Targets & Drugs in 3D

- **Explorer**: ion channels and receptors grouped by family (voltage-gated, nicotinic, glutamate, GPCRs…). Tap a target → **360° rotatable 3D model**, description, and the **drugs** acting on it.
- **Mechanism animations**, **comparison table**, **Gs/Gi/Gq ligands**, **CYP450 interactions**, **antibiotics** map, **drugs** view.
- **Classifications**: 62 expandable exam classifications with **up-to-date guidelines** (📋) and key points (★), grounded in the course lectures.
- From any drug, the **📇** button opens its **flashcard** in FarmacoFlash.

## 📇 FarmacoFlash — how to use

1. **▶ Start** from the **Today** screen: a drug name appears, think of the answer.
2. **Flip the card** (tap) → read the explanation.
3. **Rate it**: 😖 Bad → comes back now · 😐 So-so → soon · 😄 Good → in a few days · 🌟 Easy → much later. *(The app schedules reviews for you — Anki-style spaced repetition.)*
4. **Session** your way: Both · 🆕 New only · 🔁 Review only · 🔥 Hard. Or tap **🗂 choose what to review** to pick by hand.
5. **Browse** to search a drug (name, mechanism, effect). **📋 Names table** to memorize them (🧠 Names only / 💊 Effects only / 🔤 A→Z views + quizzes).
6. **Stats**: retention, streak 🔥, cards to reinforce. **⬇ Export backup** to move progress to another device (**⬆ Import**).

## 📲 Install as an app (offline)

Flashcards work without internet, no account.

- **iPhone:** open the file in **Safari** → **Share** → **Add to Home Screen**.
- **Android / Chrome:** open the file → **⋮** menu → **Install app**.

---

## 🔒 Privacy

Study data lives **only in your browser/device** (no server, no account). Move it with **Export/Import backup**.
⚠️ GitHub Pages on the free plan is **public** even with a private repo: the included Pages workflow is **manual** and does not run on its own.

## 📁 Structure

```
index.html                    ← OPEN THIS — single home with both apps (tabbed shell)
Canali-e-Recettori-3D.html    ← Targets & Drugs in 3D
Flashcard-Farmacologia.html   ← FarmacoFlash (single-file, offline, installable)
Tabella-Farmaci.html          ← names table (linked to the flashcards)
Flashcards_*.md / *.rtf       ← card sources (lecture notes)
screenshots/                  ← images for this README
build/                        ← templates, data, build scripts
```

> The apps share theme and language and open inside `index.html`; they also still work if opened individually.

## 🛠️ Developers

```bash
node build/build.js          # → Flashcard-Farmacologia.html
node build/_gen-table.js     # → Tabella-Farmaci.html
```

`build/`: `app-template.html`, `table-template.html`, `cards.json`, `memo/*.json`, `enrichments.json` (+ `-en`), `i18n/`, `pwa-head.js`, icons. Data injected as base64 (single-file).

**Publish online (GitHub Pages):** Settings → Pages → Source: *GitHub Actions*, then Actions → *Deploy FarmacoFlash (Pages)* → *Run workflow*. It publishes `index.html` (the unified home) with both apps.

## ⚠️ Notes

- For **personal study only**. Mnemonics and notes are summaries: they do **not** replace the textbook or clinical judgment.
- Notes cite *Goodman & Gilman, 14th ed.* and PubMed (PMIDs checked). When in doubt, **verify in the book**.
