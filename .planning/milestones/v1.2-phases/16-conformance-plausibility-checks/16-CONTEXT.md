# Phase 16: Conformance & Plausibility Checks - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three new quality check categories to the dashboard: (1) comprehensive profile-based conformance checking (value set bindings, cardinality, type constraints) extending the existing structural validator, (2) temporal plausibility checks (future dates, period consistency, age plausibility, clinical duration limits), and (3) lab reference range checks. Results surface through the Phase 15 drill-down infrastructure (NormalizedIssue + ResourceIssueTable). Also fold in cohort selection for scoped quality analysis.

</domain>

<decisions>
## Implementation Decisions

### Value Set Conformance (DQ-03)
- **D-01:** Use the MII Terminology Server to expand value sets via `$expand`. Extract value set binding URLs from the bundled MII StructureDefinition element definitions. Cache expansions in memory for the browser session (re-fetched on page reload).
- **D-02:** When the terminology server is unavailable, skip value set conformance checks and show a warning banner on the Validation panel: "Terminology server unavailable — value set conformance checks skipped." Consistent with the existing terminology fallback pattern in `src/terminology/`.
- **D-03:** Non-conforming coded values appear in the existing Validation panel (not a new tab), alongside structural validation issues.

### Cardinality & Profile-Based Validation (DQ-04)
- **D-04:** Replace the current structural validator with a comprehensive profile-based checker that covers: min cardinality (existing), max cardinality (new — fields with max=1 must not have multiple values), type constraints (new — values match expected FHIR types from profile), and value set bindings (new — DQ-03 folds into this unified checker).
- **D-05:** All conformance/cardinality issues appear in the existing Validation panel in the same section — no separate sub-tab. Users see all profile conformance findings in one place.

### Temporal Plausibility (DQ-05)
- **D-06:** Implement four temporal plausibility checks: (1) future dates — flag any dateTime/date value in the future, (2) period consistency — flag Period-typed fields where end < start, (3) age plausibility — flag Patient.birthDate implying age > 150 or negative age, (4) clinical duration limits — flag encounters > 365 days, observations with effectiveDateTime before patient birth.
- **D-07:** Auto-discover date/dateTime/Period fields by walking MII profile elements for temporal types. Extensible as new profiles are added — no hardcoded field list.
- **D-08:** Clinical duration thresholds (max age, max encounter duration) are configurable from the start — stored in settings.yaml. Do not defer to Phase 18.
- **D-09:** Temporal plausibility checks appear in a new "Plausibility" tab on the quality dashboard, separate from the Validation panel.

### Lab Reference Ranges (DQ-06)
- **D-10:** Data-first approach: use `Observation.referenceRange` from the FHIR data when present. Allow user-defined overrides/defaults in settings.yaml for LOINC codes without embedded ranges. Config overrides take precedence over data-embedded ranges.
- **D-11:** Flag when `Observation.valueQuantity.value < referenceRange.low.value` or `> referenceRange.high.value`. Standard clinical range logic.
- **D-12:** Lab range checks appear in a separate "Lab Ranges" tab on the quality dashboard (not grouped with temporal plausibility).
- **D-13:** Reference range configuration stored in a `referenceRanges` section of the existing `settings.yaml`, keyed by LOINC code with low/high/unit values.

### Dashboard Layout
- **D-14:** Quality dashboard tabs expand from 4 to 6: Counts | Completeness | Coding Coverage | Validation (enhanced with conformance + cardinality) | Plausibility (temporal) | Lab Ranges.

### Drill-Down Integration
- **D-15:** All new checks (conformance, cardinality, plausibility, lab ranges) normalize their findings into `NormalizedIssue` format and use the shared `ResourceIssueTable` component for drill-down, consistent with Phase 15 patterns.

### Claude's Discretion
- Whether to refactor structuralValidator.ts in place or create a new profileValidator.ts that supersedes it
- Internal organization of the plausibility walker (single module vs split by check type)
- How to structure the settings.yaml schema for reference ranges and plausibility thresholds
- Whether auto-discovery of temporal fields needs a fallback for resources without bundled profiles

### Folded Todos
- **Add cohort selection for scoped data quality analysis** — Interactive UI filtering to scope quality checks to a subset of resources. Adds a cohort selector control to the quality dashboard that filters which resources are analyzed.
- **Define cohorts via FHIRPath query or MII FDPG format** — Programmatic cohort definition, import/export, deletion. Allows defining cohorts via FHIRPath expressions or MII FDPG format for repeatable quality analysis scoping.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Quality Infrastructure (extend/modify)
- `src/quality/structuralValidator.ts` — Current structural validator (min cardinality only). To be replaced/extended with comprehensive profile checker.
- `src/quality/completenessWalker.ts` — Pattern for walking MII profiles and checking resource fields. Reuse `requiredElementPaths()` and `isPathPopulated()`.
- `src/quality/codingCoverageWalker.ts` — Pattern for walking resource fields by type (CodeableConcept detection). Reference for temporal field detection approach.
- `src/quality/types.ts` — `NormalizedIssue`, `IssueSeverity`, `ValidationBackend` types. New checks must normalize into `NormalizedIssue`.
- `src/quality/profiles/index.ts` — Bundled MII StructureDefinition registry. Source of element bindings, cardinality, and type constraints.
- `src/quality/validationBackends.ts` — Backend orchestration. May need extension for new check types.

### Drill-Down Infrastructure (reuse as-is)
- `src/components/quality/ResourceIssueTable.tsx` — Shared drill-down table component. All new checks feed into this.
- `src/components/quality/ValidationPanel.tsx` — Existing validation panel. Conformance + cardinality issues go here.
- `src/components/quality/QualityOverviewPage.tsx` — Dashboard layout with tab navigation. Add Plausibility and Lab Ranges tabs.

### Terminology Integration
- `src/terminology/terminologyClient.ts` — Creates terminology server client. Use for `$expand` value set calls.
- `src/terminology/TerminologyResolver.ts` — Existing display value resolution. Reference for terminology server interaction patterns.

### Configuration
- `src/config/settings.ts` — Settings loader. Extend for plausibility thresholds and reference ranges.
- `src/config/types.ts` — Settings type definitions. Extend `AppSettings` type.

### Requirements
- `.planning/REQUIREMENTS.md` — DQ-03 (value set conformance), DQ-04 (cardinality), DQ-05 (temporal plausibility), DQ-06 (lab reference ranges)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ResourceIssueTable` — Phase 15 shared drill-down table. All new checks normalize into `NormalizedIssue[]` and pass to this component.
- `structuralValidator.ts` — Validates against MII profiles. Foundation for the comprehensive profile checker.
- `requiredElementPaths()` + `isPathPopulated()` from completenessWalker — Reusable for walking profile elements and checking resource values.
- `getProfileForType()` from profiles/index.ts — Registry lookup for bundled MII StructureDefinitions.
- `createTerminologyClient()` — Already builds a MedplumClient for the terminology server. Ready for `$expand` calls.
- `SampleSizeControl` — Existing sampling controls, reusable for new panels.
- Mantine `Tabs` — Already used for quality dashboard tab navigation.

### Established Patterns
- Quality walkers return per-type reports with optional `perResource` arrays for drill-down (Phase 15 pattern)
- `ValidationBackend` interface: `{ kind, validate(resource) → OperationOutcomeIssue[] }` — may want a similar interface for new check types
- Dashboard panels use `useOutletContext<QualityOutletContext>()` for client + capability access
- Drill-down routing: `/quality/{panel}/:type` with `useParams()` and `useOutletContext()`

### Integration Points
- `QualityOverviewPage.tsx` — Add 2 new tab panels (Plausibility, Lab Ranges)
- `QualityLayout.tsx` — May need new routes for Plausibility and Lab Ranges drill-down
- `App.tsx` — Add routes for new drill-down pages
- `settings.yaml` / `types.ts` — Extend with plausibility thresholds and reference range config
- `metricsCache.ts` — Cache new check results alongside existing metrics

</code_context>

<specifics>
## Specific Ideas

- The comprehensive profile checker (D-04) unifies DQ-03 and DQ-04 into a single pass over each resource against its MII StructureDefinition. This is architecturally cleaner than separate conformance and cardinality walkers.
- Temporal field auto-discovery (D-07) should walk profile elements for dateTime/date/Period/instant types, similar to how codingCoverageWalker walks for CodeableConcept types.
- The cohort selection feature should apply to ALL quality checks, not just new ones — it's a dashboard-level filter that scopes which resources are sampled and analyzed.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-conformance-plausibility-checks*
*Context gathered: 2026-04-13*
