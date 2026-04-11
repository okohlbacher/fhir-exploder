# Phase 2: Resource Explorer - Research

**Researched:** 2026-04-11
**Domain:** FHIR resource browsing with Medplum React + Mantine
**Confidence:** HIGH

## Summary

Phase 2 builds the core resource exploration UI: a search/browse interface using Medplum's `SearchControl` component, three display modes for resource detail (human-readable, clinical+raw, developer/JSON), and reference navigation with breadcrumbs. The existing codebase already provides the MedplumClient connection, CapabilityStatement parsing (with searchParams per resource type), and routing stubs ready for replacement.

The critical implementation insight is that `SearchControl` from `@medplum/react` does its own data fetching via the `MedplumClient` from context (provided by `MedplumProvider`). It takes a `SearchRequest` object, fires `onChange` when the user modifies search state, and fires `onClick` when a row is clicked. The URL-driven search (D-04) requires syncing `SearchRequest` to/from `react-router-dom` URL params using `parseSearchRequest()` and `formatSearchQuery()` from `@medplum/core`.

**Primary recommendation:** Use SearchControl as the backbone for search results, but build a custom filter panel on top (curated defaults + show-all toggle) that constructs the `SearchRequest` object. Sync that object bidirectionally with the URL. For resource detail, use `ResourceTable` (human-readable), custom JSON renderer (developer), and a Grid split combining both (clinical+raw).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** SearchControl-first -- use Medplum's SearchControl as the primary search UI component
- **D-02:** Curated defaults + expand -- common search params by default, "Show all filters" for full CapabilityStatement params
- **D-03:** Explicit submit -- user clicks Search / presses Enter, no live filtering
- **D-04:** URL-driven search -- search state syncs to URL, browser back/forward works
- **D-05:** Resource type selector reuses grouped list from Phase 1 dashboard
- **D-06:** Resource type dropdown at top of Explorer for switching without going back
- **D-07:** Next/Previous navigation using FHIR Bundle pagination links
- **D-08:** Configurable page size via _count (10, 25, 50, 100; default 20)
- **D-09:** Show total count (Bundle.total) and current page position when available
- **D-10:** Three display modes via tab bar: Human-readable, Clinical+Raw (split), Developer/JSON
- **D-11:** Reference fields as clickable links via ReferenceDisplay, navigating within Explorer
- **D-12:** Breadcrumb trail showing navigation path
- **D-13:** _include/_revinclude as optional search params in advanced filter panel

### Claude's Discretion
- Search results table column selection and ordering per resource type
- Keyboard shortcuts for switching display modes
- Search history/recent searches behavior
- How "curated" search params are determined per resource type

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRWS-01 | User can see all resource types with counts and select one | Resource type selector (Select component) + existing ParsedResourceType/category data from Phase 1 |
| BRWS-02 | User can search by auto-generated FHIR search params from CapabilityStatement | SearchControl + curated filter panel using `ParsedResourceType.searchParams` |
| BRWS-03 | User can paginate using Bundle next/prev with configurable _count | SearchControl's built-in pagination + custom page size selector via SearchRequest.count |
| BRWS-04 | User can view resource as pretty-printed JSON with syntax highlighting | Custom JSON renderer with span-based coloring (no external lib needed for JSON-only) |
| BRWS-05 | User can view resource in human-readable form via Medplum components | ResourceTable component (renders all properties of a single resource) |
| BRWS-06 | User can toggle between three display modes | Mantine Tabs component controlling which view renders |
| BRWS-07 | User can click Reference fields to navigate to referenced resource | ReferenceDisplay with custom onClick + react-router navigation |
| BRWS-08 | User can use _include/_revinclude for related resources | SearchRequest.include/revInclude fields + multi-select UI in advanced filter panel |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @medplum/react | 5.1.7 | SearchControl, ResourceTable, ReferenceDisplay, ResourcePropertyDisplay | FHIR-native rendering, handles all data types correctly |
| @medplum/core | 5.1.7 | MedplumClient, SearchRequest, parseSearchRequest, formatSearchQuery | URL-to-search-request bidirectional conversion built in |
| @medplum/react-hooks | 5.1.7 | useMedplum(), useSearch(), useResource() | React integration for FHIR data fetching |
| @mantine/core | 8.3.18 | Tabs, Select, Button, Breadcrumbs, Grid, Stack, Group, Skeleton, Alert | UI framework required by Medplum |
| react-router-dom | 7.14.0 | Nested routes, useParams, useSearchParams, useNavigate | URL-driven search state management |
| @tabler/icons-react | 3.41.1 | Icons for navigation, filter toggle, tabs | Already established in Phase 1 |

### No Additional Dependencies Required

All functionality can be built with existing installed packages. No new npm installs needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── explorer/
│       ├── ExplorerPage.tsx           # Route container, URL sync orchestrator
│       ├── ResourceTypeSelector.tsx    # Select dropdown for switching types
│       ├── SearchFilterPanel.tsx       # Curated + advanced filter UI
│       ├── SearchResultsView.tsx      # SearchControl wrapper with pagination
│       ├── ResourceDetailPage.tsx     # Detail view with display mode tabs
│       ├── HumanReadableView.tsx      # Tab 1: ResourceTable
│       ├── ClinicalRawView.tsx        # Tab 2: Split grid
│       ├── DeveloperJsonView.tsx      # Tab 3: JSON with syntax highlighting
│       ├── JsonSyntaxHighlight.tsx    # Custom JSON renderer
│       ├── NavigationBreadcrumbs.tsx  # Reference navigation trail
│       └── PaginationControls.tsx     # Next/Prev + page size + count display
├── hooks/
│   ├── useSearchState.ts             # URL <-> SearchRequest sync
│   └── useBreadcrumbTrail.ts         # Reference navigation history
└── utils/
    └── curated-params.ts             # Per-type curated search param lists
```

### Pattern 1: URL-Driven Search State (D-04)
**What:** Bidirectional sync between URL search params and Medplum's `SearchRequest` object
**When to use:** Every search interaction (filter change, pagination, resource type switch)
**Example:**
```typescript
// Source: @medplum/core parseSearchRequest + formatSearchQuery [VERIFIED: installed package types]
import { parseSearchRequest, formatSearchQuery } from '@medplum/core';
import { useSearchParams, useParams } from 'react-router-dom';

function useSearchState() {
  const { resourceType } = useParams<{ resourceType: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL -> SearchRequest
  const searchRequest: SearchRequest = useMemo(() => {
    const query: Record<string, string> = {};
    searchParams.forEach((value, key) => { query[key] = value; });
    return {
      resourceType: resourceType as ResourceType,
      count: Number(query._count) || 20,
      filters: [], // parse from URL params
      ...parseSearchRequest(`${resourceType}?${searchParams.toString()}`)
    };
  }, [resourceType, searchParams]);

  // SearchRequest -> URL
  const setSearch = useCallback((newSearch: SearchRequest) => {
    const queryString = formatSearchQuery(newSearch);
    setSearchParams(new URLSearchParams(queryString));
  }, [setSearchParams]);

  return { searchRequest, setSearch };
}
```

### Pattern 2: SearchControl Integration
**What:** Using Medplum's SearchControl with custom change handling
**When to use:** Main search results view
**Example:**
```typescript
// Source: @medplum/react SearchControlProps [VERIFIED: installed package types]
import { SearchControl } from '@medplum/react';

function SearchResultsView({ search, onChangeSearch, onClickResource }) {
  return (
    <SearchControl
      search={search}
      hideToolbar={true}      // We build our own filter panel
      hideFilters={true}      // We build our own filters
      onChange={(e) => onChangeSearch(e.definition)}
      onClick={(e) => onClickResource(e.resource)}
      onLoad={(e) => {
        // Access Bundle for total count, pagination links
        const bundle = e.response;
        // Extract bundle.total, bundle.link for pagination
      }}
    />
  );
}
```

### Pattern 3: MedplumProvider Scoping
**What:** Wrapping explorer subtree in MedplumProvider so Medplum hooks/components have client context
**When to use:** At the Explorer route level, only when connected
**Example:**
```typescript
// Source: Existing MedplumCompatGate.tsx pattern [VERIFIED: src code]
import { MedplumProvider } from '@medplum/react';

function ExplorerPage() {
  const connection = useConnection(); // from Phase 1
  if (connection.state.status !== 'connected') {
    return <Alert>Not connected</Alert>;
  }
  return (
    <MedplumProvider medplum={connection.state.client}>
      <ExplorerContent capability={connection.state.capability} />
    </MedplumProvider>
  );
}
```

### Pattern 4: Reference Navigation with Breadcrumbs (D-11, D-12)
**What:** Track navigation history as user clicks through references
**When to use:** Resource detail view, reference click handling
**Example:**
```typescript
// Breadcrumb state stored in URL or session state
// Each breadcrumb entry: { resourceType, id, label }
function useBreadcrumbTrail() {
  const [trail, setTrail] = useState<BreadcrumbEntry[]>([]);

  const navigateTo = (resourceType: string, id: string) => {
    setTrail(prev => [...prev, { resourceType, id }]);
    navigate(`/explorer/${resourceType}/${id}`);
  };

  const navigateBack = (index: number) => {
    setTrail(prev => prev.slice(0, index + 1));
    const entry = trail[index];
    navigate(`/explorer/${entry.resourceType}/${entry.id}`);
  };

  return { trail, navigateTo, navigateBack };
}
```

### Anti-Patterns to Avoid
- **Building custom search result fetching alongside SearchControl:** SearchControl fetches data itself via MedplumClient. Don't also call useSearch() for the same query -- leads to duplicate requests.
- **Storing search state in React state instead of URL:** Breaks back/forward navigation (D-04 requirement). Always derive from URL.
- **Using ResourceForm for read-only display:** ResourceForm requires an `onSubmit` handler and is designed for editing. Use `ResourceTable` (for single resource detail display) instead.
- **Wrapping entire app in MedplumProvider:** MedplumProvider should only wrap the connected subtree. The app needs to function (show settings, dashboard connection UI) without a MedplumClient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FHIR search URL parsing | Custom URL parser for FHIR params | `parseSearchRequest()` from @medplum/core | Handles all FHIR search param formats, modifiers, prefixes |
| Search URL serialization | Custom query string builder | `formatSearchQuery()` from @medplum/core | Knows FHIR-specific encoding rules |
| FHIR data type rendering | Custom renderers for HumanName, Address, CodeableConcept, etc. | `ResourcePropertyDisplay` / `ResourceTable` | 50+ FHIR types with complex display rules |
| Reference resolution/display | Custom reference parser + fetch | `ReferenceDisplay` from @medplum/react | Handles all reference formats, shows resource name |
| Paginated search with caching | Custom fetch + cache layer | `SearchControl` + MedplumClient cache | Built-in request dedup and caching |
| JSON syntax highlighting (for JSON-only) | Pull in Prism/highlight.js/Shiki | Custom `<pre>` + `<span>` tokenizer | JSON grammar is trivial (6 token types); external lib is overkill per UI-SPEC |

**Key insight:** Medplum's `@medplum/core` provides `parseSearchRequest` and `formatSearchQuery` which together handle the entire URL <-> SearchRequest mapping. This is the critical utility for D-04 (URL-driven search).

## Common Pitfalls

### Pitfall 1: SearchControl Expects MedplumProvider in Ancestor Tree
**What goes wrong:** SearchControl renders nothing or throws "Cannot read properties of null" if MedplumClient is not in context.
**Why it happens:** SearchControl uses `useMedplum()` internally to fetch data.
**How to avoid:** Always wrap with `<MedplumProvider medplum={client}>` before rendering SearchControl or any Medplum React component.
**Warning signs:** Blank table, console errors about null client.

### Pitfall 2: SearchControl onChange Fires on Every Internal State Change
**What goes wrong:** Infinite re-render loop if onChange updates state that re-renders SearchControl with a new search prop.
**Why it happens:** SearchControl fires onChange for pagination, sort, and filter changes. If the parent recreates the SearchRequest object on every render, SearchControl sees a "new" search and re-fetches.
**How to avoid:** Memoize the SearchRequest object. Only update URL (and thus SearchRequest) when onChange fires with a meaningfully different definition. Use referential equality checks.
**Warning signs:** Network tab shows repeated identical requests.

### Pitfall 3: Blaze May Not Support Bundle.total
**What goes wrong:** "Showing 1-20 of undefined" displayed to user.
**Why it happens:** Blaze does not always include Bundle.total in search results (depends on server config and query complexity). FHIR spec says total is optional.
**How to avoid:** D-09 already accounts for this -- show "Showing 1-20" without total when Bundle.total is undefined. Never assume total is present.
**Warning signs:** Total shows as NaN or undefined in UI.

### Pitfall 4: parseSearchRequest Expects Full URL Format
**What goes wrong:** Parsing fails or returns wrong resourceType.
**Why it happens:** `parseSearchRequest` expects a string like `"Patient?name=Smith&_count=20"` (resourceType + query string).
**How to avoid:** Construct the input string as `${resourceType}?${searchParams.toString()}` when parsing from react-router URL params.
**Warning signs:** SearchRequest has wrong resourceType or empty filters.

### Pitfall 5: ReferenceDisplay Link Navigation Leaves the App
**What goes wrong:** Clicking a reference link navigates to Medplum server URL instead of in-app route.
**Why it happens:** ReferenceDisplay renders an `<a>` tag pointing to the FHIR server URL by default (built for Medplum app context).
**How to avoid:** Override the click behavior on ReferenceDisplay's parent, or use `onClick` interception. Alternatively, render references as custom links using react-router's `<Link>` component, extracting the reference target from the Reference value (`reference.split('/')` to get type + id).
**Warning signs:** Clicking a reference navigates to `http://localhost:8080/fhir/Patient/123` instead of `/explorer/Patient/123`.

### Pitfall 6: SearchControl's Built-in Pagination May Conflict with Custom Controls
**What goes wrong:** Two sets of pagination controls visible, or SearchControl's pagination changes aren't synced to URL.
**Why it happens:** SearchControl has built-in pagination. If you also render custom pagination, they compete.
**How to avoid:** Either use SearchControl's built-in pagination and style it (preferred), or `hideToolbar={true}` and fully manage pagination via onChange + custom controls. The onChange event fires with the new SearchRequest including updated cursor/offset.
**Warning signs:** Clicking Next in custom controls doesn't match SearchControl's page state.

## Code Examples

### Custom JSON Syntax Highlighter (per UI-SPEC)
```typescript
// Source: UI-SPEC color definitions [VERIFIED: 02-UI-SPEC.md]
interface JsonToken {
  type: 'string' | 'number' | 'boolean' | 'null' | 'key' | 'punctuation';
  value: string;
}

const TOKEN_COLORS: Record<JsonToken['type'], string> = {
  string: '#2f9e44',     // green.7
  number: '#e8590c',     // orange.8
  boolean: '#9c36b5',    // grape.7
  null: '#9c36b5',       // grape.7
  key: '#1971c2',        // blue.7
  punctuation: '#495057', // gray.7
};

function JsonSyntaxHighlight({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);
  // Tokenize and render with colored spans
  // Use regex-based tokenizer for JSON (simple grammar)
  return (
    <pre style={{
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      fontSize: '13px',
      lineHeight: 1.5,
      background: '#f8f9fa',
      padding: '16px',
      overflow: 'auto',
    }}>
      {tokenize(json).map((token, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>
          {token.value}
        </span>
      ))}
    </pre>
  );
}
```

### Curated Search Params Strategy
```typescript
// Source: Clinical knowledge + CapabilityStatement data [ASSUMED]
const CURATED_PARAMS: Record<string, string[]> = {
  Patient: ['name', 'family', 'given', 'birthdate', 'gender', 'identifier'],
  Observation: ['patient', 'code', 'date', 'status', 'category'],
  Condition: ['patient', 'code', 'clinical-status', 'onset-date'],
  Encounter: ['patient', 'date', 'status', 'class', 'type'],
  MedicationStatement: ['patient', 'status', 'effective'],
  Procedure: ['patient', 'code', 'date', 'status'],
  DiagnosticReport: ['patient', 'code', 'date', 'status'],
  // Default fallback for unknown types: first 5 params from CapabilityStatement
};

function getCuratedParams(resourceType: string, allParams: string[]): string[] {
  const curated = CURATED_PARAMS[resourceType];
  if (curated) {
    return curated.filter(p => allParams.includes(p));
  }
  // Fallback: common params that exist on this type
  const commonFirst = ['patient', 'subject', 'name', 'date', 'status', 'code'];
  const matched = commonFirst.filter(p => allParams.includes(p));
  return matched.length > 0 ? matched.slice(0, 5) : allParams.slice(0, 5);
}
```

### Route Structure
```typescript
// Source: react-router-dom v7 + existing App.tsx [VERIFIED: src/App.tsx]
<Route path="/explorer" element={<ExplorerLayout />}>
  <Route index element={<ResourceTypeSelectorPage />} />
  <Route path=":resourceType" element={<SearchResultsPage />} />
  <Route path=":resourceType/:id" element={<ResourceDetailPage />} />
</Route>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom FHIR search UI | Medplum SearchControl component | Medplum 3.x+ | Saves weeks of work, handles all FHIR search complexities |
| Manual URL param parsing | parseSearchRequest/formatSearchQuery | Medplum 2.x+ | Built-in bidirectional URL <-> SearchRequest conversion |
| react-router v5 useHistory | react-router v7 useSearchParams | 2024 | Cleaner URL parameter management for search state |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Curated search params per resource type (Patient: name, family, etc.) | Code Examples - Curated Params | Low -- easily adjustable, just changes which params show by default |
| A2 | ReferenceDisplay renders `<a>` tags pointing to server URL that need interception | Pitfall 5 | Medium -- if it renders differently, navigation approach changes. Need to verify at implementation time. |
| A3 | SearchControl handles its own data fetching entirely when given MedplumProvider context | Architecture Pattern 2 | High -- if it doesn't self-fetch, entire integration approach changes. But verified from MedplumCompatGate.tsx pattern which confirms Medplum components fetch via context. |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/react 16.3.2 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRWS-01 | Resource type list with counts, select navigates | integration | `npx vitest run src/__tests__/explorer-type-selector.test.tsx -t "resource type"` | Wave 0 |
| BRWS-02 | Search params auto-generated from CapabilityStatement | unit | `npx vitest run src/__tests__/curated-params.test.ts` | Wave 0 |
| BRWS-03 | Pagination with bundle links + configurable _count | integration | `npx vitest run src/__tests__/pagination.test.tsx` | Wave 0 |
| BRWS-04 | Pretty-printed JSON with syntax highlighting | unit | `npx vitest run src/__tests__/json-highlight.test.ts` | Wave 0 |
| BRWS-05 | Human-readable resource rendering | integration | `npx vitest run src/__tests__/resource-detail.test.tsx` | Wave 0 |
| BRWS-06 | Three display mode toggle | integration | `npx vitest run src/__tests__/display-modes.test.tsx` | Wave 0 |
| BRWS-07 | Reference click navigation | integration | `npx vitest run src/__tests__/reference-navigation.test.tsx` | Wave 0 |
| BRWS-08 | _include/_revinclude in search | unit | `npx vitest run src/__tests__/include-params.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/curated-params.test.ts` -- covers BRWS-02 (curated param selection logic)
- [ ] `src/__tests__/json-highlight.test.ts` -- covers BRWS-04 (JSON tokenizer correctness)
- [ ] `src/__tests__/explorer-type-selector.test.tsx` -- covers BRWS-01
- [ ] `src/__tests__/search-state.test.ts` -- covers URL <-> SearchRequest sync logic

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Handled in Phase 1 (bearer/basic from settings.yaml) |
| V3 Session Management | no | Stateless -- MedplumClient holds token in memory |
| V4 Access Control | no | Read-only app, no user roles |
| V5 Input Validation | yes | Sanitize user search input before constructing FHIR URLs (Medplum handles via SearchRequest) |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via FHIR resource content rendered in JSON view | Tampering | React's default escaping + textContent for JSON display (no innerHTML/dangerouslySetInnerHTML) |
| URL injection via search params | Tampering | Use parseSearchRequest/formatSearchQuery (Medplum sanitizes), never construct raw URLs from user input |
| Server URL manipulation via breadcrumb/reference | Information Disclosure | Validate reference targets match expected FHIR reference format before navigation |

## Sources

### Primary (HIGH confidence)
- Installed @medplum/react 5.1.7 type declarations -- SearchControlProps, ResourceTableProps, ReferenceDisplayProps
- Installed @medplum/core 5.1.7 type declarations -- SearchRequest interface, parseSearchRequest, formatSearchQuery, Filter
- Installed @medplum/react-hooks 5.1.7 type declarations -- useSearch, useSearchResources, useResource
- Existing source code: src/fhir/capability.ts, src/hooks/useConnection.ts, src/components/dashboard/MedplumCompatGate.tsx, src/App.tsx

### Secondary (MEDIUM confidence)
- 02-UI-SPEC.md -- design contract for colors, layout, copy, interaction flows
- 02-CONTEXT.md -- locked decisions D-01 through D-13

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages already installed and verified from type declarations
- Architecture: HIGH - patterns derived from actual Medplum API signatures and existing codebase patterns
- Pitfalls: HIGH/MEDIUM - pitfalls 1-4 derived from API analysis; pitfall 5 (ReferenceDisplay link behavior) is MEDIUM as it needs runtime verification

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- Medplum 5.x is current, all deps locked)
