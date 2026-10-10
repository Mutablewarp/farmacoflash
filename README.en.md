<div align="center">

# FarmacoFlash
### Pharmacology for the exam: flashcards + 3D atlas

**Open the app: [mutablewarp.github.io/farmacoflash](https://mutablewarp.github.io/farmacoflash/)**

🇬🇧 **English** · 🇮🇹 [Italiano](README.md)

![app](https://img.shields.io/badge/web%20app-desktop%20%C2%B7%20phone-835c14?style=flat-square)
![offline](https://img.shields.io/badge/offline-yes%20(after%20first%20visit)-2f7d5f?style=flat-square)
![language](https://img.shields.io/badge/language-IT%20%C2%B7%20EN-4a4a4a?style=flat-square)
![data](https://img.shields.io/badge/data-on%20device%20only-4a4a4a?style=flat-square)

</div>

<p align="center">
  <img src="screenshots/01-oggi.png" alt="FarmacoFlash home screen" width="86%">
</p>

## What is inside

| | Section | What it does |
|:--:|---|---|
| 📇 | **Flashcards** | Spaced-repetition cards across the whole syllabus (general and systematic pharmacology), each with a verified in-depth note. Inside: **Today**, **Study**, **Browse**, **Names table** with typing quizzes, **Progress**. |
| 🧬 | **3D Atlas** | Ion channels, receptors and GPCRs as rotatable models; for each target the drugs, the mechanism, 62 exam classifications and a link to the card. |
| 🔔 | **Updates** | Every night: safety notices (EMA, AIFA, FDA) and new guidelines (PubMed). Affected cards show a notice linking the source; content is only corrected after review. |

The **Home** screen shows the cards due today, the syllabus by module and the latest updates.
The **?** button starts a **guided tour** that points at the real buttons.

## Getting started

1. Open the link above (desktop or phone).
2. Take the guided tour (one minute).
3. **Flashcards → Study**: read the drug, answer in your head, flip the card, rate your recall.

**Install on your phone:** iPhone → Safari → Share → *Add to Home Screen*. Android → Chrome → ⋮ → *Install app*.
After the first visit it also works offline.

## Privacy
Progress stays **only in your browser**: no account, no server. To switch devices use
**Progress → Export backup**, then *Import* on the other one.

## Development
```bash
npm run build   # rebuild flashcards, table and syllabus
npm test        # data, syntax, build and feed checks
npm start       # local preview at http://127.0.0.1:8765
```
Rules, structure and workflow: [CLAUDE.md](CLAUDE.md) (Italian). Every push to `main` publishes the site.

## Notes
For **personal study**: the notes summarise *Goodman & Gilman, 14th ed.* and PubMed literature and do **not**
replace the textbook or clinical judgement.

<div align="center"><sub>Study tool · not clinical decision support</sub></div>
