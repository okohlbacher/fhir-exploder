---
phase: 21-interactive-cohort-builder-rename
plan: "21-01"
subsystem: testing
tags: [cohorts, localStorage, pure-function-split, vitest, wave-0]

# Dependency graph
requires:
  - phase: 18-quality-thresholds
    provides: "src/quality/thresholds.ts pure-module blueprint (storage key convention + pure-function-split pattern mirrored here)"
  - phase: 19-pdf-report-and-trends
    provides: "src/quality/__tests__/pdfExport.test.ts MedplumClient mocking pattern + trendsHistory.test.ts extension target"
provides:
  - "CohortDefinition / CohortCriterion / CohortsStorage type contract"
  - "Three storage-key constants (quality.cohorts.v1 / quality.resourceTypes.v1 / quality.cohort.v1)"
  - "parsePatientRefs() — split+dedup+10K-cap normaliser for Textarea paste"
  - "findActiveCohort() — null-safe active cohort lookup"
  - "7 Wave 0 test files with skip-stubs whose names lock VALIDATION.md -t filters"
  - "Legacy-snapshot describe block in trendsHistory.test.ts (for Plan 21-04 migrator)"
affects: [21-02-cohort-resolver, 21-03-sampling-scoping, 21-04-rename-resource-types, 21-05-builder-ui, 21-06-dashboard-wiring, 22-fhirpath-cohorts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function + stateful-hook split (mirrors src/quality/thresholds.ts)"
    - "Wave 0 test-stub contract: every downstream `-t` filter resolves to a concrete it()"
    - "it.skip('… pending Plan 21-0X') as RED-contract placeholder"

key-files:
  created:
    - src/quality/cohorts.ts
    - src/quality/cohorts.test.ts
    - src/quality/cohortResolver.test.ts
    - src/hooks/useCohorts.test.ts
    - src/components/quality/CohortBuilderForm.test.tsx
    - src/components/quality/ResourceTypeSelector.test.tsx
    - src/quality/sampling.test.ts
  modified:
    - src/quality/__tests__/trendsHistory.test.ts

key-decisions:
  - "parsePatientRefs strips only ONE leading 'Patient/' (guards double-prefix ambiguity without clobbering legacy IDs)"
  - "All Task 1.3 downstream stubs use `it.skip(...)` over throw-pending so full suite stays green in Wave 0"
  - "Task 1.1 committed before its tests — plan's TDD ordering overridden by plan's own task split (Task 1.2 owns the tests); verified by running 1.2 immediately and confirming all 17 assertions green against 1.1 output"

patterns-established:
  - "Pure cohorts module shape: types → storage keys → DEFAULT → pure helpers (no React/Mantine/async)"
  - "Test-stub filter-name contract: VALIDATION.md `-t \"…\"` strings copied verbatim into it() names"
  - "Legacy-snapshot migration stub (Plan 21-04 un-skips once migrateSnapshot lands)"

requirements-completed: []  # CHRT-01 and CHRT-02 are not yet fully satisfied by this plan (foundation only). Orchestrator marks them complete after Plan 21-02 lands the resolver + hook.

# Metrics
duration: 10min
completed: 2026-04-15
---

# Phase 21 Plan 21-01: Foundation — Types, Storage, Pure Functions, Wave 0 Test Stubs Summary

**Delivered the cohort-domain pure module (types, storage keys, parsePatientRefs, findActiveCohort) plus all 7 Wave 0 test files with skip-stubs locking VALIDATION.md -t filters for Plans 21-02..05 to un-skip.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-15T13:31:00Z
- **Completed:** 2026-04-15T13:41:32Z
- **Tasks:** 3 / 3
- **Files created:** 7
- **Files modified:** 1

## Accomplishments

- `src/quality/cohorts.ts` exports the full type contract (CohortCriterion discriminated union, CohortDefinition, CohortsStorage) plus three storage-key constants, DEFAULT_COHORTS_STORAGE, and the two pure helpers `findActiveCohort` + `parsePatientRefs` — zero React/Mantine/Medplum imports.
- `parsePatientRefs` handles every accepted input shape (lines, commas, semicolons, mixed whitespace), strips `Patient/` once per token, dedupes preserving first-occurrence order, and caps output at 10,000 IDs (Threat T-21-02 mitigation).
- `src/quality/cohorts.test.ts` locks 17 assertions across parsePatientRefs / findActiveCohort / storage-shape behaviours — the `-t "parsePatientRefs"` filter in VALIDATION.md resolves to 8 passing tests here.
- All 5 remaining Wave 0 stub files created (cohortResolver, useCohorts, CohortBuilderForm, ResourceTypeSelector, sampling) with 15 `it.skip` placeholders — every VALIDATION.md `-t` filter now resolves to a concrete describe/it.
- Extended `trendsHistory.test.ts` with a `describe('legacy snapshot', ...)` block containing two skip-stubs for Plan 21-04's `migrateSnapshot` helper.
- Full Wave 0 suite green: 23 passing, 17 skipped, 0 failures across the 7 touched test files.

## Task Commits

1. **Task 1.1: Create src/quality/cohorts.ts pure module** — `6d90b81` (feat)
2. **Task 1.2: Create cohorts.test.ts + extend trendsHistory.test.ts** — `d174d74` (test)
3. **Task 1.3: Create 5 remaining Wave 0 test stubs** — `5abc155` (test)

_Note: Task 1.1 was tagged `tdd="true"` in the plan but the plan's own task split placed the matching tests in Task 1.2. Order honoured as plan-written — verified by running Task 1.2 immediately after 1.1 landed, all 17 assertions green against 1.1 output._

## Files Created/Modified

- `src/quality/cohorts.ts` — Pure module: types + 3 storage keys + DEFAULT + findActiveCohort + parsePatientRefs (144 lines, 12 named exports)
- `src/quality/cohorts.test.ts` — 17 unit tests (parsePatientRefs 8, findActiveCohort 4, storage shape 5) — all passing
- `src/quality/cohortResolver.test.ts` — 3 skip-stubs for Plan 21-02 (`intersects`, `date range`, `condition code`)
- `src/hooks/useCohorts.test.ts` — 5 skip-stubs for Plans 21-02/04 (`persists`, `hydration`, `uuid`, `legacy migration`, `migration idempotent`)
- `src/components/quality/CohortBuilderForm.test.tsx` — 2 skip-stubs for Plan 21-05
- `src/components/quality/ResourceTypeSelector.test.tsx` — 1 skip-stub (label "Resource types")
- `src/quality/sampling.test.ts` — 4 skip-stubs for Plan 21-03 (`short GET`, `long POST`, `Patient uses _id`, `empty array`)
- `src/quality/__tests__/trendsHistory.test.ts` — extended with `describe('legacy snapshot', …)` (2 skip-stubs for Plan 21-04)

## Decisions Made

- **parsePatientRefs regex `/[\s,;]+/`** — chosen over per-delimiter passes because it simultaneously handles mixed delimiters (`"abc, xyz\nanother"`) in a single split without accidental empty-token emission; filter(Boolean) is still required because a leading/trailing delimiter leaves an empty capture.
- **`replace(/^Patient\//, '')` (non-global)** — explicitly strips only one prefix per token. Added a dedicated unit test (`only strips ONE leading Patient/`) because a future maintainer might reflexively add the `g` flag — the test guards against that.
- **Skip-stubs over throw-stubs in Task 1.3** — `it.skip` keeps the Wave 0 suite green (0 failures) while still locking filter names in place. `throw new Error('pending')` would have left the suite red, obscuring real regressions in later waves.

## Deviations from Plan

None — plan executed exactly as written. Shape of `src/quality/cohorts.ts` mirrors the `<interfaces>` block in 21-01-PLAN.md verbatim; every exported symbol, regex, and cap value matches 21-RESEARCH.md §Code Examples line-for-line.

## Known Stubs

The following `it.skip` placeholders are **intentional Wave 0 scaffolding**, not forgotten TODOs. Each is scheduled for un-skip in a specific downstream plan:

| File | Test name filter | To un-skip in |
|------|-----------------|---------------|
| `src/quality/cohortResolver.test.ts` | `intersects three criterion sets` | Plan 21-02 |
| `src/quality/cohortResolver.test.ts` | `date range queries Encounter?date=geX&date=leY` | Plan 21-02 |
| `src/quality/cohortResolver.test.ts` | `condition code queries Condition?code=sys\|code` | Plan 21-02 |
| `src/hooks/useCohorts.test.ts` | `persists storage to quality.cohorts.v1` | Plan 21-02 |
| `src/hooks/useCohorts.test.ts` | `hydration gate returns defaults on first render` | Plan 21-02 |
| `src/hooks/useCohorts.test.ts` | `new cohort id is uuid shaped` | Plan 21-02 |
| `src/hooks/useCohorts.test.ts` | `legacy migration copies quality.cohort.v1 to quality.resourceTypes.v1` | Plan 21-04 |
| `src/hooks/useCohorts.test.ts` | `migration idempotent — does not clobber existing` | Plan 21-04 |
| `src/components/quality/CohortBuilderForm.test.tsx` | `accepts date-range + condition-code + reference-list inputs` | Plan 21-05 |
| `src/components/quality/CohortBuilderForm.test.tsx` | `disables Save when all three criteria empty` | Plan 21-05 |
| `src/components/quality/ResourceTypeSelector.test.tsx` | `renders label "Resource types"` | Plan 21-04 |
| `src/quality/sampling.test.ts` | `short GET: ≤40 patient IDs uses ?patient= query param` | Plan 21-03 |
| `src/quality/sampling.test.ts` | `long POST: >40 patient IDs uses POST /_search form body` | Plan 21-03 |
| `src/quality/sampling.test.ts` | `Patient uses _id not patient param` | Plan 21-03 |
| `src/quality/sampling.test.ts` | `empty array equivalent to no scoping` | Plan 21-03 |
| `src/quality/__tests__/trendsHistory.test.ts` | `treats legacy cohort field as resourceTypes` | Plan 21-04 |
| `src/quality/__tests__/trendsHistory.test.ts` | `leaves modern snapshots … untouched` | Plan 21-04 |

## Issues Encountered

- **Full `npm test` shows 21 failing tests and 8 failing test files**, all pre-existing on base commit `eba6c7c` (verified by checking out base, running `npm test`, observing identical failure count). Pre-existing failures are out of scope per the scope boundary rule. They sit in `src/__tests__/terminology-health.test.ts`, `patient-list.test.tsx`, `patient-view-toggle.test.tsx`, `human-readable-view-terminology.test.tsx`, `sidebar-terminology-row.test.tsx`, `patient-detail.test.tsx`, `resource-type-landing-counts.test.tsx`, `quality-overview.test.tsx` — none touched by this plan.
- **Full `npm run build` fails on `src/quality/completenessWalker.ts` and `src/__tests__/completeness-walker.test.ts`**, also pre-existing (identical errors on base commit). `src/quality/cohorts.ts` compiles cleanly in isolation (`npx tsc --noEmit --strict src/quality/cohorts.ts` → 0 errors).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

All Wave 0 preconditions satisfied for parallel Wave 1 execution:

- **Plan 21-02** (resolver + hook) can import `CohortDefinition`, `CohortCriterion`, `CohortsStorage`, `COHORTS_STORAGE_KEY`, `LEGACY_COHORT_KEY`, `RESOURCE_TYPES_STORAGE_KEY`, `DEFAULT_COHORTS_STORAGE`, `findActiveCohort` from `src/quality/cohorts.ts` and un-skip the relevant stubs.
- **Plan 21-03** (sampling patient-scoping) has `src/quality/sampling.test.ts` waiting with 4 stubs covering the GET/POST cutover, Patient-uses-_id, and empty-array cases.
- **Plan 21-04** (rename) has the `ResourceTypeSelector.test.tsx` label-assertion stub and the `useCohorts.test.ts` legacy-migration stubs plus the new `describe('legacy snapshot')` block in trendsHistory.
- **Plan 21-05** (builder UI) has `CohortBuilderForm.test.tsx` covering the Save-disabled + three-criterion-input invariants.

## Self-Check

Verifying commits and files exist:

- [x] `src/quality/cohorts.ts` — FOUND
- [x] `src/quality/cohorts.test.ts` — FOUND
- [x] `src/quality/cohortResolver.test.ts` — FOUND
- [x] `src/hooks/useCohorts.test.ts` — FOUND
- [x] `src/components/quality/CohortBuilderForm.test.tsx` — FOUND
- [x] `src/components/quality/ResourceTypeSelector.test.tsx` — FOUND
- [x] `src/quality/sampling.test.ts` — FOUND
- [x] `src/quality/__tests__/trendsHistory.test.ts` — FOUND (extended)
- [x] Commit `6d90b81` (Task 1.1 feat) — FOUND
- [x] Commit `d174d74` (Task 1.2 test) — FOUND
- [x] Commit `5abc155` (Task 1.3 test) — FOUND

## Self-Check: PASSED

---
*Phase: 21-interactive-cohort-builder-rename*
*Plan: 21-01*
*Completed: 2026-04-15*
