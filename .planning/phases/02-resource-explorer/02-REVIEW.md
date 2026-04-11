---
phase: 02-resource-explorer
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - src/App.tsx
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
  critical: 1
  warning: 5
  info: 2
  total: 8
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-11
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

The Resource Explorer implementation is well-structured with clean component separation, proper connection gating via ExplorerLayout, URL-driven search state, and a custom JSON syntax highlighter that correctly avoids dangerouslySetInnerHTML. The code follows project conventions (Medplum + Mantine + react-router-dom).

Key concerns: a FHIR ID validation regex is too restrictive and will reject valid FHIR resource IDs (critical for reference navigation), stale filter state on resource type changes, and incorrect _revinclude option generation. Several type casts suppress TypeScript safety on SearchControl event handlers.

## Critical Issues

### CR-01: FHIR ID validation regex rejects valid resource IDs

**File:** `src/components/explorer/ResourceDetailPage.tsx:20-21`
**Issue:** `FHIR_ID_PATTERN = /^[a-f0-9A-F][a-f0-9A-F\-]+$/` only allows hexadecimal characters and hyphens. Per the FHIR R4 spec, resource IDs are `[A-Za-z0-9\-\.]{1,64}`. This regex will reject common valid IDs like `"patient-1"`, `"example"`, `"obs-lab-42"`, or any ID starting with a non-hex letter (g-z, G-Z). Reference navigation will silently fail for these resources because `isValidFhirReference` returns false and `preventDefault` is never called.
**Fix:**
```typescript
const FHIR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/;
```
Also update the corresponding regex in `handleReferenceClick` (line 111):
```typescript
const match = href.match(/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/);
```

## Warnings

### WR-01: Side effect inside setState updater function

**File:** `src/hooks/useBreadcrumbTrail.ts:31-36`
**Issue:** `navigateTo` calls `navigate()` (a side effect triggering route change) inside the `setTrail` updater callback. React does not guarantee when state updater functions execute, and in concurrent mode they may run multiple times. Calling `navigate()` inside a setter can produce double navigations or race conditions.
**Fix:**
```typescript
const navigateTo = useCallback(
  (index: number) => {
    const entry = trail[index];
    if (entry) {
      setTrail((prev) => prev.slice(0, index + 1));
      navigate(`/explorer/${entry.resourceType}/${entry.id}`);
    }
  },
  [navigate, trail]
);
```

### WR-02: Filter state not reset when resource type changes

**File:** `src/components/explorer/SearchFilterPanel.tsx:21-23`
**Issue:** `filterValues`, `includeValues`, and `revincludeValues` are initialized once with `useState` and never reset when `resourceType` prop changes. When a user switches from Patient to Observation via the ResourceTypeSelector, the previous Patient filter values (e.g., `name: "Smith"`) remain in the text inputs and will be submitted as Observation search params on next search.
**Fix:** Add a `useEffect` to reset state when `resourceType` changes:
```typescript
useEffect(() => {
  setFilterValues({});
  setIncludeValues([]);
  setRevincludeValues([]);
}, [resourceType]);
```
Or use `resourceType` as the `key` prop on the component from the parent to force remount.

### WR-03: _revinclude options are identical to _include options

**File:** `src/components/explorer/SearchFilterPanel.tsx:29-35`
**Issue:** Both `includeOptions` and `revincludeOptions` are computed identically: `allSearchParams.filter(p => !p.startsWith('_')).map(p => \`${resourceType}:${p}\`)`. FHIR `_revinclude` specifies OTHER resource types whose references point TO the current resource (e.g., `Observation:patient` when viewing a Patient). Generating them from the current resource's own params is semantically wrong and will produce useless options.
**Fix:** Either remove `_revinclude` from the UI until proper reverse-include discovery is implemented (requires inspecting other resource types' search params from the CapabilityStatement), or pass correct revinclude options from the parent:
```typescript
// In SearchResultsPage, compute revinclude options from all resource types
// that have a reference search param pointing to the current resourceType
```

### WR-04: All search filters hardcoded to 'eq' operator

**File:** `src/components/explorer/SearchResultsPage.tsx:50-54`
**Issue:** Every filter is assigned `operator: 'eq'`. FHIR date params (`date`, `birthdate`, `onset-date`) typically require range operators (`ge`, `le`, `gt`, `lt`). String params like `name` use substring matching by default in FHIR (no operator needed), so forcing `eq` may change behavior. Token params like `code` do use `eq`, but this blanket approach produces incorrect or overly restrictive searches for date-based filters.
**Fix:** Either remove the explicit operator (let the server apply default behavior):
```typescript
filters: Object.entries(filters).map(([code, value]) => ({
  code,
  operator: 'eq' as const, // TODO: Infer operator from param type
  value,
})),
```
Or add operator selection per filter in the SearchFilterPanel UI. As a minimal fix, omit the operator field entirely and let Medplum/the server use defaults:
```typescript
filters: Object.entries(filters).map(([code, value]) => ({
  code,
  value,
})),
```

### WR-05: Multiple `as unknown as` casts suppress type safety

**File:** `src/components/explorer/SearchResultsPage.tsx:151-158`
**Issue:** Three event handlers on `SearchControl` use `as unknown as` double casts: `onClick`, `onLoad`, and `onChange`. This completely bypasses TypeScript's type checking. If the Medplum component's event signature changes across versions, these casts will hide the incompatibility at compile time, producing runtime errors.
**Fix:** Type the event handlers to match the actual Medplum SearchControl event types. Check `@medplum/react` 5.1.7 type definitions for the correct signatures and remove the casts. If the types genuinely don't match, add a comment explaining why and consider a thin adapter function rather than `unknown` casts.

## Info

### IN-01: Module-level regex with global flag

**File:** `src/components/explorer/JsonSyntaxHighlight.tsx:24`
**Issue:** `TOKEN_REGEX` is declared at module scope with the `g` flag, making it stateful via `lastIndex`. The `tokenize` function does reset `lastIndex = 0` on line 37, which prevents the bug. However, a module-level global regex is fragile -- if a future caller forgets the reset, results will be incorrect. Consider creating the regex inside the function or removing the `g` flag and using `matchAll` or a different approach.
**Fix:**
```typescript
export function tokenize(json: string): JsonToken[] {
  const TOKEN_REGEX = /("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false)\b|(null)\b|([{}[\]:,])/g;
  // ... rest of function
}
```

### IN-02: Test files use existence checks instead of rendering tests

**File:** Multiple test files (`display-modes.test.tsx`, `explorer-type-selector.test.tsx`, `pagination.test.tsx`, `reference-navigation.test.tsx`, `resource-detail.test.tsx`)
**Issue:** Most tests only verify that components are `toBeDefined()` or that `typeof` is `'function'`, without actually rendering the components or testing their behavior. For example, `display-modes.test.tsx` has tests named "renders ResourceTable with the provided resource" but only checks `expect(HumanReadableView).toBeDefined()`. These tests provide minimal confidence in component correctness. The `json-highlight.test.ts`, `curated-params.test.ts`, and `search-state.test.ts` files are well-written with actual logic testing.
**Fix:** Add rendering tests using `@testing-library/react` with appropriate providers (MedplumProvider, MemoryRouter) for component tests that claim to verify rendering behavior.

---

_Reviewed: 2026-04-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
