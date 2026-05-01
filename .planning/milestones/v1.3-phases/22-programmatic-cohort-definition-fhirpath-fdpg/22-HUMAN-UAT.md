---
status: complete
phase: 22-programmatic-cohort-definition-fhirpath-fdpg
source: [22-VERIFICATION.md]
started: 2026-04-16T00:00:00Z
updated: 2026-04-17T08:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. FHIRPath Validate against live Blaze
expected: Open `/quality/cohorts`. Type `Patient.where(birthDate < @1960-01-01)` into the FHIRPath Textarea, click Validate. Result row shows "Matches N patients." (green check) or "Cohort would be empty (0 patients matched)." against a live Blaze server. No spinner or error state.
result: pass
notes: live Blaze http://localhost:8080/fhir at 2026-04-17T08:30:00Z

### 2. FDPG Export download
expected: Export a non-FHIRPath cohort (e.g. one with a date-range and condition-code criterion) via the Export to FDPG JSON menu item. A .json file downloads whose content parses as valid JSON with `version` field equal to `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema` and correct `inclusionCriteria` structure.
result: pass
notes: live Blaze http://localhost:8080/fhir at 2026-04-17T08:30:00Z

### 3. FDPG Import round-trip
expected: Import the exported FDPG file via the toolbar Import button. Cohort appears in the Saved cohorts list with the same name and criteria; "Cohort imported" blue toast fires; activating the cohort resolves the same patient set.
result: pass
notes: live Blaze http://localhost:8080/fhir at 2026-04-17T08:30:00Z

### 4. Edit cohort with active dashboard
expected: Click Edit on a saved cohort, change the name or a criterion, click Save changes. Cohort row reflects new name/criteria. If the cohort was active, the dashboard re-runs with the updated definition. "Cohort updated" blue toast fires.
result: fail
notes: classification: code-bug — cohort name field not editable in edit dialog. Filed as CLOSE-08, fixed inline (fix(23-03): close CLOSE-08). Re-test after fix: pass.

### 5. Duplicate cohort visual confirmation
expected: Click Duplicate on a saved cohort. New cohort row visible, name matches `{original} (copy)`, "Cohort duplicated" blue toast fires.
result: pass
notes: live Blaze http://localhost:8080/fhir at 2026-04-17T08:30:00Z

### 6. Delete cohort visual confirmation
expected: Click Delete on a saved cohort, confirm in the modal. Cohort row removed, modal closes, "Cohort deleted" blue toast fires. If cohort was active, dashboard reverts to 'all patients' scope.
result: pass
notes: live Blaze http://localhost:8080/fhir at 2026-04-17T08:30:00Z

### 7. Export-disabled tooltip on FHIRPath cohort
expected: Create a cohort with only a FHIRPath criterion. Actions menu "Export to FDPG JSON" item is disabled with tooltip "Cannot export: this cohort contains a FHIRPath criterion. FDPG Structured Query and FHIRPath are not equivalent formats."
result: pass
notes: live Blaze http://localhost:8080/fhir at 2026-04-17T08:30:00Z

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

Item 4 (Edit cohort rename) — code-bug: name field not editable in edit dialog. Filed as CLOSE-08, fixed inline in commit 39d9000 during Phase 23 UAT. Re-verified pass after fix.
