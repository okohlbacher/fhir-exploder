---
phase: 42-pre-probe-extension-module-counts-mii-ext-15
plan: 01
subsystem: react-hooks
tags: [react-hooks, fhir, parallel-fetch, mii-extensions, mii-ext-15]

# Dependency graph
requires:
  - phase: 34-mii-extension-modules
    provides: MII_MODULES (extension category), fhirResourceTypesOf, getPatientSearchParamForType, getExtraQueryForType, EmptyExtensionsCoordinator (D-05 idempotency contract)
provides:
  - useMiiExtensionCounts(patientId) hook — fans out _summary=count GETs across the 14 extension modules and aggregates per-type bundle.totals into a per-module count
  - Hook-internal LRU-shaped cache keyed by patientId:moduleId
  - Cancelled-flag cleanup primitive applied to the per-module Promise.all chain
  - D-05 wiring at hook level (reportEmptiness called from inside .then)
affects: [42-02, MiiModuleTabs render-site, EmptyExtensionsCoordinator consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stable-ref pattern for callbacks read from contexts whose no-Provider fallback returns a fresh function per render — store in useRef and read .current inside the effect to keep useEffect deps minimal"
    - "Functional setState equality guard (prev[key] === next ? prev : { ...prev, [key]: next }) to avoid producing new record references when the value did not change — pairs with the stable-ref pattern to make rerenders idempotent"
    - "Per-(module, type) fan-out via Promise.all(types.map(fetchOne)) with .catch(() => 0) leaf so a single failed type does not blank the module"

key-files:
  created:
    - src/hooks/useMiiExtensionCounts.tsx
    - src/hooks/__tests__/useMiiExtensionCounts.test.tsx
    - .planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/deferred-items.md
  modified: []

key-decisions:
  - "Cleanup primitive: cancelled-flag (NOT AbortController). Medplum v5.1.7 client.get() doesn't accept signal; switching to raw fetch() would lose Medplum's auth/middleware. Pattern mirrors PatientRelatedResources.tsx:37,57."
  - "Cache scope: hook-internal useRef<Map<string, number>> keyed by `${patientId}:${moduleId}`. Cache lifetime = hook mount; the Phase-34 `<EmptyExtensionsProvider key={patientId}>` re-keys on patient navigation, forcing the hook to remount and the cache to die. No cross-patient leak."
  - "Module count: do NOT hardcode 14 or 15 — iterate `MII_MODULES.filter(m => m.category === 'extension')`. Source-of-truth is mii-modules.ts."
  - "reportEmptiness read via stable useRef. The default no-op fallback returned by `useEmptyExtensionsCoordinator()` outside its Provider creates a fresh function per render; including it in useEffect deps would re-fire the fan-out on every render and the cache-hit branch's setCounts would loop infinitely. Storing the latest reference in a ref keeps the effect's deps to [client, patientId]."

patterns-established:
  - "Pattern 1: Stable-ref read for context-no-Provider-fallback callbacks — discovered while debugging an OOM in the first GREEN run."
  - "Pattern 2: Idempotent setCounts (functional equality guard) — paired with stable-ref pattern, makes the cache-hit branch safe under repeated effect re-fire."

requirements-completed: [MII-EXT-15]

# Metrics
duration: 17 min
completed: 2026-04-29
---

# Phase 42 Plan 01: Pre-probe extension-module counts hook (MII-EXT-15) Summary

**`useMiiExtensionCounts(patientId)` React hook fans out one `_summary=count` GET per (extension module, FHIR type) pair on patient mount, sums per-type totals into per-module counts (D-02), and feeds the Phase-34 `EmptyExtensionsCoordinator` so the "Hide N empty modules" toggle is accurate on mount instead of accumulating after each extension tab is clicked (D-05).**

## Performance

- **Duration:** 17 min
- **Started:** 2026-04-29T19:27:31Z
- **Completed:** 2026-04-29T19:45:25Z
- **Tasks:** 2 (Task 1 RED+GREEN, Task 2 baseline regression)
- **Files modified:** 2 source + 1 deferred-items doc = 3 total

## Accomplishments

- New `src/hooks/useMiiExtensionCounts.tsx` (~115 LOC): pure data-fetching primitive, no render-site changes (those are wave 2 / 42-02).
- New `src/hooks/__tests__/useMiiExtensionCounts.test.tsx` (~410 LOC, 8 unit tests): locks the contract for multi-type sum (MII-EXT-15-B), per-type catch fallback, undefined-while-fetching (MII-EXT-15-C), extension-only key set (MII-EXT-15-D), URL pattern (MII-EXT-15-A), cancelled-flag cleanup (MII-EXT-15-H), cache short-circuit, and D-05 emptiness publishing.
- Type-check (`npx tsc -b --noEmit`) clean.
- Full Vitest suite: 1148 passed / 22 todo / 3 skipped / 1 pre-existing-failure (deuteranopia pair #13, scope-out — see Deviations).
- `npm run build` clean (627ms).

## Task Commits

Each task was committed atomically:

1. **Task 1 RED — failing tests** — `b6485d5` (`test(42-01): RED — failing tests for useMiiExtensionCounts (MII-EXT-15-B/-C/-D/-H)`)
2. **Task 1 GREEN — hook implementation** — `dca8ee1` (`feat(42-01): GREEN — implement useMiiExtensionCounts (MII-EXT-15-B/-C/-D/-H)`)
3. **Task 2 — baseline regression check** — `787b524` (`test(42-01): full-suite baseline preserved (1148+ passing, build clean)`)

_Note: TDD task 1 split into RED and GREEN per the plan's `tdd="true"` directive._

## Files Created/Modified

- `src/hooks/useMiiExtensionCounts.tsx` (new) — the hook itself.
- `src/hooks/__tests__/useMiiExtensionCounts.test.tsx` (new) — 8-test unit suite.
- `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/deferred-items.md` (new) — logs the pre-existing deuteranopia pair #13 failure as scope-out for a future Phase 40 follow-up.

## Decisions Made

- **Cleanup primitive: cancelled-flag (NOT AbortController).** Medplum v5.1.7 `client.get()` doesn't accept a `signal` option; switching to raw `fetch()` would lose Medplum's auth/middleware. Pattern mirrors `PatientRelatedResources.tsx:37,57`.
- **Cache scope: hook-internal `useRef<Map<string, number>>` keyed by `${patientId}:${moduleId}`.** Cache lifetime = hook mount; the Phase-34 `<EmptyExtensionsProvider key={patientId}>` re-keys on patient navigation, forcing the hook to remount and the cache to die. No cross-patient leak.
- **Module count: do NOT hardcode 14 or 15.** Iterate `MII_MODULES.filter(m => m.category === 'extension')`. Source-of-truth is `mii-modules.ts`.
- **`reportEmptiness` read via stable `useRef`.** The default no-op fallback returned by `useEmptyExtensionsCoordinator()` outside its Provider creates a fresh function per render; including it in `useEffect` deps would re-fire the fan-out on every render and the cache-hit branch's `setCounts` would loop infinitely. Storing the latest reference in a ref keeps the effect's deps to `[client, patientId]`.
- **Functional setState equality guard.** `setCounts((prev) => prev[key] === next ? prev : { ...prev, [key]: next })` — pairs with the stable-ref pattern. Without it, every effect re-fire would produce a new record reference even when the cached value matched, defeating the purpose of the cache.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Infinite render loop from `reportEmptiness` in `useEffect` deps**

- **Found during:** Task 1 GREEN (first test run hit a Node OOM after ~3 minutes of GC churn).
- **Issue:** The original implementation listed `reportEmptiness` in the `useEffect` deps array, matching the lint rule for exhaustive deps. Outside the `EmptyExtensionsProvider` (e.g. in unit tests not wrapped in the provider), the coordinator hook's no-op fallback returns a fresh `() => {}` per render. Coupled with the cache-hit branch's `setCounts((prev) => ({ ...prev, [mod.key]: cached }))` producing a new record reference even when the value matched, every effect run produced a new render → new fallback function → new effect run → infinite loop, exhausting heap.
- **Fix:** Promoted `reportEmptiness` to a stable `useRef` (`reportEmptinessRef.current = reportEmptiness` on every render; effect reads `reportEmptinessRef.current`). Effect deps reduced to `[client, patientId]` with an `eslint-disable-next-line` comment justifying the ref-read. Also added a functional-setState equality guard so the cache-hit branch is a no-op when the value matched.
- **Files modified:** `src/hooks/useMiiExtensionCounts.tsx`
- **Verification:** Test run dropped from OOM/220s to a clean 8/8 passing in 0.78s.
- **Committed in:** `dca8ee1` (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Original test file held never-resolving promises causing OOM under jsdom**

- **Found during:** Task 1 GREEN (first test run).
- **Issue:** Tests 3 and 4 used `vi.fn(() => new Promise(() => {}))` to keep fetches in flight while asserting initial state. Across 14 extension modules × ~3 types each = ~50 promise closures per test that never resolved; the worker never reclaimed them and OOMed before vitest could exit.
- **Fix:** Switched both tests to immediately-resolved fetch responses (so the worker can reclaim promise state) and asserted initial state on the FIRST RENDER (where useState's initializer has populated the seed but no microtasks have flushed yet). Test 6 (cancelled-flag) was kept on a controllable resolver pattern but with explicit `unmount()` calls and bounded resolver lists.
- **Files modified:** `src/hooks/__tests__/useMiiExtensionCounts.test.tsx`
- **Verification:** Worker no longer OOMs; full suite of 8 tests completes in 0.78s.
- **Committed in:** `dca8ee1` (Task 1 GREEN commit) — same commit as the hook fix because the test file and the hook implementation co-evolved during the GREEN debug loop.

---

**Total deviations:** 2 auto-fixed (2 bugs).
**Impact on plan:** Both fixes were necessary for the plan to complete (otherwise the test suite hung indefinitely). No scope creep — both fixes are inside the planned hook + test files. The stable-ref + idempotent-setState pattern is now documented in `patterns-established` for future hook authors who consume coordinator-style contexts.

## Issues Encountered

- **Pre-existing test failure: deuteranopia pair #13 (kardiologie ↔ mikrobiologie).** `src/__tests__/visual/deuteranopia.test.tsx` reports `ΔE2000 = 1.406 < 5` for the kardiologie/mikrobiologie color pair. Verified pre-existing on commit `31ce2ed` (the worktree base) before any Phase 42-01 source changes. Logged to `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/deferred-items.md` per the SCOPE BOUNDARY rule. Phase 42-01 only touches `src/hooks/`; the deuteranopia matrix is a Phase 40 (DEUT-01) artifact and pair-discriminability tuning belongs to a future Phase 40 follow-up. Total passing-test count grew from ~1140 baseline to 1148, exactly matching the +8 new tests added by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 2 (42-02) consumes the new hook** from `MiiModuleTabsInner` (~line 123 of `src/components/patients/MiiModuleTabs.tsx`), INSIDE the `EmptyExtensionsProvider` per Pitfall #1. Wave 2's render-site changes will surface the per-module counts as badges/labels on the extension tab pills, and the coordinator will already have the correct emptiness map populated on mount (no longer accumulating after clicks).
- No blockers for wave 2.
- Pre-existing deuteranopia pair #13 failure remains and is unrelated to this work.

## Self-Check: PASSED

- File `src/hooks/useMiiExtensionCounts.tsx` exists ✓
- File `src/hooks/__tests__/useMiiExtensionCounts.test.tsx` exists ✓
- Commit `b6485d5` (RED) found in `git log` ✓
- Commit `dca8ee1` (GREEN) found in `git log` ✓
- Commit `787b524` (Task 2) found in `git log` ✓
- 8 unit tests pass ✓
- `npx tsc -b --noEmit` exits 0 ✓
- `npm run build` exits 0 ✓
- All Task 1 acceptance-criteria greps pass (file exists, export name, category filter, URL pattern, cancelled-flag, .catch fallback, reportEmptiness wired, AbortController absent, useEmptyExtensionsPublisher absent, useRef + Map present) ✓

---
*Phase: 42-pre-probe-extension-module-counts-mii-ext-15*
*Completed: 2026-04-29*
