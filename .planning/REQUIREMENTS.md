# Requirements: FHIR Exploder v1.1 — UX Polish & Data Export

## v1.1 Requirements

### Search & Navigation

- [ ] **BRWS-09**: User can bookmark a search URL and return to the same search results by opening the bookmark
- [ ] **BRWS-10**: User can export the current search results as CSV or NDJSON file download

### Data Visualization

- [ ] **VIZ-01**: Quality dashboard panels use charts (bar/ring/stacked) instead of text-only progress bars for counts, completeness, and coverage
- [ ] **VIZ-02**: User can view a horizontal timeline of a patient's clinical events (encounters, conditions, procedures, observations) on the patient overview page
- [ ] **VIZ-03**: Patient timeline groups events by date and shows resource-type icons with clickable navigation to the resource detail

### Settings & Configuration

- [ ] **CONF-01**: User can edit the FHIR server URL and auth mode by clicking the FHIR server status in the sidebar
- [ ] **CONF-02**: User can edit the terminology server URL by clicking the terminology status in the sidebar
- [ ] **CONF-03**: Settings changes take effect immediately without requiring a file edit or app restart

### Code Quality

- [ ] **DEBT-01**: All 17 info-level code review findings from v1.0 phases 4+5 are resolved

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BRWS-09 | — | Pending |
| BRWS-10 | — | Pending |
| VIZ-01 | — | Pending |
| VIZ-02 | — | Pending |
| VIZ-03 | — | Pending |
| CONF-01 | — | Pending |
| CONF-02 | — | Pending |
| CONF-03 | — | Pending |
| DEBT-01 | — | Pending |

## Future Requirements (v2)

- **QUAL-05**: Quality metric trend analysis over time
- **QUAL-06**: PDF quality report generation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Write operations (create/update/delete) | Read-only explorer by design |
| SMART on FHIR launch / OAuth2 flow | Local-only tool against local Blaze |
| Multi-server simultaneous browsing | Complexity vs value |
| Mobile-responsive design | Desktop-only, optimize for 1200px+ |
| Internationalization (i18n) | English UI; German clinical terms via terminology server |
