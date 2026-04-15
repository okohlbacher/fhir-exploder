---
phase: 15-quality-check-engine-drill-down
plan: "02"
subsystem: quality-drill-down-ui
tags: [quality, drill-down, table, component, pagination, filters]
dependency_graph:
  requires: [15-01]
  provides: [ResourceIssueTable, ResourceIssueTableProps]
  affects: [15-03]
tech_stack:
  added: []
  patterns: [shared-issue-table, client-side-pagination, severity-filter]
key_files:
  created:
    - src/components/quality/ResourceIssueTable.tsx
    - src/__tests__/resource-issue-table.test.tsx
  modified: []
decisions:
  - "Used getAllByRole('option') with value attribute matching for Mantine Select test interactions to avoid aria-label collisions between input and listbox"
  - "Matched ValidationIssueList visual patterns (striped table, stickyHeader, maxHeight 600px, blue.6 anchor links) for consistency"
metrics:
  duration: 192s
  completed: "2026-04-13T20:54:33Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
  test_count: 11
  test_pass: 11
---

# Phase 15 Plan 02: ResourceIssueTable Component Summary

Shared per-resource issue table with severity badges, clickable resource links to /explorer/:type/:id, client-side pagination at 50/page, severity dropdown filter, and field path text filter.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ResourceIssueTable component | ab65ae6 | src/components/quality/ResourceIssueTable.tsx |
| 2 | Create ResourceIssueTable tests | 62f0441 | src/__tests__/resource-issue-table.test.tsx |

## What Was Built

### ResourceIssueTable Component
- **5-column table**: #, Severity, Resource, Field, Description
- **Severity badges**: error (red), warning (yellow), info (blue) using Mantine Badge
- **Resource links**: Clickable Anchor/Link to `/explorer/{type}/{id}` matching ValidationIssueList pattern
- **Pagination**: Client-side at PAGE_SIZE=50 using Mantine Pagination, hidden when <=1 page
- **Filters**: Severity Select dropdown + field path TextInput with case-insensitive substring match
- **Filter reset**: Both filters reset pagination to page 1 on change
- **initialFieldFilter prop**: Pre-populates field filter for drill-down from summary cards
- **Empty state**: Green Alert with IconCheck when issues array is empty
- **Filter-empty state**: Dimmed centered text when filters yield no results
- **Sorting**: By severity order (error > warning > info) then resourceId ASC

### Test Coverage (11 tests)
- Empty state rendering
- Table rows with resource links
- Resource link href verification (/explorer/Patient/p0)
- Severity badge rendering
- Field path rendering
- Pagination at 50 items
- Severity filter functionality
- Field path filter with substring match
- initialFieldFilter prop pre-population
- Filter-empty state message
- Filter change resets page to 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Mantine Select test selector collisions**
- **Found during:** Task 2
- **Issue:** Mantine 8 Select renders both an input element and a listbox with the same `aria-label`, causing `getByLabelText` to match multiple elements. Similarly, severity text appears in both Badge labels and Select option text.
- **Fix:** Used `getByRole('textbox', { name: '...' })` for Select input targeting, `getAllByRole('option')` with value attribute matching for option selection, and Badge-specific CSS class queries for badge assertions.
- **Files modified:** src/__tests__/resource-issue-table.test.tsx
- **Commit:** 62f0441

## Verification

- `npx tsc -b --noEmit` -- no errors in plan files (pre-existing errors in completenessWalker.ts are out of scope)
- `npx vitest run src/__tests__/resource-issue-table.test.tsx` -- 11/11 passed
- `npm run build` -- pre-existing TS errors in unrelated files; ResourceIssueTable compiles cleanly

## Self-Check: PASSED

All 2 files found. All 2 commits verified.
