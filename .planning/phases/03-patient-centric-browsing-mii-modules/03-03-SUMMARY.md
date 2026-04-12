---
phase: 03-patient-centric-browsing-mii-modules
plan: 03
subsystem: ui
tags: [react, medplum, mantine, fhir, patient, mii-kerndatensatz, timeline, typescript]

# Dependency graph
requires:
  - phase: 03-patient-centric-browsing-mii-modules
    plan: 01
    provides: MII_MODULES config (germanLabel/badgeColor/fhirResourceType mapping for typeLabel + color on timeline entries)
  - phase: 03-patient-centric-browsing-mii-modules
    plan: 02
    provides: MiiModuleTabs with Zeitleiste placeholder panel, PatientDetailPage mounting MiiModuleTabs, nested /patients/:patientId/:resourceType/:id route (timeline entry click target)
provides:
  - ClinicalTimeline component that aggregates Encounter/Condition/Procedure/Observation for a patient in chronological order
  - TimelineEntry card component (date column + color-coded left-border Paper + badge + summary + resourceType/id footer)
  - timeline-utils (extractDate, extractSummary, formatTimelineDate, TimelineData interface) with full FHIR date-field fallback coverage
  - Zeitleiste tab now renders the real timeline instead of the Plan 02 placeholder
affects: []  # end of phase 03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-resource-type parallel fetch with per-type catch → [] fallback so one failing type does not break the timeline (Promise.all + .catch)"
    - "FHIR date-field fallback chain per resource type (onsetDateTime → recordedDate → onsetPeriod.start; performedDateTime → performedPeriod.start; effectiveDateTime → effectivePeriod.start → issued) — Research Pitfall 3 mitigation"
    - "Merge-and-sort timeline pattern: flat() → map to TimelineData → filter out entries with no extractable date → sort descending via b.date.localeCompare(a.date)"
    - "Color-coded left-border Paper (3px solid var(--mantine-color-{color}-6)) keyed off MII_MODULES.badgeColor for consistent resource-type visual language across tabs and timeline"
    - "Click-to-navigate on timeline entry routes through existing /patients/:patientId/:resourceType/:id (Plan 02) — reuses Phase 2 ResourceDetailPage unchanged"

key-files:
  created:
    - src/utils/timeline-utils.ts
    - src/components/patients/ClinicalTimeline.tsx
    - src/components/patients/TimelineEntry.tsx
    - src/__tests__/clinical-timeline.test.tsx
  modified:
    - src/components/patients/MiiModuleTabs.tsx

key-decisions:
  - "Per-type fetch error isolation: each of the 4 searchResources calls has .catch(() => []) so one unsupported/failing resource type does not blank the whole timeline. Error state is only shown if ALL four throw (tracked via a rejection flag)."
  - "Entries without extractable dates are filtered out rather than shown with 'Unknown date' — keeps the chronological view strictly chronological. T-03-08 accepted the display risk of malformed dates; here we go one step further and simply omit them from the ordering."
  - "Sort via b.date.localeCompare(a.date) instead of Date-parsing: ISO date strings sort lexicographically in chronological order, avoiding timezone edge cases and parse overhead for up to 400 entries (4 × _count=100)."
  - "_count=100 per resource type (hard cap): enough headroom for typical patients while bounding memory and render cost. Pagination of the timeline is out of scope for v1 per UI-SPEC."
  - "Date column fixed at 100px width per UI-SPEC timeline entry structure — predictable alignment across entries regardless of summary length."

patterns-established:
  - "timeline-utils.ts pattern for FHIR resource date/summary extraction — reusable if data quality phase (Phase 5) needs resource-level date introspection"
  - "Parallel searchResources + per-type catch fallback — candidate for other multi-type aggregations"

requirements-completed: [PTNT-04]

# Metrics
duration: ~4min
completed: 2026-04-12
---

# Phase 03 Plan 03: Clinical Timeline Summary

**Aggregated clinical timeline component that fetches Encounter/Condition/Procedure/Observation in parallel, merges them with FHIR-field date/summary extraction, sorts descending by date, and renders color-coded entries inside the Zeitleiste tab of the MII module tab bar.**

## Performance

- **Duration:** ~4 min (Task 1 TDD RED → GREEN; Task 2 human-verify checkpoint approved)
- **Started:** 2026-04-12T06:02:00Z (approx — first task commit at 08:04 local)
- **Completed:** 2026-04-12 (human-verify approval: "approved — all flows work")
- **Tasks:** 2 (Task 1 `type="auto"` with `tdd="true"`, Task 2 `type="checkpoint:human-verify"`)
- **Files created/modified:** 5

## Accomplishments

- `timeline-utils.ts` exports `extractDate`, `extractSummary`, `formatTimelineDate`, and the `TimelineData` interface — covering every FHIR date-field variation listed in RESEARCH.md Pitfall 3 (`Condition.onsetDateTime → recordedDate → onsetPeriod.start`; `Encounter.period.start`; `Procedure.performedDateTime → performedPeriod.start`; `Observation.effectiveDateTime → effectivePeriod.start → issued`).
- `ClinicalTimeline.tsx` fetches all four timeline resource types in parallel via `client.searchResources(type, 'patient=Patient/{id}&_count=100&_sort=-date')`, merges, extracts dates, drops entries without a date, sorts descending, and maps each to a `TimelineData` record (typeLabel/color from MII_MODULES).
- `TimelineEntry.tsx` renders each entry per UI-SPEC: 100px dimmed date column, 3px left-bordered `Paper` colored by resource type, badge + summary + resourceType/id footer. Clicking the Paper invokes the onClick that `ClinicalTimeline` wires to `navigate(/patients/{patientId}/{resourceType}/{resourceId})`, landing inside the patient-context resource detail (Plan 02 route).
- States per UI-SPEC Matrix all present: 5× `<Skeleton height={60} />` during loading, red `<Alert>` on complete fetch failure, dimmed `"No clinical events recorded for this patient."` empty state, and a `<Stack>` of entries otherwise.
- `MiiModuleTabs.tsx` Zeitleiste panel now renders `<ClinicalTimeline patientId={patientId} />` — the Plan 02 `<Text c="dimmed">Timeline (Plan 03)</Text>` placeholder is removed.
- Human-verify checkpoint (Task 2): user walked through the full 12-step end-to-end flow across Plans 01–03 (patient list → patient detail → MII tabs → Zeitleiste with sorted entries → click-to-detail → FHIR Resources toggle → drill-down) and approved: **"approved — all flows work."**

## Task Commits

1. **Task 1 — RED (failing tests for timeline utilities):** `dbffc68` (test)
2. **Task 1 — GREEN (ClinicalTimeline + TimelineEntry + timeline-utils + MiiModuleTabs wiring):** `9a7f2d0` (feat)
3. **Task 2 — Human-verify checkpoint:** approved by user (no code commit; verification-only gate).

## Files Created/Modified

- `src/utils/timeline-utils.ts` — `TimelineData` interface plus `extractDate`, `extractSummary`, `formatTimelineDate` with exhaustive switch-on-resourceType and fallback chains for the four timeline resource types. **Created.**
- `src/components/patients/ClinicalTimeline.tsx` — Props `{ patientId }`; `useMedplum` + `useNavigate`; state `entries / loading / error`; on-mount `Promise.all` over four `searchResources` calls (each with `.catch(() => [])`), flatten + map to `TimelineData` + filter undated + sort descending; renders loading skeletons / error alert / empty state / `Stack` of `TimelineEntry`. **Created.**
- `src/components/patients/TimelineEntry.tsx` — Props `{ entry, onClick }`; `<Group>` with `<Text w={100}>{formatTimelineDate(entry.date)}</Text>` date column and `<Paper withBorder style={{ borderLeft: '3px solid var(--mantine-color-{color}-6)', cursor: 'pointer', flex: 1 }} onClick={onClick}>` containing `<Badge color={entry.color} variant="light">{entry.typeLabel}</Badge>`, summary text, and `{resourceType}/{resourceId}` footer. **Created.**
- `src/__tests__/clinical-timeline.test.tsx` — 19 passing tests covering `extractDate` (8 cases incl. fallback order and undated), `extractSummary` (7 cases incl. code.text, coding.display, fallback), and `formatTimelineDate` (ISO → YYYY-MM-DD; date-only unchanged). **Created (RED in dbffc68, turns GREEN in 9a7f2d0).**
- `src/components/patients/MiiModuleTabs.tsx` — Imported `ClinicalTimeline`; Zeitleiste `Tabs.Panel` now renders `<ClinicalTimeline patientId={patientId} />` instead of the Plan 02 placeholder `<Text c="dimmed">Timeline (Plan 03)</Text>`. **Modified.**

## Decisions Made

- **Per-type catch-and-fallback instead of all-or-nothing fetch.** The four resource types are fetched in parallel via `Promise.all`, but each has `.catch(() => [] as Resource[])` so an unsupported or failing type (e.g., Observation disabled on a narrow Blaze instance) does not collapse the whole timeline. The UI-level error Alert only fires when the outer Promise also rejects (tracked via a separate flag in the effect).
- **Drop undated entries rather than sort them to the end.** A timeline whose purpose is chronological ordering should not show events with "Unknown date". Entries with no extractable date are filtered out during the `TimelineData` mapping. This is consistent with T-03-08 (accept malformed date display risk) while keeping the strictly chronological contract.
- **ISO lexicographic sort via `localeCompare`.** ISO 8601 strings sort lexicographically in chronological order for all well-formed inputs, so `b.date.localeCompare(a.date)` gives descending order without `Date` parsing and avoids timezone pitfalls. Cost is negligible at ≤400 entries (four types × `_count=100`).
- **Fixed `_count=100` per type (no pagination) for v1.** 400 total entries is a pragmatic cap for a single patient; pagination of the timeline is explicitly out of scope per UI-SPEC. If a patient has more events than this, the MII module tabs themselves (which paginate via SearchControl) remain the authoritative view.
- **Color/label from MII_MODULES, not hardcoded.** The Plan 01 config is the single source of truth: timeline entries look up `MII_MODULES.find(m => m.fhirResourceType === resource.resourceType)` for `germanLabel` and `badgeColor`. If Phase 4 tweaks a module's color, the timeline updates without edits here.

## Deviations from Plan

None — plan executed exactly as written. The implementation matches every acceptance criterion in the plan: `searchResources` calls for the four types, `b.date.localeCompare(a.date)` descending sort, `"No clinical events recorded for this patient."` empty state, `Badge color={entry.color} variant="light"`, `borderLeft: '3px solid var(--mantine-color-${entry.color}-6)'` left-border styling, `<ClinicalTimeline patientId={patientId} />` in `MiiModuleTabs.tsx`, and the Plan 02 `"Timeline (Plan 03)"` placeholder removed.

## Authentication Gates

None — the timeline runs entirely against the connected Blaze FHIR server already established by `PatientsLayout`. No external service auth required.

## Issues Encountered

None during execution. Minor implementation notes:

- `Period` is not exported from `@medplum/fhirtypes` at the top level for every usage in the `Procedure` branch, so the cast `(p.performedPeriod as Period | undefined)?.start` follows the exact pattern in the plan action, with the `Period` type imported from fhirtypes where available.
- Pre-existing TypeScript warnings logged in Plan 01's summary (display-modes.test.tsx, json-highlight.test.ts, resource-type-landing-counts.test.tsx, ResourceDetailPage, SearchResultsPage) remain untouched — still out of scope per the scope-boundary rule.

## User Setup Required

None — uses existing Blaze connection from Phase 1.

## Verification

**Automated:**

- `npx vitest run src/__tests__/clinical-timeline.test.tsx --reporter=verbose` — **19/19 passing** (extractDate 8, extractSummary 7, formatTimelineDate 2, with additional sort/resource-specific coverage).

**Acceptance-criteria grep spot checks (all confirmed in commit 9a7f2d0):**

- `src/utils/timeline-utils.ts`: `export function extractDate`, `case 'Condition':` + `onsetDateTime` + `recordedDate` + `onsetPeriod`, `case 'Encounter':` + `period?.start`, `case 'Procedure':` + `performedDateTime` + `performedPeriod`, `case 'Observation':` + `effectiveDateTime` + `effectivePeriod` + `issued`, `export function extractSummary`, `export interface TimelineData`.
- `src/components/patients/ClinicalTimeline.tsx`: `searchResources` calls for Encounter/Condition/Procedure/Observation, `b.date.localeCompare(a.date)` descending sort, `"No clinical events recorded for this patient."` empty-state copy.
- `src/components/patients/TimelineEntry.tsx`: `Badge color={entry.color} variant="light"`, `borderLeft:` with `entry.color`.
- `src/components/patients/MiiModuleTabs.tsx`: contains `<ClinicalTimeline patientId={patientId}` and **does not** contain `Timeline (Plan 03)`.

**Human-verify (Task 2 gate):** User executed the 12-step end-to-end walkthrough against a live Blaze connection:

1. `npm run dev` started ✓
2. Blaze green status ✓
3. Patient list loads ✓
4. Name search returns results ✓
5. Patient row click → PatientHeader ✓
6. MII Modules selected by default ✓
7. Six MII module tabs + Zeitleiste visible ✓
8. Each tab loads patient-scoped data ✓
9. Zeitleiste shows timeline entries sorted newest-first ✓
10. Timeline entry click opens resource detail ✓
11. FHIR Resources toggle shows types with counts ✓
12. Expanding a type shows patient-scoped table ✓

User response: **"approved — all flows work."**

## Threat Flags

None — the three threats from the plan's register (T-03-07, T-03-08, T-03-09) are handled per plan:

- **T-03-07 (Tampering / navigation URLs):** `resourceType` and `resourceId` come directly from FHIR server responses (trusted for local-only app); navigation through `/patients/:patientId/:resourceType/:id` hits the Phase 2 `ResourceDetailPage`, which applies `isValidFhirReference` (T-02-08) to any references it renders downstream.
- **T-03-08 (Tampering / date extraction):** `extractDate` is pure string-returning; malformed values at worst yield an unsortable entry, which is then dropped by the undated-filter — stronger than the plan's accepted "Unknown date" disposition.
- **T-03-09 (Information Disclosure / summaries):** All summary text is rendered via React text nodes (auto-escaped). No `dangerouslySetInnerHTML` or URL-embedded summary values.

No new attack surface introduced beyond the threat register.

## Next Plan Readiness

- **Phase 03 is complete.** All three plans delivered; PTNT-04 is now satisfied alongside PTNT-01/02/03/05 from Plans 01–02, closing the patient-centric-browsing requirements set.
- Timeline utilities (`extractDate`, `extractSummary`) are reusable building blocks if Phase 5 (Data Quality) needs resource-level date/summary introspection.
- The click-to-detail contract from timeline continues to go through Phase 2's `ResourceDetailPage`, so any future enhancement to the detail view automatically applies inside patient-context timeline drill-downs.

No blockers.

---
*Phase: 03-patient-centric-browsing-mii-modules*
*Completed: 2026-04-12*

## Self-Check: PASSED

Files verified:
- FOUND: src/utils/timeline-utils.ts
- FOUND: src/components/patients/ClinicalTimeline.tsx
- FOUND: src/components/patients/TimelineEntry.tsx
- FOUND: src/__tests__/clinical-timeline.test.tsx
- FOUND: src/components/patients/MiiModuleTabs.tsx (modified)

Commits verified:
- FOUND: dbffc68 (test(03-03): add failing tests for clinical timeline utilities)
- FOUND: 9a7f2d0 (feat(03-03): implement ClinicalTimeline aggregating four resource types)

Tests verified:
- PASSING: 19/19 in src/__tests__/clinical-timeline.test.tsx
