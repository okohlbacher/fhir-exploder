# Phase 2: Resource Explorer - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a resource explorer that lets users browse any FHIR resource type — searching with FHIR search parameters, paginating through large result sets, viewing individual resources in three display modes (human-readable, clinical+raw, developer/JSON), and navigating cross-references by clicking Reference fields.

</domain>

<decisions>
## Implementation Decisions

### Resource Type Selection
- **D-01:** [auto] Resource type selector reuses the grouped list from Phase 1's CapabilityStatement display — clicking a type from the landing page or sidebar navigates to Explorer filtered to that type.
- **D-02:** [auto] A resource type dropdown/selector at the top of the Explorer view allows switching types without going back to the landing page.

### Search Interface
- **D-03:** [auto] Search parameters auto-populated from the CapabilityStatement for the selected resource type. Displayed as form fields (text inputs, date pickers, selects) matching the parameter types.
- **D-04:** [auto] Search bar with expandable advanced filters — a primary search field with a collapsible panel showing all available search parameters. Keeps the UI clean for simple lookups while exposing full FHIR search power.

### Pagination
- **D-05:** [auto] Next/Previous navigation using FHIR Bundle pagination links (bundle.link with rel=next/prev). Standard FHIR-compliant approach.
- **D-06:** [auto] Configurable page size via _count parameter — dropdown with options like 10, 25, 50, 100. Default to 20.
- **D-07:** [auto] Show total count (Bundle.total) and current page position when available from the server.

### Display Modes
- **D-08:** [auto] Three display modes accessible via tab bar or toggle at the top of the resource detail view:
  1. **Human-readable** (default) — Medplum React components (ResourceTable, ResourcePropertyDisplay) render the resource in a clinical-friendly format
  2. **Clinical+Raw** — Split view with human-readable rendering on one side and raw FHIR JSON on the other
  3. **Developer/JSON** — Full pretty-printed JSON with syntax highlighting

### Reference Navigation
- **D-09:** [auto] Reference fields rendered as clickable links using Medplum's ReferenceDisplay component. Clicking navigates to the referenced resource's detail view within the Explorer.
- **D-10:** [auto] Breadcrumb trail showing navigation path (e.g., Patient > Encounter > Condition) so users can trace back through references.

### _include/_revinclude
- **D-11:** [auto] Support _include and _revinclude as optional search parameters in the advanced filter panel. Results shown inline in the search results table with related resources visually grouped.

### Claude's Discretion
- Search results table column selection and ordering
- Keyboard shortcuts for switching display modes
- Search history/recent searches behavior

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
- Phase 1 establishes: sidebar navigation, MedplumClient connection, CapabilityStatement parsing, grouped resource type list
- Medplum's SearchControl component is the workhorse — provides full search UI with filters, sort, pagination, and column display

### Established Patterns
- Sidebar navigation with react-router-dom (from Phase 1)
- MedplumClient for all FHIR data fetching (from Phase 1)
- Mantine UI components for layout and styling (from Phase 1)

### Integration Points
- Resource type list from Phase 1 links into Explorer views
- MedplumClient.search(), searchResources(), readResource() for data access
- react-router-dom routes for resource type and individual resource views

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
