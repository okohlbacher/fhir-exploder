# Phase 5: Data Quality Dashboard - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a data quality dashboard showing resource counts per type, field completeness statistics, coding coverage metrics (system+code vs text-only), and profile validation against MII Kerndatensatz StructureDefinitions. Users can audit the overall health of data on their FHIR server at a glance.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- **D-01:** [auto] Dashboard accessible from sidebar "Quality" nav item. Landing view shows summary cards/tiles with key metrics at a glance — total resources, resource type count, overall completeness, overall coding coverage.
- **D-02:** [auto] Below summary cards, detailed sections for each metric type, navigable via tabs or scroll.

### Resource Counts
- **D-03:** [auto] Table of all resource types with counts, reusing data from Phase 1's CapabilityStatement display. Sortable by count and name.
- **D-04:** [auto] Bar chart or visual indicator alongside counts for quick visual comparison of resource distribution.

### Field Completeness
- **D-05:** [auto] Per resource type, show percentage of populated fields. Select a resource type to see a breakdown of which fields are populated vs empty.
- **D-06:** [auto] Completeness calculated by sampling resources (e.g., first 100) rather than scanning all resources — configurable sample size. Show "based on N resources" disclaimer.

### Coding Coverage
- **D-07:** [auto] For each resource type that has CodeableConcept fields, show the percentage with proper system+code vs text-only vs empty.
- **D-08:** [auto] Drill-down capability — click a resource type's coding metric to see which specific CodeableConcept fields have gaps.

### Profile Validation
- **D-09:** [auto] Validate individual resources or batches against MII Kerndatensatz StructureDefinition profiles using FHIR $validate operation (if supported by Blaze).
- **D-10:** [auto] Validation results shown as a list of issues per resource — severity (error/warning/information), location (field path), and description.
- **D-11:** [auto] Batch validation with configurable batch size. Show progress indicator during validation.

### Claude's Discretion
- Chart library choice for visualizations (or Mantine-only approach)
- Caching strategy for computed metrics
- Export format for quality reports (if any in v1)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` — Project vision, data quality goals
- `.planning/REQUIREMENTS.md` — QUAL-01 through QUAL-04 requirements for this phase
- `.planning/ROADMAP.md` — Phase 5 success criteria and dependencies
- `CLAUDE.md` — MedplumClient API, Mantine components for data display

### Prior Phase Context
- `.planning/phases/01-foundation-blaze-connectivity/01-CONTEXT.md` — App shell, CapabilityStatement parsing (reusable for counts)
- `.planning/phases/02-resource-explorer/02-CONTEXT.md` — Resource browsing patterns, display modes
- `.planning/phases/04-terminology-resolution/04-CONTEXT.md` — Coding resolution context for coverage metrics

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Resource type list and counts from Phase 1's CapabilityStatement display
- Resource search and display patterns from Phase 2
- Terminology resolution from Phase 4 for understanding coding quality

### Established Patterns
- Sidebar navigation (from Phase 1)
- Mantine tables and cards for data display (from Phase 1/2)
- FHIR search with MedplumClient (from Phase 2)

### Integration Points
- Quality dashboard as new sidebar route
- Reuse resource type data from CapabilityStatement (Phase 1)
- Link from quality issues to resource detail view (Phase 2)
- Profile validation may use $validate FHIR operation on Blaze

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

*Phase: 05-data-quality-dashboard*
*Context gathered: 2026-04-11*
