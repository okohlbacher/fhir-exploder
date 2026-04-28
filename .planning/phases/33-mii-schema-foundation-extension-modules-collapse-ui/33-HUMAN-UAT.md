---
status: partial
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
source: [33-VERIFICATION.md]
started: 2026-04-24T13:45:00Z
updated: 2026-04-28T13:47:28Z
---

## Current Test

[walk complete — Plan 38-03 owns the verification re-flip]

## Tests

### 1. Live Synthea patient → Laborbefund tab only lab Observations (extraQuery URL append)
expected: Opening a Synthea patient and clicking the Laborbefund tab shows only FHIR Observation entries with category=laboratory (no social-history, vital-signs, or survey leakage). Before the plan-33-01 fix the tab showed ~25% non-lab leakage.
result: fail
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir (Blaze 1.6.2,
  500-patient Synthea bundle reloaded mid-session — see 38-SESSION.md).
  Patient DHOT622BDE5AAY4S, /patients/DHOT622BDE5AAY4S → Laborbefund tab.
  Panel renders "No Laborbefund data found for this patient." instead of
  the expected ≥1 lab Observation entries.

  Root cause (HAR-confirmed, ~/Downloads/localhost.har):
    GET /fhir/Observation?patient=Patient/DHOT622BDE5AAY4S&_count=50
        &_sort=-date&category=laboratory
    → HTTP 400 OperationOutcome
    → diagnostics: "Unknown search-param `date` in sort clause."

  Blaze 1.6.2 does not index `date` as a sortable param for the
  per-patient query types (Encounter, Observation, Condition, Procedure,
  MedicationStatement, DiagnosticReport, AllergyIntolerance, ImagingStudy
  all return the same 400). Direct curl confirms `_sort=-_lastUpdated`
  works and `_sort=-date` is rejected by Blaze itself (not a Vite proxy
  artifact).

  The UAT-FU-06 extraQuery URL append IS correct: `&category=laboratory`
  is present in the URL per the HAR — so Phase 33 plan-33-01's fix is
  itself sound. The surrounding `_sort=-date` clause is what Blaze
  rejects, and it nukes the entire response before the laboratory
  filter has any chance to take effect.

  Affected source sites (all 4 use `_sort=-date`):
    src/components/patients/MiiModuleTab.tsx:81       — every MII tab
    src/components/patients/ClinicalTimeline.tsx:72   — Zeitleiste
    src/components/patients/PatientTimeline.tsx:122   — $everything view
    src/components/patients/FhirResourcesView.tsx:132 — cross-resource

  Severity: critical regression. This is exactly what Phase 38 D-01 is
  designed to surface — Phase 33 verification ran against jsdom mocks
  that did not exercise Blaze's sort-param validation. Routes to
  sub-phase 38.1; suggested fix: replace `_sort=-date` with
  `_sort=-_lastUpdated` (or remove sort) in all 4 sites.

  → fixed in Phase 38.1, commit 7abe68f.
    Re-walked 2026-04-28 against same Blaze + Synthea fingerprint
    (38-SESSION.md): Laborbefund tab populated with lab Observations
    against patient DHOT622BDE5AAY4S; the previously-400 URL (now
    `_sort=-_lastUpdated&category=laboratory` variant) returns HTTP 200.
    `result: fail` preserved per Phase 38 D-03 (historical record).

### 2. Timeline color + German label for all 4 TIMELINE_RESOURCE_TYPES
expected: Patient detail → Zeitleiste tab renders Conditions labelled 'Diagnose' (teal border-left + teal badge), Encounters labelled 'Fall' (indigo), Procedures labelled 'Prozedur' (violet), Observations labelled 'Laborbefund' (cyan). Visual color tokens must match.
result: fail
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir, same session as
  Test 1. /patients/DHOT622BDE5AAY4S → Zeitleiste tab.
  Panel renders the empty-state copy "No clinical events..." instead of
  the expected timeline entries.

  Root cause: same as Test 1. ClinicalTimeline.tsx:72 issues
    GET /fhir/<type>?patient=Patient/<id>&_count=100&_sort=-date
  for each TIMELINE_RESOURCE_TYPE — all four (Encounter, Condition,
  Procedure, Observation) return HTTP 400 from Blaze with "Unknown
  search-param `date` in sort clause." (HAR shows 4 separate 400s).

  Color-token / German-label rendering CANNOT BE OBSERVED because no
  entries reach the renderer. The Phase 33 timeline-color implementation
  itself is not exercised by this walk; the shared `_sort=-date` bug
  blocks observation.

  Severity: critical regression (cascade from Test 1 root cause). Routes
  to sub-phase 38.1. After 38.1 ships the `_sort=-_lastUpdated` swap,
  re-walk this test to confirm color + label render correctly per
  TIMELINE_RESOURCE_TYPES.

  → fixed in Phase 38.1, commit e3488dc.
    Re-walked 2026-04-28 against same Blaze + Synthea fingerprint
    (38-SESSION.md): Zeitleiste renders entries with the expected 4-color
    palette (Encounter→indigo Fall, Condition→teal Diagnose,
    Procedure→violet Prozedur, Observation→cyan Laborbefund); each of the
    4 per-type `searchResources` requests returns HTTP 200 with the
    `_sort=-_lastUpdated` variant. `result: fail` preserved per Phase 38
    D-03 (historical record).

### 3. Dashboard MII heading reads unambiguous scope
expected: Dashboard MII section shows the heading 'MII Kerndatensatz · Server-wide totals' so users cannot misinterpret the counts as per-patient. Visual typography + middle-dot separator should render correctly.
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir. URL: / (Dashboard
  is at root, not /dashboard — corrected from plan text). MII section
  heading reads literally "MII Kerndatensatz · Server-wide totals" with
  the U+00B7 middle-dot separator. Heading is unaffected by the
  per-patient `_sort=-date` Blaze bug because Dashboard uses cached
  resource counts (no per-patient query is involved). UAT-FU-04 closure
  visible end-to-end.

### 4. Dashboard tile click opens Drawer (not navigate) — visual UX check
expected: Clicking any of the 7 base MII tiles opens a right-edge Drawer (not a navigation to /patients). Drawer shows German label + FHIR resource type(s) + server-wide count + 'Open in Explorer' button. Clicking 'Open in Explorer' navigates to /explorer/<primary-type> and closes the Drawer. No new network GETs fire when opening the Drawer (DevTools Network tab check).
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir. URL: / (Dashboard).
  Verifier confirmed: clicking a base MII tile opens a right-edge Drawer
  (NOT a navigation); Drawer contents match the spec — icon + German
  label, color swatch, FHIR resource type(s) in monospace, server-wide
  count (large numeral), and a full-width "Open in Explorer" button.
  Network tab shows zero new GETs between tile click and Drawer open
  (Drawer renders entirely from cached counts per Phase 33 D-14).
  Clicking "Open in Explorer" navigates to /explorer/<primary> and
  closes the Drawer. Phase 33 D-14 invariants preserved end-to-end.

### 5. MiiModuleTabs deep-link ?tab=<extension-key> auto-expand (forward-compat verification)
expected: In Phase 33 no extension modules exist so the deep-link useEffect path is inactive. Smoke verifies base tabs still render correctly (Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation + Zeitleiste). Extension toggle section NOT visible (length-guarded).
result: pass
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir.
  /patients/DHOT622BDE5AAY4S. Pill row renders 8 tabs in the expected
  order: Person → Fall → Diagnose → Prozedur → Consent → Laborbefund →
  Medikation → Zeitleiste. The "Show extension modules (N)" toggle is
  NOT visible (length-guarded — Phase 33 ships zero extension modules,
  so the `extensionModules.length > 0` conditional branch is skipped).
  Tab structure verifies cleanly even though every base tab's data
  panel is empty due to the unrelated Test-1 `_sort=-date` regression
  — tab visibility/order is independent of the data-fetch failure.

### 6. Per-patient Laborbefund previously-empty-panel (UAT-FU-06) now populated
expected: For a Synthea patient with observations, the Laborbefund tab shows ≥ 1 lab result (not empty). Other modules may legitimately show empty (Consent, Medikation) per 33-01-INVESTIGATION.md — that is data-coverage reality, not a bug.
result: fail
evidence: |
  Walked 2026-04-28 against http://localhost:8080/fhir, same patient
  and session as Test 1. /patients/DHOT622BDE5AAY4S → Laborbefund tab.
  Panel still renders "No Laborbefund data found for this patient." —
  zero entries shown.

  Root cause: identical to Test 1. The MII Laborbefund query
    GET /fhir/Observation?patient=Patient/<id>&_count=50
        &_sort=-date&category=laboratory
  returns HTTP 400 from Blaze ("Unknown search-param `date` in sort
  clause."), so no observations are fetched and the empty-state copy
  is shown — the same code path UAT-FU-06 was supposed to populate.

  The UAT-FU-06 extraQuery fix in Phase 33 (URL append at
  MiiModuleTab.tsx:81) IS present in the URL — `&category=laboratory`
  is in the request per the HAR. The fix itself is correct; it's the
  surrounding `_sort=-date` clause that Blaze rejects.

  Severity: critical regression (same fix as Test 1). Routes to
  sub-phase 38.1. After 38.1 swaps the sort, re-walk to confirm
  UAT-FU-06 works end-to-end against live Blaze.

  Data-coverage caveats (separate from the regression): Consent and
  Medikation tabs would show empty even with the sort fixed — the
  Synthea bundle has 0 Consents and 0 MedicationStatements server-wide
  per 38-SESSION.md. Those are accepted data-coverage realities per
  D-01, not regressions.

  → fixed in Phase 38.1, commit 7abe68f.
    Re-walked 2026-04-28 against same Blaze + Synthea fingerprint
    (38-SESSION.md): Laborbefund tab now populates with lab Observations
    end-to-end (UAT-FU-06 closure verified live); `&category=laboratory`
    filter applies cleanly with no social-history / vital-signs leakage;
    Consent + Medikation empty-state remains the accepted data-coverage
    reality per D-01 (separate from this fix). `result: fail` preserved
    per Phase 38 D-03 (historical record).

## Summary

total: 6
passed: 3
issues: 3
pending: 0
skipped: 0
blocked: 0

walked: 2026-04-28 by phase-38-01 (against Blaze 1.6.2 + 500-patient Synthea bundle; see 38-SESSION.md for the post-restore session fingerprint)

## Gaps
