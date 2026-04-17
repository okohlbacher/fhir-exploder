---
status: partial
phase: 23-v1.3-close-out
source: [23-VERIFICATION.md]
started: 2026-04-17T08:30:00Z
updated: 2026-04-17T08:30:00Z
---

## Current Test

[awaiting MII Synthea test data on Blaze]

## Tests

### 1. T-6.3 A — Panel scoping reduces numbers against live Blaze with matching patients
expected: With a cohort active that resolves to a non-zero patient subset, quality panel numbers (Completeness, Coding Coverage, Plausibility) are strictly lower than the unscoped baseline. Network tab shows FHIR requests with `patient=Patient/...` or `_id=...` params for ≤40 IDs, or POST /_search for larger cohorts.
result: [pending]

### 2. T-6.3 B — Snapshot and PDF include cohort metadata (requires T-6.3 A)
expected: With a matching cohort active, clicking Capture snapshot writes `quality.trends.v1` with `cohortId`, `cohortName`, `cohortPatientCount` populated. Export PDF shows both `Resource types:` and `Cohort:` lines on the cover page. Deactivate → PDF shows only `Resource types:`.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

Both items require a Blaze instance seeded with MII Synthea data so cohort criteria match at least one patient. Remedy: see todo filed at .planning/todos/pending/2026-04-17-find-a-way-to-import-mii-synthea-example-data-into-a-running.md
