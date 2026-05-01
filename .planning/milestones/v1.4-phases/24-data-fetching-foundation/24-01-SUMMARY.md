---
phase: 24-data-fetching-foundation
plan: 01
subsystem: testing
tags: [react, typescript, useReducer, useAsyncRun, cancellation, state-machine, tdd]

# Dependency graph
requires:
  - phase: 23-v1.3-close-out
    provides: clean v1.3 baseline (all CLOSE-01..08 resolved)
provides:
  - "Pure asyncRunReducer + 5 exported symbols for discriminated-union async state machine"
  - "useAsyncRun<TIssue> hook with closure-scoped cancellation and autoStart opt-in"
  - "Precedent pattern for eliminating cancelledRef anti-pattern across hook family"
  - "Foundation primitive that Plan 24-04 (migrate 4 report hooks) and Phase 25 (useSampleWalker) build on"
affects:
  - 24-02 (useResourceCounts cache)
  - 24-03 (metricsCache registry)
  - 24-04 (migrate 4 async report hooks)
  - 25 (useSampleWalker, drill-down refactor using autoStart)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed-shape useReducer with generic TIssue only (prevents consumer-panel `as` casts per PITFALLS Pitfall 1)"
    - "Closure-scoped `let cancelled` + ref-of-handles for out-of-closure cancellation (NOT the cancelledRef anti-pattern)"
    - "Pure reducer in src/hooks/internal/ for React-free unit testing"

key-files:
  created:
    - src/hooks/internal/asyncRunReducer.ts
    - src/hooks/useAsyncRun.ts
    - src/hooks/__tests__/asyncRunReducer.test.ts
    - src/hooks/__tests__/useAsyncRun.test.tsx
  modified: []

key-decisions:
  - "Fixed-shape reducer state (generic only on TIssue) — not `<TState>` — per D-09 and PITFALLS Pitfall 1"
  - "Closure-scoped `let cancelled` is authoritative; `cancelInFlightRef` holds a function handle (not a boolean), keeping the invariant intact"
  - "`autoStart?: boolean` defaults to false; Phase 24 consumers call start() imperatively, Phase 25 drill-downs will opt in"
  - "`complete` is a no-op when state is already cancelled (cancel wins over late runner resolution — T-24-01-02)"
  - "Reducer is React-free and lives in `internal/` so transitions can be unit-tested without renderHook"

patterns-established:
  - "Reducer-based async state machines: put pure reducer in src/hooks/internal/{name}Reducer.ts, wrap with hook in src/hooks/{useName}.ts"
  - "Cancellation-sensitive hooks: every start()/effect run gets its own `let cancelled = false`; refs only hold handles, never flags"
  - "TDD for primitive hooks: RED commit → GREEN commit per task; tests use `<string>` as TIssue for reducer, `renderHook` + `act` + StrictMode wrapper for hook"

requirements-completed: [FOUND-03]

# Metrics
duration: 5m26s
completed: 2026-04-17
---

# Phase 24 Plan 01: useAsyncRun Primitive Summary

**Pure `asyncRunReducer` + React `useAsyncRun<TIssue>` hook with closure-scoped cancellation, ref-of-handles for cross-run cancel, and `autoStart` opt-in — 17/17 new tests green, zero `as` casts, zero `cancelledRef` variables.**

## Performance

- **Duration:** 5m 26s
- **Started:** 2026-04-17T12:11:31Z
- **Completed:** 2026-04-17T12:16:57Z
- **Tasks:** 2 (both TDD)
- **Files created:** 4
- **Files modified:** 0

## Accomplishments

- Delivered FOUND-03 primitive: pure reducer + hook shipped standalone with 17 dedicated tests, zero consumer edits
- Encoded the cancel-wins-over-complete invariant (T-24-01-02) in the reducer, preventing late runner resolutions from overriding user cancellation
- Established the ref-of-handles cancellation pattern with documented distinction from the `cancelledRef` anti-pattern — future hook migrations have a reference implementation
- Verified backward-compatible return shape so the 4 downstream report hooks (usePlausibilityReport, useLabRangesReport, useDuplicateReport, useReferenceReport) can adopt `useAsyncRun` via superset-shape swap in Plan 24-04

## Task Commits

Each task was committed atomically with TDD RED/GREEN split:

1. **Task 1 (RED): failing reducer tests** — `e23157f` (test)
2. **Task 1 (GREEN): implement asyncRunReducer** — `5105fd4` (feat)
3. **Task 2 (RED): failing useAsyncRun tests** — `63ee5fa` (test)
4. **Task 2 (GREEN): implement useAsyncRun hook** — `35ba2bf` (feat)

No REFACTOR commits were needed — both implementations landed minimal and clean on first pass.

## Files Created/Modified

### Created

- `src/hooks/internal/asyncRunReducer.ts` — 102 lines. Exports `AsyncRunStatus`, `AsyncRunState<TIssue>`, `AsyncRunAction<TIssue>`, `asyncRunReducer`, `initialAsyncRunState`. Pure module, no React imports. File header cites FOUND-03, PITFALLS Pitfall 1, and `useCompletenessReport.ts:71-74`.
- `src/hooks/useAsyncRun.ts` — 149 lines. Exports `useAsyncRun`, `UseAsyncRunResult`, `UseAsyncRunArgs`, `RunnerHelpers`. Closure-scoped `let cancelled` per start() call, `cancelInFlightRef` holds a function handle, `autoStart?: boolean` with default false. File header explains why this is not `cancelledRef`.
- `src/hooks/__tests__/asyncRunReducer.test.ts` — 118 lines, 9 tests (8 for reducer transitions + 1 for initial state factory). All pure-function tests.
- `src/hooks/__tests__/useAsyncRun.test.tsx` — 275 lines, 8 integration tests (idle init, start→complete, mid-run cancel, rapid start re-entry, runner throw, autoStart mount, unmount-cancel, StrictMode double-mount).

## Decisions Made

All locked decisions from Phase 24 CONTEXT.md were followed verbatim:

- **D-07** honored: `runner` receives `{ isCancelled, setProgress, appendIssues }` helpers; closure-scoped `let cancelled` with no `AbortController`.
- **D-08** honored: `autoStart?: boolean` present, defaults to false. useEffect fires `start()` on mount and on deps change when true.
- **D-09** honored: reducer generic only on `TIssue`; state shape is fixed. Each future consumer can retain its own accessory `useState` without coupling to the reducer.

One implementation detail: to keep `start()`'s `useCallback` deps equal to `args.deps ?? []` without thrashing on inline runner identity, the runner is read through a `runnerRef` that is refreshed every render. This is the standard "latest-runner" pattern and does not violate any locked invariant — cancellation and dispatch are still closure-scoped per `start()` invocation.

## Deviations from Plan

None — plan executed exactly as written.

Two acceptance-criteria greps in the plan (`grep -c " any\\b\\| as "` and `grep -c "cancelledRef"`) match English prose in comments rather than code constructs. Precise checks confirm zero `any` types, zero `as` casts, and zero `cancelledRef` variables:

```
grep -cE ":\s*any(\b|\[)" src/hooks/internal/asyncRunReducer.ts  → 0
grep -cE "\bas\s+[A-Z]" src/hooks/useAsyncRun.ts                 → 0
grep -E "(const|let|var)\s+cancelledRef\b" src/hooks/useAsyncRun.ts → no match
```

The `cancelledRef` matches in `useAsyncRun.ts` are two documentation sentences explicitly identifying the anti-pattern the file is NOT using — they are intentional teaching comments. No deviation from the plan's intent.

## Issues Encountered

None — reducer tests went RED → GREEN on first implementation; hook tests went RED → GREEN on first implementation. Full `npm test` run shows 22 pre-existing failures (unchanged from STATE.md baseline) and 734 passing tests (+17 from this plan, up from 717 baseline).

## Self-Check: PASSED

Verified before writing SUMMARY:
- `src/hooks/internal/asyncRunReducer.ts` exists (102 lines, 5 exports)
- `src/hooks/useAsyncRun.ts` exists (149 lines, 4 exports)
- `src/hooks/__tests__/asyncRunReducer.test.ts` exists (9 tests, all green)
- `src/hooks/__tests__/useAsyncRun.test.tsx` exists (8 tests, all green)
- All four task commits present in `git log`: `e23157f`, `5105fd4`, `63ee5fa`, `35ba2bf`
- `npx tsc -b --noEmit` exits 0
- Full suite: 22 failed (pre-existing), 734 passed (+17), 22 todo (unchanged)

## Next Plan Readiness

Plan 24-02 (`useResourceCounts` cache + FOUND-04 cancellation fix) can proceed immediately — it is independent of this plan's output and runs in wave 1 alongside this plan.

Plan 24-04 (migrate 4 async report hooks to `useAsyncRun`) is unblocked: the primitive, its types, and its backward-compatible return shape are all in place. Expected consumer-hook shrinkage per the plan's `<interfaces>` block: each of the 4 hooks drops from 120-200 lines to ~40 lines.

Phase 25 `useSampleWalker` (QDDEP-03) has its orchestration substrate: `useAsyncRun` + `autoStart: true` with memoized deps is the intended drill-down pattern per Pitfall 7's guidance.

---
*Phase: 24-data-fetching-foundation*
*Plan: 01*
*Completed: 2026-04-17*
