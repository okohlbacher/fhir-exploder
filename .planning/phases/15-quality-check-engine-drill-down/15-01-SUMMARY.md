---
phase: 15-quality-check-engine-drill-down
plan: 01
subsystem: quality-walkers
tags: [types, completeness, coverage, drill-down, perResource]
dependency_graph:
  requires: []
  provides: [NormalizedIssue-type, perResource-completeness, perResource-coverage]
  affects: [useCompletenessReport, useCodingCoverage, ResourceIssueTable]
tech_stack:
  added: []
  patterns: [per-resource-issue-collection, TDD-red-green]
key_files:
  created: []
  modified:
    - src/quality/types.ts
    - src/quality/completenessWalker.ts
    - src/quality/codingCoverageWalker.ts
    - src/hooks/useCompletenessReport.ts
    - src/__tests__/completeness-walker.test.ts
    - src/__tests__/coding-coverage-walker.test.ts
decisions:
  - perResource fields are optional to preserve backward compatibility with existing consumers
  - Resources with no issues (all paths populated / all systemCode) are excluded from perResource arrays
  - resourceId format is ResourceType/id (e.g. Patient/p1) with fallback to unknown for missing ids
metrics:
  duration: 237s
  completed: "2026-04-13T20:48:12Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 6
  tests_added: 8
  tests_total: 41
---

# Phase 15 Plan 01: Walker Per-Resource Data Extension Summary

NormalizedIssue type contract added, both quality walkers extended to return per-resource issue arrays alongside existing aggregates, hooks pass perResource through -- foundation for ResourceIssueTable drill-down.

## What Was Done

### Task 1: Add NormalizedIssue type and extend walker return types (516a32b)
- Added `IssueSeverity` type (`'error' | 'warning' | 'info'`) and `NormalizedIssue` interface to `src/quality/types.ts`
- Extended `PerTypeCompletenessReport` with optional `perResource` field (array of `{resourceId, resourceType, missingPaths}`)
- Extended `PerTypeCoverageReport` with optional `perResource` field (array of `{resourceId, resourceType, issues}`)
- Both fields are optional (`?`) to avoid breaking existing consumers

### Task 2: Extend completeness walker to return perResource data (02f4436)
- Modified `computeCompleteness` to track missing paths per resource during the existing sample loop
- Resources with all paths populated are excluded from perResource (empty array)
- Resources missing `id` use `'unknown'` in resourceId
- Updated `useCompletenessReport` hook to destructure and pass `perResource` through
- Added 4 new tests; updated 2 existing `.toEqual` tests to include `perResource`

### Task 3: Extend coding coverage walker to return perResource data (6eab6e8)
- Modified `aggregateCoverage` to collect non-systemCode fields as issues per resource
- Resources with only systemCode classifications are excluded from perResource
- Fixed TS2352 cast errors in both walkers (Resource -> unknown -> Record)
- Added 4 new tests for perResource behavior
- Hook (`useCodingCoverage`) required no changes -- report flows through as-is

## Verification

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | PASS (0 errors) |
| `npx vitest run completeness-walker.test.ts` | PASS (24/24) |
| `npx vitest run coding-coverage-walker.test.ts` | PASS (17/17) |
| `npm run build` | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2352 cast errors in walker implementations**
- **Found during:** Task 2 and Task 3
- **Issue:** `Resource as Record<string, unknown>` fails TypeScript strict checks because FHIR union type `Resource` doesn't overlap with index signature types
- **Fix:** Changed to `r as unknown as Record<string, unknown>` (double cast via unknown)
- **Files modified:** src/quality/completenessWalker.ts, src/quality/codingCoverageWalker.ts, src/__tests__/coding-coverage-walker.test.ts

**2. [Rule 1 - Bug] Updated existing test assertions to include perResource**
- **Found during:** Task 2
- **Issue:** Two existing `computeCompleteness` tests used `.toEqual()` without the new `perResource` field, causing assertion failures
- **Fix:** Added `perResource: []` to expected objects in the two affected tests
- **Files modified:** src/__tests__/completeness-walker.test.ts

## Self-Check: PASSED
