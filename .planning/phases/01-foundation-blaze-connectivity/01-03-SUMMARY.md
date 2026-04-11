---
phase: 01-foundation-blaze-connectivity
plan: 03
subsystem: ui
tags: [react, medplum, mantine, fhir, capability-statement, resource-types, accordion, lazy-loading, concurrency]

requires:
  - phase: 01-foundation-blaze-connectivity/02
    provides: MedplumClient factory, useConnection hook with ConnectionState, DashboardPage shell
provides:
  - CapabilityStatement parser extracting typed resource types with category, search params, operations
  - FHIR R4 category mapping (120+ resource types across 15 categories)
  - Lazy resource count loading hook with concurrency limit of 4
  - Categorized accordion display of resource types with clickable navigation links
  - Medplum React component compatibility gate (ResourceTable rendering Blaze data)
affects: [02-resource-explorer, 03-patient-browser, 04-data-quality]

tech-stack:
  added: []
  patterns: [capability-statement-parsing, fhir-category-mapping, lazy-count-loading, concurrency-limited-fetching, medplum-compat-gate]

key-files:
  created:
    - src/fhir/capability.ts
    - src/utils/fhir-categories.ts
    - src/hooks/useResourceCounts.ts
    - src/components/dashboard/ResourceTypeRow.tsx
    - src/components/dashboard/ResourceTypeGroup.tsx
    - src/components/dashboard/ResourceTypeList.tsx
    - src/components/dashboard/MedplumCompatGate.tsx
  modified:
    - src/components/dashboard/DashboardPage.tsx

key-decisions:
  - "Concurrency limit of 4 for resource count fetching to avoid overwhelming Blaze server"
  - "All accordion categories expanded by default for immediate visibility of server contents"
  - "MedplumCompatGate uses local MedplumProvider wrapping ResourceTable rather than global provider"

patterns-established:
  - "Concurrency-limited fetching: worker pool pattern with Promise.allSettled for parallel FHIR queries"
  - "FHIR category mapping: centralized CATEGORY_MAP with getResourceCategory and groupByCategory utilities"
  - "CapabilityStatement parsing: extracting structured data from rest[0].resource array"

requirements-completed: [CONN-03, CONN-05]

duration: 15min
completed: 2026-04-11
---

# Phase 01 Plan 03: Resource Type Display Summary

**CapabilityStatement parsed into categorized accordion with lazy-loaded counts, clickable resource links, and Medplum-on-Blaze compatibility gate verified**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-11T15:20:00Z
- **Completed:** 2026-04-11T15:50:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- CapabilityStatement parsed into typed resource types with FHIR R4 category mapping (120+ types, 15 categories)
- Resource types displayed in grouped accordion with lazy-loaded counts (concurrency limited to 4)
- Each resource type shows count badge, search param count, operations count, and clickable link to /explorer/{type}
- Medplum React component compatibility gate renders ResourceTable with Blaze-fetched data, validating the Medplum-on-Blaze architecture
- Human-verified end-to-end flow: connection, CapabilityStatement display, counts, and Medplum compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement CapabilityStatement parsing, FHIR category mapping, resource counts hook, resource type display components, and Medplum compatibility gate** - `fe69d66` (feat)
2. **Task 2: Verify complete Phase 1 connection flow end-to-end including Medplum compatibility** - human checkpoint (approved, no code changes)

## Files Created/Modified
- `src/utils/fhir-categories.ts` - FHIR R4 resource type to category mapping with 120+ entries, groupByCategory utility, CATEGORY_ORDER
- `src/fhir/capability.ts` - CapabilityStatement parser producing ParsedResourceType[] with type, searchParams, operations, category
- `src/hooks/useResourceCounts.ts` - Lazy resource count hook with concurrency limit of 4, AbortController cleanup, per-type error isolation
- `src/components/dashboard/ResourceTypeRow.tsx` - Single resource type row with count badge, search params, operations, clickable Link
- `src/components/dashboard/ResourceTypeGroup.tsx` - Category group with SimpleGrid layout and ResourceTypeRow children
- `src/components/dashboard/ResourceTypeList.tsx` - Accordion container grouping resources by FHIR category with empty state handling
- `src/components/dashboard/MedplumCompatGate.tsx` - Medplum React compatibility verification via ResourceTable with local MedplumProvider
- `src/components/dashboard/DashboardPage.tsx` - Integrated resource type list, counts hook, compat gate, and pre-connect empty state

## Decisions Made
- Concurrency limit of 4 for resource count fetching avoids overwhelming the Blaze server while keeping load times reasonable
- All accordion categories expanded by default so users immediately see the full server contents without extra clicks
- MedplumCompatGate wraps ResourceTable in a local MedplumProvider rather than using a global one, since the app manages MedplumClient directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 foundation is complete: app shell, settings, Blaze connection, CapabilityStatement display, and Medplum compatibility all verified
- Resource type links point to /explorer/{type} ready for Phase 2 (Resource Explorer)
- MedplumClient and connection state machine ready for reuse in patient browser and data quality views
- Medplum React component compatibility confirmed, unblocking use of SearchControl, ResourceTable, and other components in Phase 2+

## Self-Check: PASSED

All 8 created/modified files verified present on disk. Commit fe69d66 verified in git log.

---
*Phase: 01-foundation-blaze-connectivity*
*Completed: 2026-04-11*
