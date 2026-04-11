---
phase: 02-resource-explorer
verified: 2026-04-11T20:56:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Per-type resource counts not displayed in Explorer landing page"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Navigate to /explorer when connected to a live Blaze server and verify resource type list shows count badges"
    expected: "Each resource type name is followed by a blue Badge with the formatted count (e.g., '1,234'), a Loader spinner while counts are fetching, or a red 'Error' badge on failure"
    why_human: "useResourceCounts fires live FHIR _summary=count requests; cannot be exercised without a running Blaze server."
  - test: "Navigate to /explorer when connected to a live Blaze server and verify the filter panel and search flow"
    expected: "Filter panel shows curated params; clicking Search Patient executes query; results appear in table; URL updates to reflect filters"
    why_human: "SearchControl requires live MedplumClient connected to a FHIR server; not testable without a running server."
  - test: "Click Next/Previous buttons after a search that returns more than one page of results"
    expected: "Next page loads; position text updates (e.g., 'Showing 21-40 of 120'); Previous button becomes enabled"
    why_human: "Bundle.link pagination requires real server-returned Bundle with next/prev links."
  - test: "Navigate to /explorer/Patient/{id} for a real patient resource and verify all three display modes"
    expected: "Human-readable tab shows Medplum ResourceTable with formatted fields; Clinical+Raw shows 50/50 split; Developer shows syntax-highlighted JSON; tab switching and keyboard shortcuts 1/2/3 work"
    why_human: "Medplum component rendering fidelity requires live FHIR data and browser."
  - test: "Click a Reference field link on a resource detail page"
    expected: "Navigation stays within app; breadcrumb trail updates showing traversal path; new resource loads; clicking breadcrumb segment navigates back"
    why_human: "Requires Medplum's ReferenceDisplay to render anchor tags in a real browser with FHIR server URLs for interception to trigger."
---

# Phase 2: Resource Explorer Verification Report

**Phase Goal:** Users can browse any resource type on the server — searching, paginating, and viewing resources in multiple display modes with navigable cross-references
**Verified:** 2026-04-11T20:56:00Z
**Status:** human_needed
**Re-verification:** Yes — gap closure plan 02-05 executed to close the per-type counts gap identified in previous verification (2026-04-11T18:31:02Z, status: gaps_found).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see all resource types on the server with per-type counts and select one to browse | VERIFIED | ResourceTypeLanding imports useResourceCounts and useMedplum; calls `useResourceCounts(client, typeNames)`; renders Badge (blue number), Loader, and Badge (red "Error") per type. 4 new tests pass. |
| 2 | User can search resources using FHIR search parameters auto-populated from the CapabilityStatement | VERIFIED | SearchFilterPanel receives allSearchParams from parsed capability; getCuratedParams provides curated defaults; "Show all filters" toggle reveals full CapabilityStatement param list |
| 3 | User can paginate through large result sets using Next/Previous navigation with configurable page size | VERIFIED | PaginationControls extracts next/prev links from Bundle.link; page size Select with options [10,25,50,100]; position text "Showing X-Y" with conditional "of {total}" |
| 4 | User can view any individual resource in three modes: human-readable (default), clinical+raw split, and developer/FHIR-structure JSON view | VERIFIED | ResourceDetailPage with Mantine Tabs (Human-readable, Clinical + Raw, Developer); HumanReadableView uses ResourceTable; ClinicalRawView uses Grid.Col span=6 with independent ScrollAreas; DeveloperJsonView uses JsonSyntaxHighlight; keyboard shortcuts 1/2/3 |
| 5 | User can click a Reference field on any resource and navigate directly to the referenced resource | VERIFIED | Container-level click interception in ResourceDetailPage; handleReferenceClick validates FHIR URL pattern /ResourceType/id; calls breadcrumbs.push which navigates in-app |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useSearchState.ts` | Bidirectional URL <-> SearchRequest sync | VERIFIED | Exports useSearchState; imports parseSearchRequest and formatSearchQuery from @medplum/core; default count=20 |
| `src/hooks/useBreadcrumbTrail.ts` | Reference navigation trail state management | VERIFIED | Exports useBreadcrumbTrail and BreadcrumbEntry; push/navigateTo/reset; useNavigate wired |
| `src/utils/curated-params.ts` | Per-type curated search parameter lists | VERIFIED | Exports CURATED_PARAMS and getCuratedParams; 10 resource types mapped; COMMON_PARAMS fallback |
| `src/components/explorer/ExplorerLayout.tsx` | Explorer route layout with MedplumProvider wrapping | VERIFIED | Exports ExplorerLayout and ExplorerOutletContext; gates on connection status; wraps Outlet in MedplumProvider |
| `src/components/explorer/JsonSyntaxHighlight.tsx` | JSON syntax highlighter with 6 token-type coloring | VERIFIED | Exports tokenize, JsonSyntaxHighlight, TOKEN_COLORS; all 6 types with UI-SPEC colors |
| `src/components/explorer/ResourceTypeSelector.tsx` | Dropdown to switch resource type | VERIFIED | Exports ResourceTypeSelector; searchable Mantine Select; alphabetically sorted |
| `src/components/explorer/SearchFilterPanel.tsx` | Curated + advanced filter UI | VERIFIED | Exports SearchFilterPanel; getCuratedParams wired; Show all filters toggle; _include/_revinclude MultiSelect; dynamic "Search {Type}" button |
| `src/components/explorer/SearchResultsPage.tsx` | Main search page orchestrator | VERIFIED | Exports SearchResultsPage; uses useSearchState, SearchControl (hideToolbar, hideFilters), PaginationControls; empty/error states |
| `src/components/explorer/PaginationControls.tsx` | Next/Previous with page size and count | VERIFIED | Exports PaginationControls; extracts next/prev from Bundle.link; "Results per page" Select [10,25,50,100]; position text with conditional total |
| `src/components/explorer/ResourceTypeLanding.tsx` | Landing page for /explorer index with per-type counts | VERIFIED | Exports ResourceTypeLanding; imports useResourceCounts from '../../hooks/useResourceCounts'; imports useMedplum from '@medplum/react-hooks'; calls useResourceCounts(client, typeNames); renders Badge (blue), Loader, Badge (red "Error") per type |
| `src/components/explorer/ResourceDetailPage.tsx` | Resource detail view with three display mode tabs | VERIFIED | Exports ResourceDetailPage; Tabs with 3 panels; readResource in useEffect; useBreadcrumbTrail; keyboard shortcuts; handleReferenceClick with e.preventDefault |
| `src/components/explorer/HumanReadableView.tsx` | Tab 1: Medplum ResourceTable rendering | VERIFIED | Exports HumanReadableView; uses ResourceTable; does NOT use ResourceForm |
| `src/components/explorer/ClinicalRawView.tsx` | Tab 2: Split view (Medplum left, JSON right) | VERIFIED | Exports ClinicalRawView; Grid with two Grid.Col span=6; ResourceTable left; JsonSyntaxHighlight right; independent ScrollAreas |
| `src/components/explorer/DeveloperJsonView.tsx` | Tab 3: Full JSON with syntax highlighting | VERIFIED | Exports DeveloperJsonView; uses JsonSyntaxHighlight; wrapped in ScrollArea |
| `src/components/explorer/NavigationBreadcrumbs.tsx` | Clickable breadcrumb trail | VERIFIED | Exports NavigationBreadcrumbs; Breadcrumbs with separator=">"; Explorer root; trail entries as clickable Anchors; current resource as bold non-clickable Text |
| `src/App.tsx` | Updated routing with nested explorer routes | VERIFIED | ExplorerLayout wraps /explorer; index -> ResourceTypeLanding; :resourceType -> SearchResultsPage; :resourceType/:id -> ResourceDetailPage |
| `src/__tests__/resource-type-landing-counts.test.tsx` | Tests for count display in landing page | VERIFIED | 4 tests: count badges, loaders, error badges, hook invocation verification — all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ResourceTypeLanding.tsx | useResourceCounts.ts | `import { useResourceCounts } from '../../hooks/useResourceCounts'` + `useResourceCounts(client, typeNames)` | WIRED | Gap closed — confirmed in file lines 7 and 21 |
| ResourceTypeLanding.tsx | @medplum/react-hooks | `import { useMedplum } from '@medplum/react-hooks'` + `const client = useMedplum()` | WIRED | Gap closed — confirmed in file lines 2 and 18 |
| useSearchState.ts | @medplum/core | parseSearchRequest and formatSearchQuery imports | WIRED | Confirmed in file |
| ExplorerLayout.tsx | useConnection.ts | useConnection (delegates to ConnectionContext) | WIRED | useConnection() -> useConnectionContext() -> shared state |
| App.tsx | ConnectionContext.tsx | ConnectionProvider wrapping all routes | WIRED | Confirmed |
| SearchResultsPage.tsx | useSearchState.ts | useSearchState hook | WIRED | Confirmed |
| SearchResultsPage.tsx | @medplum/react | SearchControl component | WIRED | Confirmed |
| SearchFilterPanel.tsx | curated-params.ts | getCuratedParams | WIRED | Confirmed |
| ResourceDetailPage.tsx | @medplum/react-hooks | client.readResource via useMedplum | WIRED | Confirmed |
| HumanReadableView.tsx | @medplum/react | ResourceTable component | WIRED | Confirmed |
| DeveloperJsonView.tsx | JsonSyntaxHighlight.tsx | JsonSyntaxHighlight component | WIRED | Confirmed |
| NavigationBreadcrumbs.tsx | useBreadcrumbTrail.ts | BreadcrumbEntry type + props from ResourceDetailPage | WIRED | Confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| ResourceTypeLanding | counts | useResourceCounts(client, typeNames) -> concurrency-limited FHIR _summary=count requests | Yes — real FHIR server requests (verifiable via hook implementation) | FLOWING |
| ResourceTypeLanding | parsedTypes | parseResourceTypes(capability) from ExplorerOutletContext | Yes — capability from CapabilityStatement fetched in Phase 1 | FLOWING |
| SearchResultsPage | bundle | SearchControl onLoad -> setBundle | Yes — SearchControl fetches from FHIR server via MedplumClient | FLOWING |
| ResourceDetailPage | resource | client.readResource(resourceType, id) in useEffect | Yes — direct API call to FHIR server | FLOWING |
| PaginationControls | bundle | Passed as prop from SearchResultsPage | Yes — from SearchControl load event | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 4 new count display tests pass | `npx vitest run src/__tests__/resource-type-landing-counts.test.tsx --reporter=verbose` | 4 tests passed, 0 failures | PASS |
| All 72 phase tests pass (no regressions) | `npx vitest run --reporter=verbose` | 10 test files, 72 tests passed, 0 failures | PASS |
| TypeScript compiles cleanly | `npx tsc --noEmit` | 0 errors | PASS |
| useResourceCounts wired into ResourceTypeLanding | `grep useResourceCounts src/components/explorer/ResourceTypeLanding.tsx` | Lines 7 and 21 confirmed | PASS |
| Count badges present in ResourceTypeLanding | `grep -c "Badge" src/components/explorer/ResourceTypeLanding.tsx` | 2 Badge elements (blue count + red error) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BRWS-01 | 02-01, 02-02, 02-05 | User can see a list of all resource types available on the server **with counts per type** | SATISFIED | ResourceTypeLanding shows types with count badges (number/loading/error). BRWS-01 gap closed by plan 02-05. |
| BRWS-02 | 02-01, 02-02 | User can search resources by FHIR search parameters auto-generated from the CapabilityStatement | SATISFIED | SearchFilterPanel wired to CapabilityStatement params |
| BRWS-03 | 02-02 | User can paginate through search results using Bundle next/prev links with configurable _count | SATISFIED | PaginationControls with Bundle.link and [10,25,50,100] page sizes |
| BRWS-04 | 02-01, 02-03 | User can view an individual resource as pretty-printed JSON with syntax highlighting | SATISFIED | JsonSyntaxHighlight with 6 token types and UI-SPEC colors |
| BRWS-05 | 02-03 | User can view an individual resource in a human-readable rendered form | SATISFIED | HumanReadableView uses Medplum ResourceTable |
| BRWS-06 | 02-03 | User can toggle between three display modes | SATISFIED | ResourceDetailPage with Mantine Tabs and keyboard shortcuts 1/2/3 |
| BRWS-07 | 02-03 | User can click Reference fields to navigate to the referenced resource | SATISFIED | Container-level click interception in ResourceDetailPage |
| BRWS-08 | 02-02 | User can use _include/_revinclude to fetch related resources in a single query | SATISFIED | SearchFilterPanel shows _include/_revinclude MultiSelect in expanded mode |

8/8 requirements satisfied. All BRWS-01 through BRWS-08 fully satisfied.

### Anti-Patterns Found

No blocker anti-patterns found. The previously identified blocker (useResourceCounts not wired into ResourceTypeLanding) has been resolved.

### Human Verification Required

#### 1. Explorer Landing with Live Count Badges

**Test:** Connect to a live Blaze FHIR server, navigate to /explorer, wait for counts to load
**Expected:** Each resource type name is followed by a blue Badge with the formatted count (e.g., "1,234"), a Loader spinner while fetching, or a red "Error" badge on failure — matching the DashboardPage pattern
**Why human:** useResourceCounts fires live FHIR _summary=count requests; cannot be exercised without a running Blaze server.

#### 2. Search Execution with Real FHIR Data

**Test:** Connect to a live Blaze FHIR server, navigate to /explorer/Patient, enter "Smith" in the name filter, click "Search Patient"
**Expected:** SearchControl executes FHIR search, results table appears, URL updates to /explorer/Patient?name=Smith, page size defaults to 20
**Why human:** SearchControl requires live MedplumClient and FHIR server to execute queries; not mockable in unit tests.

#### 3. Pagination with Real Bundle Links

**Test:** Execute a search that returns more than one page of results; click Next button
**Expected:** Next page loads; position text updates (e.g., "Showing 21-40 of 120"); Previous button becomes enabled
**Why human:** Real FHIR server must return Bundle with next/prev links for pagination to be exercised end-to-end.

#### 4. Three Display Modes with Real Resource Data

**Test:** Navigate to /explorer/Patient/{id} for a real patient; verify all three tabs render correctly
**Expected:** Human-readable tab shows Medplum ResourceTable with formatted fields; Clinical+Raw shows split view; Developer shows syntax-highlighted JSON; tab switching and keyboard shortcuts 1/2/3 work
**Why human:** Medplum component rendering fidelity requires live FHIR data and browser.

#### 5. Reference Click Navigation and Breadcrumb Trail

**Test:** On a resource detail page, click a rendered Reference link (e.g., subject pointing to a Patient)
**Expected:** Navigation stays within app; breadcrumb trail updates; new resource loads; clicking breadcrumb segment navigates back
**Why human:** Requires Medplum's ReferenceDisplay to render anchor tags in a real browser for click interception to trigger.

### Re-Verification Summary

The single gap identified in the previous verification (2026-04-11T18:31:02Z) has been closed:

**Gap closed:** `ResourceTypeLanding.tsx` now imports `useResourceCounts` from `../../hooks/useResourceCounts` and `useMedplum` from `@medplum/react-hooks`. It calls `useResourceCounts(client, typeNames)` and renders per-type count indicators: blue Badge with formatted number (toLocaleString), Loader spinner during loading, and red "Error" badge on failure. This matches the DashboardPage pattern exactly.

All 5 observable truths are now VERIFIED. All 8 BRWS requirements are SATISFIED. 72 tests pass with 0 regressions. TypeScript compiles cleanly. Phase goal is achieved pending human verification with a live FHIR server.

---

_Verified: 2026-04-11T20:56:00Z_
_Verifier: Claude (gsd-verifier)_
