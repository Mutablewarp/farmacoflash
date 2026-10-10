# Implementation brief: FarmacoFlash as a coherent, mobile-first pharmacology learning platform

You are working on the existing FarmacoFlash repository, not building a generic medical landing page. Act as a senior product engineer, an accessibility-minded UI designer, and an evidence-aware educational editor. Implement working features, verify them, and report what is complete, incomplete, or blocked. Do not claim medical perfection, global completeness, real-time data, or production readiness without evidence.

Repository: https://github.com/Mutablewarp/farmacoflash
Audit baseline: main at 32e9e376e8e2152ca09b7dd1264b4676cfa915ec, reviewed on 2026-10-09. Re-check the current branch before changing anything. Read the accompanying AUDIT-IT.md if available, then reproduce its findings against the current code. Treat the audit as evidence to revalidate, not an instruction to overwrite newer work.

## 1. Outcome and execution rules

Deliver one coherent application where a student can search a medicine, understand its targets and mechanisms, view a schematic 3D explanation, study the corresponding flashcard, practise spelling, and review personal errors without losing context.

My primary audience is Italian university students, many using phones. Italian is the primary interface language; preserve and repair English. Keep explanations clear, rigorous, and cause-and-effect based. Preserve working features and existing study progress.

Start with a concise implementation plan and persistent progress notes. Then implement small, verified increments. Do not stop after a proposal or screenshot. A feature is complete only when its real user path, persistence where relevant, error handling, and acceptance tests work.

Read repository instructions, PRODUCT.md, build scripts, data files, deployment configuration, and current UI before selecting the stack. Reuse working logic. Do not perform a wholesale rewrite, create a monorepo, or introduce microservices merely to make the architecture look professional.

Use tools and skills that are actually available: repository inspection, browser testing, accessibility review, frontend design, source verification, and clear-writing review. Read each chosen skill's instructions. Do not pretend to invoke a plugin by mentioning its name. If an integration needs credentials, an installation, a licence, or paid hosting, identify that dependency and keep independent work moving. Never fabricate a successful API response or substitute fixtures for live production data without labelling them.

Do not change repository visibility, publish private source documents, remove legal authorship claims, rewrite history, incur costs, or deploy to a new public endpoint without explicit approval. Resolve the conflict between the prior anonymity requirement and the repository's currently public visibility before a production release. Do not reproduce personal watermark identifiers in reports. Keep source PDFs, private notes, secrets, and learner data out of Git.

## 2. Repair confirmed defects first

Reproduce and fix these shared causes, including sibling callers:

1. Build reproducibility: the checked-in Flashcard-Farmacologia.html contains shell/theme integration absent from its template. Running build/build.js loses that integration. The documented build/_gen-table.js is missing. Put the complete source of every shipped feature under version control. A clean checkout must produce all deployable assets through one documented build command.
2. English content mapping: IT/EN segment counts differ in the benzodiazepine and glucocorticoid class cards. Labels are assigned by array position, placing adverse effects under Indications. Use stable semantic section keys, not indexes, and test both cards plus the full dataset.
3. Quiz correctness: a different drug from the same deck must not count as the exact target. A spelling near-match should produce correction feedback and require a correct rewrite before mastery credit. Preserve the first-attempt error separately from the successful correction.
4. Drug-class correctness: course decks such as “antiepileptics + statins” are not pharmacological classes. Generate questions from verified class relationships. Exclude ambiguous distractors; a drug may belong to several valid classes.
5. No-repeat behaviour: track canonical ingredient IDs, including aliases, rather than raw strings. Apply the rule consistently to exact and near matches and all typing modes. At pool exhaustion offer a clear completion/restart option; do not silently reset the set.
6. Study layout: the animated ancestor of the fixed grading bar can make it scroll with the long page. Remove that containing-block problem, preserve answer clearance, and check rotation, text zoom, keyboard and safe areas.
7. Mobile header: at 390 px, the language control lies outside the viewport. Keep every primary control reachable at 320–430 px.
8. Navigation: opening the drug table replaces the flashcard iframe document, while the shell still sends flashcard messages to it. Preserve a real route and context instead of depending on that stale ready state.
9. Persistence: validate imported backups before changing live state; include SRS, quiz errors, settings and custom content. Report storage failures. Do not silently reset corrupt data or overwrite a valid backup.
10. Trust boundaries: validate message origin, source, type and payload while frames remain. Avoid wildcard destinations on hosted origins. Use safe DOM text/attribute APIs and sanitize allowed rich content. Imported data must never become executable HTML.
11. Deployment: remove misleading manual-only comments from the push-triggered Pages workflow, add validation before publishing, and stop silently accepting missing artifacts or invalid required JSON.

## 3. Minimal target architecture

Use a single responsive application shell with shared routes and data. Prefer a lightweight module-based frontend; Vite with TypeScript is a reasonable default after inspecting the current code, not a requirement to introduce a framework. Keep Three.js for existing schematic models. Build static, versioned catalog assets from scheduled ingestion jobs; a continuously running backend is not required merely for daily imports.

Suggested responsibilities, adapting folder names to the repository:

```text
src/
  app/                  navigation, theme, language, onboarding
  features/
    catalog/            search, filters, drug detail, source status
    study/              flashcards, queue, spaced repetition
    quiz/               spelling, class questions, error review
    targets/            target detail, lazy 3D, 2D alternative, animations
    progress/           history, targeted review, backup
  data/                 schemas, stable IDs, relationships, migrations
  storage/              validated local persistence and backups
  ui/                   shared controls, typography and tokens
content/                curated educational content and references
scripts/                build, import, validate, source checks
tests/                  data integrity, domain logic, browser journeys
public/                 installable app assets and offline resources
.github/workflows/      checks, catalog sync, deployment
docs/                   setup, sources, user guide, decisions
```

Keep the existing card IDs and old deep links working through redirects/adapters. Migrate old storage keys without deleting the originals until verification succeeds. Use IndexedDB if the catalog/progress size warrants it; reserve localStorage for small settings. An account system and cross-device cloud sync are optional future work, not an excuse to delay a functioning local-first version. State that backup transfer is not automatic synchronization.

The shared model must distinguish Ingredient, MedicinalProduct, Presentation/Package, Alias, PharmacologicalClass, Target, DrugTargetRelation, Flashcard, SourceRecord and ReviewEvent. Preserve combination products, salts and jurisdiction-specific brands without unsafe string-based merging. A drug-target relation records direct/indirect action, action type, relevant subtype/site, species/context where needed, and supporting reference.

## 4. A complete catalog with an honest scope

Default scope: human medicines represented in the selected official Italian authorization dataset, with separate active ingredients, products and presentations. Include historical/revoked/suspended records with visible status and filters. Keep course-only, investigational and foreign-market substances separately identified. “Complete” means reconciled against a named source snapshot and defined scope, not “all drugs in the world.”

Investigate these primary sources and verify exact download endpoints, terms, schema and coverage before implementation:

- AIFA medicine registry/list: https://www.aifa.gov.it/en-US/web/guest/liste-dei-farmaci
- AIFA open data: https://www.aifa.gov.it/open-data
- EMA medicine data: https://www.ema.europa.eu/en/medicines/download-medicine-data
- IUPHAR/BPS target-ligand data: https://www.guidetopharmacology.org/download.jsp

Do not use only reimbursable A/H lists or generic-equivalence lists as a complete Italian registry. Do not treat EU authorization as proof of Italian availability, reimbursement, or pharmacy stock. IUPHAR download access currently may require login; respect access and licensing restrictions and do not invent an unauthenticated API.

Store canonical identifiers such as source product/package IDs and ATC where supplied. Record source URL, source version/date, fetchedAt, publishedAt, licence, checksum and coverage statistics. Show how many source records were accepted, excluded for documented reasons, or quarantined. Do not discard unmatched records silently.

A catalog record without a reviewed learning explanation must remain searchable but show “Educational explanation not yet reviewed.” Do not generate thousands of apparently verified flashcards just to fill the catalog. Preserve the curated study syllabus as a distinct collection.

## 5. Daily synchronization at 03:00 Europe/Rome

Implement a server-side scheduled job, independent of the user's browser or computer, targeted for 03:00 Europe/Rome with daylight-saving handling. This is daily synchronization, not real-time. Re-check current scheduler documentation. GitHub Actions currently supports an IANA timezone but can delay/drop scheduled runs and disable public-repository schedules after inactivity; document those limits and implement a stale-job alarm/catch-up mechanism if using it.

Pipeline: fetch with timeout/retry and conditional requests where supported; validate content type/schema/identifiers; stage the snapshot; compare with the last valid version; quarantine anomalous changes; publish validated catalog metadata atomically; rebuild search; record results. Use a lock/idempotency key and bounded retries. Test duplicate runs and source failures.

Keep regulatory/source data changes separate from educational interpretation. Source metadata can flow through deterministic validation; new or changed clinical explanations, mechanisms, contraindications and guideline interpretations require review before becoming trusted teaching content. An LLM may draft but cannot approve its own pharmacology claims.

Expose last successful check, source date, current catalog version, update summary, stale/error status and a clear “not yet checked” state. Never replace the last good catalog with an empty response, login page or partial download. Support rollback. Do not force a page reload during an active study session; offer the new catalog safely at a session boundary.

Provide a manual dry-run and show its logs plus readback of the published version. A scheduler configuration is not proof that the job ran. List activation/credential blockers explicitly if the environment cannot complete deployment.

## 6. Search that matches how students think

Provide one search entry point across drugs, targets, classes and flashcards. Support Italian/English names, verified brands, aliases, ATC, gene/target identifiers, mechanisms and indications. Normalize diacritics, spacing, punctuation and Greek names consistently, including beta2 / beta-2 / β2.

Ranking: exact canonical name, exact alias, prefix, conservative typo suggestion, then contextual full-text mentions. Clearly separate “this drug” from “mentions this drug.” Never silently replace a potentially valid medicine name with a fuzzy guess.

Add combinable filters for class, target/action, source status, course coverage, and review status. Explain active filters and offer reset. Preserve query, filters and scroll position on Back. Provide explicit empty/error/offline states.

Use existing code or native features first. Evaluate MiniSearch for a compact browser index; move indexing to a worker and partition the catalog if measured memory/latency requires it. Benchmark on the real imported dataset, not only the existing 488 strings. Do not add a search server before demonstrating the need.

Regression examples: paracetamolo and Tachipirina must rank the canonical ingredient first; paracetmolo must offer a labelled suggestion; beta2 and β2 must resolve consistently; a retired medicine must remain distinguishable from an active one. Exact-name lookup should succeed for every imported eligible ingredient/product alias in a generated test set.

## 7. Navigation, mobile design and 3D

Use five understandable destinations: Oggi, Cerca, Studia, Esplora, Progressi. Put help, theme, language, sources and backup in a reachable menu. Give the drug table a first-class route. Use a drug → target → animation → flashcard → quiz path with contextual Back, preserving sessions and filters.

Keep the current warm paper/gold/editorial identity where it supports reading. Consolidate design tokens instead of adding another CSS override layer. Use clear typography, restrained illustration and spacing. Avoid template dashboards, decorative metric cards, gratuitous gradients, tiny all-caps labels and emoji-only controls. Do not sacrifice contrast for a premium look.

Design at 320, 360, 390, 430, 768 and 1280 px. Aim for 16 px readable body text and 44 px touch areas; respect WCAG 2.2 AA, keyboard and screen-reader requirements. Handle safe areas, landscape, 200% zoom and the onscreen keyboard. Avoid page-level horizontal scrolling; a wide scientific table may have a clearly labelled local scroll region.

Load 3D only on demand. Ensure failure to load WebGL/CDN assets leaves the searchable text and 2D explanation usable. Stop render loops when hidden, offscreen or paused, release obsolete resources, handle context loss and respect reduced-motion in JavaScript and SVG as well as CSS. Provide quality modes based on measured device performance.

Keep models labelled as schematics. Add atomic structures only as an optional, separately labelled mode with PDB ID, species, state, source and limitations; use Mol* only if that requirement is implemented. Do not imply an illustrative animation is measured binding kinetics or docking evidence.

Make animations step-based: baseline → binding/modulation → channel/signalling change → cellular consequence. Provide Play/Pause, Next/Previous step, Reset, captions and a static alternative. Show direct binding versus indirect signalling and explain tolerance only where supported.

## 8. First-use tutorial and help

Implement a short, skippable, keyboard-accessible first-use tutorial, linked to real controls. Store its completion by version and make “Show tutorial again” available. Do not repeatedly interrupt returning users. Keep demo answers separate from real study scores.

Italian microcopy draft, adjusting it to actual implemented controls:

1. “Cerca un farmaco, capisci come agisce e ripassalo.” Actions: Inizia / Salta.
2. “Cerca per principio attivo, nome commerciale o bersaglio. Usa i filtri per restringere i risultati.”
3. “Ruota il modello e tocca un'etichetta. Puoi seguire il meccanismo passo per passo oppure usare la spiegazione 2D.”
4. “Prova a rispondere prima di girare la carta. Scegli nuove, ripasso o entrambe e valuta ciò che ricordi.”
5. “Scrivi il nome del farmaco. Correggi gli errori e apri la scheda collegata senza perdere il quiz.”
6. “In Progressi scegli cosa ripassare ed esporta un backup. Controlla sempre la data delle fonti.”

Provide Back, Next, Skip and Finish with focus management. Translate the tutorial and test that highlighted elements exist, remain visible, and work at mobile sizes. Use native UI for a simple walkthrough; consider Driver.js only if anchored guidance justifies a dependency. Also deliver a one-page beginner guide with real current screenshots.

## 9. Content quality and review

Audit terminology and source provenance independently from UI changes. Structure explanations around why the mechanism produces the effect and adverse reactions. Separate channels, receptors, enzymes and transporters. Do not infer a direct channel interaction from a downstream effect. Distinguish pharmacokinetic tolerance, receptor adaptation, tachyphylaxis, dependence and resistance.

For half-life classifications, distinguish elimination half-life from biological duration and active-metabolite effects; cite the exact edition/table or official product document. Identify uncertain or conflicting claims instead of inventing a precise number. Goodman references must specify edition, chapter, actual verified printed page/table and, if relevant, a separate PDF-page index. A keyword match near an arbitrary page number is not verification.

Keep public bibliographic attribution while excluding private instructor/learner identifiers. Do not publish copyrighted books or lecture transcripts. Use a content-review status and revision history. Align IT and EN by semantic keys; flag stale translations rather than silently mislabelling them.

## 10. Optional tools, with a reason for each

Check availability, provenance, licence and compatibility before installation:

- Design guidance: https://github.com/pbakaus/impeccable or https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Writing review: https://github.com/blader/humanizer, used only for style, never to alter scientific certainty or citations.
- Search: https://github.com/lucaong/minisearch
- Anchored tours: https://github.com/nilbuild/driver.js
- Browser tests: https://github.com/microsoft/playwright
- Accessibility checks: https://github.com/dequelabs/axe-core
- Optional atomic visualization: https://github.com/molstar/molstar

Canva or Figma may help produce an editable storyboard or explanatory illustration if connected. They are optional and do not replace coded responsive UI or browser verification. Do not upload private source material. Do not install every listed resource, run unreviewed remote scripts, or assume a skill designed for one client runs inside another.

## 11. Acceptance gates and handoff

Before calling the implementation complete, provide evidence for:

- Fresh-checkout install/build/check, with lockfile/runtime version, no ignored generators and no manual edits required in generated HTML.
- Legacy IDs/deep links and existing learner data preserved; complete backup export/import roundtrip; malformed import rejected without data loss.
- No mislabelled bilingual sections; no missing/duplicate IDs or invalid relations; required malformed data fails validation.
- Quiz exactness, correction loop, alias-aware no-repeat, pool exhaustion, Back/Forward and targeted error review; first-attempt errors survive refresh.
- Search tests above plus source-to-index coverage reconciliation and measured latency/memory on the full dataset.
- Mobile routes and long answers at all specified widths; no hidden header/grade controls; keyboard, zoom and reduced-motion tests.
- FarmacoFlash → catalog → 3D → same card → same quiz roundtrip preserving context.
- WebGL unavailable, network blocked, source timeout, malformed feed and offline reload after installation. No blank-screen dependency on 3D.
- Tutorial first run, skip, finish, replay, language switch and no score pollution.
- Daily updater dry-run and real run/readback if deployment is authorized, Europe/Rome DST scheduling, duplicate run, stale run, rollback and last-good retention.
- Source dates and verification status visible; no invented freshness, references, access credentials or supposedly complete drug coverage.
- Accessibility automation plus manual focus/reading checks; Chromium and WebKit runs. Do not equate WebKit emulation with a real iPhone test.
- Screenshots of actual desktop/mobile implementation, build/test logs and a list of known limits. Distinguish targets from measured results.

Keep a short delivery matrix: feature, implementation location, test evidence, status, blocker. Document setup, data sources/licences, scheduler operation, backup recovery and rollback in plain language. Deliver the smallest working integrated release first, then finish remaining scoped features through tested increments. Do not describe a placeholder button, seeded dataset or unexecuted scheduled job as a shipped feature.
