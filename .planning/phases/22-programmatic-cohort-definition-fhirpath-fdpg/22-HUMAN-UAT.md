---
status: partial
phase: 22-programmatic-cohort-definition-fhirpath-fdpg
source: [22-VERIFICATION.md]
started: 2026-04-16T00:00:00Z
updated: 2026-04-16T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. FHIRPath Validate against live Blaze
expected: Open `/quality/cohorts`. Type `Patient.where(birthDate < @1960-01-01)` into the FHIRPath Textarea, click Validate. Result row shows "Matches N patients." (green check) or "Cohort would be empty (0 patients matched)." against a live Blaze server. No spinner or error state.
result: [pending]

### 2. FDPG Export download
expected: Export a non-FHIRPath cohort (e.g. one with a date-range and condition-code criterion) via the Export to FDPG JSON menu item. A .json file downloads whose content parses as valid JSON with `version` field equal to `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema` and correct `inclusionCriteria` structure.
result: [pending]

### 3. FDPG Import round-trip
expected: Import the exported FDPG file via the toolbar Import button. Cohort appears in the Saved cohorts list with the same name and criteria; "Cohort imported" blue toast fires; activating the cohort resolves the same patient set.
result: [pending]

### 4. Edit cohort with active dashboard
expected: Click Edit on a saved cohort, change the name or a criterion, click Save changes. Cohort row reflects new name/criteria. If the cohort was active, the dashboard re-runs with the updated definition. "Cohort updated" blue toast fires.
result: [pending]

### 5. Duplicate cohort visual confirmation
expected: Click Duplicate on a saved cohort. New cohort row visible, name matches `{original} (copy)`, "Cohort duplicated" blue toast fires.
result: [pending]

### 6. Delete cohort visual confirmation
expected: Click Delete on a saved cohort, confirm in the modal. Cohort row removed, modal closes, "Cohort deleted" blue toast fires. If cohort was active, dashboard reverts to 'all patients' scope.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
