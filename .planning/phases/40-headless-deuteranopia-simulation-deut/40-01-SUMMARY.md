---
phase: 40-headless-deuteranopia-simulation-deut
plan: 01
subsystem: testing

tags: [vitest, deuteranopia, color-vision, ciede2000, machado-2009, mii-modules, accessibility]

# Dependency graph
requires:
  - phase: 33-mii-extension-modules-foundation
    provides: 7 custom MantineColorsTuple palettes + 14 base Mantine palettes (theme.ts) + MII_MODULES badgeColor invariant (D-09 within-family pairs share palette family)
  - phase: 34-14-mii-extension-modules-palette-bundled-profiles
    provides: 21 MII_MODULES entries with badgeColor field; final tab order anchoring §2 cross-family pair sequence
  - phase: 37-phase-34-uat-empirical-capture-deuteranopia-tti
    provides: 21-pair authoritative pair list (37-EMPIRICAL.md §1+§2); paper analysis predictions; deferred capture annotations to flip
  - phase: 39-v1.5-audit-trail-backfill
    provides: 37-VALIDATION.md `pending: DEUT-01 in Phase 40` annotation to remove; nyquist 9/10 baseline to flip to 10/10
provides:
  - "src/utils/colorVision.ts: pure-JS Machado 2009 deuteranopia simulation matrix + sRGB→linear→XYZ→Lab pipeline + CIEDE2000 (Sharma 2005 port) + MIN_DELTA_E_DEUTERANOPIA = 5.0 threshold"
  - "src/__tests__/visual/deuteranopia.test.tsx: 25-test headless gate covering all 21 MII module adjacent pairs (13 cross-family at ΔE2000 ≥ 5.0; 8 within-family exempt per D-07/D-09; 2 named borderline blocks)"
  - "src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json: 21-key per-pair ΔE2000 + hex inputs + threshold result for PR-time drift detection"
  - "Phase 37 closure annotations: 37-EMPIRICAL.md status `deferred-empirical → resolved`; 37-VALIDATION.md `nyquist_compliant: false → true`; v1.5 audit `re_audited_2` entry"
affects:
  - "Phase 40.1 (TBD) — palette fix for pair #6 kardiologie ↔ mikrobiologie ΔE2000 = 1.406 < 5.0 (empirical regression surfaced by this phase's gate)"
  - "Future palette refactors — any change to MII_MODULES.badgeColor or theme.ts shade-6 hex values will surface as a snapshot diff in PR review"
  - "v1.6 milestone audit — Phase 37 deuteranopia carry-over closed; one new tech_debt cluster opened (Phase 40.1 palette fix)"

# Tech tracking
tech-stack:
  added: []  # zero new npm dependencies (pure-JS implementation per Phase 40 CONTEXT D-01)
  patterns:
    - "Headless visual-discriminability gate via JSDOM + computed-style + pure-JS color-math (no Puppeteer, no Playwright, no Chrome DevTools manual capture)"
    - "Pair-fixture data structure with id (1..21) + section (§1/§2) + label + within-family flag for traceability with Phase 37 EMPIRICAL.md row order"
    - "Named it() blocks for borderline pairs (failure attribution) + it.each() for non-borderline cross-family pairs"
    - "JSON snapshot via toMatchFileSnapshot for trend-tracking palette drift across PRs"

key-files:
  created:
    - "src/utils/colorVision.ts (323 lines: Machado matrix + EOTF + CIEDE2000 + MIN_DELTA_E threshold)"
    - "src/utils/__tests__/colorVision.test.ts (Sharma 2005 reference fixtures + Machado pipeline fixtures)"
    - "src/__tests__/visual/deuteranopia.test.tsx (~370 lines: PAIRS fixture + measurePairDeltaE helper + 25 tests)"
    - "src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json (21-key per-pair snapshot)"
    - ".planning/phases/40-headless-deuteranopia-simulation-deut/40-01-SUMMARY.md (this file)"
  modified:
    - ".planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-EMPIRICAL.md (21 [deferred] → [verified by deuteranopia.test.tsx at commit 5f99b93]; status resolved; closed_by added; §4-§7 annotated)"
    - ".planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VALIDATION.md (nyquist_compliant flipped false → true; pending annotation removed; re_audited_2 added; notes block extended)"
    - ".planning/milestones/v1.5-MILESTONE-AUDIT.md (re_audited_2; nyquist 9/10 → 10/10; phases 9/10 → 10/10; closures[] gains Phase 40 entry; tech_debt cluster swapped)"

key-decisions:
  - "Land the failing pair #6 kardiologie ↔ mikrobiologie assertion in CI BY DESIGN (Option 1 of the user's checkpoint decision). The empirical contradiction of paper analysis is the gate working as designed; do NOT skip the pair, do NOT lower the threshold, do NOT mark it tolerated."
  - "Phase 40 ships with 1 failing test in CI; Phase 40.1 (to be drafted) will fix the palette by changing kardiologie or mikrobiologie shade-6"
  - "Within-family pairs (8 total: 7 §1 entries + pair #16 mtb ↔ onkologie which shares oncology family) exempted from the color-only gate per D-07 and Phase 33 D-09 invariant — color-only ΔE2000 = 0 by design; icon-shape paper analysis remains authoritative"
  - "Net debt accounting: closed 1 audit-trail debt cluster (Phase 37 deuteranopia carry-over) + opened 1 palette debt cluster (Phase 40.1 palette fix); v1.5 milestone status remains `tech_debt`"

patterns-established:
  - "Headless color-vision gate: simulate at severity 1.0 + ΔE2000 ≥ 5.0 + JSON snapshot for drift tracking — applies cleanly to protanopia/tritanopia in v1.7+ if needed (deferred per CONTEXT)"
  - "Audit-chain closure: when a deferred capture is empirically replaced, the closure annotation must (a) cite the closing commit SHA, (b) preserve the historical narrative (rewrite to past tense rather than overwriting), (c) flag any newly-surfaced regressions as forward-debt rather than re-opening the closed phase"

requirements-completed: [DEUT-01]

# Metrics
duration: ~71min
completed: 2026-04-29
---

# Phase 40 Plan 01: Headless Deuteranopia Simulation (DEUT-01) Summary

**Pure-JS Machado 2009 deuteranopia simulation + CIEDE2000 perceptual-distance gate covering all 21 MII module adjacent pairs in Vitest; surfaced one empirical regression (pair #6 kardiologie ↔ mikrobiologie ΔE2000 = 1.406 < 5.0) that paper analysis had missed.**

## Performance

- **Duration:** ~71 min (Task 1 commit 13:15:59 → Task 7 commit 14:26:49 CEST)
- **Started:** 2026-04-29T11:15:59Z (UTC)
- **Completed:** 2026-04-29T12:26:49Z (UTC)
- **Tasks:** 7 (Tasks 1-3 by initial agent; Tasks 4-7 by this continuation agent after the user's checkpoint decision)
- **Files modified:** 4 source/test files + 3 planning-doc files + this SUMMARY = 8 files total

## Empirical Contradiction (PROMINENT)

Phase 40's headless gate immediately surfaced **ONE empirical regression that paper analysis had not caught**:

| Pair | Modules | Palette pair | Paper risk | Paper prediction | Empirical | Disposition |
|------|---------|--------------|------------|------------------|-----------|-------------|
| **#6 (PAIRS.id 13)** | **kardiologie ↔ mikrobiologie** | administration-indigo (#3b5bdb) vs pathology-violet (#6741d9) | MEDIUM | PASS | **FAIL: ΔE2000 = 1.406** | **Phase 40 ships failing assertion in CI by design; Phase 40.1 will fix palette** |

The paper analysis (color-design-audit.md §4c) reasoned qualitatively across both Brettel and Machado simulation models and predicted PASS at MEDIUM risk. The headless Machado 2009 + ΔE2000 gate empirically contradicts the prediction by a substantial margin (1.406 vs threshold 5.0 — a 3.5× shortfall). The gate is doing its job: paper analysis was incomplete, and now we know exactly which pair needs a palette fix.

**Phase 40 ships with 1 failing test in CI as designed. Phase 40.1 (to be drafted) will fix the palette by changing kardiologie or mikrobiologie shade-6.**

## Measured ΔE2000 for All 13 Cross-Family Pairs

(Snapshot at `src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json` — full 21-pair coverage including 8 within-family exempt entries)

| PAIRS.id | EMPIRICAL.md §2 row | Pair | hex_a | hex_b | ΔE2000 | Status |
|----------|---------------------|------|-------|-------|--------|--------|
| 8  | 1  | medikation ↔ bildgebung           | #fd7e14 | #15aabf | 52.5942 | PASS |
| 9  | 2  | bildgebung ↔ biobank              | #15aabf | #12b886 | 22.7379 | PASS |
| 10 | 3  | biobank ↔ dokument                | #12b886 | #4c6ef5 | 37.3257 | PASS |
| 11 | 4  | dokument ↔ intensivmedizin        | #4c6ef5 | #12b886 | 37.3257 | PASS |
| 12 | 5  | intensivmedizin ↔ kardiologie     | #12b886 | #3b5bdb | 37.3257 | PASS |
| **13** | **6**  | **kardiologie ↔ mikrobiologie**       | **#3b5bdb** | **#6741d9** | **1.4062** | **FAIL ← INTENDED** |
| 14 | 7  | mikrobiologie ↔ molekulargenetik  | #6741d9 | #9c36b5 | 5.6364  | PASS (BORDERLINE-#7) |
| 15 | 8  | molekulargenetik ↔ mtb            | #9c36b5 | #c92a2a | 50.7228 | PASS |
| 17 | 10 | onkologie ↔ pathologie            | #fa5252 | #7950f2 | 59.2543 | PASS |
| 18 | 11 | pathologie ↔ pro                  | #7950f2 | #c2255c | 43.9451 | PASS |
| 19 | 12 | pro ↔ seltene                     | #c2255c | #9c36b5 | 37.0848 | PASS (BORDERLINE-#12) |
| 20 | 13 | seltene ↔ studie                  | #9c36b5 | #15aabf | 9.3391  | PASS |
| 21 | 14 | studie ↔ symptom                  | #15aabf | #c2255c | 28.4882 | PASS |

(Pair #16 / EMPIRICAL.md §2 row 9: mtb ↔ onkologie excluded — both `oncology` palette family; D-07 OUT OF SCOPE.)

**Suite result:** 1105 passing / **1 failing** / 22 todo / 1128 total (Phase 38.2 baseline 1064 → Phase 40 1105 = +41 new tests). The single failure is intentional — pair #6's failing assertion is the GATE WORKING, not a bug.

## Accomplishments

- **Pure-JS color-vision pipeline** at `src/utils/colorVision.ts`: Machado 2009 matrix (severity 1.0), sRGB↔linear EOTF (IEC 61966-2-1), sRGB→XYZ→Lab (Bruce Lindbloom matrices, D65 reference white), full CIEDE2000 (Sharma 2005 reference port). Zero new npm dependencies.
- **21-pair fixture** at `src/__tests__/visual/deuteranopia.test.tsx` mirroring 37-EMPIRICAL.md §1+§2 row order with `withinFamily` flag and BORDERLINE-#7/#12 named blocks.
- **Headless gate runs in CI** as part of `npm test`; auto-discovered by Vitest globbing; no special config needed.
- **Empirical contradiction surfaced** on pair #6 (paper had predicted PASS; headless empirical FAILS). Phase 40.1 carry-over scheduled.
- **Phase 37 deferred clause closed on disk:** 21 [deferred] cells flipped to [verified by deuteranopia.test.tsx at commit 5f99b93]; status `deferred-empirical → resolved`; closed_by/closed_at/closed_by_commit fields populated.
- **37-VALIDATION.md frontmatter flipped:** `nyquist_compliant: false → true`; `pending: DEUT-01 in Phase 40` annotation removed; re_audited_2 + re_audited_2_by added.
- **v1.5 milestone audit refreshed:** re_audited_2 entry; nyquist 9/10 → 10/10; phases 9/10 → 10/10; closures[] gains Phase 40 entry; tech_debt cluster swapped (closed Phase 37 carry-over → opened Phase 40.1 palette fix).

## Task Commits

Each task atomically committed (commits 1-3 by initial agent; commits 4-6 merged into one by continuation agent because the user's decision required them to land together as a single intentional gate).

1. **Task 1: Machado 2009 deuteranopia simulation** — `daeca1a` (feat)
2. **Task 2: ΔE2000 + srgbToLab** — `a2e2ec5` (feat)
3. **Task 3: 21-pair PAIRS fixture** — `4b98444` (feat)
4. **Tasks 4+5+6: Land ΔE2000 ≥ 5.0 gate + JSON snapshot + full-suite verify** — `5f99b93` (test) — INTENTIONAL FAILING ASSERTION on pair #6 per the user's checkpoint decision (Option 1: land the gate as designed)
5. **Task 7: Phase 37 closure annotations + v1.5 audit refresh** — `b0ec74c` (docs)

(Plan metadata commit pending after this SUMMARY lands.)

## Files Created/Modified

**Source/test (committed in 5f99b93):**
- `src/__tests__/visual/deuteranopia.test.tsx` — extended Task 3's fixture with 12 cross-family it.each() assertions + 2 named BORDERLINE blocks + within-family describe.it (8 pairs documented exempt) + snapshot drift tracker
- `src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json` — 21-key per-pair snapshot, including the failing pair #6 entry verbatim with `passes_threshold: false`

**Planning docs (committed in b0ec74c):**
- `.planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-EMPIRICAL.md` — full §1+§2 closure annotations + §4 contradictions table updated + §5 contingency narrative rewritten in past tense + §6/§7 footers + frontmatter status flip
- `.planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VALIDATION.md` — frontmatter flip (nyquist false → true; pending removed; re_audited_2 added) + extended notes block
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — re_audited_2; scores updated; closures[] entry; tech_debt cluster swapped; Decision section rewritten

## Decisions Made

1. **Land the failing assertion (user checkpoint decision Option 1).** Pair #6 kardiologie ↔ mikrobiologie at ΔE2000 = 1.406 fails the ≥ 5.0 threshold. Per the user's explicit decision, the failing assertion ships in CI by design — the gate is doing its job. Phase 40.1 will fix the palette. Did NOT skip the pair, did NOT lower the threshold, did NOT mark it tolerated.
2. **Snapshot includes all 21 pairs (not just 13 cross-family).** Within-family entries set `passes_threshold: false` (the color-only gate doesn't apply, but the entry is logged for audit-trail completeness).
3. **§5 narrative rewritten in past tense rather than overwritten.** This preserves the historical observation (Phase 37 deferral was real at the time) while dropping the literal `[deferred]` substring required by the closure verification.
4. **`status: tech_debt` retained at v1.5 milestone level (NOT flipped to `passed`).** Phase 40 closes the Phase 37 deuteranopia carry-over but opens a new Phase 40.1 palette debt — net zero on debt-cluster count. This is honest accounting.
5. **Phase 40.1 is a NEW phase, NOT a Phase 37 re-opening.** Pair #6 was MEDIUM-risk per paper (not HIGH/MEDIUM-HIGH), so the Phase 37 contingency clause does not apply. The empirical regression is a Phase 40 finding scheduled for Phase 40.1 follow-up.

## Deviations from Plan

The plan's `<verify>` for Task 4 expected the named BORDERLINE blocks AND the it.each block to all PASS. In execution, pair #13 in PAIRS.id (= EMPIRICAL.md §2 row 6 = kardiologie ↔ mikrobiologie) FAILED at ΔE2000 = 1.406. **This was NOT a Rule-1 bug** to auto-fix — it surfaced a genuine empirical contradiction with paper analysis. Per the user's checkpoint decision (Option 1), the failing assertion was landed AS DESIGNED.

**Adjustments to plan execution (NOT auto-fixes; user-directed):**

1. **[User decision — Option 1] Land failing pair #13 assertion in CI.** Plan's `<behavior>` block in Task 4 implied all 21 pairs would pass. In practice 12/13 cross-family + 8 within-family exempt = 20/21 pass; pair #13 fails empirically. Per user's explicit instruction this is the gate working as designed; the failing assertion ships intentionally, Phase 40.1 carries over the palette fix.

2. **[User decision — Option 1] Tasks 4-6 commits merged into single commit.** Plan called for atomic per-task commits. Because Tasks 4 + 5 + 6 form a single intentional gate (the failing assertion + the snapshot recording the failure + the full-suite verification of the failure-as-designed), merging them into one commit (`5f99b93`) with the user-specified message clearly documenting the empirical contradiction is more honest than three separate commits that would each appear "broken" in isolation.

3. **[User decision — Option 1] Pair #6 (EMPIRICAL.md §2 row 6) annotated as EMPIRICAL FAIL in 37-EMPIRICAL.md §2 table + §4 contradictions table + §5 narrative.** This was not in the plan's Task 7 sub-steps (which assumed all named borderlines + cross-family pairs would PASS). Adjusted the §2 table cell, §4 contradictions row, and §5 closure paragraph to document the empirical contradiction prominently and cite Phase 40.1 as the forward path.

4. **[User decision — Option 1] v1.5-MILESTONE-AUDIT.md: tech_debt cluster swapped (NOT flipped to `passed`).** Plan's Task 7 sub-step 3.1 said "Update `status: tech_debt` → `status: passed`" if no other items remain. Per user's instruction "Status remains `tech_debt` (the audit-trail debt closes but a NEW palette debt opens — net zero, but explicit)" — kept `tech_debt` and added a new tech_debt entry for the Phase 40.1 palette fix while moving the closed Phase 37 carry-over into a new `closed_clusters` block.

---

**Total deviations:** 4 user-directed adjustments (all flow from the single Option-1 checkpoint decision)
**Impact on plan:** No scope creep; the gate landed as the plan specified, but the empirical outcome on pair #6 differs from the plan's assumption. All adjustments documented honestly in the SUMMARY and the audit chain.

## Issues Encountered

- **Pair #6 paper-vs-empirical contradiction.** Paper analysis predicted PASS at MEDIUM risk; empirical Machado 2009 + ΔE2000 calculation = 1.406 (FAIL). Resolved by user checkpoint decision Option 1 (land the gate as designed; Phase 40.1 will fix the palette).

## User Setup Required

None — no external service configuration required. The new test runs as part of `npm test` and is auto-discovered by Vitest globbing.

## Next Phase Readiness

**Ready for next phase:**
- Phase 37 deuteranopia carry-over CLOSED on disk; v1.5 audit chain consistent.
- Phase 40 ships clean infrastructure: Machado 2009 simulation + ΔE2000 utility; 21-pair fixture; 21-key JSON snapshot; CI gate active.
- Snapshot drift detection wired — any future palette change to MII_MODULES.badgeColor or theme.ts will surface in PR diffs.

**Open carry-over for Phase 40.1 (TBD):**
- Pair #6 kardiologie ↔ mikrobiologie palette fix (change kardiologie or mikrobiologie shade-6 so the pair clears ΔE2000 ≥ 5.0; the snapshot will surface the corrected delta in the Phase 40.1 PR diff).
- Failing assertion in CI is intentional and SHOULD remain failing until Phase 40.1 lands.

**Deferred to v1.7+ candidates (per Phase 40 CONTEXT):**
- Protanopia + tritanopia simulations (would 3× the test count; pure-JS infrastructure already in place).
- Icon-shape headless discriminability gate (would require glyph-extraction-then-comparison; paper analysis in color-design-audit.md §4b/§4c remains authoritative for icon claims per D-07).

## Self-Check: PASSED

**Files (all FOUND):**
- src/utils/colorVision.ts
- src/__tests__/visual/deuteranopia.test.tsx
- src/__tests__/visual/__snapshots__/deuteranopia-pair-deltas.json
- .planning/phases/40-headless-deuteranopia-simulation-deut/40-01-SUMMARY.md

**Commits (all FOUND on this worktree's HEAD ancestry):**
- daeca1a (Task 1 — Machado matrix)
- a2e2ec5 (Task 2 — ΔE2000 + srgbToLab)
- 4b98444 (Task 3 — PAIRS fixture)
- 5f99b93 (Tasks 4+5+6 — failing-assertion gate + snapshot + full-suite verify)
- b0ec74c (Task 7 — audit-chain refresh)

---
*Phase: 40-headless-deuteranopia-simulation-deut*
*Completed: 2026-04-29*
