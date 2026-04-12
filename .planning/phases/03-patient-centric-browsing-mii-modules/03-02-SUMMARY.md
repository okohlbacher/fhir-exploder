---
phase: 03-patient-centric-browsing-mii-modules
plan: 02
subsystem: ui
tags: [react, react-router, medplum, mantine, fhir, patient, mii-kerndatensatz, typescript]

# Dependency graph
requires:
  - phase: 03-patient-centric-browsing-mii-modules
    plan: 01
    provides: PatientsLayout/PatientsOutletContext, MII_MODULES config, parameterized useBreadcrumbTrail, /patients route tree
  - phase: 02-resource-explorer
    provides: ResourceDetailPage (reused for patient-scoped resource detail), SearchControl usage pattern, PaginationControls
provides:
  - PatientDetailPage at /patients/:patientId (PatientHeader + MII/FHIR toggle + tab container)
  - MiiModuleTabs (six German-labelled MII tabs + Zeitleiste placeholder, keepMounted)
  - MiiModuleTab (patient-scoped SearchControl per module; patient-context row click navigation)
  - FhirResourcesView (CapabilityStatement-driven patient-linked type discovery, counts, expandable SearchControl rows)
  - /patients/:patientId and /patients/:patientId/:resourceType/:id nested routes ready for Plan 03 (timeline)
affects: [03-03 (clinical timeline tab replaces Zeitleiste placeholder)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SegmentedControl-based view mode toggle with component-local state (session persistence per D-10)"
    - "Mantine Tabs with keepMounted on panels to eliminate tab-switch refetch (Pitfall 4 mitigation)"
    - "CapabilityStatement-driven patient-linked resource type discovery with patient/subject param fallback"
    - "Per-type count fetching via `{param}=Patient/{id}&_summary=count` with loading/error tri-state"
    - "Collapse-expansion-on-demand SearchControl mount for patient-scoped resource drill-down"
    - "Patient-context row-click navigation (`/patients/:patientId/:resourceType/:id`) reusing Phase 2 ResourceDetailPage"

key-files:
  created:
    - src/components/patients/PatientDetailPage.tsx
    - src/components/patients/MiiModuleTabs.tsx
    - src/components/patients/MiiModuleTab.tsx
    - src/components/patients/FhirResourcesView.tsx
    - src/__tests__/patient-detail.test.tsx
    - src/__tests__/patient-view-toggle.test.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Reuse Phase 2 ResourceDetailPage unchanged for patient-context resource detail rather than forking -- breadcrumbs inside reused view still use /explorer/ prefix, which is acceptable for this plan and can be tightened later if needed. Keeps Plan 02 scope focused."
  - "Hide FHIR Resources view rows with count 0 per D-09 (don't show empty types); keep loading/error rows visible so users see fetch progress"
  - "Prefer `patient` param over `subject` when both are present in CapabilityStatement (paramByType fallback map)"
  - "Medikation defaults to MedicationStatement per D-05; if only MedicationRequest data exists, user toggles to FHIR Resources view. Sub-toggle deferred (Pitfall 6)"
  - "Zeitleiste tab rendered as placeholder in Plan 02 (owned by Plan 03) -- this keeps the tab bar feature-complete with the final copy and color, and Plan 03 only needs to replace one panel"

patterns-established:
  - "SegmentedControl for view-mode toggles with component-local state (viewMode: 'mii' | 'fhir')"
  - "Patient-linked type discovery pattern: filter capability.rest[0].resource by searchParam name 'patient' or 'subject'"
  - "Count + expand pattern: show counts first, mount SearchControl lazily on row click via Mantine Collapse"
  - "Chevron icon flip (IconChevronRight <-> IconChevronDown) for expansion state (stable test signal)"

requirements-completed: [PTNT-02, PTNT-03, PTNT-05]

# Metrics
duration: ~6min
completed: 2026-04-12
---

# Phase 03 Plan 02: Patient Detail Page + MII Module Tabs + FHIR Resources View Summary

**Patient detail page with Medplum PatientHeader, SegmentedControl MII/FHIR toggle, six MII Kerndatensatz module tabs driving patient-scoped SearchControl, and CapabilityStatement-discovered FHIR Resources view with per-type counts and expandable drill-down.**

## Performance

- **Duration:** ~6 min (354 s measured between plan start and Task 2 commit)
- **Started:** 2026-04-12T05:53:25Z
- **Completed:** 2026-04-12T05:59:19Z
- **Tasks:** 2 (both `type="auto"`, no TDD flag)
- **Files created/modified:** 7

## Accomplishments

- `/patients/:patientId` now renders a full patient detail page: breadcrumbs (Patients > {name}), Medplum `PatientHeader` banner, SegmentedControl MII/FHIR toggle defaulting to MII Modules (D-10), loading skeletons, and UI-SPEC error states (Patient not found / load failure) keyed off `client.readResource('Patient', id)` outcomes.
- Six MII Kerndatensatz module tabs render with German labels and FHIR-type subtitles per D-05 (Diagnose/Prozedur/Laborbefund/Medikation/Fall/Consent) plus a Zeitleiste placeholder, each backed by a patient-scoped `SearchControl` whose row click navigates to `/patients/:patientId/:resourceType/:id` (patient-context drill-down, D-06).
- FHIR Resources view (D-09) discovers patient-linked resource types from the server's `CapabilityStatement` (patient or subject param), fetches per-type counts via `{param}=Patient/{id}&_summary=count`, hides empty types, and renders non-zero types as expandable rows. Clicking a row mounts a patient-scoped SearchControl with count=10 whose row click navigates to the patient-scoped resource detail URL.
- Nested `/patients/:patientId/:resourceType/:id` route reuses the Phase 2 `ResourceDetailPage` unchanged, so clicking any patient-scoped resource row lands on the established three-mode detail view with reference interception and display-mode tabs.

## Task Commits

1. **Task 1 — PatientDetailPage + MiiModuleTabs + MiiModuleTab + FhirResourcesView stub + App routes + patient-detail.test.tsx (6 tests):** `920d855` (feat)
2. **Task 2 — Full FhirResourcesView implementation + patient-view-toggle.test.tsx (7 tests):** `f37cf56` (feat)

## Files Created/Modified

- `src/components/patients/PatientDetailPage.tsx` — Fetches `Patient/{id}`, renders breadcrumbs + `PatientHeader` + SegmentedControl + conditional `MiiModuleTabs` / `FhirResourcesView`; handles loading skeleton and error states with UI-SPEC copy. **Created.**
- `src/components/patients/MiiModuleTabs.tsx` — Mantine Tabs with six MII module tabs (germanLabel + fhirResourceType subtitle) and a Zeitleiste placeholder; uses `keepMounted` on both the root `Tabs` and each `Tabs.Panel` so switching tabs never refetches data (Pitfall 4). **Created.**
- `src/components/patients/MiiModuleTab.tsx` — Single module tab rendering a SearchControl with `filters: [{ code: module.patientSearchParam, operator: 'eq', value: 'Patient/{id}' }]`, row click navigates to patient-context detail URL, empty state displays "No {germanLabel} data found for this patient." **Created.**
- `src/components/patients/FhirResourcesView.tsx` — Discovers patient-linked types from capability, per-type count fetching with tri-state (`loading` / number / `'error'`), hides zero-count rows (D-09), expandable `Paper` rows with chevron indicator and `Collapse`-hosted patient-scoped `SearchControl`. **Created.**
- `src/App.tsx` — Imports `PatientDetailPage`; adds nested routes `:patientId` and `:patientId/:resourceType/:id` under `/patients` -> `PatientsLayout`, reusing the Phase 2 `ResourceDetailPage`. **Modified.**
- `src/__tests__/patient-detail.test.tsx` — 6 tests: component export, loading skeleton, post-load render (PatientHeader + SegmentedControl + MII tabs), default view = MII, Patient-not-found alert, generic load-failure alert. Mantine polyfills (ResizeObserver, matchMedia) and mocks for react-router-dom, `@medplum/react`, `@medplum/react-hooks`. **Created.**
- `src/__tests__/patient-view-toggle.test.tsx` — 7 tests: component export, capability-driven row rendering, patient-vs-subject param selection, zero-count filtering, expansion toggle via chevron flip, empty state when no linked types, empty state when all counts are zero. **Created.**

## Decisions Made

- **Reuse Phase 2 `ResourceDetailPage` unchanged for patient-context resource detail.** The plan explicitly accepts that `useBreadcrumbTrail` inside the reused page still defaults to `/explorer/` when invoked from patient context; tightening this is out of scope for Plan 02 and would add coupling without clear user benefit for the current flow (the patient-context row click already lands on the right URL via `navigate()`, and the Back/breadcrumb inside the detail page can follow up with a dedicated refinement plan if needed).
- **Hide zero-count types in FHIR Resources view.** D-09 explicitly says empty types are hidden. Loading and error rows stay visible so the user sees in-flight progress and partial failures, but once a count resolves to 0 that type is removed from the list. This keeps the view focused on what the patient actually has.
- **Prefer `patient` over `subject` when CapabilityStatement lists both.** Observation (and some others) accept both; choosing `patient` matches the MII modules' own `patientSearchParam` hardcoded defaults, keeping behaviour consistent between the MII view and the FHIR Resources view.
- **Zeitleiste tab is a placeholder in Plan 02.** Keeping the tab bar feature-complete with the final German label and dimmed `Timeline` subtitle means Plan 03 only has to swap the placeholder panel content for the real timeline — no tab bar changes required.
- **Medikation defaults to MedicationStatement per D-05.** A MedicationRequest sub-toggle was considered (Pitfall 6 mitigation) but deferred: users can already see MedicationRequest data via the FHIR Resources view. Adding a sub-toggle on the Medikation tab is a pure UX enhancement and doesn't affect correctness for this plan's goal.

## Deviations from Plan

None — plan executed exactly as written. Two minor implementation details worth noting (not deviations):

1. **Task 1 created a minimal `FhirResourcesView.tsx` stub** so `PatientDetailPage` imports resolved when Task 1 was committed; Task 2 replaced the stub with the full implementation as planned. Same pattern used in Plan 01 (PatientListPage placeholder). This is intentional ordering within the plan, not a deviation.
2. **Expansion-toggle test asserts chevron icon flip rather than Mantine Collapse internal style.** Mantine's `Collapse` keeps its child mounted and transitions `height`/`display` via animation frames that don't settle synchronously in jsdom. The chevron icon is controlled by synchronous React state (`isExpanded ? <IconChevronDown /> : <IconChevronRight />`), so it's a reliable test signal for the expansion state. The user-visible behaviour (click -> row expands) remains the verified contract.

## Issues Encountered

- **Mantine Collapse expansion state is not testable via inline style in jsdom.** Animation-driven style changes don't settle synchronously. Resolved by asserting the chevron icon class (`tabler-icon-chevron-right` vs `tabler-icon-chevron-down`), which is driven by synchronous React state. Documented as a test pattern for future expandable-row components.
- **Unstable client reference caused infinite useEffect loop in tests.** Initial `vi.mock('@medplum/react-hooks', () => ({ useMedplum: () => ({ readResource: mockReadResource }) }))` returned a new object on every render, retriggering `PatientDetailPage`'s fetch effect and keeping it stuck in `loading`. Fixed by hoisting a stable `mockClient` object once; pattern now matches `patient-list.test.tsx`. Worth encoding in a shared test utility if more patient-scoped pages need this setup.

## User Setup Required

None — the patient detail page consumes the FHIR server already configured via `settings.yaml` in Phase 1 and the connection state established by `PatientsLayout`.

## Verification

- `npx vitest run src/__tests__/patient-detail.test.tsx` — 6/6 passing
- `npx vitest run src/__tests__/patient-view-toggle.test.tsx` — 7/7 passing
- `npx vitest run` (full suite) — 101 passed, 22 todo, 0 failed across 14 test files (previously 94 passed with 12 test files; +13 new tests across 2 new test files)

Acceptance-criteria grep spot checks (all present):

- `PatientDetailPage.tsx`: `PatientHeader`, `<SegmentedControl`, `{ label: 'MII Modules', value: 'mii' }`, `{ label: 'FHIR Resources', value: 'fhir' }`, `useState<ViewMode>('mii')`
- `MiiModuleTabs.tsx`: `MII_MODULES.map`, `germanLabel`, `fhirResourceType`, `Zeitleiste`
- `MiiModuleTab.tsx`: `SearchControl`, `module.patientSearchParam`, `navigate(\`/patients/${patientId}/`
- `FhirResourcesView.tsx`: `capability.rest`, `_summary=count`, `Patient/${patientId}`, `No linked resources found for this patient`, `SearchControl`, `color="blue"`, `navigate(\`/patients/${patientId}/`
- `App.tsx`: `path=":patientId"` with `PatientDetailPage`, `path=":patientId/:resourceType/:id"` with `ResourceDetailPage`

## Threat Flags

None — the three threats in the plan's register (T-03-03 patientId tampering, T-03-04 module search filter tampering, T-03-05 FhirResourcesView reference navigation) are all mitigated per plan:

- patientId from URL params flows to `client.readResource('Patient', id)`; invalid IDs surface as error-state alerts with UI-SPEC copy.
- Module search filter value is `Patient/${patientId}` (URL-supplied ID), param name comes from hardcoded MII_MODULES config, and SearchControl/MedplumClient encode parameter values when executing the FHIR search.
- FhirResourcesView resource type comes from the server's CapabilityStatement (server-provided), resource ID from SearchControl click events (server-provided); the navigated URL feeds the reused Phase 2 ResourceDetailPage which validates extracted references via `isValidFhirReference` (T-02-08 pattern).

No new attack surface introduced beyond the threat register.

## Next Plan Readiness

- `/patients/:patientId` is live with working MII tabs and the FHIR Resources toggle. Plan 03 (clinical timeline) can replace the `Zeitleiste` Tabs.Panel placeholder in `MiiModuleTabs.tsx` with a real `ClinicalTimeline` component without touching the tab bar, breadcrumbs, or view toggle.
- `usePatientLinkedTypes` helper and the `{param}=Patient/{id}&_summary=count` query pattern are now in the codebase and can be reused by the timeline to discover which resource types to aggregate.
- `PatientsOutletContext` continues to provide `capability` and `client` to any page added under `/patients`, so Plan 03's timeline can get both without new plumbing.

No blockers.

---
*Phase: 03-patient-centric-browsing-mii-modules*
*Completed: 2026-04-12*

## Self-Check: PASSED

Files verified:
- FOUND: src/components/patients/PatientDetailPage.tsx
- FOUND: src/components/patients/MiiModuleTabs.tsx
- FOUND: src/components/patients/MiiModuleTab.tsx
- FOUND: src/components/patients/FhirResourcesView.tsx
- FOUND: src/__tests__/patient-detail.test.tsx
- FOUND: src/__tests__/patient-view-toggle.test.tsx
- FOUND: src/App.tsx (modified)

Commits verified:
- FOUND: 920d855 (feat: PatientDetailPage + MII module tabs + routes)
- FOUND: f37cf56 (feat: FhirResourcesView with patient-scoped counts)
