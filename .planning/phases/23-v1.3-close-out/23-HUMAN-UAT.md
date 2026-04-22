---
status: complete
phase: 23-v1.3-close-out
source: [23-VERIFICATION.md]
started: 2026-04-17T08:30:00Z
updated: 2026-04-22T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. T-6.3 A — Panel scoping reduces numbers against live Blaze with matching patients
expected: With a cohort active that resolves to a non-zero patient subset, quality panel numbers (Completeness, Coding Coverage, Plausibility) are strictly lower than the unscoped baseline. Network tab shows FHIR requests with `patient=Patient/...` or `_id=...` params for ≤40 IDs, or POST /_search for larger cohorts.
result: issue
reported: "Nothing happens if I select a cohort that matches 139 patients, the counts on the quality dashboard do not change at all."
severity: major

### 2. T-6.3 B — Snapshot and PDF include cohort metadata (requires T-6.3 A)
expected: With a matching cohort active, clicking Capture snapshot writes `quality.trends.v1` with `cohortId`, `cohortName`, `cohortPatientCount` populated. Export PDF shows both `Resource types:` and `Cohort:` lines on the cover page. Deactivate → PDF shows only `Resource types:`.
result: pass

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "With a cohort active that resolves to a non-zero patient subset, quality panel numbers (Completeness, Coding Coverage, Plausibility) are strictly lower than the unscoped baseline."
  status: failed
  reason: "User reported: Nothing happens if I select a cohort that matches 139 patients, the counts on the quality dashboard do not change at all."
  severity: major
  test: 1
  root_cause: |
    Two distinct defects combine:
    (A) OverviewStrip tiles 'Total resources' and 'Resource types' are unconditionally unscoped — useResourceCountsMetrics / useResourceCounts accept no patientIds argument (OverviewStrip.tsx:104-112).
    (B) Plausibility, LabRanges, Duplicates, Reference reports call useAsyncRun without autoStart: true and without a manual cancel+reset effect keyed on patientIds — so on cohort activation their patientIds dep changes but the runner never re-fires and previously computed unscoped results persist stale. See useAsyncRun.ts:138-146 (autoStart gate).
    Completeness, Coding Coverage, and Validation DO re-scope correctly (evidence: useCompletenessReport.ts:73,119; useCodingCoverage.ts:64,112; useValidationRun.ts:172).
  artifacts:
    - src/hooks/usePlausibilityReport.ts
    - src/hooks/useLabRangesReport.ts
    - src/hooks/useDuplicateReport.ts
    - src/hooks/useReferenceReport.ts
    - src/hooks/useAsyncRun.ts
    - src/hooks/useResourceCountsMetrics.ts
    - src/components/quality/OverviewStrip.tsx
  missing:
    - "patientIds parameter plumbed through useResourceCountsMetrics/useResourceCounts, OR a scoped-summary source for OverviewStrip tiles 1-2 with clear UI indication when cohort is active"
    - "Stale-result invalidation on patientIds change for usePlausibilityReport, useLabRangesReport, useDuplicateReport, useReferenceReport — either autoStart:true with careful memoization (per PITFALLS §7) or explicit cancel+reset effect keyed on patientIds so panels show idle/empty until re-run"
