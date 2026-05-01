---
phase: 24-data-fetching-foundation
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/__tests__/settings-clear-cache.test.tsx
  - src/components/settings/SettingsPage.tsx
  - src/contexts/SettingsContext.tsx
  - src/hooks/__tests__/asyncRunReducer.test.ts
  - src/hooks/__tests__/useAsyncRun.test.tsx
  - src/hooks/__tests__/useResourceCounts.test.tsx
  - src/hooks/internal/asyncRunReducer.ts
  - src/hooks/useAsyncRun.ts
  - src/hooks/useCodingCoverage.ts
  - src/hooks/useCompletenessReport.ts
  - src/hooks/useDuplicateReport.ts
  - src/hooks/useLabRangesReport.ts
  - src/hooks/usePlausibilityReport.ts
  - src/hooks/useReferenceReport.ts
  - src/hooks/useResourceCounts.ts
  - src/quality/__tests__/metricsCache.test.ts
  - src/quality/metricsCache.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 24 delivers the data-fetching foundation: a shared `useAsyncRun` state-machine primitive, a `useResourceCounts` cache with FOUND-01/FOUND-04 fixes, a `QualityMetricsCache` registry (FOUND-02), and per-server cache invalidation wired into `SettingsContext` and `SettingsPage`. The core reducer (`asyncRunReducer`) and the `QualityMetricsCache` class are clean and well-tested.

Three warnings require attention before shipping. The most significant is a latent run-cancellation hazard in all four report hooks that pass non-primitive deps to `useAsyncRun`: any parent re-render that produces a new array identity for `types` or `patientIds` will silently cancel an in-flight run via the `useEffect` cleanup in `useAsyncRun`. The other two warnings are a missing cancellation-check gap in `useReferenceReport` (post-`onProgress` window) and an undocumented side-effect of the `useAsyncRun` cleanup that fires even when `autoStart` is false.

No security vulnerabilities or data-loss risks were found.

## Warnings

### WR-01: Non-primitive deps cause silent run cancellation on parent re-render

**Files:**
- `src/hooks/useDuplicateReport.ts:106`
- `src/hooks/useLabRangesReport.ts:63`
- `src/hooks/useReferenceReport.ts:93`
- `src/hooks/usePlausibilityReport.ts:67`

**Issue:** All four report hooks pass raw array/object props directly into `useAsyncRun`'s `deps`. For example, in `useDuplicateReport.ts`:

```ts
deps: [client, types, sampleSize, patientIds],
```

`types` and `patientIds` are `string[] | undefined` props. The `useEffect` inside `useAsyncRun` (line 138-146) uses the same `deps` array and **always runs its cleanup** when any dep identity changes. The cleanup unconditionally calls `cancelInFlightRef.current?.()`, which flips the in-flight run's `cancelled` flag to `true`. If a parent component re-renders and passes a new array identity for `types` (even with identical contents), the cleanup fires and silently cancels an active report run — with no error, no toast, and no visible feedback to the user.

The PITFALLS doc warns about this for `autoStart: true` renders loops (§Pitfall 7), but the hazard exists for `autoStart: false` too because the cleanup path is unconditional.

**Fix:** Stabilize the unstable deps before passing them to `useAsyncRun`. Either memoize in the calling hook or join arrays into stable string keys:

```ts
// useDuplicateReport.ts — before passing to useAsyncRun
const typesKey = useMemo(() => types.join(','), [types]);
const patientKey = useMemo(() => patientIds?.slice().sort().join(',') ?? '', [patientIds]);

const run = useAsyncRun<NormalizedIssue>({
  runner: async ({ isCancelled, setProgress, appendIssues }) => { ... },
  deps: [client, typesKey, sampleSize, patientKey],
});
```

The same pattern is already applied correctly in `useCompletenessReport.ts` (lines 49-54) and `useCodingCoverage.ts` (lines 40-44). Apply it uniformly to the four hooks listed above.

Alternatively, document in `UseAsyncRunArgs` that all `deps` elements MUST be primitives or stable references, and enforce this at the call sites.

---

### WR-02: Cancellation check missing in `useReferenceReport` progress callback window

**File:** `src/hooks/useReferenceReport.ts:77-84`

**Issue:** `checkReferencesExist` receives an `onProgress` callback that calls `setProgress` but does NOT guard with `isCancelled()` before dispatching:

```ts
onProgress: (current, total) => {
  if (isCancelled()) return;        // <-- guard present here...
  setProgress(current, total);
},
```

Wait — the guard IS present (line 80-82). The actual issue is subtler: the `onProgress` callback fires from within `checkReferencesExist` which is an `await`-ed async function (line 77). After `checkReferencesExist` returns, the code checks `if (isCancelled()) return` at line 85. However, there is a window between the last `onProgress` invocation (inside `checkReferencesExist`) and the `isCancelled()` check at line 85 where the run could be cancelled by an external call. In that window, `normalizeBrokenRefIssues` and `detectOrphans` run synchronously, and their results are appended via `appendIssues` at line 90 without an intermediate cancellation check.

The `appendIssues` helper inside `useAsyncRun` already short-circuits when `cancelled` is true (line 103-105 of `useAsyncRun.ts`), so no state update occurs. The real concern is `setBrokenCount` and `setOrphanCount` at lines 88-89 — these are direct React `setState` calls that do NOT go through the cancellation-aware helpers:

```ts
setBrokenCount(brokenIssues.length);   // line 88 — not guarded
setOrphanCount(orphanIssues.length);   // line 89 — not guarded
```

If the run is cancelled between lines 85 and 88, these setState calls fire against an already-cancelled run, producing stale accessory state in the component.

**Fix:** Add an explicit cancellation check immediately before setting the accessory counts:

```ts
if (isCancelled()) return;
const brokenIssues = normalizeBrokenRefIssues(broken, refMap);
const orphanIssues = detectOrphans(sample);
if (isCancelled()) return;           // guard before accessory state writes
setBrokenCount(brokenIssues.length);
setOrphanCount(orphanIssues.length);
appendIssues([...brokenIssues, ...orphanIssues]);
```

The same class of issue exists in `useDuplicateReport.ts` lines 83-88 (between the `isCancelled()` check at line 89 and `setDuplicateClusters` / `setSkippedPatients` calls at lines 84-85), though that section runs synchronously before the first `await`, so the risk window is narrower.

---

### WR-03: `useAsyncRun` cleanup cancels in-flight runs on any dep change, undocumented for `autoStart: false`

**File:** `src/hooks/useAsyncRun.ts:138-146`

**Issue:** The `useEffect` at line 138 runs its cleanup function on every dep change AND on unmount, unconditionally:

```ts
useEffect(() => {
  if (args.autoStart) {
    start();
  }
  return () => {
    cancelInFlightRef.current?.();   // fires on EVERY dep change, not just unmount
  };
}, deps);
```

When `autoStart` is false (the default for all four Phase 24 consumers), the effect body is a no-op, but the cleanup still fires whenever `deps` changes. This means that any change to the passed `deps` — including an unrelated parent re-render that creates a new object identity for a dep — silently cancels the in-flight run. This behavior is documented for `autoStart: true` (§Pitfall 7 in PITFALLS.md) but is NOT documented in the JSDoc for `autoStart: false` callers.

A caller reading only the `UseAsyncRunArgs` interface comment ("Deps array that refreshes the start() useCallback and the autoStart effect") would not expect their imperative `start()` call to be cancelled by a dep change.

**Fix:** Document the cancellation-on-dep-change behavior explicitly in the `deps` JSDoc:

```ts
/**
 * Deps array that refreshes the start() useCallback and the autoStart effect.
 * IMPORTANT: any change in `deps` identity also cancels the currently-running
 * async run (via effect cleanup). All elements MUST be primitives or stable
 * references — unstable object/array identities will cancel the active run on
 * every parent re-render.
 */
deps?: unknown[];
```

Additionally, consider whether the cleanup should be split: place the cancel-on-unmount logic in a separate `useEffect([], [])` ref-based cleanup, and only cancel-on-deps-change when `autoStart` is true.

---

## Info

### IN-01: `allRefs` in `useReferenceReport` lacks an explicit type annotation

**File:** `src/hooks/useReferenceReport.ts:56`

**Issue:** `const allRefs = [];` is inferred as `never[]` at declaration, widened by TypeScript only when the first push occurs. If `extractReferences` returns a complex union type, the widening relies on TypeScript's contextual inference rather than an explicit annotation. This is fragile across TypeScript version upgrades and makes the intent less clear.

**Fix:**
```ts
import type { ExtractedReference } from '../quality/referenceWalker'; // or whatever the type is
const allRefs: ExtractedReference[] = [];
```

---

### IN-02: `metricsCache.ts` `enforceLocalStorageLimit` is not scoped to `this.serverUrl`

**File:** `src/quality/metricsCache.ts:138-164`

**Issue:** `enforceLocalStorageLimit()` scans all localStorage keys matching `LOCAL_STORAGE_PREFIX` (line 143), not just the current server's namespace. When the total crosses `LOCAL_STORAGE_LIMIT=200`, entries from OTHER servers are eligible for eviction based on their `computedAt` timestamp. A server with old cached metrics could have its entries evicted by a different server's write operation. This cross-server contamination in the eviction policy is inconsistent with the per-server isolation promised by `clear()` and `clearQualityMetricsCache()`.

**Fix:** Scope the scan to the current server's prefix:

```ts
private enforceLocalStorageLimit(): void {
  if (typeof localStorage === 'undefined') return;
  const prefixForServer = `${LOCAL_STORAGE_PREFIX}${this.serverUrl}|`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefixForServer)) keys.push(k);
  }
  if (keys.length <= LOCAL_STORAGE_LIMIT) return;
  // ... same trim logic
}
```

If cross-server global trimming is intentional (to keep overall localStorage usage bounded), document this explicitly and change `LOCAL_STORAGE_LIMIT` to a clearly-named global constant (`GLOBAL_LOCAL_STORAGE_LIMIT`).

---

### IN-03: `SettingsContext.tsx` clears cache for the incoming `nextUrl` even when switching to a new server

**File:** `src/contexts/SettingsContext.tsx:40-43`

**Issue:**

```ts
if (nextUrl && nextUrl !== prevUrl) {
  clearQualityCountCache(nextUrl);
  clearQualityMetricsCache(nextUrl);
}
```

This clears the cache for the NEW server URL when the user switches servers. If the user has previously fetched quality metrics for the new server in the same session, this wipes that cached data. For a user frequently toggling between two servers, every save discards the cache for the destination server. The 2-entry LRU in `metricsCache.ts` was specifically designed to keep both A and B cache-warm during toggling (FOUND-02 / PITFALLS Pitfall 3), but `setSettings` defeats this by evicting the new server's cache on every switch.

**Fix:** Remove the `nextUrl` clear, or only clear it when `sampleSize` changed (since that makes cached reports invalid regardless of server):

```ts
// Only clear the PREVIOUS server's cache on settings save.
// The incoming server's cache is still valid unless explicitly requested.
if (prevUrl) {
  clearQualityCountCache(prevUrl);
  clearQualityMetricsCache(prevUrl);
}
```

If the intent is "always start fresh on server switch," the code is correct but should be documented as a deliberate design decision, since it contradicts the LRU rationale.

---

### IN-04: Commented-out potential TODO marker in test isolation comment

**File:** `src/hooks/__tests__/useResourceCounts.test.tsx:316`

**Issue:** The helper `client_a_calls` (defined at line 340) uses a snake_case name inconsistent with the camelCase convention used throughout the test file and the rest of the codebase. While hoisting ensures it works, the naming inconsistency makes the file harder to read.

**Fix:** Rename to `getCallCount` or `callCount` to match the camelCase convention:

```ts
function getCallCount(client: MedplumClient): number {
  return (client.search as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
}
```

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
