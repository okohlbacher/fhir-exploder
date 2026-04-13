# Phase 15: Quality Check Engine & Drill-Down - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add per-resource drill-down to the existing quality dashboard so users can click any quality metric and see exactly which resources and fields are causing issues, with links to the resource detail view. Covers all 3 existing quality panels: completeness, coding coverage, and profile validation.

</domain>

<decisions>
## Implementation Decisions

### Drill-Down Navigation
- **D-01:** Add a "Resources" tab alongside the existing field-level view in each drill-down page (`CodingDrillDown`, `CompletenessDrillDown`, and validation). The existing per-field breakdown becomes the "Fields" tab; the new per-resource listing becomes the "Resources" tab. Same URL, tabs switch the view.
- **D-02:** Clicking a field row in the Fields tab cross-filters the Resources tab to show only resources with issues on that specific field. This answers "which resources have this particular problem?" without requiring manual filtering.

### Resource List Layout
- **D-03:** Table layout matching the existing `ValidationIssueList` pattern: Resource ID (link to `/explorer/:type/:id`), severity badge, field path, issue description. Consistent UX across all panels.
- **D-04:** Each resource ID is a clickable link to the existing resource detail view (Phase 2), satisfying DQ-02 directly.

### Cross-Panel Consistency
- **D-05:** Create a shared `ResourceIssueTable` component that all 3 panels use for the Resources tab. Each panel normalizes its quality data into a common issue format (`{ resourceId, resourceType, field, description, severity }`), then passes it to `ResourceIssueTable`. This avoids duplicating table/pagination/filter logic across panels.

### Filtering & Pagination
- **D-06:** Client-side pagination at 50 items per page using Mantine's `Pagination` component. Quality walkers already use sampling (configurable sample size), so the dataset is bounded by the sample size.
- **D-07:** Two filter controls on the Resources tab: severity dropdown (all/error/warning/info) and field path filter (text input that pre-populates when cross-filtering from the Fields tab via D-02).

### Claude's Discretion
- Exact component file organization (whether ResourceIssueTable lives in `src/components/quality/` or `src/components/shared/`)
- Tab component choice (Mantine Tabs is the obvious choice)
- How quality walkers expose per-resource data (may need to extend walker return types)
- Whether to refactor ValidationIssueList to use the new shared ResourceIssueTable or keep it separate

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Quality Components (modify/extend)
- `src/components/quality/CodingDrillDown.tsx` -- Existing per-field coding drill-down, needs Resources tab
- `src/components/quality/CompletenessDrillDown.tsx` -- Existing per-field completeness drill-down, needs Resources tab
- `src/components/quality/ValidationPanel.tsx` -- Existing validation panel
- `src/components/quality/ValidationIssueList.tsx` -- Existing per-resource validation list (reference pattern for ResourceIssueTable)

### Quality Data Layer (may need extensions)
- `src/hooks/useCodingCoverage.ts` -- Coding coverage data hook
- `src/hooks/useCompletenessReport.ts` -- Completeness report data hook
- `src/hooks/useValidationRun.ts` -- Validation run data hook
- `src/quality/types.ts` -- Quality type definitions
- `src/quality/codingCoverageWalker.ts` -- Coding walker (may need to return per-resource data)
- `src/quality/completenessWalker.ts` -- Completeness walker (may need to return per-resource data)

### Navigation & Routing
- `src/App.tsx` -- Route definitions (existing drill-down routes)
- `src/components/quality/QualityLayout.tsx` -- Quality dashboard layout

### Requirements
- `.planning/REQUIREMENTS.md` -- DQ-01 (click metric to see resources) and DQ-02 (entries link to detail view)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ValidationIssueList` -- Already implements per-resource table with severity badges and links to `/explorer/:type/:id`. Direct reference pattern for the new `ResourceIssueTable`.
- `SampleSizeControl` -- Existing sampling controls, reusable across all panels.
- Mantine `Tabs`, `Table`, `Pagination`, `Select`, `TextInput` -- All available, no new dependencies needed.
- `@tabler/icons-react` -- Already used for back buttons and icons in drill-downs.

### Established Patterns
- Drill-down routing: `/quality/{panel}/:type` with `useParams()` and `useOutletContext()`
- Quality data: Hooks return typed data from walkers; walkers operate on sampled resources
- Links to detail view: `<Link to={/explorer/${type}/${id}}>` pattern used in ValidationIssueList

### Integration Points
- New `ResourceIssueTable` component connects to existing drill-down pages via tab navigation
- Quality walkers may need to return per-resource issue data (currently return aggregate field-level stats)
- Routes in `App.tsx` may not need changes if tab navigation stays within existing drill-down routes

</code_context>

<specifics>
## Specific Ideas

- Cross-filter UX: When user clicks a field in the Fields tab, the Resources tab activates with the field filter pre-populated. This should feel seamless -- tab switches and filter appears in one click.
- The shared `ResourceIssueTable` should accept a normalized issue array so each panel only needs to transform its walker output, not implement its own table logic.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 15-quality-check-engine-drill-down*
*Context gathered: 2026-04-13*
