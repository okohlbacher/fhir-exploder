---
phase: 03-patient-centric-browsing-mii-modules
verified: 2026-04-12T08:15:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 03: Patient-Centric Browsing & MII Modules Verification Report

**Phase Goal:** Users can find patients and explore their clinical data organized by MII Kerndatensatz modules, with an optional MII lens alongside raw FHIR browsing
**Verified:** 2026-04-12T08:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | User can view a patient list and search by name, identifier, or birthDate | VERIFIED | `PatientListPage.tsx` has TextInput labels "Name", "Identifier", "Birth Date" and builds a `SearchRequest` with FHIR params `name`, `identifier`, `birthdate`. `SearchControl` mounts on submit. |
| SC-2 | User can open a patient and see all their clinical data organized by category on a detail page | VERIFIED | `PatientDetailPage.tsx` calls `client.readResource('Patient', patientId)`, renders `PatientHeader` banner, and conditionally renders `MiiModuleTabs` or `FhirResourcesView`. |
| SC-3 | User can navigate a patient's data using MII Kerndatensatz module tabs (Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent) | VERIFIED | `MiiModuleTabs.tsx` maps `MII_MODULES` (6 entries) to `Tabs.Tab` with `mod.germanLabel` as label and `mod.fhirResourceType` as subtitle. Each panel renders `MiiModuleTab` with a patient-scoped `SearchControl`. |
| SC-4 | User can view a chronological timeline of a patient's encounters, conditions, procedures, and observations | VERIFIED | `ClinicalTimeline.tsx` calls `client.searchResources` for all four types in parallel, extracts dates via `extractDate`, sorts `b.date.localeCompare(a.date)` descending, renders `TimelineEntry` stack. `MiiModuleTabs.tsx` Zeitleiste panel contains `<ClinicalTimeline patientId={patientId} />` (no placeholder text). |
| SC-5 | User can toggle between MII Kerndatensatz module navigation and raw FHIR resource type browsing for a patient | VERIFIED | `PatientDetailPage.tsx` has `SegmentedControl` with `data={[{ label: 'MII Modules', value: 'mii' }, { label: 'FHIR Resources', value: 'fhir' }]}`, `useState<ViewMode>('mii')` default, and conditional render of `MiiModuleTabs` vs `FhirResourcesView`. |
| MH-01-1 | User can navigate to /patients from sidebar and see a patient list page | VERIFIED | `App.tsx` line 56: `<Route path="/patients" element={<PatientsLayout />}>` with `<Route index element={<PatientListPage />} />`. Sidebar link assumed present from Phase 1 AppLayout (not modified here). |
| MH-01-2 | User can search patients by name, identifier, and birthDate | VERIFIED | `PatientListPage.tsx` three `TextInput` fields + "Search Patients" button build a `SearchRequest` with appropriate FHIR filter codes. |
| MH-01-3 | Patient list displays name, birthDate, gender, identifier columns | VERIFIED | `searchRequest` includes `fields: ['name', 'birthDate', 'gender', 'identifier']`. |
| MH-01-4 | Clicking a patient row navigates to /patients/:patientId | VERIFIED | `handleClick` in `PatientListPage.tsx`: `navigate('/patients/${resource.id}')`. |
| MH-01-5 | Breadcrumb hook supports both /explorer/ and /patients/ base paths | VERIFIED | `useBreadcrumbTrail.ts`: `export function useBreadcrumbTrail(basePath: string = '/explorer')` with `${basePath}/` in navigate calls. |
| MH-02/03 | FHIR Resources view shows all resource types linked to the patient with counts | VERIFIED | `FhirResourcesView.tsx` uses `capability.rest[0].resource` to discover patient/subject-linked types, fetches `{param}=Patient/{id}&_summary=count`, renders `Badge color="blue"` with count per non-zero type. |
| MH-03 | Each timeline entry shows date, color-coded type badge, and resource summary | VERIFIED | `TimelineEntry.tsx` renders 100px date column, `Paper` with `borderLeft: 3px solid var(--mantine-color-${entry.color}-6)`, `Badge color={entry.color} variant="light"` with `{entry.typeLabel}`, and `{entry.summary}` text. |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/mii-modules.ts` | MiiModule interface + MII_MODULES array (6 entries) | VERIFIED | 6 entries: diagnose/Condition/teal, prozedur/Procedure/violet, laborbefund/Observation/cyan, medikation/MedicationStatement/orange, fall/Encounter/indigo, consent/Consent/pink |
| `src/components/patients/PatientsLayout.tsx` | Connection-gated layout with PatientsOutletContext + MedplumProvider | VERIFIED | Checks `state.status !== 'connected'`, wraps `<MedplumProvider medplum={state.client}>` with typed `Outlet context` |
| `src/components/patients/PatientListPage.tsx` | Patient search and list page | VERIFIED | Three TextInputs, "Search Patients" button, `searchTriggered` gate, `SearchControl`, `PaginationControls`, "Browse Patients" empty state |
| `src/components/patients/PatientDetailPage.tsx` | Patient detail page with header, toggle, tab container | VERIFIED | `PatientHeader`, `SegmentedControl` (default 'mii'), conditional `MiiModuleTabs`/`FhirResourcesView`, loading skeletons, error states per UI-SPEC copy |
| `src/components/patients/MiiModuleTabs.tsx` | MII tab bar with German labels and Zeitleiste | VERIFIED | Maps `MII_MODULES`, `keepMounted`, Zeitleiste tab renders `<ClinicalTimeline patientId={patientId} />` (Plan 02 placeholder removed) |
| `src/components/patients/MiiModuleTab.tsx` | Single module tab with patient-scoped SearchControl | VERIFIED | `SearchRequest` with `patient=Patient/{id}` filter, row click `navigate('/patients/${patientId}/${resourceType}/${id}')`, empty state per UI-SPEC copy |
| `src/components/patients/FhirResourcesView.tsx` | Patient-linked type discovery with counts and expandable rows | VERIFIED | `usePatientLinkedTypes`, `_summary=count` fetches, `Collapse`-based expansion, `Badge color="blue"`, navigate to patient-context detail |
| `src/components/patients/ClinicalTimeline.tsx` | Aggregated clinical timeline (4 types) | VERIFIED | `Promise.all` over Encounter/Condition/Procedure/Observation, per-type `.catch(()=>[])`, `extractDate`, `extractSummary`, descending sort, 5 loading skeletons, error Alert, empty state copy |
| `src/components/patients/TimelineEntry.tsx` | Single timeline entry card | VERIFIED | 100px date column, color-coded left-border Paper, `Badge color={entry.color} variant="light"`, `{resourceType}/{resourceId}` footer |
| `src/utils/timeline-utils.ts` | Date extraction, summary extraction, TimelineData interface | VERIFIED | Full fallback chains: Condition (onsetDateTime→recordedDate→onsetPeriod.start), Encounter (period.start), Procedure (performedDateTime→performedPeriod.start), Observation (effectiveDateTime→effectivePeriod.start→issued) |
| `src/App.tsx` | Updated routes with /patients nested routes | VERIFIED | `/patients` → `PatientsLayout` > index `PatientListPage`, `:patientId` → `PatientDetailPage`, `:patientId/:resourceType/:id` → `ResourceDetailPage` |
| `src/hooks/useBreadcrumbTrail.ts` | basePath parameter (default /explorer) | VERIFIED | `export function useBreadcrumbTrail(basePath: string = '/explorer')` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx` | `PatientsLayout.tsx` | Route element | VERIFIED | `<Route path="/patients" element={<PatientsLayout />}>` |
| `PatientsLayout.tsx` | `ConnectionContext.tsx` | `useConnection` hook | VERIFIED | `const { state } = useConnection()` on line 26 |
| `PatientListPage.tsx` | `@medplum/react SearchControl` | SearchControl component | VERIFIED | `import { SearchControl } from '@medplum/react'` + `<SearchControl search={searchRequest} ...>` |
| `PatientDetailPage.tsx` | `@medplum/react PatientHeader` | PatientHeader component | VERIFIED | `import { PatientHeader } from '@medplum/react'` + `<PatientHeader patient={patient} />` |
| `MiiModuleTab.tsx` | FHIR server | SearchControl with patient filter | VERIFIED | Filter: `{ code: module.patientSearchParam, operator: 'eq', value: 'Patient/${patientId}' }` |
| `App.tsx` | `PatientDetailPage.tsx` | Route :patientId | VERIFIED | `<Route path=":patientId" element={<PatientDetailPage />} />` |
| `ClinicalTimeline.tsx` | FHIR server | searchResources for 4 types | VERIFIED | `Promise.all(TIMELINE_RESOURCE_TYPES.map(type => client.searchResources(type, 'patient=Patient/${patientId}&_count=100&_sort=-date')))` |
| `MiiModuleTabs.tsx` | `ClinicalTimeline.tsx` | Zeitleiste tab panel import | VERIFIED | `import { ClinicalTimeline } from './ClinicalTimeline'` + `<ClinicalTimeline patientId={patientId} />` in Zeitleiste panel |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `PatientListPage.tsx` | `bundle` (SearchControl results) | `SearchControl` → Medplum FHIR client → Blaze server | Yes — `SearchControl` executes FHIR search; `onLoad` writes bundle to state | FLOWING |
| `PatientDetailPage.tsx` | `patient` (Patient resource) | `client.readResource('Patient', patientId)` → Blaze server | Yes — real HTTP call; result sets `patient` state | FLOWING |
| `MiiModuleTab.tsx` | SearchControl results | `SearchControl` with `patient=Patient/{id}` filter → Blaze server | Yes — patient-scoped FHIR search via SearchControl | FLOWING |
| `FhirResourcesView.tsx` | `counts` per resource type | `client.search(type, '{param}=Patient/{id}&_summary=count')` → Blaze | Yes — real count queries; results set `counts` state | FLOWING |
| `ClinicalTimeline.tsx` | `entries: TimelineData[]` | `client.searchResources(type, ...)` for 4 types → Blaze | Yes — 4 parallel real FHIR searches; results merged into `entries` | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `extractDate` returns onsetDateTime for Condition | `npx vitest run src/__tests__/clinical-timeline.test.tsx` | 19/19 passing | PASS |
| Timeline sort: `b.date.localeCompare(a.date)` descending | Same test file | Covered by sort test | PASS |
| `extractSummary` falls back to resourceType | Same test file | 7 extractSummary tests pass | PASS |
| `formatTimelineDate` truncates ISO to YYYY-MM-DD | Same test file | 2 formatTimelineDate tests pass | PASS |
| Full test suite | `npx vitest run` | 120 passed, 22 todo, 0 failed across 15 test files | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PTNT-01 | 03-01 | User can view a list of patients with search by name, identifier, and birthDate | SATISFIED | `PatientListPage.tsx` + `/patients` route + `SearchControl` with Patient fields + name/identifier/birthdate filters |
| PTNT-02 | 03-02 | User can view a patient detail page showing all clinical data organized by category | SATISFIED | `PatientDetailPage.tsx` at `:patientId` with `PatientHeader` + `MiiModuleTabs` organizing by MII module categories |
| PTNT-03 | 03-02 | User can navigate a patient's clinical data using MII Kerndatensatz module tabs | SATISFIED | `MiiModuleTabs.tsx` with 6 module tabs from `MII_MODULES`; each tab shows patient-scoped resources via `MiiModuleTab` + `SearchControl` |
| PTNT-04 | 03-03 | User can view a chronological clinical timeline of a patient's encounters, conditions, procedures, and observations | SATISFIED | `ClinicalTimeline.tsx` + `TimelineEntry.tsx` + `timeline-utils.ts`; 4 resource types fetched in parallel, sorted descending, rendered in Zeitleiste tab |
| PTNT-05 | 03-02 | MII Kerndatensatz modules are available as an optional navigation lens alongside raw FHIR resource type browsing | SATISFIED | `SegmentedControl` in `PatientDetailPage` toggles between `MiiModuleTabs` and `FhirResourcesView`; FHIR view discovers all patient-linked types from CapabilityStatement |

All 5 PTNT requirements marked Complete in `REQUIREMENTS.md` traceability table. Code evidence confirms each is implemented.

---

### Anti-Patterns Found

No blockers or warnings identified.

Notes:
- Pre-existing TypeScript errors in Phase 1/2 files (display-modes.test.tsx unused import, json-highlight.test.ts unused import, resource-type-landing-counts.test.tsx global reference, ResourceDetailPage string→ResourceType narrowing, SearchResultsPage Record casts) are pre-existing and out of scope for Phase 3. Logged in 03-01-SUMMARY.md.
- The reused Phase 2 `ResourceDetailPage` at `/patients/:patientId/:resourceType/:id` uses `useBreadcrumbTrail()` without a `basePath` argument, so reference-navigation breadcrumbs within patient-context resource detail pages navigate to `/explorer/` URLs rather than `/patients/` URLs. This is an accepted known deviation documented in 03-02-SUMMARY.md and 03-02-PLAN.md. No user-facing breakage: the resource loads and displays correctly; only breadcrumb navigation within that detail page takes the user to the Explorer context. Future enhancement candidate.

---

### Human Verification

Task 2 of Plan 03-03 included a `checkpoint:human-verify` gate (blocking) that the user completed before phase completion. The user executed a 12-step end-to-end walkthrough against a live Blaze connection and responded: **"approved — all flows work."**

Flows verified by user:
1. Patient list page loads from sidebar
2. Name search returns filtered results
3. Patient row click shows PatientHeader with name, DOB, gender
4. SegmentedControl defaults to "MII Modules"
5. Six MII module tabs visible (Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent) plus Zeitleiste
6. Each tab loads patient-scoped resources
7. Zeitleiste shows timeline entries sorted newest-first
8. Timeline entry click opens resource detail view
9. "FHIR Resources" toggle shows resource types with counts
10. Expanding a resource type shows patient-scoped table
11. Breadcrumb / browser back returns to patient list
12. All flows approved

No additional human verification is required.

---

### Gaps Summary

None. All 12 must-haves are verified at all four levels (exists, substantive, wired, data flowing). The known deviation about ResourceDetailPage breadcrumbs using `/explorer/` prefix in patient context is an accepted design decision documented in the plan and summary — not a gap.

---

_Verified: 2026-04-12T08:15:00Z_
_Verifier: Claude (gsd-verifier)_
