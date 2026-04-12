# Roadmap: FHIR Exploder

## Overview

FHIR Exploder delivers a local-first React application for exploring Blaze FHIR server data. v1.0 shipped 2026-04-12. v1.1 focuses on UX polish, data export, patient timeline, and inline settings editing.

## Milestones

- ✅ **v1.0 — MVP (shipped 2026-04-12)** — [Archive](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md) · 25/25 requirements, 8 phases, 23 plans, 286 tests
- 🔨 **v1.1 — UX Polish & Data Export** — 9 requirements, 5 phases

## v1.1 Phases

- [x] **Phase 9: Inline Settings & Server Configuration** — Users can edit FHIR and terminology server settings from the sidebar without touching settings.yaml
- [ ] **Phase 10: Bookmarkable Search & URL State** — Search state persisted in URL params; bookmarks restore exact search results
- [ ] **Phase 11: Search Results Export** — Users can export current search results as CSV or NDJSON
- [ ] **Phase 12: Patient Timeline** — Horizontal event ribbon on patient overview showing clinical events chronologically
- [ ] **Phase 13: Charts & Code Quality** — Install @mantine/charts + recharts for quality dashboard visuals; resolve 17 info-level code review findings

## Phase Details

### Phase 9: Inline Settings & Server Configuration
**Goal**: Users can change FHIR and terminology server settings directly from the UI without editing settings.yaml or restarting the app
**Depends on**: v1.1-dev (Blaze compatibility baseline)
**Requirements**: CONF-01, CONF-02, CONF-03
**Success Criteria** (what must be TRUE):
  1. Clicking the FHIR server status indicator in the sidebar opens an inline editor for server URL and auth mode
  2. Clicking the terminology server status indicator opens an inline editor for the terminology server URL
  3. Saving settings triggers immediate reconnection — sidebar status dots update without page reload
  4. Settings persist in memory for the session (settings.yaml remains the source of truth on restart)
**Plans:** 2 plans
Plans:
- [ ] 09-01-PLAN.md — SettingsContext: writable settings provider + useSettings delegate (Wave 1)
- [ ] 09-02-PLAN.md — Modal components, Sidebar click triggers, App.tsx SettingsProvider wiring (Wave 2)
**UI hint**: yes

### Phase 10: Bookmarkable Search & URL State
**Goal**: Users can bookmark any search and return to the same results later by opening the URL
**Depends on**: Phase 9
**Requirements**: BRWS-09
**Success Criteria** (what must be TRUE):
  1. All active search filters are reflected in the browser URL query parameters
  2. Opening a bookmarked Explorer URL restores the resource type, filters, page size, and pagination state
  3. Opening a bookmarked Patient search URL restores name, identifier, and birthDate filters
  4. Browser back/forward buttons navigate between search states
**Plans:** TBD
**UI hint**: no (URL state logic, no new visual components)

### Phase 11: Search Results Export
**Goal**: Users can download the current search results as CSV or NDJSON for use in external tools
**Depends on**: Phase 10
**Requirements**: BRWS-10
**Success Criteria** (what must be TRUE):
  1. An "Export" button appears in the search results toolbar when results are loaded
  2. User can choose between CSV and NDJSON format
  3. CSV export includes column headers derived from resource field names
  4. NDJSON export contains one JSON resource per line
  5. Export includes all resources matching the current search (paginated fetch if needed, up to a configurable limit)
**Plans:** TBD
**UI hint**: yes (export button + format selector)

### Phase 12: Patient Timeline
**Goal**: Users can see a visual chronological timeline of a patient's clinical events on the patient overview page
**Depends on**: v1.1-dev (PatientRelatedResources component baseline)
**Requirements**: VIZ-02, VIZ-03
**Success Criteria** (what must be TRUE):
  1. Patient detail page shows a horizontal timeline ribbon of clinical events sorted by date
  2. Timeline fetches and groups Encounter, Condition, Procedure, Observation, MedicationStatement, and ImagingStudy resources for the patient
  3. Events on the same date are grouped into a single node with stacked resource-type icons
  4. Clicking a timeline event navigates to the resource detail page
  5. Timeline scrolls horizontally for patients with many events
**Plans:** TBD
**UI hint**: yes

### Phase 13: Charts & Code Quality
**Goal**: Quality dashboard uses proper charts instead of text-only bars, and all v1.0 info-level code review findings are resolved
**Depends on**: Phase 9
**Requirements**: VIZ-01, DEBT-01
**Success Criteria** (what must be TRUE):
  1. `@mantine/charts` and `recharts` are installed and integrated
  2. Resource counts panel shows a bar chart instead of inline badges
  3. Completeness panel shows a horizontal stacked bar or ring chart per resource type
  4. Coding coverage panel shows a stacked bar chart (coded/text-only/empty buckets)
  5. All 17 info-level findings from Phase 4 REVIEW.md (5) and Phase 5 REVIEW.md (12) are resolved or accepted with rationale
**Plans:** TBD
**UI hint**: yes

## Progress

Phase 9: ✅ Complete
Phase 10: ⬜ Not started
Phase 11: ⬜ Not started
Phase 12: ⬜ Not started
Phase 13: ⬜ Not started

## Historical Phases

v1.0 phases (1-8) archived to `milestones/v1.0-ROADMAP.md`.
