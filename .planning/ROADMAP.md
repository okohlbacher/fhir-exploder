# Roadmap: FHIR Exploder

## Overview

FHIR Exploder delivers a local-first React application for exploring Blaze FHIR server data in five phases: establish connectivity and validate the Medplum-on-Blaze architecture, build generic resource browsing with search and display modes, add patient-centric views with MII Kerndatensatz navigation, integrate terminology resolution for human-readable codes, and cap it with a data quality dashboard. Each phase delivers a complete, usable capability that builds on the previous one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Blaze Connectivity** - App shell, settings management, Blaze connection, Medplum compatibility validation
- [x] **Phase 2: Resource Explorer** - Browse, search, paginate, and inspect any FHIR resource type with three display modes
- [x] **Phase 3: Patient-Centric Browsing & MII Modules** - Patient list, clinical detail views, MII Kerndatensatz module navigation
- [x] **Phase 4: Terminology Resolution** - Resolve CodeableConcept display values via MII Terminology Server with caching and fallback
- [x] **Phase 5: Data Quality Dashboard** - Resource counts, field completeness, coding coverage, and profile validation
- [x] **Phase 6: v1.0 Gap Closure — Patient-aware Reference Navigation** - Fix MC-1/BF-1: ResourceDetailPage honors patient subtree basePath; reconcile REQUIREMENTS.md CONN checkboxes
- [x] **Phase 7: v1.0 Gap Closure — Code Review Fixes** - Applied 15 findings (3 critical + 12 warning) across Phases 4+5 via /gsd-code-review-fix
- [x] **Phase 8: v1.0 Gap Closure — Retroactive Nyquist Compliance** - All 5 VALIDATION.md files flipped to nyquist_compliant: true

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
- [x] 04-02-PLAN.md (Wave 2, depends on 01) -- Bounded-LRU TerminologyCache (10K memory / 2K localStorage) + server-URL-namespaced keys
- [x] 04-03-PLAN.md (Wave 3, depends on 01+02) -- TerminologyResolver ($lookup + in-flight dedup + silent fallback) + TerminologyContext/useTerminology
- [x] 04-04-PLAN.md (Wave 4, depends on 03) -- useResolvedResource hook + wire into HumanReadableView/ClinicalRawView + mount TerminologyProvider in App
- [x] 04-05-PLAN.md (Wave 4, depends on 03) -- Sidebar two-row status block + Settings "Terminology Server" section with Clear cache button + V-15 UI test

### Phase 5: Data Quality Dashboard
**Goal**: Users can audit the data on their FHIR server -- seeing resource counts, field completeness, coding quality, and profile conformance issues at a glance
**Depends on**: Phase 2
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. User can view a dashboard showing resource counts per type across the entire server
  2. User can see field completeness statistics (percentage of populated fields) for each resource type
  3. User can see coding coverage metrics showing the percentage of CodeableConcepts with proper system+code vs text-only
  4. User can validate individual resources or batches against MII Kerndatensatz profiles and see a list of conformance issues
**Plans:** 5 plans (3 waves)
Plans:
- [x] 05-01-PLAN.md (Wave 1) -- Foundation: quality contracts + metrics cache + sampling helper + Quality route shell + QualityLayout + sample-size control + settings.validation block + SettingsPage validation section + Clear metrics cache + 10 Wave-0 test scaffolds with fixtures
- [x] 05-02-PLAN.md (Wave 2, depends on 01) -- QUAL-01: counts aggregation + useQualityMetrics orchestrator + QualityOverviewPage shell with 4-card summary strip + 4-tab layout + sortable ResourceCountsPanel with inline Progress bars
- [x] 05-03-PLAN.md (Wave 2, depends on 01) -- QUAL-02: 7 bundled MII StructureDefinitions + completenessWalker (requiredElementPaths + isPathPopulated with Pitfall 3 value[x] handling) + useCompletenessReport hook + CompletenessPanel + CompletenessDrillDown
- [x] 05-04-PLAN.md (Wave 2, depends on 01) -- QUAL-03: classifyCodedFields sibling walker (Pitfall 5 Identifier exclusion) + aggregateCoverage + useCodingCoverage hook + CodingCoveragePanel with 3-bucket stacked Progress bars + CodingDrillDown with CodeableConceptDisplay examples
- [x] 05-05-PLAN.md (Wave 3, depends on 01+03) -- QUAL-04: structuralValidator (reuses Plan 03 walker) + remoteValidator (independent MedplumClient, never posts to Blaze) + resolveBackends + useValidationRun batch runner + ValidationPanel with Blaze $validate warning banner + ValidationIssueList + JSON report export
**UI hint**: yes

### Phase 6: v1.0 Gap Closure — Patient-aware Reference Navigation
**Goal**: Reference navigation stays in the patient subtree when the user is on a patient-scoped resource detail page — closes BF-1 so BRWS-07, PTNT-04, and PTNT-05 are fully satisfied
**Depends on**: Phase 2, Phase 3
**Requirements**: BRWS-07, PTNT-04, PTNT-05 (upgrade from partial → satisfied); housekeeping CONN-01..05 traceability reconciliation
**Gap Closure**: Closes MILESTONE-AUDIT.md integration MC-1 + flow BF-1
**Success Criteria** (what must be TRUE):
  1. Clicking a Reference field inside `/patients/:patientId/:type/:id` navigates to `/patients/:patientId/:type/:newId` (stays in patient subtree)
  2. "Back to results" button from patient-scoped detail navigates to the previous patient context, not `/explorer`
  3. `NavigationBreadcrumbs` root anchor honors the patient basePath when present
  4. REQUIREMENTS.md traceability table and checkboxes reconciled for all Phase 1 (CONN-01..05) shipments
**Plans:** 2 plans
Plans:
- [x] 06-01-PLAN.md — Make ResourceDetailPage + NavigationBreadcrumbs patient-aware; add integration tests (BRWS-07, PTNT-04, PTNT-05)
- [x] 06-02-PLAN.md — Reconcile REQUIREMENTS.md traceability: flip CONN-01..05 to Complete (CONN-01..05)
**UI hint**: no (bug fix in existing components)

### Phase 7: v1.0 Gap Closure — Code Review Fixes
**Goal**: All critical and warning-level findings from Phase 4 + Phase 5 code reviews are addressed so v1.0 ships without known regressions in production code paths
**Depends on**: Phase 4, Phase 5
**Requirements**: None (tech debt closure); upgrades existing TERM-* and QUAL-* implementations for robustness
**Gap Closure**: Closes tech_debt items in `.planning/v1.0-MILESTONE-AUDIT.md`
**Success Criteria** (what must be TRUE):
  1. Phase 4 REVIEW.md: CR-01 resolved (guarded URL parse); all 4 warnings resolved or explicitly accepted with rationale
  2. Phase 5 REVIEW.md: CR-01 resolved (PHI banner gates first-use of remote validation with explicit acknowledgment); CR-02 resolved (cancellation race fixed via local `cancelled` closure pattern)
  3. Phase 5 REVIEW.md: all 8 warnings resolved or explicitly accepted with rationale
  4. Full test suite remains green after fixes (274+ tests)
**Plans:** TBD
**UI hint**: partial (PHI banner UX change)

### Phase 8: v1.0 Gap Closure — Retroactive Nyquist Compliance
**Goal**: Every v1.0 phase has a signed-off VALIDATION.md that documents the Nyquist test strategy used during execution, bringing Nyquist compliance from 1/5 to 5/5 for archive rigor
**Depends on**: Phases 2, 3, 4, 5
**Requirements**: None (process hygiene)
**Gap Closure**: Closes nyquist.missing_phases and nyquist.partial_phases from MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. `.planning/phases/02-resource-explorer/02-VALIDATION.md` exists with `nyquist_compliant: true` and every Phase 2 task mapped in the verification table
  2. `.planning/phases/03-patient-centric-browsing-mii-modules/03-VALIDATION.md` exists with `nyquist_compliant: true`
  3. `.planning/phases/04-terminology-resolution/04-VALIDATION.md` exists with `nyquist_compliant: true`
  4. `.planning/phases/05-data-quality-dashboard/05-VALIDATION.md` frontmatter flipped to `nyquist_compliant: true` with sign-off checkboxes checked
**Plans:** TBD
**UI hint**: no (documentation only)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
Phases 6-8 are gap-closure phases added after the v1.0 milestone audit (2026-04-12).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Blaze Connectivity | 3/3 | Complete | 2026-04-11 |
| 2. Resource Explorer | 5/5 | Complete | 2026-04-12 |
| 3. Patient-Centric Browsing & MII Modules | 3/3 | Complete | 2026-04-12 |
| 4. Terminology Resolution | 5/5 | Complete | 2026-04-12 |
| 5. Data Quality Dashboard | 5/5 | Complete | 2026-04-12 |
| 6. v1.0 Gap Closure — Patient-aware Reference Navigation | 2/2 | Complete | 2026-04-12 |
| 7. v1.0 Gap Closure — Code Review Fixes | — | Complete (direct fix via /gsd-code-review-fix) | 2026-04-12 |
| 8. v1.0 Gap Closure — Retroactive Nyquist Compliance | — | Complete (docs-only) | 2026-04-12 |
