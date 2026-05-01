---
phase: 24-data-fetching-foundation
plan: 02
subsystem: data-fetching
tags: [react-hooks, module-scope-cache, cancellation, strictmode, vitest, fhir]

# Dependency graph
requires:
  - phase: 05-quality-foundation
    provides: "useResourceCounts hook (worker-pool + concurrency=4) — kept as-is; cache + cancellation pattern layered on top"
provides:
  - "Module-scope countCache Map<`${serverUrl}::${type}`, number> for cross-mount count reuse"
  - "clearQualityCountCache(serverUrl: string) — per-server wipe"
  - "clearAllQualityCountCache() — cross-server wipe"
  - "Closure-scoped `let cancelled` cancellation pattern in useResourceCounts (FOUND-04 fix)"
  - "typesKey memo absorbing Phase 27 R12 effect-dep fix"
affects:
  - "24-03-wire-settings-cache-clear (consumes clearQualityCountCache + clearAllQualityCountCache)"
  - "25-quality-module-dedup (useSampleWalker can follow this cache pattern)"
  - "27-efficiency-polish (R12 `resourceTypes.join(',')` fix absorbed here — Phase 27 scope reduced)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-scope Map read-through cache, keyed on composite string (`${serverUrl}::${type}`)"
    - "Closure-scoped `let cancelled` inside useEffect (matches useCompletenessReport.ts:71-74)"
    - "Write-through guard: `if (cancelled) return` BEFORE cache.set (Pitfall 4)"
    - "Error paths do NOT write to cache — failures retry on remount"
    - "Memoized join-key for effect deps (typesKey = useMemo(() => resourceTypes.join(','), [resourceTypes]))"

key-files:
  created:
    - "src/hooks/__tests__/useResourceCounts.test.tsx (8 tests)"
  modified:
    - "src/hooks/useResourceCounts.ts (cache + FOUND-04 + R12 in a single file touch)"

key-decisions:
  - "Cache key format locked as `${serverUrl}::${type}` (double-colon separator per CONTEXT.md §specifics line 111)"
  - "Both per-server (clearQualityCountCache) AND cross-server (clearAllQualityCountCache) wipe functions exported — mirrors existing clearAllQualityMetrics / per-server split"
  - "Error states are NOT cached — only success path writes to cache; failing types retry on remount"
  - "No TTL, no background refresh — session-scoped per D-01; staleness acceptable for a local tool"

patterns-established:
  - "Module-scope read-through cache for React hooks: declare `const X = new Map<string, T>()` at module top level, read inside useEffect (never during render), write-through on success with `if (cancelled) return` guard"
  - "Closure-scoped cancellation: `let cancelled = false` inside useEffect, cleanup returns `() => { cancelled = true; }` — each effect run gets its own flag"
  - "Export both scoped and global clear functions for cache invalidation UX parity"

requirements-completed: [FOUND-01, FOUND-04]

# Metrics
duration: 4min
completed: 2026-04-17
---

# Phase 24 Plan 02: useResourceCounts Cache + FOUND-04 Cancellation Fix Summary

**Module-scope `Map<\`${serverUrl}::${type}\`, number>` read-through cache in `useResourceCounts` with closure-scoped `let cancelled` replacing `cancelledRef` and memoized `typesKey` absorbing the Phase 27 R12 effect-dep bug — all in one file touch.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-17T12:11:35Z
- **Completed:** 2026-04-17T12:16:00Z (approx)
- **Tasks:** 2
- **Files modified:** 1 (src/hooks/useResourceCounts.ts)
- **Files created:** 1 (src/hooks/__tests__/useResourceCounts.test.tsx)

## Accomplishments

- **FOUND-01 delivered**: Dashboard, Explorer, and Quality page switching now skips `_summary=count` fetches for types already counted this session (per serverUrl). Cache is transparent — consumer signature and return shape unchanged.
- **FOUND-04 delivered**: Latent `cancelledRef` stale-reset bug eliminated. Each effect run now gets a fresh closure-scoped `let cancelled`; stale in-flight promises from prior effect runs cannot commit state or cache writes because their captured closure's flag was flipped by the prior cleanup.
- **R12 absorbed**: `resourceTypes.join(',')` moved into a `useMemo`, so effect deps stabilize per deps-change instead of per render. Phase 27 EFF-01 scope reduced accordingly.
- **Two new exports** for Plan 24-03 to wire: `clearQualityCountCache(serverUrl)` (per-server) and `clearAllQualityCountCache()` (cross-server).
- **8 new tests** covering cache hit/miss, server isolation, typesKey stability, StrictMode cancellation regression, write-through guard, error non-caching, and cross-server wipe.

## Task Commits

Each task was committed atomically (--no-verify per parallel-executor protocol):

1. **Task 1: Refactor useResourceCounts.ts** — `ad56627` (refactor)
2. **Task 2: Create useResourceCounts.test.tsx** — `a8b58fa` (test)

## Files Created/Modified

- `src/hooks/useResourceCounts.ts` — added module-scope `countCache` Map, `cacheKey()` helper, `clearQualityCountCache` and `clearAllQualityCountCache` exports; replaced `cancelledRef` with `let cancelled`; added `typesKey = useMemo(...)`; added write-through guard before `countCache.set`; added JSDoc header citing FOUND-01 + FOUND-04 + R12 absorption + Pitfalls 4 & 5.
- `src/hooks/__tests__/useResourceCounts.test.tsx` — 8 tests covering FOUND-01 cache behavior, FOUND-04 StrictMode cancellation, Pitfall 4 write-through guard, Pitfall 8 isolation (beforeEach wipe).

## Decisions Made

- **Cache key format**: `${serverUrl}::${type}` (double-colon) — locked by CONTEXT.md §specifics line 111; avoids collision with URLs containing slashes.
- **Both wipe variants exported**: `clearQualityCountCache(serverUrl)` for `SettingsContext.setSettings()` wiring and `clearAllQualityCountCache()` for the Settings "Clear cache" button. Resolves Open Question 3.
- **Cache size invariant**: count cache is **unbounded in Phase 24** by design (STRIDE T-24-02-04 disposition: `accept`). Typical bound is `resource types × distinct serverUrls` ≈ 100 × 2 = 200 entries (small numbers). LRU eviction deferred — applied only to `Map<serverUrl, QualityMetricsCache>` in FOUND-02 per CONTEXT.md.
- **Error path does NOT write to cache**: only success path populates the Map. This means transient failures retry on remount, which is the correct semantic for a local FHIR tool.
- **refetchKey bumps do NOT clear the cache**: "Recompute" button fires a fresh fetch on the current mount, but other consumers reading the same `(serverUrl, type)` pair still hit cache. Global invalidation is done via the exported clear functions.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met.

## Issues Encountered

**1. Pre-existing test failure surfaced during verification**
- `src/__tests__/resource-type-landing-counts.test.tsx` — "displays error badges when counts fail" test fails on both `main` (commit 7cb1532) and this branch, identically.
- Verified via `git stash && npm test ... && git stash pop` that the failure is NOT caused by this plan's changes.
- Logged to `.planning/phases/24-data-fetching-foundation/deferred-items.md` per SCOPE BOUNDARY rule.
- The 3 other tests in that file (which exercise the consumer contract that matters for this plan) all pass.

## Known Stubs

None — implementation is complete and fully wired.

## Threat Flags

None — no new attack surface. The cache holds values from requests already authorized by the existing `MedplumClient`; cache invalidation paths are covered by D-03 / D-04 / D-05; write-through guard closes the Pitfall 4 stale-write vector.

## User Setup Required

None — pure internal refactor; no user-visible UI change, no settings to configure. Plan 24-03 will wire the exported clear functions into the existing Settings "Clear cache" button.

## Next Phase Readiness

- **Plan 24-03 ready**: `clearQualityCountCache(serverUrl)` and `clearAllQualityCountCache()` are exported from `src/hooks/useResourceCounts.ts` and ready to be called from `SettingsContext.setSettings()` + `SettingsPage.handleClearMetricsCache`.
- **Phase 27 EFF-01 scope reduced**: R12 memo fix is already in; that Phase 27 task should be marked "absorbed by Plan 24-02".
- **Phase 25 useSampleWalker**: this plan's module-scope Map pattern is the template to follow when adding per-sample caches.
- **FOUND-02 (next, Plan 24-04 does not depend on this)**: `metricsCache.ts` registry is independent; Plan 24-02 does NOT modify `metricsCache.ts`.

## Verification Summary

| Acceptance Criterion | Result |
|---|---|
| `cancelledRef` removed from `useResourceCounts.ts` | 0 occurrences ✓ |
| `let cancelled = false` present in effect body | line 107 ✓ |
| `useRef` import removed | no import present ✓ |
| `useMemo` added for typesKey | line 100 ✓ |
| `resourceTypes.join(',')` only inside `useMemo` | line 100 (not in deps array) ✓ |
| `const countCache = new Map` at module top level | line 49 ✓ |
| `clearQualityCountCache` exported | line 58 ✓ |
| `clearAllQualityCountCache` exported | line 66 ✓ |
| `::` separator used in key | cacheKey(), lines 45 ✓ |
| `if (cancelled) return` count ≥ 3 | 4 occurrences ✓ |
| Write-through guard before `countCache.set` | verified via `grep -B 3 countCache.set` ✓ |
| 8 tests in new file | 8 ✓ |
| `beforeEach` cache wipe (Pitfall 8) | 1 block ✓ |
| StrictMode test present | 6 occurrences (imports + wrapper usage) ✓ |
| `npx tsc -b --noEmit` exits 0 | ✓ |
| `npm test -- src/hooks/__tests__/useResourceCounts.test.tsx --run` exits 0 | 8 passed ✓ |
| Full suite: no new failures vs baseline | 22 failed / 725 passed (baseline 22 failed / 717 passed; our +8 tests all pass) ✓ |

## Self-Check: PASSED

- File `src/hooks/useResourceCounts.ts`: FOUND
- File `src/hooks/__tests__/useResourceCounts.test.tsx`: FOUND
- Commit `ad56627` (Task 1): FOUND
- Commit `a8b58fa` (Task 2): FOUND

---
*Phase: 24-data-fetching-foundation*
*Plan: 02*
*Completed: 2026-04-17*
