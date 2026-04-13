# Requirements: FHIR Exploder v1.2 — Tech Debt & Quality Trends

**Defined:** 2026-04-13
**Core Value:** Connect to a Blaze FHIR server and make its contents human-readable and navigable without requiring deep FHIR expertise.

## v1.2 Requirements

### Code Quality

- [ ] **DEBT-01**: All 17 info-level code review findings from v1.0 phases 4+5 are resolved
- [ ] **DEBT-02**: `npm run build` (tsc -b) completes with zero errors

### Data Quality Visualization

- [ ] **QUAL-05**: User can view quality metric trends over time (how completeness/coverage changes across measurement points)
- [ ] **QUAL-06**: User can generate and download a PDF quality report for the current dashboard state

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

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | TBD | Pending |
| DEBT-02 | TBD | Pending |
| QUAL-05 | TBD | Pending |
| QUAL-06 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 4 total
- Mapped to phases: 0
- Unmapped: 4

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after initial definition*
