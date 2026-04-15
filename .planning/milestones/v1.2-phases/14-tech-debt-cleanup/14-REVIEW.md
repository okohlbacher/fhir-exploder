---
phase: 14-tech-debt-cleanup
reviewed: 2026-04-13T21:30:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - public/settings.yaml
  - src/__tests__/display-modes.test.tsx
  - src/__tests__/json-highlight.test.ts
  - src/__tests__/resolved-resource.test.tsx
  - src/components/explorer/ResourceDetailPage.tsx
  - src/components/explorer/ResourcePropertyTable.tsx
  - src/components/explorer/SearchResultsPage.tsx
  - src/components/patients/FhirResourcesView.tsx
  - src/components/patients/MiiModuleTab.tsx
  - src/components/patients/PatientTimeline.tsx
  - src/components/quality/CodingDrillDown.tsx
  - src/components/quality/SampleSizeControl.tsx
  - src/components/quality/ValidationPanel.tsx
  - src/contexts/TerminologyContext.tsx
  - src/hooks/useCompletenessReport.ts
  - src/hooks/useValidationRun.ts
  - src/quality/completenessWalker.ts
  - src/terminology/TerminologyResolver.ts
  - src/terminology/terminologyKey.ts
  - src/terminology/walker.ts
  - src/utils/export.ts
  - src/utils/fhir-helpers.ts
  - src/utils/timeline-utils.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-04-13T21:30:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed 23 source files spanning the Explorer, Patient, Quality, Terminology, and utility layers. No critical security or crash-inducing bugs were found. The codebase is well-structured with consistent patterns for FHIR data access, cancellation in effects, and graceful error fallbacks.

The main concerns are: (1) a race condition in `useValidationRun` when `start` is called rapidly, (2) module-scoped mutable singleton state in `useCompletenessReport` that does not reset across HMR, (3) several silently swallowed errors that make debugging harder, and (4) significant code duplication of resource summary/date extraction across four components.

## Warnings

### WR-01: Race condition in useValidationRun when start() called rapidly

**File:** `src/hooks/useValidationRun.ts:81-168`
**Issue:** The `start` callback launches an untracked async IIFE via `void (async () => { ... })()`. If `start` is called a second time before the first run completes, `cancelledRef` is reset to `false` on line 84, but the first run's batch loop only checks `cancelledRef` at batch boundaries (lines 99, 141, 155). Between the reset and the next boundary check, both runs execute concurrently and interleave `setIssues` / `setByResource` / `setProgress` state updates, corrupting results.

**Fix:** Track the running promise or use an `AbortController` per run. At minimum, guard `start` to no-op while status is `'running'`:
```typescript
const start = useCallback(() => {
  if (!client || !resourceType || !settings) return;
  if (status === 'running') return; // Prevent concurrent runs
  // ... rest of start logic
}, [client, resourceType, sampleSize, batchSize, settings, status]);
```
Note: the UI already disables the button when `status === 'running'` (ValidationPanel line 232), but the hook should be self-protecting since it is a reusable API.

### WR-02: Module-scoped mutable singleton in useCompletenessReport

**File:** `src/hooks/useCompletenessReport.ts:39-47`
**Issue:** `cacheInstance` and `cacheServerUrl` are module-level mutable variables. During Vite HMR, the module is re-evaluated but these variables are recreated as `null`, silently dropping the in-memory cache. In production this is harmless, but during development it can cause confusing re-fetch storms. More importantly, if two React roots ever mount (e.g. in tests), they share the same singleton, which can cause cross-test contamination.

**Fix:** Move the cache into a React ref or context, or use `import.meta.hot?.data` to preserve across HMR:
```typescript
// Option A: Vite HMR-safe module state
let cacheInstance: QualityMetricsCache | null =
  (import.meta.hot?.data?.cacheInstance as QualityMetricsCache | null) ?? null;
let cacheServerUrl: string | null =
  (import.meta.hot?.data?.cacheServerUrl as string | null) ?? null;
if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    data.cacheInstance = cacheInstance;
    data.cacheServerUrl = cacheServerUrl;
  });
}
```

### WR-03: Silently swallowed errors hide debugging information

**File:** `src/components/patients/MiiModuleTab.tsx:74`
**File:** `src/components/patients/FhirResourcesView.tsx:113-116,143`
**File:** `src/components/patients/PatientTimeline.tsx:138`
**Issue:** Multiple `.catch()` handlers silently swallow errors with no logging. When a FHIR search fails (e.g. server timeout, malformed URL, 4xx response), the user sees "No resources found" with no indication that a fetch failed vs. legitimately empty results. This makes production debugging very difficult.

In `FhirResourcesView.tsx` line 113-116, the count fetch `.catch()` correctly sets state to `'error'` and shows a badge, which is good. But in `handleExpand` (line 143), the resource fetch `.catch()` silently sets an empty array, hiding the error entirely.

**Fix:** Add `console.warn` in catch handlers so errors are visible in dev tools, and optionally surface an error state to the user:
```typescript
// MiiModuleTab.tsx line 74
.catch((err) => {
  if (cancelled) return;
  console.warn(`[MiiModuleTab] Failed to fetch ${module.fhirResourceType}:`, err);
  setResources([]);
  setLoading(false);
});
```

### WR-04: Operator precedence issue with nullish coalescing and type assertion

**File:** `src/components/patients/MiiModuleTab.tsx:130`
**Issue:** The expression `{toRecord(r).status as string ?? ''}` is ambiguous. TypeScript's `as` cast applies to `toRecord(r).status`, not to the whole `??` expression. If `status` is `undefined`, the `as string` cast makes it `undefined as string` (still undefined at runtime), then `?? ''` produces `''`. This works by accident, but the intent is unclear and the `as string` cast on a potentially-undefined value is misleading -- it asserts a type that may not hold.

**Fix:**
```typescript
<Text size="sm" c="dimmed">
  {(toRecord(r).status as string | undefined) ?? ''}
</Text>
```
Or more idiomatically:
```typescript
{typeof toRecord(r).status === 'string' ? toRecord(r).status as string : ''}
```

## Info

### IN-01: Significant code duplication of getSummary/getDate helpers

**File:** `src/components/explorer/SearchResultsPage.tsx:20-74`
**File:** `src/components/patients/FhirResourcesView.tsx:51-79`
**File:** `src/components/patients/MiiModuleTab.tsx:14-47`
**File:** `src/components/patients/PatientTimeline.tsx:58-96`
**Issue:** Four near-identical implementations of `getSummary` (or `getResourceSummary`/`extractSummary`) and `getDate` (or `getResourceDate`/`extractDate`) exist across these files. Each walks the same CodeableConcept and date-field fallback chains with minor variations (e.g., MiiModuleTab adds `description`, PatientTimeline adds `class`). This is the kind of duplication that leads to inconsistent behavior when one copy is updated but not the others.

Note: `src/utils/timeline-utils.ts` already has properly-typed `extractDate` and `extractSummary` functions that cover the common cases.

**Fix:** Consolidate into a shared utility (extend `src/utils/fhir-helpers.ts` or `src/utils/timeline-utils.ts`) and import from there.

### IN-02: Display-mode tests are shallow existence checks, not behavioral tests

**File:** `src/__tests__/display-modes.test.tsx:6-54`
**Issue:** Most test cases only check `expect(Component).toBeDefined()` and `typeof Component === 'function'`. Tests like "renders ResourceTable in left column" (line 28) and "both columns have independent ScrollArea" (line 38) assert nothing about the actual rendering -- they just repeat `expect(ClinicalRawView).toBeDefined()`. These tests provide false confidence about component behavior.

**Fix:** Either render the components with test data and assert on DOM output, or rename the tests to reflect what they actually verify (e.g., "exports a function component").

### IN-03: TODO comment in CodingDrillDown

**File:** `src/components/quality/CodingDrillDown.tsx:105`
**Issue:** `// TODO: Consider shared sample cache to avoid double-fetching when switching between drill-down views (Phase 5 IN-08)` -- tracked tech debt.

**Fix:** Track in a backlog if not already captured.

### IN-04: Magic number for max ID fetch in wildcard search

**File:** `src/components/explorer/SearchResultsPage.tsx:169`
**Issue:** `const MAX_ID_FETCH = 5000;` is a local magic number. If the server has more than 5000 resources of a type, wildcard prefix search silently returns incomplete results with no indication to the user.

**Fix:** Either document the limitation in the UI (e.g., "Showing matches from first 5000 resources") or extract the constant to a shared config.

### IN-05: Unused import parameter in ValidationPanel

**File:** `src/components/quality/ValidationPanel.tsx:71`
**Issue:** `ValidationPanel` receives `_props: ValidationPanelProps` (with underscore prefix indicating intentionally unused), but then reads `_props.sampleSize` on line 120. The `client` prop from `ValidationPanelProps` is ignored in favor of the outlet context version (line 72). The prop interface declares a contract (`client` + `sampleSize`) but only half is honored, which could confuse callers.

**Fix:** Either use `_props.client` consistently or narrow the interface to only `{ sampleSize: number }`.

---

_Reviewed: 2026-04-13T21:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
