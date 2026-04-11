---
phase: 02-resource-explorer
reviewed: 2026-04-11T12:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - src/App.tsx
  - src/contexts/ConnectionContext.tsx
  - src/hooks/useConnection.ts
  - src/hooks/useSearchState.ts
  - src/hooks/useBreadcrumbTrail.ts
  - src/components/explorer/ExplorerLayout.tsx
  - src/components/explorer/ResourceTypeLanding.tsx
  - src/components/explorer/ResourceTypeSelector.tsx
  - src/components/explorer/SearchFilterPanel.tsx
  - src/components/explorer/SearchResultsPage.tsx
  - src/components/explorer/ResourceDetailPage.tsx
  - src/components/explorer/PaginationControls.tsx
  - src/components/explorer/NavigationBreadcrumbs.tsx
  - src/components/explorer/HumanReadableView.tsx
  - src/components/explorer/ClinicalRawView.tsx
  - src/components/explorer/DeveloperJsonView.tsx
  - src/components/explorer/JsonSyntaxHighlight.tsx
  - src/utils/curated-params.ts
  - src/__tests__/curated-params.test.ts
  - src/__tests__/display-modes.test.tsx
  - src/__tests__/explorer-type-selector.test.tsx
  - src/__tests__/include-params.test.ts
  - src/__tests__/json-highlight.test.ts
  - src/__tests__/pagination.test.tsx
  - src/__tests__/reference-navigation.test.tsx
  - src/__tests__/resource-detail.test.tsx
  - src/__tests__/search-state.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-11
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Full standard-depth review of the Resource Explorer feature (Phase 02). The codebase is well-structured with good separation of concerns, proper use of Medplum components, and solid security practices (FHIR reference validation, XSS-safe JSON rendering, input validation on page sizes). Three warnings were identified: a default page count that is not selectable in the UI, a missing error handler that can leave the UI in a permanent loading state, and a test-to-source regex divergence. Two informational notes on minor robustness improvements.

## Warnings

### WR-01: Default page count (20) is not a selectable option in PaginationControls

**File:** `src/components/explorer/PaginationControls.tsx:79` and `src/hooks/useSearchState.ts:33`
**Issue:** `useSearchState` defaults `count` to 20 (line 33), but `PaginationControls` offers only `['10', '25', '50', '100']` as page size options (line 79). When `currentCount` is 20, the Select receives `value="20"` which is not in its `data` array. Depending on Mantine version behavior, this either shows an empty/blank selector or displays "20" as text without it being a valid selectable option. Either way, the user sees an inconsistent state on first load and cannot re-select the current page size.
**Fix:** Either add "20" to the page size options, or change the default count to 25 (which is in the list):
```typescript
// Option A: Add 20 to PaginationControls options
data={['10', '20', '25', '50', '100']}

// Option B: Change default count to 25 in useSearchState
if (parsed.count === undefined) {
  return { ...parsed, count: 25 };
}
```

### WR-02: SearchControl error leaves UI stuck in loading state

**File:** `src/components/explorer/SearchResultsPage.tsx:93-97`
**Issue:** The `loading` state is initialized to `true` (line 26) and only set to `false` inside `handleSearchLoad` (line 95). If SearchControl encounters a network error or the FHIR server returns a non-Bundle error response, `onLoad` is never called. The result is the skeleton loading state shown indefinitely with no way for the user to recover. The `error` state variable (line 27) is declared but never set to a non-null value by any code path -- it can only ever be `null`.
**Fix:** Add an error handling callback to SearchControl. Medplum's SearchControl does not expose an `onError` prop directly, but errors surface as OperationOutcome in the response. Consider wrapping the SearchControl in an error boundary, or check for error responses in `onLoad`:
```typescript
const handleSearchLoad = useCallback((e: SearchLoadEvent) => {
  setBundle(e.response);
  setLoading(false);
  // Check for OperationOutcome indicating an error
  if (e.response?.resourceType === 'OperationOutcome') {
    setError('Search returned an error. Check the server connection.');
  } else {
    setError(null);
  }
}, []);
```

### WR-03: Test regex does not match source code regex for reference interception

**File:** `src/__tests__/reference-navigation.test.tsx:13`
**Issue:** The test validates reference extraction using regex `/\/([A-Z][a-zA-Z]+)\/([a-f0-9A-F][a-f0-9A-F\-]+)$/` which only matches hexadecimal characters in the ID segment. The actual source code in `ResourceDetailPage.tsx:111` uses `/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/` which correctly matches all FHIR-compliant IDs (alphanumeric, dots, hyphens, up to 64 chars). This means:
- The test would fail to match IDs like `example`, `obs-lab-42`, or `patient.test.1` even though the production code handles them correctly.
- A regression in the source code regex would not be caught because the test validates a different, narrower pattern.
**Fix:** Update the test to use the same regex as the source code, or export and test the validation function directly:
```typescript
// Match the source regex
const match = href.match(/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/);
```

## Info

### IN-01: Stale closure potential in useBreadcrumbTrail.navigateTo

**File:** `src/hooks/useBreadcrumbTrail.ts:30-36`
**Issue:** The `navigateTo` callback captures `trail` from the outer scope in its dependency array. If `push` is called and `navigateTo` is called before the next render completes, `trail` could reference the previous state (missing the just-pushed entry). In practice this is unlikely to cause a user-visible bug because the interaction flow (click reference, then click breadcrumb) spans multiple renders, but using a ref would be more robust.
**Fix:** Use a ref to always access the latest trail value:
```typescript
const trailRef = useRef<BreadcrumbEntry[]>([]);
trailRef.current = trail;

const navigateTo = useCallback(
  (index: number) => {
    const entry = trailRef.current[index];
    if (entry) {
      setTrail((prev) => prev.slice(0, index + 1));
      navigate(`/explorer/${entry.resourceType}/${entry.id}`);
    }
  },
  [navigate]
);
```

### IN-02: SearchFilterPanel showAllFilters state not reset on resource type change

**File:** `src/components/explorer/SearchFilterPanel.tsx:20-30`
**Issue:** When switching resource types, the `useEffect` on line 26-30 correctly resets `filterValues`, `includeValues`, and `revincludeValues`. However, `showAllFilters` (line 20) is not reset. If a user expanded "Show all filters" on one resource type and then switches to another, the expanded state persists. This is a minor UX inconsistency -- the user sees all params for the new type immediately rather than the curated defaults.
**Fix:** Add `setShowAllFilters(false)` to the reset effect:
```typescript
useEffect(() => {
  setFilterValues({});
  setIncludeValues([]);
  setRevincludeValues([]);
  setShowAllFilters(false);
}, [resourceType]);
```

---

_Reviewed: 2026-04-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
