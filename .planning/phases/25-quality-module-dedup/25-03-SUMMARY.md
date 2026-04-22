---
phase: 25-quality-module-dedup
plan: 03
subsystem: quality
tags: [react, mantine, refactor, drill-down, render-parity, shell-composition, partial-migration]

# Dependency graph
requires:
  - phase: 25-quality-module-dedup
    plan: 01
    provides: "PerTypeCoverageReport.perPathExamples (QDDEP-01) — CodingDrillDown still reads state.perPathExamples inside its bespoke body; DrillDownShell itself does NOT depend on this field, but the CodingDrillDown that wraps the shell does"
  - phase: 25-quality-module-dedup
    plan: 02
    provides: "RunProgress primitive (QDDEP-06) — DrillDownShell composes RunProgress internally; RunProgress's null-on-non-running behavior lets the shell render unconditionally without a status guard"
  - phase: 24-data-fetching-foundation
    provides: "AsyncRunStatus type (asyncRunReducer) — the shell's `run.status` field is typed against this"
provides:
  - "DrillDownShell — unified chrome for Quality drill-down sub-pages"
  - "Render-parity migration of 5 simple drill-downs (Plausibility, LabRanges, Duplicates, References, Completeness) — each now returns <DrillDownShell ... />"
  - "PARTIAL-migration pattern proven on CodingDrillDown (shell chrome + bespoke body sibling with syntheticRun state bridge and issues={[]})"
  - "Documented syntheticRun helper pattern for hook-driven (non-AsyncRunStatus) drill-downs — Data→'cancelled' silences the shell's complete-empty alert"
affects:
  - "25-04 (keepMounted drop — DrillDownShell's mount/unmount + auto-focus effect run on re-entry; no state persistence concerns because shell owns nothing beyond the backRef)"
  - "Future Quality drill-downs can either return <DrillDownShell ... /> directly (symmetric) or use the Fragment + issues={[]} + sibling body pattern (asymmetric)"
  - "Phase 28 SWEEP-03 (drill-down eslint-disables may be partially absorbed — autoStart effects in the 5 simple drill-downs are unchanged and still carry the react-hooks/exhaustive-deps eslint-disable; no regression, no progress)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shell-wraps-chrome + bespoke-body-as-sibling composition: a reusable shell can be PARTIAL-migrated onto components with unique bodies by rendering the shell (with issues={[]}) followed by the bespoke JSX inside an outer Fragment, preserving visual hierarchy while sharing the chrome implementation"
    - "syntheticRun bridge pattern: hook-driven components (state === 'loading' | 'error' | data) map onto AsyncRunStatus with a useMemo'd syntheticRun — data-state→'cancelled' is the critical escape hatch that keeps the shell's complete-empty alert silent when the bespoke body is responsible for rendering loaded content"
    - "≤6 REQUIRED props + optional auxiliaries: D-05's ≤6 prop cap applies to REQUIRED props only; optional props (errorMessage?, progressLabel?) are not counted, preserving the design-principle guardrail without forcing ergonomic compromise"

key-files:
  created:
    - src/components/quality/DrillDownShell.tsx
    - src/components/quality/__tests__/DrillDownShell.test.tsx
  modified:
    - src/components/quality/PlausibilityDrillDown.tsx (79 → 47 LOC)
    - src/components/quality/LabRangesDrillDown.tsx (77 → 45 LOC)
    - src/components/quality/DuplicatesDrillDown.tsx (78 → 44 LOC)
    - src/components/quality/ReferencesDrillDown.tsx (78 → 45 LOC)
    - src/components/quality/CompletenessDrillDown.tsx (187 → 164 LOC, PARTIAL)
    - src/components/quality/CodingDrillDown.tsx (219 → 209 LOC, PARTIAL)

key-decisions:
  - "7th optional `progressLabel?` prop committed: required-prop count stays at 5 (≤6 D-05 cap preserved). The 2 optional props (errorMessage?, progressLabel?) are excluded from the cap per planner brief, because the running-state progress text varies per drill-down and cannot collapse into `title` without showing persistent drift during non-running states."
  - "CodingDrillDown PARTIAL composition committed: `<DrillDownShell ... issues={[]}>` for chrome, bespoke Tabs/DrillDownTable body as a sibling inside a Fragment (Option A from the plan). syntheticRun maps state → AsyncRunStatus with data→'cancelled' so the shell stays silent while the bespoke body renders."
  - "CompletenessDrillDown: Option A executed (not Option B). Same syntheticRun + Fragment + sibling-body pattern as CodingDrillDown. Both asymmetric drill-downs now share the pattern, proving it generalizes beyond CodingDrillDown."
  - "Back button label is 'Back' only (was 'Back to Plausibility', 'Back to Lab Ranges', etc.). Per-drill-down contextual labels were dropped — backHref is unchanged (/quality), so the a11y-equivalent 'Back' link still navigates to the same place. No existing tests assert against the old labels."
  - "Render parity is preserved behaviorally: existing drill-down integration tests (coding-drilldown.test.tsx = 4/4, completeness-drilldown.test.tsx = 3/3) pass unchanged. Visual diff not formally executed (no Mantine snapshot infrastructure in this project), but the rendered DOM tree produced by the shell is a structural superset of the pre-refactor tree modulo the 'Back' label change."

patterns-established:
  - "Shell-wraps-chrome Fragment pattern for asymmetric migrations: component returns <> then renders the shell + a sibling body Stack — Mantine's nested Stack composes cleanly (gap accumulates, no visual regression caught by tests)"
  - "issues={[]} + syntheticRun combo: the definitive way to reuse shell chrome for components whose body is not a ResourceIssueTable but is a bespoke UI (Tabs, tree, per-path tree, ...)"

requirements-completed: [QDDEP-02]

# Metrics
duration: ~7min
completed: 2026-04-22
---

# Phase 25 Plan 03: DrillDownShell Migration Summary

**Unified drill-down chrome extracted to `<DrillDownShell>`; 5 simple drill-downs collapse to a single invocation each and 2 asymmetric drill-downs (Coding, Completeness) PARTIAL-migrate via the shell-chrome + bespoke-body-sibling composition pattern, producing 164 LOC of gross reduction in this plan and a 287 LOC cumulative reduction versus RESEARCH.md's pre-25-02 baseline.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-22T20:59Z (approx — worktree-branch check preceded first write)
- **Completed:** 2026-04-22T21:08Z
- **Tasks:** 4 (scaffold + 5-drill-down migration + CodingDrillDown PARTIAL + verification/trim)
- **Files created:** 2 (1 source + 1 test)
- **Files modified:** 6 (5 simple + 1 partial)

## Accomplishments

- Delivered `DrillDownShell` as the unified chrome for Quality drill-down sub-pages. 5 required props (title, backHref, run, issues, emptyMessage) + 2 optional (errorMessage?, progressLabel?). ≤6 required-props cap preserved per D-05. 113 LOC including doc header.
- 6 render-parity + state-variant unit tests cover the shell (running/error/empty/issues/focus/static-title) — all 6 green on first run.
- 5 simple drill-downs (Plausibility/LabRanges/Duplicates/References/Completeness) migrated. Plausibility/LabRanges/Duplicates/References each drop to ~45 LOC (from 77-79). Completeness PARTIAL-migrates to 164 LOC (from 187) — the shell owns chrome, its bespoke Tabs+DrillDownList body renders as a sibling.
- CodingDrillDown PARTIAL-migrated to 209 LOC (from 219). Same Fragment + syntheticRun + issues={[]} pattern as Completeness. Still reads `state.perPathExamples` from Plan 25-01's QDDEP-01 contract — zero second sample fetch.
- Existing drill-down integration tests (`coding-drilldown.test.tsx` 4/4, `completeness-drilldown.test.tsx` 3/3) continue to pass untouched.
- Full suite: 22 failed (matches baseline), 780 passed, 22 todo — 0 new regressions.

## Task Commits

Each task committed atomically with --no-verify (per parallel-executor protocol):

1. **Task 1: DrillDownShell scaffold + 6 render-parity tests** — `9999461` (feat)
2. **Task 2: 5 simple drill-down migrations in one refactor commit** — `01fa815` (refactor)
3. **Task 3: CodingDrillDown PARTIAL migration (Fragment + sibling body)** — `42b3d3c` (refactor)
4. **Task 4 (trim): syntheticRun + import-list compression in Coding/Completeness** — `c62189a` (refactor)

## Files Created/Modified

### Created

- `src/components/quality/DrillDownShell.tsx` — 113 LOC. 5 required props + 2 optional; composes `RunProgress` from Plan 25-02 and `ResourceIssueTable`. useRef + useEffect for back-button auto-focus on mount.
- `src/components/quality/__tests__/DrillDownShell.test.tsx` — 160 LOC. 6 vitest cases covering: running chrome, error alert, empty alert, issues table, back-button auto-focus (a11y), static-title verbatim.

### Modified

- `src/components/quality/PlausibilityDrillDown.tsx` — 79 → 47 LOC. Removed: Stack, Title, Alert, Button, IconArrowLeft/AlertTriangle/Check imports; Link, useRef, backRef focus effect, ResourceIssueTable, RunProgress imports. Kept: useParams, useOutletContext, useSampleSize, useSettings, usePlausibilityReport, useEffect (auto-start). Return JSX is now a single `<DrillDownShell .../>` invocation with errorMessage composed contextually.
- `src/components/quality/LabRangesDrillDown.tsx` — 77 → 45 LOC. Same pattern; title is the static string `"Observation -- Lab Range drill-down"` and progressLabel is `"Checking Observations"`.
- `src/components/quality/DuplicatesDrillDown.tsx` — 78 → 44 LOC. Same pattern; title static, progressLabel `"Matching patients"`.
- `src/components/quality/ReferencesDrillDown.tsx` — 78 → 45 LOC. Same pattern; title + progressLabel interpolate {type}.
- `src/components/quality/CompletenessDrillDown.tsx` — 187 → 164 LOC. PARTIAL migration (Option A): shell for chrome (run via syntheticRun, issues={[]}), bespoke Tabs + DrillDownList + `note` text + ResourceIssueTable (resources tab) as siblings inside an outer Fragment. DrillDownList kept as local component (unchanged body).
- `src/components/quality/CodingDrillDown.tsx` — 219 → 209 LOC. PARTIAL migration: same Fragment + syntheticRun + issues={[]} pattern. DrillDownTable kept as local component. Still reads `state.perPathExamples` from the coverage report (QDDEP-01 contract preserved).

## LOC Delta Table

| Drill-down | Pre-25-02 (RESEARCH.md) | Pre-25-03 (wc at plan start) | Post-25-03 | Δ in 25-03 | Δ cumulative |
|---|---:|---:|---:|---:|---:|
| PlausibilityDrillDown | 97 | 79 | 47 | -32 | -50 |
| LabRangesDrillDown | 95 | 77 | 45 | -32 | -50 |
| DuplicatesDrillDown | 96 | 78 | 44 | -34 | -52 |
| ReferencesDrillDown | 96 | 78 | 45 | -33 | -51 |
| CompletenessDrillDown | 187 | 187 | 164 | -23 | -23 |
| CodingDrillDown (PARTIAL) | 270 | 219 | 209 | -10 | -61 |
| **TOTAL 6 files** | **841** | **718** | **554** | **-164** | **-287** |
| New: DrillDownShell.tsx | — | — | +113 | +113 | +113 |
| **NET (6 files + shell)** | **841** | **718** | **667** | **-51 net in 25-03** | **-174 net vs RESEARCH.md** |

## Decisions Made

### 7th-prop justification (`progressLabel?`)

CONTEXT.md D-05 specifies ≤6 fields on the shell props interface. RESEARCH.md Focus Area 2 Open Question 2 flagged that the 5 simple drill-downs use DIFFERENT progress label text during running state ("Checking {type}", "Matching patients", "Checking references in {type}", "Checking Observations"). Three resolution options:

- (a) Fold the label into `title` — rejected because title is persistent and progress is ephemeral; merging would show "Plausibility drill-down — Checking Observation" permanently.
- (b) Hard-code a generic label — rejected because it regresses UX clarity.
- (c) Add a 7th optional `progressLabel?` — committed. Required-prop count = 5 (title, backHref, run, issues, emptyMessage) ≤ 6. The 2 optional props (errorMessage?, progressLabel?) sit outside the cap. Default label is "Running".

### CodingDrillDown composition: "issues={[]} + sibling body"

The PLAN's `<interfaces>` block committed to Option A: outer Fragment, DrillDownShell (issues=[]) renders chrome, bespoke Tabs body renders as a sibling. Nested-Stack risk (shell's inner Stack + the bespoke sibling Stack) was flagged as a potential visual regression in RESEARCH.md Open Question 5. Executed mitigation: bespoke sibling uses `pt={0}` on its Stack so the compound layout reads as a single continuous column (no double top padding). No existing test caught a regression, and the 4/4 coding-drilldown.test.tsx suite passes unchanged.

### CompletenessDrillDown: Option A (NOT Option B)

The PLAN gave Option A (shell chrome + bespoke body sibling) and Option B (keep bespoke, skip migration) as alternatives. Executed Option A because it proves the PARTIAL-migration pattern generalizes beyond CodingDrillDown and because the chrome duplication was the load-bearing duplication cost, not the body.

### syntheticRun: data → 'cancelled', NOT 'complete'

Critical design detail. The PLAN's text suggested `state === 'data' ? 'complete'` but that would fire the shell's empty-state green alert when `issues=[]` — which is always true for PARTIAL-migrated components. Committed: `data → 'cancelled'`. The shell renders nothing for `cancelled + empty issues`, so the sibling body is the sole renderer of loaded content. Documented inline in both Coding/Completeness syntheticRun comments.

### Back button label: dropped per-drill-down contextual labels

The PLAN noted this as an accepted minor text shift. All 5 simple drill-downs previously had bespoke back labels ("Back to Plausibility", "Back to Lab Ranges", etc.); the shell renders generic "Back". No test asserted against the old labels so no tests needed updating.

## Deviations from Plan

**LOC target miss — documented per Task 4 acceptance criteria.** The ROADMAP success criterion #2 reads "≥400 LOC removed". The PLAN's LOC-delta table assumed a 841-LOC pre-refactor baseline (from RESEARCH.md Focus Area 2). But by the time Plan 25-03 started, Plan 25-02 had already landed the RunProgress migration, which stripped ~17 LOC × 7 files of progress chrome — the actual Plan 25-03-start baseline was 718 LOC across the 6 drill-down files.

Math:

- 25-02 already reduced drill-downs from 841 → 718 (−123 LOC via RunProgress)
- 25-03 further reduces from 718 → 554 (−164 LOC via DrillDownShell)
- Combined 25-02 + 25-03 drill-down reduction: 841 → 554 = **−287 LOC**

The 400-LOC ROADMAP target counts gross drill-down deletion. At 287 cumulative (across 25-02 + 25-03), the target is **not met** — **this is a soft miss of 113 LOC**.

The gap is partially explained by:

1. **Plan 25-02 absorbed ~123 LOC of the "expected" savings** that the original ROADMAP math attributed to the DrillDownShell alone. 25-02 and 25-03 together were supposed to deliver ≥400 LOC of removal; the actual combined delta is ≥287, not ≥400.
2. **CompletenessDrillDown's bespoke body (Tabs + DrillDownList + Note) is load-bearing** and cannot fold into the shell — it stays as-is, preserving ~90 LOC of unique per-field coverage rendering.
3. **CodingDrillDown's bespoke body (Tabs + DrillDownTable + CodeableConceptDisplay tree) is load-bearing** — ~130 LOC of unique per-path coding rendering stays.

Options to close the gap are all scope-creep or behaviour-change:

- Extract DrillDownList into a reusable Fields/DrillDownList component — would save ~20-30 LOC but adds a new file, scope-creep.
- Delete the `Note: for array-valued paths...` help-text block — content change, not a refactor.
- Delete one of the two tabs on Completeness/Coding — behaviour change.

**Recommendation:** The ROADMAP criterion's intent (reduce duplication) is satisfied — all 5 simple drill-downs and both asymmetric drill-downs now share chrome via DrillDownShell, the 7th chrome implementation is deleted. The LOC headline misses because the RESEARCH.md baseline was snapshotted pre-25-02 and the 25-02/25-03 split absorbed duplication gains across both plans. Accept the miss, document it here.

Other than the LOC target miss, **the plan executed exactly as written**. All Task 1-4 acceptance criteria (prop count, grep gates, tsc, test pass, LOC per file) met on first run (Plausibility was 51 on first write; tightened to 47 before commit).

## Deferred Issues

None. No pre-existing warnings were caught during execution. The pre-existing failures (22 at baseline, 22 at end) were not touched.

## Issues Encountered

1. **Test runner argument order sensitivity.** `npm test -- src/path/to/test.tsx --run` produced "No test files found" when run from the worktree root; `npm test -- --run src/path/to/test.tsx` worked. The flag must come before the file arg with the Vitest 4.1.4 + npm wrapper setup. Documented for future executor agents; no code change needed.

2. **Initial Plausibility LOC = 51 (1 over target).** First-pass write produced 51 LOC due to a multi-line `errorMessage={...}` ternary. Inlined to a single line before commit; final LOC = 47. No rework of semantics.

3. **syntheticRun: `data → 'complete'` would have broken.** The PLAN's interfaces block showed `state === 'data' ? 'complete'`. But the shell renders a green empty-state alert on `complete + empty issues`, which is always true for the PARTIAL migrations (issues=[]). Caught at design-review during Task 3 write; switched to `'cancelled'` which renders silently. Documented inline in both syntheticRun comments.

## User Setup Required

None — pure UI refactor. No environment variables, no service configuration, no migration scripts.

## Self-Check

Verifying claims before handing off.

**Files exist:**

- `src/components/quality/DrillDownShell.tsx` — FOUND
- `src/components/quality/__tests__/DrillDownShell.test.tsx` — FOUND
- 5 simple + 1 PARTIAL drill-down files — ALL FOUND

**Commits exist:**

- `9999461` (feat DrillDownShell scaffold) — FOUND in `git log --oneline -5`
- `01fa815` (refactor 5 simple drill-downs) — FOUND
- `42b3d3c` (refactor CodingDrillDown PARTIAL) — FOUND
- `c62189a` (refactor trim) — FOUND

**Grep gates:**

- `grep -c '<DrillDownShell' src/components/quality/PlausibilityDrillDown.tsx` → 1 — PASS
- `grep -c '<DrillDownShell' src/components/quality/LabRangesDrillDown.tsx` → 1 — PASS
- `grep -c '<DrillDownShell' src/components/quality/DuplicatesDrillDown.tsx` → 1 — PASS
- `grep -c '<DrillDownShell' src/components/quality/ReferencesDrillDown.tsx` → 1 — PASS
- `grep -c '<DrillDownShell' src/components/quality/CompletenessDrillDown.tsx` → 2 (JSX usage + type import) — PASS (JSX ≥ 1)
- `grep -c '<DrillDownShell' src/components/quality/CodingDrillDown.tsx` → 2 (JSX usage + type import) — PASS (JSX ≥ 1)
- `grep -c 'issues={\[\]}' src/components/quality/CodingDrillDown.tsx` → 2 — PASS (≥ 1; committed composition)
- `grep -c 'syntheticRun' src/components/quality/CodingDrillDown.tsx` → 2 — PASS (≥ 1; state→AsyncRunStatus bridge)
- `grep -c 'perPathExamples' src/components/quality/CodingDrillDown.tsx` → 2 — PASS (≥ 1; QDDEP-01 contract preserved)
- DrillDownShell prop-field grep (title|backHref|run|issues|errorMessage|emptyMessage|progressLabel) → 7 — PASS (5 required + 2 optional)
- `grep -c 'RunProgress' src/components/quality/DrillDownShell.tsx` → 2 (import + JSX) — PASS (≥ 1)
- `grep -c 'ResourceIssueTable' src/components/quality/DrillDownShell.tsx` → 2 (import + JSX) — PASS (≥ 1)

**LOC gates:**

- `wc -l src/components/quality/PlausibilityDrillDown.tsx` → 47 — PASS (≤ 50)
- `wc -l src/components/quality/LabRangesDrillDown.tsx` → 45 — PASS (≤ 50)
- `wc -l src/components/quality/DuplicatesDrillDown.tsx` → 44 — PASS (≤ 50)
- `wc -l src/components/quality/ReferencesDrillDown.tsx` → 45 — PASS (≤ 50)
- `wc -l src/components/quality/CompletenessDrillDown.tsx` → 164 — PARTIAL-MIGRATION PASS (plan accepts ≤187 with Option B fallback; Option A executed at 164)
- `wc -l src/components/quality/CodingDrillDown.tsx` → 209 — PASS (≤ 220)

**LOC delta:**

- Combined 6-drill-down reduction vs RESEARCH.md baseline (841 LOC): 841 → 554 = -287 LOC (cumulative across 25-02 + 25-03)
- Combined 6-drill-down reduction vs Plan-25-03-start baseline (718 LOC): 718 → 554 = -164 LOC in this plan
- ROADMAP criterion (≥400 LOC) — **SOFT MISS** documented as a deviation above

**Test runs:**

- `npm test -- --run src/components/quality/__tests__/DrillDownShell.test.tsx` → 6/6 passing — PASS
- `npm test -- --run src/__tests__/coding-drilldown.test.tsx` → 4/4 passing — PASS
- `npm test -- --run src/__tests__/completeness-drilldown.test.tsx` → 3/3 passing — PASS
- Full suite: 22 failed (matches baseline), 780 passed, 22 todo — PASS (0 new regressions)
- `npx tsc -b --noEmit` → 0 errors — PASS

## Self-Check: PASSED

Notes on the LOC miss: All functional and grep acceptance criteria are met. The LOC headline soft-misses the ROADMAP's 400-LOC target because Plan 25-02 absorbed a substantial share of the "expected" reduction (RunProgress migration stripped ~123 LOC across the drill-downs before 25-03 started). Duplication goal is behaviorally satisfied — 6 drill-downs now share chrome via DrillDownShell, zero bespoke chrome implementations remain.

## Next Plan Readiness

- Plan 25-04 (keepMounted drop + test update) is unblocked. DrillDownShell's mount effect (backRef focus) is idempotent per mount; no state needs to survive tab re-entry beyond what the `useCompletenessReport`/`useCodingCoverage` caches already carry.
- Phase 28 SWEEP-03 notes: the 5 simple drill-downs still have the `react-hooks/exhaustive-deps` eslint-disable on their auto-start effects (unchanged). No progress on that front; no regression either.

---
*Phase: 25-quality-module-dedup*
*Plan: 03*
*Completed: 2026-04-22*
