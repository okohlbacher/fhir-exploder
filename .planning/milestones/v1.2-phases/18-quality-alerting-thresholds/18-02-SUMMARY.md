---
phase: 18-quality-alerting-thresholds
plan: 02
subsystem: quality
tags: [context, rollup, percent-clean, derivation, useEffect, terminal-status, per-type-averaging]

# Dependency graph
requires:
  - phase: 18-01 (thresholds foundation — defers MetricKey, METRIC_LABELS, useThresholds)
  - phase: 16-17 (data quality checks providing per-panel run state)
provides:
  - QualityMetricsContext extended from 2 -> 7 overall* values + duplicatesBreakdown + setDuplicatesContribution
  - DuplicatesBreakdown + DuplicatesContribution interfaces (Plan 04 imports as needed)
  - deriveOverallDuplicates() pure helper (kept module-private; covered by Task 6 averaging tests end-to-end)
  - 5 panel useEffect rollup pushes wired (Validation, Plausibility, LabRanges, References) + DuplicatesPanel per-type contribution
affects: [18-03-thresholds-page-summary-card, 18-04-overview-strip]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rollup useEffect gated on terminal status (run.status === 'complete' | 'cancelled') — pitfall 2"
    - "TestConsumer pattern: sibling component reads useQualityMetrics() and renders observed value via data-testid"
    - "Per-type averaging contribution: single setDuplicatesContribution({ patient, hashType }) call merges atomically; resourceType in dep array triggers organic widening"
    - "Mock hook + render with QualityMetricsProvider: each panel test owns its hook mock and observes context state changes"

key-files:
  created:
    - src/__tests__/lab-ranges-panel.test.tsx
    - src/__tests__/references-panel.test.tsx
    - src/__tests__/plausibility-panel.test.tsx
  modified:
    - src/quality/QualityMetricsContext.tsx
    - src/components/quality/ValidationPanel.tsx
    - src/components/quality/PlausibilityPanel.tsx
    - src/components/quality/LabRangesPanel.tsx
    - src/components/quality/ReferencesPanel.tsx
    - src/components/quality/DuplicatesPanel.tsx
    - src/__tests__/duplicates-panel.test.tsx

key-decisions:
  - "overallDuplicates is DERIVED (not a useState) — only setDuplicatesContribution can influence it; consumers must NOT attempt setOverallDuplicates"
  - "Render two sibling DuplicatesPanel instances in one provider to exercise per-type widening; rerender with new types prop fails because internal resourceType useState only initializes once"
  - "ReferencesPanel uses sampleSize PROP (not run.progress.total which is batch count); pitfall 6 in RESEARCH avoided"
  - "ValidationPanel uses allNormalizedIssues (conformance + legacy dedup) for the rollup numerator, NOT run.issues alone (pitfall 6)"
  - "LabRangesPanel pushes undefined when summary.noRange === summary.checked — em-dash tile, NOT misleading 100% (pitfall 7)"

patterns-established:
  - "Rollup useEffect template: gate terminal -> validate denominator -> push round((1 - num/den)*100) | undefined"
  - "Test files mock the hook, render panel + TestConsumer in QualityMetricsProvider, assert via data-testid"

requirements-completed:
  - DQ-12

# Metrics
duration: ~10 min
completed: 2026-04-14
---

# Phase 18 Plan 02: Context Extension + Panel Rollup Pushes Summary

**Extended QualityMetricsContext from 2 to 7 overall* values plus duplicatesBreakdown, and wired 5 panels (Validation, Plausibility, LabRanges, References, Duplicates) to push their "% clean" rollups via useEffect on terminal status — implementing D-03 (% clean derivation), D-17 (no-data → undefined → em-dash), D-18 (not-run → undefined), and the RESOLVED 2026-04-14 RESEARCH Q1 decision for true per-type averaging in Duplicates.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-14T11:05:12Z
- **Completed:** 2026-04-14T11:15:09Z
- **Tasks:** 6/6
- **Files created:** 3
- **Files modified:** 7

## Accomplishments
- Shipped extended `QualityMetricsContext` with 7 `overall*` values, `duplicatesBreakdown`, 6 explicit setters, and `setDuplicatesContribution`; outside-provider fallback extends cleanly (existing tests still pass).
- Wired 5 panels (Validation, Plausibility, LabRanges, References, Duplicates) with rollup useEffects gated on terminal status; no mid-run flicker (pitfall 2), no division-by-zero NaN (pitfall 5), no misleading 100% for un-configured ranges (pitfall 7).
- 17 panel-rollup test assertions across 4 files (3 new + 1 extended). 4/4 lab-ranges, 3/3 references, 3/3 plausibility, 4 new per-type-averaging tests in duplicates (alongside the 3 pre-existing regression tests).
- True per-type averaging in Duplicates: `overallDuplicates` is DERIVED via `deriveOverallDuplicates(duplicatesBreakdown)` — patient pass + each content-hash run contribute components; un-run types are EXCLUDED (NOT scored 0). Per RESOLVED 2026-04-14 RESEARCH Q1, single-type conservative rollup is REJECTED.

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor convention):

1. **Task 1: Wave 0 panel test stubs (3 files, 9 it.todo)** — `ba7c110` (test)
2. **Task 2: Extend QualityMetricsContext** — `cadd08d` (feat)
3. **Task 3: Wire ValidationPanel + PlausibilityPanel rollup push** — `f8dd2f2` (feat)
4. **Task 4: Wire LabRangesPanel + ReferencesPanel rollup push** — `51bc2e9` (feat)
5. **Task 5: Wire DuplicatesPanel per-type contribution push** — `d0fc9a6` (feat)
6. **Task 6: Fill in real assertions in 3 test stubs + extend duplicates test** — `2f494cf` (test)

## Files Created/Modified

### Created
- `src/__tests__/lab-ranges-panel.test.tsx` — 4 tests covering rollup formula, noRange guard, checked=0 guard, no mid-run push.
- `src/__tests__/references-panel.test.tsx` — 3 tests covering rollup formula, unique resourceId dedup, sampleSize=0 guard.
- `src/__tests__/plausibility-panel.test.tsx` — 3 tests covering rollup formula, total=0 guard, dedup by resourceId.

### Modified
- `src/quality/QualityMetricsContext.tsx` — Extended interface (2 → 7 overall*), added `DuplicatesBreakdown` + `DuplicatesContribution` types, added `deriveOverallDuplicates` helper, added `setDuplicatesContribution` (merges contributions atomically). Outside-provider fallback extended.
- `src/components/quality/ValidationPanel.tsx` — Added `useEffect` after `allNormalizedIssues` memo: pushes `setOverallValidation(round((1 - unique_affected/progress.total) * 100))` on terminal status; uses `allNormalizedIssues` (conformance + legacy dedup) per pitfall 6.
- `src/components/quality/PlausibilityPanel.tsx` — Added `useEffect` after `resourcesWithIssues` memo: pushes `setOverallPlausibility(...)` using `run.issues` resourceId dedup.
- `src/components/quality/LabRangesPanel.tsx` — Added `useEffect` after `pct` memo: pushes `setOverallLabRanges(...)` with the `summary.noRange === summary.checked` guard (pitfall 7).
- `src/components/quality/ReferencesPanel.tsx` — Added `useEffect` after `filteredIssues` memo: pushes `setOverallReferences(...)` using `sampleSize` PROP as denominator (NOT `run.progress.total` — that's batch count).
- `src/components/quality/DuplicatesPanel.tsx` — Added `useEffect` after `hashClustersForType` memo: pushes single `setDuplicatesContribution({ patient, hashType: { resourceType, percentClean } })` on terminal status with `sampleSize > 0`. `resourceType` is in dep array.
- `src/__tests__/duplicates-panel.test.tsx` — Appended new `describe('DuplicatesPanel per-type averaging contribution (DQ-12 / Plan 18-02 RESOLVED Q1)', () => {...})` block with 4 tests (patient-only, multi-type widening via 2 sibling panels, sampleSize=0 skip, mid-run skip). Pre-existing 3 regression tests untouched.

## Extended Context Shape (Before / After)

### Before (Plan 18-01 baseline — Wave 1)
```typescript
export interface QualityMetricsContextValue {
  overallCompleteness: number | undefined;
  overallCoverage: number | undefined;
  setCompleteness: (value: number | undefined) => void;
  setCoverage: (value: number | undefined) => void;
}
```

### After (this plan)
```typescript
export interface DuplicatesBreakdown {
  patient?: number;
  hashByType: Record<string, number>;
}

export interface DuplicatesContribution {
  patient?: number;
  hashType?: { resourceType: string; percentClean: number };
}

export interface QualityMetricsContextValue {
  overallCompleteness: number | undefined;
  overallCoverage: number | undefined;
  overallValidation: number | undefined;
  overallPlausibility: number | undefined;
  overallLabRanges: number | undefined;
  overallDuplicates: number | undefined;     // DERIVED
  overallReferences: number | undefined;

  duplicatesBreakdown: DuplicatesBreakdown;

  setCompleteness: (value: number | undefined) => void;
  setCoverage: (value: number | undefined) => void;
  setOverallValidation: (value: number | undefined) => void;
  setOverallPlausibility: (value: number | undefined) => void;
  setOverallLabRanges: (value: number | undefined) => void;
  setOverallReferences: (value: number | undefined) => void;

  setDuplicatesContribution: (contribution: DuplicatesContribution | 'reset') => void;
}
```

The `deriveOverallDuplicates(b)` helper computes:
```typescript
const components: number[] = [];
if (b.patient !== undefined) components.push(b.patient);
for (const v of Object.values(b.hashByType)) {
  if (v !== undefined) components.push(v);
}
if (components.length === 0) return undefined;
return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
```

## Rollup Push Diffs (one per panel)

### ValidationPanel
```typescript
const { setOverallValidation } = useQualityMetrics();
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  if (run.progress.total === 0) {
    setOverallValidation(undefined);
    return;
  }
  const affected = new Set(allNormalizedIssues.map((i) => i.resourceId)).size;
  setOverallValidation(Math.round((1 - affected / run.progress.total) * 100));
}, [run.status, run.progress.total, allNormalizedIssues, setOverallValidation]);
```
**Key:** uses `allNormalizedIssues` (conformance + legacy merged + deduped), NOT `run.issues` alone — pitfall 6.

### PlausibilityPanel
```typescript
const { setOverallPlausibility } = useQualityMetrics();
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  if (run.progress.total === 0) {
    setOverallPlausibility(undefined);
    return;
  }
  const affected = new Set(run.issues.map((i) => i.resourceId)).size;
  setOverallPlausibility(Math.round((1 - affected / run.progress.total) * 100));
}, [run.status, run.progress.total, run.issues, setOverallPlausibility]);
```

### LabRangesPanel
```typescript
const { setOverallLabRanges } = useQualityMetrics();
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  const summary = run.summary;
  if (!summary || summary.checked === 0 || summary.noRange === summary.checked) {
    setOverallLabRanges(undefined);
    return;
  }
  setOverallLabRanges(Math.round((1 - summary.outOfRange / summary.checked) * 100));
}, [run.status, run.summary, setOverallLabRanges]);
```
**Key:** `summary.noRange === summary.checked` → undefined (no ranges configured ≠ data is perfect) — pitfall 7.

### ReferencesPanel
```typescript
const { setOverallReferences } = useQualityMetrics();
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  if (!sampleSize || sampleSize === 0) {
    setOverallReferences(undefined);
    return;
  }
  const affected = new Set(run.issues.map((i) => i.resourceId)).size;
  setOverallReferences(Math.round((1 - affected / sampleSize) * 100));
}, [run.status, run.issues, sampleSize, setOverallReferences]);
```
**Key:** uses `sampleSize` PROP, NOT `run.progress.total` (which is batch count, NOT resource count).

## DuplicatesPanel Per-Type Averaging Diff

```typescript
const { setDuplicatesContribution } = useQualityMetrics();
useEffect(() => {
  if (run.status !== 'complete' && run.status !== 'cancelled') return;
  if (!sampleSize || sampleSize <= 0) return;
  const patientPercentClean = Math.round((1 - patientsInvolved / sampleSize) * 100);
  const hashPercentClean = Math.round((1 - hashResourcesInvolved / sampleSize) * 100);
  setDuplicatesContribution({
    patient: patientPercentClean,
    hashType: { resourceType, percentClean: hashPercentClean },
  });
}, [
  run.status,
  patientsInvolved,
  hashResourcesInvolved,
  resourceType,
  sampleSize,
  setDuplicatesContribution,
]);
```

**Why both components in one call:** atomic merge in the context — a single `setState` reduces re-render count and avoids ordering bugs.

**Why `resourceType` in deps:** when the user picks a new type from the Select and re-runs, the effect re-fires with that new type, adding a new `hashByType[<newType>]` entry; prior entries are PRESERVED (the context merge keeps them).

**Why exclude un-run types:** per RESOLVED 2026-04-14 RESEARCH Q1, types that have NOT been run contribute `undefined`, NOT `0`. The aggregate widens organically as the user runs each type. Scoring an un-run type as 0 (the rejected single-type conservative rollup) would falsely pull the average down and discourage usage.

## Worked Example: Per-Type Widening

Starting state: `duplicatesBreakdown = { hashByType: {} }`, `overallDuplicates = undefined`.

| Step | User action | Contribution pushed | Breakdown after | overallDuplicates |
|------|-------------|---------------------|-----------------|-------------------|
| 0 | (initial) | — | `{ hashByType: {} }` | `undefined` (em-dash tile) |
| 1 | Run on Patient (5 dup patients in cluster, 0 hash dups) | `{ patient: 95, hashType: { resourceType: "Patient", percentClean: 100 } }` | `{ patient: 95, hashByType: { Patient: 100 } }` | `round((95+100)/2) = 98` |
| 2 | Switch to Observation, run (5 dup patients still found by patient pass; 2 obs in hash cluster) | `{ patient: 95, hashType: { resourceType: "Observation", percentClean: 98 } }` | `{ patient: 95, hashByType: { Patient: 100, Observation: 98 } }` | `round((95+100+98)/3) = 98` |
| 3 | Switch to Encounter, run (5 dup patients again; 1 enc in hash cluster) | `{ patient: 95, hashType: { resourceType: "Encounter", percentClean: 99 } }` | `{ patient: 95, hashByType: { Patient: 100, Observation: 98, Encounter: 99 } }` | `round((95+100+98+99)/4) = 98` |
| 4 | Re-run Encounter (now 0 hash dups) | `{ patient: 95, hashType: { resourceType: "Encounter", percentClean: 100 } }` | `{ patient: 95, hashByType: { Patient: 100, Observation: 98, Encounter: 100 } }` (Encounter overwritten) | `round((95+100+98+100)/4) = 98` |

**Key behavior:** patient-pass score is overwritten on every run (it always re-runs); hashByType entries are added per run and overwrite the same-type entry on re-run; types never run are simply absent.

## Notes for Plan 04 (OverviewStrip)

| Tile | Context value to read | Setter (do NOT call from OverviewStrip — read-only) | Special handling |
|------|----------------------|-----------------------------------------------------|------------------|
| Completeness | `overallCompleteness` | `setCompleteness` (pushed by useCompletenessReport / Plan 03 from v1.0) | undefined → em-dash |
| Coverage | `overallCoverage` | `setCoverage` (pushed by useCodingCoverage / Plan 04 from v1.0) | undefined → em-dash |
| Validation | `overallValidation` | `setOverallValidation` (pushed by ValidationPanel) | undefined → em-dash |
| Plausibility | `overallPlausibility` | `setOverallPlausibility` (pushed by PlausibilityPanel) | undefined → em-dash |
| Lab Ranges | `overallLabRanges` | `setOverallLabRanges` (pushed by LabRangesPanel) | undefined → em-dash; specifically when no ranges configured |
| **Duplicates** | `overallDuplicates` | **DERIVED** — DuplicatesPanel calls `setDuplicatesContribution` instead | undefined when `duplicatesBreakdown` is empty |
| References | `overallReferences` | `setOverallReferences` (pushed by ReferencesPanel) | undefined → em-dash |

**Critical for Plan 04:** the Duplicates tile MUST read `overallDuplicates` from context, NOT compute it from breakdown directly. Treat `overallDuplicates` exactly the same as the other 4 numeric values — `undefined` → em-dash, otherwise → integer 0..100.

**For drill-down (future Phase 19):** `duplicatesBreakdown` is exposed on context (`{ patient?, hashByType }`) so a drill-down can show "X of Y types averaged" and per-type breakdowns. Today's OverviewStrip has no need to read it.

## Decisions Made
- **Render two sibling DuplicatesPanel instances** to test the per-type widening case rather than `rerender`. The panel's `resourceType` state uses `useState(() => types[0])` which only initializes once; re-rendering with a new `types` prop does NOT change the internal state. Two siblings with different `types[0]` defaults gives each its own `resourceType` and exercises the merge behavior end-to-end.
- **Test with mocked hooks at module level** (vi.mock) rather than via dependency injection. Matches the existing pattern in `validation-panel.test.tsx` and `duplicates-panel.test.tsx`. Per-test mocks via `(useXxx as ...).mockReturnValue(...)` (or assigning a module-scoped `currentRun` for the existing duplicates pattern).
- **Pushed both `patient` and `hashType` in a single contribution call** rather than two separate calls. Atomic merge in context = one re-render = simpler reasoning. The `useCallback`-wrapped setter merges via functional `setState` to avoid stale-closure bugs.
- **Did NOT add cross-type orchestration to DuplicatesPanel.** No `Promise.all` over types, no auto-iteration. Per-type widening is user-driven via the Select, exactly as RESEARCH Q1 RESOLVED specifies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking → already documented] quality-overview.test.tsx pre-existing failure**
- **Found during:** Task 2 verification (`npm test -- quality-overview --run`)
- **Issue:** 1 of 11 tests fails: `expect(screen.getByRole('link', { name: 'Observation' })).toBeDefined()` — pre-existing flake unrelated to Plan 18-02 changes.
- **Fix:** None applied. Already logged in `.planning/phases/18-quality-alerting-thresholds/deferred-items.md` as DEBT-04 by Plan 18-03.
- **Verification:** `git stash` roundtrip confirms identical 10/11 result on the base commit.
- **Files modified:** None.

**Total deviations:** 1 (pre-existing, not addressed in this plan).
**Impact on plan:** Zero — all Plan 18-02 work passes. Only the unrelated pre-existing flake remains.

## Issues Encountered

**Test design challenge:** The Task 6 multi-type-widening test originally used `rerender(<DuplicatesPanel types={['Encounter']} ...>)` after the first run with `types={['Observation']}`. This failed because `DuplicatesPanel` defaults its internal `resourceType` state via `useState(() => types[0])`, which only runs once. The second render kept the initial `'Observation'` state, so the second run pushed `{ Observation: 99 }` instead of `{ Encounter: 99 }`. Resolved by rendering two sibling panels in the same provider — each owns its own `resourceType` state and pushes its own contribution.

## Known Stubs

None. `grep -nE "(TODO|FIXME|placeholder|coming soon|not available)"` returns zero matches across all 7 modified files. The `it.todo` placeholders from Task 1 were all replaced with real assertions in Task 6.

## Threat Flags

None. The threat model in PLAN.md (T-18-04 through T-18-07) is fully mitigated by the implementation:
- T-18-04 (Information Disclosure, mid-run leak): all 5 useEffects gate on terminal status.
- T-18-05 (Tampering, division-by-zero): every panel guards `progress.total === 0` / `sampleSize === 0` / `summary.checked === 0` with explicit `undefined` push.
- T-18-06 (Information Disclosure, false 100% for noRange): LabRangesPanel guards `summary.noRange === summary.checked`.
- T-18-07 (Information Disclosure, un-run-types averaging): accepted by D-03; documented behavior for future Phase 19 drill-down.

No new attack surface introduced. ASVS L1 baseline maintained.

## User Setup Required

None — no external services, no new env vars, no localStorage migration. The new context shape is backwards-compatible (existing consumers continue to read `overallCompleteness` + `overallCoverage`).

## Next Phase Readiness

- **Plan 03 (ThresholdsPage + SummaryCard breach props)** can import `DuplicatesBreakdown` from QualityMetricsContext if it needs to render per-type duplicates info (probably not — SummaryCard works at the metric-tile level).
- **Plan 04 (OverviewStrip expansion to 7 tiles)** can read all 7 `overall*` values directly from `useQualityMetrics()`. The mapping table above documents which value powers which tile. The Duplicates tile MUST treat `overallDuplicates` as derived (read-only).
- **No blockers.** Wave 3 plans (03, 04) can begin immediately.

## Self-Check: PASSED

- `src/__tests__/lab-ranges-panel.test.tsx` — FOUND (4 it blocks, 0 todos, all pass)
- `src/__tests__/references-panel.test.tsx` — FOUND (3 it blocks, 0 todos, all pass)
- `src/__tests__/plausibility-panel.test.tsx` — FOUND (3 it blocks, 0 todos, all pass)
- `src/quality/QualityMetricsContext.tsx` — MODIFIED (interface extended; setOverallDuplicates absent; setDuplicatesContribution present; deriveOverallDuplicates present; outside-provider fallback extended)
- `src/components/quality/ValidationPanel.tsx` — MODIFIED (setOverallValidation in useEffect; uses allNormalizedIssues; gated on terminal status)
- `src/components/quality/PlausibilityPanel.tsx` — MODIFIED (setOverallPlausibility in useEffect; gated on terminal status)
- `src/components/quality/LabRangesPanel.tsx` — MODIFIED (setOverallLabRanges; noRange guard present; gated on terminal status)
- `src/components/quality/ReferencesPanel.tsx` — MODIFIED (setOverallReferences; uses sampleSize prop; gated on terminal status)
- `src/components/quality/DuplicatesPanel.tsx` — MODIFIED (setDuplicatesContribution in useEffect; setOverallDuplicates absent; resourceType in dep array)
- `src/__tests__/duplicates-panel.test.tsx` — MODIFIED (4 new it blocks under "per-type averaging contribution (DQ-12 / Plan 18-02 RESOLVED Q1)")

Commit hashes verified:
- `ba7c110` (Task 1) — FOUND in git log
- `cadd08d` (Task 2) — FOUND in git log
- `f8dd2f2` (Task 3) — FOUND in git log
- `51bc2e9` (Task 4) — FOUND in git log
- `d0fc9a6` (Task 5) — FOUND in git log
- `2f494cf` (Task 6) — FOUND in git log

`npx vitest run` for all 4 panel test files: 17/17 pass in 1.15s (well under the 30s budget).
`npx tsc -b --noEmit`: zero new errors in modified files (pre-existing strict-mode errors in completenessWalker / profileConformanceChecker / temporalPlausibilityWalker logged in deferred-items.md as DEBT-03).

---
*Phase: 18-quality-alerting-thresholds*
*Plan: 02*
*Completed: 2026-04-14*
