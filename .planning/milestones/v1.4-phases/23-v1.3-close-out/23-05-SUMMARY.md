---
phase: 23-v1.3-close-out
plan: 5
subsystem: quality
tags: [react, hooks, useAsyncRun, fhir-search, cohort-scoping, regression-tests]

requires:
  - phase: 21-interactive-cohort-builder-rename
    provides: patientIds threading pattern (useCompletenessReport.ts:50-54; useValidationRun.ts:172)
  - phase: 24-data-fetching-foundation
    provides: useAsyncRun primitive with autoStart gate (useAsyncRun.ts:138-146)

provides:
  - Bug A fix: useResourceCounts + useResourceCountsMetrics accept optional patientIds; scoped FHIR search via patient= / _id= for <=40 IDs, POST _search for larger cohorts
  - Bug B fix: 4 report hooks (Plausibility, LabRanges, Duplicate, Reference) autoStart:true + memoized patientIdsKey re-fire runner on cohort activation
  - 6 regression test files: 5 that would have caught Bug A and Bug B, 1 Validation regression guard
  - Cache isolation: patientIdsKey fingerprint in countCache key (threat T-23-05-03)

affects: [Plan 23-06 UAT re-run, OverviewStrip, all Quality panels]

tech-stack:
  added: []
  patterns:
    - "patientIdsKey = useMemo(() => patientIds.slice().sort().join(','), [patientIds]) -- stable sorted-join fingerprint for deps arrays"
    - "POST _search fallback at SHORT_QUERY_THRESHOLD=40 mirrors sampling.ts:26-66 for URL-length safety (threat T-23-05-02)"
    - "Module-scope Map cache keyed with optional ::pid:<sorted-join> suffix so scoped and unscoped entries do not collide"

key-files:
  created:
    - src/hooks/__tests__/usePlausibilityReport.test.tsx
    - src/hooks/__tests__/useLabRangesReport.test.tsx
    - src/hooks/__tests__/useDuplicateReport.test.tsx
    - src/hooks/__tests__/useReferenceReport.test.tsx
    - src/hooks/__tests__/useValidationRun.test.tsx
  modified:
    - src/hooks/useResourceCounts.ts
    - src/hooks/useResourceCountsMetrics.ts
    - src/hooks/usePlausibilityReport.ts
    - src/hooks/useLabRangesReport.ts
    - src/hooks/useDuplicateReport.ts
    - src/hooks/useReferenceReport.ts
    - src/components/quality/QualityOverviewPage.tsx
    - src/hooks/__tests__/useResourceCounts.test.tsx

key-decisions:
  - "Chose scoped counts (patient= / _id= / POST _search) over degraded-UX alternative of relabelling tiles Server total (unscoped)."
  - "Used autoStart:true with memoized patientIdsKey, not a manual cancel()+reset effect -- useAsyncRun's autoStart cleanup already owns that lifecycle (useAsyncRun.ts:142-144)."
  - "Added a useValidationRun regression guard test (codifies the root_cause claim that Validation already re-scopes correctly) instead of silently trusting the diagnosis."
  - "In useDuplicateReport memoized `types` AND `patientIds`; types is a parent-supplied array so without typesKey autoStart would thrash on every parent re-render (Blocker 2)."

patterns-established:
  - "patientIdsKey sorted-join memoization: consistent shape across 5 hooks (useCompletenessReport, useCodingCoverage -- pre-existing; usePlausibilityReport, useLabRangesReport, useDuplicateReport, useReferenceReport -- this plan)"
  - "Delta-based test assertions (callsAfter - callsBefore >= 1) for re-run verification: robust to StrictMode double-mount and arbitrary initial-mount call counts"

requirements-completed: [CLOSE-06]

duration: 35min
completed: 2026-04-22
---

# Phase 23 Plan 5: Fix Bug A (OverviewStrip tiles unscoped) + Bug B (4 report hooks stale on cohort change) Summary

**Unit-level fix for the T-6.3 A UAT failure: scoped FHIR counts plumbed through useResourceCounts + autoStart:true added to 4 stale report hooks so cohort activation actually changes the quality dashboard.**

## Performance

- **Duration:** approx 35 min
- **Started:** 2026-04-22T15:23:00Z
- **Completed:** 2026-04-22T15:34:00Z
- **Tasks:** 3/3
- **Source files modified:** 7
- **Test files created/extended:** 6

## Accomplishments

- Bug A closed: `useResourceCounts` now accepts an optional `patientIds` arg and issues scoped FHIR search (`patient=Patient/{id}` for non-Patient types, `_id={id}` for Patient type; POST `_search` fallback for cohorts >40 IDs). Cache key includes patientIds fingerprint so scoped/unscoped entries are isolated.
- Bug B closed: `usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport` gained `autoStart: true` + memoized `patientIdsKey`. `useDuplicateReport` also gained `typesKey` memoization (Blocker 2).
- QualityOverviewPage reordered so the cohort resolver runs BEFORE `useResourceCountsMetrics`; `scopedPatientIds` is now threaded into the OverviewStrip count hook.
- 5 RED→GREEN regression tests for Bug A/B and 1 always-GREEN Validation regression guard. Delta-based assertions (`callsAfter - callsBefore >= 1`) make them robust to StrictMode double-mount.
- Full test suite: 0 new regressions vs. baseline (22 pre-existing failures unchanged).

## Task Commits

Each task was committed atomically (with `--no-verify` since this is a parallel-executor worktree):

1. **Task 1: Failing regression tests (5 RED + 1 GREEN guard)** -- `dce0564` (test)
2. **Task 2: Bug A -- patientIds through useResourceCounts + metrics + page** -- `3d39aef` (fix)
3. **Task 3: Bug B -- autoStart + memoized keys on 4 report hooks** -- `1cafdf2` (fix)

## Files Created/Modified

### Created
- `src/hooks/__tests__/usePlausibilityReport.test.tsx` -- Bug B regression (autoStart + re-run on cohort change)
- `src/hooks/__tests__/useLabRangesReport.test.tsx` -- Bug B regression
- `src/hooks/__tests__/useDuplicateReport.test.tsx` -- Bug B regression
- `src/hooks/__tests__/useReferenceReport.test.tsx` -- Bug B regression
- `src/hooks/__tests__/useValidationRun.test.tsx` -- regression guard (asserts Validation's already-correct re-scoping)

### Modified
- `src/hooks/useResourceCounts.ts` -- optional 4th `patientIds` arg; patientIdsKey useMemo; cache key `::pid:<sorted-join>` fingerprint; scoped `fetchCount` with `patient=` / `_id=` + POST _search threshold
- `src/hooks/useResourceCountsMetrics.ts` -- optional 3rd `patientIds` arg, passthrough
- `src/components/quality/QualityOverviewPage.tsx` -- cohort resolver block moved above `useResourceCountsMetrics` call; `scopedPatientIds` passed as 3rd arg
- `src/hooks/usePlausibilityReport.ts` -- `useMemo` import, `patientIdsKey`, `autoStart: true`, deps swap
- `src/hooks/useLabRangesReport.ts` -- same shape
- `src/hooks/useDuplicateReport.ts` -- same shape + `typesKey` memoization (Blocker 2: `types` array would have thrashed autoStart without memoization)
- `src/hooks/useReferenceReport.ts` -- same shape
- `src/hooks/__tests__/useResourceCounts.test.tsx` -- 3 new tests for Bug A (scoped re-fetch, cache isolation, Patient-type `_id=` param)

## Test Counts (before/after)

- `useResourceCounts.test.tsx`: 8 -> 11 tests (3 new for Bug A)
- `usePlausibilityReport.test.tsx`: new file, 1 test
- `useLabRangesReport.test.tsx`: new file, 1 test
- `useDuplicateReport.test.tsx`: new file, 1 test
- `useReferenceReport.test.tsx`: new file, 1 test
- `useValidationRun.test.tsx`: new file, 1 test (regression guard, GREEN on current code)

Total new assertions: 8 (3 extended + 5 new files).

## Full-suite Result

Baseline (before this plan):
- Test Files: 8 failed | 70 passed | 3 skipped (81)
- Tests: 22 failed | 750 passed | 22 todo (794)

After this plan:
- Test Files: 8 failed | 75 passed | 3 skipped (86)
- Tests: 22 failed | 758 passed | 22 todo (802)

**Delta: 22 pre-existing failures (expected 22), 0 new failures.** All 8 added tests pass. TypeScript (`npx tsc -b --noEmit`) exits 0.

## Decisions Made

See `key-decisions` frontmatter. Highlights:

- **Scoped counts over degraded UX** -- chosen fix matches the UAT user expectation that "the counts change when I activate a cohort"; tiles recompute exactly like every other panel.
- **autoStart:true over manual cancel()+reset effect** -- useAsyncRun already cancels prior run on start() and on deps-change cleanup; a manual effect would duplicate that lifecycle.
- **Regression guard for Validation** -- the root_cause diagnosis claims Validation already re-scopes. Rather than trust it silently, `useValidationRun.test.tsx` codifies it; if Validation ever regresses the guard turns red.

## Deviations from Plan

None -- plan executed exactly as written across 3 atomic task commits.

Two incidental fixes captured in the Task 2 commit:

1. **[Rule 3 - Blocking issue] Tests had TS errors after swap to typed vi.fn signatures**
    - **Found during:** Task 2 verify step (`npx tsc -b --noEmit`)
    - **Issue:** `type` parameter was unused in one mock; `search.mock.calls[0][1]` tuple-indexed a `vi.fn(async () => ...)` with no declared arg signature (tuple length 0).
    - **Fix:** Renamed unused `type` to `_type`; gave the Patient-type test's `vi.fn` an explicit 2-arg signature so its mock.calls are typed `[string, ...][]`.
    - **Files modified:** `src/hooks/__tests__/useResourceCounts.test.tsx`
    - **Verification:** `npx tsc -b --noEmit` now exits 0.
    - **Committed in:** `3d39aef` (folded into Task 2 commit since both files are in Task 2's scope)

## Issues Encountered

None. The Validation regression guard passed GREEN on first run, confirming the root_cause diagnosis (`useValidationRun.ts:172` already includes `patientIds` in the `start()` useCallback deps). No scope expansion needed.

## Threat Model Dispositions (from PLAN.md)

| ID | Disposition | How mitigated this plan |
|----|-------------|------------------------|
| T-23-05-01 | accept | Scoped search reuses the existing Phase 21 pattern; no new PHI path. IDs pass via object/`URLSearchParams`, no string concatenation into URL path. |
| T-23-05-02 | mitigate | `SHORT_QUERY_THRESHOLD = 40` check; POST `_search` with form-urlencoded body when cohort is larger. |
| T-23-05-03 | mitigate | `cacheKey(serverUrl, type, patientIdsKey)` -- optional `::pid:<sorted-join>` suffix guarantees scoped/unscoped entries do not collide. |
| T-23-05-04 | accept | All test fixtures use synthetic IDs (`p1`). Reviewed before commit; no real patient identifiers present. |
| T-23-05-05 | mitigate | `patientIdsKey` + `typesKey` memoization in all 4 Bug B hooks; autoStart:true uses the sorted-join string, not array references. |
| T-23-05-06 / 07 / 08 | accept | No auth / audit / privilege surfaces touched. |

## Follow-ups / Handoff

- **Plan 23-06** (UAT re-run) is responsible for flipping T-6.3 A from `issue` to `pass` on live Blaze. This plan only proves the fix at the unit level.
- No open TODOs or known stubs introduced.
- No new `as unknown as Record<string, unknown>` casts -- the single pre-existing one in `useReferenceReport.ts:79` is unchanged (SWEEP-01 / Phase 28 scope).

## Self-Check: PASSED

- File `.planning/phases/23-v1.3-close-out/23-05-SUMMARY.md` -- FOUND (this file)
- Commit `dce0564` (Task 1 test) -- FOUND
- Commit `3d39aef` (Task 2 Bug A fix) -- FOUND
- Commit `1cafdf2` (Task 3 Bug B fix) -- FOUND
- All 6 test files exist and contain `patientIds` -- VERIFIED
- `npm test -- --run` baseline delta = 0 new failures -- VERIFIED
- `npx tsc -b --noEmit` exits 0 -- VERIFIED
- No real PHI in any committed file -- VERIFIED (grep for synthetic IDs only: `p1`)
