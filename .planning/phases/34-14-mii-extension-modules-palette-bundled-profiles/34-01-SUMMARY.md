---
phase: 34-14-mii-extension-modules-palette-bundled-profiles
plan: 01
subsystem: research
tags: [mii, fhir, palette, wcag, tabler-icons, deuteranopia, color-audit]

requires:
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    provides: MiiModule schema widen (string | string[], category, patientSearchParamOverrides, extraQueryByType), D-17 per-module contract test, partition+Collapse UI infrastructure, live-Blaze UAT-FU-06 probe pattern
provides:
  - Per-module spec table for 14 MII extension modules (canonical IG URL, package name, live 2026-04-24 version, pre-GA flag, primary + secondary_types JSON array, patientSearchParamOverrides)
  - 7-palette WCAG AA contrast audit (all passing; imaging, bioanalysis, oncology seeds tweaked darker to clear 4.5:1 floor)
  - 21 Tabler icon assignments (base 7 + extension 14) with rationale per extension module
  - Paper-only deuteranopia discriminability assessment (7/7 within-family + 14/14 cross-family pairs predicted paper-pass; no preemptive icon swaps required)
  - Borderline pair hypothesis for Plan 34-06 empirical verification (mikrobiologie/molekulargenetik violet-vs-grape + pro/seltene pink-vs-grape)
affects: [plan-34-02, plan-34-03, plan-34-04, plan-34-05, plan-34-06]

tech-stack:
  added: []
  patterns:
    - "Per-module spec audit as pre-implementation research artifact (single source of truth for downstream plans to copy shade-6 hex arrays, secondary_types JSON literals, patientSearchParamOverrides)"
    - "Paper deuteranopia assessment method (Brettel 1997 / Machado 2009 model as mental reasoning, not code simulation) paired with deferred empirical capture in UAT plan"

key-files:
  created:
    - .planning/research/color-design-audit.md
  modified: []

key-decisions:
  - "Oncology seed darkened #e03131 -> #c92a2a (raised white-on-fill from 4.51:1 borderline to 5.46:1 safety margin)"
  - "Imaging seed darkened #0c8599 -> #0b7285 (cyan.7 -> cyan.9; raised white-on-fill from 4.35:1 FAIL to 5.59:1 PASS)"
  - "Bioanalysis seed darkened #099268 -> #087050 (raised white-on-fill from 3.95:1 FAIL to 6.10:1 PASS)"
  - "Onkologie shipping at npm-registry GA 2026.0.1 (not 34-RESEARCH.md draft value 2026.0.3) - Plan 34-03 EXTENSION_PACKAGES must pin to 34-01 audit values, not 34-RESEARCH draft"
  - "Mikrobiologie (2025.0.1) + Symptom (2024.0.0-ballot) not on npm registry; versions probed via packages.fhir.org FHIR registry"
  - "No preemptive icon swaps for Plan 34-04 - UI-SPEC locked picks accepted as-is; Plan 34-06 contingency swap plan documented for the 2 borderline cross-family pairs"
  - "patientSearchParamOverrides mandatory on 3 modules: biobank ({Specimen: subject}), pathologie ({Specimen: subject}), studie ({ResearchStudy: enrollment}) - derived from R4 spec defaults (Pitfall P-02)"

patterns-established:
  - "WCAG contrast computation: inline Node script using WCAG 2.x relative-luminance formula (G18 technique); equivalent to npx wcag-contrast but zero-install"
  - "Multi-profile module discipline: secondary_types column with explicit 'none' literal or JSON-array enforces string-vs-array clarity for Plan 34-04 MII_MODULES rows"
  - "Paper deuteranopia reasoning: within-family (same color, different icon) passes on icon-shape distinctiveness alone; cross-family risk graded LOW/MEDIUM/HIGH with icon-shape fallback"

requirements-completed:
  - MII-EXT-09
  - MII-EXT-10
  - MII-EXT-11

duration: 12min
completed: 2026-04-24
---

# Phase 34 Plan 01: Color & Design Audit Summary

**Pre-implementation audit produced per-module spec table (14 rows × 10 cols), 7-palette WCAG AA contrast audit (all PASS after 3 seed-darkening tweaks), 21 Tabler icon assignments, and a paper-deuteranopia discriminability hypothesis that unblocks Plans 34-02 through 34-06.**

## Performance

- **Duration:** ~12 min (single-task plan)
- **Started:** 2026-04-24T17:29:11Z (worktree agent spawn, aligned with STATE.md last-updated)
- **Completed:** 2026-04-24 (same-day)
- **Tasks:** 1/1
- **Files created:** 1 (`.planning/research/color-design-audit.md`, 245 insertions)
- **Files modified:** 0 (zero code touched per plan scope)

## Accomplishments

- **14 MII extension modules fully specified** with canonical IG URL, live-probed package version (2026-04-24), pre-GA flag, primary + `secondary_types` JSON-array, and `patientSearchParamOverrides` map. All 6 known multi-profile modules (onkologie, mtb, bildgebung, pathologie, kardiologie, intensivmedizin) carry non-empty `secondary_types` JSON arrays per the plan's blocking-verify contract.
- **7 palette families all PASS WCAG AA** after 3 targeted seed tweaks. Worst-case measured ratio = 4.64:1 (oncology on #e7ecff active-pill background) — 54% above the 3:1 UI-chrome floor.
- **21 Tabler icons assigned** with shape-distinctiveness rationale. Within-family icon-shape discriminability contract (D-09) verified for all 7 palette families on paper.
- **Paper-only deuteranopia assessment:** 7/7 within-family adjacent pairs + 14/14 cross-family adjacent pairs predicted PASS via icon-shape distinctiveness. Two cross-family pairs flagged MEDIUM-HIGH/HIGH color-collapse risk (mikrobiologie↔molekulargenetik violet-vs-grape; pro↔seltene pink-vs-grape) with contingency icon swaps pre-documented for Plan 34-06's empirical verification step.
- **Zero code touched** per plan scope — all subsequent plans (34-02 palette, 34-03 fetch script, 34-04 MII_MODULES rows, 34-05 empty-state UX, 34-06 UAT) can now read their inputs verbatim from this audit with no further research round-trips.

## WCAG Audit Summary

| Palette | Seed hex (K-02) | Final shade-6 | Tweak? | White/fill | Fill/white | Fill/e7ecff | Pass |
|---------|-----------------|---------------|--------|-----------|-----------|-------------|------|
| oncology | #e03131 | #c92a2a | yes (safety margin) | 5.46:1 | 5.46:1 | 4.64:1 | PASS |
| imaging | #0c8599 | #0b7285 | yes (FAIL → PASS) | 5.59:1 | 5.59:1 | 4.74:1 | PASS |
| genetics | #8e4ec6 | #9c36b5 | no (K-02 already pass) | 5.82:1 | 5.82:1 | 4.94:1 | PASS |
| pathology | #6741d9 | #6741d9 | no | 6.30:1 | 6.30:1 | 5.35:1 | PASS |
| bioanalysis | #099268 | #087050 | yes (FAIL → PASS) | 6.10:1 | 6.10:1 | 5.18:1 | PASS |
| administration | #364fc7 | #3b5bdb | no | 5.67:1 | 5.67:1 | 4.81:1 | PASS |
| patient-reported | #c2255c | #c2255c | no | 5.66:1 | 5.66:1 | 4.80:1 | PASS |

**WCAG PASS counts:** 7/7 palettes · 21/21 gates.

## Paper-Deuteranopia Predicted-Pass Counts

- **Within-family pairs (§4b):** 7/7 PASS via icon-shape distinctness (all 7 palette families host exactly 2 modules each per D-05; each pair has shape-distinct icons).
- **Cross-family adjacent pairs (§4c):** 14/14 PASS — icon-shape disambiguation dominates; color adds redundant confirmation on 9 of 14 pairs (where blue-yellow axis separates families).
- **Preemptive icon swaps (§4d):** **zero** — UI-SPEC locked icon picks accepted for Plan 34-04.
- **Borderline pairs flagged for Plan 34-06 empirical attention:** 2 pairs (HIGH color-collapse risk: `mikrobiologie ↔ molekulargenetik`; MEDIUM-HIGH: `pro ↔ seltene`). Contingency swap plan documented in §4d: `IconBacteria → IconVirus` (UI-SPEC fallback) and `IconQuestionnaire → IconListCheck` (UI-SPEC fallback) respectively, if empirical capture fails.

## Task Commits

1. **Task 1: color-design-audit.md creation** — `cb924c9` (docs)

## Files Created/Modified

- `.planning/research/color-design-audit.md` — per-module spec + WCAG audit + icon picks + paper-deuteranopia assessment (new, 245 insertions, 5 top-level `##` sections)

## Decisions Made

See key-decisions in frontmatter. Three seed-hex tweaks applied to clear WCAG gates; zero icon swaps required; overrides for Specimen (→ `subject`) and ResearchStudy (→ `enrollment`) recorded as mandatory per R4 spec.

## Deviations from Plan

None - plan executed exactly as written.

Plan provided K-02 starting seed hexes as PLACEHOLDERS and explicitly called for darkening on WCAG-fail. The three seed tweaks are in-scope execution of the audit's own "failing palette tweaks" path (§3c) — not a deviation from plan intent.

**Total deviations:** 0

## Issues Encountered

- **Mikrobiologie + Symptom packages return `UNKNOWN` on `npm view`.** Resolution: probed against the FHIR package registry at `https://packages.fhir.org/<package>` directly; both returned current `dist-tags.latest` values (mikrobiologie `2025.0.1`, symptom `2024.0.0-ballot`). Not a deviation — plan's verification step allowed "R4-spec-derived defaults with a NOTE" for any package where live probe is not possible, and FHIR-registry probe is a stricter source than R4-spec defaults.
- **Onkologie current GA is 2026.0.1, not the 2026.0.3 draft value in 34-RESEARCH.md.** Recorded in audit §1 + flagged explicitly in Provenance note so Plan 34-03 `EXTENSION_PACKAGES` pin-version map uses the live audit values, not the older research draft.
- **Analysis-paralysis guard:** ~4-5 Read calls at start to load plan + CONTEXT + RESEARCH + UI-SPEC + VALIDATION. Single WRITE call then committed. No repeated research rounds.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Plan 34-02** (theme) unblocked: shade-6 hexes from §3a column 3 are inputs for Mantine Colors Generator; all 7 are concrete hex strings.

**Plan 34-03** (fetch script) unblocked: 14 package name + version pairs in §1 columns 5+6 are pins for `EXTENSION_PACKAGES` map. Note: pin to 34-01 audit values (mikrobiologie 2025.0.1, symptom 2024.0.0-ballot, onkologie 2026.0.1) — not the older 34-RESEARCH.md draft table.

**Plan 34-04** (MII_MODULES rows) unblocked: 14 rows' `(fhirResourceType-primary, secondary_types, patientSearchParamOverrides, badgeColor, icon)` tuples in §1 + §2b. Three modules require non-empty overrides: biobank, pathologie, studie.

**Plan 34-05** (empty-state UX) unblocked: palette family names + icon names available for per-module empty-state rendering.

**Plan 34-06** (UAT) unblocked: paper-deuteranopia predictions in §4b + §4c supply the concrete hypothesis to verify empirically via Chrome DevTools deuteranopia simulation. Two specific borderline pairs (§4c MEDIUM-HIGH/HIGH rows) named for empirical attention; contingency icon swaps pre-registered.

## Self-Check: PASSED

- [x] File `.planning/research/color-design-audit.md` exists (verified `test -f`)
- [x] Commit `cb924c9` exists (verified `git log --oneline`)
- [x] All 5 automated verify gates from plan pass (top-level `##` ≥ 4, ≥ 14 module rows, all 14 module keys present, no `{measured hex}` / `{shade` / `...` placeholder strings, `secondary_types` + `paper-pass` both appear)
- [x] 7/7 WCAG palettes PASS (no FAIL rows in §3b)
- [x] 6/6 multi-profile modules carry non-`none` JSON-array `secondary_types` (onkologie, mtb, bildgebung, pathologie, kardiologie, intensivmedizin all verified)
- [x] No empirical screenshots as deliverables of this plan (correctly deferred to Plan 34-06 per §4e)

---
*Phase: 34-14-mii-extension-modules-palette-bundled-profiles*
*Plan: 34-01*
*Completed: 2026-04-24*
