---
status: partial
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
source: [33-VERIFICATION.md]
started: 2026-04-24T13:45:00Z
updated: 2026-04-24T13:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live Synthea patient → Laborbefund tab only lab Observations (extraQuery URL append)
expected: Opening a Synthea patient and clicking the Laborbefund tab shows only FHIR Observation entries with category=laboratory (no social-history, vital-signs, or survey leakage). Before the plan-33-01 fix the tab showed ~25% non-lab leakage.
result: [pending]

### 2. Timeline color + German label for all 4 TIMELINE_RESOURCE_TYPES
expected: Patient detail → Zeitleiste tab renders Conditions labelled 'Diagnose' (teal border-left + teal badge), Encounters labelled 'Fall' (indigo), Procedures labelled 'Prozedur' (violet), Observations labelled 'Laborbefund' (cyan). Visual color tokens must match.
result: [pending]

### 3. Dashboard MII heading reads unambiguous scope
expected: Dashboard MII section shows the heading 'MII Kerndatensatz · Server-wide totals' so users cannot misinterpret the counts as per-patient. Visual typography + middle-dot separator should render correctly.
result: [pending]

### 4. Dashboard tile click opens Drawer (not navigate) — visual UX check
expected: Clicking any of the 7 base MII tiles opens a right-edge Drawer (not a navigation to /patients). Drawer shows German label + FHIR resource type(s) + server-wide count + 'Open in Explorer' button. Clicking 'Open in Explorer' navigates to /explorer/<primary-type> and closes the Drawer. No new network GETs fire when opening the Drawer (DevTools Network tab check).
result: [pending]

### 5. MiiModuleTabs deep-link ?tab=<extension-key> auto-expand (forward-compat verification)
expected: In Phase 33 no extension modules exist so the deep-link useEffect path is inactive. Smoke verifies base tabs still render correctly (Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation + Zeitleiste). Extension toggle section NOT visible (length-guarded).
result: [pending]

### 6. Per-patient Laborbefund previously-empty-panel (UAT-FU-06) now populated
expected: For a Synthea patient with observations, the Laborbefund tab shows ≥ 1 lab result (not empty). Other modules may legitimately show empty (Consent, Medikation) per 33-01-INVESTIGATION.md — that is data-coverage reality, not a bug.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
