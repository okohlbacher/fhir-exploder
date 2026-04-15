# Requirements: FHIR Exploder v1.3 -- Cohort Definition & Storage

**Defined:** 2026-04-14
**Status:** Active (v1.2 shipped 2026-04-15; v1.3 now the current milestone)
**Core Value:** Enable scoped quality analysis by defining, persisting, and reusing patient/encounter cohorts. Resolves the long-standing UX mismatch where the "Cohort" control actually filters by resource type.

## Background

The existing `CohortSelector` (shipped in Phase 16) is a multi-select listing all available FHIR resource types. It scopes which resource TYPES the quality panels analyze -- it does NOT define a cohort in the clinical sense (a subset of patients or encounters). Users reading "Cohort" expect the latter. v1.3 closes the gap by:

1. Renaming the existing control to "Resource types" so its behavior matches the label.
2. Adding a real cohort feature -- interactive UI in Phase 21, programmatic (FHIRPath + FDPG) in Phase 22.
3. Making both controls compose orthogonally ("analyze these resource types, scoped to these patients").

The two "real cohort" directions (interactive UI vs programmatic definitions) are captured as distinct phases so each ships independently with a focused scope.

## v1.3 Requirements

### Interactive Cohort Builder (Phase 21)

- [ ] **CHRT-01**: User can define a patient cohort through an interactive builder supporting at minimum: date range filter (encounter/observation period), condition code filter (CodeableConcept lookup), and explicit reference-list inclusion (paste list of Patient/XYZ references)
- [ ] **CHRT-02**: Cohort definitions persist in browser `localStorage` under a versioned key (pattern: `quality.cohorts.v1`); saved cohorts are reusable across sessions
- [ ] **CHRT-03**: Dashboard quality analyses (all 7 panels) can be scoped to a saved cohort, composing with the existing resource-type filter (both apply intersectively)
- [ ] **CHRT-04**: The existing "Cohort" label on the `CohortSelector` resource-type multi-select is renamed to "Resource types"; the two controls render as visually distinct UI elements and compose orthogonally

### Programmatic Cohort Definition (Phase 22)

- [ ] **CHRT-05**: User can define a cohort by writing a FHIRPath query expression (e.g., `Patient.where(birthDate < @1960-01-01)`); expression is validated before save
- [ ] **CHRT-06**: User can import and export cohort definitions in MII FDPG JSON format for interoperability with other MII tooling (FDPG = Forschungsdatenportal für Gesundheit, the MII federated data portal's cohort definition format)
- [ ] **CHRT-07**: User can edit, duplicate, and delete saved cohorts from a management view; changes propagate to the cohort storage and any scoped analyses pick up the new definition on next run

## Future Requirements (v2+)

None currently deferred.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Federated cohort queries (server-side CQL execution) | v1.3 is client-side cohort definition only; server-side evaluation would require Blaze/CQL integration (separate milestone) |
| Phenotype-style multi-criteria builder | Interactive builder scope is date range + condition + reference list; complex boolean phenotypes are deferred |
| Sharing cohorts between users on the same machine | Local-tool scope; browser-scoped cohorts only |
| Cohort versioning / audit history | Simple create/edit/delete; no change history in v1.3 |
| Live cohort updates (auto-refresh as server data changes) | Cohort is a snapshot at definition time; analysis reruns on user trigger |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHRT-01 | Phase 21 | Pending |
| CHRT-02 | Phase 21 | Pending |
| CHRT-03 | Phase 21 | Pending |
| CHRT-04 | Phase 21 | Pending |
| CHRT-05 | Phase 22 | Pending |
| CHRT-06 | Phase 22 | Pending |
| CHRT-07 | Phase 22 | Pending |

**Coverage:**
- v1.3 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

## Source Todos (roadmapped in)

These pending todos were promoted into v1.3 scope on 2026-04-14:

- `.planning/todos/completed/2026-04-13-add-cohort-selection-for-scoped-data-quality-analysis.md` -- absorbed by CHRT-01, CHRT-02, CHRT-03 (Phase 21)
- `.planning/todos/completed/2026-04-13-define-cohorts-via-fhirpath-query-or-mii-fdpg-format.md` -- absorbed by CHRT-05, CHRT-06, CHRT-07 (Phase 22)
- `.planning/todos/completed/2026-04-14-cohort-selector-ui-mismatch-rename-or-replace.md` -- rename handled by CHRT-04 (Phase 21); long-term "real cohort" part absorbed by all of Phase 21 + 22

---
*Requirements defined: 2026-04-14*
*Promoted from todos by: /gsd-next cohort-roadmap workflow*
