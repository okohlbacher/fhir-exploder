---
phase: 02-resource-explorer
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/App.tsx
  - src/__tests__/curated-params.test.ts
  - src/__tests__/display-modes.test.tsx
  - src/__tests__/explorer-type-selector.test.tsx
  - src/__tests__/include-params.test.ts
  - src/__tests__/json-highlight.test.ts
  - src/__tests__/pagination.test.tsx
  - src/__tests__/reference-navigation.test.tsx
  - src/__tests__/resource-detail.test.tsx
  - src/__tests__/search-state.test.ts
  - src/components/explorer/ClinicalRawView.tsx
  - src/components/explorer/DeveloperJsonView.tsx
  - src/components/explorer/ExplorerLayout.tsx
  - src/components/explorer/HumanReadableView.tsx
  - src/components/explorer/JsonSyntaxHighlight.tsx
  - src/components/explorer/NavigationBreadcrumbs.tsx
  - src/components/explorer/PaginationControls.tsx
  - src/components/explorer/ResourceDetailPage.tsx
  - src/components/explorer/ResourceTypeLanding.tsx
  - src/components/explorer/ResourceTypeSelector.tsx
  - src/components/explorer/SearchFilterPanel.tsx
  - src/components/explorer/SearchResultsPage.tsx
  - src/hooks/useBreadcrumbTrail.ts
  - src/hooks/useSearchState.ts
  - src/utils/curated-params.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 02: Code Review Report (Re-review)

**Reviewed:** 2026-04-11
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

This is a re-review after fixes from the initial review were applied. The five previously fixed issues have all been verified as resolved:

- **CR-01 (FHIR ID regex)**: Fixed. `FHIR_ID_PATTERN` is now `/^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/` and the `handleReferenceClick` regex matches accordingly.
- **WR-01 (side effect in setState)**: Fixed. `navigateTo` now reads `trail[index]` outside the setter and calls `navigate()` after `setTrail`.
- **WR-02 (filter state not reset)**: Fixed. `useEffect` on `resourceType` resets `filterValues`, `includeValues`, and `revincludeValues`.
- **WR-03 (revinclude options)**: Fixed. `revincludeOptions` is now an empty array with a comment explaining cross-type analysis is needed.
- **WR-05 (unsafe casts)**: Fixed. Event handlers now use proper Medplum event types (`SearchClickEvent`, `SearchLoadEvent`, `SearchChangeEvent`) with `satisfies` for outlet context.

**WR-04 (hardcoded 'eq' operator)** was intentionally skipped -- Medplum's SearchRequest type requires the `operator` field. This is acceptable as-is.

The codebase is in good shape. One warning about a test validating against a different regex than the source code, and one informational note about a stale closure pattern.

## Warnings

### WR-01: Test regex does not match source code regex for reference interception

**File:** `src/__tests__/reference-navigation.test.tsx:13`
**Issue:** The test uses regex `/\/([A-Z][a-zA-Z]+)\/([a-f0-9A-F][a-f0-9A-F\-]+)$/` which only matches hexadecimal characters in the ID segment. The actual source code in `ResourceDetailPage.tsx:111` uses `/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/` which correctly matches all FHIR-compliant IDs (full alphanumeric, dots, hyphens, up to 64 chars). This divergence means:
- The test would fail to match IDs like `example`, `obs-lab-42`, or `patient.test.1` even though the production code handles them correctly.
- A regression in the source code regex would not be caught because the test validates a different, narrower pattern.
**Fix:** Update the test to use the same regex as the source code, or better yet, import the validation function and test it directly:
```typescript
// Option A: Match the source regex
const match = href.match(/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/);

// Option B: Test the actual validation function
import { isValidFhirReference } from '../components/explorer/ResourceDetailPage';
// (would require exporting the function)
```

## Info

### IN-01: Stale closure potential in useBreadcrumbTrail.navigateTo

**File:** `src/hooks/useBreadcrumbTrail.ts:30-36`
**Issue:** The `navigateTo` callback captures `trail` from the outer scope in its dependency array. If `push` is called and `navigateTo` is called before the next render completes, `trail` could be stale (missing the just-pushed entry). In practice this is unlikely to cause bugs because user interaction flow (click reference, then click breadcrumb) spans multiple renders, but using a ref would be more robust.
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

---

_Reviewed: 2026-04-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
