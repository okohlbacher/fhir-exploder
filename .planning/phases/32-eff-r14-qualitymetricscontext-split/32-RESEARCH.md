# Phase 32: EFF-R14 QualityMetricsContext Split - Research

**Researched:** 2026-04-24
**Domain:** React context splitting, render-isolation testing, React 18 + Vitest infrastructure
**Confidence:** HIGH (facts verified against committed code + config; only React-Profiler-under-StrictMode behavior carries a MEDIUM flag)

## Summary

The phase is a mechanical, API-preserving refactor: one 201-line context module becomes seven per-metric context modules plus a composer and a facade. All locked decisions (D-01..D-13 in CONTEXT.md) survive evidence verification except for two line-number corrections that the planner must fold into the plans. The real research value is in the "how" of the Profiler-based per-tile isolation test: React 18's `<Profiler>` API works in Vitest (Vitest leaves `NODE_ENV=test`, which React treats as development for profiling purposes) but the project runs `<StrictMode>` in `main.tsx` (NOT in test wrappers) and several existing tests use their own `<StrictMode>` wrapper for double-mount assertions. The isolation test MUST NOT use StrictMode (it would double every render count and invalidate the 1-vs-2 assertion), and it MUST key its assertion on `phase === 'update'` render counts rather than totals (mount renders are universal).

**Secondary finding:** there are **8 test files** wrapping the provider — **7** that wrap the real `QualityMetricsProvider` (`src/__tests__/*.tsx`) plus **1** that mocks it (`src/components/quality/__tests__/quality-layout.test.tsx`). The mock file does NOT need a live migration — it needs its `vi.mock` target updated. That's a different kind of migration than D-10 assumes (single-line rename everywhere) and the planner should scope it explicitly.

**Primary recommendation:** Adopt the 4-plan decomposition from D-11 exactly as drafted. Plan 32-01 scaffolds the 7 contexts + composer alongside the legacy provider (zero-risk). Plan 32-02 replaces the facade and deletes `QualityMetricsProvider`; the bulk test wrappers rename to `QualityMetricsProviders` via sed-style replacement AND the quality-layout mock target updates to `QualityMetricsProviders`. Plan 32-03 migrates the 7 producers + 2 per-metric consumers. Plan 32-04 adds the Profiler-based isolation test + 7-provider smoke test + regression pass.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Option A — 7 per-metric `React.createContext` symbols + `<QualityMetricsProviders>` composer. Option B (state library) is REJECTED and non-revisitable.
- **D-02** Seven per-metric modules under `src/quality/metrics/` with fixed filenames + fixed hook names + fixed value shapes:
  - `CompletenessContext.tsx` → `useCompletenessRollup()` → `{value, set}`
  - `CoverageContext.tsx` → `useCoverageRollup()` → `{value, set}`
  - `ValidationContext.tsx` → `useValidationRollup()` → `{value, set}`
  - `PlausibilityContext.tsx` → `usePlausibilityRollup()` → `{value, set}`
  - `LabRangesContext.tsx` → `useLabRangesRollup()` → `{value, set}`
  - `ReferencesContext.tsx` → `useReferencesRollup()` → `{value, set}`
  - `DuplicatesContext.tsx` → `useDuplicatesRollup()` → `{overall, breakdown, contribute}` (special shape)
- **D-03** Composer at `src/quality/metrics/index.tsx`, wrap order locked: Completeness → Coverage → Validation → Plausibility → LabRanges → References → Duplicates.
- **D-04** Facade `useQualityMetrics()` stays at `src/quality/QualityMetricsContext.tsx`; `QualityMetricsProvider` component DELETED from that file; types re-exported (`DuplicatesBreakdown`, `DuplicatesContribution`, `QualityMetricsContextValue`).
- **D-05** Per-tile isolation verified via React Profiler snapshot test.
- **D-06** 7-provider smoke test rejects shared-context-symbol regression.
- **D-07** Every provider `value` wrapped in `useMemo`.
- **D-08** Seven producer sites enumerated (see "Runtime State Inventory" for verified line numbers — two corrections).
- **D-09** Per-metric consumers: `OverviewStrip.tsx:67-98`, `QualityOverviewPage.tsx:444-462`. Bulk-read consumers keep facade.
- **D-10** All test wrappers swap to `<QualityMetricsProviders>` (single drop-in replace).
- **D-11** 4-plan incremental decomposition (scaffold → facade → migration → tests).
- **D-12** Each plan ends green (`npm test` + `npx tsc -b --noEmit`).
- **D-13** No merge conflict with Phase 31 (ValidationPanel.tsx:229 untouched by Phase 31).

### Claude's Discretion

- Internal file organization within each `metrics/*.tsx` (co-located vs `__tests__/`).
- Whether `useMemo` dep arrays are per-value or full-tuple.
- Exact naming of the React Profiler test file.
- Whether the 7-provider smoke test lives next to the composer or in `__tests__/`.

### Deferred Ideas (OUT OF SCOPE)

- Zustand / Jotai migration.
- Per-metric type-level isolation in the matrix tab (Phase 35).
- Selector-level memoization (`use<Metric>RollupSelector(sel)`).
- Context → store migration for server-push-style updates.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EFF-R14-01 | 7 per-metric context modules created under `src/quality/metrics/` | Pattern locked in D-02; section "Architecture Patterns → Pattern 1" shows the per-metric module template; `deriveOverallDuplicates` + `EMPTY_DUPLICATES_BREAKDOWN` relocate to `DuplicatesContext.tsx` |
| EFF-R14-02 | `<QualityMetricsProviders>` composite in `src/quality/metrics/index.tsx`; 7-provider smoke test | Composer template in "Pattern 2"; smoke-test template in "Code Examples" |
| EFF-R14-03 | `useQualityMetrics()` facade preserved; bulk consumers (`QualityOverviewPage.tsx:220-245` capture, `:247-328` PDF export, `PdfReportLayout.tsx`) unchanged | Bulk-read call sites verified verbatim below; facade implementation template in "Pattern 3" |
| EFF-R14-04 | Per-metric consumers migrated; React Profiler snapshot test for per-tile isolation | Profiler test template in "Code Examples"; per-tile assertion strategy in "Common Pitfalls → Pitfall 3" |
| EFF-R14-05 | 7 producer sites migrated | Producer site table in "Runtime State Inventory" — TWO line-number corrections from CONTEXT.md D-08 |
| EFF-R14-06 | All 8 test wrappers migrated; zero new boilerplate; no "Maximum update depth" from missing `useMemo` | Test wrapper inventory in "Runtime State Inventory"; eighth wrapper is a `vi.mock`, not a live wrap |

## Project Constraints (from CLAUDE.md)

Directives that bind the planner:

- **React 18.3.1 + TypeScript 5.7 + Vite 8 + Mantine 8 — LOCKED.** Do not upgrade. Mantine 9 requires React 19, which the project explicitly rejects.
- **Do NOT use `@tanstack/react-query`** — MedplumClient handles caching; adding a second cache layer is an anti-pattern per CLAUDE.md.
- **Do NOT use Tailwind** — Mantine is the design system; no utility-class-based alternative allowed.
- **No new runtime dependencies.** v1.5 research locked "one new devDep only" (`fhir-package-loader@^2.2.4` for Phase 33–34). Phase 32 is internal-refactor-only — **zero dependency adds**.
- **React 18 StrictMode in production (`src/main.tsx:16-23`) but NOT in tests.** Several tests add their own `<StrictMode>` for double-mount assertions (`useResourceCounts.test.tsx`, `useAsyncRun.test.tsx`). The new Profiler test MUST NOT wrap in StrictMode.
- **Enter work through a GSD command.** The planner decomposes this into plans via `/gsd-plan-phase`; no direct edits outside GSD workflow.

## Standard Stack

### Core (unchanged — this phase adds no dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | Provides `createContext`, `useContext`, `useMemo`, `useState`, `useCallback`, `<Profiler>` | Already in use; no upgrade — Mantine 8 peer-dep requires React 18 or 19, and v1.5 holds on 18 |
| @testing-library/react | 16.3.2 | `render`, `act`, `renderHook`, `waitFor` | Already in use across every test wrapper in this phase's scope |
| vitest | 4.1.4 | Test runner | Already in use; `test.environment: jsdom` from `vite.config.ts`-less `defineConfig({test})` block (verified in `vitest.config.ts`) |
| @mantine/core | 8.3.18 | `<MantineProvider>` wrapping test trees | Several test wrappers wrap in `<MantineProvider>` (e.g., `duplicates-panel.test.tsx:192`); not directly needed for the Profiler test but matches existing convention |

**Installation:** none — all dependencies already pinned.

**Version verification (verified via `npm view`, 2026-04-24):**
- `react@18.3.1` — pinned exactly in `package.json:27`; registry current (React 19.2.5 is latest but explicitly rejected per CLAUDE.md).
- `@testing-library/react@16.3.2` — pinned in `package.json:48`; registry current.
- `vitest@4.1.4` — pinned in `package.json:62`; registry current 4.1.5 (patch-level — no action needed).
- `@mantine/core@8.3.18` — pinned in `package.json:15`; registry has 9.1.0 (do NOT upgrade per CLAUDE.md).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react (Profiler API) | built-in | `import { Profiler } from 'react'` in the per-tile isolation test | Use a single `<Profiler id={metricKey} onRender={...}>` around each tile in the test harness; aggregate counts in a module-scoped `Map<string, {mount: number, update: number}>` keyed by `id`; assert on `phase === 'update'` counts only. |
| vitest `vi.fn()` / `vi.spyOn` | built-in | Fallback plan per CONTEXT.md `<specifics>`: `vi.spyOn` on the tile component's `render` prop if Profiler flakes | CONTEXT.md marks this as a backup only. Lead with `<Profiler>`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<Profiler id>` with `onRender` count aggregation | `vi.spyOn(React, 'createElement')` to intercept tile creation | CONTEXT.md `<specifics>` explicitly warns against this — fragile under React 18 batching and it measures element creation (which is cheaper than commit), not actual re-render. |
| Per-metric `useState` in each new context | `useReducer` | `useState` matches existing pattern in `QualityMetricsContext.tsx:108-115`. `useReducer` adds one layer of indirection for no benefit at this scale. Per-metric state is a single number + a setter; `useState` is correct. |
| 7 full `<Provider>` components | Single `<Provider>` with a `use-context-selector`-style slice hook | Option B territory — REJECTED in v1.5 requirements. Plus `use-context-selector` adds a runtime dep, which CLAUDE.md + REQUIREMENTS.md line 18 prohibits. |

## Architecture Patterns

### Recommended Layout

```
src/quality/
├── QualityMetricsContext.tsx       # Facade — exports useQualityMetrics() + type re-exports only
└── metrics/
    ├── index.tsx                   # <QualityMetricsProviders> composer
    ├── CompletenessContext.tsx     # createContext + Provider + useCompletenessRollup
    ├── CoverageContext.tsx
    ├── ValidationContext.tsx
    ├── PlausibilityContext.tsx
    ├── LabRangesContext.tsx
    ├── ReferencesContext.tsx
    └── DuplicatesContext.tsx       # + deriveOverallDuplicates + EMPTY_DUPLICATES_BREAKDOWN + DuplicatesBreakdown + DuplicatesContribution types
```

### Pattern 1: Per-Metric Simple Context (Completeness / Coverage / Validation / Plausibility / LabRanges / References)

**What:** Each simple metric gets its own `React.createContext` symbol, a `<Provider>` component that owns `useState<number | undefined>`, and a `use<Metric>Rollup()` consumer hook with a no-op fallback for outside-provider use.

**When to use:** All six non-Duplicates per-metric modules follow this template verbatim.

**Example (Completeness template — the other five are find-and-replace on the word "Completeness"):**

```typescript
// src/quality/metrics/CompletenessContext.tsx
// Source: pattern copied from src/quality/QualityMetricsContext.tsx:107-172 (verified pattern)
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * overallCompleteness: arithmetic mean of per-type populated/total*100.
 * Producer: useCompletenessReport.ts:42. (JSDoc carried over from the
 * monolithic QualityMetricsContext.tsx:7-9 per CONTEXT.md <specifics>.)
 */
export interface CompletenessRollup {
  value: number | undefined;
  set: (value: number | undefined) => void;
}

const CompletenessCtx = createContext<CompletenessRollup | null>(null);

export function CompletenessProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const memoed = useMemo<CompletenessRollup>(() => ({ value, set }), [value]);
  return <CompletenessCtx.Provider value={memoed}>{children}</CompletenessCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback idiom at :179-200. */
export function useCompletenessRollup(): CompletenessRollup {
  const ctx = useContext(CompletenessCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
```

**Note on `useCallback` for setters:** `useState`'s setter is already referentially stable across renders — wrapping it in `useCallback` is cosmetic, not load-bearing. CONTEXT.md `<code_context>` line 109 acknowledges this: "they're just `useState` setters, which are already stable — but wrap for clarity." **Recommendation:** DON'T wrap for clarity. The original code doesn't wrap the raw setters either — only `setDuplicatesContribution`, which is a custom function that genuinely needs `useCallback([], [])`. Adding unnecessary `useCallback` obscures which wrappers are load-bearing.

**[VERIFIED: src/quality/QualityMetricsContext.tsx:108-115]** — the existing code passes raw `useState` setters directly into the value object without `useCallback` wrappers. Only `setDuplicatesContribution` (a composite function) is wrapped.

### Pattern 2: Duplicates Context (Special Shape)

**What:** Same template as Pattern 1 but the value shape is `{overall, breakdown, contribute}` where:
- `breakdown: DuplicatesBreakdown` is owned state;
- `overall: number | undefined` is derived via `useMemo(() => deriveOverallDuplicates(breakdown), [breakdown])`;
- `contribute: (contribution: DuplicatesContribution | 'reset') => void` wraps `setBreakdown` in `useCallback([], [])` — same as existing `setDuplicatesContribution` at `:117-135`.

**Port verbatim:**
- `DuplicatesBreakdown` interface (`src/quality/QualityMetricsContext.tsx:46-49`)
- `DuplicatesContribution` interface (`src/quality/QualityMetricsContext.tsx:56-59`)
- `EMPTY_DUPLICATES_BREAKDOWN` constant (`src/quality/QualityMetricsContext.tsx:94`)
- `deriveOverallDuplicates` function (`src/quality/QualityMetricsContext.tsx:96-105`)

### Pattern 3: Composer

**Example (`src/quality/metrics/index.tsx`):**

```typescript
import type { ReactNode } from 'react';
import { CompletenessProvider } from './CompletenessContext';
import { CoverageProvider } from './CoverageContext';
import { ValidationProvider } from './ValidationContext';
import { PlausibilityProvider } from './PlausibilityContext';
import { LabRangesProvider } from './LabRangesContext';
import { ReferencesProvider } from './ReferencesContext';
import { DuplicatesProvider } from './DuplicatesContext';

/** Mounts all 7 per-metric providers in spec order (D-03 lock). */
export function QualityMetricsProviders({ children }: { children: ReactNode }) {
  return (
    <CompletenessProvider>
      <CoverageProvider>
        <ValidationProvider>
          <PlausibilityProvider>
            <LabRangesProvider>
              <ReferencesProvider>
                <DuplicatesProvider>{children}</DuplicatesProvider>
              </ReferencesProvider>
            </LabRangesProvider>
          </PlausibilityProvider>
        </ValidationProvider>
      </CoverageProvider>
    </CompletenessProvider>
  );
}

// Re-export each per-metric hook so consumers have a single import path for all 7.
export { useCompletenessRollup } from './CompletenessContext';
export { useCoverageRollup } from './CoverageContext';
export { useValidationRollup } from './ValidationContext';
export { usePlausibilityRollup } from './PlausibilityContext';
export { useLabRangesRollup } from './LabRangesContext';
export { useReferencesRollup } from './ReferencesContext';
export { useDuplicatesRollup } from './DuplicatesContext';
```

### Pattern 4: Facade Rewrite

**What:** `src/quality/QualityMetricsContext.tsx` keeps its file path but loses `QualityMetricsProvider` entirely. `useQualityMetrics()` becomes a composition of the 7 per-metric hooks plus the same no-op fallback at the top level (for outside-provider use — preserves behavior at `:179-200`).

**Critical invariant:** The facade object shape MUST match `QualityMetricsContextValue` byte-for-byte. Every field name (`overallCompleteness`, `setCompleteness`, `setOverallValidation`, …) and every property type must be identical. Bulk-read consumers destructure fields by name — a typo here silently breaks PDF export.

```typescript
// src/quality/QualityMetricsContext.tsx (facade — post-split)
import { useMemo } from 'react';
import {
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  usePlausibilityRollup,
  useLabRangesRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from './metrics';

export type { DuplicatesBreakdown, DuplicatesContribution } from './metrics/DuplicatesContext';

export interface QualityMetricsContextValue {
  /* UNCHANGED from the monolithic version — see :61-90 */
}

export function useQualityMetrics(): QualityMetricsContextValue {
  const completeness = useCompletenessRollup();
  const coverage = useCoverageRollup();
  const validation = useValidationRollup();
  const plausibility = usePlausibilityRollup();
  const labRanges = useLabRangesRollup();
  const references = useReferencesRollup();
  const duplicates = useDuplicatesRollup();

  return useMemo<QualityMetricsContextValue>(
    () => ({
      overallCompleteness: completeness.value,
      overallCoverage: coverage.value,
      overallValidation: validation.value,
      overallPlausibility: plausibility.value,
      overallLabRanges: labRanges.value,
      overallReferences: references.value,
      overallDuplicates: duplicates.overall,
      duplicatesBreakdown: duplicates.breakdown,
      setCompleteness: completeness.set,
      setCoverage: coverage.set,
      setOverallValidation: validation.set,
      setOverallPlausibility: plausibility.set,
      setOverallLabRanges: labRanges.set,
      setOverallReferences: references.set,
      setDuplicatesContribution: duplicates.contribute,
    }),
    [completeness, coverage, validation, plausibility, labRanges, references, duplicates],
  );
}
```

**Subtle point about the facade's value:** when any one metric's rollup updates, the facade's `useMemo` re-runs and returns a new object reference. Consumers of `useQualityMetrics()` will re-render — **this is correct and expected**. The win is that consumers that DON'T call `useQualityMetrics()` (the per-metric consumers) DO NOT re-render. Facade consumers keep their coarse-grained subscription; per-metric consumers get fine-grained isolation. That IS the phase's value proposition.

### Anti-Patterns to Avoid

- **Shared context symbol across providers.** If a copy-paste mistake puts two metrics into the same `createContext` symbol, the outer provider's value silently shadows the inner — 7/8 data-loss, no TypeScript error, no runtime error. Guarded by D-06's 7-provider smoke test.
- **Provider value without `useMemo`.** React re-identifies the value object on every provider render; context consumers re-render on every provider render. Per CONTEXT.md + ROADMAP success criterion #6: missing `useMemo` also introduces a hazard where effect deps on `setX` fire every render, potentially producing "Maximum update depth exceeded." Every provider value must memoize.
- **Wrapping raw `useState` setters in `useCallback`.** Cosmetic; not load-bearing. The existing code doesn't — don't add it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting re-renders per tile in the isolation test | Manual ref counter incremented in `useEffect` on every render | React's built-in `<Profiler onRender>` API | Profiler is the officially supported API for this; it exposes `phase` (mount/update/nested-update) so we can filter to only commits caused by the isolated setter call. A hand-rolled ref counter can't distinguish mount from update cleanly. |
| Slice subscription to a single field of a context | A custom `useContextSelector` wrapper | N-separate contexts (D-01) | This is literally what Option B (use-context-selector) was — REJECTED in v1.5 requirements. |
| Fallback object when outside provider | Let hooks throw | The no-op object pattern at `:179-200` | Load-bearing for isolated unit tests that don't wrap in the full provider tree. All 7 new hooks must follow the pattern. |
| Merging DuplicatesContribution into state | Immediate `setState(newObj)` | Functional `setState(prev => ...)` with a `useCallback([], [])` wrapper | Matches `:117-135` exactly. Functional updater means `setDuplicatesContribution` remains stable even across re-renders, which keeps `useEffect` deps in `DuplicatesPanel.tsx:115-122` from firing spuriously. |

**Key insight:** None of this is novel work. Every pattern is already in `QualityMetricsContext.tsx` — the phase multiplies the pattern by 7 and changes the mounting strategy. There's no invention; there's only careful replication.

## Runtime State Inventory

This phase is a pure code refactor. There is **no** stored data, live-service config, OS-registered state, secrets/env vars, or build artifacts affected. But there ARE file/call-site audits the planner must treat as "inventory." Presenting them in this section since it's the natural home for "what runtime-adjacent state will carry old names after the refactor."

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified by grep for QualityMetrics* strings across non-src dirs: all matches are in `.planning/` docs. | None |
| Live service config | None — QualityMetricsContext is pure in-memory state; no localStorage, no IndexedDB, no URL params. | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — TypeScript project references are single-project (`tsc -b --noEmit` works on the whole `src/`); no stale type declarations to worry about. | None |

### Verified code-inventory (the actual "what has to move" audit)

**Producer sites (7 — REQ EFF-R14-05).** CONTEXT.md D-08 cites these line numbers; I verified each:

| # | File | D-08 line | VERIFIED line | Notes |
|---|------|-----------|---------------|-------|
| 1 | `src/hooks/useCompletenessReport.ts` | `:42` | `:42` | `setCompleteness` — `{ setCompleteness } = useQualityMetricsContext()`; migrate to `useCompletenessRollup().set` |
| 2 | `src/hooks/useCodingCoverage.ts` | `:41` | `:41` | `setCoverage` → `useCoverageRollup().set` |
| 3 | `src/components/quality/ValidationPanel.tsx` | `:200` | **`:229`** | **CORRECTION: D-08 line `:200` is wrong — the actual destructure is at `:229`, and the `useEffect` is `:230-234`.** Phase 31 may have pushed this down from its pre-Phase-31 line number. Planner must use the verified `:229` in Plan 32-03. |
| 4 | `src/components/quality/PlausibilityPanel.tsx` | `:109` | `:109` | `setOverallPlausibility` — confirmed |
| 5 | `src/components/quality/LabRangesPanel.tsx` | `:51` | `:51` | `setOverallLabRanges` — confirmed |
| 6 | `src/components/quality/ReferencesPanel.tsx` | `:69` | `:69` | `setOverallReferences` — confirmed |
| 7 | `src/components/quality/DuplicatesPanel.tsx` | `:102` | `:102` | `setDuplicatesContribution` → `useDuplicatesRollup().contribute` |

**Per-metric consumer sites (REQ EFF-R14-04):**

| # | File | D-09 range | Verified | Notes |
|---|------|------------|----------|-------|
| 1 | `src/components/quality/OverviewStrip.tsx` | `:67-98` | `:67` destructures + `:81-98` `metricValueOf()` switch | 7 tiles; each tile should subscribe to its ONE metric via the specific hook. The `metricValueOf` switch can be inlined into `METRIC_ORDER.map` or each tile can be extracted to a child component that calls one hook. |
| 2 | `src/components/quality/QualityOverviewPage.tsx` | `:444-462` | `:443-463` (actual: tabs 443-463; metric label helpers call metrics object fields) | Tab labels at `:444, 447, 450, 453, 456, 459, 462` use `metrics.overallCompleteness` etc. — each line must subscribe per-metric. |

**Bulk-read consumer sites staying on facade (REQ EFF-R14-03):**

| # | File | D-09 range | Verified | Notes |
|---|------|------------|----------|-------|
| 1 | `src/components/quality/QualityOverviewPage.tsx` (capture handler) | `:220-245` | `:204` (`const metrics = useQualityMetrics()`) + `:220-245` (capture handler body uses `metrics`) | Correct — facade preserves the bulk read. |
| 2 | `src/components/quality/QualityOverviewPage.tsx` (export handler) | `:247-328` | `:247-328` | Same `metrics` reference from `:204` — correct, facade preserves. |
| 3 | `src/components/quality/PdfReportLayout.tsx` | (whole file) | Receives pre-computed `summary.totals` via props (`PdfReportLayoutProps.summary`). **Does NOT call `useQualityMetrics()` directly** — it's a pure renderer of pre-computed data. | **CORRECTION: PdfReportLayout is NOT a facade consumer.** The facade handoff happens inside `QualityOverviewPage`'s export handler at `:278-286` which reads `metrics.overallCompleteness` etc. into a `totals` object and passes that into `exportQualityPdf`. No change to `PdfReportLayout` in this phase. Planner: drop this file from the "bulk-read consumer" list. |
| 4 | `src/components/quality/QualityOverviewPage.tsx` (tab labels — SAME FILE as #1 and #2) | `:444-462` | see above | **Important note:** `QualityOverviewPage.tsx` is BOTH a bulk-read consumer (capture/export) AND a per-metric consumer (tab labels). In the migration, line `:204`'s `const metrics = useQualityMetrics()` STAYS (for capture/export); the 7 tab labels at `:444-462` each replace `metrics.overallX` with a dedicated `use<Metric>Rollup().value` call hoisted to the top of the component body alongside the facade call. Both coexist. |

**Test wrappers (REQ EFF-R14-06 — 8 total per CONTEXT.md).** Verified via `grep -rn "QualityMetricsProvider" src/`:

| # | File | Line | Type | Migration |
|---|------|------|------|-----------|
| 1 | `src/__tests__/quality-overview.test.tsx` | `:173, 188, 190, 298, 300, 384, 398, 526, 528, 542, 544` | Direct wrap (5 render sites) | Rename import + all usages. |
| 2 | `src/__tests__/duplicates-panel.test.tsx` | `:188, 194` | Direct wrap | Rename import + usage in `ProviderWrapper`. |
| 3 | `src/__tests__/completeness-hook.test.tsx` | `:24, 76, 360, 362, 399, 401, 427, 429` | Direct wrap (multiple render sites) | Rename import + all usages. |
| 4 | `src/__tests__/references-panel.test.tsx` | `:52, 68` | Direct wrap | Rename import + usage in wrapper. |
| 5 | `src/__tests__/plausibility-panel.test.tsx` | `:59, 75` | Direct wrap | Rename import + usage in wrapper. |
| 6 | `src/__tests__/lab-ranges-panel.test.tsx` | `:66, 82` | Direct wrap | Rename import + usage in wrapper. |
| 7 | `src/__tests__/coding-coverage-panel.test.tsx` | `:56, 97` | Direct wrap | Rename import + usage in wrapper. |
| 8 | `src/components/quality/__tests__/quality-layout.test.tsx` | `:71, 74, 75, 163, 182` | **`vi.mock` target** — NOT a direct wrap | **Different migration.** The test does `vi.mock('../../../quality/QualityMetricsContext', () => ({ QualityMetricsProvider: ..., useQualityMetrics: () => ({}) }))`. After the facade rewrite, `QualityMetricsContext` no longer exports `QualityMetricsProvider`. Planner options: (a) re-point the mock to `../../../quality/metrics` and mock `QualityMetricsProviders`; OR (b) since `QualityLayout.tsx` will import from `../../quality/metrics` after the rewrite, move the `vi.mock` target accordingly AND update the identifier used in `:75` from `QualityMetricsProvider` to `QualityMetricsProviders` AND update the comment at `:71` and the assertion at `:163/:182` (which reference "QualityMetricsProvider" by name in comments). The `useQualityMetrics: () => ({})` mock STAYS (pointing at `QualityMetricsContext.tsx`). This wrapper is the ONLY one that needs non-mechanical attention. |

**Import sites of `QualityMetricsContextValue`, `DuplicatesBreakdown`, `DuplicatesContribution`:** grep confirms ONLY `QualityMetricsContext.tsx` itself uses the interface names directly — no external `import { DuplicatesBreakdown }` statements. The type re-export from the facade (D-04) is safety/future-proofing, not a current requirement. **Good news: zero import sites break if the re-exports are missing.**

**Import sites of `useQualityMetrics`:** verified — 10 files import it (7 producer + 2 consumer + 1 test-mock). Facade preserves the import path `src/quality/QualityMetricsContext` — zero import-path edits needed outside the 7 producers and 2 consumers that switch to per-metric hooks.

## Common Pitfalls

### Pitfall 1: Profiler test that doesn't distinguish mount from update

**What goes wrong:** Asserting `renderCount[metric] === 1` for every tile passes on fresh mount regardless of whether updates re-render everyone — every tile mounts exactly once.

**Why it happens:** The Profiler fires `onRender` with `phase === 'mount'` once per component per mount AND then `phase === 'update'` on every subsequent commit. If the test counts all phases, it conflates the mount commit (which renders everything) with the update commit (which is what we're trying to isolate).

**How to avoid:** In the `onRender` callback, increment counters only when `phase === 'update'`. Assert `updateCounts['completeness'] === 1 && updateCounts['coverage'] === 0 && ...` after the setter fires.

**Warning signs:** Test passes when it "shouldn't" (pre-refactor, monolithic context); or test fails with every tile showing equal counts (you're counting mount phases).

**[VERIFIED: react.dev/reference/react/Profiler]** — `phase` is one of `'mount' | 'update' | 'nested-update'`; each commit fires one `onRender` per Profiler in the tree.

### Pitfall 2: Profiler test wrapped in StrictMode

**What goes wrong:** Under StrictMode every render fires twice in development (including Vitest-test-mode). A "single re-render" assertion fails because the Profiler reports 2 updates.

**Why it happens:** StrictMode is opt-in per tree. The main app (`src/main.tsx:16`) wraps the whole app in StrictMode, which the user never sees in tests (tests bypass `main.tsx`). But some tests opt in explicitly (e.g., `src/hooks/__tests__/useResourceCounts.test.tsx:211`) to verify double-mount cancellation.

**How to avoid:** The new Profiler-based isolation test MUST NOT wrap in `<StrictMode>`. Confirm the test harness uses `<MantineProvider><MemoryRouter><QualityMetricsProviders>…</QualityMetricsProviders></MemoryRouter></MantineProvider>` — no StrictMode.

**Warning signs:** Counts are exactly 2× what you expect for the updated tile; unrelated tiles show count 2 instead of 1.

**[VERIFIED: src/hooks/__tests__/useResourceCounts.test.tsx:203-211]** — project already uses StrictMode wrappers in tests; this establishes the convention that StrictMode is opt-in per test, not global.

### Pitfall 3: Facade returns a new object reference every render

**What goes wrong:** The facade's `useMemo` with dep array `[completeness, coverage, validation, ...]` returns a new object when ANY per-metric hook value changes. Consumers destructuring the facade re-render on every metric change — same "every tile re-renders" behavior as before the split.

**Why it doesn't block the phase:** The facade consumers ARE the coarse-grained consumers by design (capture/export, tab-labels-as-bulk-read). Per-metric consumers are the 7 tiles + 7 tab labels + 7 producers — they call `use<Metric>Rollup()` directly, NOT the facade.

**How to avoid confusion in review:** The Profiler test asserts per-tile isolation on `OverviewStrip`, which (after Plan 32-03) calls `use<Metric>Rollup()` directly — NOT `useQualityMetrics()`. If a reviewer mistakenly points at the facade's new-reference-every-change and claims "the split didn't work," the response is "correct for facade consumers; the tiles bypass the facade."

**Warning signs:** Someone adding a new per-metric consumer calls `useQualityMetrics()` out of convenience and loses the re-render isolation. Mitigation: The planner should add a JSDoc comment to `useQualityMetrics()` warning "for bulk-read sites only; per-metric consumers must use `use<Metric>Rollup()` for render isolation (Phase 32 EFF-R14 contract)."

### Pitfall 4: Facade drops `DuplicatesBreakdown` type re-export, silently breaks a future import

**What goes wrong:** Zero files currently import `DuplicatesBreakdown` or `DuplicatesContribution` externally (verified by grep). But if the planner drops the re-export from `QualityMetricsContext.tsx` and a future consumer imports `{ DuplicatesBreakdown } from '../quality/QualityMetricsContext'`, it will compile-fail later.

**Why it matters:** The types SHOULD be re-exported from the facade for API stability, even though nothing currently needs it. D-04 already specifies this — the planner must include it.

**How to avoid:** Plan 32-02's facade rewrite MUST include `export type { DuplicatesBreakdown, DuplicatesContribution } from './metrics/DuplicatesContext';`. Confirmed in "Pattern 4" above.

### Pitfall 5: Test wrapper migration misses a render-site

**What goes wrong:** The 7 direct-wrap test files have between 2 and 11 mentions of `QualityMetricsProvider` each. A find-and-replace that only catches imports leaves wrapper JSX untouched.

**How to avoid:** Use the exact grep command from D-10: `grep -rln "QualityMetricsProvider" src/ --include="*.test.*" --include="*.tsx"` then for each file, `grep -n QualityMetricsProvider <file>` to verify every mention is renamed. Planner: add this as a verification step in Plan 32-02's checklist.

**Warning signs:** `npm test` reports `'QualityMetricsProvider' is not exported from '../quality/QualityMetricsContext'` (TypeScript error) on the missed file.

### Pitfall 6: `vi.mock` for quality-layout test goes stale

**What goes wrong:** `src/components/quality/__tests__/quality-layout.test.tsx:74-79` does `vi.mock('../../../quality/QualityMetricsContext', () => ({ QualityMetricsProvider: ..., useQualityMetrics: () => ({}) }))`. After Plan 32-02 deletes `QualityMetricsProvider` from that module, the mock's factory still exports it (a stub — no runtime error), but `QualityLayout.tsx` will have stopped importing it. The mock becomes inert.

**How to avoid:** In Plan 32-02 also update this mock to target `../../../quality/metrics` and export `QualityMetricsProviders`. Plus update the identifier in the comment at `:75` and the assertions at `:163/:182`.

**Warning signs:** Test passes because the mock silently shadows nothing; deleting the mock entirely also passes because `QualityLayout`'s actual tree renders fine. The test becomes meaningless without causing a failure. Only way to catch: review.

### Pitfall 7: Functional `useState` updater NOT used in Duplicates contribute

**What goes wrong:** If the Duplicates `contribute` setter captures `breakdown` from closure instead of using `setBreakdown(prev => ...)`, rapid successive `contribute` calls can lose merges.

**How to avoid:** Port `:117-135` VERBATIM — it already uses `setDuplicatesBreakdownState((prev) => ...)`.

**[VERIFIED: src/quality/QualityMetricsContext.tsx:123]** — the existing code uses `setDuplicatesBreakdownState((prev) => { ... })`; the port must preserve this.

## Code Examples

### Per-tile isolation test (REQ EFF-R14-04 — Plan 32-04)

```typescript
// src/__tests__/metrics-isolation.test.tsx
// (filename is planner's discretion per CONTEXT.md; this is the template)
import { describe, it, expect } from 'vitest';
import { Profiler, useEffect, type ProfilerOnRenderCallback } from 'react';
import { render, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import {
  QualityMetricsProviders,
  useCompletenessRollup,
} from '../quality/metrics';
import { OverviewStrip } from '../components/quality/OverviewStrip';

// Harness that triggers one setCompleteness after mount.
function Harness({ setterSnapshot }: { setterSnapshot: (set: (v: number | undefined) => void) => void }) {
  const { set } = useCompletenessRollup();
  useEffect(() => {
    setterSnapshot(set);
  }, [set, setterSnapshot]);
  return null;
}

describe('QualityMetrics — per-tile render isolation (EFF-R14-04)', () => {
  it('updating overallCompleteness re-renders ONLY the Completeness tile', async () => {
    // Key on phase === 'update' only — mount phase is universal and not load-bearing.
    const updateCounts = new Map<string, number>();
    const onRender: ProfilerOnRenderCallback = (id, phase) => {
      if (phase === 'update') {
        updateCounts.set(id, (updateCounts.get(id) ?? 0) + 1);
      }
    };

    // NB: NO StrictMode — would double every render count. See Pitfall 2.
    let setCompleteness!: (v: number | undefined) => void;
    render(
      <MantineProvider>
        <MemoryRouter>
          <QualityMetricsProviders>
            <Harness setterSnapshot={(s) => { setCompleteness = s; }} />
            {/* OverviewStrip renders 7 tiles; wrap it once with a root Profiler;
                after Plan 32-03, each tile internally subscribes to its own hook. */}
            <Profiler id="overview-strip" onRender={onRender}>
              <OverviewStrip summary={{ total: 0, typeCount: 0 }} isLoading={false} />
            </Profiler>
          </QualityMetricsProviders>
        </MemoryRouter>
      </MantineProvider>,
    );

    // Flush the mount.
    await act(async () => { await Promise.resolve(); });
    updateCounts.clear(); // discard mount-phase artifacts (defensive — mounts shouldn't be here)

    // Trigger exactly one completeness update.
    await act(async () => { setCompleteness(42); });

    // The full-tree Profiler sees 1 update (root re-rendered for the state change).
    // For *per-tile* isolation we need per-tile Profilers — planner adds one per
    // tile inside OverviewStrip as a test hook, or splits OverviewStrip into
    // 7 Tile subcomponents each wrapped in a Profiler.
    expect(updateCounts.get('overview-strip')).toBeDefined();
  });
});
```

**Note:** This template shows the root Profiler pattern. For per-tile assertion, the planner needs either:
- (a) refactor `OverviewStrip` to render 7 `<Tile key={metric}>` components each wrapped in `<Profiler id={metric}>`; OR
- (b) wrap each tile in the TEST (by rendering a test-local version of the strip); OR
- (c) make the `OverviewStrip` aware of a dev-only Profiler prop (polluting production code — reject).

**Recommendation:** option (a). Refactor `OverviewStrip` so each metric tile is a small `<MetricTile metricKey={key} />` component that calls `use<Metric>Rollup()` internally and is wrapped by a `<Profiler id={key}>` in test mode. This is the cleanest path and aligns with Pattern 1. The Profiler can be live in production too — React reports that Profiler overhead is measurable only in deep trees; 7 leaf tiles is not deep.

**Alternative:** Without a refactor, the test can build a harness that wraps each per-metric hook CALL in a `<Profiler id={metric}>` around a minimal consumer component that just subscribes to one hook and renders nothing. This tests the isolation AT THE HOOK LEVEL rather than at the UI tile level — arguably more precise, since it removes confounds from OverviewStrip's own render logic. CONTEXT.md D-05 says "mounts OverviewStrip" — follow D-05 but document the refactor.

### 7-provider smoke test (REQ EFF-R14-02 — Plan 32-04)

```typescript
// src/quality/metrics/__tests__/providers-smoke.test.tsx (location: planner's discretion)
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import {
  QualityMetricsProviders,
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  usePlausibilityRollup,
  useLabRangesRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from '../index';

function Wrapper({ children }: { children: ReactNode }) {
  return <QualityMetricsProviders>{children}</QualityMetricsProviders>;
}

describe('QualityMetricsProviders composer (EFF-R14-02)', () => {
  it('all 7 per-metric hooks return a LIVE context (not the no-op fallback)', () => {
    // If two providers shared a Ctx symbol, one of these would return the no-op fallback —
    // detectable because calling .set (or .contribute for Duplicates) would be a no-op
    // AND the `value` would stay undefined after we call set.
    const { result } = renderHook(
      () => ({
        completeness: useCompletenessRollup(),
        coverage: useCoverageRollup(),
        validation: useValidationRollup(),
        plausibility: usePlausibilityRollup(),
        labRanges: useLabRangesRollup(),
        references: useReferencesRollup(),
        duplicates: useDuplicatesRollup(),
      }),
      { wrapper: Wrapper },
    );

    // Each simple metric: call set(N), verify value updates to N.
    // (Real test uses act() to wrap the setter; omitted here for brevity.)
    // Duplicates: call contribute({patient: 50}), verify breakdown.patient === 50.
    // These 7 assertions collectively reject any shared-symbol regression.
    expect(result.current.completeness.set).toBeDefined();
    expect(result.current.duplicates.contribute).toBeDefined();
    // ... (7 smoke-level assertions)
  });
});
```

### Existing `useMemo` / `useCallback` idiom (the pattern to replicate)

```typescript
// Existing — from src/quality/QualityMetricsContext.tsx:117-135 and :142-171
const setDuplicatesContribution = useCallback(
  (contribution: DuplicatesContribution | 'reset') => {
    // ... functional updater body ...
  },
  [],
);

const value = useMemo(
  () => ({ /* ...all fields... */ }),
  [overallCompleteness, overallCoverage, /* ...all state tuple members... */, setDuplicatesContribution],
);
```

**Important:** the `useMemo` dep array at `:160-170` includes `setDuplicatesContribution` but NOT the raw setters from `useState` (they're omitted — React's useState setters are stable by identity; including them is harmless but unnecessary). Per-metric providers follow the same convention: dep on the state value only.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic `<QualityMetricsProvider>` with 8 fields → every consumer re-renders on any change | N-contexts pattern: one `createContext` per slice + composer | N/A (the refactor IS the state change) | Per-metric consumers stop re-rendering on unrelated changes; facade consumers keep their coarse subscription. |
| `jest` (historical) | `vitest@4.1.4` | Already on vitest for the project's lifetime | No action — already there. |
| React 17's legacy implicit batching | React 18's automatic batching (all state updates in all async contexts now batch) | React 18 upgrade (pre-project-start) | Relevant to Pitfall 1: batched state updates mean one commit per effect, one onRender per commit. Don't assume a setter call causes exactly one commit — effects on top can coalesce. |

**Deprecated/outdated:**
- `ReactDOM.render` — deprecated in favor of `createRoot` (project already uses `createRoot` in `main.tsx`, verified). No action.
- `jest.spyOn(React, 'createElement')` — listed in CONTEXT.md `<specifics>` as a test approach to AVOID. Use `<Profiler>` instead.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vitest 4 leaves `NODE_ENV='test'` (or unset), which React treats as development → `<Profiler>` `onRender` fires in tests. | Pattern 1, Profiler template | If Vitest 4 changed this (it didn't in 4.1.4 — verified against `vite.config.ts` having no NODE_ENV override), the Profiler test would silently never fire `onRender` and always pass. Mitigation: Plan 32-04 includes a sanity assertion that `onRender` fires AT LEAST once. |
| A2 | React 18 `<Profiler>` API is stable and not experimental in 18.3.1. | Pattern 1 | If it's still experimental, the import path would be different. **[VERIFIED: react.dev/reference/react/Profiler is the stable docs URL; Profiler is exported from 'react' directly since 16.9, stable in 17+]** — so A2 is actually VERIFIED, not assumed. |
| A3 | No external package currently imports `DuplicatesBreakdown` or `DuplicatesContribution` from `src/quality/QualityMetricsContext`. | Pitfall 4 | Verified by grep; but if the planner adds an import site in another plan landed between this research and Plan 32-02, the re-export becomes load-bearing. D-04 already locks the re-export, so risk is zero. |

## Open Questions

1. **Should `OverviewStrip` be refactored into a `<MetricTile>` sub-component during Plan 32-03, or during the Profiler test's prep step?**
   - What we know: CONTEXT.md D-05 says "mounts OverviewStrip" — the test harness wraps the whole strip. Per-tile Profiler requires per-tile component boundaries.
   - What's unclear: whether to take on the refactor in Plan 32-03 (consumer migration) or defer to Plan 32-04 (test setup).
   - Recommendation: Plan 32-03. Refactoring `OverviewStrip` into 7 `<MetricTile metricKey={k} />` components IS the consumer migration — each tile calling its specific `use<Metric>Rollup()` is literally what D-09 asks for. The Profiler wrapping can then be test-only (wrap each `<MetricTile>` in a `<Profiler>` in the test file).

2. **Does the `useCallback` wrapper on raw setters add value, or is it cosmetic?**
   - What we know: CONTEXT.md `<code_context>` says "wrap for clarity." The existing code does NOT wrap raw `useState` setters.
   - Recommendation: **don't wrap**. Preserves existing convention. Saves 7 pointless `useCallback` calls. Setter identity is stable without it.

## Environment Availability

This phase has no external dependencies (no new libraries, no CLI tools, no services). All required infrastructure is already present:

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| React `Profiler` API | Plan 32-04 isolation test | ✓ | 18.3.1 (built-in) | — |
| Vitest + jsdom | All plans | ✓ | 4.1.4 + 29.0.2 | — |
| @testing-library/react | All test plans | ✓ | 16.3.2 | — |
| TypeScript | `tsc -b --noEmit` gate (D-12) | ✓ | 5.7.0 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| Config file | `vitest.config.ts` (project root) — `test: { globals: true, environment: 'jsdom', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] }` |
| Quick run command | `npx vitest run <pattern>` — e.g., `npx vitest run src/__tests__/metrics-isolation.test.tsx` |
| Full suite command | `npm test` (resolves to `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| EFF-R14-01 | 7 per-metric modules export correct hook names | unit | `npx vitest run src/quality/metrics/__tests__/providers-smoke.test.tsx` | ❌ Wave 0 |
| EFF-R14-02 | `<QualityMetricsProviders>` wraps all 7 providers; shared-symbol regression rejected | unit | `npx vitest run src/quality/metrics/__tests__/providers-smoke.test.tsx` | ❌ Wave 0 |
| EFF-R14-03 | `useQualityMetrics()` facade returns pre-split shape; bulk consumers unchanged | regression (existing) | `npx vitest run src/__tests__/quality-overview.test.tsx` | ✅ (existing; survives) |
| EFF-R14-04 | Per-metric consumer render isolation via Profiler | unit | `npx vitest run src/__tests__/metrics-isolation.test.tsx` (filename planner's discretion) | ❌ Wave 0 |
| EFF-R14-05 | Producer sites pushing to correct per-metric context | regression (existing) | `npx vitest run src/__tests__/completeness-hook.test.tsx src/__tests__/coding-coverage-panel.test.tsx src/__tests__/plausibility-panel.test.tsx src/__tests__/lab-ranges-panel.test.tsx src/__tests__/references-panel.test.tsx src/__tests__/duplicates-panel.test.tsx src/__tests__/validation-panel.test.tsx` | ✅ (existing; wrappers migrate in Plan 32-02) |
| EFF-R14-06 | Test wrapper migration doesn't regress; no "Maximum update depth exceeded" | full suite | `npm test` — must show 868+ passing, 0 failing | ✅ (aggregate) |

### Sampling Rate

- **Per task commit (within a plan):** `npx vitest run <files-touched-by-this-task>` — fast feedback loop. For Plan 32-02's test-wrapper rename commits, `npx vitest run src/__tests__/quality-overview.test.tsx src/__tests__/duplicates-panel.test.tsx …` (the 7 renamed files).
- **Per wave merge (end of plan):** `npm test` full suite — must be green per D-12. Also `npx tsc -b --noEmit` per D-12.
- **Phase gate (before `/gsd-verify-work`):** full suite green (868+ passing, 0 failing); phase-exit Nyquist check confirms EFF-R14-01..06 all have automated tests pointing at them.

### Coverage Strategy

- **Profiler assertions sample: 7 of 7 tiles.** The isolation test must wrap all 7 metric tiles in their own `<Profiler id={key}>` and assert update counts individually for each one. Sampling only "a few tiles" is insufficient — the whole point is that the split eliminates cross-tile re-renders, and a shared-symbol regression could cause two specific tiles to coalesce (not all 7).
- **Facade regression sampling: 3 of 3 bulk-read call sites** — the capture handler (`QualityOverviewPage.tsx:220-245`), export handler (`:247-328`), and (transitively via PDF props) `PdfReportLayout.tsx` rendering. Existing tests already cover the facade shape (`quality-overview.test.tsx`'s `ContextFillerHarness` at `:327-363` exercises every field setter). These tests SURVIVE the refactor because the test wrappers rename; no new coverage needed for facade.
- **Producer regression sampling: 7 of 7 producer sites** — existing per-panel tests exercise the push path; they survive and are re-pointed to the new composer via wrapper rename.
- **Smoke test coverage: 7 of 7 hooks** — the 7-provider smoke test calls every per-metric hook inside the composer and verifies none of them returns the no-op fallback. This is the primary defense against shared-symbol regressions.

### Wave 0 Gaps

- [ ] `src/__tests__/metrics-isolation.test.tsx` (or `src/components/quality/__tests__/OverviewStrip.isolation.test.tsx` — planner names it) — covers EFF-R14-04 Profiler per-tile isolation.
- [ ] `src/quality/metrics/__tests__/providers-smoke.test.tsx` (or planner-chosen location) — covers EFF-R14-02 seven-provider smoke.
- [ ] Framework install: none needed. All dependencies already present.

## Security Domain

`security_enforcement` is not explicitly configured in `.planning/config.json`. Per the agent's default ("absent = enabled"), I'm including the domain analysis.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (phase is internal refactor; no auth surface) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | — (no new input surfaces) |
| V6 Cryptography | no | — |
| V7 Error Handling & Logging | no | — (no new error paths) |
| V8 Data Protection | no | — (no new data stores; all state is in-memory rollups) |

**Summary:** Phase 32 is a pure client-side render-optimization refactor. It does not read from, write to, or transmit any data that changes hands between trust boundaries. The monolithic context holds 7 integers + an object of integers; none of these are user-controlled inputs (they're all derived from FHIR sample results already computed elsewhere). ASVS does not meaningfully apply.

### Known Threat Patterns for React context refactor

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Shared-context-symbol regression silently masks one provider with another → data loss | Information Disclosure (affected metric reads as "no data" when it has data) | 7-provider smoke test (D-06 / EFF-R14-02). Rejects the regression on the very first test run. |
| Missing `useMemo` on provider value → "Maximum update depth exceeded" render loop | Denial of Service (UI hang) | `useMemo` on EVERY provider `value` (D-07). Caught by `npm test` if any existing test renders the affected provider — several do. |
| Facade returns unstable object reference, causing silent re-render floods in facade consumers | DoS (performance degradation) | `useMemo` on the facade's aggregation (Pattern 4). Verified by existing `quality-overview.test.tsx` tests passing without "too many re-renders" warnings. |

**No new security risks introduced by this phase.** The threat model is purely correctness-preservation: keep the observable API stable, keep render counts sane.

## Sources

### Primary (HIGH confidence)

- `src/quality/QualityMetricsContext.tsx` (local, verified line-by-line) — monolithic source being split. Lines `:1-30` JSDoc, `:46-59` types, `:92-105` helper, `:107-172` provider, `:179-200` consumer.
- `src/components/quality/QualityLayout.tsx:12, 28-30` — composer mount site.
- `src/components/quality/OverviewStrip.tsx:31, 67, 81-98` — per-metric consumer target.
- `src/components/quality/QualityOverviewPage.tsx:62, 204, 220-245, 247-328, 443-463` — facade + tab-label consumer.
- `src/components/quality/PdfReportLayout.tsx` (entire) — receives pre-computed `totals` via props; **NOT a direct context consumer**.
- Producer sites verified via `Grep` and `Read`:
  - `src/hooks/useCompletenessReport.ts:42` ✓
  - `src/hooks/useCodingCoverage.ts:41` ✓
  - `src/components/quality/ValidationPanel.tsx:229` (D-08 line `:200` is stale — **correction**)
  - `src/components/quality/PlausibilityPanel.tsx:109` ✓
  - `src/components/quality/LabRangesPanel.tsx:51` ✓
  - `src/components/quality/ReferencesPanel.tsx:69` ✓
  - `src/components/quality/DuplicatesPanel.tsx:102` ✓
- Test wrappers verified via `Grep`: 7 direct wraps + 1 `vi.mock` = 8 total.
- `package.json` — React 18.3.1, Mantine 8.3.18, Vitest 4.1.4, TypeScript 5.7.0, @testing-library/react 16.3.2 pins.
- `vitest.config.ts` — `environment: jsdom`, no NODE_ENV override.
- `.planning/config.json` — `nyquist_validation: true`.

### Secondary (MEDIUM confidence)

- [React `<Profiler>` documentation (official, react.dev)](https://react.dev/reference/react/Profiler) — `onRender` signature, `phase` enum, caveat on production profiling. Verified the API is stable in React 18. [CITED]
- npm registry `npm view` confirmations (2026-04-24):
  - `react@18.3.1` peerDependencies for Medplum React (accepts `^18.0.0 || ^19.0.0`).
  - `vitest@4.1.5` is latest (pinned 4.1.4 — patch behind, no action).
  - `@mantine/core@9.1.0` is latest (pinned 8.3.18 — do NOT upgrade per CLAUDE.md).
  - `@medplum/react@5.1.9` peerDependencies (accepts Mantine 8.x explicitly).

### Tertiary (LOW confidence)

- Web search on "React Profiler NODE_ENV production Vitest" — consistent across multiple sources that profiling disables in production builds but works in test mode (since `NODE_ENV=test` is treated like development by React's bundled dev build). Confirmed by `vite.config.ts` not overriding `NODE_ENV`. No LOW-confidence findings made load-bearing.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all pinned in `package.json`, no new deps.
- Architecture: HIGH — template is a verbatim replication of `QualityMetricsContext.tsx:107-172` pattern, proven and in-tree.
- Runtime inventory: HIGH — every claim in D-08 / D-09 / D-10 independently verified by `Grep` / `Read`; 2 corrections documented (ValidationPanel line, PdfReportLayout not-a-consumer).
- Profiler test pattern: MEDIUM — React Profiler API is well-documented and stable, but no prior use in this repo. Template tested conceptually, not yet executed.
- Test wrapper migration: HIGH — 8 files enumerated with exact line numbers.
- Validation architecture: HIGH — Nyquist-compliant map with unit-test commands resolvable today.

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days; no fast-moving dependencies in play — React 18, Mantine 8, Vitest 4 are all stable targets for this project)

Sources:
- [React Profiler official docs](https://react.dev/reference/react/Profiler)
- [React legacy Profiler API docs](https://legacy.reactjs.org/docs/profiler.html)
