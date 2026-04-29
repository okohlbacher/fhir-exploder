---
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
plan: 04
subsystem: ui
tags: [react, mantine, fhir, quality-metrics, per-type-matrix, react-router, useThresholds, sortable-table]

# Dependency graph
requires:
  - phase: 32-eff-r14-qualitymetricscontext-split
    provides: 7-context per-metric architecture (CompletenessContext, CoverageContext, ValidationContext, ReferencesContext, DuplicatesContext + 2 untouched) — extended here with byType slot
  - phase: 35-01
    provides: SegmentedControl mode cleanup (Wave 1; soft fence)
  - phase: 35-02
    provides: Explorer Date/Status per-type extractor (Wave 1; soft fence)
  - phase: 35-03
    provides: HumanReadableView extension cleanup (Wave 1; soft fence)
provides:
  - byType slot + setByType setter on Completeness, Coverage, Validation, References per-metric contexts
  - validationIssuesByType slot + setValidationIssuesByType on ValidationContext (NEW per RESEARCH Q-01)
  - DuplicatesContext byType derived getter (passthrough of breakdown.hashByType, identity-stable)
  - 4 producer migrations populating byType (useCompletenessReport, useCodingCoverage, ValidationPanel, ReferencesPanel)
  - URL pre-selection of resourceType from ?type= query param in ValidationPanel + ReferencesPanel (RESEARCH Q-02)
  - QualityByTypeMatrix component — 8-column sortable matrix card under /quality?tab=counts
  - Locked UI copy: "Quality by resource type" + UI-SPEC-verbatim subtitle
  - Sparse-cell em-dash invariant locked (NEVER 0% for unmeasured types)
  - Threshold-breach coloring via curried useThresholds().isBreached(metricKey, value) (D-18)
  - Chevron click navigation respects PHI gate (Pitfall P-08; no auto-fire of validation/reference runs)
affects: [v1.5-quality-dashboard, future-per-type-metrics, future-csv-export-of-matrix, future-heat-column-gradient]

# Tech tracking
tech-stack:
  added: []  # No new runtime dependencies
  patterns:
    - "Per-metric context byType slot extension preserves Phase 32 facade invariant (useQualityMetrics() unchanged)"
    - "Functional setter form (setByType((prev) => ...)) for single-type producers (Pitfall P-04 mitigation)"
    - "Sparse-cell em-dash convention — ALL per-type matrix cells render — instead of 0% when value undefined"
    - "URL-driven resourceType pre-selection via useSearchParams('type') with whitelist validation"
    - "Curried useThresholds().isBreached(metricKey, value) for hydration-safe breach coloring (WR-04 gate inherited)"
    - "Read-projection over per-metric contexts — matrix is a CONSUMER, not a producer (D-22; Phase 32 D-09 invariant preserved)"

key-files:
  created:
    - src/components/quality/QualityByTypeMatrix.tsx (402 lines)
    - src/quality/metrics/__tests__/byType.test.tsx (107 lines)
    - src/__tests__/QualityByTypeMatrix.test.tsx (293 lines)
  modified:
    - src/quality/metrics/CompletenessContext.tsx (+byType slot, +setByType, no-op fallback)
    - src/quality/metrics/CoverageContext.tsx (+byType slot, +setByType, no-op fallback)
    - src/quality/metrics/ValidationContext.tsx (+byType +validationIssuesByType + 2 setters)
    - src/quality/metrics/ReferencesContext.tsx (+byType slot, +setByType, no-op fallback)
    - src/quality/metrics/DuplicatesContext.tsx (+byType derived getter — no new useState)
    - src/hooks/useCompletenessReport.ts (+per-type byType derivation in existing useEffect)
    - src/hooks/useCodingCoverage.ts (+per-type byType derivation in existing useEffect)
    - src/components/quality/ValidationPanel.tsx (+useSearchParams pre-selection +functional setByType +setValidationIssuesByType)
    - src/components/quality/ReferencesPanel.tsx (+useSearchParams pre-selection +functional setByType)
    - src/components/quality/QualityOverviewPage.tsx (+QualityByTypeMatrix mounted under Tabs.Panel value="counts")

key-decisions:
  - "byType extension keeps Phase 32 facade preservation invariant intact — useQualityMetrics() not extended"
  - "validationIssuesByType is a NEW context slot (RESEARCH Q-01) — no pre-existing per-type aggregate to repurpose"
  - "DuplicatesContext exposes byType as derived getter (breakdown.hashByType passthrough) — NO parallel state"
  - "Functional-setter form mandated on single-type producers (Pitfall P-04 stale-closure mitigation)"
  - "Sparse cells render em-dash, NEVER 0% — per Pitfall P-05 + UI-SPEC §Typography invariant"
  - "Curried useThresholds().isBreached() hook form (D-18) — NOT pure isBreached(value, threshold) — for WR-04 hydration gate"
  - "Default sort: Issues DESC, Resource type ASC tiebreaker — most-actionable signal first (D-20)"
  - "Chevron click is navigation only; PHI gate preserved (Pitfall P-08; T-35-04-03 mitigation)"
  - "URL pre-selection whitelisted against existing panel selectOptions (T-35-04-01 open-redirect mitigation)"

patterns-established:
  - "Per-type quality matrix pattern: SortableTh column primitive + Card empty-state hide + chevron navigation handler"
  - "Single-type producer functional setter form: setByType((prev) => ({ ...prev, [resourceType]: pct }))"
  - "Already-mapped producer derivation pattern: iterate per-type reports → Record<string, number> → setByType(map)"
  - "Curried isBreached cell-coloring pattern: const { isBreached } = useThresholds(); breached = isBreached(metricKey, value)"

requirements-completed: [UAT-FU-05]

# Metrics
duration: ~10min
completed: 2026-04-25
---

# Phase 35 Plan 04: Per-Type Quality Matrix + byType Context Plumbing Summary

**Per-type quality matrix card under Counts tab with 8-column sortable table fed by byType extensions to 5 Phase-32 per-metric contexts; sparse-cell em-dash invariant locked, chevron navigation honors PHI gate, ValidationPanel + ReferencesPanel honor `?type=` URL param.**

## Performance

- **Duration:** ~10 minutes
- **Started:** 2026-04-25T06:58:00Z
- **Completed:** 2026-04-25T07:08:33Z
- **Tasks:** 4 (all atomic-commit)
- **Files modified:** 10
- **Files created:** 3

## Accomplishments
- 5 Phase-32 per-metric contexts extended with `byType` slot (4 with new useState, 1 derived passthrough); ValidationContext additionally gains `validationIssuesByType` slot per RESEARCH Q-01
- 4 producer migrations: useCompletenessReport + useCodingCoverage (already-mapped pattern); ValidationPanel + ReferencesPanel (single-type functional-merge pattern, Pitfall P-04 mitigated)
- ValidationPanel + ReferencesPanel honor `?type=<resourceType>` URL param for chevron-navigation continuity (RESEARCH Q-02)
- QualityByTypeMatrix component (NEW): 8 columns (Resource type, Complete %, Coverage %, Validation %, References %, Dup, Issues, chevron), sortable via SortableTh, default `Issues DESC` + `Resource type ASC` tiebreaker
- Sparse cells render em-dash (`—`) — NEVER `0%` (Pitfall P-05 invariant)
- Threshold breach coloring via curried `useThresholds().isBreached(metricKey, value)` (D-18; inherits WR-04 hydration gate)
- Card hidden when no types have count > 0 (D-21 + Pitfall P-06)
- Chevron click navigates `/quality?tab=<firstNonEmpty>&type=<type>`; falls back to `/explorer/<type>` when ALL metrics empty (D-19)
- Chevron click is navigation only — does NOT auto-fire validation/reference runs (Pitfall P-08; PHI gate preserved)
- Phase 32 facade preservation invariant verified — `useQualityMetrics()` unchanged; per-tile isolation invariant preserved (metrics-isolation.test.tsx still green)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend 5 per-metric contexts + byType setter contract test** — `9c4b80c` (feat)
2. **Task 2: Migrate 4 producers + URL-driven type pre-selection** — `299acf4` (feat)
3. **Task 3: RED tests for QualityByTypeMatrix component** — `6680450` (test)
4. **Task 4: GREEN — QualityByTypeMatrix.tsx + mount under counts tab** — `35814aa` (feat)

## Test Count Delta

- **Baseline (start of plan):** 1026 passing
- **After Task 1:** 1043 passing (+17 byType.test.tsx contract tests)
- **After Task 2:** 1043 passing (no new tests; producers existing tests still green)
- **After Task 3:** 1043 passing in suite + 1 RED file (component import failure — intentional)
- **After Task 4:** 1054 passing (+11 QualityByTypeMatrix.test.tsx — RED → GREEN)
- **Total delta:** +28 net new tests
- **D-23 floor (≥ 1015):** PASSED — actual 1054
- **D-23 prompt floor (≥ 1043):** PASSED — actual 1054

`npx tsc -b --noEmit`: clean (exit 0)
`npm run build`: clean

## Decisions Made

- **`validationIssuesByType` is a genuinely NEW context slot** (RESEARCH Q-01) — no pre-existing per-type integer issue aggregate exists in ValidationPanel; the matrix Issues column would have been impossible without this addition
- **Duplicates byType is derived, not stored** — passthrough of `breakdown.hashByType` keeps the existing `contribute()` accumulator as the sole producer; identity-stable so consumers can compare references
- **Functional setter form mandatory on single-type producers** — Pitfall P-04 stale-closure mitigation; ValidationPanel runs only one type at a time, so the prior byType map MUST be merged via `setByType((prev) => ({ ...prev, [resourceType]: pct }))` to preserve other types
- **URL pre-selection whitelisted against existing panel options** — T-35-04-01 open-redirect mitigation; `searchParams.get('type')` is only honored when present in the panel's pre-existing select options whitelist
- **Used `fireEvent` instead of `userEvent`** — `@testing-library/user-event` is not installed in this project; `@testing-library/react` provides `fireEvent` natively which is sufficient for click simulation in these tests
- **Chevron column has `onClick={(e) => e.stopPropagation()}` on its `<Table.Td>`** — prevents the row click handler from double-firing when the user explicitly clicks the chevron button; both targets call the same `handleRowClick(row)` so behavior is identical

## Deviations from Plan

None - plan executed exactly as written.

Two micro-adjustments worth noting (NOT deviations from plan intent):
- Plan's test file used `import userEvent from '@testing-library/user-event'`; actual project doesn't have this dep. Adapted to `fireEvent` from `@testing-library/react` — same semantic, simpler API. Plan acceptance criteria did not pin the click library.
- Plan's test included `import { type ReactNode }` but `ReactNode` was unused after I refactored the wrapper — TS strict-mode flagged it. Removed.

## Issues Encountered

- **TypeScript strict cast in byType.test.tsx**: Initial `(result.current as Record<string, unknown>).byType` failed TS strict-mode `Conversion of type 'QualityMetricsContextValue' to 'Record<string, unknown>' may be a mistake`. Fixed via `as unknown as Record<string, unknown>` double-cast — preserves the test intent (assert the facade has no byType field) without TS error.

## Pitfall Mitigations Confirmed

| Pitfall | Description | Mitigation |
|---------|-------------|------------|
| P-04 | Stale closure on `byType` reads in single-type producer effects | Functional setter form `setByType((prev) => ...)` in ValidationPanel + ReferencesPanel |
| P-05 | Cells incorrectly rendering `0%` for unmeasured types | `PercentTd` + `IssuesCell` render em-dash (`—`) `c="dimmed"` when value === undefined |
| P-06 | Empty types polluting matrix | Row inclusion = `count === 'loading' OR (typeof count === 'number' && count > 0)`; empty types filtered out; card NOT rendered when zero rows |
| P-07 | First-non-empty heuristic could pick wrong metric | Strict display-order traversal: completeness → coverage → validation → references → dup; falls back to `/explorer/<type>` when ALL empty |
| P-08 | Chevron click could auto-fire validation/reference runs (PHI gate breach) | `handleRowClick` only calls `useNavigate(...)`; ValidationPanel/ReferencesPanel `?type=` pre-selection does NOT auto-call `run.start()` — user still clicks "Validate sample" / "Run reference checks". Verified by chevron-fetch test (#10) |
| P-14 | `setByType` reference instability could cause infinite re-renders | useState setters are reference-stable by React contract; useMemo deps include byType state but exclude setters. `setByType reference is stable across re-renders` test guards this |

## RESEARCH Question Resolutions Implemented

- **Q-01: validationIssuesByType new slot** — added as second slot on ValidationContext; matrix Issues column reads from it
- **Q-02: URL pre-selection** — ValidationPanel + ReferencesPanel both `import { useSearchParams } from 'react-router-dom'` and read `searchParams.get('type')` on initial state, whitelisted against existing select options

## Decision-Coverage Matrix

| Decision | Implementation Site | Status |
|----------|---------------------|--------|
| D-14: byType slot extension | 5 contexts in `src/quality/metrics/*` | ✓ |
| D-15: 4 producer migrations | `useCompletenessReport`, `useCodingCoverage`, `ValidationPanel`, `ReferencesPanel` | ✓ |
| D-16: matrix card placement | `QualityOverviewPage.tsx` Tabs.Panel value="counts" inside Stack gap="md" | ✓ |
| D-17: 7 data columns + chevron | `QualityByTypeMatrix.tsx` Table.Thead | ✓ |
| D-18: curried isBreached | `PercentTd` + `IssuesCell` use `useThresholds().isBreached(key, value)` | ✓ |
| D-19: row-click navigation | `handleRowClick` first-non-empty heuristic + `/explorer/<type>` fallback | ✓ |
| D-20: default sort Issues DESC | `useState({ key: 'issues', dir: 'desc' })` + tiebreaker `localeCompare` | ✓ |
| D-21: row inclusion | `includedTypes` filter on `count === 'loading' OR > 0` | ✓ |
| D-22: no new FHIR fetches | Component reads only from per-metric contexts + counts prop | ✓ |
| D-23: ≥ 1015 test count | Achieved 1054 | ✓ |

## Phase 32 Facade Preservation Verification

- `git diff da37b47..HEAD -- src/quality/QualityMetricsContext.tsx` reports NO changes to the facade
- `byType.test.tsx` includes `expect((result.current as unknown as Record<string, unknown>).byType).toBeUndefined()` test that passes — facade does NOT expose byType
- Per-tile isolation invariant: `npx vitest run src/__tests__/metrics-isolation.test.tsx` passes (1 test) — Phase 32 EFF-R14-04 contract intact

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UAT-FU-05 closed; matrix card live under `/quality?tab=counts`
- Phase 35 closes all 4 in-scope UAT follow-ups (FU-01, FU-02, FU-03, FU-05); UAT-FU-04 + UAT-FU-06 already closed in Phase 33
- v1.6+ deferred items remain: CSV export of matrix, heat-column gradient, German localization of Date/Status enums, Plausibility + LabRanges columns in matrix, expandable per-type drill-down inside matrix card

## Self-Check: PASSED

Files verified to exist:
- `src/components/quality/QualityByTypeMatrix.tsx` — FOUND
- `src/quality/metrics/__tests__/byType.test.tsx` — FOUND
- `src/__tests__/QualityByTypeMatrix.test.tsx` — FOUND

Commits verified to exist:
- `9c4b80c` (Task 1) — FOUND
- `299acf4` (Task 2) — FOUND
- `6680450` (Task 3) — FOUND
- `35814aa` (Task 4) — FOUND

Final verification:
- `npx vitest run` reports 1054 passing / 22 todo / 0 failing — FOUND
- `npx tsc -b --noEmit` exits 0 — FOUND
- `npm run build` exits 0 — FOUND

---
*Phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix*
*Completed: 2026-04-25*
