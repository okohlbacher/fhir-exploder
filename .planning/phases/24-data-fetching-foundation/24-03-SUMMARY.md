---
phase: 24-data-fetching-foundation
plan: 03
subsystem: data-fetching
tags: [react-hooks, lru-cache, registry, settings-invalidation, vitest, fhir]

# Dependency graph
requires:
  - phase: 24-data-fetching-foundation
    provides: "Plan 24-02 — clearQualityCountCache + clearAllQualityCountCache exports from useResourceCounts"
provides:
  - "Per-serverUrl QualityMetricsCache registry — getQualityMetricsCache(serverUrl) with 2-entry LRU"
  - "clearQualityMetricsCache(serverUrl) — per-server registry + cache wipe"
  - "clearAllQualityMetrics extended to drop registry entries (not just localStorage)"
  - "SettingsContext.setSettings direct-call invalidation per D-04 / D-05"
  - "SettingsPage 'Clear metrics cache' button now wipes both caches under one toast"
affects:
  - "24-04 (4 report hook migrations) — registry pattern is the template"
  - "25 (useSampleWalker) — same Map<serverUrl> approach for sample state"
  - "26 SHELL-05 (deferred) — will wrap setSettings in useCallback"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-private Map<serverUrl, T> registry with MRU touch on get (delete + reinsert)"
    - "LRU eviction via Map.keys().next().value when size > LRU_LIMIT"
    - "Cross-cache invalidation at settings save time — direct call, not useEffect watcher"
    - "Single button → multi-cache wipe with shared toast copy"

key-files:
  created:
    - src/quality/__tests__/metricsCache.test.ts
  modified:
    - src/quality/metricsCache.ts
    - src/hooks/useCompletenessReport.ts
    - src/hooks/useCodingCoverage.ts
    - src/contexts/SettingsContext.tsx
    - src/components/settings/SettingsPage.tsx
    - src/__tests__/settings-clear-cache.test.tsx

key-decisions:
  - "Registry stays module-private (cachesByServer never exported) — consumers always go through getQualityMetricsCache"
  - "LRU_LIMIT = 2 chosen from CONTEXT.md / D-06 — typical user A/B-toggles between dev/prod, larger bound has no observed benefit"
  - "MRU touch implemented as delete + reinsert (Map insertion-order semantics) so the touched entry is never the eviction target"
  - "QualityMetricsCache class body intentionally untouched — only the surrounding registry is new"
  - "SettingsPage.handleClearMetricsCache calls clearAllQualityCountCache BEFORE clearAllQualityMetrics — order is irrelevant for correctness but matches the order in which the caches were populated, keeping the diff cognitively cheap"
  - "settings-clear-cache.test.tsx beforeEach now wipes 3 cache types (terminology localStorage, metrics registry, count cache) so co-located tests do not leak state — checker W-24-03-03 satisfied"
  - "FOUND-02 test uses vi.spyOn(ResourceCountsModule, 'clearAllQualityCountCache') to prove SettingsPage actually invokes the count-cache wipe (registry assertion alone proves only the metrics path)"
  - "Mantine Notifications portal is global across renderHook tests; use getAllByText, not getByText, to avoid collisions with prior-test toast residue"

patterns-established:
  - "Per-key registry of cache instances: declare module-private Map at top of cache module, expose get(key) factory + clear(key) + clear-all helpers, never export the Map itself"
  - "MRU touch on get: use Map insertion-order semantics — delete + reinsert returns the same instance while moving it to the tail"
  - "Cross-test isolation for module-scope caches: extend the existing beforeEach with all relevant clear-all helpers; never add a second beforeEach"

requirements-completed: [FOUND-02]

# Metrics
duration: 9m08s
completed: 2026-04-17
---

# Phase 24 Plan 03: QualityMetricsCache Registry + Settings-Save Cache Invalidation Summary

**Per-serverUrl `Map<serverUrl, QualityMetricsCache>` registry with 2-entry LRU + MRU touch replaces the rotating singleton in `useCompletenessReport` / `useCodingCoverage`; `SettingsContext.setSettings` and the Settings "Clear metrics cache" button now invalidate BOTH the metrics registry AND the count cache under a single user action.**

## Performance

- **Duration:** ~9 min 8 sec
- **Started:** 2026-04-17T12:20:41Z
- **Completed:** 2026-04-17T12:29:49Z
- **Tasks:** 3 (all TDD-flagged)
- **Files created:** 1
- **Files modified:** 6

## Accomplishments

- **FOUND-02 delivered**: A/B server toggle now stays cache-warm. Switching from server A to B and back to A no longer re-samples — the registry preserves the last 2 distinct serverUrls (LRU-bounded so a parade of 50 distinct URLs cannot grow memory unboundedly).
- **D-04 / D-05 wired**: every save in `SettingsContext.setSettings` direct-calls both cache wipes for the prior serverUrl AND for the new serverUrl (when changed) — covers auth rotation, sampleSize change, and serverUrl swap with a single code path.
- **D-03 wired**: the existing "Clear metrics cache" Settings button now wipes BOTH `clearAllQualityMetrics()` and `clearAllQualityCountCache()` under the existing toast copy. Button label and message are byte-identical to pre-Phase-24.
- **Registry safety extended**: `clearAllQualityMetrics()` now drops every registry entry as its first action, so the cross-server localStorage iteration and the in-memory references are wiped together. Prevents a stale registry instance from re-hydrating from a wiped localStorage namespace.
- **2 hook files shrunk**: `useCompletenessReport` and `useCodingCoverage` each lost their local `cacheInstance` / `cacheServerUrl` / `getCache` helpers (~13 lines each) and the "Known limitation: switching server URLs discards cache" header comment. Public hook signatures and return shapes are unchanged.
- **Consumer test contract preserved**: 20 / 20 existing tests in `completeness-hook.test.tsx` + `coding-coverage-panel.test.tsx` pass with zero modification — proves the migration is invisible to downstream panels.

## Task Commits

Each task committed atomically (TDD RED/GREEN split where RED was a separate commit; --no-verify per parallel-executor protocol):

1. **Task 1 RED — failing registry tests** — `3393ebc` (test)
2. **Task 1 GREEN — registry implementation** — `15efad7` (feat)
3. **Task 2 — migrate both hooks** — `a408093` (refactor) — RED phase here was "existing 20 consumer tests must continue passing without modification"; the migration committed once the consumer suite re-greened.
4. **Task 3 — wire settings + extend test file** — `a04eca9` (feat) — RED phase was "FOUND-02 test fails because handleClearMetricsCache does not yet call clearAllQualityCountCache" (verified locally), GREEN bundled with implementation.

## Files Created/Modified

### Created

- `src/quality/__tests__/metricsCache.test.ts` (128 lines, 7 tests). Covers: instance reuse, 2-entry LRU eviction, MRU touch on get, per-server clear (registry + localStorage namespace), cross-server `clearAllQualityMetrics` registry drop, and `beforeEach` isolation per W-24-03-03.

### Modified

- `src/quality/metricsCache.ts` (+60 lines). Adds module-private `LRU_LIMIT = 2` and `cachesByServer = new Map`, plus exports `getQualityMetricsCache(serverUrl)` (MRU-touch-on-get + LRU eviction) and `clearQualityMetricsCache(serverUrl)` (cache.clear() + registry delete). Extends existing `clearAllQualityMetrics()` to call `cachesByServer.clear()` as its first line. Class body untouched.
- `src/hooks/useCompletenessReport.ts` (-16 lines). Drops local `cacheInstance` / `cacheServerUrl` / `getCache(serverUrl)` helpers; replaces `import { QualityMetricsCache }` with `import { getQualityMetricsCache }`; replaces `getCache(serverUrl)` call with `getQualityMetricsCache(serverUrl)`. Header JSDoc updated to cite Plan 24-03 registry; "Known limitation" paragraph removed.
- `src/hooks/useCodingCoverage.ts` (-13 lines). Same refactor as `useCompletenessReport`; header JSDoc updated to point at the shared registry rather than the per-hook singleton.
- `src/contexts/SettingsContext.tsx` (+16 lines). Adds imports for `clearQualityCountCache` and `clearQualityMetricsCache`; `setSettings` body now reads `prevUrl = settings?.fhir?.serverUrl` and `nextUrl = next.fhir?.serverUrl`, wipes both caches for prevUrl, and additionally wipes both caches for nextUrl when it differs. The existing `useMemo([settings, usingDefaults, loading])` deps array and its `eslint-disable-next-line` are intentionally untouched — Phase 26 SHELL-05 will wrap `setSettings` in `useCallback`.
- `src/components/settings/SettingsPage.tsx` (+2 lines). Adds `import { clearAllQualityCountCache } from '../../hooks/useResourceCounts'`; prepends `clearAllQualityCountCache();` to `handleClearMetricsCache`. Toast copy and button label unchanged.
- `src/__tests__/settings-clear-cache.test.tsx` (+54 lines). Adds imports for `getQualityMetricsCache`, `clearAllQualityMetrics`, and `clearAllQualityCountCache` (via namespace import to enable spying). Extends the existing single `beforeEach` (file line ~83) with `clearAllQualityMetrics()` + `clearAllQualityCountCache()`. Adds new top-level `describe('SettingsPage — Clear metrics cache (FOUND-02)')` with one test that pre-populates the metrics registry, spies on `clearAllQualityCountCache`, fires the button, asserts the spy was called, asserts the registry returned a fresh empty instance, and asserts the existing toast still appears (`getAllByText` to tolerate prior-test toast residue in the global Mantine portal).

## Decisions Made

All locked decisions from Phase 24 CONTEXT.md were followed verbatim:

- **D-03** honored: "Clear metrics cache" button wipes both caches under the existing toast copy (no new toast, no message change).
- **D-04** honored: `setSettings` direct-call cache invalidation. NOT a `useEffect` watching settings identity.
- **D-05** honored: any settings save (including sampleSize-only) wipes the current server's caches. The new-URL extra wipe is defensive but cheap.
- **D-06** honored: registry signature `(serverUrl: string) => QualityMetricsCache`, MRU touch on get, evict-oldest via `Map.keys().next().value`, LRU bound = 2.

One implementation note: the FOUND-02 test required `vi.spyOn` on the count-cache wipe rather than a registry-state assertion alone. Without the spy, an erroneous future implementation could pass the test by clearing only the metrics cache. Using `import * as ResourceCountsModule` enables `vi.spyOn(ResourceCountsModule, 'clearAllQualityCountCache')` cleanly.

A second note: a prior version of the FOUND-02 test used `getByText(/Cache cleared/)` and failed because Mantine Notifications accumulate in the global portal across tests in the same file (other tests' green toasts persisted). Switched to `getAllByText(...).length > 0` per the testing-library escape hatch — same intent, tolerant of cross-test portal residue.

## Deviations from Plan

None functionally — plan executed exactly as written.

Two minor planning quirks worth noting (no code impact):

1. The plan's `<acceptance_criteria>` regex `grep -c "^    it(" src/__tests__/settings-clear-cache.test.tsx ≥ 3` expected 4-space indentation, but the existing file uses 2-space-indented `it()` calls. Actual count of `it(` invocations in the file is 3, satisfying the spirit of the criterion. No code change made.
2. The plan's `grep -c "beforeEach" === 1` matches 2 in the file because the import line `import { ..., beforeEach } from 'vitest'` also contains the literal `beforeEach`. Actual count of `beforeEach(` hook declarations is 1, satisfying the criterion's intent (one and only one hook).

The plan's `<acceptance_criteria>` line `grep -c "clearAllQualityMetrics" src/components/settings/SettingsPage.tsx === 2` is satisfied (1 import + 1 call site = 2 occurrences).

## Issues Encountered

**1. FOUND-02 test toast assertion collided with prior-test residue**
- The Mantine Notifications portal persists across tests in the same file because it lives outside React's per-render unmount cycle. `getByText(/Cache cleared/)` matched 3 toasts (one per test that fired the button), causing the assertion to throw `Found multiple elements`.
- Fix: switched to `getAllByText(/Cache cleared/).length > 0` — accurate to intent (this test's click produced at least one toast), tolerant of portal residue.

**2. Cache key prefix mismatch in initial RED test**
- The first RED-test version called `cache.set('k1', ...)` which writes the key `${LOCAL_STORAGE_PREFIX}k1` to localStorage. But `cache.clear()` only scans for `${LOCAL_STORAGE_PREFIX}${serverUrl}|...` — so `k1` was outside the namespace, the localStorage assertion `preCount > 0` failed.
- Fix: changed test cache keys to the `${URL_A}|completeness|Patient|100` form that downstream code (via `buildMetricsKey`) actually produces. The test now exercises the realistic key shape.

Neither of these are bugs in the implementation — both were test-fixture issues caught by GREEN runs and corrected before commit. No production code changed in response.

## Known Stubs

None — all wiring is real and exercised by tests.

## Threat Flags

None new.

The plan's `<threat_model>` register identified four threats; all four are mitigated as planned. No new attack surface introduced (the registry is module-private, the cache invalidation tightens correctness, and `clearAllQualityCountCache` is an in-memory Map clear with no I/O).

## User Setup Required

None — pure internal refactor with zero user-visible UI change. The "Clear metrics cache" button label and toast text are byte-identical to pre-Phase-24.

## Next Plan Readiness

- **Plan 24-04 unblocked**: the registry is the template for the four report hook migrations (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`). Each can replace its local cache instance with `getQualityMetricsCache(serverUrl)` in a one-line swap.
- **Phase 25 useSampleWalker** has its caching template: declare a module-private `Map<key, T>`, expose `get(key)` factory + scoped + global clear functions, and document MRU-touch semantics if eviction matters.
- **Phase 26 SHELL-05** still owes the `useCallback` wrap around `setSettings` — Plan 24-03 intentionally left the existing `useMemo` deps array + `eslint-disable-next-line` untouched per the plan's constraint section.

## Verification Summary

| Acceptance Criterion | Result |
|---|---|
| `LRU_LIMIT = 2` declared in metricsCache.ts | 1 occurrence ✓ |
| `cachesByServer = new Map` declared | 1 occurrence ✓ |
| `getQualityMetricsCache` exported | 1 occurrence ✓ |
| `clearQualityMetricsCache` exported | 1 occurrence ✓ |
| `cachesByServer.clear()` inside `clearAllQualityMetrics` | 1 occurrence ✓ |
| Eviction logic uses `cachesByServer.keys().next().value` | 1 occurrence ✓ |
| `class QualityMetricsCache` definition unchanged | 1 occurrence ✓ |
| `cacheInstance` / `cacheServerUrl` / `function getCache` removed from both hooks | 0 + 0 + 0 in each file ✓ |
| `getQualityMetricsCache` import + call in both hooks | 3 occurrences each ✓ |
| `SettingsContext.setSettings` calls both clear functions for prev + new URL | 3 occurrences of each clear name ✓ |
| `SettingsPage.handleClearMetricsCache` calls `clearAllQualityCountCache` | 2 occurrences (import + call) ✓ |
| Button label "Clear metrics cache" unchanged | 1 occurrence ✓ |
| New `describe('SettingsPage — Clear metrics cache (FOUND-02)')` block present | 1 occurrence ✓ |
| `clearAllQualityMetrics();` in extended `beforeEach` | 1 occurrence ✓ |
| `clearAllQualityCountCache();` in extended `beforeEach` | 1 occurrence ✓ |
| Exactly 1 `beforeEach(` hook declaration | 1 occurrence ✓ |
| `npx tsc -b --noEmit` exits 0 | ✓ |
| `npm test -- src/quality/__tests__/metricsCache.test.ts --run` | 7 / 7 pass ✓ |
| `npm test -- src/__tests__/completeness-hook.test.tsx src/__tests__/coding-coverage-panel.test.tsx --run` | 20 / 20 pass ✓ |
| `npm test -- src/__tests__/settings-clear-cache.test.tsx --run` | 3 / 3 pass ✓ |
| Full suite: no new failures vs baseline | 22 failed (pre-existing, identical files) / 750 passed ✓ |

## Self-Check: PASSED

Verified before writing SUMMARY:

- File `src/quality/__tests__/metricsCache.test.ts`: FOUND
- File `src/quality/metricsCache.ts`: FOUND (modified)
- File `src/hooks/useCompletenessReport.ts`: FOUND (modified)
- File `src/hooks/useCodingCoverage.ts`: FOUND (modified)
- File `src/contexts/SettingsContext.tsx`: FOUND (modified)
- File `src/components/settings/SettingsPage.tsx`: FOUND (modified)
- File `src/__tests__/settings-clear-cache.test.tsx`: FOUND (modified)
- Commit `3393ebc` (Task 1 RED): FOUND
- Commit `15efad7` (Task 1 GREEN): FOUND
- Commit `a408093` (Task 2): FOUND
- Commit `a04eca9` (Task 3): FOUND
- `npx tsc -b --noEmit` exits 0
- Touched-suite tests: 30 / 30 pass
- Full suite: 22 failed (pre-existing baseline) / 750 passed / 22 todo

---
*Phase: 24-data-fetching-foundation*
*Plan: 03*
*Completed: 2026-04-17*
