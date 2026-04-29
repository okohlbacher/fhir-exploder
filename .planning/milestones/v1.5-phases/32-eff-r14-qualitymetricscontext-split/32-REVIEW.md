---
phase: 32-eff-r14-qualitymetricscontext-split
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - src/__tests__/coding-coverage-panel.test.tsx
  - src/__tests__/completeness-hook.test.tsx
  - src/__tests__/duplicates-panel.test.tsx
  - src/__tests__/lab-ranges-panel.test.tsx
  - src/__tests__/metrics-isolation.test.tsx
  - src/__tests__/plausibility-panel.test.tsx
  - src/__tests__/quality-overview.test.tsx
  - src/__tests__/references-panel.test.tsx
  - src/components/quality/DuplicatesPanel.tsx
  - src/components/quality/LabRangesPanel.tsx
  - src/components/quality/MetricTile.tsx
  - src/components/quality/OverviewStrip.tsx
  - src/components/quality/PlausibilityPanel.tsx
  - src/components/quality/QualityLayout.tsx
  - src/components/quality/QualityOverviewPage.tsx
  - src/components/quality/ReferencesPanel.tsx
  - src/components/quality/ValidationPanel.tsx
  - src/components/quality/__tests__/quality-layout.test.tsx
  - src/hooks/useCodingCoverage.ts
  - src/hooks/useCompletenessReport.ts
  - src/quality/QualityMetricsContext.tsx
  - src/quality/metrics/CompletenessContext.tsx
  - src/quality/metrics/CoverageContext.tsx
  - src/quality/metrics/DuplicatesContext.tsx
  - src/quality/metrics/LabRangesContext.tsx
  - src/quality/metrics/PlausibilityContext.tsx
  - src/quality/metrics/ReferencesContext.tsx
  - src/quality/metrics/ValidationContext.tsx
  - src/quality/metrics/__tests__/providers-smoke.test.tsx
  - src/quality/metrics/index.tsx
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-04-24T00:00:00Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

The Phase 32 EFF-R14 split decomposes the monolithic `QualityMetricsContext` into 7 per-metric contexts (`CompletenessContext`, `CoverageContext`, `ValidationContext`, `PlausibilityContext`, `LabRangesContext`, `ReferencesContext`, `DuplicatesContext`) composed by a `QualityMetricsProviders` mounter under `src/quality/metrics/`. The pre-split `useQualityMetrics()` is preserved as a facade hook in `QualityMetricsContext.tsx` for bulk-read consumers (the capture/export handlers in `QualityOverviewPage.tsx`); per-metric consumers (7 tile components in `MetricTile.tsx`, 7 tab labels in `QualityOverviewPage.tsx`, 7 producer call sites) correctly use the specific `use<Metric>Rollup()` hooks.

Migration is comprehensive and consistent:
- All 7 producer sites have been migrated (`useCompletenessReport.ts:42`, `useCodingCoverage.ts:41`, `ValidationPanel.tsx:229`, `PlausibilityPanel.tsx:109`, `LabRangesPanel.tsx:51`, `ReferencesPanel.tsx:69`, `DuplicatesPanel.tsx:102`).
- The Duplicates rollup retains its special derived-from-breakdown shape (`deriveOverallDuplicates` ported verbatim from the pre-split implementation).
- No dead references to the old monolithic setters remain in production code.
- The verbatim port of `EMPTY_DUPLICATES_BREAKDOWN`, `deriveOverallDuplicates`, and the `useCallback`-wrapped functional-updater in `DuplicatesProvider` preserves the Phase 18 contract.
- The 7-provider smoke test (`providers-smoke.test.tsx`) and per-tile isolation Profiler test (`metrics-isolation.test.tsx`) provide solid regression fences.

Findings are minor: one re-render correctness issue around the no-op fallback path, plus four documentation/comment staleness items. No critical issues, no security concerns.

## Warnings

### WR-01: No-op fallback returns fresh objects each render — bloats facade memo busts outside provider

**File:** `src/quality/metrics/CompletenessContext.tsx:27-31` (and the matching pattern in `CoverageContext.tsx:27-31`, `ValidationContext.tsx:27-31`, `PlausibilityContext.tsx:26-30`, `LabRangesContext.tsx:27-31`, `ReferencesContext.tsx:26-30`, `DuplicatesContext.tsx:87-96`)

**Issue:** When the per-metric hooks are called outside their provider, each hook returns a freshly-allocated object literal with a freshly-allocated no-op setter on every render:

```tsx
export function useCompletenessRollup(): CompletenessRollup {
  const ctx = useContext(CompletenessCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
```

Because the facade `useQualityMetrics()` in `QualityMetricsContext.tsx:96-125` includes the rollup objects directly in its `useMemo` deps array (`[completeness, coverage, validation, plausibility, labRanges, references, duplicates]`), every render of an out-of-provider facade consumer rebuilds the entire `QualityMetricsContextValue` object — defeating the memo. Inside the provider this is fine (each provider memoizes via its own `useMemo`).

The pre-split fallback object at the old `:179-200` was also fresh per render, so this is a behavior-preserving port — but the split now multiplies the cost by 7 (7 hook calls × fresh object each). For in-tree usage (the only production caller is `QualityOverviewPage` under `QualityLayout` → `QualityMetricsProviders`), this is benign. For tests or future callers that read the facade outside the provider tree, the memo is permanently invalidated.

**Fix:** Stabilize the no-op fallback with a module-scoped frozen constant per context:

```tsx
const NOOP_COMPLETENESS: CompletenessRollup = Object.freeze({
  value: undefined,
  set: () => {},
});

export function useCompletenessRollup(): CompletenessRollup {
  const ctx = useContext(CompletenessCtx);
  return ctx ?? NOOP_COMPLETENESS;
}
```

Apply the same pattern to all 7 contexts. For `DuplicatesContext`, the frozen constant must include the shared `EMPTY_DUPLICATES_BREAKDOWN` reference (already exported, already module-scoped) and a stable no-op `contribute`.

## Info

### IN-01: Stale line-number references in per-metric context doc-comments

**File:** `src/quality/metrics/CompletenessContext.tsx:26`, `CoverageContext.tsx:26`, `ValidationContext.tsx:26`, `PlausibilityContext.tsx:25`, `LabRangesContext.tsx:26`, `ReferencesContext.tsx:25`, `DuplicatesContext.tsx:18`, `:24`, `:36`, `:39`, `:56`, `:86`

**Issue:** Every per-metric context contains a line-number breadcrumb back to the pre-split `QualityMetricsContext.tsx`:

- `// Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200.` (all 7 leaf contexts)
- `// Ported VERBATIM from QualityMetricsContext.tsx:46-49` / `:56-59` / `:94` / `:96-105` / `:117-135` (DuplicatesContext)

The current `QualityMetricsContext.tsx` is only 125 lines — every one of these line-range references now points past the end of the file. Future readers will follow these breadcrumbs to dead bytes.

**Fix:** Either (a) drop the line-range numerals and keep the prose ("matches the pre-split fallback contract"), or (b) replace with a git-blame-friendly anchor like `(pre-split — see git log -- src/quality/QualityMetricsContext.tsx for the original)`.

### IN-02: ReferencesPanel rollup re-fires on `sampleSize` prop change without a new run

**File:** `src/components/quality/ReferencesPanel.tsx:70-74`

**Issue:** The rollup effect deps are `[run.status, run.issues, sampleSize, setOverallReferences]`. If a user completes a run (status === 'complete'), then changes the sample-size or cohort scope without re-running, `sampleSize` updates while `run.issues` and `run.status` stay the same. The effect re-fires, recomputing `percentClean(uniqueAffected, newSampleSize)` against the OLD issue set — overstating the clean ratio if `newSampleSize > oldSampleSize`, understating if smaller. The other panels (Plausibility, Validation) use `run.progress.total` as the denominator, which is reset by the next run, avoiding this footgun.

The comment at `:67-68` documents the deliberate use of the prop ("Uses `sampleSize` prop (resource count) as denominator, NOT `run.progress.total`") — this was a design call in Phase 18 because `useReferenceReport` reports batch counts in `progress.total`, not resource counts. The split is faithful to that contract; the underlying issue predates Phase 32. Flagging here only because the rollup effect has no test for the "complete run, then change sampleSize" path.

**Fix:** Either gate the effect on `sampleSize === run.lastSampleSize` (requires the hook to track it) or capture `sampleSize` into the run summary (e.g., `run.sampleSize`) and use that instead. Until then, document the known stale-rollup edge case in the panel's prose so reviewers don't re-discover it.

### IN-03: Facade `useQualityMetrics()` re-renders all 7 hooks on any metric change

**File:** `src/quality/QualityMetricsContext.tsx:96-125`

**Issue:** The facade subscribes to all 7 per-metric contexts via direct hook calls. Any per-metric state change re-renders the facade caller (currently only `QualityOverviewPage`). The header doc-comment at `:84-94` correctly flags this as intentional ("facade consumers re-render on any metric change (by design, for bulk-read call sites like the capture/export handlers in QualityOverviewPage)") — but `QualityOverviewPage.tsx:213` is a large component (520+ lines, owns the entire toolbar + tabs + cohort resolver state). Any single metric update re-renders the entire page tree. The Phase 32 win (per-tile isolation) does not extend to the page-level orchestrator.

Not a defect — the design contract is explicit and the only facade consumer is documented. Flagging as Info so future contributors who add new bulk-read consumers know to evaluate whether they actually need the facade or can subscribe to specific per-metric hooks.

**Fix:** Add a `useStableQualityMetrics()` selector hook (or a `useQualityMetricsSelector(selector)` pattern) for narrow read paths if more facade consumers appear. No action required for v32 scope.

### IN-04: Duplicate static metric-key lists across `OverviewStrip` and `MetricTile`

**File:** `src/components/quality/MetricTile.tsx:18-26`, `src/components/quality/OverviewStrip.tsx:43-51`, `src/components/quality/QualityOverviewPage.tsx:64-71`, `:268-276`

**Issue:** The 7-metric ordering is duplicated in four places: `OverviewStrip.METRIC_ORDER`, the `MetricTile` switch statement, `QualityOverviewPage`'s tab-label hook block (lines 216-222), and `QualityOverviewPage`'s `handleExport` METRIC_KEYS literal. Adding an 8th metric requires touching all four sites plus the 7 leaf `MetricTile` subcomponents. The `MetricKey` type provides exhaustiveness checks for the switch, but the parallel arrays in `OverviewStrip` and `handleExport` are silent if drift occurs.

**Fix:** Export a single `METRIC_ORDER: readonly MetricKey[]` constant from `src/quality/thresholds.ts` (next to `METRIC_LABELS` / `METRIC_ROUTES`) and import it everywhere a list of all 7 metrics is iterated. Out of v32 scope but a clear DRY improvement that would also harden Plan 32-04's isolation contract.

---

_Reviewed: 2026-04-24T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
