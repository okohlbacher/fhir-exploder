---
phase: 14-tech-debt-cleanup
plan: 01
subsystem: build-system
tags: [typescript, tech-debt, refactoring, type-safety]
dependency_graph:
  requires: []
  provides: [zero-tsc-errors, fhir-helpers-utility]
  affects: [all-component-files, test-files]
tech_stack:
  added: ["@testing-library/dom@10.4.1"]
  patterns: [toRecord-utility, getCodeDisplay-utility]
key_files:
  created:
    - src/utils/fhir-helpers.ts
  modified:
    - package.json
    - package-lock.json
    - src/__tests__/display-modes.test.tsx
    - src/__tests__/json-highlight.test.ts
    - src/components/explorer/ResourceDetailPage.tsx
    - src/components/explorer/ResourcePropertyTable.tsx
    - src/components/explorer/SearchResultsPage.tsx
    - src/components/patients/FhirResourcesView.tsx
    - src/components/patients/MiiModuleTab.tsx
    - src/components/patients/PatientTimeline.tsx
    - src/utils/export.ts
    - src/utils/timeline-utils.ts
decisions:
  - "Non-Resource casts (on unknown-typed params, sub-objects, config objects) left as-is since toRecord() is specifically for Resource types"
  - "Used underscore prefix (_includes) for unused function parameter instead of removing it to preserve API signature"
metrics:
  duration: "5m 26s"
  completed: "2026-04-13T19:09:40Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 12
---

# Phase 14 Plan 01: Fix TypeScript Build Errors Summary

Zero-error TypeScript build achieved by installing missing @testing-library/dom peer dependency, removing 4 unused declarations, creating toRecord()/getCodeDisplay() utility module, and migrating all 18 Resource-typed inline casts.

## What Was Done

### Task 1: Install missing peer dependency and remove unused declarations
- Installed `@testing-library/dom@10.4.1` as devDependency, clearing 31 TS2305 errors across 17 test files
- Removed unused `mockPatient` declaration in `display-modes.test.tsx`
- Removed unused `JsonToken` type import in `json-highlight.test.ts`
- Prefixed unused `includes` parameter with underscore in `SearchResultsPage.tsx`
- Removed unused `useCallback`, `useMemo` imports in `MiiModuleTab.tsx`
- Result: 35 errors eliminated (31 TS2305 + 4 TS6133)

### Task 2: Create fhir-helpers utility, migrate all casts, fix TS2345
- Created `src/utils/fhir-helpers.ts` with `toRecord()` and `getCodeDisplay()` exports
- Replaced 18 Resource-typed `as Record<string, unknown>` casts with `toRecord()` calls across 7 files
- Fixed TS2345 in `ResourceDetailPage.tsx` with `as ResourceType` assertion on `readResource()` call
- 29 remaining `as Record<string, unknown>` casts are on non-Resource objects (sub-objects, unknown-typed params, config values) -- correctly left as-is
- Result: 19 remaining errors eliminated (18 TS2352 + 1 TS2345)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] npm install required --legacy-peer-deps flag**
- **Found during:** Task 1
- **Issue:** npm refused to install @testing-library/dom due to pre-existing @mantine/charts@9.0.1 peer dependency conflict with Mantine 8
- **Fix:** Used `--legacy-peer-deps` flag (consistent with existing project setup)
- **Files modified:** package.json, package-lock.json
- **Commit:** a0e848a

## Verification

- `npx tsc -b --noEmit` exits 0 with no output
- `npm run build` completes successfully (tsc -b + vite build)
- `npx vitest run` shows 265 passed, 22 todo -- no new failures from these changes
- `grep -rn "as Record<string, unknown>" src/ | grep -v fhir-helpers` returns 29 matches (all non-Resource casts)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a0e848a | fix(14-01): install @testing-library/dom and remove unused declarations |
| 2 | cb3e23a | feat(14-01): create fhir-helpers utility and migrate all Resource casts |

## Self-Check: PASSED
