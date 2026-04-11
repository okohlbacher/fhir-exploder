---
phase: 02-resource-explorer
reviewed: 2026-04-11T14:30:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - src/App.tsx
  - src/contexts/ConnectionContext.tsx
  - src/hooks/useConnection.ts
  - src/hooks/useSearchState.ts
  - src/hooks/useBreadcrumbTrail.ts
  - src/hooks/useResourceCounts.ts
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
  - src/__tests__/resource-type-landing-counts.test.tsx
  - src/__tests__/search-state.test.ts
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-11 (updated with gap-closure plan 02-05 findings)
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Full standard-depth review of the Resource Explorer feature (Phase 02), including the gap-closure plan 02-05 that wires per-type resource counts into the Explorer landing page. The new code (`useResourceCounts` hook, updated `ResourceTypeLanding`, and the accompanying test suite) is functionally correct and well-structured. The concurrency-limited worker-pool pattern in `useResourceCounts` is solid. Two new warnings were identified: a TypeScript narrowing gap that produces a type assertion in the component, and a fragile CSS-class-name query in the test. Three new informational items cover a misleading UI text string, a missing eslint-exhaustive-deps note, and a misleading mock structure in the test.

Prior findings (WR-01 through WR-03, IN-01 through IN-02) are unchanged and remain open.

---

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

### WR-04: TypeScript narrowing gap forces unsafe type assertion in ResourceTypeLanding

**File:** `src/components/explorer/ResourceTypeLanding.tsx:83`
**Issue:** After the guard `typeof counts[t.type] === 'number'` on line 81, TypeScript does not narrow the type of `counts[t.type]` to `number` when accessed a second time inside the JSX expression on line 83. This is a known TypeScript limitation with indexed record access — the type-checker re-evaluates the index signature on each access and loses the narrowing. The workaround used is `counts[t.type] as number`, which is a type assertion that could silently mask future type errors if `CountValue` changes.
**Fix:** Store the value in a local variable before the conditional render to allow proper narrowing:
```typescript
{types.map((t) => {
  const count = counts[t.type];
  return (
    <Group key={t.type} gap="xs" wrap="nowrap" style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/explorer/${t.type}`)}>
      <Text size="sm" c="blue.6">{t.type}</Text>
      {count === 'loading' && <Loader size="xs" />}
      {count === 'error' && (
        <Badge color="red" size="sm" variant="light">Error</Badge>
      )}
      {typeof count === 'number' && (
        <Badge color="blue" size="sm" variant="light">
          {count.toLocaleString()}
        </Badge>
      )}
    </Group>
  );
})}
```
This eliminates the `as number` cast and makes TypeScript narrowing work correctly.

### WR-05: Loader test couples to internal Mantine CSS class name

**File:** `src/__tests__/resource-type-landing-counts.test.tsx:91-93`
**Issue:** The loading state test queries `document.querySelectorAll('.mantine-Loader-root')` to verify loaders are rendered. This CSS class name is a Mantine implementation detail that can change between patch/minor releases without a breaking-change notice. The inline comment also says "Mantine Loader renders with role='presentation' (svg elements)" — suggesting a role-based query was considered — but the test uses a class query instead, creating a contradiction between comment and assertion.
**Fix:** Query by ARIA role or a data-testid attribute instead:
```typescript
// Option A: Role-based query (check what role Mantine Loader actually renders as)
const loaders = document.querySelectorAll('[role="status"]');
expect(loaders.length).toBeGreaterThanOrEqual(3);

// Option B: Use data-testid by wrapping Loader in the component
// In ResourceTypeLanding.tsx:
{counts[t.type] === 'loading' && <Loader size="xs" data-testid="count-loader" />}
// In test:
const loaders = screen.getAllByTestId('count-loader');
expect(loaders.length).toBeGreaterThanOrEqual(3);
```

---

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

### IN-03: Landing page helper text does not match current UI context

**File:** `src/components/explorer/ResourceTypeLanding.tsx:43-45`
**Issue:** The Text element reads "Use the filters above to search, or click Search with no filters to see all resources." There are no filters on the landing page — filters are only present on the `SearchResultsPage`. This copy appears to be placeholder text that was not updated when the landing page content was defined. It will confuse users who see it on first load.
**Fix:** Update the helper text to describe the landing page's actual purpose:
```tsx
<Text c="dimmed">
  Select a resource type below to browse all resources of that type, or use the dropdown to jump directly to a type.
</Text>
```

### IN-04: useResourceCounts effect dependency serialization not noted for eslint-exhaustive-deps

**File:** `src/hooks/useResourceCounts.ts:69`
**Issue:** The effect uses `resourceTypes.join(',')` in the dependency array instead of `resourceTypes` directly. This is a correct and intentional pattern to avoid infinite re-runs when the parent component recreates the array on each render. However, eslint's `react-hooks/exhaustive-deps` rule will flag `resourceTypes` as a missing dependency (since it is used inside the effect body via `[...resourceTypes]` on line 38). Without a comment or eslint-disable annotation, this will generate a lint warning that obscures whether the deviation is intentional.
**Fix:** Add an explanatory comment to document the intent:
```typescript
// resourceTypes.join(',') is an intentional serialization of the array to
// avoid re-triggering the effect when the parent re-creates the array reference
// with the same contents. eslint-disable-next-line react-hooks/exhaustive-deps
}, [client, resourceTypes.join(',')]);
```

### IN-05: Misleading mock structure in count display test

**File:** `src/__tests__/resource-type-landing-counts.test.tsx:50-51`
**Issue:** The `react-router-dom` mock returns `{ capability: ..., client: { search: vi.fn() } }` from `useOutletContext`. The `client` field is not part of `ExplorerOutletContext` as used by `ResourceTypeLanding` — the component obtains its FHIR client via `useMedplum()` (which is separately mocked at lines 57-59), not from the outlet context. The `client` field in the mocked outlet context is dead code. This creates a misleading impression that `ResourceTypeLanding` reads `client` from the outlet context, which could cause confusion when maintaining the test or tracing how the client reaches the hook.
**Fix:** Remove the `client` field from the mocked outlet context to match the actual interface:
```typescript
useOutletContext: () => ({
  capability: {
    resourceType: 'CapabilityStatement',
    rest: [ /* ... */ ],
  },
  // No client field — component uses useMedplum() directly
}),
```

---

_Reviewed: 2026-04-11 (updated with gap-closure plan 02-05)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
