---
phase: 37
plan: 01
authored: 2026-04-28
status: deferred-empirical
sections_owned_by:
  "§1 Within-family pairs": "Plan 37-01 (deferred — captures skipped)"
  "§2 Cross-family pairs": "Plan 37-01 (deferred — captures skipped)"
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
| 1 | onkologie + mtb | oncology (red) | IconRadioactive | IconUsersGroup | PASS | [deferred] | n/a | Radial trefoil vs clustered circles |
| 2 | bildgebung + studie | imaging (cyan) | IconPhoto | IconClipboardData | PASS | [deferred] | n/a | Frame+lens vs clipboard-with-lines |
| 3 | molekulargenetik + seltene | genetics (grape) | IconDna | IconPuzzle | PASS | [deferred] | n/a | DNA helix vs interlocking tiles |
| 4 | pathologie + mikrobiologie | pathology (violet) | IconMicroscope | IconVirus | PASS | [deferred] | n/a | Tall apparatus vs polyhedral cluster (audit named IconBacteria; Plan 34-04 swapped to IconVirus per package availability — see RESEARCH §Pitfall 5) |
| 5 | biobank + intensivmedizin | bioanalysis (teal) | IconTestPipe | IconBedFilled | PASS | [deferred] | n/a | Vertical cylinder vs horizontal rectangle |
| 6 | kardiologie + dokument | administration (indigo) | IconHeartbeat | IconFileDescription | PASS | [deferred] | n/a | Waveform vs rectangle-with-lines |
| 7 | symptom + pro | patient-reported (pink) | IconMoodSmile | IconListCheck | PASS | [deferred] | n/a | Circle-face vs linear checklist (audit named IconQuestionnaire; Plan 34-04 swapped to IconListCheck — see RESEARCH §Pitfall 5) |

**Within-family summary:** 0/7 pairs empirically verified (all deferred). Paper prediction stands as the only available evidence.

---

## §2 Cross-family adjacent tabs (mirrors color-design-audit.md §4c)

14 pairs across the final tab order. Paper predicted 14/14 PASS. Two borderline pairs flagged for empirical attention:
- **mikrobiologie ↔ molekulargenetik** — HIGH color-collapse risk (violet vs grape both shift bluish-purple under deuteranopia)
- **pro ↔ seltene** — MEDIUM-HIGH color-collapse risk (dark pink vs grape both reddish-purple family)

| # | Left module | Right module | Palette pair | Risk | Paper | Empirical | Agree? |
|---|-------------|--------------|--------------|------|-------|-----------|--------|
| 1 | medikation | bildgebung | orange vs imaging-cyan | LOW | PASS | [deferred] | n/a |
| 2 | bildgebung | biobank | imaging-cyan vs bioanalysis-teal | MEDIUM | PASS | [deferred] | n/a |
| 3 | biobank | dokument | bioanalysis-teal vs administration-indigo | MEDIUM | PASS | [deferred] | n/a |
| 4 | dokument | intensivmedizin | administration-indigo vs bioanalysis-teal | MEDIUM | PASS | [deferred] | n/a |
| 5 | intensivmedizin | kardiologie | bioanalysis-teal vs administration-indigo | MEDIUM | PASS | [deferred] | n/a |
| 6 | kardiologie | mikrobiologie | administration-indigo vs pathology-violet | MEDIUM | PASS | [deferred] | n/a |
| 7 | mikrobiologie | molekulargenetik | pathology-violet vs genetics-grape | **HIGH** | PASS | [deferred] | n/a |
| 8 | molekulargenetik | mtb | genetics-grape vs oncology-dark-red | LOW | PASS | [deferred] | n/a |
| 9 | mtb | onkologie | within oncology family | N/A | PASS | [deferred] | n/a |
| 10 | onkologie | pathologie | oncology-red vs pathology-violet | MEDIUM | PASS | [deferred] | n/a |
| 11 | pathologie | pro | pathology-violet vs patient-reported-pink | MEDIUM | PASS | [deferred] | n/a |
| 12 | pro | seltene | patient-reported-pink vs genetics-grape | **MEDIUM-HIGH** | PASS | [deferred] | n/a |
| 13 | seltene | studie | genetics-grape vs imaging-cyan | LOW | PASS | [deferred] | n/a |
| 14 | studie | symptom | imaging-cyan vs patient-reported-pink | LOW | PASS | [deferred] | n/a |

**Cross-family summary:** 0/14 pairs empirically verified (all deferred).

**HIGH/MEDIUM-HIGH attention pairs (would have driven Plan 37-03 contingency decision):**
- Pair #7 (mikrobiologie ↔ molekulargenetik): empirical [deferred] — borderline pair NOT empirically verified.
- Pair #12 (pro ↔ seltene): empirical [deferred] — borderline pair NOT empirically verified.

Phase 37 closes without resolving the empirical question for these two borderline pairs. Section §7 names the future-hardening candidates that would close this gap.

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
| §1 | all 7 within-family pairs | LOW (icon distinctness only) | PASS | [deferred] | No empirical result captured; cannot enumerate disagreement |
| §2 | all 14 cross-family pairs | mixed (LOW / MEDIUM / HIGH / MEDIUM-HIGH) | PASS | [deferred] | No empirical result captured; cannot enumerate disagreement |
| §2 #7 | mikrobiologie ↔ molekulargenetik | **HIGH** | PASS | [deferred] | Borderline pair NOT empirically verified — paper prediction stands as only evidence; future-hardening item §7(a) recommended before v1.6 to retroactively close |
| §2 #12 | pro ↔ seltene | **MEDIUM-HIGH** | PASS | [deferred] | Borderline pair NOT empirically verified — paper prediction stands as only evidence; future-hardening item §7(a) recommended before v1.6 to retroactively close |

Note: writing "0 contradictions — paper analysis confirmed empirically" would be dishonest because nothing was confirmed. The HIGH-risk pair #7 (mikrobiologie ↔ molekulargenetik, which relies on icon distinctness alone since pathology-violet vs genetics-grape both shift bluish-purple under deuteranopia) and the MEDIUM-HIGH pair #12 (pro ↔ seltene) remain qualitative predictions. RESEARCH §Pitfall 8 noted that the audit reasoned across both Brettel and Machado simulation models qualitatively; Phase 37's deferral leaves both unverified empirically.

---

## §5 Contingency commits triggered

**Owner:** Plan 37-03 (Wave 2).
**Status:** Populated by Plan 37-03 (2026-04-28).

**None — no contingency triggered (empirical capture deferred so no failure was detectable).**

Per CONTEXT D-09, contingency fires only on a HIGH or MEDIUM-HIGH borderline pair empirical failure. §2 records both borderline pairs (#7 mikrobiologie ↔ molekulargenetik HIGH; #12 pro ↔ seltene MEDIUM-HIGH) as `[deferred]` with `Agree? = n/a`. With no empirical capture, no FAIL is detectable, so no contingency processing was performed:
- No Tabler 3.41.1 alternative-icon probe was run.
- No icon swap was applied to `src/utils/mii-icons.ts` or `src/utils/mii-modules.ts`.
- No revision note was appended to `.planning/research/color-design-audit.md` §4d.
- No screenshots were re-captured (none existed to re-capture in the first place).

This is a deferral, not a Branch A close. The qualitative paper analysis is the only available evidence. Section §7 names the future-hardening candidates that would retroactively close this gap.

---

## §6 34-06-UAT.md update

**Owner:** Plan 37-03 (Wave 2).
**Status:** Populated by Plan 37-03 (2026-04-28).

The closure update to `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md` landed in commit `<SHA-PENDING>` (this commit is about to be created — see commit subject `docs(37-03): close Phase 34 UAT — 34-06-UAT.md §1d/§2/§5 + 37-EMPIRICAL.md §6 cross-ref`):

- **§1d:** Replaced "(This subsection is populated by the human verifier...)" placeholder with deferral-aware paragraph referencing `37-EMPIRICAL.md` §1+§2 deferred markers and `37-01-SUMMARY.md` for deferral context.
- **§2 TTI table:** Replaced 5 `⏳ pending` cells with values from `tti-snapshot.json` (`baseline_ms=256.523`, `post_phase_ms=268.604`, `delta_ms=+12.081`, `delta_pct=+4.71%`, `verdict=PASS`). Appended method note flagging Lighthouse 13.1 substitution for the plan-required DevTools Performance panel manual capture.
- **§5 sign-off:**
  - Deuteranopia checkbox: **DEFERRED** (NOT marked `[x]` done) — explicitly labelled "DEFERRED 2026-04-28" with recommendation to land headless deuteranopia simulation in Vitest before v1.6 ships. Cross-references `37-EMPIRICAL.md` §1+§2 deferred markers.
  - TTI checkbox: `[x]` closed by Phase 37 Plan 37-02 (Lighthouse-substituted; D-22 verdict: PASS via dual gate).
- **Status line:** Flipped from PARTIAL to **"PARTIALLY COMPLETE (TTI closed via Lighthouse; deuteranopia deferred to v1.6+)"** — NOT "COMPLETE" because the deuteranopia leg remains unverified.

Phase 34 VERIFICATION status remains `passed` per CONTEXT D-11 — these `checkpoint:human-verify` gates were explicitly carried forward, not gaps; Phase 37's outcome (TTI closed, deuteranopia deferred) does not re-open Phase 34's verification.

**Asymmetry on the record:** D-22 TTI gate = closed (Lighthouse-substituted); MII-EXT-11 deuteranopia empirical leg = deferred to v1.6+ hardening backlog.

---

## §7 Future hardening

**Owner:** Plan 37-03 (Wave 2). Per RESEARCH Open Question #3.

Two candidates noted for v1.6+ backlog (with explicit recommendation to land at least one given Phase 37's deferred state):

- **(a) Headless deuteranopia simulation in Vitest.** Apply a Brettel/Machado JS simulation matrix to rendered RGBA from the Dashboard tile grid + tab row, then assert pairwise icon+color discriminability via OCR or pixel-difference metrics. Would catch icon-or-palette regressions on every PR — and would close Phase 37's deferred §1+§2 retroactively if added. **Recommended before v1.6 ships** because the Phase 37 deferral leaves the borderline pairs (#7 mikrobiologie ↔ molekulargenetik, #12 pro ↔ seltene) unverified.

- **(b) ΔE2000 perceptual-distance lint over `MII_MODULES` palette adjacency.** A static lint that fails CI if any two adjacent module palettes (per the final tab order) fall below a perceptual-distance threshold under deuteranopia simulation. Cheap to run, catches palette-tweaking regressions instantly. Would not catch icon-shape regressions; complements (a).

The deferred capture is explicitly NOT a "good enough — paper analysis confirmed" close. The HIGH-risk borderline pair (mikrobiologie ↔ molekulargenetik, paper-PASS via icon distinctness only) and the MEDIUM-HIGH pair (pro ↔ seltene) remain qualitative predictions until (a) or a manual re-capture lands.
