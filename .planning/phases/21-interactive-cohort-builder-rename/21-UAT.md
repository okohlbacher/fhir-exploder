---
status: complete
phase: 21-interactive-cohort-builder-rename
source:
  - 21-04-SUMMARY.md
  - 21-05-SUMMARY.md
  - 21-06-SUMMARY.md
started: 2026-04-16T06:30:00.000Z
updated: 2026-04-16T06:45:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  Dev server (npm run dev on http://localhost:5173) boots with no errors.
  The app loads — you see the connect-to-Blaze dashboard home. No red console
  errors about missing @mantine/dates styles or route registration.
result: pass

### 2. Resource types label on dashboard toolbar
expected: |
  On /quality, the MultiSelect on the left of the toolbar is labeled
  "Resource types" (it previously said "Cohort"). The control itself works
  the same way — pick one or more resource types to include in analysis.
result: pass

### 3. /quality/cohorts route renders
expected: |
  Navigate to /quality/cohorts. You see:
  - "← Back to Data Quality" link at the top
  - Title "Cohorts"
  - Short description text
  - Two cards stacked: "Saved cohorts" (empty state "No cohorts yet") and
    "New cohort" (with three form fields — date range, code system + code
    pair, patient references Textarea).
result: pass

### 4. Builder form — Save button disabled state + tooltip
expected: |
  On an empty form (no criteria filled), the "Save cohort…" button is
  disabled. Hovering over it shows the browser-native tooltip
  "Add at least one criterion to save." Filling in any one criterion
  (e.g. pick a date range) enables the button.
result: pass

### 5. Create + persist cohort
expected: |
  Fill the form (date range + code system "http://snomed.info/sct" + code
  "44054006"). Click "Save cohort…" → modal opens with the in-body heading
  "Save cohort" (NOT a native Mantine title bar). Type a name, e.g.
  "Diabetic adults", click "Save cohort" → blue success toast, modal closes,
  saved-list row appears. Reload the page → cohort persists.
result: pass

### 6. Save modal — Discard button, not Cancel
expected: |
  When the save modal is open, the two buttons at the bottom are labeled
  "Discard" (left) and "Save cohort" (right). There is no "Cancel" button.
  Clicking Discard closes the modal without saving.
result: pass

### 7. Duplicate cohort name error
expected: |
  With "Diabetic adults" already saved, try to save a new cohort with the
  same name. The Name input shows a red error below it reading
  "A cohort with this name already exists. Choose a different name."
  No toast fires; no row appears in the saved list.
result: pass

### 8. Active cohort Select on /quality toolbar
expected: |
  Back on /quality, you see an "Active cohort" Select between
  "Resource types" and "Sample size" on the toolbar. It shows "No cohort —
  all patients" when nothing is active. Opening it shows your saved
  cohorts. Selecting one fires a blue toast and the dashboard recomputes.
result: pass

### 9. Manage cohorts button routes to Cohorts page
expected: |
  On /quality, a "Manage cohorts" button (with a small users-group icon)
  appears next to the "Configure thresholds" button. Clicking it navigates
  to /quality/cohorts.
result: pass

### 10. UAT A — cohort scoping reduces panel numbers
expected: |
  With a narrow cohort active (date range resolves to a small patient
  subset, or a condition-code cohort), the panel numbers across Completeness,
  Coding Coverage, Plausibility, etc. are strictly lower than the unscoped
  baseline. Browser DevTools → Network tab shows outgoing FHIR requests with
  either `patient=Patient/...` (non-Patient types) or `_id=...` (Patient type)
  query params for ≤40 IDs, or POST /_search for larger cohorts.
result: pass

### 11. UAT B — capture + PDF include cohort metadata
expected: |
  With a cohort active, click "Capture snapshot". DevTools → Application →
  Local Storage → `quality.trends.v1` contains the latest snapshot with
  `cohortId`, `cohortName`, and `cohortPatientCount` fields populated.
  Click "Export PDF" → the cover page shows both
  `Resource types: …` and `Cohort: "Diabetic adults" (N patients)` lines.
  Deactivate the cohort → export PDF → only `Resource types:` line shows.
result: pass

### 12. UAT C — legacy migration from quality.cohort.v1
expected: |
  In DevTools, seed localStorage with
  `quality.cohort.v1 = '["Patient","Observation"]'` and reload /quality.
  The MultiSelect is labeled "Resource types" with Patient + Observation
  preselected. `quality.resourceTypes.v1` is present in Local Storage.
  `quality.cohort.v1` is gone.
result: pass

### 13. UAT D — zero-match cohort Alert
expected: |
  Create a cohort whose criteria resolve to 0 patients (e.g., a date range
  entirely in the year 1900, or a condition code nobody has). Activate it.
  Above the Tabs strip, a yellow Alert renders with text "Active cohort
  matches 0 patients" and an "Open Cohorts page" link. Panel numbers
  continue to render (running unscoped as fallback).
result: pass

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
