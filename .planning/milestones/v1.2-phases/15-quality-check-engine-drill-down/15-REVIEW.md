---
phase: 15-quality-check-engine-drill-down
reviewed: 2026-04-13T12:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/__tests__/coding-coverage-walker.test.ts
  - src/__tests__/coding-drilldown.test.tsx
  - src/__tests__/completeness-drilldown.test.tsx
  - src/__tests__/completeness-walker.test.ts
  - src/__tests__/resource-issue-table.test.tsx
  - src/components/quality/CodingDrillDown.tsx
  - src/components/quality/CompletenessDrillDown.tsx
  - src/components/quality/ResourceIssueTable.tsx
  - src/components/quality/ValidationPanel.tsx
  - src/hooks/useCompletenessReport.ts
  - src/quality/codingCoverageWalker.ts
  - src/quality/completenessWalker.ts
  - src/quality/types.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-04-13T12:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 15 adds drill-down views for quality checks (completeness, coding coverage, validation) with a shared `ResourceIssueTable` component, per-resource issue tracking in the walkers, and cross-filter navigation between field-level and resource-level views. The code is well-structured with clear separation of concerns. The walker logic is solid with good Pitfall 5 defense (Identifier exclusion). Test coverage is thorough for both unit and behavioral tests.

Key concerns are a page-reset bug in `ResourceIssueTable` when `initialFieldFilter` changes externally, a module-scoped singleton cache pattern that silently discards data on server URL changes, and a duplicate type definition across files.

## Warnings

### WR-01: Page not reset when initialFieldFilter changes via cross-filter

**File:** `src/components/quality/ResourceIssueTable.tsx:63-66`
**Issue:** When `initialFieldFilter` changes (e.g., user clicks a field in the Fields tab to cross-filter), the `useEffect` updates `fieldFilter` but does not reset `page` to 1. If the user had navigated to a later page before the cross-filter, the new filtered result set may have fewer items than the current page offset, resulting in an empty page view. The `onChange` handlers on the filter inputs correctly call `setPage(1)`, but this external update path does not.
**Fix:**
```tsx
useEffect(() => {
  if (initialFieldFilter !== undefined) {
    setFieldFilter(initialFieldFilter);
    setPage(1);
  }
}, [initialFieldFilter]);
```

### WR-02: Module-scoped singleton cache silently discards previous server data

**File:** `src/hooks/useCompletenessReport.ts:39-47`
**Issue:** The `getCache` function uses a module-scoped singleton (`cacheInstance`) keyed by server URL. If a user switches between two FHIR server URLs (e.g., via settings), the entire cache is discarded and replaced. While unlikely in typical usage (single server), this means computed metrics for the previous server are silently lost without any user feedback. If the user switches back, all completeness metrics must be recomputed from scratch.
**Fix:** Either use a `Map<string, QualityMetricsCache>` to preserve per-server caches, or accept this as a known limitation and add a comment documenting the trade-off:
```ts
// Known limitation: switching server URLs discards the previous server's cache.
// A Map<string, QualityMetricsCache> would preserve both, but adds memory pressure
// for a use case (multi-server switching) that is rare in local-first usage.
```

### WR-03: ValidationPanel normalizedIssues produces empty resourceType for issues without _resourceId

**File:** `src/components/quality/ValidationPanel.tsx:146-158`
**Issue:** When `issue._resourceId` is undefined (the field is optional per `AttributedIssue`), `resourceId` becomes `''` and `resourceType` becomes `''` (from `''.split('/')[0]`). This flows into `ResourceIssueTable` where the resource link rendering checks `type && id` -- both are empty strings (falsy), so the fallback `--` is shown. While the fallback prevents a crash, the empty `resourceType` in `NormalizedIssue` breaks the severity filter's sort stability and makes the issue row less useful. A more descriptive fallback (e.g., `'unknown/unknown'`) would be clearer.
**Fix:**
```tsx
resourceId: issue._resourceId ?? 'unknown/unknown',
resourceType: (issue._resourceId ?? 'unknown').split('/')[0],
```

## Info

### IN-01: Duplicate AttributedIssue type definition

**File:** `src/components/quality/ValidationIssueList.tsx:22-24`
**Issue:** `AttributedIssue` is defined identically in both `src/hooks/useValidationRun.ts:40-42` and `src/components/quality/ValidationIssueList.tsx:22-24`. This duplicates the type contract and risks drift if one is updated without the other.
**Fix:** Import from a single source. Either re-export from `useValidationRun.ts` or move to `src/quality/types.ts`:
```tsx
// In ValidationIssueList.tsx:
import type { AttributedIssue } from '../../hooks/useValidationRun';
```

### IN-02: TODO comment left in production code

**File:** `src/components/quality/CodingDrillDown.tsx:107`
**Issue:** A TODO comment references "Phase 5 IN-08" about shared sample cache. While harmless, it indicates deferred work that should be tracked in planning artifacts rather than inline.
**Fix:** Remove the TODO or convert to a code comment that documents the architectural decision without the TODO prefix.

### IN-03: Commented-out phase reference in types.ts header

**File:** `src/quality/types.ts:1`
**Issue:** The module header references "Phase 05 data quality dashboard" but this is now Phase 15. The comment is stale and may confuse future readers about when these types were introduced vs. extended.
**Fix:** Update the header to reflect the evolution:
```ts
/**
 * Central contract module for data quality dashboard (Phase 05, extended Phase 15).
 */
```

---

_Reviewed: 2026-04-13T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
