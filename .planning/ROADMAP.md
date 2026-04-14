# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- 🚧 **v1.2 -- Tech Debt & Quality Monitoring** -- Phases 14-20
- 🔜 **v1.3 -- Cohort Definition & Storage** -- Phases 21-22 . [Requirements](milestones/v1.3-REQUIREMENTS.md)

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
- [x] **Phase 18: Quality Alerting & Thresholds** - Let users configure quality thresholds and visually flag breaches on the dashboard (completed 2026-04-14)
- [x] **Phase 19: Quality Trends & PDF Reports** - Track quality metrics over time and generate downloadable PDF reports (completed 2026-04-14)
- [x] **Phase 20: v1.2 Milestone Gap Closure** - Close all gaps from v1.2-MILESTONE-AUDIT: fix DEBT-02 build regression, write retrospective verifications for Phase 15/18, sync REQUIREMENTS.md traceability (completed 2026-04-14)

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
**Plans:** 4/4 plans complete
Plans:
- [x] 18-01-PLAN.md -- Threshold storage module + useThresholds hook (DQ-11 core)
- [x] 18-02-PLAN.md -- QualityMetricsContext extension + 5 panel rollups (DQ-12 data layer)
- [x] 18-03-PLAN.md -- SummaryCard breach props + /quality/thresholds configuration page (DQ-11 UI + DQ-12 primitive)
- [x] 18-04-PLAN.md -- OverviewStrip 9-tile expansion + ?tab= deep-linking (DQ-12 integration)
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
**Plans**: 3 plans
  - [x] 19-01-PLAN.md — Trends foundation: install @mantine/charts 8.3.18 + jspdf 4.2.1, create trendsHistory.ts pure-data module (snapshot capture, localStorage persistence, cross-server filter, breach computation, PDF filename utility) with full vitest coverage
  - [x] 19-02-PLAN.md — Trends UI: useTrendsHistory hook with hydration gate + QuotaExceeded handling, TrendMiniChart + TrendOverlayChart Recharts components with per-snapshot breach coloring, TrendsPanel container (9th Quality tab) with overlay mode + cross-server filter + Clear history
  - [x] 19-03-PLAN.md — PDF export + human UAT: PdfReportLayout off-screen portal, pdfExport.ts orchestration (document.fonts.ready + 2× rAF + html-to-image + jsPDF multi-page), /quality toolbar wiring (Capture + Export buttons), human UAT script covering 5 scenarios including breach-coloring provenance (D-11)
**UI hint**: yes

### Phase 20: v1.2 Milestone Gap Closure
**Goal**: Close all gaps identified by `/gsd-audit-milestone v1.2` so the milestone can ship cleanly
**Depends on**: Phase 19
**Requirements**: DEBT-02, DQ-01, DQ-02, DQ-11, DQ-12
**Gap Closure**: Closes gaps from `.planning/v1.2-MILESTONE-AUDIT.md` (2026-04-14) — 1 unsatisfied (DEBT-02 + Flow D), 4 partial (verification artifacts missing for Phase 15 and Phase 18), plus REQUIREMENTS.md traceability drift
**Success Criteria** (what must be TRUE):
  1. `npx tsc -b --noEmit` and `npm run build` both exit 0 (closes DEBT-02 + Flow D "Clean Build")
  2. `.planning/phases/15-quality-check-engine-drill-down/15-VERIFICATION.md` exists with status `passed` (closes DQ-01, DQ-02 partial)
  3. `.planning/phases/18-quality-alerting-thresholds/18-VERIFICATION.md` exists with status `passed` (closes DQ-11, DQ-12 partial)
  4. REQUIREMENTS.md traceability table reflects reality: all 16 v1.2 requirements are `[x]` and marked `Complete`; coverage count updated
**Plans**: TBD (target 3 plans)
  - 20-01-PLAN — Fix 7 TS2352 sites in `profileConformanceChecker.ts` + `temporalPlausibilityWalker.ts` (single-cast → `as unknown as` double-cast); verify clean build
  - 20-02-PLAN — Write retrospective 15-VERIFICATION.md and 18-VERIFICATION.md against existing code + UAT + VALIDATION artifacts
  - 20-03-PLAN — Sync REQUIREMENTS.md traceability table and checkboxes
**UI hint**: no

---

### 🔜 v1.3 -- Cohort Definition & Storage (Upcoming)

**Milestone Goal:** Enable scoped quality analysis by defining, persisting, and reusing patient/encounter cohorts -- both via interactive UI (date range, condition, reference list) and via programmatic FHIRPath queries + MII FDPG import/export. Resolves the long-standing UX mismatch where the existing "Cohort" control actually filters by resource type.

**Requirements file:** [milestones/v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md)

## Phases (v1.3)

- [ ] **Phase 21: Interactive Cohort Builder + Rename** -- Ship the interactive cohort builder UI with localStorage persistence; rename the existing "Cohort" control to "Resource types" so both controls coexist clearly
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
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Tech Debt Cleanup | v1.2 | 2/2 | Complete    | 2026-04-13 |
| 15. Quality Check Engine & Drill-Down | v1.2 | 3/3 | Complete   | 2026-04-13 |
| 16. Conformance & Plausibility Checks | v1.2 | 4/4 | Complete    | 2026-04-14 |
| 17. Duplicate Detection & Relational Integrity | v1.2 | 3/3 | Complete    | 2026-04-14 |
| 18. Quality Alerting & Thresholds | v1.2 | 4/4 | Complete   | 2026-04-14 |
| 19. Quality Trends & PDF Reports | v1.2 | 3/3 | Complete    | 2026-04-14 |
| 20. v1.2 Milestone Gap Closure | v1.2 | 3/3 | Complete    | 2026-04-14 |
| 21. Interactive Cohort Builder + Rename | v1.3 | 0/0 | Not started | - |
| 22. Programmatic Cohort Definition (FHIRPath + FDPG) | v1.3 | 0/0 | Not started | - |
