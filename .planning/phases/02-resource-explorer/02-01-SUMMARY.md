---
phase: 02-resource-explorer
plan: 01
subsystem: ui
tags: [react, fhir, medplum, react-router, json-highlighting, search-state]

requires:
  - phase: 01-foundation
    provides: useConnection hook, ConnectionState types, MedplumClient creation, CapabilityStatement parsing
provides:
  - useSearchState hook for bidirectional URL <-> SearchRequest sync
  - useBreadcrumbTrail hook for reference navigation history
  - getCuratedParams utility for per-type search param defaults
  - JsonSyntaxHighlight component with 6-token-type coloring
  - ExplorerLayout with MedplumProvider scoping and connection gating
  - Nested explorer routes in App.tsx
affects: [02-02-PLAN, 02-03-PLAN, resource-explorer]

tech-stack:
  added: []
  patterns: [URL-driven search state via parseSearchRequest/formatSearchQuery, MedplumProvider scoped to connected subtree via Outlet context, regex-based JSON tokenizer]

key-files:
  created:
    - src/hooks/useSearchState.ts
    - src/hooks/useBreadcrumbTrail.ts
    - src/utils/curated-params.ts
    - src/components/explorer/ExplorerLayout.tsx
    - src/components/explorer/JsonSyntaxHighlight.tsx
    - src/__tests__/search-state.test.ts
    - src/__tests__/curated-params.test.ts
    - src/__tests__/json-highlight.test.ts
  modified:
    - src/App.tsx

key-decisions:
  - "COMMON_PARAMS fallback order prioritized by frequency across FHIR types rather than allParams order"
  - "JSON tokenizer uses post-processing (look-ahead for colon) to distinguish keys from string values"
  - "ExplorerLayout passes capability and client via Outlet context using satisfies for type safety"

patterns-established:
  - "URL-driven search: parseSearchRequest/formatSearchQuery from @medplum/core for bidirectional URL sync"
  - "Connection gating: ExplorerLayout checks connection status before rendering MedplumProvider"
  - "Outlet context pattern: ExplorerOutletContext type for passing typed data to child routes"
  - "Curated params: CURATED_PARAMS lookup with COMMON_PARAMS fallback for unknown types"

requirements-completed: [BRWS-01, BRWS-02, BRWS-04]

duration: 4min
completed: 2026-04-11
---

# Phase 2 Plan 1: Explorer Foundation Summary

**URL-driven search state hooks, curated FHIR search params, JSON syntax highlighter, and nested explorer routing with MedplumProvider scoping**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-11T17:19:23Z
- **Completed:** 2026-04-11T17:23:36Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- useSearchState hook that parses URL params into SearchRequest with default count=20 and updates URL on search changes
- getCuratedParams utility returning clinically relevant search param defaults for 10 FHIR resource types with fallback logic
- JsonSyntaxHighlight component with regex tokenizer producing 6 token types (key, string, number, boolean, null, punctuation) with UI-SPEC colors
- ExplorerLayout that gates on connection status and wraps children in MedplumProvider
- useBreadcrumbTrail hook for reference navigation history with push/navigateTo/reset
- Nested explorer routes: /explorer, /explorer/:resourceType, /explorer/:resourceType/:id

## Task Commits

Each task was committed atomically:

1. **Task 1: useSearchState, curated-params, JsonSyntaxHighlight (TDD)** - `601baf5` (test: RED), `0ed5061` (feat: GREEN)
2. **Task 2: ExplorerLayout, useBreadcrumbTrail, App.tsx routing** - `4ad6258` (feat)

## Files Created/Modified
- `src/hooks/useSearchState.ts` - Bidirectional URL <-> SearchRequest sync with default count=20
- `src/hooks/useBreadcrumbTrail.ts` - Reference navigation trail state management
- `src/utils/curated-params.ts` - Per-type curated search parameter lists with fallback
- `src/components/explorer/ExplorerLayout.tsx` - Explorer route layout with MedplumProvider wrapping
- `src/components/explorer/JsonSyntaxHighlight.tsx` - Custom JSON syntax highlighter with 6 token-type coloring
- `src/App.tsx` - Updated routing with nested explorer routes
- `src/__tests__/search-state.test.ts` - 8 tests for URL parsing/formatting logic
- `src/__tests__/curated-params.test.ts` - 9 tests for curated params selection
- `src/__tests__/json-highlight.test.ts` - 7 tests for JSON tokenizer and colors

## Decisions Made
- COMMON_PARAMS fallback uses its own priority order (patient, subject, name, date, status, code) rather than allParams order -- ensures most useful params surface first for unknown types
- JSON tokenizer uses a post-processing pass with colon look-ahead to distinguish keys from string values, which is simpler and more reliable than context-sensitive regex
- ExplorerLayout uses `satisfies ExplorerOutletContext` on the Outlet context prop for compile-time type safety

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All foundational hooks and utilities ready for Plan 02 (search UI with SearchControl) and Plan 03 (resource detail views)
- ExplorerLayout provides MedplumProvider context that SearchControl and other Medplum components need
- Placeholder route elements ready to be replaced with actual components

---
*Phase: 02-resource-explorer*
*Completed: 2026-04-11*
