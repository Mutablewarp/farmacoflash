<div align="center">

# 🧬💊 Pharmacology
### Integrated study — 3D + Flashcards

Explore drug targets in **3D** and lock them into memory with **spaced‑repetition flashcards**. Two tools, one window, one look.

🇬🇧 **English** · 🇮🇹 [Italiano](README.md)

![single‑file](https://img.shields.io/badge/single--file-HTML-835c14?style=flat-square)
![offline](https://img.shields.io/badge/offline-yes-2f7d5f?style=flat-square)
![language](https://img.shields.io/badge/language-IT%20%C2%B7%20EN-4a4a4a?style=flat-square)
![data](https://img.shields.io/badge/data-on%20device%20only-4a4a4a?style=flat-square)
![3D](https://img.shields.io/badge/WebGL-Three.js-835c14?style=flat-square)

</div>

<p align="center">
  <img src="screenshots/01-oggi.png" alt="FarmacoFlash — Today screen" width="86%">
</p>

---

## ✨ Two tools, one window

|  | Tool | What it does |
|:--:|---|---|
| 🧬 | **Targets & Drugs in 3D** | Channels and receptors as **rotatable 3D models**, the **drugs** per target, mechanism **animations** and **62 exam classifications** with up‑to‑date guidelines. |
| 📇 | **FarmacoFlash** | **214 spaced‑repetition flashcards**, each with a **verified in‑depth note** (*Goodman & Gilman 14th ed.* + PubMed). |

Switch with the **tabs at the top**; from any drug in 3D, **jump to its flashcard** in one click. Theme and language apply to both.

---

## 🚀 First run (after you download the repo)

Nothing to install — these are web pages that open in your browser.

1. **Download** — green **`Code → Download ZIP`** (or `git clone`).
2. **Unzip** it.
3. **Open `index.html`** (double‑click). Done. ✦

> [!TIP]
> Keep all files **in the same folder**: `index.html` loads the others.
> **3D** and **fonts** are fetched online on first run; **flashcards work offline**.

<details>
<summary><b>🧬 Inside the 3D explorer</b></summary>

- **Explorer** by family (voltage‑gated, nicotinic, glutamate, GPCRs…): tap a target → **360° 3D model**, description and drugs.
- **Mechanism animations**, **comparison table**, **Gs/Gi/Gq ligands**, **CYP450 interactions**, **antibiotics** map.
- **62 expandable classifications** with **guidelines** (📋) and key points (★).
</details>

<details>
<summary><b>📇 Using the flashcards</b></summary>

1. **▶ Start** from **Today**: a drug appears, think of the answer.
2. **Flip** and **rate** (😖 / 😐 / 😄 / 🌟): the app reschedules it (Anki‑style spaced repetition).
3. **Browse & search** by name, mechanism or effect; **📋 Names table** to memorize; **Stats** for progress.
4. **⬇ Export backup** to move data to another device.
</details>

<details>
<summary><b>📲 Install as an app (offline)</b></summary>

- **iPhone:** open in **Safari** → **Share** → **Add to Home Screen**.
- **Android / Chrome:** **⋮** menu → **Install app**.
</details>

---

## 🖼️ Preview

| Today | Study | Stats |
|:--:|:--:|:--:|
| ![Today](screenshots/01-oggi.png) | ![Study](screenshots/02-studio-fronte.png) | ![Stats](screenshots/05-statistiche.png) |

---

## 📁 Structure

```
index.html                    ← OPEN THIS · home with both apps
Canali-e-Recettori-3D.html    ← Targets & Drugs in 3D
Flashcard-Farmacologia.html   ← FarmacoFlash (single‑file, offline, installable)
Tabella-Farmaci.html          ← names table
screenshots/ · build/         ← images · sources and scripts
```

## 🔒 Privacy
Study data stays **only in your browser** (no server, no account). Move it with **Export/Import backup**.

## 🛠️ Developers
```bash
node build/build.js          # → Flashcard-Farmacologia.html
node build/_gen-table.js     # → Tabella-Farmaci.html
```

## ⚠️ Notes
For **personal study only**: notes are summaries (citing *Goodman & Gilman 14th ed.* + PubMed) and do **not** replace the textbook or clinical judgment.

<div align="center"><sub>Study tool · not clinical decision support</sub></div>
