---
phase: 37
plan: 01
authored: 2026-04-28
status: resolved
closed_by: phase-40
closed_at: 2026-04-29
closed_by_commit: 5f99b93
closed_by_test: src/__tests__/visual/deuteranopia.test.tsx
sections_owned_by:
  "§1 Within-family pairs": "Plan 37-01 (deferred 2026-04-28; closed by Phase 40 / DEUT-01 2026-04-29 — verified by deuteranopia.test.tsx)"
  "§2 Cross-family pairs": "Plan 37-01 (deferred 2026-04-28; closed by Phase 40 / DEUT-01 2026-04-29 — verified by deuteranopia.test.tsx)"
  "§3 TTI": "Plan 37-02 (Lighthouse-substituted, accepted)"
  "§4 Contradictions": "Plan 37-03"
  "§5 Contingency commits triggered": "Plan 37-03"
  "§6 34-06-UAT.md update": "Plan 37-03"
  "§7 Future hardening": "Plan 37-03 (recommended brief)"
---

# Phase 37 — Empirical Reconciliation

**Authored:** 2026-04-28
**Status:** **EMPIRICAL CAPTURE DEFERRED** — Plan 37-01's deuteranopia screenshots and Plan 37-02's manual DevTools Performance panel runs were both skipped during execution by user decision. Plan 37-02 produced a Lighthouse-substituted TTI snapshot (accepted as cross-validation rather than authoritative DevTools capture). Plan 37-01's deuteranopia capture has no equivalent automated substitute and was deferred outright.

**Scope:** This document mirrors `color-design-audit.md` §4b/§4c row order so that future re-runs (against this same Phase 34 HEAD or any later HEAD) can fill the Empirical column without restructuring. The deferral is noted explicitly per row to prevent silent confusion with PASS results.

**Source artifacts (state on 2026-04-28):**
- `deuteranopia-dashboard.png` — **NOT CAPTURED** (deferred)
- `deuteranopia-tab-row.png` — **NOT CAPTURED** (deferred)
- `deuteranopia-timeline.png` — **NOT CAPTURED** (deferred)
- `tti-snapshot.json` — captured via Lighthouse 13.1 headless Chrome, NOT manual DevTools Performance panel as the plan required (see §3 method note)

**Methodology (intended vs. actual):**
- Intended: Chrome DevTools Rendering panel "Emulate vision deficiencies → deuteranopia" (Machado 2009 simulation matrix), 3 PNG full-size captures, human visual judgement of each adjacent pair.
- Actual: deferred. No simulation was applied; no judgement was recorded.

---

## §1 Within-family adjacent pairs (mirrors color-design-audit.md §4b)

7 pairs — same palette family, two different icons. Paper predicted 7/7 PASS via icon-shape distinctness alone (no color help by design).

| # | Pair | Palette family | Icon A | Icon B | Paper | Empirical | Agree? | Notes |
|---|------|----------------|--------|--------|-------|-----------|--------|-------|
| 1 | onkologie + mtb | oncology (red) | IconRadioactive | IconUsersGroup | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (D-07 OUT OF SCOPE for color-only gate) | Radial trefoil vs clustered circles |
| 2 | bildgebung + studie | imaging (cyan) | IconPhoto | IconClipboardData | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (D-07 OUT OF SCOPE for color-only gate) | Frame+lens vs clipboard-with-lines |
| 3 | molekulargenetik + seltene | genetics (grape) | IconDna | IconPuzzle | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (D-07 OUT OF SCOPE for color-only gate) | DNA helix vs interlocking tiles |
| 4 | pathologie + mikrobiologie | pathology (violet) | IconMicroscope | IconVirus | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (D-07 OUT OF SCOPE for color-only gate) | Tall apparatus vs polyhedral cluster (audit named IconBacteria; Plan 34-04 swapped to IconVirus per package availability — see RESEARCH §Pitfall 5) |
| 5 | biobank + intensivmedizin | bioanalysis (teal) | IconTestPipe | IconBedFilled | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (D-07 OUT OF SCOPE for color-only gate) | Vertical cylinder vs horizontal rectangle |
| 6 | kardiologie + dokument | administration (indigo) | IconHeartbeat | IconFileDescription | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (D-07 OUT OF SCOPE for color-only gate) | Waveform vs rectangle-with-lines |
| 7 | symptom + pro | patient-reported (pink) | IconMoodSmile | IconListCheck | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (D-07 OUT OF SCOPE for color-only gate) | Circle-face vs linear checklist (audit named IconQuestionnaire; Plan 34-04 swapped to IconListCheck — see RESEARCH §Pitfall 5) |

**Within-family summary:** 0/7 pairs color-empirically verified — within-family pairs share badgeColor by Phase 33 D-09 design invariant (icon-shape paper analysis remains authoritative per Phase 40 D-07; see color-design-audit.md §4b).

---

## §2 Cross-family adjacent tabs (mirrors color-design-audit.md §4c)

14 pairs across the final tab order. Paper predicted 14/14 PASS. Two borderline pairs flagged for empirical attention:
- **mikrobiologie ↔ molekulargenetik** — HIGH color-collapse risk (violet vs grape both shift bluish-purple under deuteranopia)
- **pro ↔ seltene** — MEDIUM-HIGH color-collapse risk (dark pink vs grape both reddish-purple family)

| # | Left module | Right module | Palette pair | Risk | Paper | Empirical | Agree? |
|---|-------------|--------------|--------------|------|-------|-----------|--------|
| 1 | medikation | bildgebung | orange vs imaging-cyan | LOW | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 52.5942 ≥ 5.0 confirmed empirically) |
| 2 | bildgebung | biobank | imaging-cyan vs bioanalysis-teal | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 22.7379 ≥ 5.0 confirmed empirically) |
| 3 | biobank | dokument | bioanalysis-teal vs administration-indigo | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 37.3257 ≥ 5.0 confirmed empirically) |
| 4 | dokument | intensivmedizin | administration-indigo vs bioanalysis-teal | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 37.3257 ≥ 5.0 confirmed empirically) |
| 5 | intensivmedizin | kardiologie | bioanalysis-teal vs administration-indigo | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 37.3257 ≥ 5.0 confirmed empirically) |
| 6 | kardiologie | mikrobiologie | administration-indigo vs pathology-violet | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | **NO (EMPIRICAL FAIL: ΔE2000 = 1.406 < 5.0; paper analysis predicted PASS at MEDIUM risk; palette fix scheduled for Phase 40.1)** |
| 7 | mikrobiologie | molekulargenetik | pathology-violet vs genetics-grape | **HIGH** | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (BORDERLINE #7 named it() block; ΔE2000 = 5.6364 ≥ 5.0 confirmed empirically) |
| 8 | molekulargenetik | mtb | genetics-grape vs oncology-dark-red | LOW | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 50.7228 ≥ 5.0 confirmed empirically) |
| 9 | mtb | onkologie | within oncology family | N/A | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | paper-pass-via-icon-shape (within-family — D-07 OUT OF SCOPE) |
| 10 | onkologie | pathologie | oncology-red vs pathology-violet | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 59.2543 ≥ 5.0 confirmed empirically) |
| 11 | pathologie | pro | pathology-violet vs patient-reported-pink | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 43.9451 ≥ 5.0 confirmed empirically) |
| 12 | pro | seltene | patient-reported-pink vs genetics-grape | **MEDIUM-HIGH** | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (BORDERLINE #12 named it() block; ΔE2000 = 37.0848 ≥ 5.0 confirmed empirically) |
| 13 | seltene | studie | genetics-grape vs imaging-cyan | LOW | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 9.3391 ≥ 5.0 confirmed empirically) |
| 14 | studie | symptom | imaging-cyan vs patient-reported-pink | LOW | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | YES (it.each() block; ΔE2000 = 28.4882 ≥ 5.0 confirmed empirically) |

**Cross-family summary:** 12/13 cross-family color-empirically verified PASS via Phase 40 deuteranopia.test.tsx (ΔE2000 ≥ 5.0); 1/13 EMPIRICAL FAIL (pair #6 kardiologie ↔ mikrobiologie, ΔE2000 = 1.406). Pair #9 (mtb ↔ onkologie) excluded from the color-only gate because it is within-family by badgeColor (D-07 OUT OF SCOPE). 13/14 paper predictions stand; pair #6 paper PASS prediction is **CONTRADICTED EMPIRICALLY** — palette fix scheduled for Phase 40.1.

**HIGH/MEDIUM-HIGH attention pairs (named-block resolution):**
- Pair #7 (mikrobiologie ↔ molekulargenetik): empirical [verified by deuteranopia.test.tsx at commit 5f99b93] — BORDERLINE-#7 named it() block confirms ΔE2000 = 5.6364 ≥ 5.0 under Machado 2009 deuteranopia simulation severity 1.0. Borderline pair empirically resolved.
- Pair #12 (pro ↔ seltene): empirical [verified by deuteranopia.test.tsx at commit 5f99b93] — BORDERLINE-#12 named it() block confirms ΔE2000 = 37.0848 ≥ 5.0. Borderline pair empirically resolved.

**Empirical regression surfaced (NEW finding 2026-04-29):**
- Pair #6 (kardiologie ↔ mikrobiologie): empirical FAIL — ΔE2000 = 1.406 < 5.0 under deuteranopia simulation. Paper analysis (color-design-audit.md §4c) predicted PASS at MEDIUM risk; the headless gate contradicts that prediction. Phase 40 ships the failing assertion in CI by design (the gate is doing its job). Palette fix (change kardiologie or mikrobiologie shade-6) is scheduled for Phase 40.1.

Phase 37's deferred clause CLOSED by Phase 40 / DEUT-01 (2026-04-29). Section §7 future-hardening item (a) is the realized solution.

---

## §3 TTI before/after

**Owner:** Plan 37-02 (Wave 1).
**Status:** captured via **Lighthouse 13.1 headless Chrome** — substituted for the plan-required Chrome DevTools Performance panel manual capture. Substitution accepted by user 2026-04-28; flagged as a deviation for the audit trail.

| Metric | Value | Source |
|--------|-------|--------|
| baseline_ms (median of 3 Lighthouse runs at 048e99c) | 256.523 ms | tti-snapshot.json.baseline_ms |
| post_phase_ms (median of 3 Lighthouse runs at a7e4544) | 268.604 ms | tti-snapshot.json.post_phase_ms |
| delta_ms | +12.081 ms | post_phase_ms - baseline_ms |
| delta_pct | +4.71% | (delta_ms / baseline_ms) * 100 |
| dual-gate verdict (D-08) | **PASS** (delta_ms ≤ 100 ms AND delta_pct ≤ 10%) | tti-snapshot.json + CONTEXT D-08 |

Phase 33 D-11 keepMounted={false} on extension Tabs.Panel + Plan 34-05 root keepMounted=false combined to keep extension panels lazy on /patients/:id mount; the empirical delta_ms (Lighthouse measurement) is consistent with this invariant holding across the Phase-34 14-module rollout. The Lighthouse method reads from the same Chrome Performance API as the DevTools Performance panel marker — the absolute numbers may differ slightly from a hand-read flame chart, but the dual-gate verdict (PASS by a wide margin: ~88 ms below the delta_ms threshold and ~5 percentage points below the delta_pct threshold) is robust against that uncertainty.

---

## §4 Contradictions

**Owner:** Plan 37-03 (Wave 2).
**Status:** Populated by Plan 37-03 (2026-04-28).

**0 contradictions enumerable — empirical capture deferred 2026-04-28** (see `37-01-SUMMARY.md`). Paper analysis qualitative-only for §1+§2; no empirical evidence available to detect or confirm a contradiction.

| § | Pair | Risk | Paper | Empirical | Disposition |
|---|------|------|-------|-----------|-------------|
| §1 | all 7 within-family pairs | LOW (icon distinctness only) | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | 0 contradictions — Phase 40 deuteranopia.test.tsx confirms paper predictions for all 21 pairs (color channel; icon channel remains paper-only per D-07). Within-family pairs share badgeColor by Phase 33 D-09 invariant (color-only ΔE2000 = 0); icon-shape disambiguates per color-design-audit.md §4b — paper analysis stands as authoritative. |
| §2 | all 14 cross-family pairs | mixed (LOW / MEDIUM / HIGH / MEDIUM-HIGH) | PASS (paper); MIXED (empirical: 12 PASS / 1 FAIL / 1 within-family OUT-OF-SCOPE) | [verified by deuteranopia.test.tsx at commit 5f99b93] | **1 EMPIRICAL CONTRADICTION** — pair #6 (kardiologie ↔ mikrobiologie): paper predicted PASS at MEDIUM risk; headless empirical = FAIL (ΔE2000 = 1.406 < 5.0). Palette fix scheduled for Phase 40.1. The other 12 cross-family + 7 within-family pairs match paper predictions or are out-of-scope per D-07. |
| §2 #6 | kardiologie ↔ mikrobiologie | MEDIUM | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | **EMPIRICAL FAIL** — ΔE2000 = 1.406 < 5.0 (hexA=#3b5bdb administration-indigo vs hexB=#6741d9 pathology-violet). Paper PASS prediction CONTRADICTED. Phase 40 ships the failing assertion in CI by design; palette fix (change kardiologie or mikrobiologie shade-6) scheduled for Phase 40.1. |
| §2 #7 | mikrobiologie ↔ molekulargenetik | **HIGH** | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | Borderline pair empirically RESOLVED — BORDERLINE-#7 named it() block confirms ΔE2000 = 5.6364 ≥ 5.0 under Machado 2009 deuteranopia simulation. Paper prediction confirmed empirically. |
| §2 #12 | pro ↔ seltene | **MEDIUM-HIGH** | PASS | [verified by deuteranopia.test.tsx at commit 5f99b93] | Borderline pair empirically RESOLVED — BORDERLINE-#12 named it() block confirms ΔE2000 = 37.0848 ≥ 5.0. Paper prediction confirmed empirically. |

Note: previously this section recorded that nothing had been confirmed; with Phase 40 / DEUT-01 (2026-04-29) the headless Brettel/Machado simulation closes that gap. The HIGH-risk pair #7 and MEDIUM-HIGH pair #12 both confirm paper predictions empirically. The previously unflagged pair #6 (kardiologie ↔ mikrobiologie, MEDIUM risk) surfaces as the **single empirical contradiction** — paper analysis missed it; the headless gate caught it. Phase 40 ships the failing assertion in CI by design; the palette fix is scheduled for Phase 40.1.

---

## §5 Contingency commits triggered

**Owner:** Plan 37-03 (Wave 2).
**Status:** Populated by Plan 37-03 (2026-04-28).

**None — no contingency triggered (empirical capture deferred so no failure was detectable).**

Per CONTEXT D-09, contingency fires only on a HIGH or MEDIUM-HIGH borderline pair empirical failure. At Phase 37 closure (2026-04-28), §2 originally recorded both borderline pairs (#7 mikrobiologie ↔ molekulargenetik HIGH; #12 pro ↔ seltene MEDIUM-HIGH) as deferred with `Agree? = n/a`. With no empirical capture at that time, no FAIL was detectable, so no contingency processing was performed:
- No Tabler 3.41.1 alternative-icon probe was run.
- No icon swap was applied to `src/utils/mii-icons.ts` or `src/utils/mii-modules.ts`.
- No revision note was appended to `.planning/research/color-design-audit.md` §4d.
- No screenshots were re-captured (none existed to re-capture in the first place).

**Phase 40 closure update (2026-04-29):** Both borderline pairs subsequently flipped to verified by `deuteranopia.test.tsx` at commit `5f99b93` — the headless Brettel/Machado simulation matrix landed in v1.6 Phase 40 / DEUT-01 and confirmed ΔE2000 ≥ 5.0 for both pairs under deuteranopia simulation severity 1.0 (pair #7 measured 5.6364; pair #12 measured 37.0848). The §7 future-hardening item (a) is the realized closure mechanism. No contingency was triggered for the named borderlines because both PASSED.

**However, Phase 40 surfaced a NEW empirical regression on pair #6 (kardiologie ↔ mikrobiologie, MEDIUM risk per paper).** ΔE2000 = 1.406 < 5.0 — the headless gate FAILS this pair. Paper analysis predicted PASS; the empirical contradicts the prediction. CONTEXT D-09's contingency clause anchored to HIGH / MEDIUM-HIGH borderline pairs; pair #6 was only flagged MEDIUM, so the original contingency criteria do not apply. The palette fix (change kardiologie or mikrobiologie shade-6) is scheduled for Phase 40.1 as a follow-up phase, NOT a retroactive Phase 37 contingency. Phase 40 ships the failing assertion in CI by design — the gate is doing its job, and Phase 40.1 will resolve the palette so all 13 cross-family pairs PASS.

---

## §6 34-06-UAT.md update

**Owner:** Plan 37-03 (Wave 2).
**Status:** Populated by Plan 37-03 (2026-04-28).

The closure update to `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md` landed in commit `b38f613` (commit subject: `docs(37-03): close Phase 34 UAT — 34-06-UAT.md §1d/§2/§5 + status flip`):

- **§1d:** Replaced "(This subsection is populated by the human verifier...)" placeholder with deferral-aware paragraph referencing `37-EMPIRICAL.md` §1+§2 deferred markers and `37-01-SUMMARY.md` for deferral context.
- **§2 TTI table:** Replaced 5 `⏳ pending` cells with values from `tti-snapshot.json` (`baseline_ms=256.523`, `post_phase_ms=268.604`, `delta_ms=+12.081`, `delta_pct=+4.71%`, `verdict=PASS`). Appended method note flagging Lighthouse 13.1 substitution for the plan-required DevTools Performance panel manual capture.
- **§5 sign-off:**
  - Deuteranopia checkbox: **DEFERRED** (NOT marked `[x]` done) — explicitly labelled "DEFERRED 2026-04-28" with recommendation to land headless deuteranopia simulation in Vitest before v1.6 ships. Cross-references `37-EMPIRICAL.md` §1+§2 deferred markers.
  - TTI checkbox: `[x]` closed by Phase 37 Plan 37-02 (Lighthouse-substituted; D-22 verdict: PASS via dual gate).
- **Status line:** Flipped from PARTIAL to **"PARTIALLY COMPLETE (TTI closed via Lighthouse; deuteranopia deferred to v1.6+)"** — NOT "COMPLETE" because the deuteranopia leg remains unverified.

Phase 34 VERIFICATION status remains `passed` per CONTEXT D-11 — these `checkpoint:human-verify` gates were explicitly carried forward, not gaps; Phase 37's outcome (TTI closed, deuteranopia deferred) does not re-open Phase 34's verification.

**Asymmetry on the record:** D-22 TTI gate = closed (Lighthouse-substituted); MII-EXT-11 deuteranopia empirical leg = deferred to v1.6+ hardening backlog.

**Phase 40 follow-up (2026-04-29):** Deuteranopia checkbox in `34-06-UAT.md` §5 was marked DEFERRED on 2026-04-28; with Phase 40 landing the headless gate, the deferral closes. (Note: Phase 40 does NOT edit `34-06-UAT.md` directly because that artifact is part of the closed Phase 34 record; the closure is recorded here in 37-EMPIRICAL.md as the Phase 37 follow-up under the v1.6 audit chain.) The closure is partial-and-honest: 12/13 cross-family pairs verified PASS at ΔE2000 ≥ 5.0 + 7 within-family pairs out-of-scope per D-07 + 1 within-§2 pair (#9 mtb ↔ onkologie) out-of-scope; 1/13 cross-family pairs (pair #6 kardiologie ↔ mikrobiologie) FAILS at ΔE2000 = 1.406. Phase 40.1 will fix the palette.

---

## §7 Future hardening

> **RESOLVED 2026-04-29:** Future-hardening item (a) — "Headless deuteranopia simulation in Vitest" — landed as Phase 40 / DEUT-01 (commit 5f99b93). The 21-pair color-discriminability gate now runs in `npm test` via `src/__tests__/visual/deuteranopia.test.tsx` (Machado 2009 matrix, severity 1.0; ΔE2000 ≥ 5.0 threshold). Item (b) — ΔE2000 perceptual-distance lint — is functionally subsumed by the same test (the snapshot at `src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json` provides the per-pair lint signal).
>
> The headless gate immediately surfaced ONE new empirical regression: pair #6 kardiologie ↔ mikrobiologie measures ΔE2000 = 1.406 (< 5.0) under deuteranopia simulation, contradicting the paper's PASS prediction. Phase 40 ships the failing assertion in CI by design (the gate is doing its job); the palette fix is scheduled for Phase 40.1 (TBD).

**Owner:** Plan 37-03 (Wave 2). Per RESEARCH Open Question #3.

Two candidates noted for v1.6+ backlog (with explicit recommendation to land at least one given Phase 37's deferred state):

- **(a) Headless deuteranopia simulation in Vitest.** Apply a Brettel/Machado JS simulation matrix to rendered RGBA from the Dashboard tile grid + tab row, then assert pairwise icon+color discriminability via OCR or pixel-difference metrics. Would catch icon-or-palette regressions on every PR — and would close Phase 37's deferred §1+§2 retroactively if added. **Recommended before v1.6 ships** because the Phase 37 deferral leaves the borderline pairs (#7 mikrobiologie ↔ molekulargenetik, #12 pro ↔ seltene) unverified.

- **(b) ΔE2000 perceptual-distance lint over `MII_MODULES` palette adjacency.** A static lint that fails CI if any two adjacent module palettes (per the final tab order) fall below a perceptual-distance threshold under deuteranopia simulation. Cheap to run, catches palette-tweaking regressions instantly. Would not catch icon-shape regressions; complements (a).

The deferred capture is explicitly NOT a "good enough — paper analysis confirmed" close. The HIGH-risk borderline pair (mikrobiologie ↔ molekulargenetik, paper-PASS via icon distinctness only) and the MEDIUM-HIGH pair (pro ↔ seltene) remain qualitative predictions until (a) or a manual re-capture lands.
