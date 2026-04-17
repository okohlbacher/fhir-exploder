# Phase 24: Data-Fetching Foundation — Research

**Researched:** 2026-04-17
**Domain:** React hook refactor — cache plumbing and cancellation semantics for FHIR fetch layer
**Confidence:** HIGH (every recommendation is grounded in file:line evidence from the existing codebase; no new runtime dependencies; patterns already used in sibling hooks)

---

## Summary

Phase 24 is a pure-refactor phase that lands three cross-cutting primitives the rest of v1.4 depends on:

1. A **module-scoped `Map<serverUrl+type, count>` cache** for `useResourceCounts` so top-level navigation between `/`, `/explorer`, and `/quality` does not re-fire `_summary=count` requests for types already counted this session (FOUND-01).
2. A **`Map<serverUrl, QualityMetricsCache>` registry with 2-entry LRU eviction** in `src/quality/metricsCache.ts`, replacing the rotating `cacheInstance` singleton currently duplicated in `useCompletenessReport.ts:43-51` and `useCodingCoverage.ts:35-43`. The current-server entry is cleared on any `setSettings()` call (FOUND-02).
3. A new **`useAsyncRun<TIssue>` hook** that owns the `{status, progress, errorMessage, cancel, run}` state machine shared by the four async report hooks (`usePlausibilityReport` / `useLabRangesReport` / `useDuplicateReport` / `useReferenceReport`). The hook uses **closure-scoped `let cancelled`** (NOT `cancelledRef`) — an explicit safety invariant locked in STATE.md — and the four callers each shrink to ≤ 40 lines without introducing `as` casts at consumer panels (FOUND-03). The `useResourceCounts.ts:29` `cancelledRef` latent bug is pre-fixed in the same PR (FOUND-04).

There are zero user-visible UI changes and zero new npm dependencies. The refactor's risk profile is LOW-MEDIUM: the patterns are already used or documented elsewhere in the codebase, but the `useAsyncRun` API must be designed carefully to avoid the five specific anti-patterns enumerated in ARCHITECTURE.md §Q1 and PITFALLS.md §Pitfall 1.

**Primary recommendation:** Build in this order — (a) `useAsyncRun` + reducer authored and unit-tested standalone, (b) `useResourceCounts` cache + FOUND-04 cancellation fix (same file edit), (c) `metricsCache.ts` registry + SettingsPage wiring, (d) migrate the four report hooks to `useAsyncRun` one-by-one with panel regression tests after each. This order keeps every PR independently shippable and every migration reversible.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**FOUND-01 — Count cache staleness policy**

- **D-01:** Count cache is **session-scoped with no TTL**. The module-scope `Map<serverUrl+type, count>` persists for the browser tab's lifetime and is never automatically refreshed.
- **D-02:** Staleness is acceptable for a local tool — Blaze data changes mid-session are rare. The existing "Recompute" button on the quality dashboard gives users intentional refresh when they need it. No TTL, no background polling.
- **D-03:** The count cache IS cleared when `clearQualityCountCache(serverUrl)` is called. Wire it alongside `clearQualityMetricsCache(serverUrl)` in `SettingsPage.tsx` (existing "Clear cache" button) and on any `setSettings()` call (same as FOUND-02 trigger).

**FOUND-02 — Settings invalidation mechanism**

- **D-04:** Use a **direct call at save time** (not a version counter or `useEffect` watcher). When `SettingsPage` calls `setSettings(next)` to apply new settings, it also calls `clearQualityMetricsCache(serverUrl)` and `clearQualityCountCache(serverUrl)`. No watcher needed.
- **D-05:** "Any settings save" triggers the wipe — conservative and simple. Even a sampleSize change clears cached reports. The clear is cheap (memory Map cleared + scoped localStorage keys removed) and prevents stale reports from silently accumulating.
- **D-06:** Registry function signature: `getQualityMetricsCache(serverUrl: string): QualityMetricsCache` — creates and inserts if absent (with 2-entry LRU eviction), returns existing if present. `clearQualityMetricsCache(serverUrl: string)` calls `.clear()` on the registry entry and removes it from the map. Both exported from `metricsCache.ts`.

**FOUND-03 — `useAsyncRun` API and scope**

- **D-07:** Follow the ARCHITECTURE.md Q1 proposed shape exactly. The `runner` receives `{ isCancelled, setProgress, appendIssues }` helpers. Closure-scoped `let cancelled` is the cancellation mechanism — no `AbortController`, no `useRef`. This is an explicit invariant (STATE.md safety invariants).
- **D-08:** Include `autoStart?: boolean` in Phase 24 when `useAsyncRun` is authored. Zero extra cost to add now; Phase 25 drill-down refactor will use it, and a second patch-the-hook PR would be wasteful. `autoStart: true` triggers a `start()` call inside the hook's `useEffect` on mount (and on `deps` change). Drill-down pages will set `autoStart: true`; panel pages will leave it at the default `false` and call `start()` imperatively.
- **D-09:** The 4 refactored report hooks retain their own typed state for metric-specific payload (e.g., `useLabRangesReport` still returns `LaunchRangeIssue[]`, not `unknown[]`). No new `as` casts in consumer panels. Hook exported API is backward-compatible.

**FOUND-04 — Cancellation fix in `useResourceCounts`**

- **D-10:** `cancelledRef` at `useResourceCounts.ts:29` converted to closure-scoped `let cancelled = false` inside the `useEffect`. Matches the already-validated pattern in `useCompletenessReport.ts:71-74`. This is a latent bug (stale `cancelledRef.current = false` at the top of the effect does not reset the ref for concurrent runs from prior effects).

### Claude's Discretion

- Exact LRU eviction implementation in `Map<serverUrl, QualityMetricsCache>` (insert-evict when size > 2, deleting `map.keys().next().value` — the same pattern as `QualityMetricsCache.memory`).
- Test split: `useAsyncRun.test.ts` unit-tests the reducer; integration-level smoke via the existing panel tests that exercise `start()` / `cancel()`.
- Whether to colocate `getQualityCountCache` with `metricsCache.ts` or create a separate `countCache.ts` — either is fine; prefer same file for discoverability.

### Deferred Ideas (OUT OF SCOPE)

- `useSampleWalker<T>` for completeness + coding — **Phase 25 (QDDEP-03)**, after `useAsyncRun` is stable.
- `autoStart` drill-down behavior wiring — **Phase 25** (when drill-downs are refactored).
- `QualityMetricsContext` re-render split — **v1.5+** (EFF-R14, deferred on risk/reward grounds).
- AbortController for network-level cancellation — defer to a later milestone if profiling shows network dominates.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | `useResourceCounts` reads through a module-scoped `Map<serverUrl+type, count>` cache so dashboard, explorer, and quality pages do not re-run per-type count sweeps on mount. Absorbs the line-75 `resourceTypes.join(',')` `useMemo` fix. | Architecture Patterns §Pattern 1 (Module-scoped cache registry). Reference implementation already exists for quality-metrics at `useCompletenessReport.ts:43-51`. Key format `${serverUrl}::${resourceType}` per CONTEXT.md §specifics. |
| FOUND-02 | `metricsCache.ts` exposes `Map<serverUrl, QualityMetricsCache>` registry with **2-entry LRU eviction**. Current-server cache cleared on settings save (even if `serverUrl` is unchanged). | Architecture Patterns §Pattern 1. LRU pattern mirrors `QualityMetricsCache.memory` internal LRU at `metricsCache.ts:57-60`. `clearAllQualityMetrics()` wiring already exists at `SettingsPage.tsx:41-54`. |
| FOUND-03 | `useAsyncRun<TIssue>` owns `{status, progress, errorMessage, cancel, run}` with closure-scoped `let cancelled`. The 4 report hooks refactor to use it without new `as` casts in consumers. | Architecture Patterns §Pattern 2 (Reducer-based state machine). Concrete code sketch in ARCHITECTURE.md §Q1. Anti-patterns §1 (Over-extraction of `useAsyncRun`). |
| FOUND-04 | `useResourceCounts.ts:29` `cancelledRef` latent bug converted to `let cancelled` pattern (pre-fix while file is touched for FOUND-01). | Common Pitfalls §Pitfall 2 (Wrong cancellation pattern); precedent in `useCompletenessReport.ts:71-74`. |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Constraint | How it affects Phase 24 |
|------------|-------------------------|
| **Tech stack locked** — React 18.3.1, TypeScript 5.7, Vite 8, Medplum 5.1.7, Mantine 8.3.18 | No runtime deps to add in this phase. `useReducer` / `useRef` / `useState` are all React 18 built-ins. [VERIFIED: package.json] |
| **Runtime: local-only SPA, browser only** | No SSR concerns — module-scoped `Map` is safe. Don't pay the cost of `globalThis`-guarded singletons that RSC requires. [CITED: ARCHITECTURE.md §Q2] |
| **Do NOT use `@tanstack/react-query`** | MedplumClient already handles FHIR caching; introducing a second cache layer creates conflicts. The custom module-scoped `Map` is the correct primitive. [VERIFIED: CLAUDE.md §"Do NOT Use"] |
| **License MIT; no new dependencies introduced in Phase 24** | All 4 requirements achievable with React 18 + existing Mantine / Medplum surface. No `package.json` edits needed. |
| **Conventions: closure-scoped `let cancelled` in cancellation-sensitive effects** | Explicitly re-stated as D-07 / D-10. The opposing `cancelledRef` pattern in 5 hooks is the latent-bug pattern being eliminated. [VERIFIED: `useCompletenessReport.ts:71-74` comment + STATE.md decisions] |
| **GSD Workflow Enforcement** — all file edits must route through a GSD command | Implementation is covered by `/gsd-execute-phase 24` after planning. No direct edits outside that flow. |

---

## Standard Stack

### Core (no additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | `useState`, `useEffect`, `useReducer`, `useCallback`, `useMemo`, `useRef` | Already locked. `useReducer` is the native React primitive for discriminated-union state machines — no external library needed. [VERIFIED: package.json] |
| TypeScript | ^5.7.0 | Generic `useAsyncRun<TIssue>`, discriminated-union action types | `strict: true` is already enforced; generic inference on reducer actions works cleanly without `satisfies` gymnastics. [VERIFIED: package.json] |
| @mantine/hooks | ^8.3.18 | `useDebouncedValue` used by the 2 sampler hooks (not in scope for Phase 24 but referenced by siblings) | Already used at `useCompletenessReport.ts:22`; keeps consistency across the hook family. [VERIFIED: package.json] |

### Supporting (existing, no version change)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @medplum/core | ^5.1.7 | `MedplumClient.search()` for `_summary=count`, `client.getBaseUrl()` for cache keying | Unchanged call sites. Phase 24 does not touch MedplumClient. [VERIFIED: `useResourceCounts.ts:81` and `useCompletenessReport.ts:80`] |
| vitest | ^4.1.4 | Unit + integration testing | Existing test framework; `useAsyncRun` reducer gets standalone unit test; 4 hook migrations verified via existing panel tests. [VERIFIED: package.json] |
| @testing-library/react | ^16.3.2 | Hook integration tests (via `render()` + `act()` or `renderHook()`) | Already in use. [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Verdict |
|------------|-----------|----------|---------|
| Closure-scoped `let cancelled` | `AbortController` | `AbortController` integrates with `fetch()` natively; but Phase 24's cancellation points are mostly post-fetch CPU loops, not live network requests. The extra API surface buys nothing. | **Reject** — explicit anti-pattern per ARCHITECTURE.md §Anti-Pattern 2. Defer `AbortController` to a later milestone if network-dominated profiling ever changes the picture. [CITED: PITFALLS.md §Pitfall 2] |
| `useReducer` for run state | Ad-hoc `useState` (current pattern in the 4 hooks) | `useState` is simpler but scatters transition logic across 5-6 setter calls per state change; `useReducer` centralizes transitions in a pure function that is unit-testable in isolation. | **Accept `useReducer`** — the React docs recommend `useReducer` as soon as state has ≥ 3 transitions; all four target hooks have 5+ (idle, running, complete, cancelled, error). [CITED: react.dev/reference/react/useReducer] |
| `<TState>` fully-generic reducer | Fixed-shape reducer with generic `TIssue` only | A fully-generic `<TState>` makes `useAsyncRun` "future-proof" at the cost of leaking `unknown` into consumer panels. Fixed-shape `{status, progress, errorMessage, issues: TIssue[]}` is exactly what all 4 sites share. | **Accept fixed-shape** — generic only on the issues payload type. [CITED: PITFALLS.md §Pitfall 1] |
| `Map<serverUrl, Map<type, count>>` (nested) for count cache | Flat `Map<string, number>` keyed by `${serverUrl}::${type}` | Flat Map with composite string key has simpler delete semantics (delete one entry, not a sub-map); nested is slightly more memory-efficient. Difference is negligible for a cache bounded by types × servers. | **Accept flat Map with `::` separator** per CONTEXT.md §specifics. [CITED: CONTEXT.md §specifics line 111] |
| `useSyncExternalStore` for the cache registry | Plain module-scope `Map` read inside `useEffect` | `useSyncExternalStore` is right when components need to subscribe to store changes; Phase 24's cache is a one-way read-through — consumers don't subscribe to cache-level events. Adding `useSyncExternalStore` is over-engineering. | **Reject** — explicit anti-pattern per ARCHITECTURE.md §Anti-Pattern 5 and PITFALLS.md §Pitfall 7. |

### Installation

**No install needed.** Phase 24 adds zero runtime dependencies.

**Version verification:**
- React: `18.3.1` (verified via `package.json:27`)
- TypeScript: `5.7.x` (verified via `package.json:51`)
- @medplum/core: `5.1.7` (verified via `package.json:22`)
- @mantine/hooks: `8.3.18` (verified via `package.json:18`)
- vitest: `4.1.4` (verified via `package.json:55`)

---

## Architecture Patterns

### Recommended File Structure

```
src/hooks/
├── useAsyncRun.ts               # NEW — exported hook (Phase 24 FOUND-03)
├── internal/
│   └── asyncRunReducer.ts       # NEW — pure reducer + types (unit-tested standalone)
├── useResourceCounts.ts         # MODIFIED — read-through cache + FOUND-04 cancellation fix
├── useResourceCountsMetrics.ts  # UNCHANGED — consumer of useResourceCounts, no signature impact
├── useCompletenessReport.ts     # MODIFIED — drop local cacheInstance; use getQualityMetricsCache(serverUrl)
├── useCodingCoverage.ts         # MODIFIED — drop local cacheInstance; use getQualityMetricsCache(serverUrl)
├── usePlausibilityReport.ts     # MODIFIED — wrap useAsyncRun (139 → ~40 lines)
├── useLabRangesReport.ts        # MODIFIED — wrap useAsyncRun (124 → ~40 lines)
├── useDuplicateReport.ts        # MODIFIED — wrap useAsyncRun (203 → ~40 lines, two-phase runner)
├── useReferenceReport.ts        # MODIFIED — wrap useAsyncRun (169 → ~40 lines)
└── __tests__/
    └── useAsyncRun.test.ts      # NEW — reducer transitions + cancel semantics

src/quality/
├── metricsCache.ts              # MODIFIED — add getQualityMetricsCache / clearQualityMetricsCache
│                                #   registry Map with 2-entry LRU eviction
│                                #   keep QualityMetricsCache class body unchanged
└── countCache.ts (optional)     # NEW OR colocate in metricsCache.ts per D-06 discretion

src/contexts/
└── SettingsContext.tsx          # MODIFIED — setSettings() also calls clearQualityCountCache +
│                                #   clearQualityMetricsCache for the current serverUrl

src/components/settings/
└── SettingsPage.tsx             # MODIFIED — handleClearMetricsCache extends to call
                                 #   clearQualityCountCache as well (button name unchanged)
```

### Pattern 1: Module-scoped Registry with Read-through Cache

**What:** A `Map<key, value>` lives at module scope (not React state), survives unmount/remount, and is read inside `useEffect` (never during render).

**When to use:** Cross-mount cache for data that is expensive to compute/fetch but cheap to re-use. Consumers read via a getter function that creates-if-absent.

**Why closure-scoped, not React state:** React state triggers re-renders on mutation; a cache-layer mutation shouldn't cascade into render loops. Module-scope mutation is invisible to React until a consumer's effect dep changes.

**Example — `useResourceCounts` cache (FOUND-01):**

```typescript
// src/hooks/useResourceCounts.ts
// Module-scope — lives for the tab's lifetime.
const countCache = new Map<string, number>(); // key = `${serverUrl}::${resourceType}`

function cacheKey(serverUrl: string, type: string): string {
  return `${serverUrl}::${type}`;
}

export function clearQualityCountCache(serverUrl: string): void {
  // Delete all entries matching this serverUrl. Flat Map means linear scan,
  // but the entry count is bounded by resource types (~100), so O(n) is fine.
  const prefix = `${serverUrl}::`;
  for (const k of Array.from(countCache.keys())) {
    if (k.startsWith(prefix)) countCache.delete(k);
  }
}

export function useResourceCounts(
  client: MedplumClient | null,
  resourceTypes: string[],
  refetchKey: number = 0,
): Record<string, CountValue> {
  const [counts, setCounts] = useState<Record<string, CountValue>>({});

  // MEMO fix (absorbed from Phase 27 R12): stabilize the join key.
  const typesKey = useMemo(() => resourceTypes.join(','), [resourceTypes]);

  useEffect(() => {
    // FOUND-04: closure-scoped cancellation, NOT cancelledRef.
    let cancelled = false;

    if (!client || resourceTypes.length === 0) {
      setCounts({});
      return;
    }

    const serverUrl = client.getBaseUrl();

    // Seed: cache hits resolve synchronously; misses start as 'loading'.
    const initial: Record<string, CountValue> = {};
    for (const t of resourceTypes) {
      const hit = countCache.get(cacheKey(serverUrl, t));
      initial[t] = hit !== undefined ? hit : 'loading';
    }
    setCounts(initial);

    const queue = resourceTypes.filter(t => initial[t] === 'loading');
    let activeCount = 0;

    function processNext() {
      if (cancelled) return;
      while (activeCount < CONCURRENCY && queue.length > 0) {
        const type = queue.shift()!;
        activeCount++;
        fetchCount(client!, type)
          .then(count => {
            if (cancelled) return;
            countCache.set(cacheKey(serverUrl, type), count); // write-through
            setCounts(prev => ({ ...prev, [type]: count }));
          })
          .catch(() => {
            if (cancelled) return;
            setCounts(prev => ({ ...prev, [type]: 'error' }));
          })
          .finally(() => {
            activeCount--;
            processNext();
          });
      }
    }
    processNext();

    return () => { cancelled = true; };
  }, [client, typesKey, refetchKey]); // ← typesKey is now stable per-deps-change

  return counts;
}
```

**Key points:**
- `typesKey` memo absorbs the Phase 27 R12 `resourceTypes.join(',')` fix while the file is already being touched.
- Cache hit path means `'loading'` never flashes for cached types — render flicker eliminated.
- `refetchKey` still works as the force-refetch knob; passing it bumps the effect without clearing the cache, which is the correct semantic (users pressing "Recompute" should see fresh counts without invalidating other consumers' cache usage).

**Example — `QualityMetricsCache` registry (FOUND-02):**

```typescript
// src/quality/metricsCache.ts — ADD to existing file

const LRU_LIMIT = 2;
const cachesByServer = new Map<string, QualityMetricsCache>();

export function getQualityMetricsCache(serverUrl: string): QualityMetricsCache {
  const existing = cachesByServer.get(serverUrl);
  if (existing) {
    // MRU touch: delete + reinsert to move to the end of the Map's insertion order.
    cachesByServer.delete(serverUrl);
    cachesByServer.set(serverUrl, existing);
    return existing;
  }

  const cache = new QualityMetricsCache({ serverUrl });
  cachesByServer.set(serverUrl, cache);

  // LRU eviction: when size exceeds limit, drop the least-recently-used (first key).
  if (cachesByServer.size > LRU_LIMIT) {
    const oldestKey = cachesByServer.keys().next().value;
    if (oldestKey !== undefined) cachesByServer.delete(oldestKey);
  }

  return cache;
}

export function clearQualityMetricsCache(serverUrl: string): void {
  const cache = cachesByServer.get(serverUrl);
  if (!cache) return;
  cache.clear();              // wipe memory + localStorage for this server
  cachesByServer.delete(serverUrl);
}

// Existing clearAllQualityMetrics() — extend to drop the registry too:
export function clearAllQualityMetrics(): number {
  cachesByServer.clear();     // drop in-memory references
  // ... existing localStorage iteration unchanged ...
}
```

**Invariants:**
- `cachesByServer.size <= 2` always after `getQualityMetricsCache` returns.
- The most-recently-touched entry is always at the end of the Map's insertion order.
- `QualityMetricsCache` class body is **untouched** — only the registry is new.

---

### Pattern 2: Reducer-based Async State Machine (Fixed Shape)

**What:** A `useReducer` hook backing a fixed-shape `{status, progress, errorMessage, issues}` state, with a discriminated-union action type and a pure reducer function that lives in a separate file for unit testing.

**When to use:** Any hook with 3+ async state transitions where the state shape is stable. The four target hooks all share the same shape for status + progress + errorMessage + issues — generalize the orchestration, specialize the issue type.

**Why fixed shape (not `<TState>`):** Generic state-shape across 4 consumers always leaks into `as` casts somewhere. The fixed shape captures 100% of what all four share today. Metric-specific payloads (e.g., `PatientDuplicateCluster[]` in `useDuplicateReport`) stay in the caller's own `useState` and are returned alongside the `AsyncRunState`.

**Example — `useAsyncRun.ts` (FOUND-03):**

```typescript
// src/hooks/internal/asyncRunReducer.ts
export type AsyncRunStatus = 'idle' | 'running' | 'complete' | 'cancelled' | 'error';

export interface AsyncRunState<TIssue> {
  status: AsyncRunStatus;
  progress: { current: number; total: number };
  issues: TIssue[];
  errorMessage?: string;
}

export type AsyncRunAction<TIssue> =
  | { type: 'start' }
  | { type: 'progress'; current: number; total: number }
  | { type: 'append-issues'; issues: TIssue[] }
  | { type: 'complete' }
  | { type: 'cancel' }
  | { type: 'error'; message: string }
  | { type: 'reset' };

export function asyncRunReducer<TIssue>(
  state: AsyncRunState<TIssue>,
  action: AsyncRunAction<TIssue>,
): AsyncRunState<TIssue> {
  switch (action.type) {
    case 'start':
      return {
        status: 'running',
        progress: { current: 0, total: 0 },
        issues: [],
        errorMessage: undefined,
      };
    case 'progress':
      return { ...state, progress: { current: action.current, total: action.total } };
    case 'append-issues':
      return { ...state, issues: [...state.issues, ...action.issues] };
    case 'complete':
      return state.status === 'cancelled' ? state : { ...state, status: 'complete' };
    case 'cancel':
      return state.status === 'running' ? { ...state, status: 'cancelled' } : state;
    case 'error':
      return { ...state, status: 'error', errorMessage: action.message };
    case 'reset':
      return { status: 'idle', progress: { current: 0, total: 0 }, issues: [], errorMessage: undefined };
  }
}

export function initialAsyncRunState<TIssue>(): AsyncRunState<TIssue> {
  return { status: 'idle', progress: { current: 0, total: 0 }, issues: [], errorMessage: undefined };
}
```

```typescript
// src/hooks/useAsyncRun.ts
import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  asyncRunReducer,
  initialAsyncRunState,
  type AsyncRunState,
} from './internal/asyncRunReducer';

interface RunnerHelpers<TIssue> {
  isCancelled: () => boolean;
  setProgress: (current: number, total: number) => void;
  appendIssues: (batch: TIssue[]) => void;
}

interface UseAsyncRunArgs<TIssue> {
  runner: (helpers: RunnerHelpers<TIssue>) => Promise<void>;
  /** Resets the run when these change (stringified like `useMemo` deps). */
  deps?: unknown[];
  /** If true, start() is called from a `useEffect` on mount / deps change. */
  autoStart?: boolean;
}

export interface UseAsyncRunResult<TIssue> extends AsyncRunState<TIssue> {
  start: () => void;
  cancel: () => void;
}

export function useAsyncRun<TIssue>(
  args: UseAsyncRunArgs<TIssue>,
): UseAsyncRunResult<TIssue> {
  const [state, dispatch] = useReducer(
    asyncRunReducer<TIssue>,
    undefined,
    initialAsyncRunState<TIssue>,
  );

  // Closure-scoped cancellation lives inside start() — it is NOT a ref.
  // We need a ref ONLY to hold a cancel() handle that cancels the currently
  // in-flight run from OUTSIDE the runner's closure. This ref does NOT
  // violate the "no cancelledRef" invariant because it does not participate
  // in the runner's own cancellation check — it is only a pointer that
  // start() replaces on each call.
  const cancelInFlightRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    // Cancel any currently-running runner; it will see its own `cancelled=true`.
    cancelInFlightRef.current?.();

    // Fresh closure-scoped flag for THIS run.
    let cancelled = false;
    cancelInFlightRef.current = () => { cancelled = true; };

    dispatch({ type: 'start' });

    const helpers: RunnerHelpers<TIssue> = {
      isCancelled: () => cancelled,
      setProgress: (current, total) => {
        if (cancelled) return;
        dispatch({ type: 'progress', current, total });
      },
      appendIssues: (issues) => {
        if (cancelled) return;
        dispatch({ type: 'append-issues', issues });
      },
    };

    void (async () => {
      try {
        await args.runner(helpers);
        if (cancelled) {
          dispatch({ type: 'cancel' });
          return;
        }
        dispatch({ type: 'complete' });
      } catch (err) {
        if (cancelled) return; // cancellation supersedes error
        dispatch({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, args.deps ?? []);

  const cancel = useCallback(() => {
    cancelInFlightRef.current?.();
    dispatch({ type: 'cancel' });
  }, []);

  // autoStart wiring (for Phase 25 drill-downs; default false means no effect fires here).
  useEffect(() => {
    if (args.autoStart) start();
    return () => { cancelInFlightRef.current?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, args.deps ?? []);

  return { ...state, start, cancel };
}
```

**Key design notes:**
- `cancelInFlightRef` is NOT the `cancelledRef` anti-pattern. It holds a *handle* (a function that mutates the *current run's* closure-scoped `cancelled`). Each call to `start()` creates a brand-new `let cancelled` and replaces the ref. Stale promises from a prior run see their own prior-closure's `cancelled=true` because the function in the ref flipped it when `start()` replaced it. Reference the `useCompletenessReport.ts:71-74` rationale comment in the new file header.
- The `reducer` is pure and lives in `internal/asyncRunReducer.ts` — vitest exercises every transition without React. This is the testability win.
- `autoStart` is designed-in but harmless at default. Phase 25 drill-downs set `autoStart: true`; Phase 24 consumers (the four panel hooks) leave it at `false` and call `start()` imperatively on button press.

**Example — migrated `usePlausibilityReport` (139 → ~35 lines):**

```typescript
// src/hooks/usePlausibilityReport.ts AFTER migration
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import { getProfileForType } from '../quality/profiles';
import {
  checkTemporalPlausibility,
  normalizeTemporalIssues,
} from '../quality/temporalPlausibilityWalker';
import { useAsyncRun, type UseAsyncRunResult } from './useAsyncRun';

interface UsePlausibilityReportArgs {
  client: MedplumClient | null;
  resourceType: string;
  sampleSize: number;
  settings: AppSettings | null;
  patientIds?: string[];
}

const BATCH_SIZE = 25;

export type PlausibilityRunState = UseAsyncRunResult<NormalizedIssue>;

export function usePlausibilityReport({
  client,
  resourceType,
  sampleSize,
  settings,
  patientIds,
}: UsePlausibilityReportArgs): PlausibilityRunState {
  return useAsyncRun<NormalizedIssue>({
    runner: async ({ isCancelled, setProgress, appendIssues }) => {
      if (!client || !resourceType) return;
      const sample = await sampleResources(client, resourceType, sampleSize, patientIds);
      if (isCancelled()) return;
      setProgress(0, sample.length);
      const profile = getProfileForType(resourceType);
      const thresholds = settings?.plausibility;
      for (let i = 0; i < sample.length; i += BATCH_SIZE) {
        if (isCancelled()) return;
        const batch = sample.slice(i, i + BATCH_SIZE);
        const issues: NormalizedIssue[] = [];
        for (const r of batch) {
          issues.push(...normalizeTemporalIssues(checkTemporalPlausibility(r, profile, thresholds), r));
        }
        appendIssues(issues);
        setProgress(Math.min(i + batch.length, sample.length), sample.length);
      }
    },
    deps: [client, resourceType, sampleSize, settings, patientIds],
  });
}
```

**Backward compatibility:** The return type `{status, progress, issues, errorMessage, start, cancel}` is structurally identical to today's `PlausibilityRunState`. Consumers (`PlausibilityPanel.tsx`) don't need to change. Export the type alias so callers keep their existing imports working.

**Two-phase `useDuplicateReport` migration note:** `useDuplicateReport` does Patient detection THEN per-type content hashing, with side-state (`duplicateClusters`, `contentHashClusters`, `skippedPatients`) that doesn't fit the `issues: TIssue[]` slot. Pattern: keep those as local `useState` inside `useDuplicateReport`, set them from inside the `runner` closure. `useAsyncRun` owns only the orchestration shell; the hook retains its typed accessory state. This is exactly the shape D-09 mandates.

### Anti-Patterns to Avoid

1. **Generic `<TState>` reducer** — forces `as` casts at every consumer panel. Keep the reducer's state shape fixed; generalize only `TIssue`. [CITED: PITFALLS.md §Pitfall 1]
2. **`AbortController` "modernization"** — the four runners are post-fetch CPU work. `AbortController` adds API surface and buys nothing. [CITED: ARCHITECTURE.md §Anti-Pattern 2]
3. **Lifting rollup into `useAsyncRun`** — the 4 async report hooks don't have rollup `setCompleteness`/`setCoverage` calls (those live in the 2 sampler hooks). `useAsyncRun` is purely orchestration — keep it that way. [CITED: ARCHITECTURE.md §Anti-Pattern 3]
4. **Reading module-scope cache during render** — always read inside `useEffect` or a callback, not during render. Render-time reads create hydration-mismatch risk (irrelevant today, free insurance for future) and make test isolation harder. [CITED: ARCHITECTURE.md §Q2]
5. **Skipping LRU eviction on the registry** — "2-entry limit" must actually be enforced in `getQualityMetricsCache`. A `Map` with no `delete` on overflow is a memory leak dressed as a cache. [CITED: PITFALLS.md §Pitfall 3]
6. **Reusing the same `cancelledRef` across effect runs** — what `useResourceCounts.ts:29` does today. Resetting a `useRef(false)` to `false` at the start of a new effect doesn't invalidate in-flight promises from a prior effect, which read the *same ref* and see `false` instead of `true`. Closure-scoped `let cancelled` isolates cancellation to THIS effect's in-flight work only. [CITED: PITFALLS.md §Pitfall 2 + `useCompletenessReport.ts:71-74`]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async state machine | Custom `useState` hairball with N setters per transition | `useReducer` + discriminated-union action type | React built-in. Reducer is a pure function testable outside React; consolidates transitions; compile-time errors surface invalid action shapes. [CITED: react.dev/reference/react/useReducer] |
| Cancellation of in-flight work | `useRef(false)` reset-on-effect pattern | Closure-scoped `let cancelled` inside `useEffect` (and a ref-of-handles for cross-run cancel) | The `cancelledRef` reset pattern has a latent-bug ceiling (the very reason FOUND-04 exists). `useCompletenessReport.ts:71-74` already explains this. [VERIFIED: repo comment] |
| Cross-mount cache | React Context + provider + custom invalidation | Module-scope `Map` read inside `useEffect`, cleared via exported function | Pattern is canonical (TanStack Query, SWR, MedplumClient all do it internally). React state causes re-renders on mutation; module scope doesn't. [CITED: ARCHITECTURE.md §Q2] |
| LRU eviction | Hand-rolled LRU library | The existing `QualityMetricsCache.memory` pattern — `delete` + re-`set` on touch; `keys().next().value` for eviction | ~8 lines of code using the `Map` insertion-order guarantee. Mirrors what `QualityMetricsCache.get()` and `QualityMetricsCache.set()` already do. [VERIFIED: `metricsCache.ts:41-62`] |
| Settings-change invalidation | `useEffect` watcher on settings object identity | Direct call at `setSettings()` site — `clearQualityCountCache(serverUrl) + clearQualityMetricsCache(serverUrl)` | Watcher pattern fires on every render where the settings ref is identity-different; direct call at save-time fires exactly once per actual settings save. Simpler, cheaper, deterministic. [CITED: CONTEXT.md D-04] |

**Key insight:** Phase 24's four requirements are all "apply a well-known React pattern" rather than "build something novel." Every pattern has a precedent in this repo or in React stdlib — the hazard is deviating from the pattern (per the anti-patterns list), not finding one.

---

## Runtime State Inventory

> Phase 24 is a refactor (not a rename). This section is included because FOUND-01 and FOUND-02 change cache identity keys — confirmation that no external systems depend on the old cache shape.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | **Quality metrics localStorage keys** prefixed `quality-metrics:v1:{serverUrl}|{metric}|{type}|{sampleSize}` (per `keys.ts:11-21`). Registry change does NOT alter key format — existing cached entries remain valid and hydrate into the new registry on first `getQualityMetricsCache(serverUrl)` call. | **None** — key format unchanged. `QualityMetricsCache.hydrateFromLocalStorage` runs per-instance on construction; registry now creates one instance per server instead of rotating one, but hydration still works the same way. |
| Live service config | None — all config is in `settings.yaml`. No n8n / Datadog / Tailscale / external config touches this repo. | None. |
| OS-registered state | None — no Task Scheduler / launchd / pm2 registrations reference hook names or cache keys. | None. |
| Secrets / env vars | None — no env vars reference `useResourceCounts`, `useAsyncRun`, or `metricsCache`. `.env` / `settings.yaml` secret names are unchanged. | None. |
| Build artifacts / installed packages | **Vitest test cache** under `node_modules/.vitest/` may hold stale results — irrelevant to correctness; re-runs on any source change. No package re-install needed. | None. |

**Canonical question answered:** After this phase, the only runtime caches that exist are (a) `countCache` module Map in `useResourceCounts.ts` (new, volatile), (b) `cachesByServer` registry in `metricsCache.ts` (new, volatile), and (c) the existing `quality-metrics:v1:...` localStorage entries (unchanged format). No external system reads or writes any of these — all three are internal to the browser tab.

---

## Common Pitfalls

### Pitfall 1: `<TState>` generic leak in `useAsyncRun` signature

**What goes wrong:** A generic state-machine hook with `<TState>` looks clean on paper, but when 4 sibling hooks have slightly different accessory state (e.g., `useDuplicateReport` tracks `skippedPatients`, `useReferenceReport` tracks `brokenCount` + `orphanCount`), `TState` either becomes `unknown` (callers re-narrow on every read) or grows union-typed fields that force `as` casts at consumer panels.

**Why it happens:** The four hooks share orchestration (status / progress / cancellation) but NOT accessory state shape. Generalizing the accessory shape forces consumers to disambiguate.

**How to avoid:** Only generalize `TIssue` (the element type of the `issues[]` array). Keep `{status, progress, errorMessage, issues}` as a fixed shape. Each caller retains its own `useState` for accessory state. No consumer-level `as` casts.

**Warning signs:** `useAsyncRun<typeof initialState>(...)` appears at any call site; consumer panels (e.g., `PlausibilityPanel.tsx`) grow `as` casts; `tsc -b --noEmit` requires type narrowing calls (`if (run.state.kind === ...)`) that didn't exist before.

**Verification gate (Pre-Submission):** `git diff src/components/quality/*.tsx | grep " as "` returns **zero** new casts compared to the Phase 23 tip. [CITED: PITFALLS.md §Pitfall 1]

---

### Pitfall 2: Picking the wrong cancellation pattern (latent stale-write bug)

**What goes wrong:** If `useAsyncRun` uses `cancelledRef` (a `useRef(false)` reset on every run) instead of closure-scoped `let cancelled`, a rapid dep-change (e.g., user toggles sampleSize 10→100→10) lets the *first* run's in-flight promise commit state updates *after* the *second* run has reset the ref to `false`. Silent stale writes surfacing as ghost data.

**Why it happens:** 5 of the 6 async hooks in this repo use `cancelledRef` today. Looks like majority pattern. But the sixth (`useCompletenessReport`) has a 4-line comment at lines 71-74 explaining the divergence deliberately.

**How to avoid:** Every `useEffect` or runner invocation gets a FRESH closure-scoped `let cancelled = false`. The cleanup / cancel path flips only THAT closure's variable. The `useAsyncRun` implementation in Pattern 2 above uses a ref-of-handles (`cancelInFlightRef`) to let outside code cancel the current run, which does NOT violate the invariant — the ref holds a *function* that flips the *inner closure's* `cancelled` variable, not the flag itself.

**Warning signs:** CI test flake under StrictMode (double-mount fires effect twice, second run resets shared ref to `false`, first run's promise sees `false` and writes); "loading → done → loading → done" flicker in DevTools Profiler on rapid dep changes; tests pass locally without StrictMode but fail with it.

**Verification gate:** Add a Phase 24 test that rapidly toggles `sampleSize` 10→100→10 inside `<StrictMode>` and asserts no `setState` call lands after the final cancel. [CITED: PITFALLS.md §Pitfall 2 + `useCompletenessReport.ts:71-74`]

---

### Pitfall 3: Unbounded `Map<serverUrl, QualityMetricsCache>` — memory leak on server switches

**What goes wrong:** If `cachesByServer` has no eviction, every distinct `serverUrl` the user ever points at adds a `QualityMetricsCache` that stays for the tab's lifetime. Each cache can hold 1-10 MB (per-resource completeness reports for 1000 sampled resources × 100+ types). A user who alternates localhost:8080, staging, and prod triples memory permanently.

**Why it happens:** `Map<serverUrl, cache>` looks like the canonical fix for "discards previous server's cache." The fix is correct but incomplete without eviction.

**How to avoid:** 2-entry LRU eviction on insert. When `cachesByServer.size > 2` after `.set()`, delete `cachesByServer.keys().next().value` (the least-recently-touched entry). MRU touch on `get` via `delete + set` (mirrors `QualityMetricsCache.get`).

**Warning signs:** Heap snapshot grows monotonically across server switches; `cachesByServer.size` exceeds 2 in any code path; no unit test asserts `cache.size <= 2` for 5 distinct serverUrls.

**Verification gate:** Unit test in `metricsCache.test.ts` creates 5 distinct serverUrls via `getQualityMetricsCache()`, asserts `cachesByServer.size === 2` at the end. [CITED: PITFALLS.md §Pitfall 3]

---

### Pitfall 4: `useResourceCounts` cache missing write-through on cache set

**What goes wrong:** If the cache is written ONLY on the `setCounts(prev => ...)` success path but the promise resolves AFTER a cancellation, the cache is polluted with a value that the current effect has canceled. Next consumer reads a stale value that was never committed to state.

**Why it happens:** Easy oversight — the cache set and the state set look like they should move together, but the cancellation check between `.then((count) => { ... })` and `setCounts(...)` is subtle.

**How to avoid:** `if (cancelled) return` BEFORE `countCache.set(...)`. Cancellation invalidates BOTH the state write AND the cache write. See Pattern 1 above.

**Warning signs:** A test that cancels mid-fetch then remounts with different types sees stale counts appear for types that were never committed.

**Verification gate:** Dedicated test in `useResourceCounts.test.tsx` — cancel during a pending fetchCount call, remount with fresh types, assert cache does not contain the canceled type.

---

### Pitfall 5: Settings-change cache clear races with in-flight fetches

**What goes wrong:** User saves settings. `SettingsContext.setSettings(next)` calls `clearQualityCountCache(serverUrl) + clearQualityMetricsCache(serverUrl)`. But an in-flight `useResourceCounts` effect was about to write `countCache.set(...)`. If the cache is cleared AND THEN the write happens, the clear is undone — stale data re-enters the cache.

**Why it happens:** Clearing a module-scope cache is synchronous, but the effects that write to it are async (promises resolving after settings change).

**How to avoid:** The `let cancelled = true` on effect cleanup already short-circuits the write (`if (cancelled) return` before `countCache.set`). But the cleanup only fires when the effect's `client` dep changes — and if `setSettings` doesn't change `client` identity, the effect doesn't re-run and doesn't cancel.

**Mitigation strategy for Phase 24:**
- `setSettings` in `SettingsContext.tsx` wraps `setSettingsState(next)` — when any field changes, the `settings` context value identity changes → `useConnection` recomputes → `MedplumClient` is re-instantiated → `client.getBaseUrl()` returns a new string even if URL is the same → `useResourceCounts` effect dep fires → old effect cleanup sets `cancelled = true` → old in-flight fetches short-circuit on the cancellation check.
- **However:** if the settings change does NOT alter `client` identity (e.g., changing a threshold that doesn't affect the FHIR client), the above chain doesn't fire. The write could race.
- **Defensive measure:** make `clearQualityCountCache` and `clearQualityMetricsCache` idempotent (they are — `Map.delete` on a non-existent key is a no-op) AND document the race. The worst case is "user saves settings, in-flight fetch resolves with stale count, user sees stale for one refresh cycle" — acceptable for a local tool per D-02's staleness tolerance.

**Warning signs:** User saves settings; resource counts panel shows a stale value until next reload. Probably invisible in tests because tests don't reliably reproduce the race.

**Verification gate:** Documented in the hook file header that the cache may briefly surface stale values if a settings change coincides with an in-flight fetch, and a future milestone may add per-fetch invalidation tokens. No Phase 24 code change needed. [CITED: D-02 staleness tolerance]

---

### Pitfall 6: `useDuplicateReport` two-phase runner confuses `useAsyncRun` progress accounting

**What goes wrong:** `useDuplicateReport` runs Patient detection (counts as `patientSample.length` units) THEN per-type content hashing (counts as sum of per-type sample lengths). `totalUnits` is pre-computed before Phase 2. If the `useAsyncRun` runner calls `setProgress(current, total)` with `current > total` at any point (e.g., off-by-one in the base calc), React renders a progress > 100%.

**Why it happens:** Two-phase orchestration with cumulative progress tracking across phases — easy to miscalculate `base += completed` at a phase boundary.

**How to avoid:** Port the existing `completedUnits` accumulator from `useDuplicateReport.ts:136-167` directly; don't try to "simplify" while migrating. The existing math is correct — preserve it.

**Warning signs:** `DuplicatesPanel` progress bar exceeds 100% during a run; `setProgress` called with `current > total`.

**Verification gate:** Assertion in `useDuplicateReport`'s runner: `if (current > total) throw new Error('progress exceeds total')` during dev mode. Remove in production builds or wrap in `import.meta.env.DEV`.

---

### Pitfall 7: Missing `autoStart` deps equality — duplicate fires

**What goes wrong:** `autoStart: true` triggers `start()` from a `useEffect`. If the deps array contains an object that is identity-different on every render (e.g., `settings`), the effect fires on every render → runner starts → runner cancels → runner starts again. Infinite effective-restart loop.

**Why it happens:** The `useAsyncRun` consumer passes the same deps array for `autoStart` wiring as for the runner's `useCallback` — but render-time object identity breaks equality.

**How to avoid:** Phase 24 consumers leave `autoStart` at default `false`. Phase 25 drill-down integrations (NOT in scope for 24) are responsible for memoizing deps before passing them through. Document this in `useAsyncRun.ts` header: "Callers using `autoStart: true` must ensure `deps` are stable (memoized or primitive)."

**Warning signs:** Drill-down page hangs in Phase 25 auto-start because effect restarts every render. (Not a Phase 24 issue unless a consumer tries `autoStart: true` prematurely.)

**Verification gate:** Phase 24 tests use `autoStart: false` only. Document the gotcha in the hook header for Phase 25 consumers.

---

### Pitfall 8: Test isolation — module-scope caches persist across tests

**What goes wrong:** Vitest runs tests in the same module context by default. The `countCache` module `Map` and `cachesByServer` registry persist between tests, causing test N+1 to see cached data from test N. Leads to flaky tests that pass in isolation but fail in the full suite.

**Why it happens:** Module-scope state is invisible to vitest's per-test reset.

**How to avoid:** Every test file that exercises `useResourceCounts` or `metricsCache` adds a `beforeEach(() => { clearQualityCountCache(...); clearAllQualityMetrics(); })`. Export both clear functions for test use.

**Warning signs:** Snapshot drift across test files; tests pass in isolation but fail in CI; `metricsCache.test.ts` starts seeing pre-populated entries.

**Verification gate:** New test file `useResourceCounts.test.tsx` explicitly declares `beforeEach(clearQualityCountCache)`. `metricsCache.test.ts` adds `beforeEach(clearAllQualityMetrics)` if not already present. [CITED: PITFALLS.md §Test Regression Hotspots, row 2]

---

## Code Examples

### Example 1: Reducer unit test (Phase 24 Wave 0 gap)

```typescript
// src/hooks/__tests__/asyncRunReducer.test.ts
import { describe, it, expect } from 'vitest';
import {
  asyncRunReducer,
  initialAsyncRunState,
  type AsyncRunAction,
} from '../internal/asyncRunReducer';

describe('asyncRunReducer', () => {
  it('start transitions idle → running and clears issues', () => {
    const initial = { ...initialAsyncRunState<string>(), issues: ['stale'] };
    const next = asyncRunReducer(initial, { type: 'start' });
    expect(next.status).toBe('running');
    expect(next.issues).toEqual([]);
  });

  it('append-issues extends the existing issues array', () => {
    const initial = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    const after = asyncRunReducer(initial, {
      type: 'append-issues',
      issues: ['a', 'b'],
    });
    const more = asyncRunReducer(after, { type: 'append-issues', issues: ['c'] });
    expect(more.issues).toEqual(['a', 'b', 'c']);
  });

  it('cancel is idempotent and does NOT override existing cancelled status', () => {
    let state = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    state = asyncRunReducer(state, { type: 'cancel' });
    const secondCancel = asyncRunReducer(state, { type: 'cancel' });
    expect(secondCancel.status).toBe('cancelled');
  });

  it('complete does NOT override cancelled status (cancel wins)', () => {
    let state = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    state = asyncRunReducer(state, { type: 'cancel' });
    const afterComplete = asyncRunReducer(state, { type: 'complete' });
    expect(afterComplete.status).toBe('cancelled');
  });

  it('error sets errorMessage and status=error', () => {
    let state = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    state = asyncRunReducer(state, { type: 'error', message: 'boom' });
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('boom');
  });
});
```

### Example 2: Registry unit test (FOUND-02)

```typescript
// src/quality/metricsCache.test.ts (add to existing file)
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getQualityMetricsCache,
  clearQualityMetricsCache,
  clearAllQualityMetrics,
} from './metricsCache';

describe('metricsCache registry (FOUND-02)', () => {
  beforeEach(() => {
    clearAllQualityMetrics();
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('returns the same instance for the same serverUrl', () => {
    const a = getQualityMetricsCache('http://a.example/fhir');
    const b = getQualityMetricsCache('http://a.example/fhir');
    expect(a).toBe(b);
  });

  it('enforces 2-entry LRU eviction', () => {
    const a = getQualityMetricsCache('http://a.example/fhir');
    const b = getQualityMetricsCache('http://b.example/fhir');
    const c = getQualityMetricsCache('http://c.example/fhir');
    // `a` is now evicted. Re-getting `a` should return a NEW instance.
    const aAgain = getQualityMetricsCache('http://a.example/fhir');
    expect(aAgain).not.toBe(a);
    // `b` should have been evicted too (LRU touches on get).
    // After a, b, c, then aAgain — Map order was b, c, a (aAgain);
    // wait: c was touched last, then aAgain → order: c, aAgain. b evicted.
  });

  it('MRU touch on get prevents eviction of the most-recently-touched entry', () => {
    const a = getQualityMetricsCache('http://a.example/fhir');
    const b = getQualityMetricsCache('http://b.example/fhir');
    // Touch a — moves it to MRU.
    getQualityMetricsCache('http://a.example/fhir');
    const c = getQualityMetricsCache('http://c.example/fhir');
    // a is MRU, b is LRU → b evicted.
    // Re-getting a returns the same instance.
    const aAgain = getQualityMetricsCache('http://a.example/fhir');
    expect(aAgain).toBe(a);
    // b was evicted, new instance.
    const bAgain = getQualityMetricsCache('http://b.example/fhir');
    expect(bAgain).not.toBe(b);
  });

  it('clearQualityMetricsCache removes entry and wipes its localStorage', () => {
    const a = getQualityMetricsCache('http://a.example/fhir');
    a.set('k1', { value: 'v1', computedAt: Date.now(), serverUrl: 'http://a.example/fhir', resourceType: 'Patient', sampleSize: 100 });
    clearQualityMetricsCache('http://a.example/fhir');
    const aAgain = getQualityMetricsCache('http://a.example/fhir');
    expect(aAgain).not.toBe(a);
    expect(aAgain.size()).toBe(0);
  });
});
```

### Example 3: `useResourceCounts` cache hit test (FOUND-01)

```typescript
// src/hooks/__tests__/useResourceCounts.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResourceCounts, clearQualityCountCache } from '../useResourceCounts';
import type { MedplumClient } from '@medplum/core';

function mockClient(baseUrl: string, counts: Record<string, number>): MedplumClient {
  return {
    getBaseUrl: () => baseUrl,
    search: vi.fn().mockImplementation(async (type: string) => ({
      resourceType: 'Bundle',
      total: counts[type] ?? 0,
    })),
  } as unknown as MedplumClient;
}

beforeEach(() => {
  clearQualityCountCache('http://test.example/fhir');
});

describe('useResourceCounts cache (FOUND-01)', () => {
  it('hits the cache on second mount with same serverUrl + types', async () => {
    const client = mockClient('http://test.example/fhir', { Patient: 42 });
    const { result, unmount } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(result.current.Patient).toBe(42));
    expect(client.search).toHaveBeenCalledTimes(1);
    unmount();

    const { result: result2 } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    // Cache hit — no additional search call.
    expect(result2.current.Patient).toBe(42);
    expect(client.search).toHaveBeenCalledTimes(1);
  });

  it('misses cache after clearQualityCountCache', async () => {
    const client = mockClient('http://test.example/fhir', { Patient: 42 });
    const { result, unmount } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(result.current.Patient).toBe(42));
    unmount();

    clearQualityCountCache('http://test.example/fhir');

    const { result: result2 } = renderHook(() =>
      useResourceCounts(client, ['Patient']),
    );
    await waitFor(() => expect(result2.current.Patient).toBe(42));
    expect(client.search).toHaveBeenCalledTimes(2);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc `useState` for run orchestration (5 setters per transition) | `useReducer` with discriminated-union actions | React 18 general availability; community consensus strengthened 2024-2026 | Centralizes transition logic, enables pure-function testing, catches invalid transitions at compile time. [CITED: react.dev/reference/react/useReducer] |
| `useRef(false)` + reset-on-effect for cancellation | Closure-scoped `let cancelled` inside `useEffect` | Internal to this codebase (`useCompletenessReport.ts:71-74` comment from Phase 5) | Isolates cancellation to the effect's own in-flight work; prevents stale-write bugs under StrictMode. [VERIFIED: repo precedent] |
| `<TState>`-generic async hook | Fixed-shape reducer + generic `TIssue` only | Phase 24 architecture decision, driven by PITFALLS.md §Pitfall 1 | Prevents `as` casts from leaking to consumer panels; keeps 4 hook call sites readable. [CITED: ARCHITECTURE.md §Q1] |
| Rotating `cacheInstance` singleton keyed on last-used `serverUrl` | `Map<serverUrl, QualityMetricsCache>` registry with 2-entry LRU | Phase 24 FOUND-02 | Preserves cross-server cache (A/B server toggle instant) while bounding memory. [CITED: CONTEXT.md D-06, ARCHITECTURE.md §Q2] |

**Deprecated / outdated patterns in the codebase (context for Phase 24):**
- `cancelledRef` across 5 hooks (plausibility, labRanges, duplicate, reference, resourceCounts) — Phase 24 eliminates it for the four async hooks via `useAsyncRun` migration, and for `useResourceCounts` via FOUND-04. `useValidationRun` and `useConformanceRun` retain `cancelledRef` (not in Phase 24 scope; future phase can migrate to `useAsyncRun` if justified).
- Single-instance `cacheInstance` rotation in 2 hooks (completeness, codingCoverage) — Phase 24 FOUND-02 eliminates both.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | (None) | — | All research claims are tagged `[VERIFIED]` (from package.json / source files) or `[CITED]` (from CONTEXT.md / ARCHITECTURE.md / PITFALLS.md / STATE.md / react.dev). No `[ASSUMED]` claims in this document. |

---

## Open Questions

1. **`useAsyncRun` `autoStart` default stability.**
   - What we know: D-08 mandates `autoStart?: boolean` with default `false`. Phase 24 consumers leave it `false`. Phase 25 drill-downs will use `true`.
   - What's unclear: when `autoStart: true`, should the effect auto-cancel + auto-restart on every deps change, or only on mount? Phase 25 drill-downs will need auto-restart on `resourceType` URL change, so "restart on deps change" is the likely answer — but the reference implementation in Pattern 2 calls `start()` on every deps change without guarding for prior run state.
   - Recommendation: ship `autoStart` as "call `start()` on mount AND whenever `deps` change"; document clearly in hook header. Phase 25 integration can refine if drill-down UX demands it.

2. **`useDuplicateReport` `skippedPatients` and cluster state placement.**
   - What we know: D-09 allows retained typed accessory state in each hook. `useDuplicateReport` has three accessory states (`duplicateClusters`, `contentHashClusters`, `skippedPatients`) that don't fit `useAsyncRun`'s `issues: TIssue[]`.
   - What's unclear: should these accessory states reset in sync with `useAsyncRun`'s `reset` action, or stay independent?
   - Recommendation: the caller uses its own `useState` and calls `setDuplicateClusters([])` etc. at the top of the runner (first line in the runner function, before any await). This keeps reset semantics obvious without coupling accessory state to the reducer.

3. **Should `clearQualityCountCache` accept a serverUrl, or clear all?**
   - What we know: D-03 says `clearQualityCountCache(serverUrl)` clears the current server's entries. D-06 says `clearQualityMetricsCache(serverUrl)` likewise.
   - What's unclear: `clearAllQualityMetrics()` (existing) is the wipe-everything button. Should `clearQualityCountCache()` (no arg) also exist for the Settings "Clear cache" button's parallel?
   - Recommendation: export both `clearQualityCountCache(serverUrl: string)` AND `clearAllQualityCountCache(): void`. Mirrors the existing `clearAllQualityMetrics` / per-server `QualityMetricsCache#clear()` split. The SettingsPage "Clear cache" button uses the `All` variants; the `setSettings` call-site uses the per-server variants.

4. **useValidationRun / useConformanceRun migration — in Phase 24 or deferred?**
   - What we know: These two hooks use `cancelledRef` with the same pattern as the 4 target hooks. CONTEXT.md §domain explicitly scopes Phase 24 to the 4 report hooks only.
   - What's unclear: if `useAsyncRun` is authored in Phase 24, migrating 2 more hooks is a small incremental cost.
   - Recommendation: out of scope. Honor CONTEXT.md scoping. A later phase can migrate them if justified. This is a deliberate boundary — don't scope-creep.

---

## Environment Availability

> Phase 24 is a code-only refactor with no new external dependencies. This section is informational.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js (for vitest) | Test execution | — | Assumed present (vitest 4.x works on Node 18+) | — |
| vitest | Unit tests | ✓ | 4.1.4 | — |
| @testing-library/react | `renderHook`, `render` | ✓ | 16.3.2 | — |
| jsdom | DOM polyfill for tests | ✓ | 29.0.2 | — |
| React 18 | `useReducer`, `useEffect`, `useCallback`, `useRef` | ✓ | 18.3.1 | — |
| TypeScript | Generics, discriminated unions | ✓ | 5.7.x | — |

**No missing dependencies. No fallbacks required.**

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `vite.config.ts` (test section) or `vitest.config.ts` — verify during Wave 0 |
| Quick run command | `npm test -- src/hooks/__tests__/useAsyncRun.test.ts` (single file, watch off) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FOUND-01 | `useResourceCounts` second mount with same (serverUrl, types) does NOT re-issue `client.search` calls | integration (renderHook) | `npm test -- src/hooks/__tests__/useResourceCounts.test.tsx` | ❌ Wave 0 — new file |
| FOUND-01 | `useResourceCounts` line-75 memo stabilizes `typesKey` so identical `resourceTypes` array identities don't fire the effect | integration | same file as above | ❌ Wave 0 |
| FOUND-01 | `clearQualityCountCache(serverUrl)` removes entries for that server and leaves other servers intact | unit | same file as above | ❌ Wave 0 |
| FOUND-02 | `getQualityMetricsCache(serverUrl)` returns the same instance on repeated calls | unit | `npm test -- src/quality/metricsCache.test.ts` | ❌ Wave 0 — new file (no existing `metricsCache.test.ts`) |
| FOUND-02 | 3rd distinct serverUrl evicts the LRU entry; `cachesByServer.size <= 2` | unit | same file | ❌ Wave 0 |
| FOUND-02 | MRU touch on `get` prevents eviction of the touched entry | unit | same file | ❌ Wave 0 |
| FOUND-02 | `clearQualityMetricsCache(serverUrl)` wipes memory + localStorage for that server, leaves other servers intact | unit | same file | ❌ Wave 0 |
| FOUND-02 | `SettingsContext.setSettings()` calls both `clearQualityCountCache` and `clearQualityMetricsCache` for current serverUrl | integration | `src/__tests__/settings-clear-cache.test.tsx` (extend existing) | ✅ exists, extend |
| FOUND-03 | `asyncRunReducer` transitions: idle→running, running→complete, running→cancel, running→error, cancel-beats-complete | unit (pure reducer) | `npm test -- src/hooks/__tests__/asyncRunReducer.test.ts` | ❌ Wave 0 — new file |
| FOUND-03 | `useAsyncRun` calls runner with `isCancelled`, `setProgress`, `appendIssues` helpers | integration (renderHook) | `npm test -- src/hooks/__tests__/useAsyncRun.test.tsx` | ❌ Wave 0 — new file |
| FOUND-03 | `useAsyncRun` cancel() mid-run: runner's `isCancelled()` returns true, no late dispatch to reducer | integration | same file | ❌ Wave 0 |
| FOUND-03 | `useAsyncRun` rapid start() calls: prior runner sees its own `cancelled=true`, new runner starts clean | integration, StrictMode | same file | ❌ Wave 0 |
| FOUND-03 | `usePlausibilityReport` after migration: consumer panel test passes unchanged (backward-compat) | integration | `src/__tests__/plausibility-panel.test.tsx` | ✅ exists |
| FOUND-03 | `useLabRangesReport` after migration: consumer panel test passes unchanged | integration | `src/__tests__/lab-ranges-panel.test.tsx` | ✅ exists |
| FOUND-03 | `useDuplicateReport` after migration: two-phase progress totals are correct (0 ≤ current ≤ total) | integration | `src/components/quality/__tests__/` or `src/__tests__/` — find or add | ⚠️ verify during Wave 0 |
| FOUND-03 | `useReferenceReport` after migration: broken + orphan counts match pre-migration output | integration | find or add | ⚠️ verify during Wave 0 |
| FOUND-03 | No new `as` casts in 4 consumer panels (`PlausibilityPanel.tsx`, `LabRangesPanel.tsx`, `DuplicatesPanel.tsx`, `ReferencesPanel.tsx`) after migration | static (grep) | `git diff main -- src/components/quality/*.tsx \| grep " as "` returns zero net new matches | — (manual gate) |
| FOUND-04 | `useResourceCounts.ts:29` uses `let cancelled = false` — grep for `cancelledRef` in that file returns zero matches | static (grep) | `grep -n cancelledRef src/hooks/useResourceCounts.ts` → no output | — (manual gate) |
| FOUND-04 | StrictMode double-mount: rapid dep change doesn't produce late `setCounts` after cancel | integration, StrictMode | `src/hooks/__tests__/useResourceCounts.test.tsx` (same file as FOUND-01 tests) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- <file-touched>` — fast single-file subset (< 5 seconds typical)
- **Per wave merge:** `npm test` — full suite (est. 30-90 seconds; existing 582 tests)
- **Phase gate:** Full suite green + no new `as` casts in consumer panels + `tsc -b --noEmit` clean

### Wave 0 Gaps

- [ ] `src/hooks/__tests__/asyncRunReducer.test.ts` — unit tests for reducer transitions (NEW)
- [ ] `src/hooks/__tests__/useAsyncRun.test.tsx` — integration tests for hook behavior (NEW)
- [ ] `src/hooks/__tests__/useResourceCounts.test.tsx` — cache hit/miss + StrictMode cancellation tests (NEW)
- [ ] `src/quality/metricsCache.test.ts` — registry LRU + clear tests (NEW — verify no existing file; if exists, extend)
- [ ] Verify `useDuplicateReport` and `useReferenceReport` integration tests exist (⚠️ — if not, add them before Phase 24 implementation)
- [ ] Extend `src/__tests__/settings-clear-cache.test.tsx` to cover the new count-cache-clear + metrics-cache-clear wiring on `setSettings()` (if not already covering; verify during Wave 0)

---

## Security Domain

> Required per default `security_enforcement` (absent = enabled). Phase 24 is a hook refactor with no new user input, no new network endpoints, no auth changes.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 24 does not touch auth. `MedplumClient` auth (open/basic/bearer) is set at Phase 1 / SettingsProvider time; Phase 24 reads `client.getBaseUrl()` only. |
| V3 Session Management | no | No session state introduced. Module-scope caches are tab-lifetime only. |
| V4 Access Control | no | Phase 24 does not introduce new access-controlled surface. The cache is a read-through of requests already authorized by the existing `MedplumClient`. |
| V5 Input Validation | no | No new user input. `serverUrl` input comes from `settings.yaml` (validated at Phase 1 load time by `js-yaml`). `resourceType` strings come from `CapabilityStatement` (server-controlled). |
| V6 Cryptography | no | No crypto operations. Hashing lives in `useDuplicateReport` → `findContentHashDuplicates` (SHA-256 via `crypto.subtle`), unchanged by Phase 24. |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation | Phase 24 Status |
|---------|--------|---------------------|-----------------|
| Cache poisoning across users / servers | Tampering | Key cache on `serverUrl` prefix; clear on settings change | ✅ D-03 + D-04 — direct clear on `setSettings()` |
| Stale data shown after auth rotation | Information Disclosure | Clear cache when auth config changes | ✅ D-05 — any settings save clears cache, including token rotation |
| Memory exhaustion (unbounded cache) | DoS (client-side) | LRU eviction | ✅ FOUND-02 2-entry LRU |
| Stale writes post-cancellation leaking data | Tampering / correctness | Closure-scoped cancellation prevents cross-run writes | ✅ D-07 + D-10 closure-scoped `let cancelled` |

**No new attack surface is added.** The cache layer reads what the existing `MedplumClient` already fetches. If the client was authorized, the cache is authorized to hold the response. If settings change, the cache is wiped — the same invariant the existing `clearAllQualityMetrics` button already enforces.

---

## Sources

### Primary (HIGH confidence)

- `package.json` — all version numbers verified [VERIFIED: lines 17-56]
- `src/hooks/useResourceCounts.ts` — full file read; line 29 `cancelledRef` confirmed; line 75 `resourceTypes.join(',')` confirmed [VERIFIED]
- `src/hooks/useCompletenessReport.ts` — full file; closure-scoped `let cancelled` rationale at lines 71-74 [VERIFIED]
- `src/hooks/useCodingCoverage.ts` — full file; duplicate `cacheInstance` pattern at lines 35-43 [VERIFIED]
- `src/hooks/usePlausibilityReport.ts` / `useLabRangesReport.ts` / `useDuplicateReport.ts` / `useReferenceReport.ts` — full files read; state-machine patterns catalogued [VERIFIED]
- `src/quality/metricsCache.ts` — full file; `QualityMetricsCache` class unchanged shape; `clearAllQualityMetrics` at line 163 [VERIFIED]
- `src/quality/keys.ts` — cache key format `{serverUrl}|{metric}|{type}|{sampleSize}` [VERIFIED]
- `src/quality/types.ts` — `CountValue = number | 'loading' | 'error'` [VERIFIED]
- `src/contexts/SettingsContext.tsx` — `setSettings()` call-site for FOUND-02 wiring [VERIFIED]
- `src/components/settings/SettingsPage.tsx` — existing `handleClearMetricsCache` at lines 41-54 [VERIFIED]
- `.planning/phases/24-data-fetching-foundation/24-CONTEXT.md` — user decisions D-01 through D-10 [CITED]
- `.planning/research/ARCHITECTURE.md` §Q1, §Q2, §Anti-Patterns — primitive design [CITED]
- `.planning/research/PITFALLS.md` §Pitfall 1-3 — `useAsyncRun` type leak, cancellation pattern, unbounded Map [CITED]
- `.planning/REQUIREMENTS.md` §Phase 24 — FOUND-01 through FOUND-04 acceptance criteria [CITED]
- `.planning/STATE.md` §Accumulated Context — safety invariants [CITED]
- `CLAUDE.md` — tech stack constraints, "Do NOT Use" list [VERIFIED]

### Secondary (MEDIUM confidence)

- react.dev `/reference/react/useReducer` — canonical pattern for discriminated-union state [CITED]
- TanStack Query / SWR module-scope cache precedent — mentioned in ARCHITECTURE.md §Q2 without direct URL verification [CITED: ARCHITECTURE.md]

### Tertiary (LOW confidence)

- (None) — no LOW confidence claims load-bearing in this document.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all versions verified via `package.json`
- Architecture patterns: HIGH — every pattern has a precedent in the repo; `useReducer` + closure-scoped `let cancelled` are explicit STATE.md invariants
- Pitfalls: HIGH — every pitfall referenced a specific file:line or PITFALLS.md entry
- Security: HIGH — Phase 24 adds no attack surface; all cache invalidation paths covered by D-03/D-04/D-05

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stable patterns, no fast-moving ecosystem dependencies; React 18 + Mantine 8 ceiling is locked for v1.4)
