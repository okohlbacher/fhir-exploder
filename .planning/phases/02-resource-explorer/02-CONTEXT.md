# Phase 2: Resource Explorer - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a resource explorer that lets users browse any FHIR resource type — searching with FHIR search parameters, paginating through large result sets, viewing individual resources in three display modes (human-readable, clinical+raw, developer/JSON), and navigating cross-references by clicking Reference fields.

</domain>

<decisions>
## Implementation Decisions

### Search UX
- **D-01:** SearchControl-first — use Medplum's SearchControl as the primary search UI component. It handles filter fields, sorting, pagination, and result display. Customize columns and styling but don't reinvent the search form.
- **D-02:** Curated defaults + expand — show a curated set of common search params (name, date, status, code) by default. A "Show all filters" button reveals the full CapabilityStatement parameter list for the selected resource type.
- **D-03:** Explicit submit — user fills in search params and clicks Search / presses Enter. No live-as-you-type filtering. Avoids hammering Blaze with partial queries on large datasets (50K+ resources).
- **D-04:** URL-driven search — search state (resource type, active filters, page, _count) syncs to the URL (e.g., `/explorer/Patient?name=Mueller&_count=25`). Browser back/forward works, searches are bookmarkable. Lays groundwork for v2 BRWS-09 (bookmark/share).

### Resource Type Selection
- **D-05:** Resource type selector reuses the grouped list from Phase 1's CapabilityStatement display — clicking a type from the landing page navigates to Explorer filtered to that type (routing already wired: `/explorer/{type}`).
- **D-06:** A resource type dropdown/selector at the top of the Explorer view allows switching types without going back to the landing page.

### Pagination
- **D-07:** Next/Previous navigation using FHIR Bundle pagination links (bundle.link with rel=next/prev). Standard FHIR-compliant approach.
- **D-08:** Configurable page size via _count parameter — dropdown with options like 10, 25, 50, 100. Default to 20.
- **D-09:** Show total count (Bundle.total) and current page position when available from the server.

### Display Modes
- **D-10:** Three display modes accessible via tab bar at the top of the resource detail view:
  1. **Human-readable** (default) — Medplum React components (ResourceTable, ResourcePropertyDisplay) render the resource in a clinical-friendly format
  2. **Clinical+Raw** — Split view with human-readable rendering on one side and raw FHIR JSON on the other
  3. **Developer/JSON** — Full pretty-printed JSON with syntax highlighting

### Reference Navigation
- **D-11:** Reference fields rendered as clickable links using Medplum's ReferenceDisplay component. Clicking navigates to the referenced resource's detail view within the Explorer.
- **D-12:** Breadcrumb trail showing navigation path (e.g., Patient > Encounter > Condition) so users can trace back through references.

### _include/_revinclude
- **D-13:** Support _include and _revinclude as optional search parameters in the advanced filter panel. Results shown inline in the search results table with related resources visually grouped.

### Claude's Discretion
- Search results table column selection and ordering per resource type
- Keyboard shortcuts for switching display modes
- Search history/recent searches behavior
- How "curated" search params are determined per resource type (common clinical params vs resource-specific heuristics)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — BRWS-01 through BRWS-08 requirements for this phase
- `.planning/ROADMAP.md` — Phase 2 success criteria and dependencies
- `CLAUDE.md` — Medplum component reference (SearchControl, ResourceTable, ResourcePropertyDisplay, ReferenceDisplay, ResourceForm), MedplumClient API

### Prior Phase Context
- `.planning/phases/01-foundation-blaze-connectivity/01-CONTEXT.md` — App shell decisions (sidebar layout, light theme, manual connect, grouped CapabilityStatement display)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/ResourceTypeRow.tsx` — Already links to `/explorer/{type}`, reusable for type selection
- `src/components/dashboard/ResourceTypeList.tsx` — Grouped accordion of resource types with counts
- `src/fhir/capability.ts` — `ParsedResourceType` with `type`, `searchParams`, `operations`, `category`
- `src/fhir/client.ts` — `createFhirClient()` returns MedplumClient
- `src/hooks/useConnection.ts` — Connection state management
- `src/utils/fhir-categories.ts` — `groupByCategory()`, `CATEGORY_ORDER`, `getResourceCategory()`

### Established Patterns
- Sidebar navigation with react-router-dom (routes defined in App.tsx)
- MedplumClient for all FHIR data fetching
- Mantine UI components for layout and styling
- `ExplorerPage` stub exists at `/explorer` route — ready to replace

### Integration Points
- `App.tsx:52` — `/explorer` route with placeholder component, needs subroutes for `/:resourceType` and `/:resourceType/:id`
- `ResourceTypeRow.tsx:14` — Links to `/explorer/${resourceType.type}`, wiring already in place
- MedplumClient.search(), searchResources(), readResource() for data access
- CapabilityStatement `searchParams` array available per resource type for filter generation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-resource-explorer*
*Context gathered: 2026-04-11*
