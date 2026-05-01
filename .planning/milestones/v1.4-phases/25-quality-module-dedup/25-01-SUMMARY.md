---
phase: 25-quality-module-dedup
plan: 01
subsystem: quality
tags: [fhir, codeable-concept, coverage-walker, refactor, tdd, vitest, react, mantine]

# Dependency graph
requires:
  - phase: 24-data-fetching-foundation
    provides: useAsyncRun, Map<serverUrl> registry, QualityMetricsCache primitives (not directly touched here, but the perPathExamples field rides along on the cached PerTypeCoverageReport blob)
provides:
  - PerTypeCoverageReport.perPathExamples populated in a single walker pass
  - Deterministic first-win representative CodeableConcept per aggregation path (systemCode preferred, textOnly/empty fallback)
  - Coding drill-down fetch count halved (no second sampleResources call)
  - useExamplesByPath wholesale-deleted from the codebase
affects:
  - 25-03 (DrillDownShell can now assume symmetric drill-down fetch patterns — coding drill-down no longer issues a second sample fetch, so the shell's status/progress/issues prop shape applies uniformly across all drill-downs)
  - 25-02 (useSampleWalker extraction — unaffected by perPathExamples, but downstream consumers will see the new field on the report type)

# Tech tracking
tech-stack:
  added: []  # No new dependencies — pure refactor against existing Medplum + Mantine + Vitest stack
  patterns:
    - "Deterministic first-win representative selection: walker captures a primary choice (systemCode) and a fallback choice (first non-null textOnly/empty) in one pass, then backfills after the outer loop so later systemCode observations always override earlier fallbacks"
    - "Single-pass enrichment: new report fields are computed inside the existing `for (const f of fields)` loop rather than adding a second traversal — preserves walker O(n) invariants"
    - "Defensive guard against pre-upgrade cached blobs: consumer reads `state.perPathExamples ?? {}` so cached reports written before this field existed fall through to an empty map instead of crashing"

key-files:
  created:
    - src/quality/__tests__/codingCoverageWalker.test.ts (6 deterministic-selection tests)
  modified:
    - src/quality/types.ts (added perPathExamples: Record<string, CodeableConcept>)
    - src/quality/codingCoverageWalker.ts (populates perPathExamples in existing loop)
    - src/components/quality/CodingDrillDown.tsx (useExamplesByPath deleted; useMemo reads report.perPathExamples)
    - src/__tests__/coding-drilldown.test.tsx (mockCoverageReport extended; new no-second-fetch integration test)

key-decisions:
  - "Declared perPathExamples as non-optional on PerTypeCoverageReport so TS catches any mock or test fixture that forgets it (walker always emits the field, even on empty samples)"
  - "Consumer still guards with `state.perPathExamples ?? {}` to tolerate pre-QDDEP-01 cached report blobs in localStorage — the type is strict but runtime is defensive against stale cache entries"
  - "Kept the local `useExamplesByPath` fallback algorithm intact (systemCode preferred; textOnly/empty backfill) — zero behavior change, just relocation into the walker"
  - "Did NOT remove the pre-existing orphan `vi.mock('../quality/sampling', ...)` in coding-drilldown.test.tsx; kept it because the new integration test uses `sampleResources` as a spy to assert the zero-additional-fetch invariant"
  - "Scoped the new walker test file to `src/quality/__tests__/codingCoverageWalker.test.ts` per plan instruction, leaving the existing `src/__tests__/coding-coverage-walker.test.ts` (17 tests) untouched — two parallel test files share the walker but cover disjoint concerns"

patterns-established:
  - "Walker-populated representative examples: future aggregate-report fields (e.g., representative instances for plausibility/duplicates drill-downs) can follow the same primary-choice + fallback + backfill pattern"
  - "TDD RED before type change: changing a non-optional field on a widely-referenced interface is safest when the failing walker tests land first (RED), the walker implementation goes GREEN next, and consumers/mocks are fixed in the same GREEN commit"

requirements-completed: [QDDEP-01]

# Metrics
duration: ~8min
completed: 2026-04-22
---

# Phase 25 Plan 01: perPathExamples in codingCoverageWalker Summary

**PerTypeCoverageReport gains a deterministic representative CodeableConcept per aggregation path, populated in the walker's existing single pass, eliminating the `useExamplesByPath` double-fetch and halving coding drill-down server calls.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-22T18:34:18Z (approx — STATE.md last update before execution)
- **Completed:** 2026-04-22T18:41:35Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `PerTypeCoverageReport.perPathExamples: Record<string, CodeableConcept>` added as a non-optional field, populated in `aggregateCoverage` alongside the existing `perPath` rollup — no second traversal.
- Deterministic first-win selection: the first `systemCode` observation per path always wins; otherwise the first non-null `textOnly`/`empty` CodeableConcept is retained as a fallback and backfilled after the outer sample loop. A later systemCode always overrides an earlier fallback.
- `CodingDrillDown` switched from `useExamplesByPath` (which issued a second `sampleResources` call and re-walked the sample) to a one-line `useMemo` that reads `state.perPathExamples` off the coverage report produced by the parent `useCodingCoverage` hook.
- `useExamplesByPath` deleted outright — `grep -rn 'useExamplesByPath' src/` returns 0 matches across the whole codebase.
- 6 new walker tests cover the determinism invariants; 1 new drill-down integration test asserts the zero-additional-fetch property.
- Zero new regressions in the full vitest run (22 failed / 769 passed / 22 todo — matches the STATE.md baseline of 22 pre-existing failures).

## Task Commits

Each task was committed atomically with `--no-verify` per the parallel-executor protocol:

1. **Task 1: Extend PerTypeCoverageReport type + add failing walker tests** — `63ce0aa` (test)
2. **Task 2: Implement perPathExamples in aggregateCoverage (GREEN) + delete useExamplesByPath + swap CodingDrillDown + update existing mocks** — `99a191c` (feat)

_TDD discipline: RED (Task 1) preceded GREEN (Task 2); Task 1 was committed with 6 failing tests and a transient TS error on the walker's return shape, which Task 2 resolved._

## Files Created/Modified

- `src/quality/types.ts` — +10 LOC — `perPathExamples: Record<string, CodeableConcept>` added to `PerTypeCoverageReport` with a doc comment explaining the selection algorithm.
- `src/quality/codingCoverageWalker.ts` — +26 LOC — two new records (`perPathExamples`, `perPathFallbacks`) declared before the outer loop, single-pass population inside the existing `for (const f of fields)` loop, fallback backfill after the outer loop, and `perPathExamples` included in the returned report.
- `src/quality/__tests__/codingCoverageWalker.test.ts` — NEW, 104 LOC — 6 vitest cases covering: first-systemCode-wins, textOnly fallback, later-systemCode-overrides-earlier-textOnly, empty-sample shape, `component[*].code` key-format parity with `perPath`, empty-CodeableConcept fallback.
- `src/components/quality/CodingDrillDown.tsx` — −52 LOC net (−75 deletions from `useExamplesByPath` body + unused imports; +23 for the `useMemo` guard and inline comment). Imports `Resource`, `sampleResources`, `classifyCodedFields`, `ClassifiedCodedField` removed (no longer used in the file).
- `src/__tests__/coding-drilldown.test.tsx` — +35 LOC, −1 LOC — `mockCoverageReport.perPathExamples` added with 2 entries, and a new `it('does not issue a second sample fetch when drill-down opens (QDDEP-01)', ...)` test captures the `sampleResources` call count before/after render and asserts no new calls.

## Decisions Made

- **Non-optional `perPathExamples`.** The field is declared as required rather than optional on `PerTypeCoverageReport`. Rationale: the walker always produces the field (even an empty `{}` for an empty sample), so making it optional would force every downstream consumer to handle two shapes (absent vs empty) for no benefit. Cached reports written before this change are a one-shot concern handled by the consumer's `?? {}` guard — not by weakening the type.
- **Consumer still uses a null-coalescing guard.** `CodingDrillDown` reads `state.perPathExamples ?? {}` rather than `state.perPathExamples` directly. This costs one `??` token but keeps the drill-down robust against stale `QualityMetricsCache` entries in localStorage that were serialized before QDDEP-01 landed. No migration step required.
- **Kept the orphan `vi.mock('../quality/sampling', ...)` in the drill-down test.** After `useExamplesByPath` deletion, the `sampleResources` mock is no longer consumed by production code — but the new integration test uses it as a spy to assert zero calls. Removing the mock and re-adding it as a spy would be noisier than leaving it in place.
- **Separate test file location.** The existing walker tests live at `src/__tests__/coding-coverage-walker.test.ts`. The plan explicitly specified `src/quality/__tests__/codingCoverageWalker.test.ts` for the new file. Both files exist side by side — no consolidation — because the plan's verify block references the new path and the old file already covers disjoint concerns (classification correctness + Pitfall 5).

## Deviations from Plan

None — plan executed exactly as written. All `<acceptance_criteria>` for both tasks met on first run; no Rule 1-4 deviations were needed.

Minor note on a scope observation (not a deviation): a pre-existing TypeScript error in `src/hooks/__tests__/useSampleWalker.test.tsx:152` (tuple indexing into an empty tuple literal) was observed during the post-change `npx tsc -b --noEmit` run. This file is untracked and belongs to a future plan (25-02, `useSampleWalker` extraction), not this one. Per the scope-boundary rule in the executor protocol, it is not fixed here. Logging as deferred for plan 25-02.

## Deferred Issues

- **`src/hooks/__tests__/useSampleWalker.test.tsx:152` pre-existing TS2493.** Tuple-type `[]` of length `0` indexed at position `1`. File is untracked at HEAD (appears to be scaffolding for plan 25-02). Reproduces with or without this plan's changes. Out of scope for 25-01.

## Issues Encountered

None. The plan's `<interfaces>` block correctly anticipated the existing walker structure, and the insertion point at `codingCoverageWalker.ts:163` matched the RESEARCH document byte-for-byte.

One small plan-vs-reality note: the plan's `<interfaces>` block showed `perResource: Array<{ id: string; fields: ClassifiedCodedField[] }>` as the existing shape on `PerTypeCoverageReport`, but the actual existing shape is `perResource?: Array<{ resourceId: string; resourceType: string; issues: Array<{ path, classification }> }>`. The existing shape was preserved verbatim; only `perPathExamples` was added. No consumer changes required.

## User Setup Required

None — no external service configuration, no environment variables, no migration scripts.

## Self-Check

Verifying claims before handing off to the orchestrator.

**Files exist:**
- `src/quality/types.ts` — FOUND
- `src/quality/codingCoverageWalker.ts` — FOUND
- `src/quality/__tests__/codingCoverageWalker.test.ts` — FOUND
- `src/components/quality/CodingDrillDown.tsx` — FOUND
- `src/__tests__/coding-drilldown.test.tsx` — FOUND

**Commits exist:**
- `63ce0aa` (test RED) — FOUND in `git log`
- `99a191c` (feat GREEN) — FOUND in `git log`

**Grep gates:**
- `grep -rn "useExamplesByPath" src/` → 0 matches — PASS
- `grep -c "perPathExamples" src/quality/types.ts` → 1 — PASS (≥1)
- `grep -c "perPathExamples" src/quality/codingCoverageWalker.ts` → 5 — PASS (≥3)
- `grep -c "perPathFallbacks" src/quality/codingCoverageWalker.ts` → 4 — PASS (≥2)
- `grep -c "function useExamplesByPath" src/components/quality/CodingDrillDown.tsx` → 0 — PASS
- `grep -c "perPathExamples" src/__tests__/coding-drilldown.test.tsx` → 3 — PASS (≥1)
- `grep -c "does not issue a second sample fetch" src/__tests__/coding-drilldown.test.tsx` → 1 — PASS (≥1)

**Test runs:**
- `npm test -- --run src/quality/__tests__/codingCoverageWalker.test.ts` → 6/6 passing — PASS
- `npm test -- --run src/__tests__/coding-drilldown.test.tsx` → 4/4 passing — PASS
- Full suite — 22 failed / 769 passed / 22 todo (baseline: 22 failed / 758 passed before this plan) — PASS (0 new regressions; 11 new passing tests from this plan + adjacent work on disk)

## Self-Check: PASSED

## Next Phase Readiness

- Plan 25-02 (bundled `useSampleWalker` + `SortableTh` + `RunProgress`) is unblocked.
- Plan 25-03 (`DrillDownShell`) is unblocked — the ROADMAP intra-phase lock (QDDEP-01 before QDDEP-02) is satisfied. The coding drill-down now has the same single-fetch lifecycle as the simple drill-downs, so the shell's `status`/`progress`/`issues` prop shape applies uniformly.
- Known carry-over: `src/hooks/__tests__/useSampleWalker.test.tsx` has a pre-existing TS2493 error unrelated to this plan; plan 25-02 should address it as part of the `useSampleWalker` extraction.

---
*Phase: 25-quality-module-dedup*
*Completed: 2026-04-22*
