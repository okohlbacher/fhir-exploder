# Phase 17: Duplicate Detection & Relational Integrity - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two new quality check categories to the dashboard: (1) duplicate detection — potential duplicate patients (name + DOB matching) and potential duplicate resources (content hash with different IDs), and (2) relational integrity — broken references (dangling pointers to non-existent resources) and orphan resources (resources that should reference a parent but don't). All findings surface through the Phase 15 drill-down infrastructure (NormalizedIssue + ResourceIssueTable).

</domain>

<decisions>
## Implementation Decisions

### Patient Duplicate Detection (DQ-07)
- **D-01:** Match on normalized family name + given name + birthDate. Normalize names by lowercasing and trimming whitespace. Two patients match when all three fields are equal after normalization.
- **D-02:** Present matches as grouped pairs/clusters with a confidence indicator. Since the matching is deterministic (exact match on normalized fields), confidence is binary — "exact match" only. No fuzzy/phonetic matching in this phase.
- **D-03:** Handle partial data gracefully: patients missing birthDate or name fields are excluded from duplicate detection (not flagged as duplicates, not flagged as errors — simply skipped with a count shown).

### Content Hash Deduplication (DQ-08)
- **D-04:** Compute a content hash per resource by serializing a canonical form: sort all object keys alphabetically, strip `id`, `meta` (versionId, lastUpdated), and `text` (narrative) fields, then SHA-256 hash the resulting JSON string. Two resources of the same type with different IDs but identical hashes are flagged as potential duplicates.
- **D-05:** Present content-hash duplicates grouped by resource type, showing the hash cluster size and linking to each resource in the cluster via ResourceIssueTable.

### Broken References (DQ-09)
- **D-06:** Walk all Reference-typed fields in sampled resources. For each reference, check existence via a HEAD request or batch `_search` by ID. Use batched existence checks (collect all referenced IDs per type, then check in bulk via `?_id=id1,id2,...&_summary=count`) to minimize server round-trips.
- **D-07:** Report broken references with the source resource, the reference field path, and the target reference that doesn't resolve. Severity: warning (not error — data may be partitioned across servers).

### Orphan Resources (DQ-10)
- **D-08:** Define orphan detection rules per resource type based on FHIR R4 semantics: Observations should reference a subject (usually Patient), Conditions should reference a subject, Encounters should reference a subject, etc. A resource is an orphan if its expected subject/patient reference field is absent or empty.
- **D-09:** Use the MII profile element definitions to determine which reference fields are expected (min >= 1 in profile). Resources without a bundled MII profile fall back to checking the standard FHIR R4 subject/patient reference fields.

### Dashboard Layout
- **D-10:** Add 2 new tabs to the quality dashboard, expanding from 6 to 8 tabs: existing 6 + "Duplicates" + "References". Duplicates tab shows both patient matching and content hash results. References tab shows both broken references and orphan resources.
- **D-11:** Both new tabs follow the established panel pattern: hook (useX) + panel component + drill-down page with ResourceIssueTable.

### Performance & Sampling
- **D-12:** Duplicate detection and reference checks operate on the same sampling mechanism as other quality checks (10..1000 clamp via SampleSizeControl). For patient duplicates, the sample is drawn from Patient resources. For content hashes, the sample is per resource type (scoped by CohortSelector).
- **D-13:** Broken reference checking is the most server-intensive operation. Use a configurable concurrency limit (default: 5 parallel batch requests) and show progress feedback (progress bar pattern from Phase 16).

### Claude's Discretion
- Internal module organization (single file vs separate files for each check type)
- Whether to cache reference existence results in the metricsCache
- Batch size for reference existence checks (e.g., 50 IDs per request vs 100)
- Whether orphan detection needs its own drill-down page or shares the References drill-down

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quality Infrastructure
- `src/quality/types.ts` — NormalizedIssue contract, shared types for quality panels
- `src/quality/sampling.ts` — Sampling logic (10..1000 clamp)
- `src/quality/profiles/index.ts` — getProfileForType, profile element access patterns
- `src/quality/QualityMetricsContext.tsx` — Quality metrics state management

### Dashboard Patterns
- `src/components/quality/QualityOverviewPage.tsx` — Tab layout, adding new tabs
- `src/components/quality/ResourceIssueTable.tsx` — Drill-down table component
- `src/components/quality/CohortSelector.tsx` — Resource type scoping
- `src/components/quality/PlausibilityPanel.tsx` — Reference implementation for new panel + hook pattern

### Hooks Pattern
- `src/hooks/usePlausibilityReport.ts` — Reference implementation: async checks with progress, cancellation, batching
- `src/hooks/useConformanceRun.ts` — Reference implementation: terminology server integration pattern

### Prior Context
- `.planning/phases/16-conformance-plausibility-checks/16-CONTEXT.md` — Decisions D-14 (tab layout), D-15 (NormalizedIssue pattern)
- `.planning/phases/15-quality-check-engine-drill-down/15-CONTEXT.md` — Drill-down infrastructure decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NormalizedIssue` interface (src/quality/types.ts) — all new findings normalize to this format
- `ResourceIssueTable` component — shared drill-down table with clickable resource links
- `CohortSelector` — scopes which resource types are analyzed
- `SampleSizeControl` — configurable sampling (10..1000 clamp)
- `usePlausibilityReport` hook — template for async quality check hooks with progress + cancellation
- `sampling.ts` — `fetchSample()` for consistent sampling across quality checks
- MII profile JSONs in `src/quality/profiles/` — element definitions for orphan detection

### Established Patterns
- Quality tabs: Mantine Tabs with lazy-loaded panel components
- Hook pattern: `useXReport()` returns `{ results, isRunning, progress, run, cancel }`
- Drill-down: Panel shows summary → user clicks → navigates to drill-down page with ResourceIssueTable
- All findings normalize to `NormalizedIssue { resourceId, resourceType, field, description, severity }`

### Integration Points
- `QualityOverviewPage.tsx` — add Duplicates and References tabs
- `App.tsx` — add drill-down routes for `/quality/duplicates` and `/quality/references`
- `validationBackends.ts` — may need to expose reference resolution utilities

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All decisions are Claude's discretion based on established project patterns.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Add cohort selection for scoped data quality analysis** — Already implemented in Phase 16 (CohortSelector component). Todo is stale.
- **Define cohorts via FHIRPath query or MII FDPG format** — Advanced cohort definition beyond simple resource type selection. Out of scope for Phase 17; could be its own phase.

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-duplicate-detection-relational-integrity*
*Context gathered: 2026-04-14*
