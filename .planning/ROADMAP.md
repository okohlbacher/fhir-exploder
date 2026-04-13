# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 — MVP (shipped 2026-04-12)** — [Archive](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 — UX Polish & Data Export (shipped 2026-04-12)** — [Archive](milestones/v1.1-ROADMAP.md) · [Requirements](milestones/v1.1-REQUIREMENTS.md)
- 🚧 **v1.2 — Tech Debt & Quality Trends** — Phases 14-15

## Deferred Items

None currently deferred.

---

### 🚧 v1.2 — Tech Debt & Quality Trends (In Progress)

**Milestone Goal:** Resolve all accumulated tech debt and TypeScript build errors, then add quality metric trends and PDF report generation to the data quality dashboard.

## Phases

- [ ] **Phase 14: Tech Debt Cleanup** - Resolve code review findings and TypeScript build errors for a clean, warning-free codebase
- [ ] **Phase 15: Quality Trends & PDF Reports** - Add trend visualization and downloadable PDF reports to the data quality dashboard

## Phase Details

### Phase 14: Tech Debt Cleanup
**Goal**: Codebase compiles cleanly with zero TypeScript errors and all deferred code review findings resolved
**Depends on**: Phase 13 (v1.1 complete)
**Requirements**: DEBT-01, DEBT-02
**Success Criteria** (what must be TRUE):
  1. All 17 info-level code review findings from v1.0 phases 4+5 are addressed (each fix verifiable in the diff)
  2. `npm run build` (tsc -b) completes with zero errors and zero warnings
  3. `npm run dev` starts without TypeScript or runtime errors in the browser console
**Plans**: TBD

### Phase 15: Quality Trends & PDF Reports
**Goal**: Users can track how data quality changes over time and export quality reports as PDF
**Depends on**: Phase 14
**Requirements**: QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. User can view a chart showing how quality metrics (completeness, coding coverage) change across multiple measurement points
  2. User can trigger a new measurement snapshot that gets added to the trend history
  3. User can generate a PDF report reflecting the current quality dashboard state
  4. User can download the generated PDF to their local machine
  5. Trend data persists in browser storage so it survives page reloads
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Tech Debt Cleanup | v1.2 | 0/0 | Not started | - |
| 15. Quality Trends & PDF Reports | v1.2 | 0/0 | Not started | - |
