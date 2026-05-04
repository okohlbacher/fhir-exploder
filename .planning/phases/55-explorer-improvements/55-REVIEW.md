---
phase: 55-explorer-improvements
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/components/explorer/SearchResultsPage.tsx
  - src/__tests__/search-results-summary.test.tsx
  - src/__tests__/search-results-peek.test.tsx
  - src/__tests__/search-results-density.test.tsx
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 55: Code Review Report

**Reviewed:** 2026-05-04
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the `SearchResultsPage` component (density modes, J-key peek, summary cell rendering) and three companion test files added in phase 55. The implementation is well-structured with clear docblocks and thorough test coverage. One critical Rules of Hooks violation was found — a `useMemo` call embedded inside JSX as a prop value — along with a missing cancellation guard on paginated fetches and a minor JSX/import inconsistency in a test file.

## Critical Issues

### CR-01: `useMemo` called inside JSX (Rules of Hooks violation)

**File:** `src/components/explorer/SearchResultsPage.tsx:368-377`

**Issue:** `useMemo` is invoked directly as a JSX prop expression inside the `return` statement:

```tsx
<SearchFilterPanel
  ...
  activeFilters={useMemo(
    () => Object.fromEntries(...),
    [searchRequest.filters]
  )}
  ...
/>
```

React's Rules of Hooks forbid calling hooks inside JSX expressions, event handlers, or callbacks. Although Babel/TSX compilation doesn't make the call literally conditional, the ESLint `react-hooks/rules-of-hooks` plugin flags this as a violation, and React's runtime hook ordering guarantee is undermined if render is ever interrupted (Concurrent Mode). The bundle may silently produce stale memoization or throw a hook-count mismatch in strict mode.

**Fix:** Hoist the `useMemo` to the component's top level:

```tsx
const activeFilters = useMemo(
  () =>
    Object.fromEntries(
      (searchRequest.filters ?? [])
        .filter((f) => f.value)
        .map((f) => [f.code, f.value])
    ),
  [searchRequest.filters]
);

// Then in JSX:
<SearchFilterPanel
  resourceType={resourceType}
  allSearchParams={currentTypeData?.searchParams ?? []}
  activeFilters={activeFilters}
  onSearch={handleSearch}
/>
```

---

## Warnings

### WR-01: Missing unmount guard in `handlePageChange`

**File:** `src/components/explorer/SearchResultsPage.tsx:311-338`

**Issue:** The main `useEffect` correctly uses a `cancelled` flag to prevent state updates after unmount (lines 191, 258, 265). However, `handlePageChange` (the pagination callback) calls `setBundle`, `setLoading`, and `setError` with no equivalent guard. If the user navigates away while a page-change fetch is in-flight, React will warn about updating state on an unmounted component, and the stale data may overwrite state in the newly mounted route.

**Fix:** Use a ref-based abort flag or `AbortController`:

```tsx
const abortRef = useRef<AbortController | null>(null);

const handlePageChange = useCallback(
  (url: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let fetchUrl = url;
    try {
      const parsed = new URL(url);
      fetchUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
    } catch { /* use as-is */ }

    setLoading(true);
    setError(null);
    client
      .get(fetchUrl)
      .then((raw) => {
        if (controller.signal.aborted) return;
        const result: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setBundle(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  },
  [client]
);
```

---

### WR-02: `REFERENCE_PARAMS` object recreated on every render

**File:** `src/components/explorer/SearchResultsPage.tsx:176-187`

**Issue:** `REFERENCE_PARAMS` is declared as a plain object literal inside the component body. It is a pure constant that never changes, so recreating it on every render is wasteful and makes it look like dynamic state. More importantly, if `REFERENCE_PARAMS` is ever referenced inside a dependency array (e.g., `useCallback`/`useEffect`), it will appear to change on every render, causing unnecessary re-runs.

Currently it is only read inside the `useEffect` (line 230), which already depends on `[client, resourceType, searchRequest]` — so there is no correctness bug today. But the pattern is fragile.

**Fix:** Move `REFERENCE_PARAMS` outside the component, at module scope:

```tsx
// At module level, before SearchResultsPage:
const REFERENCE_PARAMS: Record<string, string> = {
  patient: 'Patient',
  subject: 'Patient',
  encounter: 'Encounter',
  performer: 'Practitioner',
  author: 'Practitioner',
  requester: 'Practitioner',
  recorder: 'Practitioner',
  asserter: 'Practitioner',
  practitioner: 'Practitioner',
  organization: 'Organization',
};
```

---

## Info

### IN-01: Missing `React` import in density test file using JSX syntax

**File:** `src/__tests__/search-results-density.test.tsx:42`

**Issue:** The `PeekProvider` mock renders JSX (`<>{children}</>`) without an explicit `import React from 'react'` at the top of the file. The peek test (`search-results-peek.test.tsx`) handles the same mock pattern by importing `React` on line 13 (`import React from 'react'`). The density test relies entirely on the automatic JSX transform. This is not a runtime bug (Vite's JSX transform handles it), but it creates an inconsistency between the two test files that could confuse contributors who add code expecting React to be in scope.

**Fix:** Add the import for consistency, or document the reliance on the automatic transform in a file-level comment. If the project's `tsconfig.json` / Vite config specifies `"jsx": "react-jsx"`, the automatic transform is guaranteed and the omission is safe — add a brief comment confirming this.

---

_Reviewed: 2026-05-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
