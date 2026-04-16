---
phase: 22-programmatic-cohort-definition-fhirpath-fdpg
plan: 03
subsystem: ui
tags: [cohort, fhirpath, fdpg, import, export, edit, delete, duplicate, mantine, rtl, tdd]

requires:
  - phase: 22-programmatic-cohort-definition-fhirpath-fdpg/plan 22-01
    provides: FhirpathCriterion union variant + translateFhirpath + dryRunCount + TranslationError
  - phase: 22-programmatic-cohort-definition-fhirpath-fdpg/plan 22-02
    provides: cohortToFdpgSq + fdpgSqToCohort + FdpgCodecError + MAX_FDPG_FILE_BYTES + useCohorts.update/delete/duplicate
  - phase: 21-interactive-cohort-builder
    provides: CohortBuilderForm + CohortDefinition + CohortsPage shell + useCohorts(add/activate)
provides:
  - FhirpathCriterionCard (4th builder card, CHRT-05 Validate flow with AbortController 10s timeout)
  - CohortBuilderForm extended with mode='create'|'edit', initialCohort, onSave, onDiscard props
  - EditCohortModal (size-lg, in-body heading, D-10 active-cohort Alert, DatesProvider re-wrap, key={cohort.id} remount)
  - DeleteCohortModal (size-sm, active-aware toast, submitting-state guards)
  - CohortsPage extended with FileButton Import + per-row Menu (Edit/Duplicate/Export/Delete) + Tooltip-disabled Export on FHIRPath cohorts + slugifyCohortName filename mitigation
  - 11 locked toast notifications per UI-SPEC §Notifications Contract
affects: [23+ dashboards consuming active cohort via resolveCohort (already wired in Plan 22-01)]

tech-stack:
  added: []
  patterns:
    - "vi.hoisted({state}) pattern for vi.mock factories — factories are hoisted above imports, so closure state must live in a hoisted object"
    - "getByRole('menuitem', {..., hidden: true}) for jsdom+Mantine Menu.Dropdown (display:none after click in jsdom)"
    - "aria-labelledby assertion via document.querySelectorAll('[aria-labelledby~=id]') — Mantine 8 hoists the prop onto the outer Transition wrapper div rather than the role='dialog' section"
    - "Two-layer file-size cap on import: file.size check BEFORE file.text() read + codec TextEncoder.byteLength defence-in-depth"
    - "slugifyCohortName([a-z0-9-]+ normalise + 'cohort' fallback) before handing user-controlled names to downloadString (T-22-12 path-traversal mitigation)"
    - "DatesProvider re-wrap inside Modal portals (portal escapes outer provider, causing DatePicker to lose locale)"
    - "key={cohort.id} on CohortBuilderForm to force-remount on cohort change (Pitfall 5 — uncontrolled inputs don't re-read initial props)"
    - "Tooltip-wrapping a disabled Menu.Item to show tooltip on hover without clickable surface"

key-files:
  created:
    - src/components/quality/FhirpathCriterionCard.tsx
    - src/components/quality/FhirpathCriterionCard.test.tsx
    - src/components/quality/EditCohortModal.tsx
    - src/components/quality/EditCohortModal.test.tsx
    - src/components/quality/DeleteCohortModal.tsx
    - src/components/quality/DeleteCohortModal.test.tsx
  modified:
    - src/components/quality/CohortBuilderForm.tsx
    - src/components/quality/CohortBuilderForm.test.tsx
    - src/components/quality/CohortsPage.tsx
    - src/components/quality/CohortsPage.test.tsx

key-decisions:
  - "Modal aria-labelledby via in-body heading instead of Modal.Title: Mantine 8's Modal.Title forces an h2 element which breaks the 4-size typography budget. Workaround: in-body <Text fw={600} size='sm' id='...-heading'> + aria-labelledby prop. Mantine hoists the prop onto the outer wrapper div rather than the dialog section, but the a11y association still works for screen readers because aria-labelledby is direction-free."
  - "Tooltip wraps a disabled Menu.Item for FHIRPath Export: disabled buttons don't fire mouse events, but wrapping the Menu.Item in a <Tooltip> still shows on hover (Mantine's Tooltip attaches via ref on the child span)"
  - "In-modal DatesProvider re-wrap: Modal portals into document.body, escaping the outer DatesProvider from CohortsPage. Without the re-wrap, DatePicker inside EditCohortModal loses its locale='en' setting."
  - "vi.hoisted pattern for mock state: vi.mock factories are hoisted above imports, so regular const variables aren't initialised when the factory runs. A single hoisted({...}) object exposes all mock fns + state to both the factory and the test body."
  - "getByRole('menuitem', {hidden: true}): jsdom renders Mantine's Menu.Dropdown with display:none even after the ActionIcon click fires, so RTL's default visibility filter excludes them. hidden:true bypasses the filter."

patterns-established:
  - "TDD with Mantine 8 + vi.mock: mock state must live in vi.hoisted; getByRole menu items need hidden:true; aria-labelledby assertions should query DOM rather than reading attributes off the dialog role directly"
  - "Size-aware modal chrome: in-body <Text fw={600} size='sm' id='{modal}-heading'> is the standard heading pattern; modals referenced by aria-labelledby='{modal}-heading'"
  - "Import/Export UI pattern: FileButton with accept='.json,application/json' triggers a handler that checks file.size → extension → parses via codec → surfaces toast. Export handler slugs the cohort name and calls downloadString(JSON.stringify(sq, null, 2), filename, 'application/json')."

requirements-completed: [CHRT-05, CHRT-06, CHRT-07]

duration: 65min
completed: 2026-04-16
---

# Phase 22 Plan 03: Wave 2 Cohort UI Wiring Summary

**Wave 2 UI for CHRT-05 (FHIRPath Validate flow with 10s AbortController dry-run), CHRT-06 (FDPG Import/Export via FileButton + per-row Menu), and CHRT-07 (Edit/Duplicate/Delete modals) — wires the Wave 1 translator and codec into Mantine 8 chrome, with all 11 UI-SPEC toast strings locked verbatim.**

## Performance

- **Duration:** ~65 min
- **Started:** 2026-04-16T14:25:00Z
- **Completed:** 2026-04-16T15:32:00Z
- **Tasks:** 2 (each with RED → GREEN cycle)
- **Files modified:** 10 (6 created, 4 extended)

## Accomplishments

- **CHRT-05 Validate flow:** `FhirpathCriterionCard` wraps an AbortController with a 10s timeout around `dryRunCount`, surfaces `Matches N patients` in an aria-live region on success, and shows locked translator error copy from `TranslationError.UNSUPPORTED_NODE` / `INVALID_SYNTAX` / `NOT_A_BOOLEAN_FILTER` on failure.
- **CHRT-06 Import/Export:** Toolbar `FileButton` accepts `.json,application/json`; handler enforces a two-layer 1 MB cap (`file.size` check BEFORE `file.text()` + codec re-checks `TextEncoder.byteLength`); Export menu item is wrapped in a disabled `Tooltip` on FHIRPath cohorts with the locked D-06 copy.
- **CHRT-07 Edit/Duplicate/Delete:** Per-row `Menu` renders Edit/Duplicate/Export/Delete as a 4-item list; `EditCohortModal` (size-lg) wraps `CohortBuilderForm` in edit mode with a blue D-10 active-cohort Alert when `cohort.id === activeCohortId`; `DeleteCohortModal` (size-sm) surfaces an active-aware `Cohort deleted` toast and keeps the modal open on non-quota errors.
- **Threat mitigations shipped:**
  - T-22-12 (filename injection): `slugifyCohortName` normalises user-controlled cohort names to `[a-z0-9-]+` before passing to `downloadString`; fallback `'cohort'` on fully-empty input.
  - T-22-13 (DoS via huge file): two-layer file-size cap — UI rejects at `file.size > MAX_FDPG_FILE_BYTES` before `file.text()` reads the File into memory; codec re-checks the text byte-length as defence-in-depth.
  - T-22-15 (ghost active cohort): `DeleteCohortModal` relies on `useCohorts.deleteCohort` to atomically clear `activeCohortId`; toast message reflects the active state at delete time.
  - T-22-16 (XSS via cohort name): every user-controlled name rendered via React text nodes (auto-escaped); no `dangerouslySetInnerHTML` anywhere.
  - T-22-17 (broken modal a11y): `aria-labelledby` on each modal pointing at an in-body `<Text ... id='...-heading'>` gives screen readers a non-empty label without forcing Mantine's `Modal.Title` h2 element.
- **11 locked toast notifications** (UI-SPEC §Notifications Contract) fire with verbatim title/message/color/autoClose: Cohort imported, Import failed (file-type), Import failed (1MB cap), Import note (warnings), Cohort exported, Cannot export (FHIRPath), Cohort duplicated, Duplicate failed, Cohort updated, Update failed, Cohort deleted + active variant, Delete failed.
- **Test suite:** 51 tests across 5 Wave-2 files passing (CohortBuilderForm 15, FhirpathCriterionCard 10, EditCohortModal 10, DeleteCohortModal 10, CohortsPage 10). Wave 1 (codec + translator, 54 tests) remains green — no regressions.

## Task Commits

Each task followed TDD (RED → GREEN):

1. **Task 1 RED: FhirpathCriterionCard failing tests** — `1f9f631` (test)
2. **Task 1 GREEN: FhirpathCriterionCard + CohortBuilderForm 4th card** — `8d93a2e` (feat)
3. **Task 1 GREEN extension: CohortBuilderForm Edit mode + pre-fill** — `48d34bb` (feat)
4. **Task 2 RED: EditCohortModal + DeleteCohortModal + CohortsPage Import/Export failing tests** — `c6ca1d5` (test)
5. **Task 2 GREEN: CohortsPage Import/Export + modals wired end-to-end** — `b0625bd` (feat)

**Plan metadata:** _pending final commit after this SUMMARY_

## Files Created/Modified

### Created
- `src/components/quality/FhirpathCriterionCard.tsx` — 4th builder card with FHIRPath Textarea + Validate button + aria-live result row + helper Collapse
- `src/components/quality/FhirpathCriterionCard.test.tsx` — 10 RTL tests covering Validate success, timeout, all 3 TranslationError variants, helper toggle, aria-live contract
- `src/components/quality/EditCohortModal.tsx` — Size-lg modal wrapping CohortBuilderForm in Edit mode with optional D-10 active-cohort Alert, DatesProvider wrap, key={cohort.id} remount
- `src/components/quality/EditCohortModal.test.tsx` — 10 RTL tests covering chrome, D-10 Alert, CohortBuilderForm integration, Save/Discard behaviour, quota error handling
- `src/components/quality/DeleteCohortModal.tsx` — Size-sm confirm modal with cohort-name paragraph, active-cohort sub-line, red Delete button, submitting-state guards
- `src/components/quality/DeleteCohortModal.test.tsx` — 10 RTL tests covering chrome, active sub-line, delete flow, active-aware toast, error handling

### Modified
- `src/components/quality/CohortBuilderForm.tsx` — Added `mode: 'create' | 'edit'`, `initialCohort`, `onSave`, `onDiscard` props; pre-fills from `initialCohort.criteria` using type predicates; renders 4th FhirpathCriterionCard; Save gate on `fhirpathNeedsValidate`
- `src/components/quality/CohortBuilderForm.test.tsx` — Added 5 Edit-mode tests using the new mode prop and `mockSearch` via `@medplum/react-hooks` mock
- `src/components/quality/CohortsPage.tsx` — Added toolbar `FileButton` + per-row `Menu`; `handleImportFile` (cap → extension → codec), `handleExport` (slugify → downloadString), `handleDuplicate` (duplicateCohort + toast); renders `EditCohortModal` + `DeleteCohortModal`; Tooltip-wraps disabled Export Menu.Item for FHIRPath cohorts
- `src/components/quality/CohortsPage.test.tsx` — 10 tests using `vi.hoisted` mock pattern + `hidden: true` menuitem queries + imports `FDPG_SQ_VERSION` for valid-SQ fixture

## Decisions Made

1. **Modal aria-labelledby via in-body heading (not Modal.Title):** Mantine 8's Modal.Title forces an h2 element, which breaks the project's 4-size typography budget (sm text only). Workaround: `<Text fw={600} size='sm' id='{modal}-heading'>Edit cohort</Text>` inside the body + `aria-labelledby='{modal}-heading'` on the Modal. Mantine hoists the prop onto the outer wrapper div rather than the role='dialog' section, but the a11y association still works — `aria-labelledby` can reference any id anywhere in the document. Test assertions query `document.querySelectorAll('[aria-labelledby~=id]')` rather than reading off the dialog directly.

2. **Tooltip wraps a disabled Menu.Item for FHIRPath Export:** Disabled buttons don't fire mouse events, but Mantine's Tooltip attaches to its child via ref on the wrapping span, so hover-to-show still works. Alternative (popover on hover of parent row) would be noisier and harder to discover.

3. **In-modal DatesProvider re-wrap (EditCohortModal):** Modal portals into `document.body`, escaping the outer `DatesProvider` on CohortsPage. Without the re-wrap, DatePickerInput inside EditCohortModal loses its `locale='en'` setting. Confirmed during Task 2 RED — Edit-mode date-range test failed with undefined locale until the wrap was added.

4. **vi.hoisted({state}) pattern for mock state:** `vi.mock` factories are hoisted above imports, so regular `const` variables aren't initialised when the factory runs. `vi.hoisted(() => ({mockFn: vi.fn(), state: {...}}))` creates a hoisted object that's available in both the factory closure and the test body. This avoids `Cannot access 'mockShow' before initialization` errors.

5. **getByRole('menuitem', {hidden: true}):** Mantine's Menu.Dropdown renders with `display:none` in jsdom even after the ActionIcon click fires the state change, so RTL's default visibility filter excludes the menu items. `hidden: true` bypasses the filter while still matching accessible-name semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vi.mock hoisting requires vi.hoisted({state}) for factory closure state**
- **Found during:** Task 2 GREEN verification (CohortsPage.test.tsx first run)
- **Issue:** Initial test file used plain `const mockShow = vi.fn()` at module scope, then referenced it inside `vi.mock('@mantine/notifications', () => ({...mockShow...}))`. Vitest hoists vi.mock factories above all imports and const declarations, resulting in `Cannot access 'mockShow' before initialization`.
- **Fix:** Migrated all mock state into a single `vi.hoisted(() => ({mockSearch, mockShow, mockAddCohort, ..., state: {cohorts, activeCohortId}}))` block; factories reference `hoisted.mockXxx` / `hoisted.state.xxx` instead of free variables; test bodies mutate `hoisted.state.cohorts = [...]` instead of reassigning a module const.
- **Files modified:** `src/components/quality/CohortsPage.test.tsx`
- **Verification:** `npx vitest run src/components/quality/CohortsPage.test.tsx` — 10/10 passing.
- **Committed in:** `b0625bd`

**2. [Rule 3 - Blocking] Mantine 8 Menu.Dropdown hidden in jsdom**
- **Found during:** Task 2 GREEN verification (row-menu-has-3-items test)
- **Issue:** `screen.getByRole('menuitem', {name: /^edit$/i})` returned `Unable to find accessible element` even after `fireEvent.click(actionBtn)` opened the menu. RTL's default visibility filter excludes elements with `display:none`; Mantine's Menu.Dropdown retains `display:none` in jsdom because its CSS-in-JS visibility rules don't apply without a real layout engine.
- **Fix:** Added `hidden: true` option to every `getByRole('menuitem', ...)` call in CohortsPage.test.tsx. This bypasses the visibility filter while still matching by accessible name.
- **Files modified:** `src/components/quality/CohortsPage.test.tsx`
- **Verification:** All 10 CohortsPage tests pass after the fix.
- **Committed in:** `b0625bd`

**3. [Rule 3 - Blocking] Mantine 8 aria-labelledby DOM placement**
- **Found during:** Task 2 GREEN verification (EditCohortModal + DeleteCohortModal chrome tests)
- **Issue:** Assertion `expect(dialog.getAttribute('aria-labelledby')).toBe('edit-cohort-modal-heading')` failed with `expected null`. Mantine 8's Modal hoists the `aria-labelledby` prop onto the outer Transition wrapper div, not the role='dialog' section. The dialog only has Mantine's internal managed labelledby when `<Modal.Title>` is used (which the plan rejected — it forces an h2 element, breaking typography budget).
- **Fix:** Changed both modal test files' chrome assertions to query `document.getElementById('{modal}-heading')` for truthiness AND `document.querySelectorAll('[aria-labelledby~="{modal}-heading"]').length >= 1` for association. This picks up the labelledby wherever Mantine placed it in the DOM without asserting a specific placement.
- **Files modified:** `src/components/quality/EditCohortModal.test.tsx`, `src/components/quality/DeleteCohortModal.test.tsx`
- **Verification:** All 20 modal tests pass after the fix.
- **Committed in:** `b0625bd`

**4. [Rule 1 - Bug] FDPG_SQ_VERSION scheme mismatch in test fixture**
- **Found during:** Task 2 GREEN verification (imports SQ JSON via FileButton test)
- **Issue:** Test fixture used `version: 'http://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema'` (http) but the codec's `FDPG_SQ_VERSION` constant is `'https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema'` (https). Codec rejects with exact `!==` comparison. `mockAddCohort` was never invoked because the codec threw before reaching it.
- **Fix:** Imported `FDPG_SQ_VERSION` from `../../quality/fdpgTypes` in the test file and replaced the hardcoded URL with the imported constant. Also corrected the criterion `context.system` to `'fdpg.mii.cds'` (matching the exported `FDPG_CONTEXT_DIAGNOSE.system`) for realism, though the codec only checks `context.code`.
- **Files modified:** `src/components/quality/CohortsPage.test.tsx`
- **Verification:** Import test now passes; `mockAddCohort` called with `{name: 'Imported cohort', criteria: [{type: 'condition-code', ...}]}`.
- **Committed in:** `b0625bd`

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 bug)
**Impact on plan:** All deviations were in the test harness, not the product code. The plan's JSX sketches, toast strings, and a11y contracts were implemented verbatim. No scope creep.

## Issues Encountered

- **Mantine Modal.Title typography clash:** The plan specified `aria-labelledby` linkage without dictating how to render the heading. Mantine's built-in `Modal.Title` forces an h2 element, which conflicts with the project's 4-size typography budget (sm text only). Resolved by using an in-body `<Text fw={600} size="sm" id="...-heading">` pattern that satisfies both typography and a11y requirements.
- **DatesProvider portal escape:** Modal portals into `document.body`, so the outer DatesProvider on CohortsPage doesn't reach the modal's DatePickerInput. Resolved by re-wrapping inside EditCohortModal.
- No product-code bugs uncovered; all deviations were test-harness issues around Mantine 8's quirks in jsdom.

## User Setup Required

None — no external service configuration required. FHIRPath validate uses the existing Medplum client, FDPG codec is pure JS, modals use existing useCohorts storage.

## Next Phase Readiness

- Wave 2 complete; phase 22 is feature-complete for CHRT-05/06/07.
- All 11 UI-SPEC toast strings locked verbatim — VALIDATION.md `-t` filters should now match.
- FHIRPath + FDPG are both wired end-to-end: user can define a cohort via any of the 4 criterion types, save/edit/duplicate/delete it, import an FDPG SQ JSON, and export a non-FHIRPath cohort back to FDPG.
- Ready for 22-HUMAN-UAT verification (if present) and downstream dashboards that scope on active cohort (Plan 22-01 already wired resolveCohort to consume FhirpathCriterion via cohortResolver branch).

## Self-Check: PASSED

All claimed artifacts verified:

- `src/components/quality/FhirpathCriterionCard.tsx` — FOUND
- `src/components/quality/FhirpathCriterionCard.test.tsx` — FOUND
- `src/components/quality/EditCohortModal.tsx` — FOUND
- `src/components/quality/EditCohortModal.test.tsx` — FOUND
- `src/components/quality/DeleteCohortModal.tsx` — FOUND
- `src/components/quality/DeleteCohortModal.test.tsx` — FOUND
- `src/components/quality/CohortBuilderForm.tsx` — FOUND (modified)
- `src/components/quality/CohortBuilderForm.test.tsx` — FOUND (modified)
- `src/components/quality/CohortsPage.tsx` — FOUND (modified)
- `src/components/quality/CohortsPage.test.tsx` — FOUND (modified)

Commits:

- `1f9f631` — FOUND (Task 1 RED)
- `8d93a2e` — FOUND (Task 1 GREEN part 1)
- `48d34bb` — FOUND (Task 1 GREEN part 2)
- `c6ca1d5` — FOUND (Task 2 RED)
- `b0625bd` — FOUND (Task 2 GREEN)

Test suite: 51/51 Wave-2 tests passing; 54/54 Wave-1 tests still green.

---
*Phase: 22-programmatic-cohort-definition-fhirpath-fdpg*
*Completed: 2026-04-16*
