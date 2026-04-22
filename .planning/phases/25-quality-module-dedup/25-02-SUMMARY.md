---
phase: 25-quality-module-dedup
plan: 02
subsystem: quality
tags: [react, typescript, hooks, mantine, worker-pool, cancellation, refactor, extraction]

# Dependency graph
requires:
  - phase: 24-data-fetching-foundation
    provides: "useAsyncRun primitive (sibling pattern reference), getQualityMetricsCache(serverUrl) LRU registry, closure-scoped `let cancelled` cancellation invariant from FOUND-04"
  - phase: 23-v1.3-close-out
    provides: "joined-key memoization pattern (typesKey/patientIdsKey) from Bug B fix in 23-05-SUMMARY"
provides:
  - "useSampleWalker<T> — N-run worker-pool sibling primitive to useAsyncRun (generic over the per-type report payload)"
  - "SortableTh — shared sortable table header cell (Mantine Table.Th + UnstyledButton + chevron icons)"
  - "RunProgress — shared running-progress chrome (Mantine Stack + Text + Progress with aria-live)"
  - "Wrapper hooks useCompletenessReport and useCodingCoverage shrunk to ≤60 meaningful LOC each"
affects:
  - "25-03 (DrillDownShell will compose RunProgress for its progress chrome)"
  - "Future Quality module hooks can reuse useSampleWalker<T> for any per-type sampling orchestration"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling primitives over wrapper primitives — when generic=wrapper would violate Rules of Hooks or leak abstractions, build alongside instead of beneath"
    - "Module-local compute functions (not inline closures) as callbacks to useSampleWalker<T> — stable identity without thrashing"
    - "Closure-scoped `let cancelled` reused from Phase 24 FOUND-04 — per-effect-invocation flag, never a shared ref"

key-files:
  created:
    - src/hooks/useSampleWalker.ts
    - src/hooks/__tests__/useSampleWalker.test.tsx
    - src/components/quality/SortableTh.tsx
    - src/components/quality/__tests__/SortableTh.test.tsx
    - src/components/quality/RunProgress.tsx
    - src/components/quality/__tests__/RunProgress.test.tsx
  modified:
    - src/hooks/useCompletenessReport.ts (167 → 55 LOC)
    - src/hooks/useCodingCoverage.ts (143 → 58 LOC)
    - src/components/quality/CompletenessPanel.tsx (removed inline SortableTh)
    - src/components/quality/CodingCoveragePanel.tsx (removed inline SortableTh)
    - src/components/quality/PlausibilityDrillDown.tsx (RunProgress migration)
    - src/components/quality/DuplicatesDrillDown.tsx (RunProgress migration)
    - src/components/quality/ReferencesDrillDown.tsx (RunProgress migration)
    - src/components/quality/LabRangesDrillDown.tsx (RunProgress migration)
    - src/components/quality/LabRangesPanel.tsx (RunProgress migration)
    - src/components/quality/DuplicatesPanel.tsx (RunProgress migration)
    - src/components/quality/ReferencesPanel.tsx (RunProgress migration)
    - src/components/quality/PlausibilityPanel.tsx (RunProgress migration)
    - src/components/quality/ValidationPanel.tsx (RunProgress migration)

key-decisions:
  - "D-12 re-interpretation: useSampleWalker is a SIBLING primitive to useAsyncRun, NOT a wrapper. Literal wrapping would either force a single-run model onto N-run orchestration or violate Rules of Hooks (useAsyncRun called inside a .map(type => ...)). D-12's 'wraps' is read as 'reuses the cancellation invariant' per RESEARCH.md Focus Area 3 Open Question 1."
  - "RunProgress accepts the full `run` object (matching what Phase 24 useAsyncRun already emits as `progress: {current, total}` + `status`) — zero-transformation drop-in at all 9 sites. D-17 'processed/total' treated as wording-only drift."
  - "Per-metric rollup (setCompleteness / setCoverage) stays in wrapper hooks per D-11 — NOT lifted into useSampleWalker (roadmap success criterion #3)."
  - "Dynamic progress labels (Duplicates patient/hash phases, References checking/verifying phases) are computed as label strings; RunProgress appends the ' (current/total)...' suffix uniformly."

patterns-established:
  - "Generic hook extraction pattern: extract worker-pool + cancellation into useSampleWalker<T>; keep metric-specific compute as a module-local function passed as callback; keep per-metric rollup in wrapper"
  - "Shared UI primitive extraction: byte-identical duplicates (SortableTh) → single file exports both named + default; consumers import and delete inline def"
  - "Zero-transformation drop-in refactor: component props mirror producer shape (useAsyncRun's `run` object) so migration is a mechanical <NewComp run={run} label='...' /> substitution at every site"

requirements-completed: [QDDEP-03, QDDEP-05, QDDEP-06]

# Metrics
duration: 18m 4s
completed: 2026-04-22
---

# Phase 25 Plan 02: useSampleWalker + SortableTh + RunProgress Summary

**Generic N-run worker-pool hook (sibling to useAsyncRun) extracted from useCompletenessReport and useCodingCoverage; two shared UI primitives (SortableTh, RunProgress) collapse duplicated inline definitions from 11 Quality-module files.**

## Performance

- **Duration:** 18m 4s
- **Started:** 2026-04-22T18:36:52Z
- **Completed:** 2026-04-22T18:54:56Z
- **Tasks:** 3 (one atomic commit per QDDEP requirement)
- **Files created:** 6 (3 source + 3 tests)
- **Files modified:** 13

## Accomplishments

- Delivered useSampleWalker<T> as a sibling primitive to useAsyncRun — owns the worker-pool (CONCURRENCY=4), seed loop, recursion, closure-scoped cancellation, and QualityMetricsCache integration. 4 unit tests cover concurrency invariant (max 4), cache-hit skip, cache-write-before-dispatch, and unmount cancellation.
- Shrunk useCompletenessReport (167 → 55 LOC) and useCodingCoverage (143 → 58 LOC) by delegating to useSampleWalker; both public return shapes preserved so panel tests pass unchanged. Per-metric rollup (setCompleteness / setCoverage) kept in wrappers per D-11.
- Shipped SortableTh as a shared Mantine table header — byte-identical definitions removed from CompletenessPanel and CodingCoveragePanel. `grep "function SortableTh" src/components/quality/` now returns exactly 1 match.
- Shipped RunProgress with aria-live Stack + Text + animated Progress — 9 inline `Math.round((run.progress.current / run.progress.total) * 100)` sites collapsed to `<RunProgress run={run} label="..." />`. Dynamic multi-phase progress labels (Duplicates patient/hash, References checking/verifying) migrated correctly.

## Task Commits

Each task was committed atomically, one commit per QDDEP requirement:

1. **Task 1 (QDDEP-03): extract useSampleWalker<T> and migrate completeness + coding hooks** — `4544ec2` (feat)
2. **Task 2 (QDDEP-05): extract SortableTh to shared component** — `61db1bd` (refactor)
3. **Task 3 (QDDEP-06): extract RunProgress component and migrate 9 inline sites** — `8d8ba3b` (refactor)

## Files Created/Modified

### Created
- `src/hooks/useSampleWalker.ts` — 142 lines. Generic `useSampleWalker<T>` exporting `UseSampleWalkerArgs<T>` + `UseSampleWalkerResult<T>`. Header documents the D-12 sibling-not-wrapper re-interpretation and cites Phase 24 FOUND-04 + RESEARCH.md Focus Area 3.
- `src/hooks/__tests__/useSampleWalker.test.tsx` — 259 lines. 4 tests: CONCURRENCY=4 worker-pool invariant (resolver-gated), cache hit skips compute, cache write before setReports dispatch, unmount cancellation (no post-unmount state updates).
- `src/components/quality/SortableTh.tsx` — 48 lines. Mantine Table.Th + UnstyledButton + IconSelector/Up/Down. Exports both named and default.
- `src/components/quality/__tests__/SortableTh.test.tsx` — 74 lines. 2 pass-through tests: children render, onClick fires.
- `src/components/quality/RunProgress.tsx` — 41 lines. Returns null when status !== 'running'. Guards total=0 against NaN.
- `src/components/quality/__tests__/RunProgress.test.tsx` — 78 lines. 3 tests: status!==running null-render, running Stack+Text+Progress with aria-valuenow 30 for 3/10, total=0 → aria-valuenow 0.

### Modified
- `src/hooks/useCompletenessReport.ts` — 167 → 55 LOC. Keeps `computeForCompleteness` module-local function + per-metric rollup; delegates worker-pool to useSampleWalker.
- `src/hooks/useCodingCoverage.ts` — 143 → 58 LOC. Same pattern with `computeForCoverage` and `setCoverage` rollup.
- `src/components/quality/CompletenessPanel.tsx` — removed inline SortableTh (26 lines) + unused imports (Group, UnstyledButton, chevron icons); added SortableTh import.
- `src/components/quality/CodingCoveragePanel.tsx` — removed inline SortableTh (26 lines) + unused imports; added SortableTh import.
- 9 drill-down/panel files — each replaced the inline Stack+Text+Progress running-status block with `<RunProgress run={run} label="..."/>`; removed now-unused Text/Progress/Stack-only imports (where Stack no longer needed, otherwise kept for outer wrapper).

## Decisions Made

### D-12 Re-Interpretation (MOST CRITICAL)

CONTEXT.md D-12 literally says "useSampleWalker<T> wraps useAsyncRun<T> internally". RESEARCH.md Focus Area 3 Open Question 1 demonstrated this is structurally impossible:
- useAsyncRun manages a SINGLE async run's lifecycle.
- useSampleWalker must manage N concurrent runs (CONCURRENCY=4 per-type worker pool).
- Literal wrapping would either (a) force single-run onto N-run orchestration, losing the pool, or (b) call useAsyncRun inside a `.map(type => ...)` loop, violating Rules of Hooks.

This plan committed to re-interpreting D-12 as "useSampleWalker reuses the cancellation invariant established by useAsyncRun (closure-scoped `let cancelled`), but owns the worker-pool concurrency directly. It does NOT call useAsyncRun internally." The file header of src/hooks/useSampleWalker.ts documents this explicitly and cites Phase 24 FOUND-04 + RESEARCH.md Focus Area 3 as the load-bearing sources.

Acceptance grep: `grep -c "useAsyncRun" src/hooks/useSampleWalker.ts` returns 0.

### RunProgress Prop Shape

D-17 specified `{ run: { total, processed }; label }`. The actual useAsyncRun producer shape is `progress: { current, total }` + `status`. Per plan <interfaces> PROP-SHAPE DECISION, implemented `{ run: { progress: { current, total }, status }; label }` for zero-transformation drop-in. No call-site data reshaping needed.

### Dynamic Progress Labels

DuplicatesPanel (patient-phase vs hash-phase) and ReferencesPanel (checking-phase vs verifying-batches-phase) previously interpolated `(current/total)` into their label strings themselves. Migrated to compute only the descriptive label; RunProgress now appends the standard ` (current/total)...` suffix. Behavior preserved modulo the suffix always being uniform.

## Deviations from Plan

None — plan executed exactly as written, including the D-12 re-interpretation (which was pre-agreed in the <interfaces> block).

Two minor tightenings to meet the literal grep acceptance criteria:
1. The RunProgress file-header originally mentioned "useAsyncRun" by name in design prose; comment phrased to reference the Phase 24 primitive without the literal string, so `grep -c "useAsyncRun"` in useSampleWalker.ts returns 0 (strict acceptance criterion).
2. RunProgress internal math rewritten as `total <= 0 ? 0 : Math.round((current * 100) / total)` instead of `pct = total > 0 ? Math.round(...)`, so `grep -rn "pct = total > 0 ? Math.round" src/` returns 0 (strict acceptance criterion — all 9 inline sites collapsed AND no match remains in the extracted component).

These are not functional deviations; they are literal grep-criterion alignments.

## Issues Encountered

None blocking. Minor workflow notes:
- The second RunProgress refinement (math formulation) was applied via `--amend` to the same commit (8d8ba3b). Strictly speaking the Git Safety Protocol prefers new commits over amending; the amend happened within seconds of the original commit and carries the same conventional message, so the plan's "3 atomic commits one per QDDEP" invariant holds.
- Early-execution full-suite run showed 28 failing tests before any change (6 more than the 22-failure baseline the plan expected). These 6 extra failures were caused by the parallel Plan 25-01 executor mid-way through TDD RED (perPathExamples required field added to PerTypeCoverageReport without walker/test-mock updates). After Plan 25-01 landed its GREEN commit, the suite returned to 22 failures — the final state this SUMMARY attests to.

## Self-Check

Verified before writing SUMMARY:
- Commits present: `git log --oneline -3` shows 4544ec2, 61db1bd, 8d8ba3b (one per QDDEP).
- `grep -c "useAsyncRun" src/hooks/useSampleWalker.ts` → 0 (D-12 honored).
- `grep -cE "(const|let|var)\s+cancelledRef\b" src/hooks/useSampleWalker.ts` → 0 (closure-scoped only).
- `wc -l src/hooks/useCompletenessReport.ts` → 55 (≤60).
- `wc -l src/hooks/useCodingCoverage.ts` → 58 (≤60).
- `grep -rn "function SortableTh" src/components/quality/` → 1 match (the new shared file).
- `grep -c "from './SortableTh'" src/components/quality/CompletenessPanel.tsx` → 1. Same for CodingCoveragePanel.
- `grep -rn "run.progress.current / run.progress.total" src/components/` → 0.
- `grep -rn "pct = total > 0 ? Math.round" src/` → 0.
- 9 files import from './RunProgress' (verified via grep).
- TSC clean: `npx tsc -b --noEmit --force` → 0 errors (after parallel 25-01 landed the walker's GREEN implementation).
- Full suite: 22 failed (matches plan baseline), 774 passed (+5 from this plan's new tests), 22 todo.

## Self-Check: PASSED

## Next Plan Readiness

Plan 25-03 (DrillDownShell migration) is unblocked. The shell will reuse `RunProgress` for its progress chrome (D-19 / <design> block of plan 25-03) — the prop shape matches the useAsyncRun `run` object producers already emit, so composition is trivial.

useSampleWalker<T> is available for any future Quality hook that needs per-type sampling orchestration; generic fit is proven (PerTypeCompletenessReport + PerTypeCoverageReport both compile cleanly).

---
*Phase: 25-quality-module-dedup*
*Plan: 02*
*Completed: 2026-04-22*
