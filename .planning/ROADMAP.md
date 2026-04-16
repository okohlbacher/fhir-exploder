# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- 🚧 **v1.3 -- Cohort Definition & Storage** -- Phases 21-22

## Deferred Items

None currently deferred.

---

## Phases

<details>
<summary>✅ v1.2 Tech Debt & Quality Monitoring (Phases 14-20) — SHIPPED 2026-04-15</summary>

- [x] Phase 14: Tech Debt Cleanup (2/2 plans) — completed 2026-04-13
- [x] Phase 15: Quality Check Engine & Drill-Down (3/3 plans) — completed 2026-04-13
- [x] Phase 16: Conformance & Plausibility Checks (4/4 plans) — completed 2026-04-14
- [x] Phase 17: Duplicate Detection & Relational Integrity (3/3 plans) — completed 2026-04-14
- [x] Phase 18: Quality Alerting & Thresholds (4/4 plans) — completed 2026-04-14
- [x] Phase 19: Quality Trends & PDF Reports (3/3 plans) — completed 2026-04-14
- [x] Phase 20: v1.2 Milestone Gap Closure (3/3 plans) — completed 2026-04-14

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

### 🚧 v1.3 -- Cohort Definition & Storage (Upcoming)

**Milestone Goal:** Enable scoped quality analysis by defining, persisting, and reusing patient/encounter cohorts -- both via interactive UI (date range, condition, reference list) and via programmatic FHIRPath queries + MII FDPG import/export. Resolves the long-standing UX mismatch where the existing "Cohort" control actually filters by resource type.

**Requirements file:** [REQUIREMENTS.md](REQUIREMENTS.md)

## Phases (v1.3)

- [x] **Phase 21: Interactive Cohort Builder + Rename** -- Ship the interactive cohort builder UI with localStorage persistence; rename the existing "Cohort" control to "Resource types" so both controls coexist clearly (completed 2026-04-16)
- [ ] **Phase 22: Programmatic Cohort Definition (FHIRPath + FDPG)** -- Extend cohort system with FHIRPath query definitions and MII FDPG JSON import/export

## Phase Details (v1.3)

### Phase 21: Interactive Cohort Builder + Rename
**Goal**: Users can define a patient/encounter cohort via interactive UI (date range, condition code, reference list), persist it across sessions, and scope quality analyses to that cohort -- with the "Cohort" / "Resource types" UX mismatch resolved
**Depends on**: Phase 20 (v1.2 shipped) -- no hard code dependency, but milestone ordering
**Requirements**: CHRT-01, CHRT-02, CHRT-03, CHRT-04
**Success Criteria** (what must be TRUE):
  1. User can define a patient cohort through an interactive builder with at minimum: date range filter, condition code filter, and explicit reference-list inclusion
  2. Cohort definitions persist in browser `localStorage` and are reusable across sessions
  3. Dashboard quality analyses can be scoped to a saved cohort (composing with the existing resource-type filter)
  4. The existing "Cohort" label on the resource-type multi-select is renamed to "Resource types"; the two controls are visually distinct and compose orthogonally
**Plans**: TBD
**UI hint**: yes

### Phase 22: Programmatic Cohort Definition (FHIRPath + FDPG)
**Goal**: Users can define cohorts programmatically via FHIRPath query expressions, import/export cohort definitions in MII FDPG JSON format, and manage (edit, duplicate, delete) their saved cohorts
**Depends on**: Phase 21
**Requirements**: CHRT-05, CHRT-06, CHRT-07
**Success Criteria** (what must be TRUE):
  1. User can define a cohort by writing a FHIRPath query expression (validated before save)
  2. User can import and export cohort definitions in MII FDPG JSON format for interop with other MII tooling
  3. User can edit, duplicate, and delete saved cohorts from a management view
  4. FHIRPath cohorts and interactive-builder cohorts share the same storage + scoping contract established in Phase 21
**Plans**: 3 plans
- [ ] 22-01-PLAN.md — FHIRPath translator + FhirpathCriterion union extension + resolver branch (backend, CHRT-05)
- [ ] 22-02-PLAN.md — FDPG v3 types + codec + useCohorts update/delete/duplicate CRUD (CHRT-06, CHRT-07)
- [ ] 22-03-PLAN.md — UI wiring: FhirpathCriterionCard, CohortBuilderForm edit mode, Edit/Delete modals, CohortsPage Import/Export/row-menu (CHRT-05, CHRT-06, CHRT-07)
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21. Interactive Cohort Builder + Rename | v1.3 | 6/6 | Complete   | 2026-04-16 |
| 22. Programmatic Cohort Definition (FHIRPath + FDPG) | v1.3 | 0/3 | Planned | - |
