# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- 🚧 **v1.2 -- Tech Debt & Quality Monitoring** -- Phases 14-19

## Deferred Items

None currently deferred.

---

### 🚧 v1.2 -- Tech Debt & Quality Monitoring (In Progress)

**Milestone Goal:** Resolve all accumulated tech debt, then build comprehensive data quality monitoring with drill-down, conformance/plausibility checks, duplicate detection, relational integrity, alerting, trend visualization, and PDF reporting.

## Phases

- [x] **Phase 14: Tech Debt Cleanup** - Resolve code review findings and TypeScript build errors for a clean, warning-free codebase (completed 2026-04-13)
- [x] **Phase 15: Quality Check Engine & Drill-Down** - Build the foundational drill-down UI so users can click any quality metric and see the specific resources causing issues (completed 2026-04-13)
- [x] **Phase 16: Conformance & Plausibility Checks** - Add value set conformance, cardinality validation, temporal plausibility, and lab range checks (completed 2026-04-14)
- [x] **Phase 17: Duplicate Detection & Relational Integrity** - Detect duplicate patients and resources, find broken references and orphan resources (gap closure in progress) (completed 2026-04-14)
- [ ] **Phase 18: Quality Alerting & Thresholds** - Let users configure quality thresholds and visually flag breaches on the dashboard
- [ ] **Phase 19: Quality Trends & PDF Reports** - Track quality metrics over time and generate downloadable PDF reports

## Phase Details

### Phase 14: Tech Debt Cleanup
**Goal**: Codebase compiles cleanly with zero TypeScript errors and all deferred code review findings resolved
**Depends on**: Phase 13 (v1.1 complete)
**Requirements**: DEBT-01, DEBT-02
**Success Criteria** (what must be TRUE):
  1. All 17 info-level code review findings from v1.0 phases 4+5 are addressed (each fix verifiable in the diff)
  2. `npm run build` (tsc -b) completes with zero errors and zero warnings
  3. `npm run dev` starts without TypeScript or runtime errors in the browser console
**Plans:** 2/2 plans complete
Plans:
- [x] 14-01-PLAN.md -- Eliminate all 54 TypeScript build errors (install @testing-library/dom, create fhir-helpers utility, migrate casts)
- [x] 14-02-PLAN.md -- Address all 17 info-level code review findings from phases 4+5

### Phase 15: Quality Check Engine & Drill-Down
**Goal**: Users can click any quality metric on the dashboard and see exactly which resources and fields are causing that issue
**Depends on**: Phase 14
**Requirements**: DQ-01, DQ-02
**Success Criteria** (what must be TRUE):
  1. User can click a quality metric (completeness, coding coverage, validation) to open a drill-down view listing the specific resources and fields involved
  2. Each entry in the drill-down view links to the resource detail view for further inspection
  3. Drill-down works for all existing quality panels (completeness, coding coverage, profile validation)
**Plans:** 3/3 plans complete
Plans:
- [x] 15-01-PLAN.md -- Add NormalizedIssue type and extend completeness/coding walkers to return per-resource issue data
- [x] 15-02-PLAN.md -- Build shared ResourceIssueTable component with pagination, filters, severity badges, and resource links
- [x] 15-03-PLAN.md -- Wire ResourceIssueTable into all 3 drill-down pages with Tabs and cross-filtering
**UI hint**: yes

### Phase 16: Conformance & Plausibility Checks
**Goal**: Dashboard detects and reports value set violations, cardinality errors, implausible dates, and out-of-range lab values
**Depends on**: Phase 15
**Requirements**: DQ-03, DQ-04, DQ-05, DQ-06
**Success Criteria** (what must be TRUE):
  1. Dashboard flags coded values that do not belong to the expected value set for their field
  2. Dashboard flags resources missing required fields or containing unexpected repeated values per resource type
  3. Dashboard flags implausible temporal values (future dates, encounter end before start, negative age)
  4. Dashboard flags lab observations with values outside configurable reference ranges
  5. All conformance and plausibility findings are accessible via the Phase 15 drill-down (clickable to resource detail)
**Plans:** 4/4 plans complete
Plans:
- [x] 16-01-PLAN.md -- Profile conformance checker + value set cache (enrich profiles, DQ-03/DQ-04 engine)
- [x] 16-02-PLAN.md -- Temporal plausibility walker (auto-discover temporal fields, 4 check types, DQ-05 engine)
- [x] 16-03-PLAN.md -- Lab range checker + settings extension (reference range validation, DQ-06 engine)
- [x] 16-04-PLAN.md -- Wire all checkers into dashboard UI (6 tabs, panels, drill-downs, cohort selector)
**UI hint**: yes

### Phase 17: Duplicate Detection & Relational Integrity
**Goal**: Dashboard surfaces potential duplicate records and broken/orphan references across the FHIR dataset
**Depends on**: Phase 15
**Requirements**: DQ-07, DQ-08, DQ-09, DQ-10
**Success Criteria** (what must be TRUE):
  1. Dashboard identifies potential duplicate patients by matching on name + date of birth
  2. Dashboard identifies potential duplicate resources by detecting same content hash with different IDs
  3. Dashboard reports broken references (dangling pointers to non-existent resources)
  4. Dashboard reports orphan resources (resources that should reference a parent but have no such reference)
  5. All duplicate and integrity findings are accessible via the Phase 15 drill-down (clickable to resource detail)
**Plans:** 3/3 plans complete
Plans:
- [x] 17-01-PLAN.md -- Engine layer: pure functions for duplicate detection + reference integrity, orchestrating hooks, unit tests
- [x] 17-02-PLAN.md -- UI layer: DuplicatesPanel, ReferencesPanel, drill-down pages, dashboard wiring (8 tabs)
- [x] 17-03-PLAN.md -- Gap closure: fix DuplicatesPanel c.members field mismatch (CR-01 / SC-1 / SC-2) + regression test
**UI hint**: yes

### Phase 18: Quality Alerting & Thresholds
**Goal**: Users can set quality thresholds and the dashboard visually flags any metrics that breach them
**Depends on**: Phase 16, Phase 17
**Requirements**: DQ-11, DQ-12
**Success Criteria** (what must be TRUE):
  1. User can configure a quality threshold per metric (e.g., "alert if completeness < 80%")
  2. Threshold configuration persists across page reloads (browser storage)
  3. Dashboard visually highlights metrics that breach their configured threshold (distinct color/icon)
  4. Alerting covers both existing metrics (completeness, coding) and new metrics (conformance, plausibility, duplicates, integrity)
**Plans**: TBD
**UI hint**: yes

### Phase 19: Quality Trends & PDF Reports
**Goal**: Users can track how data quality changes over time and export quality reports as PDF
**Depends on**: Phase 18
**Requirements**: QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. User can view a chart showing how quality metrics change across multiple measurement points
  2. User can trigger a new measurement snapshot that gets added to the trend history
  3. Trend data persists in browser storage so it survives page reloads
  4. User can generate and download a PDF quality report reflecting the current dashboard state
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Tech Debt Cleanup | v1.2 | 2/2 | Complete    | 2026-04-13 |
| 15. Quality Check Engine & Drill-Down | v1.2 | 3/3 | Complete   | 2026-04-13 |
| 16. Conformance & Plausibility Checks | v1.2 | 4/4 | Complete    | 2026-04-14 |
| 17. Duplicate Detection & Relational Integrity | v1.2 | 3/3 | Complete   | 2026-04-14 |
| 18. Quality Alerting & Thresholds | v1.2 | 0/0 | Not started | - |
| 19. Quality Trends & PDF Reports | v1.2 | 0/0 | Not started | - |
