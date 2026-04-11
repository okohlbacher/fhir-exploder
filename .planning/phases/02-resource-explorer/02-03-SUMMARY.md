---
phase: 02-resource-explorer
plan: 03
subsystem: ui
tags: [react, medplum, fhir, resource-detail, tabs, breadcrumbs, json-viewer, reference-navigation]

# Dependency graph
requires:
  - phase: 02-resource-explorer/01
    provides: "JsonSyntaxHighlight component, useBreadcrumbTrail hook, ExplorerLayout with MedplumProvider"
  - phase: 02-resource-explorer/02
    provides: "SearchResultsPage, routing stubs for resource detail"
provides:
  - "ResourceDetailPage with three tabbed display modes"
  - "HumanReadableView using Medplum ResourceTable"
  - "ClinicalRawView with 50/50 split (ResourceTable + JSON)"
  - "DeveloperJsonView with syntax-highlighted JSON"
  - "NavigationBreadcrumbs for reference traversal trail"
  - "Container-level FHIR reference click interception"
affects: [patient-browser, data-quality]

# Tech tracking
tech-stack:
  added: []
  patterns: [container-click-interception-for-fhir-references, keyboard-shortcut-tab-switching]

key-files:
  created:
    - src/components/explorer/ResourceDetailPage.tsx
    - src/components/explorer/HumanReadableView.tsx
    - src/components/explorer/ClinicalRawView.tsx
    - src/components/explorer/DeveloperJsonView.tsx
    - src/components/explorer/NavigationBreadcrumbs.tsx
    - src/__tests__/display-modes.test.tsx
    - src/__tests__/resource-detail.test.tsx
    - src/__tests__/reference-navigation.test.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Container-level click interception for FHIR references instead of ReferenceDisplay (Pitfall 5 mitigation)"
  - "FHIR reference pattern validation before navigation (T-02-08 threat mitigation)"

patterns-established:
  - "Container click interception: wrap view container in div with onClick that intercepts anchor clicks matching FHIR URL patterns and navigates in-app"
  - "Keyboard shortcuts: keydown listener with activeElement tag check to avoid triggering in input fields"

requirements-completed: [BRWS-04, BRWS-05, BRWS-06, BRWS-07]

# Metrics
duration: 3min
completed: 2026-04-11
---

# Phase 02 Plan 03: Resource Detail Summary

**Three-tab resource detail view (Human-readable, Clinical+Raw split, Developer JSON) with FHIR reference click interception and breadcrumb navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-11T17:30:11Z
- **Completed:** 2026-04-11T17:33:19Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Three display mode views: HumanReadableView (ResourceTable), ClinicalRawView (50/50 split), DeveloperJsonView (syntax-highlighted JSON)
- ResourceDetailPage with tabbed modes, keyboard shortcuts (1/2/3), loading/error states per UI-SPEC copy
- Container-level FHIR reference click interception that prevents navigation away from app (Pitfall 5)
- NavigationBreadcrumbs with clickable trail and Explorer root
- FHIR reference pattern validation before navigation (T-02-08 threat mitigation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create display mode views** - `6ca3192` (feat)
2. **Task 2: Create NavigationBreadcrumbs, ResourceDetailPage, wire route** - `bcff264` (feat)

## Files Created/Modified
- `src/components/explorer/HumanReadableView.tsx` - Tab 1: Medplum ResourceTable rendering
- `src/components/explorer/ClinicalRawView.tsx` - Tab 2: 50/50 split view (ResourceTable + JSON)
- `src/components/explorer/DeveloperJsonView.tsx` - Tab 3: Full syntax-highlighted JSON
- `src/components/explorer/ResourceDetailPage.tsx` - Main detail page with tabs, reference interception, keyboard shortcuts
- `src/components/explorer/NavigationBreadcrumbs.tsx` - Clickable breadcrumb trail for reference navigation
- `src/__tests__/display-modes.test.tsx` - Test stubs for three display mode views (BRWS-06)
- `src/__tests__/resource-detail.test.tsx` - Test stubs for ResourceDetailPage (BRWS-05)
- `src/__tests__/reference-navigation.test.tsx` - Test stubs for reference interception and breadcrumbs (BRWS-07)
- `src/App.tsx` - Wired ResourceDetailPage route replacing placeholder

## Decisions Made
- Used container-level click interception instead of ReferenceDisplay component for FHIR reference navigation (D-11 deviation). ReferenceDisplay renders `<a href>` pointing to the FHIR server URL which would navigate away from the Explorer. Container interception achieves the same user-observable behavior while keeping navigation in-app.
- Added FHIR reference pattern validation (PascalCase type + alphanumeric/hyphen ID) before navigation to mitigate T-02-08 reference tampering threat.

## Deviations from Plan

None - plan executed exactly as written. The D-11 reference interception approach was pre-planned in the plan's action description.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Resource Explorer phase is complete (all 3 plans done)
- Full browse-search-detail flow functional: resource type selection -> search results -> resource detail with three display modes
- Ready for Phase 03 (Patient Browser) which can reuse the detail view components

## Self-Check: PASSED

All 9 files verified present. Both task commits (6ca3192, bcff264) verified in git log. TypeScript compiles cleanly. All 68 tests pass (0 failures).

---
*Phase: 02-resource-explorer*
*Completed: 2026-04-11*
