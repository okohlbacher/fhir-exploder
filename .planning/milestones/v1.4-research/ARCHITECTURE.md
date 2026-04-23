# Architecture Research — v1.4 Hardening & Tech-Debt Sweep

**Domain:** Local-first React FHIR auditing app — hardening of an existing architecture (not greenfield)
**Researched:** 2026-04-16
**Confidence:** HIGH (file:line evidence in repo for every recommendation; pattern verification via React docs + community sources for the 4 cross-cutting primitives)

---

## Scope

This research answers six concrete integration questions for v1.4 (phases 23-29). It is **NOT** a greenfield architecture — every recommendation must plug into the existing route shells (`ExplorerLayout` / `PatientsLayout` / `QualityLayout`), the existing hook-per-metric pattern (9 hooks), the existing `QualityMetricsContext`, and the existing `App.tsx` `<Routes>` tree without breaking 35,000 LOC.

The six questions, in build-order:

| # | Question | Phase | Risk |
|---|----------|-------|------|
| Q1 | Shared `useAsyncRun<TState>` for 4 report hooks; `useSampleWalker<T>` for completeness+coding | 24, 25 | LOW — new primitives, hooks rewritten one at a time |
| Q2 | Module-scoped `Map<serverUrl, X>` cache for counts + quality metrics | 24 | LOW — singleton already exists, just widen the key |
| Q3 | `React.lazy()` 3 drill-down routes + Thresholds page | 27 | MEDIUM — Suspense + vitest interaction needs verification |
| Q4 | `QualityMetricsContext` re-render split | 27 | HIGH (per v1.4-PLAN-DRAFT risk callout) — touches ~20 files |
| Q5 | `<ConnectionGatedOutlet>` for 3 layouts | 26 | LOW — pure extraction, identical bodies |
| Q6 | Build order 23 → 24 → 25/26 (parallel) → 27/28 → 29 | All | Confirmed sound; one hidden dep flagged below |

---

## Existing System Snapshot

### Layer Map (today, v1.3)

```
┌────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                  │
│  SettingsProvider → ConnectionProvider → TerminologyProvider        │
│                          → <Routes> (all routes statically imported)│
├────────────────────────────────────────────────────────────────────┤
│   AppLayout (sidebar + header)                                      │
├────────────────────────────────────────────────────────────────────┤
│   ExplorerLayout    │   PatientsLayout   │   QualityLayout          │
│   (gate + outlet)   │   (gate + outlet)  │   (gate + outlet         │
│                     │                    │    + QualityMetricsProv  │
│                     │                    │    + legacy-key migrate) │
├────────────────────────────────────────────────────────────────────┤
│   MedplumProvider (per-layout, scoped to connected client)          │
├────────────────────────────────────────────────────────────────────┤
│   Page components (DashboardPage / SearchResultsPage / ...)         │
│      └── hook-per-metric (useResourceCounts, useCompletenessReport, │
│              useCodingCoverage, useValidationRun, useConformanceRun,│
│              usePlausibilityReport, useLabRangesReport,             │
│              useDuplicateReport, useReferenceReport)                │
├────────────────────────────────────────────────────────────────────┤
│   Pure-function quality engines + sampling + caching                │
│      completenessWalker / codingCoverageWalker / .../               │
│      sampleResources / QualityMetricsCache / metricsCache.ts        │
├────────────────────────────────────────────────────────────────────┤
│   MedplumClient (FHIR REST against Blaze)                           │
└────────────────────────────────────────────────────────────────────┘
```

### Key Existing Primitives (referenced throughout)

| Primitive | File:Line | Used By | v1.4 Action |
|-----------|-----------|---------|-------------|
| `useResourceCounts` | `src/hooks/useResourceCounts.ts:15` | Dashboard, ResourceTypeLanding, QualityOverviewPage | **Modify** — module-scoped Map cache |
| `useCompletenessReport` | `src/hooks/useCompletenessReport.ts:53` | CompletenessPanel, Overview rollup | **Refactor** — adopt `useSampleWalker` |
| `useCodingCoverage` | `src/hooks/useCodingCoverage.ts:45` | CodingCoveragePanel, Overview rollup | **Refactor** — adopt `useSampleWalker` |
| `usePlausibilityReport` | `src/hooks/usePlausibilityReport.ts:48` | PlausibilityPanel | **Refactor** — adopt `useAsyncRun` |
| `useLabRangesReport` / `useDuplicateReport` / `useReferenceReport` | `src/hooks/use*Report.ts` | Their respective panels | **Refactor** — adopt `useAsyncRun` |
| `QualityMetricsCache` | `src/quality/metricsCache.ts:26` | the 2 sampler hooks above | **Wrap** in registry, don't change class |
| `cacheInstance` singleton + `getCache(serverUrl)` | `useCompletenessReport.ts:43-51` and `useCodingCoverage.ts:35-43` | Internal | **Replace** with shared registry |
| `QualityMetricsContext` | `src/quality/QualityMetricsContext.tsx:107` | OverviewStrip, all 7 panels | **Split** (Q4) — high risk |
| `ExplorerLayout` / `PatientsLayout` / `QualityLayout` gate body | 3 files, identical lines | Routes | **Extract** to `<ConnectionGatedOutlet>` |
| `<Routes>` static imports | `src/App.tsx:6-22` | App | **Lazy-wrap** the 4 leaves (Q3) |

---

## Q1 — Shared `useAsyncRun<TState>` and `useSampleWalker<T>`

### Problem (verified, file:line)

**`useAsyncRun` candidates** — four hooks share a state machine:

- `usePlausibilityReport.ts:48-139` — `status / progress / issues / errorMessage` + `cancelledRef` + `start()` callback + IIFE with batch loop with **4 cancellation checks** (lines 76, 86, 105, 111) + unmount cleanup (`useEffect` returning `() => { cancelledRef.current = true }`).
- `useLabRangesReport.ts:44-124` — same shape, different walker.
- `useDuplicateReport.ts:57-203` — same shape, two-phase (patient pass + hash pass).
- `useReferenceReport.ts:52-169` — same shape.

**`useSampleWalker` candidates** — two hooks share the worker-pool sampler:

- `useCompletenessReport.ts:70-133` — debounced sample, cache hit seed, queue + `next()` recursion with `CONCURRENCY=4`, per-result `cache.set` + `setReports`, finally `next()`. Closure-scoped `cancelled` flag (NOT `cancelledRef` — line 73-74 comment explains why).
- `useCodingCoverage.ts:61-127` — line-for-line the same except `computeForType()` → `aggregateCoverage(sample)` (line 96).

### Pattern Recommendation: Reducer-based state machine + closure-scoped cancellation

The React community 2025-2026 consensus is:

1. **`useReducer` + discriminated-union state** beats `useState` ad-hoc for any state with > 3 transitions, because the reducer is testable in isolation and ineligible-transition bugs surface as compile errors.
2. **`AbortController` is preferred over boolean flags** for genuine network cancellation, but **boolean flags are still correct** when the work is non-network (e.g., synchronous walker over an already-fetched sample). Both `useSampleWalker` and `useAsyncRun` are mostly post-fetch CPU work, so the existing flag pattern is fine — the inconsistency between `let cancelled = false` (completeness/coding) and `useRef<boolean>` (plausibility/labRanges/etc.) is documented at `useCompletenessReport.ts:71-74` with the rationale: closure-scoped flag prevents stale promises from a prior effect run committing into a fresh effect.
3. **Walker-as-injection** keeps the engines testable independent of React.

#### `useAsyncRun<TIssue>` — proposed shape

```typescript
// src/hooks/useAsyncRun.ts (new file)

type AsyncRunStatus = 'idle' | 'running' | 'complete' | 'cancelled' | 'error';

interface AsyncRunState<TIssue> {
  status: AsyncRunStatus;
  progress: { current: number; total: number };
  issues: TIssue[];
  errorMessage?: string;
}

type AsyncRunAction<TIssue> =
  | { type: 'start'; total?: number }
  | { type: 'progress'; current: number; total: number }
  | { type: 'append-issues'; issues: TIssue[] }
  | { type: 'complete' }
  | { type: 'cancel' }
  | { type: 'error'; message: string }
  | { type: 'reset' };

function asyncRunReducer<TIssue>(
  state: AsyncRunState<TIssue>,
  action: AsyncRunAction<TIssue>,
): AsyncRunState<TIssue> { /* ... */ }

interface UseAsyncRunArgs<TIssue> {
  // Caller-supplied async function; receives helpers so callers can poll
  // cancellation without paying for AbortController on synchronous walker
  // code. Returning issues progressively via appendIssues (not by resolving)
  // is the right shape for batch progress.
  runner: (helpers: {
    isCancelled: () => boolean;
    setProgress: (current: number, total: number) => void;
    appendIssues: (batch: TIssue[]) => void;
  }) => Promise<void>;
  deps?: unknown[];   // resets the run when these change
  autoStart?: boolean; // default false; drill-downs would set true
}

export function useAsyncRun<TIssue>(
  args: UseAsyncRunArgs<TIssue>,
): AsyncRunState<TIssue> & { start: () => void; cancel: () => void };
```

**Migration path for the four hooks** (Phase 25):

```typescript
// usePlausibilityReport.ts after refactor — shrinks from 139 → ~40 lines
export function usePlausibilityReport({ client, resourceType, sampleSize, settings, patientIds }) {
  return useAsyncRun<NormalizedIssue>({
    runner: async ({ isCancelled, setProgress, appendIssues }) => {
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

**Testability:** the reducer is pure (`asyncRunReducer(state, action) → state`) — vitest can exercise every transition without React. The `runner` is also independently callable (just pass mock helpers). The walker engines (`checkTemporalPlausibility`, `aggregateCoverage`, etc.) remain unchanged — they're already pure functions.

#### `useSampleWalker<T>` — proposed shape

```typescript
// src/hooks/useSampleWalker.ts (new file)

interface UseSampleWalkerArgs<T> {
  client: MedplumClient | null;
  types: string[];
  sampleSize: number;
  patientIds?: string[];
  metricKey: 'completeness' | 'coverage';   // for buildMetricsKey + cache namespace
  walker: (sample: Resource[], type: string) => Promise<T> | T;
  // Rollup strategy lives at the call-site so the existing setCompleteness /
  // setCoverage rules stay unchanged. The hook exposes raw per-type state.
}

export function useSampleWalker<T>(args: UseSampleWalkerArgs<T>): Record<string, PerTypeReport<T>>;
```

The two existing hooks become 30-line wrappers that supply the walker and the rollup `useEffect`. `setCompleteness` / `setCoverage` rollup logic stays where it is — **do not** lift the rollup into `useSampleWalker` because the rules differ subtly per metric (lines 137-157 vs 133-155) and combining them would re-introduce the duplication elsewhere.

**Integration point:** new files only. `useCompletenessReport.ts` and `useCodingCoverage.ts` keep the same exported signature, so no consumer changes (`CompletenessPanel.tsx` etc. unaffected).

### Confidence

- HIGH on the reducer-based pattern (verified: React docs + DEV community + Medium 2025-2026 articles, plus repo evidence shows the divergent flag types caused by ad-hoc `useState` already)
- HIGH on the closure-scoped flag (the existing comment at `useCompletenessReport.ts:71-74` is correct — keep the pattern)
- MEDIUM on `AbortController` adoption — for v1.4, **do not** introduce it. Keep the boolean flag because the dominant cost is post-fetch CPU work, not network. Defer real AbortController to a later milestone if `sampleResources` ever returns to network-dominated profiling.

---

## Q2 — Module-scoped `Map<serverUrl, X>` Cache

### Problem (verified)

Three places re-fetch `_summary=count` per resource type on every page mount:

- `useResourceCounts.ts:28` — no cache.
- `DashboardPage.tsx:77`, `ResourceTypeLanding.tsx:24`, `QualityOverviewPage.tsx:108` — three top-level pages each call the hook independently.

Switching sections (`/dashboard` → `/quality`) replays dozens of count requests against Blaze.

For the quality cache singleton (`useCompletenessReport.ts:43-51` + `useCodingCoverage.ts:35-43`), the issue is that swapping `serverUrl` discards the prior server's cache instead of preserving both.

### Pattern Recommendation: Module-level `Map` registry, key = `serverUrl`

This pattern is well-established in React (TanStack Query, SWR, MedplumClient itself all do it internally). The discipline:

1. **Singleton lives at module scope, not React state** — survives unmount/remount, doesn't trigger re-renders.
2. **Key = `serverUrl`** (from `client.getBaseUrl()`) — naturally invalidates on settings change because the new client returns a different base URL. **Do NOT** key on the client instance — `MedplumClient` may be re-instantiated even when URL is unchanged (`useConnection` lifecycle).
3. **Read inside `useEffect`, not during render** — avoids hydration-mismatch (irrelevant here, no SSR) and keeps the cache lookup deterministic for tests.
4. **Expose a `clearAll()` for the existing Settings "Clear metrics cache" button** — the existing `clearAllQualityMetrics()` at `metricsCache.ts:163` is the model.
5. **No SSR concern** — local-first SPA. Don't pay the cost of `globalThis`-guarded singletons that React Server Components require.

#### `useResourceCounts` cache — proposed shape

```typescript
// src/hooks/useResourceCounts.ts (modify in-place)

interface CountCacheEntry { value: number; computedAt: number }

// Module-scoped, two-level: serverUrl → resourceType → entry.
// Naturally invalidates on serverUrl change (key miss). TTL is optional — for
// a local explorer where the user is the only writer, no TTL is the right
// default; bump via `refetchKey` arg already on the hook's signature.
const countCache = new Map<string, Map<string, CountCacheEntry>>();

function getCountForType(serverUrl: string, type: string): number | undefined {
  return countCache.get(serverUrl)?.get(type)?.value;
}

function setCountForType(serverUrl: string, type: string, value: number): void {
  let inner = countCache.get(serverUrl);
  if (!inner) { inner = new Map(); countCache.set(serverUrl, inner); }
  inner.set(type, { value, computedAt: Date.now() });
}

export function clearCountCache(): void { countCache.clear(); }
```

In the effect: cache hit → seed `counts[type] = cached.value` synchronously (the `'loading'` state never appears for cached types, eliminating render flicker). Worker pool only enqueues misses.

#### Quality cache registry — replace `cacheInstance` rotation

```typescript
// src/quality/metricsCache.ts (add to existing file)

const cachesByServer = new Map<string, QualityMetricsCache>();

export function getMetricsCacheFor(serverUrl: string): QualityMetricsCache {
  let cache = cachesByServer.get(serverUrl);
  if (!cache) {
    cache = new QualityMetricsCache({ serverUrl });
    cachesByServer.set(serverUrl, cache);
  }
  return cache;
}

// Existing clearAllQualityMetrics() also clears the registry:
export function clearAllQualityMetrics(): number {
  cachesByServer.clear();   // drop in-memory references
  // ... existing localStorage iteration unchanged ...
}
```

Then `useCompletenessReport.ts:43-51` and `useCodingCoverage.ts:35-43` collapse to:

```typescript
import { getMetricsCacheFor } from '../quality/metricsCache';
// ... inside effect:
const cache = getMetricsCacheFor(serverUrl);
```

**Stale-closure safety:** `serverUrl` is read fresh at every effect run (`client.getBaseUrl()` inside the effect body, not captured at hook-mount time). The Map lookup is a fresh dereference. No stale closure risk.

**Test isolation:** vitest test files should call `clearAllQualityMetrics()` and `clearCountCache()` in `beforeEach()` to prevent inter-test pollution. **Add this to v1.4 test plan** — currently `metricsCache.test.ts` constructs fresh instances per test, but a registry-shared instance would persist across tests if not cleared.

### Integration Points

| New | Modified |
|-----|----------|
| `clearCountCache()` export from `useResourceCounts.ts` | `useResourceCounts.ts` effect body |
| `getMetricsCacheFor(serverUrl)` + `cachesByServer` registry in `metricsCache.ts` | `useCompletenessReport.ts:43-51`, `useCodingCoverage.ts:35-43`, `clearAllQualityMetrics()` |
| `beforeEach` clear in test files | n/a |

### Confidence: HIGH (pattern is canonical, repo already uses it inside `cacheInstance`)

---

## Q3 — Route Code-Splitting via `React.lazy()`

### Problem (verified)

`src/App.tsx:6-22` statically imports all 22 page components. The drill-down pages (`PlausibilityDrillDown`, `LabRangesDrillDown`, `DuplicatesDrillDown`, `ReferencesDrillDown`, plus `CompletenessDrillDown` and `CodingDrillDown`) are heavy (each pulls in a different walker + the shared `ResourceIssueTable`). `ThresholdsPage` pulls jspdf transitively.

### Pattern Recommendation: `React.lazy()` + per-route `<Suspense>` boundary

React Router v7 supports two lazy strategies:

1. **`React.lazy(() => import(...))`** — works with any `<Routes>` setup, including the `<Routes>` JSX style this app uses.
2. **`lazy: () => import(...)` on a route object** — only available with `createBrowserRouter` (data routers), which this app does **not** use.

Since `App.tsx` uses `<Routes>`/`<Route>` JSX, **stay with `React.lazy()`** — switching to data routers is a much larger refactor.

#### Suspense boundary placement

The community guidance (verified via Robin Wieruch + react.dev `<Suspense>` docs):

- **One Suspense per route group** at the level just above the lazy children, NOT one global Suspense.
- For `/quality/*`, place Suspense **inside `QualityLayout`'s `<Outlet>` wrapper** so the fallback renders within the chrome (sidebar + breadcrumbs stay visible during navigation).
- Use `location.key` as `Suspense` key when you want a fresh fallback on every navigation (known v7 issue: `<Suspense>` does not re-suspend by default after first resolve — see GitHub issue 12474).

#### Proposed change to `App.tsx`

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { Loader, Center } from '@mantine/core';

const PlausibilityDrillDown = lazy(() => import('./components/quality/PlausibilityDrillDown').then(m => ({ default: m.PlausibilityDrillDown })));
const LabRangesDrillDown    = lazy(() => import('./components/quality/LabRangesDrillDown').then(m => ({ default: m.LabRangesDrillDown })));
const DuplicatesDrillDown   = lazy(() => import('./components/quality/DuplicatesDrillDown').then(m => ({ default: m.DuplicatesDrillDown })));
const ReferencesDrillDown   = lazy(() => import('./components/quality/ReferencesDrillDown').then(m => ({ default: m.ReferencesDrillDown })));
const ThresholdsPage        = lazy(() => import('./components/quality/ThresholdsPage').then(m => ({ default: m.ThresholdsPage })));
// Note: CompletenessDrillDown + CodingDrillDown are NOT lazy in this phase —
// they share useSampleWalker chunks with the panels and lazy-loading them
// would split into too-small chunks. Re-evaluate if bundle analyzer disagrees.

const RouteFallback = () => <Center p="xl"><Loader /></Center>;

// Wrap only the 5 lazy routes in a single Suspense boundary inside QualityLayout's outlet.
```

**Suspense placement decision:** put a single `<Suspense>` inside `QualityLayout` wrapping the `<Outlet>`. Reason: `MedplumProvider` wraps the outlet (line 106), and Suspense should be **inside** the providers so the fallback can use Mantine + theme tokens. Do NOT put Suspense at the `App.tsx` level — sidebar/header would unmount during navigation, causing layout flicker.

#### Vitest / RTL compatibility

This is the documented concern in v1.4-PLAN-DRAFT risk callout R15. The current state (verified):

- **Vite + Vitest natively supports `React.lazy()` + dynamic `import()`** — no extra config needed (`@vitejs/plugin-react` handles JSX in the dynamic chunk).
- **Tests must `await` for the lazy children to resolve** — `render(<Component/>)` followed by `await screen.findByText(...)` (the `find*` queries are async and Suspense-aware) instead of synchronous `getByText`.
- **Existing test pattern audit needed:** any test that does `render(<App />)` and synchronously queries a drill-down's content will break. Search candidates: any vitest file under `src/components/quality/__tests__/` that imports App and asserts on drill-down output.

**Recommended test mitigation:** Update affected tests to use `findBy*` queries. There should be < 5 files affected; do the audit before committing the Phase 27 plan.

### Integration Points

| New | Modified |
|-----|----------|
| Suspense boundary inside `QualityLayout` | `src/App.tsx` imports → `lazy()` for the 5 routes |
| `<RouteFallback>` component (could go in `components/layout/`) | `src/components/quality/QualityLayout.tsx` line 108 — wrap `<Outlet>` in `<Suspense fallback={<RouteFallback/>}>` |
| n/a | Tests using sync queries on drill-down content → switch to `findBy*` |

### Confidence: MEDIUM
- HIGH on the `React.lazy()` + per-route Suspense pattern
- MEDIUM on the test impact — need a one-off audit of existing vitest files; should not be a blocker but cannot be promised "zero test changes"

---

## Q4 — `QualityMetricsContext` Re-render Split

### Problem (verified)

`QualityMetricsContext.tsx:107` exposes a single context value with **8 metrics + 1 derived + 8 setters**. The provider memos the value (line 142-171) but the memo dep list includes every metric (lines 160-170), so any single metric update creates a new value object and re-renders **every consumer**.

Consumers (verified via grep): all 7 panels, OverviewStrip, all 6 drill-downs that need to push back. ~14 consumer sites.

### Two-Option Trade-off Analysis

#### Option A: Split into per-metric providers

```typescript
// src/quality/metrics/CompletenessRollupContext.tsx
// src/quality/metrics/CoverageRollupContext.tsx
// ... 7 contexts + 1 derived (duplicates already derived)
// Plus a composite <QualityMetricsProviders> that nests them.
```

**Pros:**
- Mechanical, well-understood React pattern.
- Each consumer subscribes to exactly the slices it needs (`useCompletenessRollup()` returns only that scalar + setter).
- Testability: each context is independently mockable.
- TypeScript is happy: each context has a 2-field shape.

**Cons:**
- 7-8 nested providers in `QualityLayout` (visual noise).
- `OverviewStrip` becomes 7 hook calls instead of 1 — each call still triggers a re-render when its metric changes (which is what you want — that tile should re-render).
- `duplicatesBreakdown` accumulator needs its own context (it's stateful, not just a scalar).
- Consumers that read multiple metrics still re-render on each — but since each metric drives one tile, this is a **good** outcome, not regression.

#### Option B: `useSyncExternalStore` with selector

```typescript
// src/quality/metrics/store.ts — vanilla JS store outside React
// Components subscribe with a selector function:
const completeness = useQualityMetric(s => s.overallCompleteness);
```

**Pros:**
- True selector-based subscriptions — re-render only when the **selected** value changes.
- Single store object, easy to dump for debugging.
- Standard 2026 community pattern (verified — multiple sources favor `useSyncExternalStore` over context-splitting for high-frequency updates).
- Plays well with React 18's concurrent features (no tearing).

**Cons:**
- Selector identity matters — `useSyncExternalStore` re-runs the selector on every store change; if the selector returns a fresh object, React re-renders unnecessarily. Consumers must use stable selectors or a `useMemo`'d selector. **This is a bug-magnet for less experienced contributors.**
- Adds a non-React layer (the store) that must be cleared on disconnect — currently `setDuplicatesContribution('reset')` handles that; the new store needs an explicit reset hook.
- Test mocking is more involved — instead of wrapping in a mock provider, tests need to mock the store module or use an inject pattern.
- Diverges from the existing context idiom in this codebase (`SettingsContext`, `TerminologyContext`, `ConnectionContext` all use the `createContext` pattern).

### Recommendation: Option A (per-metric provider split)

**Rationale, in priority order:**

1. **Aligns with existing patterns.** The codebase already uses `createContext` for SettingsContext, TerminologyContext, ConnectionContext, and QualityMetricsContext itself. Introducing `useSyncExternalStore` for one feature creates two ways to do the same thing in the same codebase.
2. **Mantine-friendly.** Mantine components subscribe to its own theme/notifications context — adding more context providers is the same shape as what's already there. `useSyncExternalStore` would be the only non-context global state in the app.
3. **Simpler test story.** Existing tests construct `<QualityMetricsProvider>` wrappers; per-metric split keeps the same wrapper convention with one outer composition component.
4. **Update frequency does not justify the optimization.** Each rollup updates **once per panel run** (terminal status only — see `QualityMetricsContext.tsx:26-27`). This is not a 50-Hz dashboard scenario where `useSyncExternalStore` shines. Re-render cost on a once-per-panel-run is negligible — the user-perceptible win is "OverviewStrip tile updates one at a time without flickering siblings", which Option A achieves.
5. **R14 is flagged as L-effort + HIGH-risk in the v1.4 plan draft.** Option A is the lower-risk path.

**Caveat:** If profiling after Phase 25 shows that `useSampleWalker`'s per-resource setReports causes Overview re-renders (which it shouldn't, because rollup is gated to terminal status), revisit Option B at that time.

### Proposed Structure

```
src/quality/metrics/
  CompletenessRollupContext.tsx   # { value, set }
  CoverageRollupContext.tsx
  ValidationRollupContext.tsx
  PlausibilityRollupContext.tsx
  LabRangesRollupContext.tsx
  ReferencesRollupContext.tsx
  DuplicatesContext.tsx           # holds breakdown + derived overall
  index.tsx                       # composite <QualityMetricsProviders>
                                  # + barrel re-exports of all hooks
```

### Migration Path

1. Phase 27 task: create new files; old `QualityMetricsContext.tsx` wraps them in a back-compat `useQualityMetrics()` that calls all 7 hooks and assembles the full shape (zero breakage at consumer sites).
2. Follow-up (Phase 28 micro-sweep): mechanically replace `useQualityMetrics().overallX` call sites with `useXRollup()` so consumers re-render selectively. This is the actual perf win — but it's mechanical and can land file-by-file.

### Integration Points

| New | Modified |
|-----|----------|
| 7 per-metric context files | `QualityMetricsContext.tsx` becomes a back-compat shim |
| Composite `<QualityMetricsProviders>` | `QualityLayout.tsx:107` swaps `<QualityMetricsProvider>` → `<QualityMetricsProviders>` |
| n/a (file-by-file follow-up) | Each panel + OverviewStrip migrated one at a time |

### Confidence: HIGH on the recommendation; MEDIUM on the perf win magnitude
The recommendation aligns with existing patterns and is low-risk. The actual perf delta will be visible only after consumers are migrated to the per-metric hooks — until then, the composite hook re-renders the whole subtree the same as today.

---

## Q5 — `<ConnectionGatedOutlet>` for 3 Layouts

### Problem (verified)

`ExplorerLayout.tsx:21-57`, `PatientsLayout.tsx:25-61`, `QualityLayout.tsx:84-118` all contain the **identical** "if not connected → Alert; else → MedplumProvider + Outlet" body. The bodies differ only in:

1. The outlet `context` type name (`ExplorerOutletContext` / `PatientsOutletContext` / `QualityOutletContext`) — but the **shape is identical**: `{ capability, client }`.
2. `QualityLayout` adds `<QualityMetricsProvider>` between MedplumProvider and Outlet (line 107).
3. `QualityLayout` runs the legacy-key migration `useEffect` at top of body (lines 57-82).

### Pattern Recommendation: Composition via `children` prop, not configuration via flags

```typescript
// src/components/layout/ConnectionGatedOutlet.tsx (new file — co-located with AppLayout, Sidebar)

interface ConnectionGatedOutletProps {
  /**
   * Optional wrapper rendered between MedplumProvider and Outlet. Used by
   * QualityLayout to inject QualityMetricsProvider; other layouts pass nothing.
   */
  wrap?: (children: ReactNode) => ReactNode;
}

export type ConnectedOutletContext = {
  capability: CapabilityStatement;
  client: MedplumClient;
};

export function ConnectionGatedOutlet({ wrap }: ConnectionGatedOutletProps) {
  const { state } = useConnection();

  if (state.status !== 'connected') {
    return <NotConnectedAlert />;   // also extracted; identical Alert + Link in 3 places
  }

  const outlet = (
    <Outlet context={{ capability: state.capability, client: state.client } satisfies ConnectedOutletContext} />
  );

  return (
    <MedplumProvider medplum={state.client}>
      {wrap ? wrap(outlet) : outlet}
    </MedplumProvider>
  );
}
```

The three layouts collapse to:

```typescript
// ExplorerLayout.tsx — 6 lines instead of 57
export function ExplorerLayout() { return <ConnectionGatedOutlet />; }

// PatientsLayout.tsx — 6 lines instead of 61
export function PatientsLayout() { return <ConnectionGatedOutlet />; }

// QualityLayout.tsx — keeps the legacy-key migration useEffect, delegates the rest
export function QualityLayout() {
  useLegacyResourceTypeKeyMigration();   // extract the useEffect into a named hook
  return <ConnectionGatedOutlet wrap={c => <QualityMetricsProvider>{c}</QualityMetricsProvider>} />;
}
```

**Outlet context type unification:** the three local types (`ExplorerOutletContext` / `PatientsOutletContext` / `QualityOutletContext`) are **structurally identical**. Replace with the single `ConnectedOutletContext` exported from `ConnectionGatedOutlet`. Consumer `useOutletContext<ExplorerOutletContext>()` calls become `useOutletContext<ConnectedOutletContext>()`. **This is a backward-compatible TypeScript change** — the structural-type compatibility means no runtime change, only a type rename. To minimize churn, keep the three type aliases as `export type ExplorerOutletContext = ConnectedOutletContext` shims.

### Placement Decision: `src/components/layout/`

The repo already has `src/components/layout/AppLayout.tsx` and `src/components/layout/Sidebar.tsx`. `ConnectionGatedOutlet` is the same kind of cross-cutting layout primitive — it belongs there.

**Do NOT** put it in `src/routes/` — there is no routes folder, and creating one for a single component is over-organization. The route definitions live in `App.tsx` and reference layout primitives by import; that's the established pattern.

### Provider Scoping (clarification)

Stays exactly as today:

- `MedplumProvider` is **inside** `ConnectionGatedOutlet` (one per layout instance — three instances mount/unmount as user navigates).
- `QualityMetricsProvider` is injected **only** for `/quality/*` via the `wrap` prop. It does NOT leak to `/explorer` or `/patients`.
- Sidebar / AppLayout chrome stays **outside** the gate — the user sees the sidebar even when disconnected.

### Integration Points

| New | Modified |
|-----|----------|
| `src/components/layout/ConnectionGatedOutlet.tsx` | `src/components/explorer/ExplorerLayout.tsx` (delete body) |
| `src/components/layout/NotConnectedAlert.tsx` (extracted Alert subcomponent) | `src/components/patients/PatientsLayout.tsx` (delete body) |
| `src/quality/cohorts.ts` exports `useLegacyResourceTypeKeyMigration` (extracted from QualityLayout's useEffect) | `src/components/quality/QualityLayout.tsx` (keep migration hook + wrap pattern) |
| n/a | Outlet context types — shim the three local type names to the new shared type |

### Confidence: HIGH — pure extraction, zero behavior change, easily reversible

---

## Q6 — Build Order Validation

### Stated order (from v1.4-PLAN-DRAFT.md ordering diagram)

```
23 (close v1.3) ── must ship first
23 → 24 (fetch foundation)
24 → 25 (quality dedup)
24 → 26 (app-shell dedup)
27 (efficiency)  parallel-safe with 25/26
28 (micro-sweep) parallel-safe; better after 25/26
29 (UX backlog)  independent
```

### Validation against findings

**24 → 25 dependency is correct and tight.**
- `useSampleWalker` (Phase 25 R1) consumes `getMetricsCacheFor(serverUrl)` from Phase 24's registry. Building 25 first means re-doing the cache plumbing.
- `<DrillDownShell>` (Phase 25 R3) is independent of 24, but the four async drill-downs (Plausibility/LabRanges/Duplicate/Reference) consume `useAsyncRun` (Phase 24 R6). If you ship `<DrillDownShell>` before `useAsyncRun`, the shell signature must accept the verbose state shape; after `useAsyncRun` it accepts the unified shape.

**24 → 26 dependency is weaker than stated.**
- Phase 26's tasks (R7 layout extract, R8 search helper, R10 sidebar nav, R9 link standardization, R13 useCallback) are **all independent of Phase 24's fetch primitives**. Phase 26 can start in parallel with Phase 24. Update the diagram accordingly.

**Hidden dependency: 27 → 25 (efficiency depends on quality dedup landing first).**
- Phase 27's R14 (context split) sits in `src/quality/QualityMetricsContext.tsx`. Phase 25's `useSampleWalker` rollup `useEffect` (lines 137-157 of completeness, 134-155 of coverage today) calls `setCompleteness` / `setCoverage` from that context. **If Phase 27's split is mid-flight when Phase 25 lands, the rollup site needs to switch from `useQualityMetrics().setCompleteness` to `useCompletenessRollup().set`.**
  - **Recommendation:** Either land Phase 25 fully before starting Phase 27 R14, OR have Phase 27 R14 ship the back-compat `useQualityMetrics()` shim FIRST so Phase 25 doesn't need to know which context shape it's writing to. The shim approach is preferable because it lets Phase 27 R14 land independently of Phase 25's completion.

**Hidden dependency: 27 → 24 (efficiency depends on cache).**
- Phase 27's R15 (lazy routes) is independent of Phase 24.
- Phase 27's `useResourceCounts` join-stabilization (line 75 memoization) is **inside** the file Phase 24 modifies. **Land Phase 27's stabilization tweak in Phase 24's PR** — they're touching the same hook. Don't split into two PRs.

**Hidden dependency: 28 → 24 (micro-sweep absorbs disables).**
- Phase 28's task "drop the four `eslint-disable-next-line react-hooks/exhaustive-deps` on auto-start effects (absorbed by Phase 24's `useAsyncRun`)" depends on Phase 24's `useAsyncRun` being merged. The plan-draft already notes this — no change.

### Revised dependency diagram

```
Phase 23 (close v1.3) ─┬─▶ Phase 24 (fetch foundation, INC. R27 useResourceCounts memo)
                       │      │
                       │      ├─▶ Phase 25 (quality dedup — uses useSampleWalker, useAsyncRun)
                       │      │      │
                       │      │      └─▶ Phase 28 (micro-sweep, depends on R6 disables removed)
                       │      │
                       │      └─▶ Phase 27 R14 (context split — back-compat shim FIRST,
                       │                         then per-consumer migration in any order)
                       │
                       ├─▶ Phase 26 (app-shell dedup — independent of 24)
                       │
                       ├─▶ Phase 27 R15 (lazy routes — independent of 24)
                       │
                       └─▶ Phase 29 (UX backlog — independent)
```

### Recommendations

1. **Move R27 line-75 memoization fix into Phase 24** — same file, same review, save a PR.
2. **Phase 27 R14 must ship the back-compat shim early** — even if the per-consumer migration spans Phase 27 + 28.
3. **Document Phase 26's independence** — it can start the same day as Phase 24.
4. **Phase 28 stays last** — confirms.

### Confidence: HIGH on dependency analysis (every dep verified by reading the file the task touches)

---

## Anti-Patterns Specific to This Refactor

### Anti-Pattern 1: Over-extraction of `useAsyncRun`

**What:** Adding too many config options to `useAsyncRun<TState>` so it can also accommodate `useResourceCounts` and `useSampleWalker`.
**Why bad:** The three differ in fundamental shape — `useResourceCounts` is per-type-scalar-result, `useSampleWalker` is per-type-progressive, `useAsyncRun` is single-type-batch-progressive. Forcing one signature creates a 5-arg-options-object hell.
**Do this instead:** Three sibling hooks with separate signatures. The shared logic is the **reducer** (`asyncRunReducer`) — extract that to `src/hooks/internal/asyncRunReducer.ts` and have all three hooks use it. The hook signatures stay specific.

### Anti-Pattern 2: AbortController everywhere

**What:** Replacing the boolean `cancelled` flags with `AbortController` to "modernize" the cancellation pattern.
**Why bad:** `sampleResources` does the network fetch upfront; the rest of the work is synchronous CPU. AbortController buys nothing for sync work and adds API surface. The closure-scoped flag rationale at `useCompletenessReport.ts:71-74` is correct.
**Do this instead:** Keep boolean flags. If a future hook does paginated fetches with real network cancellation value, introduce AbortController **for that hook only**.

### Anti-Pattern 3: Lifting rollup into `useSampleWalker`

**What:** Pulling the `setCompleteness` / `setCoverage` rollup `useEffect` out of the two existing hooks and into the shared `useSampleWalker`.
**Why bad:** The rollup rules differ subtly (mean of `populated/total*100` vs `systemCode/totalCodedFields*100`) and the "still waiting" gate logic depends on the specific report shape. Generalizing creates a `rollupConfig` argument that re-encodes per-metric rules.
**Do this instead:** `useSampleWalker` returns the raw per-type record. The two hooks keep their own rollup `useEffect` (they're 20 lines each). Total file size still drops dramatically.

### Anti-Pattern 4: Lazy-loading too aggressively

**What:** Wrapping every route in `React.lazy()` for "consistency".
**Why bad:** Each lazy chunk has overhead (HTTP request, Suspense fallback flicker). Routes that are part of the user's initial flow (DashboardPage, SettingsPage, ExplorerLayout's index) should stay eager. The 5-route v1.4 plan is correct — don't expand it.

### Anti-Pattern 5: `useSyncExternalStore` for low-frequency rollups

**What:** Reaching for `useSyncExternalStore` because Gemini's review mentioned re-render cost.
**Why bad:** `QualityMetricsContext` updates **once per terminal panel run**. The re-render cost on a once-per-N-seconds update is negligible. Per-metric context split (Option A above) achieves the same UX win without leaving the codebase's existing idiom.
**Do this instead:** Per-metric context split. Revisit `useSyncExternalStore` only if profiling after the split shows persistent re-render hot spots.

---

## Integration Summary Table

| Sub-question | Phase | New files | Modified files | Risk | Rollback |
|--------------|-------|-----------|----------------|------|----------|
| Q1: `useAsyncRun` + reducer | 24 | `src/hooks/useAsyncRun.ts`, `src/hooks/internal/asyncRunReducer.ts` | n/a (Phase 24 lands the primitive only; hook adoption in Phase 25) | LOW | revert primitive file |
| Q1: `useSampleWalker` | 25 | `src/hooks/useSampleWalker.ts` | `useCompletenessReport.ts`, `useCodingCoverage.ts` (each → ~30 lines) | LOW | revert hook bodies |
| Q1: 4 hooks adopt `useAsyncRun` | 25 | n/a | `usePlausibilityReport.ts`, `useLabRangesReport.ts`, `useDuplicateReport.ts`, `useReferenceReport.ts` | LOW | per-hook revert |
| Q2: count cache | 24 | n/a | `useResourceCounts.ts` (+ `clearCountCache()` export) | LOW | strip Map block |
| Q2: quality cache registry | 24 | n/a | `metricsCache.ts` (+ `getMetricsCacheFor`), `useCompletenessReport.ts`, `useCodingCoverage.ts` | LOW | revert getter |
| Q3: lazy routes | 27 | `src/components/layout/RouteFallback.tsx` | `src/App.tsx`, `src/components/quality/QualityLayout.tsx` (Suspense wrap) | MEDIUM (test impact) | un-lazy the imports |
| Q4: context split | 27 | `src/quality/metrics/*.tsx` (8 files) | `src/components/quality/QualityLayout.tsx` (composite provider) | MEDIUM (file count, but shim keeps consumers stable) | keep shim, drop new files |
| Q5: `<ConnectionGatedOutlet>` | 26 | `src/components/layout/ConnectionGatedOutlet.tsx`, `src/components/layout/NotConnectedAlert.tsx` | 3 layout files (delete bodies), `src/quality/cohorts.ts` (extract migration hook) | LOW | inline body back |
| Q6: ordering | n/a | n/a | n/a | n/a | n/a |

---

## Open Questions for Phase Planning

1. **Test audit before Phase 27.** Before lazy-wrapping routes, run a grep for `render(<App` and `render(<.*Layout` in `src/**/__tests__/` to enumerate tests that may need `findBy*` updates. Estimate: < 5 files affected, but verify before committing the phase plan.
2. **Per-metric context migration scope.** Phase 27's R14 should specify whether the back-compat shim is the only deliverable, or whether per-consumer migration of OverviewStrip + 7 panels is in-phase. Recommend: shim only in Phase 27, per-consumer migration absorbed into Phase 28 micro-sweep.
3. **`useResourceCounts` cache TTL.** No TTL is the right default for a local explorer (user is the only writer). But Blaze ingestion may happen between two views in the same session. **Decision needed:** does the existing `refetchKey` arg suffice (caller-driven invalidation) or should Phase 24 add an "invalidate after 60s" TTL? Recommend: caller-driven only, document in cache module header.
4. **`useReducer` discriminated-union typing for `useAsyncRun<TIssue>`.** TypeScript inference on the action type can leak `unknown` into the runner's `appendIssues` call site. Plan a type-test pass during Phase 24.

---

## Sources

- React docs (Suspense, useSyncExternalStore, cache API), reviewed via WebSearch results
- React Router v7 lazy routing — Robin Wieruch + remix-run/react-router decisions docs
- Module-scoped cache patterns — TanStack Query, SWR, MedplumClient internal patterns (well-established)
- AbortController + reducer-based async hook patterns — DEV community + Medium 2025-2026 articles
- Per-metric context vs `useSyncExternalStore` trade-offs — azguards, oneuptime, Epic React 2026 guidance

### Repo evidence (HIGH confidence — all line-verified):
- `src/hooks/useCompletenessReport.ts:43-51, 70-133, 137-157`
- `src/hooks/useCodingCoverage.ts:35-43, 61-127, 134-155`
- `src/hooks/useResourceCounts.ts:15-78`
- `src/hooks/usePlausibilityReport.ts:48-139`
- `src/quality/metricsCache.ts:26-181`
- `src/quality/QualityMetricsContext.tsx:107-173`
- `src/components/explorer/ExplorerLayout.tsx:21-57`
- `src/components/patients/PatientsLayout.tsx:25-61`
- `src/components/quality/QualityLayout.tsx:32-119`
- `src/App.tsx:6-22, 73-83`
- `.planning/CODE-REVIEW-2026-04-16.md` (R1-R15)
- `.planning/v1.4-PLAN-DRAFT.md` (phases 23-29)

---
*Architecture research for: v1.4 Hardening & Tech-Debt Sweep — phases 23-29*
*Researched: 2026-04-16*
