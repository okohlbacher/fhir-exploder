# Requirements: FHIR Exploder v1.2 -- Tech Debt & Quality Monitoring

**Defined:** 2026-04-13
**Core Value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable without requiring deep FHIR expertise.

**Theoretical foundation:** Kahn et al. data quality framework (conformance, completeness, plausibility) as applied in Spengler (2021) "Improving Data Quality in Medical Research: A Monitoring Architecture for Clinical and Translational Data Warehouses."

## v1.2 Requirements

### Code Quality

- [x] **DEBT-01**: All 17 info-level code review findings from v1.0 phases 4+5 are resolved
- [x] **DEBT-02**: `npm run build` (tsc -b) completes with zero errors

### Quality Issue Drill-Down

- [x] **DQ-01**: User can click a quality metric on the dashboard to see the specific resources and fields causing that issue
- [x] **DQ-02**: Each drill-down entry links to the resource detail view for inspection

### Conformance Checks

- [x] **DQ-03**: Dashboard checks resources against expected value sets and flags non-conforming coded values
- [x] **DQ-04**: Dashboard checks cardinality rules (required fields present, no unexpected repeats) per resource type

### Plausibility Checks

- [x] **DQ-05**: Dashboard flags implausible temporal values (dates in the future, encounter end before start, negative age)
- [x] **DQ-06**: Dashboard flags lab observations with values outside configurable reference ranges

### Duplicate Detection

- [x] **DQ-07**: Dashboard detects potential duplicate patients by matching on name + date of birth
- [x] **DQ-08**: Dashboard detects potential duplicate resources (same content hash, different IDs)

### Relational Integrity

- [x] **DQ-09**: Dashboard checks for broken references (dangling pointers to non-existent resources)
- [x] **DQ-10**: Dashboard checks for orphan resources (resources that should reference a parent but don't)

### Quality Alerting

- [x] **DQ-11**: User can configure quality thresholds per metric (e.g., "alert if completeness < 80%")
- [x] **DQ-12**: Dashboard visually highlights metrics that breach configured thresholds

### Quality Trends

- [x] **QUAL-05**: User can view a chart showing how quality metrics (completeness, coding coverage) change across multiple measurement points
- [x] **QUAL-06**: User can generate and download a PDF quality report for the current dashboard state

## Future Requirements (v2+)

None currently deferred.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Write operations (create/update/delete) | Read-only explorer by design |
| SMART on FHIR launch / OAuth2 flow | Local-only tool against local Blaze |
| Multi-server simultaneous browsing | Complexity vs value |
| Mobile-responsive design | Desktop-only, optimize for 1200px+ |
| Internationalization (i18n) | English UI; German clinical terms via terminology server |
| ETL-integrated quality screening | FHIR Exploder is a browser, not an ETL tool -- quality checks run against loaded data |
| External quality event ingestion API | No external ETL pipelines feed into this tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 14 | Complete |
| DEBT-02 | Phase 14 → Phase 20 | Complete |
| DQ-01 | Phase 15 → Phase 20 | Complete |
| DQ-02 | Phase 15 → Phase 20 | Complete |
| DQ-03 | Phase 16 | Complete |
| DQ-04 | Phase 16 | Complete |
| DQ-05 | Phase 16 | Complete |
| DQ-06 | Phase 16 | Complete |
| DQ-07 | Phase 17 | Complete |
| DQ-08 | Phase 17 | Complete |
| DQ-09 | Phase 17 | Complete |
| DQ-10 | Phase 17 | Complete |
| DQ-11 | Phase 18 → Phase 20 | Complete |
| DQ-12 | Phase 18 → Phase 20 | Complete |
| QUAL-05 | Phase 19 | Complete |
| QUAL-06 | Phase 19 | Complete |

**Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0
- Satisfied: 16/16 (after Phase 20 gap closure — all checkboxes flipped 2026-04-14)
- Gap closure reassignments (2026-04-14, from v1.2-MILESTONE-AUDIT): DEBT-02, DQ-01, DQ-02, DQ-11, DQ-12 → Phase 20

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-14 -- Phase 20 gap closure complete: all 16 v1.2 requirements satisfied (DEBT-02 fix + retrospective 15/18 VERIFICATION.md + traceability sync)*
