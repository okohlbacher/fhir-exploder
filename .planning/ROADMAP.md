# Roadmap: FHIR Exploder

## Overview

FHIR Exploder delivers a local-first React application for exploring Blaze FHIR server data in five phases: establish connectivity and validate the Medplum-on-Blaze architecture, build generic resource browsing with search and display modes, add patient-centric views with MII Kerndatensatz navigation, integrate terminology resolution for human-readable codes, and cap it with a data quality dashboard. Each phase delivers a complete, usable capability that builds on the previous one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Blaze Connectivity** - App shell, settings management, Blaze connection, Medplum compatibility validation
- [ ] **Phase 2: Resource Explorer** - Browse, search, paginate, and inspect any FHIR resource type with three display modes
- [ ] **Phase 3: Patient-Centric Browsing & MII Modules** - Patient list, clinical detail views, MII Kerndatensatz module navigation
- [ ] **Phase 4: Terminology Resolution** - Resolve CodeableConcept display values via MII Terminology Server with caching and fallback
- [ ] **Phase 5: Data Quality Dashboard** - Resource counts, field completeness, coding coverage, and profile validation

## Phase Details

### Phase 1: Foundation & Blaze Connectivity
**Goal**: Users can connect to a Blaze FHIR server and see that it works -- the app loads, reads settings, connects, discovers server capabilities, and handles errors gracefully
**Depends on**: Nothing (first phase)
**Requirements**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05
**Success Criteria** (what must be TRUE):
  1. User can edit settings.yaml to configure server URL, auth mode, and credentials, and the app uses that configuration on startup
  2. App connects to Blaze and displays the list of supported resource types discovered from the CapabilityStatement
  3. App shows a clear, actionable error message when the FHIR server is unreachable or returns an error
  4. App shows loading indicators while FHIR requests are in flight
  5. A Medplum React component can successfully render a FHIR resource fetched from Blaze (compatibility gate)
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md -- Scaffold Vite project, install dependencies, create test infrastructure (Wave 0), config types/settings loader/theme, app shell with sidebar and routing
- [x] 01-02-PLAN.md -- FHIR client factory, connection flow, error handling, settings page, sidebar status
- [x] 01-03-PLAN.md -- CapabilityStatement parsing, resource type display with lazy-loaded counts, Medplum React compatibility gate, end-to-end verification
**UI hint**: yes

### Phase 2: Resource Explorer
**Goal**: Users can browse any resource type on the server -- searching, paginating, and viewing resources in multiple display modes with navigable cross-references
**Depends on**: Phase 1
**Requirements**: BRWS-01, BRWS-02, BRWS-03, BRWS-04, BRWS-05, BRWS-06, BRWS-07, BRWS-08
**Success Criteria** (what must be TRUE):
  1. User can see all resource types on the server with per-type counts and select one to browse
  2. User can search resources using FHIR search parameters that are auto-populated from the CapabilityStatement
  3. User can paginate through large result sets using Next/Previous navigation with configurable page size
  4. User can view any individual resource in three modes: human-readable (default), clinical+raw split, and developer/FHIR-structure JSON view
  5. User can click a Reference field on any resource and navigate directly to the referenced resource
**Plans:** 5 plans
Plans:
- [x] 02-01-PLAN.md -- Foundation hooks (useSearchState, useBreadcrumbTrail), curated-params utility, JsonSyntaxHighlight, ExplorerLayout with routing
- [x] 02-02-PLAN.md -- Search/browse UI: ResourceTypeSelector, SearchFilterPanel, SearchResultsPage with SearchControl, PaginationControls
- [x] 02-03-PLAN.md -- Resource detail view with three display modes (Human-readable, Clinical+Raw, Developer/JSON), reference navigation, breadcrumbs
- [x] 02-04-PLAN.md -- Gap closure: shared connection state via ConnectionContext (fixes explorer "Not connected" blocker)
- [x] 02-05-PLAN.md -- Gap closure: wire per-type resource counts into Explorer landing page (BRWS-01)
**UI hint**: yes

### Phase 3: Patient-Centric Browsing & MII Modules
**Goal**: Users can find patients and explore their clinical data organized by MII Kerndatensatz modules, with an optional MII lens alongside raw FHIR browsing
**Depends on**: Phase 2
**Requirements**: PTNT-01, PTNT-02, PTNT-03, PTNT-04, PTNT-05
**Success Criteria** (what must be TRUE):
  1. User can view a patient list and search by name, identifier, or birthDate
  2. User can open a patient and see all their clinical data organized by category on a detail page
  3. User can navigate a patient's data using MII Kerndatensatz module tabs (Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent)
  4. User can view a chronological timeline of a patient's encounters, conditions, procedures, and observations
  5. User can toggle between MII Kerndatensatz module navigation and raw FHIR resource type browsing for a patient
**Plans**: TBD
**UI hint**: yes

### Phase 4: Terminology Resolution
**Goal**: CodeableConcept values throughout the app display human-readable terms (e.g., "Diabetes mellitus Typ 2" instead of "E11.9") resolved from the MII Terminology Server, with graceful degradation
**Depends on**: Phase 2
**Requirements**: TERM-01, TERM-02, TERM-03
**Success Criteria** (what must be TRUE):
  1. CodeableConcept fields across the app display resolved display values from the MII Terminology Server instead of raw codes
  2. Previously resolved terminology values load instantly from cache without additional server requests
  3. When the terminology server is unavailable or a code cannot be resolved, the app displays the raw code value without errors or broken UI
**Plans:** 5 plans (4 waves)
Plans:
- [x] 04-01-PLAN.md (Wave 1) -- Terminology settings + second MedplumClient factory + health probe + shared test fixture + types.ts
- [ ] 04-02-PLAN.md (Wave 2, depends on 01) -- Bounded-LRU TerminologyCache (10K memory / 2K localStorage) + server-URL-namespaced keys
- [ ] 04-03-PLAN.md (Wave 3, depends on 01+02) -- TerminologyResolver ($lookup + in-flight dedup + silent fallback) + TerminologyContext/useTerminology
- [ ] 04-04-PLAN.md (Wave 4, depends on 03) -- useResolvedResource hook + wire into HumanReadableView/ClinicalRawView + mount TerminologyProvider in App
- [ ] 04-05-PLAN.md (Wave 4, depends on 03) -- Sidebar two-row status block + Settings "Terminology Server" section with Clear cache button + V-15 UI test

### Phase 5: Data Quality Dashboard
**Goal**: Users can audit the data on their FHIR server -- seeing resource counts, field completeness, coding quality, and profile conformance issues at a glance
**Depends on**: Phase 2
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. User can view a dashboard showing resource counts per type across the entire server
  2. User can see field completeness statistics (percentage of populated fields) for each resource type
  3. User can see coding coverage metrics showing the percentage of CodeableConcepts with proper system+code vs text-only
  4. User can validate individual resources or batches against MII Kerndatensatz profiles and see a list of conformance issues
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
(Phases 4 and 5 both depend on Phase 2 but not on each other; sequential execution is the default.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Blaze Connectivity | 3/3 | Complete | 2026-04-11 |
| 2. Resource Explorer | 4/5 | Gap closure | - |
| 3. Patient-Centric Browsing & MII Modules | 0/0 | Not started | - |
| 4. Terminology Resolution | 0/0 | Not started | - |
| 5. Data Quality Dashboard | 0/0 | Not started | - |
