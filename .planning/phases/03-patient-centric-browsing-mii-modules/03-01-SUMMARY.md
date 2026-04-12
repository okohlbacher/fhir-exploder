---
phase: 03-patient-centric-browsing-mii-modules
plan: 01
subsystem: ui
tags: [react, react-router, medplum, mantine, fhir, patient, mii-kerndatensatz, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-blaze-connectivity
    provides: ConnectionProvider, useConnection hook, AppLayout sidebar, MedplumClient wiring
  - phase: 02-resource-explorer
    provides: ExplorerLayout pattern, SearchControl usage, PaginationControls, useBreadcrumbTrail hook
provides:
  - MII Kerndatensatz module configuration (MII_MODULES) reusable across tabs, timeline, FHIR view
  - PatientsLayout with connection gating and MedplumProvider scoping
  - PatientsOutletContext type for nested patient routes
  - PatientListPage with search (name/identifier/birthDate), SearchControl results, row-click navigation
  - useBreadcrumbTrail refactored to accept optional basePath (default /explorer)
  - /patients nested route structure ready for Plan 02 to add :patientId and drill-down routes
affects: [03-02 (patient detail + MII tabs), 03-03 (timeline + FHIR view toggle)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Layout-level connection gating with MedplumProvider scoping (mirror of ExplorerLayout)"
    - "Outlet context typing (PatientsOutletContext) for nested route capability/client propagation"
    - "Centralized module configuration object (MII_MODULES) used as single source of truth for labels/colors/resource-types/search-params"
    - "Parameterized breadcrumb trail hook via basePath argument — backward compatible default keeps Phase 2 callers unchanged"
    - "SearchControl with hideToolbar/hideFilters wrapped by custom search panel (consistent with SearchResultsPage)"

key-files:
  created:
    - src/utils/mii-modules.ts
    - src/components/patients/PatientsLayout.tsx
    - src/components/patients/PatientListPage.tsx
    - src/__tests__/mii-modules.test.ts
    - src/__tests__/patient-list.test.tsx
  modified:
    - src/App.tsx
    - src/hooks/useBreadcrumbTrail.ts

key-decisions:
  - "Parameterize useBreadcrumbTrail(basePath) with default /explorer instead of a patient-specific sibling hook — avoids duplication and keeps Phase 2 callers working without edits (addresses Pitfall 5)"
  - "Hardcode patientSearchParam per MII module (all currently 'patient') rather than discovering from CapabilityStatement; field is present so a future module can override without refactoring callers"
  - "Empty-state gating via searchTriggered flag — SearchControl is only mounted after the user submits, avoiding an accidental unfiltered load against large Blaze datasets on first page render"
  - "Reuse PaginationControls from components/explorer rather than duplicating pagination UI — Phase 2 component handles next/prev link detection, offset parsing, and page-size changes already"
  - "SearchControl row-click handler navigates via useNavigate(`/patients/${id}`) rather than prefixing with window.location — keeps react-router in control of route transitions"

patterns-established:
  - "MII module config module (src/utils/mii-modules.ts): single source of truth consumed by future tabs/timeline/FHIR view"
  - "PatientsLayout pattern: connection gate + MedplumProvider + typed Outlet context — replicate for any future patient-scoped layout variants"
  - "Breadcrumb basePath injection: callers inside patient context will pass `/patients/${patientId}` to keep reference navigation patient-scoped (consumed by Plan 02)"

requirements-completed: [PTNT-01]

# Metrics
duration: ~3min
completed: 2026-04-12
---

# Phase 03 Plan 01: Patient List Foundation Summary

**MII module configuration, connection-gated PatientsLayout, parameterized breadcrumb hook, and searchable PatientListPage at /patients backed by SearchControl with row-click navigation.**

## Performance

- **Duration:** ~3 min 20 s (200 s)
- **Started:** 2026-04-12T05:46:47Z
- **Completed:** 2026-04-12T05:50:07Z
- **Tasks:** 2 (both auto, Task 1 used TDD)
- **Files modified/created:** 7

## Accomplishments

- Established the six MII Kerndatensatz modules (Diagnose/Prozedur/Laborbefund/Medikation/Fall/Consent) as exported configuration, matching D-05 labels and the 03-UI-SPEC color map exactly.
- Connection-gated `/patients` route tree ready: `PatientsLayout` wraps nested routes in `MedplumProvider`, exposes `PatientsOutletContext` to children, and redirects disconnected users to the dashboard — mirroring the Phase 2 `ExplorerLayout` contract.
- `useBreadcrumbTrail` now accepts an optional `basePath` (default `/explorer`), unblocking patient-context reference navigation in later plans without breaking any existing Phase 2 callers.
- Patient list page at `/patients` renders the UI-SPEC search panel (Name/Identifier/Birth Date + "Search Patients" button), empty "Browse Patients" state, SearchControl-backed results with Patient fields (name, birthDate, gender, identifier), row-click navigation to `/patients/:id`, and pagination via the reused Phase 2 `PaginationControls`.

## Task Commits

1. **Task 1 — RED (failing test for MII module configuration):** `b930c7d` (test)
2. **Task 1 — GREEN (MII modules + PatientsLayout + breadcrumb refactor + routes):** `1238f0c` (feat)
3. **Task 2 — PatientListPage with search and SearchControl:** `3980864` (feat)

_TDD flow: Task 1 started with the RED commit before implementation; Task 2 wrote the test alongside the component per plan instructions (`type="auto"`, no `tdd="true"` on Task 2)._

## Files Created/Modified

- `src/utils/mii-modules.ts` — `MiiModule` interface + `MII_MODULES` array (6 entries) consumed by future tabs/timeline/FHIR view. **Created.**
- `src/components/patients/PatientsLayout.tsx` — Connection-gated layout with `PatientsOutletContext` + `MedplumProvider`. **Created.**
- `src/components/patients/PatientListPage.tsx` — Full patient search page: three TextInputs, Search button, SearchControl, PaginationControls, Browse Patients empty state, error alert. **Created.**
- `src/__tests__/mii-modules.test.ts` — 10 tests covering shape, count, and per-module mapping. **Created.**
- `src/__tests__/patient-list.test.tsx` — 6 tests covering heading, field labels, placeholders, submit button, and empty state (SearchControl mocked). **Created.**
- `src/hooks/useBreadcrumbTrail.ts` — Added `basePath` parameter (default `/explorer`) so patient routes can reuse the hook. **Modified.**
- `src/App.tsx` — Replaced `PatientsPage` placeholder function with nested `/patients` routes under `PatientsLayout` (`index` -> `PatientListPage`). **Modified.**

## Decisions Made

- **Breadcrumb hook: parameterize, don't duplicate.** Added optional `basePath` to `useBreadcrumbTrail` instead of creating a sibling hook for patient context. Default `/explorer` keeps Phase 2 callers working untouched; Plan 02 will pass `/patients/${patientId}` from patient-scoped pages. This directly addresses Research Pitfall 5.
- **MII module `patientSearchParam` is a per-module field.** All six entries currently use `patient`, but the schema allows a future module (or Blaze-specific override) to use `subject` without touching tab-rendering code. Mitigates Research Pitfall 1.
- **`searchTriggered` gate prevents accidental unfiltered loads.** Against a 50K+ resource Blaze server, unconditionally mounting `SearchControl` on `/patients` would issue an immediate unfiltered `Patient` search. The gate defers the query until the user explicitly presses "Search Patients" or submits with Enter.
- **Reuse `PaginationControls`.** The Phase 2 component already handles `self`/`next`/`previous` link parsing and offset extraction; wiring it in costs one import and a `client.get(url)` handler.

## Deviations from Plan

None — plan executed exactly as written. Task 1 additionally created a minimal `PatientListPage` placeholder file so `App.tsx`'s import resolved after Task 1 completed; Task 2 replaced the placeholder with the full implementation as planned. This is not a deviation — it is ordering within the same plan and both files were ultimately delivered per spec.

## Issues Encountered

- **Pre-existing TypeScript errors surfaced by `tsc -b`.** Running `npx tsc -b --noEmit` for diligence revealed 6 pre-existing errors in Phase 1/2 files (display-modes.test.tsx unused import, json-highlight.test.ts unused import, resource-type-landing-counts.test.tsx `global` reference, ResourceDetailPage string→ResourceType narrowing, two SearchResultsPage `Record<string, unknown>` casts). Per the scope boundary rule (only auto-fix issues directly caused by the current task's changes), these were **not** modified — they predate this plan. Logged here for visibility; they are out of scope for Plan 03-01 and should be addressed by a dedicated tech-debt task or Plan 03-02/03 if those files are touched.
- **`ResizeObserver` / `matchMedia` jsdom polyfills needed in `patient-list.test.tsx`.** Mantine's components require them; copied the established polyfill pattern from `resource-type-landing-counts.test.tsx` rather than introducing a shared setup file (matches existing codebase convention — no global test setup file is configured in `vitest.config.ts`).

## User Setup Required

None — no external service configuration needed. The patient list page consumes the FHIR server already configured via `settings.yaml` in Phase 1.

## Verification

- `npx vitest run src/__tests__/mii-modules.test.ts` — 10/10 passing
- `npx vitest run src/__tests__/patient-list.test.tsx` — 6/6 passing
- `npx vitest run src/__tests__/search-state.test.ts` — 8/8 passing (breadcrumb refactor did not break existing tests)
- `npx vitest run` (full suite) — 88 passed, 22 todo, 0 failed across 12 test files

## Threat Flags

None — no new security surface introduced beyond the plan's threat model (T-03-01 mitigated via SearchControl's internal FHIR parameter encoding; T-03-02 accepted per plan).

## Next Plan Readiness

- `/patients` route tree is live with a working list page. Plan 02 can layer `:patientId` and the patient detail page directly under `PatientsLayout`.
- `MII_MODULES` is exported and ready to drive the MII tab bar in Plan 02.
- `useBreadcrumbTrail(basePath)` refactor means Plan 02's patient-scoped `ResourceDetailPage` usage can pass `/patients/${patientId}` and keep reference clicks inside patient context.
- `PatientsOutletContext` is the contract future patient pages will consume via `useOutletContext<PatientsOutletContext>()`.

No blockers.

---
*Phase: 03-patient-centric-browsing-mii-modules*
*Completed: 2026-04-12*

## Self-Check: PASSED

Files verified:
- FOUND: src/utils/mii-modules.ts
- FOUND: src/components/patients/PatientsLayout.tsx
- FOUND: src/components/patients/PatientListPage.tsx
- FOUND: src/__tests__/mii-modules.test.ts
- FOUND: src/__tests__/patient-list.test.tsx
- FOUND: src/hooks/useBreadcrumbTrail.ts (modified)
- FOUND: src/App.tsx (modified)

Commits verified:
- FOUND: b930c7d (test: RED for MII modules)
- FOUND: 1238f0c (feat: MII modules + PatientsLayout + breadcrumb refactor)
- FOUND: 3980864 (feat: PatientListPage)
