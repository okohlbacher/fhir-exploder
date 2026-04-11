---
status: partial
phase: 02-resource-explorer
source: [02-VERIFICATION.md]
started: 2026-04-11T19:38:00Z
updated: 2026-04-11T20:55:00Z
---

## Current Test

[awaiting human testing — ConnectionContext fix (02-04) and count badges (02-05) deployed]

## Tests

### 1. Explorer landing count badges
expected: Navigate to /explorer when connected to Blaze. Blue count badges appear next to each resource type. While loading, spinner indicators show. If a type count fails, red "Error" badge appears.
result: [pending]

### 2. Search execution with real FHIR data
expected: Navigate to /explorer/Patient, enter "Smith" in name filter, click "Search Patient". Results table appears, URL updates to /explorer/Patient?name=Smith, page size defaults to 20.
result: [pending]

### 3. Pagination with real Bundle links
expected: Execute a search returning more than one page. Click Next — next page loads, position text updates (e.g., "Showing 21-40 of 120"), Previous button becomes enabled.
result: [pending]

### 4. Three display modes with real resource data
expected: Navigate to /explorer/Patient/{id}. Human-readable tab shows Medplum ResourceTable. Clinical+Raw shows 50/50 split. Developer shows syntax-highlighted JSON. Tab switching and keyboard shortcuts 1/2/3 work.
result: [pending]

### 5. Reference click navigation and breadcrumb trail
expected: On a resource detail page, click a Reference link. Navigation stays within app, breadcrumb trail updates, new resource loads. Clicking breadcrumb navigates back.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
