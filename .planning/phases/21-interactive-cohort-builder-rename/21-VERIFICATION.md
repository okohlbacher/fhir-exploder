---
phase: 21-interactive-cohort-builder-rename
verified: 2026-04-16T06:15:00Z
status: human_needed
verdict: PASS-WITH-NOTES
score: 12/12 code-level must-haves verified; 2 items require human UAT
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Plan 21-05 T-5.3 — Cohort builder page UAT"
    expected: "Live /quality/cohorts page creates, persists, and displays cohorts correctly against a real Blaze server (chrome, 3 criteria, Save modal, reload persistence, duplicate-name error, 10k truncation alert)"
    why_human: "Requires browser interaction against a live Blaze instance; visual / flow verification not programmatic"
  - test: "Plan 21-06 T-6.3 — Dashboard cohort scoping UAT (UAT A/B/C/D)"
    expected: "A: cohort activation lowers panel numbers + Network shows patient=/_id=. B: Capture snapshot writes cohortId/Name/PatientCount; PDF export shows both Resource types: and Cohort: lines. C: Legacy quality.cohort.v1 migrates to quality.resourceTypes.v1 on first mount. D: Zero-match yellow Alert renders + panels run unscoped."
    why_human: "End-to-end live Blaze server interaction required; network inspection; PDF render visual verification"
---

# Phase 21: Interactive Cohort Builder + Rename - Verification Report

**Phase Goal:** Users can define a patient/encounter cohort via interactive UI (date range, condition code, reference list), persist it across sessions, and scope quality analyses to that cohort — with the "Cohort" / "Resource types" UX mismatch resolved.

**Verified:** 2026-04-16T06:15:00Z
**Status:** human_needed (code PASS; human UATs T-5.3 and T-6.3 pending)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                                                                                                                                              | Status                     | Evidence                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User can define a patient cohort through an interactive builder with at minimum: date range filter, condition code filter, and explicit reference-list inclusion                                   | PASS (code); human UAT pending | `src/components/quality/CohortBuilderForm.tsx:214-265` implements all 3 criterion types: `DatePickerInput type="range"` for date-range, `TextInput` pair for condition-code (system + code), `Textarea` with `parsePatientRefs` for reference-list. Route at `src/App.tsx:76`. T-5.3 human UAT still pending. |
| 2   | Cohort definitions persist in browser `localStorage` and are reusable across sessions                                                                                                              | PASS                       | `src/hooks/useCohorts.ts:70-73` binds to `COHORTS_STORAGE_KEY = 'quality.cohorts.v1'` via Mantine `useLocalStorage`; `src/hooks/useCohorts.ts:77-80` implements hydration gate; `addCohort` (lines 82-121) writes through try/catch with QuotaExceededError surfacing. Tests GREEN: `useCohorts.test.tsx` 5 passed (persistence, hydration, uuid, legacy migration, migration idempotency).                                          |
| 3   | Dashboard quality analyses can be scoped to a saved cohort (composing with the existing resource-type filter)                                                                                      | PASS (code); human UAT pending | `ActiveCohortSelect.tsx:27-118` in toolbar drives `activateCohort`; `QualityOverviewPage.tsx:118-156` runs `resolveCohort(client, activeCohort)` in `useEffect`; `QualityOverviewPage.tsx:399-417` passes `patientIds={scopedPatientIds}` to all 7 panel components. All 8 panel hooks accept optional `patientIds?: string[]` and forward to `sampleResources`. T-6.3 UAT pending (live Blaze network verification). |
| 4   | The existing "Cohort" label on the resource-type multi-select is renamed to "Resource types"; the two controls are visually distinct and compose orthogonally                                       | PASS                       | `ResourceTypeSelector.tsx:36` has `label="Resource types"` (file renamed from CohortSelector.tsx — `git log --follow` confirms rename commit `58c0c0c`). Both controls coexist as peers in `QualityOverviewPage.tsx` toolbar (see lines 312 ActiveCohortSelect, surrounding ResourceTypeSelector). `CohortSelector.tsx` no longer exists on disk. |

**Score:** 4/4 truths verified at code level. 2 require human UAT for full behavioral confirmation.

---

### Required Artifacts

| Artifact                                                       | Expected                                                           | Status     | Details                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                                                  | Route `/quality/cohorts` registered                                | VERIFIED   | Line 76: `<Route path="cohorts" element={<CohortsPage />} />` inside `/quality` layout                                  |
| `src/components/quality/CohortsPage.tsx`                       | Page with saved-cohorts list + builder form, hydration-gated       | VERIFIED   | 170 lines; mirrors ThresholdsPage chrome, Skeletons gated on `hydrated`, `DatesProvider` wraps `CohortBuilderForm`      |
| `src/components/quality/CohortBuilderForm.tsx`                 | All 3 criterion types + Save modal with "Discard"/"Save cohort"    | VERIFIED   | 352 lines; DatePickerInput + TextInput pair + Textarea + 10k truncation Alert + in-body modal heading (no `title` prop)  |
| `src/components/quality/ActiveCohortSelect.tsx`                | Active cohort dropdown with 4 helper states + Skeleton gate        | VERIFIED   | 118 lines; Skeleton when !hydrated; 4 states ("Analyzing all patients.", "Resolving cohort…", "… · N patients", "Could not resolve…") |
| `src/components/quality/ResourceTypeSelector.tsx`              | Renamed component, label="Resource types"                          | VERIFIED   | Line 36: `label="Resource types"`; `CohortSelector.tsx` deleted (confirmed absent from `ls` output)                     |
| `src/components/quality/QualityLayout.tsx`                     | One-shot migration `useEffect` legacy → new key                    | VERIFIED   | Lines 57-82: `useEffect` calls `migrateLegacyResourceTypeKey()` + inline belt-and-suspenders cleanup                    |
| `src/hooks/useCohorts.ts`                                      | Persists to `quality.cohorts.v1` with hydration gate               | VERIFIED   | Lines 70-80: useLocalStorage bound to COHORTS_STORAGE_KEY; hydration gate via useEffect flag                            |
| `src/quality/cohorts.ts`                                       | Types + storage keys + `parsePatientRefs` + migration helper       | VERIFIED   | Lines 91-93: 3 storage keys exported; `parsePatientRefs`/`findActiveCohort`/`migrateLegacyResourceTypeKey` exported      |
| `src/quality/cohortResolver.ts`                                | AND-intersect criteria, 10K cap, module cache                      | VERIFIED   | Lines 83-127: `resolveCohort` AND-intersects smallest-first; per-criterion cap at `MAX_IDS_PER_CRITERION = 10_000`; module-scoped `resolvedCache` Map keyed by cohort.id+updatedAt; `clearCohortResolutionCache()` exported |
| `src/quality/sampling.ts`                                      | Optional `patientIds` with GET/POST cutover at 40 + `_id=` for Patient | VERIFIED   | Lines 24-66: `SHORT_QUERY_THRESHOLD = 40`; cutover to POST `/_search` with form-urlencoded body above threshold; `_id` for Patient type, `patient=Patient/...` for others; empty array no-op |
| `src/quality/trendsHistory.ts`                                 | `migrateSnapshot` + new `cohortId/cohortName/cohortPatientCount`   | VERIFIED   | Lines 54-67: QualitySnapshot interface with new fields + deprecated `cohort?`; lines 186-209: `migrateSnapshot` function with null-safe guards; `captureSnapshot` writes new fields |
| `src/quality/pdfExport.ts` / `PdfReportLayout.tsx`             | Surfaces both "Resource types:" and "Cohort:" lines                | VERIFIED   | `pdfExport.ts:56` accepts optional `cohort`; `PdfReportLayout.tsx:223` always shows "Resource types: …"; `:224-227` conditionally shows `Cohort: "name" (N patients)` when cohort != null |

**All 12 required artifacts VERIFIED.**

---

### Key Link Verification

| From                             | To                                   | Via                                                             | Status  | Details                                                                                                              |
| -------------------------------- | ------------------------------------ | --------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                        | `CohortsPage`                        | Route registration at `/quality/cohorts`                        | WIRED   | Line 76 `<Route path="cohorts" element={<CohortsPage />} />`                                                          |
| `CohortsPage`                    | `CohortBuilderForm`                  | Import + render inside `<DatesProvider>`                        | WIRED   | `CohortsPage.tsx:40` import; `:154-162` render inside DatesProvider                                                  |
| `CohortBuilderForm`              | `useCohorts.addCohort`               | Direct hook call                                                | WIRED   | `CohortBuilderForm.tsx:122` `const { addCohort } = useCohorts()`; `:173` `addCohort({ name, criteria })`              |
| `CohortBuilderForm`              | `parsePatientRefs`                   | Debounced useMemo                                               | WIRED   | `:110-113` `parsePatientRefs(debouncedRef)` with 150ms debounce                                                      |
| `QualityOverviewPage`            | `ActiveCohortSelect`                 | Import + toolbar render                                         | WIRED   | Line 45 import; line 312 render in toolbar                                                                           |
| `QualityOverviewPage`            | `resolveCohort`                      | useEffect on activeCohort change                                | WIRED   | Line 50 import; `:133` `resolveCohort(client, activeCohort)` called in useEffect gated on `activeCohort?.id/updatedAt/recomputeToken/client` |
| `QualityOverviewPage` → panels   | `patientIds={scopedPatientIds}`      | JSX prop on 7 panel components                                  | WIRED   | Lines 399-417: 7 panels all receive `patientIds={scopedPatientIds}`                                                  |
| Panel components → hooks         | Pass-through `patientIds`            | Prop forwarding                                                 | WIRED   | All 7 panels forward to their hooks (see src/components/quality/*Panel.tsx)                                          |
| Panel hooks → `sampleResources`  | 4th argument                         | Function call                                                   | WIRED   | All 8 hooks verified: `useCodingCoverage:93`, `useConformanceRun:119`, `useDuplicateReport:94,114`, `useLabRangesReport:74`, `usePlausibilityReport:75`, `useCompletenessReport:170`, `useReferenceReport:82`, `useValidationRun:96` — each calls `sampleResources(client, type, size, patientIds)` |
| `QualityOverviewPage.handleCapture` | `captureSnapshot`                 | cohort metadata object                                          | WIRED   | `:187-205` builds `{ id, name, patientCount }` and passes as `activeCohort` to captureSnapshot                        |
| `QualityOverviewPage.handleExport` | `exportQualityPdf`                 | cohort metadata object                                          | WIRED   | `:214-240` builds `cohort` object and passes to `exportQualityPdf`                                                   |
| `QualityLayout useEffect`        | `migrateLegacyResourceTypeKey`       | Parent-before-children ordering                                 | WIRED   | `:61` helper call + `:67-78` belt-and-suspenders inline migration; runs BEFORE any child `useLocalStorage` reads      |
| `useTrendsHistory`               | `migrateSnapshot`                    | `.map().filter(null)` pipe                                      | WIRED   | Confirmed via Plan 21-04 summary + grep of `trendsHistory.ts` — `migrateSnapshot` exported and consumed              |

**All 13 key links WIRED.**

---

### Data-Flow Trace (Level 4)

| Artifact              | Data Variable              | Source                                                              | Produces Real Data                                                                                     | Status          |
| --------------------- | -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------- |
| `CohortsPage`         | `cohorts`                  | `useCohorts()` → `useLocalStorage(quality.cohorts.v1)`              | Yes — real persisted storage, test `persists cohorts to quality.cohorts.v1` GREEN                      | FLOWING         |
| `CohortBuilderForm`   | `parsedRefs`               | `parsePatientRefs(debouncedRef)`                                    | Yes — pure function, 8 tests GREEN                                                                     | FLOWING         |
| `CohortBuilderForm`   | `saved` (addCohort return) | `useCohorts.addCohort` → setStored + localStorage.setItem           | Yes — directly probes window.localStorage.setItem with error handling                                  | FLOWING         |
| `ActiveCohortSelect`  | `cohorts`, `activeCohort`  | `useCohorts()` derived state                                        | Yes — hydration gate ensures data is real                                                              | FLOWING         |
| `QualityOverviewPage` | `resolvedPatientIds`       | `resolveCohort(client, activeCohort)` in useEffect                  | Yes — real FHIR queries for Encounter/Condition criteria, client-side for reference-list; 10 tests GREEN | FLOWING         |
| Panel components      | sample (resources)         | hook → `sampleResources(client, type, size, patientIds)`            | Yes — real GET or POST _search against Blaze; 8 tests GREEN                                            | FLOWING         |
| PDF export            | `cohort`                   | `handleExport` constructs from `activeCohort` + `resolvedPatientIds` | Yes — real data when cohort is active; `null` when unscoped (intentional)                              | FLOWING         |
| TrendsSnapshot        | `cohortId/Name/PatientCount` | `handleCapture` passes real activeCohort object                     | Yes — cohort metadata threaded when resolver idle + patients resolved                                  | FLOWING         |

**All 8 data-flow traces FLOWING.** No hollow wiring or hardcoded empty data.

---

### Behavioral Spot-Checks

| Behavior                                          | Command                                                                                                                             | Result                                            | Status |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| Targeted Phase-21 test suite passes                | `npx vitest run src/quality/cohorts.test.ts src/quality/cohortResolver.test.ts src/hooks/useCohorts.test.tsx src/quality/sampling.test.ts src/components/quality/CohortBuilderForm.test.tsx src/components/quality/ResourceTypeSelector.test.tsx src/quality/__tests__/trendsHistory.test.ts` | 7 files passed, 59 tests passed, 0 failed (2.23s) | PASS   |
| Build compiles clean                              | `npm run build`                                                                                                                     | `✓ built in 463ms` exit 0                          | PASS   |
| Full test suite — no regressions                  | `npm test -- --run`                                                                                                                 | 582 passed / 22 failed / 22 todo — matches baseline | PASS (baseline) |
| All claimed commits exist in git                  | `git log --oneline` filtered to claimed hashes                                                                                      | All 20+ commits resolvable                         | PASS   |
| `CohortSelector.tsx` deleted                      | ls check                                                                                                                             | Absent from `src/components/quality/`              | PASS   |

All 5 behavioral spot-checks PASS.

---

### Requirements Coverage

| Requirement | Source Plan(s)       | Description                                                                                                                                                                                                                                              | Status                              | Evidence                                                                                                                                                                                                    |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CHRT-01     | 21-02, 21-05         | User can define a patient cohort through an interactive builder with: date range filter, condition code filter, reference-list inclusion                                                                                                                 | SATISFIED (code); UAT T-5.3 pending | `CohortBuilderForm.tsx` implements all 3 criterion types; CohortsPage renders it; route at /quality/cohorts (App.tsx:76). REQUIREMENTS.md still marks this Pending pending human UAT approval.              |
| CHRT-02     | 21-02, 21-05         | Cohort definitions persist in browser localStorage under `quality.cohorts.v1`; reusable across sessions                                                                                                                                                  | SATISFIED (code); UAT T-5.3 pending | `useCohorts.ts` binds to `COHORTS_STORAGE_KEY='quality.cohorts.v1'`; hydration gate + QuotaExceededError handling. REQUIREMENTS.md still marks Pending pending human UAT approval.                           |
| CHRT-03     | 21-03, 21-06         | Dashboard quality analyses (all 7 panels) can be scoped to a saved cohort, composing with existing resource-type filter                                                                                                                                  | SATISFIED (code); UAT T-6.3 pending | All 8 hooks accept optional `patientIds`; 7 panels forward; sampleResources routes through GET/POST at 40 ID threshold. REQUIREMENTS.md marks Complete. Live Blaze verification (UAT A) still recommended. |
| CHRT-04     | 21-04                | "Cohort" label renamed to "Resource types"; controls visually distinct + compose orthogonally                                                                                                                                                            | SATISFIED                           | `ResourceTypeSelector.tsx:36` label confirmed; CohortSelector.tsx deleted; QualityLayout localStorage migration runs on mount; trendsHistory rename with `migrateSnapshot`; PDF layout shows both lines. REQUIREMENTS.md marks Complete. |

**Note on REQUIREMENTS.md status:** CHRT-01 and CHRT-02 are still marked "Pending" because their checkpoint-verify gates (T-5.3, T-6.3) await human approval. Code implementation is complete. CHRT-03 and CHRT-04 are marked "Complete."

---

### UI-SPEC Compliance Checks

| Check                                                                                                  | Status | Evidence                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Discard" used, never "Cancel" in Phase-21 save modal                                                  | PASS   | CohortBuilderForm.tsx:337 "Discard". Only other "Cancel" hits are in unrelated pre-existing ValidationPanel (lines 17-18, 334) — not in Phase 21 surface. |
| Save-modal heading rendered in body (`<Text fw={600} size="sm">`), not Mantine native `title` prop     | PASS   | CohortBuilderForm.tsx:312 `<Modal>` has no `title` prop; `:314-316` heading rendered as first child with `id="save-cohort-modal-heading"` + `aria-labelledby` |
| 4 distinct font sizes only                                                                             | PASS (by construction) | UI-SPEC approval locks this; code audit shows only `<Title order={2/4}>`, `<Text size="sm"/"xs">`, `<Text fw={600} size="sm">` usage. No custom theme overrides.                                  |
| ActiveCohortSelect Skeleton hydration gate                                                             | PASS   | ActiveCohortSelect.tsx:34-36 — renders `<Skeleton height={36} width={240} />` when `!hydrated`                                                                                       |
| Zero-match yellow Alert with "Open Cohorts page" link                                                  | PASS   | QualityOverviewPage.tsx:366-378 — `<Alert color="yellow" title="Active cohort matches 0 patients">` with `<Anchor to="/quality/cohorts">Open Cohorts page</Anchor>`                   |
| IconUsersGroup on "Manage cohorts" button                                                              | PASS   | QualityOverviewPage.tsx:324 `leftSection={<IconUsersGroup size={16} />}`                                                                                                               |

All 6 UI-SPEC compliance checks PASS.

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments in Phase-21 files. No console.log-only stubs. No hardcoded empty returns flowing to user-visible output.

- Only `return null` patterns are in appropriate error/guard paths (`migrateSnapshot` returns null for corrupt payloads — intentional).
- Only `= null` / `= []` initializations are in guarded state initializers (`useState<string[] | null>(null)`) that get populated by effects.

---

### Human Verification Required

Two checkpoint-verify gates from the original plan remain unapproved:

#### 1. Plan 21-05 T-5.3 — Cohort Builder Page UAT

**Test:** Navigate to `http://localhost:5173/quality/cohorts` against a connected Blaze instance.

**Expected:**
1. Page chrome renders: back anchor "← Back to Data Quality", `<Title order={2}>Cohorts</Title>`, page description mentioning `quality.cohorts.v1`.
2. Saved cohorts card shows "No cohorts yet" empty state on first visit.
3. Builder form shows all 3 criterion inputs (date range, code system+code, patient refs textarea).
4. "Save cohort…" button disabled with tooltip `Add at least one criterion to save.` until a criterion is filled.
5. Clicking "Save cohort…" opens modal with in-body heading "Save cohort" (NOT a native Mantine title bar), `Discard` + `Save cohort` buttons.
6. Typing a name + clicking "Save cohort" → blue success toast, row appears in saved list.
7. Reload browser → cohort persists in saved list.
8. Attempting to save a second cohort with the same name → duplicate-name error below name input.
9. Pasting ≥10,000 IDs into Textarea → yellow truncation Alert appears.
10. DevTools: `localStorage.getItem('quality.cohorts.v1')` returns valid JSON with the saved cohort(s).

**Why human:** Visual rendering, form interaction flow, browser DevTools inspection — not programmatically verifiable.

#### 2. Plan 21-06 T-6.3 — Dashboard Cohort Scoping UAT (A/B/C/D)

**Test A (end-to-end scoping):** Create a narrow date-range cohort → activate it on `/quality` → verify panel numbers decrease across all 8 tabs vs. unscoped baseline. In browser Network tab, panel queries show `patient=Patient/...` or `_id=` params.

**Test B (capture + PDF):** With cohort active → click "Capture snapshot" → inspect `localStorage.quality.trends.v1` for `cohortId/cohortName/cohortPatientCount` fields. Click "Export PDF" → cover page shows both `Resource types: …` and `Cohort: "<name>" (N patients)` lines. Deactivate cohort → export again → only `Resource types:` renders.

**Test C (legacy migration):** In DevTools seed `localStorage.setItem('quality.cohort.v1', JSON.stringify(['Patient','Observation']))` → reload `/quality` → MultiSelect shows "Resource types" label with Patient + Observation preselected; `quality.resourceTypes.v1` present; `quality.cohort.v1` absent.

**Test D (zero-match):** Create a cohort with impossible date range (e.g. 1900-01-01 to 1900-12-31) → activate → yellow Alert "Active cohort matches 0 patients" renders above Tabs with "Open Cohorts page" link → panels run unscoped (all resources visible).

**Why human:** Requires live Blaze server, network inspection, PDF visual verification, DevTools state manipulation — not programmatically verifiable.

---

## Gaps Summary

**No code-level gaps.** All 12 required artifacts exist, all 13 key links are wired, all 8 data-flow traces produce real data, all 5 behavioral spot-checks pass, all 6 UI-SPEC compliance checks pass, and 59/59 targeted Phase-21 tests are GREEN. The full test suite shows 22 failures but all 22 predate Phase 21 (confirmed against baseline 7e1093c in SUMMARY reports) — no regressions.

**Outstanding:** Two human UAT checkpoints (T-5.3 on `/quality/cohorts` authoring flow; T-6.3 UAT A/B/C/D on dashboard scoping, PDF export, legacy migration, zero-match alert) are pending per the plan's explicit `checkpoint:human-verify gate="blocking"` annotations. These cannot be approved automatically.

---

## Verdict

**PASS-WITH-NOTES**

- Code implementation of CHRT-01, CHRT-02, CHRT-03, CHRT-04 is complete and correct.
- Goal-backward verification confirms the phase goal is achieved at the code level: users CAN define a cohort via interactive builder, cohorts PERSIST to localStorage, dashboard panels ARE scoped to active cohort via patientIds threading, and "Cohort"/"Resource types" rename IS complete with migration.
- Final approval of CHRT-01 / CHRT-02 in REQUIREMENTS.md and phase closure require the two outstanding human UATs (T-5.3, T-6.3) to be executed by the developer against a live Blaze instance. These are intentional checkpoints from the original plan, not verification failures.
- 22 pre-existing test failures in unrelated files (terminology-health, patient-list, resource-type-landing-counts, etc.) are NOT caused by Phase 21 and predate it — verified against multiple prior baseline commits.

---

## Per-Requirement Status

| Requirement | Status    | Notes                                                                                                 |
| ----------- | --------- | ----------------------------------------------------------------------------------------------------- |
| CHRT-01     | PASS (code); human UAT T-5.3 pending | All 3 criterion types + Save modal + persistence logic implemented and unit-tested. |
| CHRT-02     | PASS (code); human UAT T-5.3 pending | localStorage key `quality.cohorts.v1` + hydration gate + quota handling all correct. |
| CHRT-03     | PASS (code); human UAT T-6.3 pending | 7 panels scoped via `patientIds` prop; resolver + GET/POST cutover verified.         |
| CHRT-04     | PASS                                 | Component rename + storage migration + trend-snapshot migrator all landed + tested.  |

---

*Verified: 2026-04-16T06:15:00Z*
*Verifier: Claude (gsd-verifier)*
