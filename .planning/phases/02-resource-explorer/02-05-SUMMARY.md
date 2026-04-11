---
phase: 02-resource-explorer
plan: 05
subsystem: ui
tags: [react, mantine, fhir, resource-counts, badge, loader]

requires:
  - phase: 02-resource-explorer
    provides: "useResourceCounts hook, ExplorerLayout with MedplumProvider context, ResourceTypeLanding component"
provides:
  - "Explorer landing page with per-type resource count badges (number, loading, error states)"
affects: []

tech-stack:
  added: []
  patterns:
    - "Count display pattern: Badge for numbers, Loader for loading, red Badge for errors (reused from DashboardPage)"

key-files:
  created:
    - src/__tests__/resource-type-landing-counts.test.tsx
  modified:
    - src/components/explorer/ResourceTypeLanding.tsx

key-decisions:
  - "Reused exact count display pattern from DashboardPage ResourceTypeRow for consistency"

patterns-established:
  - "Count indicator pattern: Loader size=xs for loading, Badge color=red for error, Badge color=blue with toLocaleString for numbers"

requirements-completed: [BRWS-01]

duration: 5min
completed: 2026-04-11
---

# Phase 02 Plan 05: Explorer Landing Count Badges Summary

**Per-type resource count badges wired into Explorer landing page using existing useResourceCounts hook, closing BRWS-01 gap**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-11T18:44:08Z
- **Completed:** 2026-04-11T18:49:23Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Explorer landing page now displays per-type resource counts next to each resource type name
- Count badges show formatted numbers (toLocaleString), loading spinners, or error indicators
- BRWS-01 requirement fully satisfied: types list with counts in Explorer

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for count display** - `791c09c` (test)
2. **Task 1 (GREEN): Wire useResourceCounts into ResourceTypeLanding** - `ef52ca2` (feat)

_TDD task: test commit followed by implementation commit_

## Files Created/Modified
- `src/__tests__/resource-type-landing-counts.test.tsx` - 4 tests: count badges, loaders, error badges, hook invocation verification
- `src/components/explorer/ResourceTypeLanding.tsx` - Added useResourceCounts hook call and Badge/Loader/Error rendering per type

## Decisions Made
- Reused exact count display pattern from DashboardPage ResourceTypeRow for visual consistency across the app

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- jsdom environment missing `window.matchMedia` and `ResizeObserver` polyfills required by Mantine components -- resolved by adding mocks directly in the test file

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 02 Resource Explorer is now feature-complete with all 5 plans executed
- BRWS-01 gap (missing counts on Explorer landing) is closed
- Ready for phase transition and verification

---
## Self-Check: PASSED

- [x] src/__tests__/resource-type-landing-counts.test.tsx exists
- [x] src/components/explorer/ResourceTypeLanding.tsx exists
- [x] Commit 791c09c exists
- [x] Commit ef52ca2 exists

---
*Phase: 02-resource-explorer*
*Completed: 2026-04-11*
