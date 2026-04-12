# Requirements: FHIR Exploder

**Defined:** 2026-04-11
**Core Value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable without requiring deep FHIR expertise.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Connection & Configuration

- [ ] **CONN-01**: User can configure FHIR server URL, auth mode (open/basic/bearer), and credentials in a settings.yaml file
- [ ] **CONN-02**: App reads settings.yaml at startup and connects to the configured FHIR server
- [ ] **CONN-03**: App fetches and parses the server's CapabilityStatement to discover supported resource types, search parameters, and operations
- [ ] **CONN-04**: App displays clear error messages when the FHIR server is unreachable or returns errors
- [ ] **CONN-05**: App shows loading indicators during FHIR server requests

### Resource Browsing

- [x] **BRWS-01**: User can see a list of all resource types available on the server with counts per type
- [x] **BRWS-02**: User can search resources by FHIR search parameters auto-generated from the CapabilityStatement
- [x] **BRWS-03**: User can paginate through search results using Bundle next/prev links with configurable _count
- [x] **BRWS-04**: User can view an individual resource as pretty-printed JSON with syntax highlighting
- [x] **BRWS-05**: User can view an individual resource in a human-readable rendered form (via Medplum components)
- [x] **BRWS-06**: User can toggle between three display modes: human-readable (default), clinical+raw, and developer/FHIR-structure view
- [x] **BRWS-07**: User can click Reference fields to navigate to the referenced resource
- [x] **BRWS-08**: User can use _include/_revinclude to fetch related resources in a single query

### Patient-Centric Browsing

- [x] **PTNT-01**: User can view a list of patients with search by name, identifier, and birthDate
- [x] **PTNT-02**: User can view a patient detail page showing all clinical data organized by category
- [x] **PTNT-03**: User can navigate a patient's clinical data using MII Kerndatensatz module tabs (Diagnose/Condition, Prozedur/Procedure, Laborbefund/Observation, Medikation/MedicationStatement, Fall/Encounter, Consent)
- [ ] **PTNT-04**: User can view a chronological clinical timeline of a patient's encounters, conditions, procedures, and observations
- [x] **PTNT-05**: MII Kerndatensatz modules are available as an optional navigation lens alongside raw FHIR resource type browsing

### Terminology

- [ ] **TERM-01**: App resolves CodeableConcept display values by querying the MII Terminology Server ($lookup, $translate)
- [ ] **TERM-02**: Resolved terminology display values are cached to avoid redundant server requests
- [ ] **TERM-03**: App falls back gracefully to raw code values when the terminology server is unavailable or a code cannot be resolved

### Data Quality

- [ ] **QUAL-01**: User can view a dashboard showing resource counts per type across the server
- [ ] **QUAL-02**: User can view field completeness statistics (percentage of populated fields) per resource type
- [ ] **QUAL-03**: User can view coding coverage metrics (percentage of CodeableConcepts with system+code vs text-only)
- [ ] **QUAL-04**: User can validate individual resources or batches against MII Kerndatensatz StructureDefinition profiles and see conformance issues

## v2 Requirements

### Enhanced Browsing

- **BRWS-09**: User can bookmark searches and share search URLs
- **BRWS-10**: User can export search results as CSV or NDJSON

### Enhanced Quality

- **QUAL-05**: User can view trend analysis of data quality metrics over time
- **QUAL-06**: User can generate a data quality report as PDF

## Out of Scope

| Feature | Reason |
|---------|--------|
| Write operations (create/update/delete) | Read-only explorer by design; use Postman or FHIR Tester for writes |
| SMART on FHIR launch / OAuth2 flow | Local tool against local Blaze; simple auth covers all use cases |
| Multi-server simultaneous browsing | Complexity multiplier for unclear value; one connection at a time |
| Full conformance test suite | Inferno exists for this; we offer per-resource validation only |
| IG authoring / profile editing | Simplifier and FSH/SUSHI exist for this |
| Data export / ETL pipeline | Different tool category; focus is exploration |
| Custom query language / GraphQL | FHIR search parameters are sufficient for exploration |
| User accounts / multi-user auth | Local-only tool; no login needed |
| Mobile-responsive design | Desktop-only tool; optimize for 1200px+ screens |
| Internationalization (i18n) | English UI; German clinical terms come from terminology server |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONN-01 | Phase 1 | Pending |
| CONN-02 | Phase 1 | Pending |
| CONN-03 | Phase 1 | Pending |
| CONN-04 | Phase 1 | Pending |
| CONN-05 | Phase 1 | Pending |
| BRWS-01 | Phase 2 | Complete |
| BRWS-02 | Phase 2 | Complete |
| BRWS-03 | Phase 2 | Complete |
| BRWS-04 | Phase 2 | Complete |
| BRWS-05 | Phase 2 | Complete |
| BRWS-06 | Phase 2 | Complete |
| BRWS-07 | Phase 2 | Complete |
| BRWS-08 | Phase 2 | Complete |
| PTNT-01 | Phase 3 | Complete |
| PTNT-02 | Phase 3 | Complete |
| PTNT-03 | Phase 3 | Complete |
| PTNT-04 | Phase 3 | Pending |
| PTNT-05 | Phase 3 | Complete |
| TERM-01 | Phase 4 | Pending |
| TERM-02 | Phase 4 | Pending |
| TERM-03 | Phase 4 | Pending |
| QUAL-01 | Phase 5 | Pending |
| QUAL-02 | Phase 5 | Pending |
| QUAL-03 | Phase 5 | Pending |
| QUAL-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after roadmap creation*
