---
phase: 32-eff-r14-qualitymetricscontext-split
plan: 02
subsystem: ui
tags: react, context, facade, refactor, vitest

# Dependency graph
requires:
  - phase: 32-eff-r14-qualitymetricscontext-split
    provides: 7 per-metric context modules + QualityMetricsProviders composer (32-01)
provides:
  - QualityMetricsContext.tsx rewritten as a facade composing the 7 per-metric hooks
  - Legacy QualityMetricsProvider component DELETED (no longer exported)
  - DuplicatesBreakdown + DuplicatesContribution re-exported from facade for API stability
  - QualityLayout.tsx mounts <QualityMetricsProviders> in place of the deleted provider
  - All 8 test wrappers migrated (7 direct-wrap renames + 1 vi.mock retarget)
affects: 32-03 (per-metric consumer migration; QualityOverviewPage remains a bulk consumer of the facade), Phase 33+ (any future quality-metric work)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Facade hook composition: a single hook that calls N per-slot hooks and useMemo()s the unified shape — preserves a pre-split API while allowing per-slot consumers to opt into render isolation"
    - "Type re-export pattern (`export type { X } from './sub-module'`) at the facade keeps consumer imports stable across an internal split (Pitfall 4 guard)"
    - "Two-mock vi.mock pattern: when a unit-under-test imports from module A but other code paths still import from module B (the now-facade), each path needs its own vi.mock"

key-files:
  created: []
  modified:
    - src/quality/QualityMetricsContext.tsx
    - src/components/quality/QualityLayout.tsx
    - src/__tests__/quality-overview.test.tsx
    - src/__tests__/duplicates-panel.test.tsx
    - src/__tests__/completeness-hook.test.tsx
    - src/__tests__/references-panel.test.tsx
    - src/__tests__/plausibility-panel.test.tsx
    - src/__tests__/lab-ranges-panel.test.tsx
    - src/__tests__/coding-coverage-panel.test.tsx
    - src/components/quality/__tests__/quality-layout.test.tsx

key-decisions:
  - "Preserve `data-testid=\"quality-metrics-provider\"` on the renamed quality-layout vi.mock stub — the existing assertions at lines 164/183 of quality-layout.test.tsx pin the wrapper presence in the connected/disconnected trees; dropping the testid (per the plan's literal `<>{children}</>` example) would have broken pre-migration regression coverage with no functional benefit"
  - "Split each test file's combined import into two lines (`QualityMetricsProviders` from `../quality/metrics`, `useQualityMetrics` from `../quality/QualityMetricsContext`) — the facade hook still lives at the original path, so consumers must reach into both surfaces"

patterns-established:
  - "Pattern: Facade-over-context-split — when splitting one mega-context into N per-slot contexts, keep the original module as a composition facade (1 import path, full pre-split shape) so bulk-read consumers (PDF export, capture handlers) survive untouched"
  - "Pattern: Type re-export at the facade boundary — every public type the facade returns must be re-exported from the facade file (`export type { X } from './sub'`), not just used internally — otherwise consumers that destructure typed values lose their type imports across the split"

requirements-completed:
  - EFF-R14-03
  - EFF-R14-06

# Metrics
duration: 5min
completed: 2026-04-24
---

# Phase 32 Plan 02: QualityMetricsContext Facade Rewrite Summary

**QualityMetricsContext.tsx now a 125-LOC facade composing 7 per-metric hooks; 8 test wrappers migrated end-to-end; bulk consumers untouched; full regression 870/0.**

## Performance

- **Duration:** ~5 min (281s)
- **Started:** 2026-04-24T07:18:30Z
- **Completed:** 2026-04-24T07:23:11Z
- **Tasks:** 3 (all Wave-2)
- **Files modified:** 10 (2 source + 8 test files)

## Accomplishments

- **Facade rewrite:** `src/quality/QualityMetricsContext.tsx` shrank from 202 LOC to 125 LOC (~77 LOC of state machinery deleted; ~50 LOC of hook composition added). The legacy `QualityMetricsProvider` component is GONE — `useQualityMetrics()` is now pure composition over the 7 per-metric `use<Metric>Rollup()` hooks, returning the pre-split `QualityMetricsContextValue` byte-for-byte.
- **Type re-exports preserved:** `DuplicatesBreakdown` and `DuplicatesContribution` are re-exported from the facade (Pitfall 4 guard) — consumers that import these types via the old path keep working.
- **Single mount swap:** `QualityLayout.tsx` mounts `<QualityMetricsProviders>` (the 7-provider composer at `src/quality/metrics/index.tsx`) in place of the deleted `<QualityMetricsProvider>`.
- **All 8 test wrappers migrated:**
  - 7 direct-wrap test files (`quality-overview`, `duplicates-panel`, `completeness-hook`, `references-panel`, `plausibility-panel`, `lab-ranges-panel`, `coding-coverage-panel`) renamed at the import + every JSX usage. Imports split: `QualityMetricsProviders` from `../quality/metrics`, `useQualityMetrics` from the facade path.
  - 1 vi.mock site (`quality-layout.test.tsx`) split into two mocks: one stubbing `../../../quality/metrics` for the new composer path, one preserving `useQualityMetrics` on the facade path.
- **Bulk consumers untouched:** `git diff HEAD -- src/components/quality/QualityOverviewPage.tsx src/components/quality/PdfReportLayout.tsx` returns empty — the capture handler + PDF export still call `useQualityMetrics()`, now resolved through the facade.
- **Full regression:** 870 passing / 0 failing / 22 todo / 3 skipped. `npx tsc -b --noEmit` exits 0.

## Task Commits

Each task was committed atomically (parallel-executor: --no-verify on every commit):

1. **Task 1: Rewrite QualityMetricsContext.tsx as facade + swap QualityLayout.tsx mount** — `7c0dc3b` (refactor)
2. **Task 2: Rename QualityMetricsProvider -> QualityMetricsProviders across 7 direct-wrap test files** — `f7ae8dd` (refactor)
3. **Task 3: Retarget quality-layout.test.tsx vi.mock + rename stubbed identifier + full regression** — `6b8dbc4` (refactor)

## Files Created/Modified

- `src/quality/QualityMetricsContext.tsx` — Rewritten as a facade. JSDoc preserved (with new Phase 32 paragraph), `QualityMetricsContextValue` interface ported byte-for-byte, `useQualityMetrics()` composes 7 hooks via `useMemo`. Legacy provider, `createContext`, `EMPTY_DUPLICATES_BREAKDOWN`, `deriveOverallDuplicates`, and the duplicate type definitions are gone (re-exported from `./metrics/DuplicatesContext`).
- `src/components/quality/QualityLayout.tsx` — One-line import swap (`QualityMetricsProvider` from `../../quality/QualityMetricsContext` -> `QualityMetricsProviders` from `../../quality/metrics`) + JSX tag rename (open/close).
- `src/__tests__/quality-overview.test.tsx` — Import split + 5 JSX wrap-site renames.
- `src/__tests__/duplicates-panel.test.tsx` — Import split + 1 JSX wrap-site rename.
- `src/__tests__/completeness-hook.test.tsx` — Import split + 4 JSX wrap-site renames.
- `src/__tests__/references-panel.test.tsx` — Import split + 1 JSX wrap-site rename.
- `src/__tests__/plausibility-panel.test.tsx` — Import split + 1 JSX wrap-site rename.
- `src/__tests__/lab-ranges-panel.test.tsx` — Import split + 1 JSX wrap-site rename + comment update.
- `src/__tests__/coding-coverage-panel.test.tsx` — Import split + 1 JSX wrap-site rename + comment update.
- `src/components/quality/__tests__/quality-layout.test.tsx` — Single `vi.mock` split into two; stub identifier renamed to `QualityMetricsProviders`; comments at lines 11, 163, 182 updated. The `data-testid="quality-metrics-provider"` is preserved on the stub so existing assertions at lines 164 + 183 still pin wrapper presence.

## Decisions Made

- **Preserve the testid on the quality-layout vi.mock stub.** The plan's example used `<>{children}</>` for the stub, which would have broken `screen.getByTestId('quality-metrics-provider')` at lines 164 and 183 of `quality-layout.test.tsx` (the 4 test cases that pin connected/disconnected wrapper presence). The plan's intent is "pass-through stub"; preserving the testid is consistent with that intent and keeps the regression coverage intact. Documented as a Rule 1 (auto-fix) deviation below.
- **Split combined imports into two lines.** Each of the 6 test files that imported both `QualityMetricsProvider` AND `useQualityMetrics` from the original module had its import split: `QualityMetricsProviders` now imported from `../quality/metrics`, `useQualityMetrics` still imported from `../quality/QualityMetricsContext` (the facade). The plan's literal-rewrite shorthand glossed over this, but tsc would have failed otherwise — `useQualityMetrics` is not exported from `./metrics`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved `data-testid="quality-metrics-provider"` on quality-layout vi.mock stub**

- **Found during:** Task 3 (vi.mock retarget)
- **Issue:** Plan text supplied `QualityMetricsProviders: ({ children }) => <>{children}</>` for the new mock stub. But the existing test cases at `quality-layout.test.tsx:164` (`expect(screen.getByTestId('quality-metrics-provider')).toBeTruthy()`) and `:183` (`expect(screen.queryByTestId('quality-metrics-provider')).toBeNull()`) require the stub to render that testid. Following the plan literally would have broken 2 of the 4 tests in that file.
- **Fix:** Renamed the stub identifier `QualityMetricsProvider -> QualityMetricsProviders` (per plan) but kept the wrapping `<div data-testid="quality-metrics-provider">` (preserving regression coverage).
- **Files modified:** `src/components/quality/__tests__/quality-layout.test.tsx`
- **Verification:** `npx vitest run src/components/quality/__tests__/quality-layout.test.tsx` passes 4/4 tests. Full `npm test` passes 870/0.
- **Committed in:** `6b8dbc4` (Task 3 commit)

**2. [Rule 3 - Blocking] Split combined imports in 6 test files into two lines**

- **Found during:** Task 2 (rename across test files)
- **Issue:** 6 of the 7 direct-wrap test files imported `QualityMetricsProvider` AND `useQualityMetrics` from the same module. The plan's literal rewrite (`import { QualityMetricsProviders } from '../quality/metrics'`) would have stranded `useQualityMetrics` — it isn't exported from `./metrics`, only from the facade at `./QualityMetricsContext`. tsc would have failed with TS2305.
- **Fix:** Each combined import split into two lines: `import { QualityMetricsProviders } from '../quality/metrics';` + `import { useQualityMetrics } from '../quality/QualityMetricsContext';`. Both names referenced in test bodies remain valid.
- **Files modified:** `src/__tests__/duplicates-panel.test.tsx`, `references-panel.test.tsx`, `plausibility-panel.test.tsx`, `lab-ranges-panel.test.tsx`, `coding-coverage-panel.test.tsx`, `completeness-hook.test.tsx`, `quality-overview.test.tsx`
- **Verification:** `npx vitest run` over all 7 files: 56/56 tests pass. `npx tsc -b --noEmit` exits 0.
- **Committed in:** `f7ae8dd` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug-prevention by preserving testid, 1 blocking-fix by splitting imports)
**Impact on plan:** Both deviations are mechanical adjustments to the plan's literal text; the plan's INTENT (preserve regression coverage; rename only what needs renaming; let `useQualityMetrics` continue to live at the facade) was honored exactly. No scope creep.

## Issues Encountered

- The pre-existing `terminology-context.test.tsx` negative test (`useTerminology throws outside provider`) emits an expected `Error: useTerminology must be used within a TerminologyProvider` console line during `npm test`. This is not a failure (it's the test asserting that the throw happens); it predates this plan and is out of scope. The summary line still reads `870 passed | 22 todo | 3 skipped (892)` with zero failures.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 32-03 (per-metric consumer migration) is unblocked.** All 7 per-metric provider/hook pairs are mounted; `useQualityMetrics()` is now a facade. The 7 producer sites + 7 tile/tab consumers in the source can now migrate to `use<Metric>Rollup()` for render isolation without touching the facade or the bulk consumers.
- **Bulk consumers (`QualityOverviewPage` capture + PDF export handlers) stay on the facade.** This is the by-design contract — they read all 7 rollups at once for snapshot capture, and re-rendering on any metric change is the correct behavior.
- **No new threats introduced.** Plan 01's `providers-smoke.test.tsx` continues to pass through this plan's facade swap, confirming T-32-01 (shared-context-symbol regression) is mitigated. T-32-02 (DoS via missing useMemo) mitigated: facade uses `useMemo`, all 7 underlying providers use `useMemo`. T-32-03 (facade unstable reference) is documented in the JSDoc on `useQualityMetrics()` and re-asserted by `quality-overview.test.tsx`'s ContextFillerHarness.

## Self-Check: PASSED

Verified post-creation:

- [x] `src/quality/QualityMetricsContext.tsx` exists and contains `export function useQualityMetrics` (1 match), zero matches for `export function QualityMetricsProvider`, zero matches for `useState\|useCallback\|createContext`, 14 matches for the 7 hook names (composition imports).
- [x] `src/components/quality/QualityLayout.tsx` exists with 3 matches for `QualityMetricsProviders` and zero matches for the legacy singular form.
- [x] All 8 migrated test files exist and verified by `grep` (zero legacy matches each).
- [x] Commits exist (verified via `git log --oneline -5`):
  - `7c0dc3b` (Task 1: facade rewrite)
  - `f7ae8dd` (Task 2: 7 test renames)
  - `6b8dbc4` (Task 3: vi.mock retarget)
- [x] `npm test` exits 0 with 870 passing / 0 failing.
- [x] `npx tsc -b --noEmit` exits 0.
- [x] Bulk consumer untouched: `git diff HEAD -- src/components/quality/QualityOverviewPage.tsx` returns empty.
- [x] Project-wide legacy-name scan: `grep -rn "QualityMetricsProvider[^s]" src/` returns zero hits.

---
*Phase: 32-eff-r14-qualitymetricscontext-split*
*Completed: 2026-04-24*
