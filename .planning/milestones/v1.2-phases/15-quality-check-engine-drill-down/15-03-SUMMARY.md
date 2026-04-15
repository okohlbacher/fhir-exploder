---
phase: 15-quality-check-engine-drill-down
plan: 03
subsystem: quality-drill-down-tabs
tags: [quality, drill-down, tabs, cross-filter, resource-issue-table]
dependency_graph:
  requires: [15-01, 15-02]
  provides: [tabbed-drill-down-ui, cross-filter-wiring]
  affects: [CodingDrillDown, CompletenessDrillDown, ValidationPanel]
tech_stack:
  added: []
  patterns: [mantine-tabs, cross-filter-state, normalized-issue-memo]
key_files:
  created:
    - src/__tests__/coding-drilldown.test.tsx
    - src/__tests__/completeness-drilldown.test.tsx
  modified:
    - src/components/quality/CodingDrillDown.tsx
    - src/components/quality/CompletenessDrillDown.tsx
    - src/components/quality/ValidationPanel.tsx
decisions:
  - "Cross-filter uses field path string as initialFieldFilter prop, matching the ResourceIssueTable API from Plan 02"
  - "Severity mapping follows UI-SPEC: completeness 0%=error/<100%=warning, coding empty=warning/textOnly=info, validation fatal|error=error/warning=warning/info=info"
  - "DrillDownTable and DrillDownList components gain optional onFieldClick prop for click-to-filter without breaking existing interfaces"
metrics:
  duration: 7m
  completed: "2026-04-13T21:04:00Z"
  tasks_completed: 4
  tasks_total: 5
  files_created: 2
  files_modified: 3
---

# Phase 15 Plan 03: Wire ResourceIssueTable into Drill-Down Pages Summary

Tabbed drill-down with cross-filtering across all three quality panels (Coding, Completeness, Validation) using Mantine Tabs and ResourceIssueTable from Plan 02.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Tabs and ResourceIssueTable to CodingDrillDown | 05ae39a | src/components/quality/CodingDrillDown.tsx |
| 2 | Add Tabs and ResourceIssueTable to CompletenessDrillDown | 7e702e9 | src/components/quality/CompletenessDrillDown.tsx |
| 3 | Integrate ResourceIssueTable into ValidationPanel | 9837738 | src/components/quality/ValidationPanel.tsx |
| 4 | Create behavioral tests for CodingDrillDown and CompletenessDrillDown | 5b05245, 680ed83 | src/__tests__/coding-drilldown.test.tsx, src/__tests__/completeness-drilldown.test.tsx |
| 5 | Verify drill-down feature across all quality panels | -- | CHECKPOINT (awaiting human verification) |

## What Was Built

### CodingDrillDown (Task 1)
- Wrapped existing DrillDownTable in Mantine Tabs with "Fields" (default) and "Resources" tabs
- Added `normalizedIssues` memo converting `perResource` coding issues to `NormalizedIssue[]`
- Severity mapping: `empty` classification -> warning, `textOnly` -> info
- Made field rows clickable with `onFieldClick` handler that sets field filter and switches to Resources tab
- Added keyboard accessibility (Enter/Space) and visual indicator (blue.6 color) on clickable rows

### CompletenessDrillDown (Task 2)
- Same Tabs pattern with "Fields" and "Resources" tabs
- Added `normalizedIssues` memo converting `perResource` missing paths to `NormalizedIssue[]`
- Severity mapping: 0% populated path -> error, <100% populated -> warning
- Made DrillDownList path rows clickable with same cross-filter and accessibility pattern

### ValidationPanel (Task 3)
- Added "Issue List" (default, existing ValidationIssueList) and "Resources" (new ResourceIssueTable) tabs
- Added `normalizedIssues` memo converting `AttributedIssue` to `NormalizedIssue[]`
- Severity mapping: fatal/error -> error, warning -> warning, information -> info
- No cross-filter needed -- validation panel renders directly without separate drill-down page

### Behavioral Tests (Task 4)
- `coding-drilldown.test.tsx`: 3 tests covering Fields tab default render, Resources tab content, cross-filter wiring
- `completeness-drilldown.test.tsx`: 3 tests covering same behaviors
- All 6 tests verify tab activation, field path visibility, and filter pre-population after cross-filter click

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `within` import**
- **Found during:** Task 4 verification
- **Issue:** `within` imported from @testing-library/react but unused, causing tsc build failure
- **Fix:** Removed unused import
- **Files modified:** src/__tests__/coding-drilldown.test.tsx
- **Commit:** 680ed83

## Verification Results

- `npx tsc -b --noEmit`: Pre-existing errors only (completenessWalker.ts TS2352, completeness-walker.test.ts TS2304) -- no new errors from this plan
- `npx vitest run src/__tests__/coding-drilldown.test.tsx src/__tests__/completeness-drilldown.test.tsx`: 6/6 passed
- `npx vitest run`: 290 passed, 21 failed (all pre-existing), 22 todo

## Known Stubs

None -- all tabs are wired to real data sources via normalization memos.

## Pending

Task 5 (checkpoint:human-verify) awaits manual verification of the drill-down feature across all three quality panels in the running application.

## Self-Check: PASSED

All 5 created/modified files verified on disk. All 5 commit hashes found in git log.
