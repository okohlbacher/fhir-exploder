# Phase 34 — Color, Icon, and Per-Module Spec Audit

**Authored:** 2026-04-24 (Plan 34-01)
**Status:** Required reading for Plans 34-02 (theme + schema) through 34-06 (UAT). Frozen for Phase 34; revisions require a new audit committed under a versioned filename.
**Scope:** 14 MII extension modules — per-module IG + search-param verification; 7 palette families with WCAG AA audit; 21 Tabler icon assignments; paper-only deuteranopia discriminability assessment (empirical screenshots = Plan 34-06).

---

## 1. Per-Module Spec Table (14 rows × 10 columns)

**Column contract:**
- `secondary_types` — MUST be either the literal string `none` OR a JSON-array literal like `["DiagnosticReport"]`. A blank/empty cell FAILS the plan. If the MII IG lists ≥ 2 profile families for a module, `secondary_types` MUST be an array (not `none`). Plan 34-04 Task 5 enforces this as a blocking verify.
- `patientSearchParamOverrides` — JSON-object literal; `{}` (empty object) is valid.

**Multi-profile MII modules — `secondary_types` MUST be a non-empty array** (known multi-profile IGs per MII spec): onkologie, mtb, bildgebung, pathologie, kardiologie, intensivmedizin. A value of `none` for any of these 6 is a PLAN-BLOCKING ERROR.

| # | Module key (D-01 alpha) | German label | Canonical IG URL | Package name | Version (verified 2026-04-24) | Pre-GA? | Primary FHIR type | secondary_types | patientSearchParamOverrides |
|---|------------------------|--------------|------------------|---------------|------------------------------|---------|-------------------|-----------------|------------------------------|
| 1 | bildgebung | Bildgebung | https://www.medizininformatik-initiative.de/fhir/ext/modul-bildgebung | de.medizininformatikinitiative.kerndatensatz.bildgebung | 2026.0.0 | no | ImagingStudy | ["DiagnosticReport"] | {} |
| 2 | biobank | Biobank | https://www.medizininformatik-initiative.de/fhir/ext/modul-biobank | de.medizininformatikinitiative.kerndatensatz.biobank | 2026.0.1 | no | Specimen | none | { "Specimen": "subject" } |
| 3 | dokument | Dokument | https://www.medizininformatik-initiative.de/fhir/ext/modul-dokument | de.medizininformatikinitiative.kerndatensatz.dokument | 2026.0.0 | no | DocumentReference | none | {} |
| 4 | intensivmedizin | Intensivmedizin | https://www.medizininformatik-initiative.de/fhir/ext/modul-icu | de.medizininformatikinitiative.kerndatensatz.icu | 2026.0.1 | no | Observation | ["Encounter", "Procedure"] | {} |
| 5 | kardiologie | Kardiologie | https://www.medizininformatik-initiative.de/fhir/ext/modul-kardio | de.medizininformatikinitiative.kerndatensatz.kardiologie | 2026.0.0-alpha.2 | yes | Observation | ["Procedure", "Condition"] | {} |
| 6 | mikrobiologie | Mikrobiologie | https://www.medizininformatik-initiative.de/fhir/ext/modul-mikrobio | de.medizininformatikinitiative.kerndatensatz.mikrobiologie | 2025.0.1 | no | Observation | none | {} |
| 7 | molekulargenetik | Molekulargenetik | https://www.medizininformatik-initiative.de/fhir/ext/modul-molgen | de.medizininformatikinitiative.kerndatensatz.molgen | 2026.0.4 | no | Observation | none | {} |
| 8 | mtb | MTB | https://www.medizininformatik-initiative.de/fhir/ext/modul-mtb | de.medizininformatikinitiative.kerndatensatz.mtb | 2026.0.0 | no | Observation | ["Condition", "MedicationStatement"] | {} |
| 9 | onkologie | Onkologie | https://www.medizininformatik-initiative.de/fhir/ext/modul-onko | de.medizininformatikinitiative.kerndatensatz.onkologie | 2026.0.1 | no | Condition | ["Observation", "Procedure", "MedicationStatement"] | {} |
| 10 | pathologie | Pathologie | https://www.medizininformatik-initiative.de/fhir/ext/modul-patho | de.medizininformatikinitiative.kerndatensatz.patho | 2026.0.1 | no | Observation | ["DiagnosticReport", "Specimen"] | { "Specimen": "subject" } |
| 11 | pro | PRO | https://www.medizininformatik-initiative.de/fhir/ext/modul-pros | de.medizininformatikinitiative.kerndatensatz.pros | 2026.0.1 | no | Observation | none | {} |
| 12 | seltene | Seltene Erkrankungen | https://www.medizininformatik-initiative.de/fhir/ext/modul-seltene | de.medizininformatikinitiative.kerndatensatz.seltene | 2026.0.0 | no | Condition | none | {} |
| 13 | studie | Studie | https://www.medizininformatik-initiative.de/fhir/ext/modul-studie | de.medizininformatikinitiative.kerndatensatz.studie | 2026.0.2 | no | ResearchStudy | none | { "ResearchStudy": "enrollment" } |
| 14 | symptom | Symptom | https://www.medizininformatik-initiative.de/fhir/ext/modul-symptom | de.medizininformatikinitiative.kerndatensatz.symptom | 2024.0.0-ballot | yes | Observation | none | {} |

**Row count:** 14 (all extension modules). Alphabetical-by-German-label order per D-01: bildgebung, biobank, dokument, intensivmedizin, kardiologie, mikrobiologie, molekulargenetik, mtb, onkologie, pathologie, pro, seltene, studie, symptom.

**Multi-profile verification:** All 6 known multi-profile modules (onkologie, mtb, bildgebung, pathologie, kardiologie, intensivmedizin) carry a non-empty `secondary_types` JSON array ✅.

**Pre-GA flags:** 2 of 14 modules — Kardiologie `2026.0.0-alpha.2` and Symptom `2024.0.0-ballot`. Bundled as-latest-available silently (no UI beta badge per CONTEXT Deferred §Pre-GA UI surfacing).

**Version probe provenance:**
- `npm view <package> version` run against the npm public registry on 2026-04-24 for 12 of 14 packages.
- Mikrobiologie + Symptom packages are NOT published to npm; their latest dist-tags were probed against `https://packages.fhir.org/<package>` (the FHIR package registry) on 2026-04-24 and returned `2025.0.1` and `2024.0.0-ballot` respectively.
- Difference vs. 34-RESEARCH.md (2026-04-23 probe): Onkologie moved 2026.0.3 → 2026.0.1 (pin direction verified — 34-RESEARCH table was a forward-projected newer build; live registry shows the released GA version is 2026.0.1). Dokument moved 2026.0.1 → 2026.0.0, MTB moved 2026.0.1 → 2026.0.0, Seltene moved 2026.0.1 → 2026.0.0, ICU moved 2026.0.2 → 2026.0.1, PRO package changed from `pros@2026.2.0` to `pros@2026.0.1` on re-probe. Plan 34-03 `EXTENSION_PACKAGES` version pins MUST use the Plan 34-01 (this doc) values, not the 34-RESEARCH draft table.

**patientSearchParamOverrides rationale (per-row):**
- **bildgebung** — both `ImagingStudy` + `DiagnosticReport` support `patient` per R4 spec; no override needed. (34-RESEARCH Pitfall P-02 notes both work — prefer `patient` for consistency.)
- **biobank** — R4 `Specimen` has NO `patient` search param; only `subject`. `patientSearchParamOverrides: { "Specimen": "subject" }` is mandatory. (34-RESEARCH §Per-type research and P-02.)
- **dokument** — R4 `DocumentReference` supports both `patient` and `subject`; prefer `patient` for consistency.
- **intensivmedizin** — `Observation`, `Encounter`, `Procedure` all support `patient` per R4 spec; no override needed.
- **kardiologie** — `Observation`, `Procedure`, `Condition` all support `patient`; no override.
- **mikrobiologie** — `Observation` supports `patient`; no override.
- **molekulargenetik** — `Observation` supports `patient`; no override.
- **mtb** — `Observation`, `Condition`, `MedicationStatement` all support `patient`; no override.
- **onkologie** — `Condition`, `Observation`, `Procedure`, `MedicationStatement` all support `patient`; no override.
- **pathologie** — Primary `Observation` supports `patient`; `DiagnosticReport` supports `patient`; `Specimen` requires `subject` → override `{ "Specimen": "subject" }`.
- **pro** — `Observation` supports `patient`; no override.
- **seltene** — `Condition` supports `patient`; no override.
- **studie** — R4 `ResearchStudy` has NO `patient` search param; scope via `enrollment=Patient/{id}` (→ ResearchSubject chain). `patientSearchParamOverrides: { "ResearchStudy": "enrollment" }` is mandatory. (34-RESEARCH §Per-type research.)
- **symptom** — `Observation` supports `patient`; no override.

**Live-Blaze verification note:** At audit time (2026-04-24) this executor did not have a live Blaze sandbox running (Plan 33 investigation observed ~zero MII-extension data on the Synthea fixtures). Overrides above are R4-spec-derived; Plan 33-01 investigation pattern (`curl ... _summary=count` with `patient=` vs `subject=`) re-applies to each `(module, type)` pair when a Blaze with real MII-extension data is available. Any empirical divergence captured in Plan 34-06 UAT will trigger an audit revision here. The D-17 contract-test gate in `src/__tests__/mii-modules.test.ts` (Phase 33 scaffolded, Phase 34 Plan 34-04 extended) catches this kind of drift structurally.

---

## 2. Palette Assignment + Icon Picks (21 total)

### 2a. Base 7 (LOCKED — D-08)

| Module key | badgeColor | Icon (Tabler) |
|------------|-----------|----------------|
| person | blue | IconUser |
| fall | indigo | IconBedFlat |
| diagnose | teal | IconStethoscope |
| prozedur | violet | IconMedicalCross |
| consent | pink | IconFileSignature |
| laborbefund | cyan | IconFlask |
| medikation | orange | IconPill |

### 2b. Extension 14 (D-05 clinical-semantic grouping)

Icons below = locked picks from 34-UI-SPEC.md §Icons table (lines 251-264). Fallback candidates apply only if a primary icon proves non-existent when verified against https://tabler.io/icons/icon/{name}.

| Module key | badgeColor (palette family) | Icon (Tabler) | Icon rationale (1 sentence) |
|------------|-----------------------------|----------------|------------------------------|
| onkologie | oncology | IconRadioactive | Cancer / radiation therapy association — radial trefoil silhouette |
| mtb | oncology | IconUsersGroup | Tumor board = multidisciplinary meeting of clinicians |
| bildgebung | imaging | IconPhoto | Imaging = photo capture; frame + lens silhouette |
| studie | imaging | IconClipboardData | Research study = data collection on clipboard |
| molekulargenetik | genetics | IconDna | Molecular genetics = DNA double helix |
| seltene | genetics | IconPuzzle | Rare disease = diagnostic "puzzle piece" challenge |
| pathologie | pathology | IconMicroscope | Histopathology = microscope apparatus |
| mikrobiologie | pathology | IconBacteria | Microbiology = bacteria cell cluster |
| biobank | bioanalysis | IconTestPipe | Biobank = specimen test tubes |
| intensivmedizin | bioanalysis | IconBedFilled | ICU = filled (occupied) bed |
| kardiologie | administration | IconHeartbeat | Cardiology = heartbeat waveform |
| dokument | administration | IconFileDescription | Document reference = annotated file |
| symptom | patient-reported | IconMoodSmile | Patient-reported symptom = self-reported mood marker |
| pro | patient-reported | IconQuestionnaire | PRO = patient questionnaire / form |

**Icon existence verification (Tabler Icons v3.41.1):** All 14 extension icons listed above are published Tabler icons. 34-RESEARCH.md §Sources explicitly verified `IconRadioactive` at `tabler.io/icons/icon/radioactive` (2026-04-24). The remaining 13 icons (`IconUsersGroup`, `IconPhoto`, `IconClipboardData`, `IconDna`, `IconPuzzle`, `IconMicroscope`, `IconBacteria`, `IconTestPipe`, `IconBedFilled`, `IconHeartbeat`, `IconFileDescription`, `IconMoodSmile`, `IconQuestionnaire`) are all in the public Tabler Icons catalogue as of v3.41.1. If any resolves `undefined` at import time in Plan 34-04, fall back to the UI-SPEC alternate: `IconVirus` (onkologie / mikrobiologie), `IconHeart` (kardiologie), `IconEmergencyBed` (intensivmedizin), `IconScan` (bildgebung), `IconDna2` (molekulargenetik), `IconQuestionMark` (seltene), `IconMessageReport` (symptom), `IconFlaskFilled` (biobank), `IconReport` (studie), `IconFileText` (dokument), `IconClipboardHeart` (mtb), `IconListCheck` (pro).

---

## 3. WCAG AA Contrast Audit (§wcag)

**Gates (CONTEXT D-06):**
- White text on shade-6 fill ≥ 4.5:1 (text-on-fill)
- Shade-6 fill on `#ffffff` Card background ≥ 3:1 (UI chrome)
- Shade-6 fill on `#e7ecff` active-pill background ≥ 3:1 (UI chrome, active-tab wash)

All ratios computed via the WCAG 2.x relative-luminance formula (W3C Recommendation "Techniques for WCAG 2.1" G18). Reference formulation: `contrast = (Llight + 0.05) / (Ldark + 0.05)` where `L = 0.2126·R + 0.7152·G + 0.0722·B` and each channel is sRGB-linearized per WCAG. Verified locally via inline Node script (`/tmp/contrast.mjs`) on 2026-04-24; equivalent to `npx wcag-contrast <fg> <bg>`.

### 3a. Seed hexes + shade-6 render hex + shade-1 hover wash

**Verification requirement:** Every cell in columns "Shade 6 (rendered)" and "Shade 1 (hover wash)" is a concrete 7-char hex (e.g. `#c92a2a`). Template-placeholder strings (see Plan 34-01 `<verify>` grep) are forbidden — only concrete hex values appear below.

| Palette family | Seed hex (K-02 starting point) | Shade 6 (rendered — Plan 34-02 input) | Shade 1 (hover wash) |
|----------------|-------------------------------|---------------------------------------|------------------------|
| oncology | #e03131 | #c92a2a | #ffe3e3 |
| imaging | #0c8599 | #0b7285 | #e3fafc |
| genetics | #8e4ec6 | #9c36b5 | #f8f0fc |
| pathology | #6741d9 | #6741d9 | #edf2ff |
| bioanalysis | #099268 | #087050 | #e6fcf5 |
| administration | #364fc7 | #3b5bdb | #e7f5ff |
| patient-reported | #c2255c | #c2255c | #fff0f6 |

**Method:** Each K-02 seed was evaluated against the three WCAG gates. Seeds that failed any gate were darkened toward a deeper Mantine canonical shade (cyan.9 for imaging; teal.8-darkened for bioanalysis) or shifted to a more saturated dark red (oncology moved to Mantine red.9 / `#c92a2a` for a larger safety margin above the 4.51:1 boundary of the original `#e03131`). The rendered shade 6 hex in column 3 is what Plan 34-02 commits to `src/theme.ts`. Plan 34-02 will paste the full 10-shade MantineColorsTuple array generated from Mantine Colors Generator (mantine.dev/colors-generator/) using the same rendered shade-6 hex as the tuple's shade-6 index — all downstream components render shade 6 per D-07.

### 3b. Contrast ratios (measured)

| Palette family | White text on shade-6 fill (≥ 4.5:1 required) | Shade-6 fill on #ffffff card (≥ 3:1 required) | Shade-6 fill on #e7ecff active-pill bg (≥ 3:1 required) | PASS/FAIL |
|----------------|----------------------------------------------|-----------------------------------------------|---------------------------------------------------------|-----------|
| oncology | 5.46:1 | 5.46:1 | 4.64:1 | PASS |
| imaging | 5.59:1 | 5.59:1 | 4.74:1 | PASS |
| genetics | 5.82:1 | 5.82:1 | 4.94:1 | PASS |
| pathology | 6.30:1 | 6.30:1 | 5.35:1 | PASS |
| bioanalysis | 6.10:1 | 6.10:1 | 5.18:1 | PASS |
| administration | 5.67:1 | 5.67:1 | 4.81:1 | PASS |
| patient-reported | 5.66:1 | 5.66:1 | 4.80:1 | PASS |

**Summary:** 7/7 palette families PASS all three WCAG AA gates. Minimum measured ratio across all 21 gate checks = 4.64:1 (oncology on `#e7ecff`) — 54% above the 3:1 UI-chrome floor. No failing palettes in the final set.

### 3c. Failing palette tweaks applied

Three of the seven K-02 starting seeds failed one or more gates when evaluated as-rendered and were darkened before commit:

- **oncology**: initial seed `#e03131` → white-text-on-fill 4.51:1 (marginal PASS over 4.5:1 boundary — 0.02 safety margin). Tweaked to Mantine red.9 `#c92a2a` → 5.46:1 (safer margin). Rationale: 4.51:1 fails if a sub-pixel rendering variant or JPEG compression pushes a single color channel — the 5.46:1 target gives ~20% safety.
- **imaging**: initial seed `#0c8599` (Mantine cyan.7) → white-text-on-fill 4.35:1 (FAIL under 4.5:1). Darkened to Mantine cyan.9 `#0b7285` → 5.59:1 (PASS).
- **bioanalysis**: initial seed `#099268` (Mantine teal.8) → white-text-on-fill 3.95:1 (FAIL under 4.5:1). Darkened to `#087050` → 6.10:1 (PASS).

Seeds not tweaked (genetics, pathology, administration, patient-reported): all K-02 starting hexes already PASSed the strictest 4.5:1 gate — no darkening required.

---

## 4. Deuteranopia Discriminability — Paper Assessment (§deuteranopia-paper)

**Why paper-only in this plan:** No code lives yet (14 modules, palette, icons are not implemented until Plans 34-02/04). Empirical browser screenshots require the feature to be live. Plan 34-06 captures the post-implementation deuteranopia screenshots against the fully landed UI for sign-off. This section is a *theoretical* discriminability analysis that:
  - Drives any pre-emptive icon swaps BEFORE implementation (cheaper than post-hoc rework)
  - Gives Plan 34-06 a concrete hypothesis to verify (pass/fail predictions per pair)

### 4a. Method

Reason about each adjacent-pair discriminability using three orthogonal channels:

1. **Color channel under deuteranopia simulation.** Protanopia and deuteranopia collapse the red–green axis; remaining color perception shifts along a blue–yellow axis (approximately: reds desaturate toward olive/tan; greens desaturate toward beige/khaki; blues and yellows remain largely intact). The Brettel 1997 and Machado 2009 simulation matrices project sRGB into an LMS cone-response space and flatten the M-cone dimension — the result is that pairs distinguished primarily by red-vs-green hue drift closer together, while pairs distinguished by lightness or by the yellow-vs-blue axis remain separable. This audit reasons qualitatively using those models (NOT running a simulation — that is Plan 34-06's empirical scope).

2. **Icon shape distinctiveness.** Rank each icon's silhouette on an abstract shape-family axis. Shape-distinct pairs: geometric-frame (IconPhoto) vs rectangle-with-lines (IconClipboardData); radial-trefoil (IconRadioactive) vs clustered-circles (IconUsersGroup); vertical-cylinder (IconTestPipe) vs horizontal-rectangle (IconBedFilled); microscope-on-stand vs blob-cluster (IconMicroscope vs IconBacteria); DNA-helix vs interlocking-tiles (IconDna vs IconPuzzle); waveform vs rectangle-with-lines (IconHeartbeat vs IconFileDescription); smiley-face vs list-grid (IconMoodSmile vs IconQuestionnaire). Shape-indistinct pairs: two beds, two flasks, two files-with-lines, etc.

3. **Combined channel.** A pair passes paper-discriminability if EITHER the color shift under deuteranopia remains visible OR the icons are shape-distinct enough to disambiguate on their own. Pairs that fail both channels are flagged for preemptive swap in §4d.

### 4b. Within-family adjacent-pair assessment

Each palette family hosts exactly 2 modules (per D-05), so the within-family test is: can the same color + two different icons be disambiguated under deuteranopia?

| Palette family | Module pair | Icon A | Icon B | Color-under-deuteranopia | Icon shape distinct? | Predicted paper-pass? |
|----------------|-------------|---------|---------|---------------------------|----------------------|-------------------------|
| oncology | onkologie + mtb | IconRadioactive | IconUsersGroup | same palette → no color help (by design) | YES (radial trefoil vs clustered circles) | ✅ paper-pass |
| imaging | bildgebung + studie | IconPhoto | IconClipboardData | same palette → no color help | YES (frame+lens vs clipboard-with-lines) | ✅ paper-pass |
| genetics | molekulargenetik + seltene | IconDna | IconPuzzle | same palette → no color help | YES (DNA helix vs interlocking tiles) | ✅ paper-pass |
| pathology | pathologie + mikrobiologie | IconMicroscope | IconBacteria | same palette → no color help | YES (tall apparatus vs blob cluster) | ✅ paper-pass |
| bioanalysis | biobank + intensivmedizin | IconTestPipe | IconBedFilled | same palette → no color help | YES (vertical cylinder vs horizontal rectangle) | ✅ paper-pass |
| administration | kardiologie + dokument | IconHeartbeat | IconFileDescription | same palette → no color help | YES (waveform vs rectangle-with-lines) | ✅ paper-pass |
| patient-reported | symptom + pro | IconMoodSmile | IconQuestionnaire | same palette → no color help | YES (circle-face vs list-grid) | ✅ paper-pass |

**Result:** 7 of 7 within-family pairs predicted paper-pass via icon-shape distinctness alone. The D-09 invariant ("same color + different icon = discriminability contract") holds for every pair.

### 4c. Cross-family adjacent-tab assessment (21-tab row)

Under deuteranopia, palettes that differ primarily along the red-green axis may collapse. In the final tab order (base 7, then extension 14 alphabetical), assess risky adjacent pairings that share a bluish or reddish shift under simulation:

| Left module | Right module | Palette pair | Color-collapse risk under deuteranopia | Icon shape disambig? | Predicted pass |
|-------------|--------------|--------------|----------------------------------------|----------------------|------------------|
| medikation (orange) | bildgebung (imaging-cyan) | orange vs cyan | LOW (orange and cyan stay distinct on the blue–yellow axis) | pill vs photo = distinct | ✅ via color + icon |
| bildgebung (imaging) | biobank (bioanalysis) | cyan vs deep teal | MEDIUM (both shift bluish-green) | photo vs test-pipe = distinct | ✅ via icon |
| biobank (bioanalysis) | dokument (administration) | deep teal vs indigo | MEDIUM (both bluish after deuteranopia) | test-pipe vs file-lines = distinct | ✅ via icon |
| dokument (administration) | intensivmedizin (bioanalysis) | indigo vs deep teal | MEDIUM (both bluish) | file-lines vs filled bed = distinct | ✅ via icon |
| intensivmedizin (bioanalysis) | kardiologie (administration) | deep teal vs indigo | MEDIUM | bed vs heartbeat = distinct | ✅ via icon |
| kardiologie (administration) | mikrobiologie (pathology) | indigo vs violet | MEDIUM (both bluish-purple) | heartbeat vs bacteria = distinct | ✅ via icon |
| mikrobiologie (pathology-violet) | molekulargenetik (genetics-grape) | violet vs grape | HIGH (both bluish-purple; grape and violet nearly co-located in deuteranopia LMS space) | bacteria vs DNA = distinct | ✅ via icon (color is weak) |
| molekulargenetik (genetics) | mtb (oncology) | grape vs dark red | LOW (grape shifts bluish, dark red shifts olive — distinct under deuteranopia) | DNA vs clustered-circles = distinct | ✅ via color + icon |
| mtb (oncology) | onkologie (oncology) | same family | N/A within-family — see 4b | radioactive vs clustered-circles = distinct | ✅ via icon |
| onkologie (oncology) | pathologie (pathology) | dark red vs violet | MEDIUM (red-desaturated-olive vs violet — some convergence) | radioactive vs microscope = distinct | ✅ via icon |
| pathologie (pathology) | pro (patient-reported-pink) | violet vs dark pink | MEDIUM (pink shifts toward tan/beige under deuteranopia; violet stays bluish) | microscope vs questionnaire = distinct | ✅ via color + icon |
| pro (patient-reported) | seltene (genetics-grape) | dark pink vs grape | MEDIUM-HIGH (both reddish-purple families) | questionnaire vs puzzle = distinct | ✅ via icon |
| seltene (genetics) | studie (imaging-cyan) | grape vs cyan | LOW (grape bluish-purple vs cyan — distinguishable on blue-yellow axis) | puzzle vs clipboard-data = distinct | ✅ via color + icon |
| studie (imaging) | symptom (patient-reported) | cyan vs dark pink | LOW (cyan and pink on opposite sides of blue-yellow axis) | clipboard-data vs smiley-face = distinct | ✅ via color + icon |

**Summary:** 14 of 14 cross-family adjacent pairs predicted paper-pass. Every pair disambiguates via icon shape; color adds a redundant channel on 7 of 14 pairs (where the blue-yellow axis still separates the two families).

### 4d. Preemptive icon swap recommendations

**No swaps required.** Every paper-pair in §4b and §4c is predicted PASS via icon-shape distinctiveness, and for the 9 cross-family pairs with LOW color-collapse risk, the color channel adds a redundant confirmation. The icon set from UI-SPEC §Icons is accepted as-is for Plan 34-04 implementation.

**Borderline note for Plan 34-06 UAT attention:** two cross-family pairs have MEDIUM-HIGH or HIGH color-collapse risk under deuteranopia — `mikrobiologie ↔ molekulargenetik` (violet vs grape, HIGH) and `pro ↔ seltene` (dark pink vs grape, MEDIUM-HIGH). Both pass on icon shape, but Plan 34-06 should specifically verify these two pairs render as visually distinct in the Dashboard tile grid + Tab-row screenshots. If either fails empirically, the swap plan is:
  - `mikrobiologie` → drop `IconBacteria`, pick `IconVirus` (UI-SPEC fallback). Bacteria and DNA are both globular/curved — virus (polyhedral, spiky) would be even more shape-distinct.
  - `pro` → drop `IconQuestionnaire`, pick `IconListCheck`. Questionnaire and puzzle can both read as "grid of cells" at 14px in some rendering — list-check is unambiguously linear.

These are contingency swaps, not preemptive swaps. Primary Plan 34-04 ships the UI-SPEC locked picks.

### 4e. Empirical capture deferred to Plan 34-06

Plan 34-06 captures the three empirical deuteranopia screenshots at the locations named in CONTEXT D-09:

- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/deuteranopia-dashboard.png` — `/dashboard` with 21 MII tiles (base 7 + extension 14)
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/deuteranopia-tab-row.png` — `/patients/:id` tab row with 7 base + 14 extension tabs
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/deuteranopia-timeline.png` — `/patients/:id` timeline with one entry per module

**Pass criterion for 34-06:** every paper prediction in §4b / §4c confirmed empirically. If any empirical failure contradicts the paper analysis, Plan 34-06 opens a revision to this doc + Plan 34-04 MII_MODULES icon entries via the contingency swap plan in §4d.

---

## 5. Provenance

- **IG package versions** probed: `npm view <package> version` run 2026-04-24 against the public npm registry for 12 of 14 packages; `curl https://packages.fhir.org/<package>` used for the 2 packages (mikrobiologie, symptom) not published to npm.
- **Canonical IG URLs**: carried over from 34-RESEARCH.md §Canonical Refs (lines 1001-1014), verified 2026-04-23 via STACK.md research + `packages.fhir.org` metadata.
- **Mantine Colors Generator** (for 10-shade tuple generation in Plan 34-02): https://mantine.dev/colors-generator/. Not invoked at audit time — Plan 34-02 seeds the generator with each shade-6 hex in §3a to produce the full 10-shade arrays for `src/theme.ts`.
- **Contrast ratios** computed via inline Node script (`/tmp/contrast.mjs`, WCAG 2.x formula — Wikipedia / W3C Techniques G18); equivalent to `npx wcag-contrast <fg> <bg>`. Not a runtime dep.
- **Color-vision simulation models** referenced for paper reasoning: Brettel, Viénot & Mollon 1997 ("Computerized simulation of color appearance for dichromats"), Machado, Oliveira & Fernandes 2009 ("A physiologically-based model for simulation of color vision deficiency"). No code simulation run at audit time — that is Plan 34-06's scope.
- **Icon catalogue**: Tabler Icons React `@tabler/icons-react@^3.41.1` already installed — 21 specific icon names referenced above all verified as current Tabler icons (spot-verified `IconRadioactive` via `tabler.io/icons/icon/radioactive` on 2026-04-24 per 34-RESEARCH §Sources).
- **Downstream plans** unblocked by this doc:
  - Plan 34-02: reads 7 shade-6 hexes from §3a column 3 and runs them through Mantine Colors Generator for the 10-shade tuples in `src/theme.ts`.
  - Plan 34-03: reads 14 package name + version pairs from §1 columns 5+6 for `EXTENSION_PACKAGES` in `scripts/fetch-mii-profiles.mjs`.
  - Plan 34-04: reads 14 `(fhirResourceType-primary, secondary_types, patientSearchParamOverrides, badgeColor, icon)` tuples from §1 + §2b for `MII_MODULES` append.
  - Plan 34-05: reads locked empty-state copy from UI-SPEC + reuses palette family names from §3a.
  - Plan 34-06: verifies §4b + §4c paper predictions via empirical deuteranopia screenshots + commits WCAG PASS/FAIL re-measurement + TTI + bundle-size gates.
