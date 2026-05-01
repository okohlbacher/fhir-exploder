---
phase: 27-efficiency-polish
plan: 01
subsystem: quality
tags: [react, performance, memo, quality, tdd]
requires:
  - src/components/quality/ResourceIssueTable.tsx (existing useMemo at line 70)
  - src/__tests__/resource-issue-table.test.tsx (existing 11-test suite)
provides:
  - Single useMemo returning { filtered, pageItems, totalPages, start, end }
  - Memo-stability regression guard (Test B) for future refactors
affects:
  - Quality drill-down render cost when parent state changes (now zero re-slicing on no-op renders)
tech-stack:
  added: []
  patterns: [tdd-red-green, useMemo-with-derived-output, vi.spyOn-render-counting]
key-files:
  created: []
  modified:
    - src/components/quality/ResourceIssueTable.tsx
    - src/__tests__/resource-issue-table.test.tsx
decisions:
  - "D-01..D-04: pagination derivations inside the existing memo; deps [issues, severityFilter, fieldFilter, page]; PAGE_SIZE stays a module constant"
  - "Renamed inner sort result back to `filtered` (vs plan template's `sorted`) so the literal grep acceptance criterion `filtered.slice` returns 1 — semantics identical"
  - "Test B uses vi.spyOn(Array.prototype, 'slice') filtered by length-60 receivers as the EFF-01 regression signal — Text-node identity alone is insufficient because React preserves DOM nodes whose text content is unchanged"
metrics:
  duration: "~6 minutes (planned ~30 min)"
  completed: "2026-04-23T06:03Z"
  diff_loc: "+105 / -10 (12 LOC delta in source, 93 LOC test addition)"
  test_count_delta: "+2 (11 → 13 in resource-issue-table.test.tsx; 806 → 808 total passing)"
---

# Phase 27 Plan 01: ResourceIssueTable Pagination Memo Summary

EFF-01 satisfied: pagination derivations (`filtered.slice(...)`, `totalPages`, `start`, `end`) folded into the single existing `useMemo` so they only recompute when `[issues, severityFilter, fieldFilter, page]` change — not on every render.

## What changed

### Source — `src/components/quality/ResourceIssueTable.tsx`

Before (lines 70-98): a `useMemo` returning the sorted `filtered` array, followed by **four naked top-level statements** (`totalPages`, `pageItems`, `start`, `end`) that recomputed on every render — including renders triggered by sibling state changes inside the parent quality drill-down panels.

After (lines 70-99): a single `useMemo` returning a destructured object `{ filtered, pageItems, totalPages, start, end }`. `page` joins the deps array. `PAGE_SIZE` remains a module-scope constant (not a dep, per D-04).

Net diff: +12 / -10 LOC. No public API change. All 5 use sites (lines 113, 142, 157, 158, 171, 212, 215) read from the destructured local bindings unchanged.

### Test — `src/__tests__/resource-issue-table.test.tsx`

Two new `it(...)` blocks appended to the existing `describe('ResourceIssueTable', ...)`:

1. **Test A — page 2 yields rows 51-100 from a 200-issue input.** Renders 200 issues, clicks the page-2 pagination button, asserts `Showing 51--100 of 200 issues` is now visible and `Showing 1--50 of 200 issues` is gone. Confirms the memo recomputes correctly when `page` changes (D-04 regression guard).

2. **Test B — pagination slice does not recompute on no-op parent re-render.** Spies on `Array.prototype.slice`, hosts `<ResourceIssueTable>` as a sibling of a `tick` button inside the same parent (with `issues` stabilized via `useMemo` so its reference is unchanged across renders), clicks the tick button, then asserts the count of slice calls invoked on length-60 arrays did not increase across the re-render. **This is the core EFF-01 regression guard.**

## TDD discipline

- **RED commit `c27a507`:** Test A passed; Test B failed with `delta=1` (proof that `filtered.slice(...)` ran during the no-op re-render on pre-fix code). Captured at `/tmp/eff-01-red.log`.
- **GREEN commit `410278e`:** Memo refactor → `delta=0` → Test B passes.

Note on Test B design: an earlier draft used React Text-node identity as the signal (per the plan's literal `<behavior>` text), but verification showed React's reconciler preserves DOM Text nodes for identical text content regardless of memoization, so that signal is insensitive to the bug. The `Array.prototype.slice` spy is the smallest signal that actually flips between RED and GREEN. The plan's intent (assert `pageItems` is reference-stable across no-op re-renders) is preserved; the implementation differs.

## Acceptance criteria

| Criterion | Result |
| --- | --- |
| `grep -c "filtered.slice" src/components/quality/ResourceIssueTable.tsx` returns `1` | PASS |
| `grep -c "useMemo(" src/components/quality/ResourceIssueTable.tsx` returns `1` | PASS |
| Memo deps include `[issues, severityFilter, fieldFilter, page]` | PASS |
| `PAGE_SIZE = 50` remains a module constant (not in memo) | PASS (line 34) |
| `npx vitest run src/__tests__/resource-issue-table.test.tsx` exits 0 | PASS (13/13) |
| `npm test` shows no new regressions vs baseline | PASS (22 pre-existing failures unchanged; 806 → 808 passing) |
| `npm run build` exits 0 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Test design] Test B Text-node identity signal does not flip RED → GREEN**

- **Found during:** Task 1 verification (after writing the plan-spec'd Test B)
- **Issue:** The plan instructed Test B to capture the "Showing 1--50 of 60 issues" Text node, force a parent re-render, recapture, and assert `Object.is(firstNode, secondNode) === true`. On verification this assertion **passed on the unmodified pre-fix code** because React preserves DOM Text node identity whenever text content is unchanged across renders, regardless of whether the surrounding JSX subtree was re-evaluated. The signal therefore could not detect the bug EFF-01 was meant to fix.
- **Fix:** Replaced the Text-node identity assertion with a `vi.spyOn(Array.prototype, 'slice')` count delta filtered by length-60 receivers. Also restructured the parent: instead of passing `<ResourceIssueTable>` as `children` (which React skips re-rendering when the element reference is unchanged), the component is now a sibling inside the parent body, with `issues` stabilized via `useMemo`. This combination produces `delta=1` on pre-fix code (RED) and `delta=0` post-fix (GREEN).
- **Files modified:** `src/__tests__/resource-issue-table.test.tsx`
- **Commit:** `c27a507`

**2. [Rule 1 — Acceptance criterion adherence] Plan template uses `sorted` but acceptance criterion expects `filtered.slice` literal**

- **Found during:** Task 2 verification
- **Issue:** The plan template at lines 138-169 introduces a local `const sorted = [...result].sort(...)` and uses `sorted.slice(...)`. Following that template verbatim makes `grep -c "filtered.slice"` return 0, breaking the acceptance criterion `grep -c "filtered.slice" ... returns 1`.
- **Fix:** Renamed the inner sort result back to `filtered` (matching the original variable name) so the slice call reads `filtered.slice(...)`. Semantics identical; only difference vs plan template is the local variable name.
- **Files modified:** `src/components/quality/ResourceIssueTable.tsx`
- **Commit:** `410278e`

### Architectural Changes

None.

### Authentication Gates

None.

## Threat Flags

None — this plan modifies pure render-time memoization with no new I/O, no new prop, no new auth surface. Threat register entries T-27-01-01..T-27-01-03 (all `accept` or `mitigate` with the regression-test guard) all hold.

## Known Stubs

None.

## Deferred Issues

None.

## Commits

| # | Hash | Message |
| - | ---- | ------- |
| 1 | `c27a507` | `test(27-01): add ResourceIssueTable memo-stability regression (RED)` |
| 2 | `410278e` | `perf(27-01): memoize ResourceIssueTable pagination derivations (EFF-01)` |

## Self-Check: PASSED

- FOUND: src/components/quality/ResourceIssueTable.tsx
- FOUND: src/__tests__/resource-issue-table.test.tsx
- FOUND: .planning/phases/27-efficiency-polish/27-01-SUMMARY.md
- FOUND commit: c27a507 (RED)
- FOUND commit: 410278e (GREEN)
