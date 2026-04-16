---
phase: 22-programmatic-cohort-definition-fhirpath-fdpg
verified: 2026-04-16T15:43:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app, navigate to /quality/cohorts. Type `Patient.where(birthDate < @1960-01-01)` into the FHIRPath Textarea, click Validate."
    expected: "Result row shows 'Matches N patients.' (green check) or 'Cohort would be empty (0 patients matched).' against a live Blaze server. No spinner or error state."
    why_human: "dryRunCount calls the real Blaze server via MedplumClient. Tests mock the client — actual server connectivity and result format can only be confirmed at runtime."
  - test: "Export a non-FHIRPath cohort (e.g. one with a date-range and condition-code criterion) using the Export to FDPG JSON menu item."
    expected: "A .json file downloads (e.g. my-cohort-fdpg.json) whose content parses as valid JSON with version field equal to 'https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema' and correct inclusionCriteria structure."
    why_human: "downloadString triggers a browser file download via an <a download> element — untestable in jsdom. File contents and download UX require a real browser."
  - test: "Import the exported FDPG file back via the toolbar Import button. Verify the imported cohort appears in the Saved cohorts list with the same name and correct criteria."
    expected: "Cohort appears with the exported name, blue 'Cohort imported' toast fires with the exact message, and activating the cohort resolves the same patient set."
    why_human: "File picker (FileButton) interaction and round-trip correctness against actual FDPG JSON require real browser input handling and visible UI confirmation."
  - test: "Click Edit on a saved cohort, change the name or a criterion, click Save changes. Verify the cohort row updates and the active dashboard scope refreshes."
    expected: "Cohort row reflects new name/criteria. If the cohort was active, the dashboard re-runs with the updated definition. 'Cohort updated' blue toast fires."
    why_human: "The dashboard re-computation trigger (resolveCohort cache invalidation on updatedAt change) depends on the full app render cycle including active cohort context — not modeled in component tests."
  - test: "Click Duplicate on a saved cohort. Verify a new row appears with the cohort name suffixed ' (copy)'."
    expected: "New cohort row visible, name matches '{original} (copy)', 'Cohort duplicated' blue toast fires."
    why_human: "Visual row appearance and toast UI require real browser confirmation beyond what mock-based component tests assert."
  - test: "Click Delete on a saved cohort, confirm in the modal. Verify the cohort disappears from the list."
    expected: "Cohort row removed, modal closes, 'Cohort deleted' blue toast fires. If cohort was active, dashboard reverts to 'all patients' scope."
    why_human: "Visual confirmation of row removal and active-cohort dashboard behavior require real browser rendering."
---

# Phase 22: Programmatic Cohort Definition (FHIRPath + FDPG) Verification Report

**Phase Goal:** Users can define cohorts programmatically via FHIRPath query expressions, import/export cohort definitions in MII FDPG JSON format, and manage (edit, duplicate, delete) their saved cohorts
**Verified:** 2026-04-16T15:43:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can define a cohort by writing a FHIRPath query expression (validated before save) | VERIFIED | `FhirpathCriterionCard` renders a Textarea + Validate button that calls `translateFhirpath` + `dryRunCount`; Save is gated on `fhirpathTranslatedQuery` being set; all translator errors surface in the aria-live result row. Tests: FhirpathCriterionCard 10/10, CohortBuilderForm edit-mode 5/5 pass. |
| 2 | User can import and export cohort definitions in MII FDPG JSON format | VERIFIED | `fdpgCodec.ts` implements `cohortToFdpgSq` and `fdpgSqToCohort`; `CohortsPage.tsx` wires `FileButton` (Import) and per-row `Menu` (Export); 1 MB cap enforced at both UI and codec layers; round-trip test passes. Tests: fdpgCodec 29/29, CohortsPage import/export tests pass. |
| 3 | User can edit, duplicate, and delete saved cohorts from a management view | VERIFIED | `useCohorts` exports `updateCohort` (bumps `updatedAt`), `deleteCohort` (clears `activeCohortId`), `duplicateCohort` (fresh UUID + `(copy)` suffix); `EditCohortModal` and `DeleteCohortModal` wire these operations; per-row `Menu` exposes Edit/Duplicate/Export/Delete items. Tests: useCohorts 12/12 new CRUD tests, EditCohortModal 10/10, DeleteCohortModal 10/10 pass. |
| 4 | FHIRPath cohorts and interactive-builder cohorts share the same storage + scoping contract established in Phase 21 | VERIFIED | `FhirpathCriterion` is the 4th variant of `CohortCriterion` discriminated union; `cohortResolver.resolveCriterion` handles all 4 via explicit if-cascade + `assertNever` tail; D-10 cache invalidation (keyed on `cohort.id + updatedAt`) preserved and regression-tested. Tests: cohortResolver 11/11 including cache invalidation test. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/quality/fhirpathTranslator.ts` | translateFhirpath, translatedQueryToFhirSearchUrl, dryRunCount, TranslationError, SEARCH_PARAM_MAP, PREFIX_FOR_OPERATOR, TranslatedQuery | VERIFIED | All 7 exports present; 439 lines; `dryRunCount` uses `client.search(params)` not URL string; `encodeURIComponent` used in URL builder |
| `src/quality/fhirpathTranslator.test.ts` | Unit tests for all translator behaviors | VERIFIED | 25 tests, all pass under `npx vitest run` |
| `src/quality/cohorts.ts` | Extended CohortCriterion union with FhirpathCriterion | VERIFIED | `FhirpathCriterion` interface at line 69; union extended to 4 variants at line 79 |
| `src/quality/cohortResolver.ts` | Extended with fhirpath branch + assertNever | VERIFIED | `from './fhirpathTranslator'` at line 50; `c.type === 'fhirpath'` branch at line 152; `_exhaustive: never` at line 219; `collectIdField` at line 304 |
| `src/quality/fdpgTypes.ts` | MII SQ v3 interfaces + FDPG_SQ_VERSION constant | VERIFIED | All 8 exports present: 5 interfaces + 3 constants |
| `src/quality/fdpgCodec.ts` | cohortToFdpgSq, fdpgSqToCohort, FdpgCodecError, MAX_FDPG_FILE_BYTES | VERIFIED | All 4 exports present; no `Object.assign`; `TextEncoder` byte-count before JSON.parse; 1 MB constant |
| `src/hooks/useCohorts.ts` | Extended UseCohortsApi with updateCohort, deleteCohort, duplicateCohort | VERIFIED | 3 new methods in interface and implementation; `updatedAt: now` on update; `(copy)` suffix on duplicate; `activeCohortId === id ? null` on delete |
| `src/components/quality/FhirpathCriterionCard.tsx` | 4th builder card with Textarea + Validate + aria-live result row | VERIFIED | `maxLength={4096}`, monospace, `role="status"`, `aria-live="polite"`, `AbortController` with `10_000`ms timeout, 4 resource sub-headings with 9+ examples in Collapse |
| `src/components/quality/CohortBuilderForm.tsx` | Extended with mode='create'\|'edit', initialCohort prop | VERIFIED | `mode?: 'create' \| 'edit'`, `initialCohort?: CohortDefinition`, `FhirpathCriterionCard` rendered, `type: 'fhirpath'` in criteria assembly, `'Save changes'` label in edit mode |
| `src/components/quality/EditCohortModal.tsx` | size-lg modal with D-10 Alert + DatesProvider + key={cohort.id} | VERIFIED | `size="lg"`, `DatesProvider settings={{ locale: 'en' }}`, `key={cohort.id}`, D-10 alert copy present |
| `src/components/quality/DeleteCohortModal.tsx` | size-sm confirm modal with red Delete button | VERIFIED | `size="sm"`, `color="red"`, `This cannot be undone.`, `Delete cohort` button |
| `src/components/quality/CohortsPage.tsx` | FileButton Import + per-row Menu (Edit/Duplicate/Export/Delete) | VERIFIED | `FileButton` with `.json,application/json`; `file.size > MAX_FDPG_FILE_BYTES` UI cap; 4 `Menu.Item` entries; `downloadString` for export; `EditCohortModal` and `DeleteCohortModal` rendered |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `FhirpathCriterionCard.tsx` | `fhirpathTranslator.ts` | `import translateFhirpath + translatedQueryToFhirSearchUrl + dryRunCount + TranslationError` | WIRED | Import at line 47; all 4 symbols used in `handleValidate` callback |
| `CohortsPage.tsx` | `fdpgCodec.ts` | `import cohortToFdpgSq + fdpgSqToCohort + FdpgCodecError + MAX_FDPG_FILE_BYTES` | WIRED | Import at lines 59-63; all 4 symbols used in Import/Export handlers |
| `CohortsPage.tsx` | `useCohorts.ts` | `duplicateCohort` (plus modals use `updateCohort` + `deleteCohort` via own `useCohorts()` calls) | WIRED | `duplicateCohort` destructured at line 213; modals call `useCohorts()` internally |
| `EditCohortModal.tsx` | `CohortBuilderForm.tsx` | `mode="edit" initialCohort={cohort}` + `key={cohort.id}` | WIRED | `key={cohort.id}` at line 113; `mode="edit"` at the same JSX element |
| `cohortResolver.ts` | `fhirpathTranslator.ts` | `import translateFhirpath + SEARCH_PARAM_MAP + PREFIX_FOR_OPERATOR` | WIRED | Import at line 50; all 3 symbols used in the `c.type === 'fhirpath'` branch |
| `cohorts.ts` | `FhirpathCriterion` | discriminated union extension | WIRED | `\| FhirpathCriterion` at line 79 of cohorts.ts |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `FhirpathCriterionCard.tsx` | `result` state (patient count) | `dryRunCount(medplum, tq)` → `client.search(resourceType, params)` → real FHIR server | Yes (mocked in tests; real server needed for UAT) | FLOWING (mocked) |
| `cohortResolver.ts` / fhirpath branch | Set of patient IDs | `collectIdField(client, ...)` or `collectSubjectPatientIds(client, ...)` using translated FHIR search params | Yes — async generator over `client.searchResourcePages` | FLOWING |
| `fdpgCodec.ts` fdpgSqToCohort | `CohortDefinition` criteria | Field-by-field parse of user-supplied JSON; mapped to typed criterion objects | Yes — from parsed JSON, validated per criterion | FLOWING |
| `useCohorts.ts` updateCohort | Updated cohort with `updatedAt` | `new Date().toISOString()` + patch applied to `stored.cohorts[idx]` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Wave-1 logic tests (56 tests) | `npx vitest run src/quality/fhirpathTranslator.test.ts src/quality/cohorts.test.ts src/quality/cohortResolver.test.ts` | 56/56 passed | PASS |
| FDPG codec tests (34 tests) | `npx vitest run src/quality/fdpgTypes.test.ts src/quality/fdpgCodec.test.ts` | 34/34 passed | PASS |
| useCohorts CRUD tests (19 tests) | `npx vitest run src/hooks/useCohorts.test.tsx` | 19/19 passed | PASS |
| Wave-2 UI tests (51 tests) | `npx vitest run src/components/quality/FhirpathCriterionCard.test.tsx src/components/quality/CohortBuilderForm.test.tsx src/components/quality/EditCohortModal.test.tsx src/components/quality/DeleteCohortModal.test.tsx src/components/quality/CohortsPage.test.tsx` | 51/51 passed | PASS |
| Full test suite regression check | `npx vitest run` | 22 failures (pre-existing baseline per STATE.md), no new failures introduced | PASS |
| `translateFhirpath` rejects unsupported syntax | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "rejects unsupported syntax"` | 5/5 tests pass | PASS |
| `dryRunCount` params-object call | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "dry-run count"` | 3/3 tests pass | PASS |
| FDPG round-trip | `npx vitest run src/quality/fdpgCodec.test.ts -t "round-trips"` | 1/1 pass | PASS |
| Prototype pollution defence | `npx vitest run src/quality/fdpgCodec.test.ts -t "no prototype pollution"` | 1/1 pass | PASS |
| useCohorts updatedAt bump | `npx vitest run src/hooks/useCohorts.test.tsx -t "updateCohort bumps updatedAt"` | 1/1 pass | PASS |
| CohortsPage row menu items | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "row menu has 3 items"` | 1/1 pass | PASS |
| 1 MB import cap | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "enforces 1MB import cap"` | 1/1 pass | PASS |
| Export SQ JSON | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "exports SQ JSON"` | 1/1 pass | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| CHRT-05 | 22-01, 22-03 | User can define a cohort by writing a FHIRPath query expression; expression is validated before save | SATISFIED | `translateFhirpath` AST parser + `dryRunCount` dry-run + `FhirpathCriterionCard` UI + save gate on `fhirpathTranslatedQuery` |
| CHRT-06 | 22-02, 22-03 | User can import and export cohort definitions in MII FDPG JSON format | SATISFIED | `fdpgCodec.ts` (bidirectional codec, 10 error strings, 1 MB cap, prototype-pollution defence) + `CohortsPage` FileButton Import + per-row Export |
| CHRT-07 | 22-02, 22-03 | User can edit, duplicate, and delete saved cohorts; changes propagate to scoped analyses | SATISFIED | `useCohorts.updateCohort/deleteCohort/duplicateCohort` + `EditCohortModal` + `DeleteCohortModal` + per-row `Menu` + D-10 `updatedAt` cache-invalidation |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No blockers found | — | — | — | — |

Security grep results (critical checks):
- `Object.assign` in `fdpgCodec.ts`: 0 matches (T-22-06 mitigated)
- `...parsed` / `...raw` / `...critObj` spread on parsed input in `fdpgCodec.ts`: 0 matches (T-22-06 mitigated)
- URL-building template literals in `dryRunCount`: 0 matches (`client.search(params)` used — T-22-02 mitigated)
- `dangerouslySetInnerHTML` in Phase 22 UI files: 0 matches (T-22-16 mitigated)

### Human Verification Required

The automated suite passes cleanly at 160/160 tests (56 Wave-1 logic + 34 codec + 19 useCohorts + 51 Wave-2 UI). The following behaviors require a live browser session against a running Blaze FHIR server:

#### 1. FHIRPath Validate Against Live Blaze

**Test:** Open `/quality/cohorts`, type `Patient.where(birthDate < @1960-01-01)` into the FHIRPath Textarea, click Validate.
**Expected:** Result row shows "Matches N patients." with a green check icon, or "Cohort would be empty (0 patients matched)." — no spinner stuck, no red error.
**Why human:** `dryRunCount` issues a real `client.search` with `_summary=count` to the Blaze server. Test mock returns a fixed total; actual server connectivity, FHIR search parameter support, and response format require a live environment.

#### 2. FDPG Export Download

**Test:** On a saved cohort with date-range + condition-code criteria (no FHIRPath), click the three-dot ActionIcon and select "Export to FDPG JSON".
**Expected:** Browser triggers a file download named `{slug}-fdpg.json`. Open the file and confirm it is valid JSON with `"version": "https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema"` and a `inclusionCriteria` array.
**Why human:** `downloadString` creates an `<a download>` element and programmatically clicks it — jsdom cannot simulate browser file downloads. The downloaded file content and naming require real browser confirmation.

#### 3. FDPG Import Round-Trip

**Test:** Import the file downloaded in test 2 via the toolbar Import button. Select the .json file.
**Expected:** "Cohort imported" blue toast fires. A new cohort row appears with the same name and criteria as the exported original. Activate it and confirm the dashboard scopes correctly.
**Why human:** File picker UI (FileButton) requires real browser input events. Round-trip fidelity (exported criteria reconstructed correctly) is covered by the codec round-trip unit test but the end-to-end UX flow needs human confirmation.

#### 4. Edit Cohort with Active Dashboard

**Test:** Set a cohort as active (click Activate), then click Edit, change the name, click Save changes.
**Expected:** "Cohort updated" toast fires. The D-10 blue informational Alert "This cohort is currently active. Saving will trigger recompute on the dashboard." was visible in the modal. The cohort row shows the new name. Dashboard panels re-run with updated criteria.
**Why human:** Dashboard re-computation depends on the active cohort context propagating through `resolveCohort` — this chain involves React context, async resolution, and visible panel updates that cannot be modeled in component tests.

#### 5. Delete + Duplicate Visual Confirmation

**Test:** Duplicate a cohort (verify "(copy)" suffix row appears), then delete the original.
**Expected:** Duplicate row appears immediately. Delete modal asks for confirmation. After confirming, the original row disappears; the "(copy)" row remains.
**Why human:** Visual row changes after state mutations require real DOM rendering in a browser; mock-based tests assert hook calls and toast firings but not the final rendered list state.

#### 6. Export Disabled Tooltip on FHIRPath Cohort

**Test:** Add a FHIRPath criterion to a cohort (or create a new one with only a FHIRPath criterion), then hover over the "Export to FDPG JSON" menu item in the three-dot ActionIcon menu.
**Expected:** Menu item appears visually disabled (dimmed). A tooltip appears on hover reading "Cannot export: this cohort contains a FHIRPath criterion. FDPG Structured Query and FHIRPath are not equivalent formats."
**Why human:** Tooltip-on-disabled-menu-item requires real browser hover events; jsdom's CSS handling means visibility of the tooltip text can't be confirmed programmatically.

### Gaps Summary

No blocking gaps found. All 4 roadmap success criteria are verified by passing test suites. The 6 human verification items above are standard visual/UX confirmations that require a live browser — none represent code defects identified during verification.

---

_Verified: 2026-04-16T15:43:00Z_
_Verifier: Claude (gsd-verifier)_
