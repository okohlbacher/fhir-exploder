---
status: complete
phase: 15-quality-check-engine-drill-down
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md]
started: "2026-04-13T21:30:00Z"
updated: "2026-04-13T21:35:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Coding Drill-Down Tabs
expected: Navigate to Quality Dashboard > Coding Coverage. Click a resource type to open the drill-down. Two tabs appear: "Fields" (default, existing field table) and "Resources" (new ResourceIssueTable).
result: pass

### 2. Completeness Drill-Down Tabs
expected: Navigate to Quality Dashboard > Completeness. Click a resource type to open the drill-down. Two tabs appear: "Fields" (default, existing progress bar list) and "Resources" (new ResourceIssueTable).
result: pass

### 3. Validation Panel Tabs
expected: Navigate to Quality Dashboard > Validation tab. Run a validation. Two tabs appear: "Issue List" (default, existing validation issue list) and "Resources" (new ResourceIssueTable showing normalized validation issues).
result: pass

### 4. Cross-Filter: Coding
expected: On a Coding drill-down page, click any field row in the "Fields" tab. The view should switch to the "Resources" tab with the field path text filter pre-populated with the clicked field's path, showing only resources with issues for that field.
result: pass

### 5. Cross-Filter: Completeness
expected: On a Completeness drill-down page, click any field path row in the "Fields" tab. The view should switch to the "Resources" tab with the field path text filter pre-populated with the clicked path.
result: pass

### 6. Severity Badges
expected: In any ResourceIssueTable, severity badges are color-coded: "error" in red, "warning" in yellow, "info" in blue. Each issue row shows its severity as a colored badge.
result: pass

### 7. Resource Links
expected: In the ResourceIssueTable, each resource ID is a clickable link. Clicking it navigates to `/explorer/{ResourceType}/{id}` (e.g., `/explorer/Patient/p1`).
result: pass

### 8. Pagination
expected: If a ResourceIssueTable has more than 50 issues, pagination controls appear at the bottom. Clicking page 2 shows the next 50 items. With 50 or fewer issues, no pagination controls are shown.
result: pass

### 9. Filters
expected: In the ResourceIssueTable, a severity dropdown lets you filter by error/warning/info. A text input lets you filter by field path (case-insensitive substring match). Both filters update the visible rows immediately and reset to page 1.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
