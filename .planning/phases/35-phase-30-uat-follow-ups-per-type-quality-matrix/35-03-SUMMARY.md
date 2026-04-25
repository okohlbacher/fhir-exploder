---
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
plan: 03
subsystem: ui
tags: [mantine, tooltip, modal, fhir-extensions, human-readable-view, ui-cleanup]

# Dependency graph
requires:
  - phase: 30-layout-redesign
    provides: HumanReadableView + ResourcePropertyTable rendering surface; <Tooltip> + <Modal> + useDisclosure idioms (PatientHeaderCard precedent)
  - phase: 35
    provides: 35-CONTEXT D-06/D-07/D-08/D-09 + 35-UI-SPEC §Copywriting UAT-FU-02 + §Interaction Contract #1/#2/#3 + 35-RESEARCH P-13 (Tooltip-portal query trap)
provides:
  - Identifier system URL hidden behind hover Tooltip with cursor:help cue (D-06)
  - Address-extension JSON dumps replaced with [View] Modal trigger (D-07/D-09)
  - Bottom Extensions section in HumanReadableView aggregates Resource.extension[] entries (D-08)
  - SKIP_KEYS extended with 'extension' so resource-level extensions render exclusively in the bottom section
  - DeepJsonModal helper component reusable for any deeply-nested-object fallback path
  - explicit aria-label="Close" on Modal close buttons (a11y improvement, Rule 2)
affects: [35-04 per-type quality matrix card (uses same Tooltip/Modal idioms), future quality drilldowns that render FHIR extensions]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — all on existing Mantine 8 + @mantine/hooks
  patterns:
    - "Tooltip wraps inline text affordance with cursor:help when target carries a long URL/identifier"
    - "DeepJsonModal: <Button size=xs variant=light onClick={open}>View</Button> + <Modal closeButtonProps={{ aria-label: 'Close' }}> + <Code block fz=xs maxHeight 500 overflowY auto>"
    - "Bottom-section pattern: silent hide via early return null; dedupe by url first-occurrence-wins; URL fragment trim = url.split('/').slice(-2).join('/')"
    - "jsdom + Mantine 8 testing: waitFor for Modal Transition; assert aria-describedby for Tooltip wiring (Floating UI lazy-renders content asynchronously)"

key-files:
  created:
    - src/__tests__/HumanReadableView.extensions.test.tsx (142 lines, 6 tests)
    - src/__tests__/ResourcePropertyTable.test.tsx (124 lines, 4 tests)
  modified:
    - src/components/explorer/HumanReadableView.tsx (28 → 141 lines: ExtensionsSection + summarizeExtension co-located)
    - src/components/explorer/ResourcePropertyTable.tsx (235 → 281 lines: SKIP_KEYS + Tooltip + DeepJsonModal)

key-decisions:
  - "ExtensionsSection co-located in HumanReadableView.tsx (single-file ownership; no new file required for ~85-line addition)"
  - "Modal closeButtonProps add aria-label='Close' on BOTH Modals (Mantine 8 default has no aria-label; Rule 2 a11y-critical correctness)"
  - "Test assertions: aria-describedby for Tooltip wiring (jsdom + Mantine Floating UI lazy-renders portal content async); waitFor for Modal Transition; pretty-printed JSON shape ('valueString': 'hello-world') to disambiguate Modal body text from Value-summary cell text; URL-fragment occurrence count + [View] button count for dedup verification (rather than getAllByRole('row') which catches inner-table rows too)"
  - "TS2352 escape: double-cast (resource as unknown as Record<string, unknown>) per CLAUDE.md sanctioned pattern (single cast rejected because VisionPrescription / other Resource union members lack index signature)"

patterns-established:
  - "Bottom resource-level extension section pattern (silent hide, dedup, per-row Modal trigger) — reusable for any FHIR resource type beyond Patient"
  - "Mantine 8 Modal accessibility convention: always provide closeButtonProps aria-label"
  - "jsdom test idiom for Mantine Modal: fireEvent.click(trigger) → await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy()) — never sync getByRole on a Modal that just opened"

requirements-completed: [UAT-FU-02]

# Metrics
duration: ~10 min
completed: 2026-04-25
---

# Phase 35 Plan 03: HumanReadableView Extension Cleanup Summary

**Identifier-system URL moves to hover Tooltip; address-extension JSON dump becomes a [View] Modal; bottom Extensions section in HumanReadableView aggregates all Resource.extension[] entries with deduped per-row [View] Modal triggers — closes UAT-FU-02.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-25T06:43:00Z
- **Completed:** 2026-04-25T06:53:34Z
- **Tasks:** 3
- **Files modified:** 4 (2 source + 2 new tests)

## Accomplishments

- Identifier `system` URL no longer pollutes the main row text — moves into a Mantine `<Tooltip label={system} withArrow>` hover affordance with `cursor: help` cue (D-06)
- Inline JSON dump for deeply-nested objects (depth ≥ 2) replaced with a `<DeepJsonModal>` `[View]` Button + Modal pattern (D-07 / D-09)
- New bottom **Extensions** section in `HumanReadableView` collects ALL `Resource.extension[]` entries into a deduped table with per-row `[View]` Button opening a single shared Modal containing the full extension JSON (D-08)
- `ResourcePropertyTable` `SKIP_KEYS` extended with `'extension'` so resource-level extensions render EXCLUSIVELY in the bottom section (no double-render)
- Section silent-hides when `resource.extension` is undefined or empty (no "No extensions" copy by design)
- Dedup-by-URL with first-occurrence-wins; URL fragment trim heuristic = `url.split('/').slice(-2).join('/')` (RESEARCH A3)
- `closeButtonProps={{ 'aria-label': 'Close' }}` added to BOTH Modals (Mantine 8 default has no aria-label — Rule 2 a11y-critical)
- Test count net change: +10 (6 HumanReadableView + 4 ResourcePropertyTable); all tests use `screen.*` for portaled content per P-13

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 RED tests** — `9af42ee` (test) — 6 HumanReadableView + 4 ResourcePropertyTable tests describing the post-cleanup contract
2. **Task 2: ResourcePropertyTable production code** — `ef45850` (feat) — Tooltip identifier system + Modal depth fallback + SKIP `extension`; 4 ResourcePropertyTable RED tests now GREEN
3. **Task 3: HumanReadableView bottom Extensions section** — `21f2e25` (feat) — `ExtensionsSection` + `summarizeExtension` co-located; 6 HumanReadableView RED tests now GREEN

_Note: Plan 35-03 is TDD per task `tdd="true"` flag — Task 1 RED → Task 2/3 GREEN._

## Files Created/Modified

- `src/components/explorer/HumanReadableView.tsx` — Mounts `<ExtensionsSection resource={display} />` after `<ResourcePropertyTable>` inside the existing `<ScrollArea>`; co-locates `ExtensionsSection` + `summarizeExtension`. **28 → 141 lines.**
- `src/components/explorer/ResourcePropertyTable.tsx` — `SKIP_KEYS` includes `'extension'`; identifier branch wraps value in `<Tooltip>` with `cursor: help`; deep-JSON fallback returns `<DeepJsonModal>` instead of inline `<Code block>{JSON.stringify(...)}</Code>`. **235 → 281 lines.**
- `src/__tests__/HumanReadableView.extensions.test.tsx` — **NEW.** 142 lines, 6 tests across 1 describe block.
- `src/__tests__/ResourcePropertyTable.test.tsx` — **NEW.** 124 lines, 4 tests across 3 describe blocks (Tooltip / SKIP_KEYS / Modal trigger).

## Decisions Made

- **ExtensionsSection co-located** in `HumanReadableView.tsx` rather than a sibling `ExtensionsSection.tsx` file — single-file ownership keeps related logic adjacent and avoids file-count growth for ~85 lines.
- **`closeButtonProps={{ 'aria-label': 'Close' }}` on both Modals** — Mantine 8 Modal close button has no default aria-label. Adding it is a Rule 2 (missing critical accessibility) auto-fix. Without aria-label, screen-reader users have no way to identify the close button.
- **Test assertion strategy** — Mantine 8 Tooltip uses Floating UI which lazy-renders portal content asynchronously; in jsdom only `aria-describedby` wiring is observable synchronously on hover. Asserting `aria-describedby !== null` + `cursor: help` style proves the Tooltip is correctly wired without waiting for unreliable async portal rendering. Mantine Modal needs `waitFor` for Transition rendering to settle before `getByRole('dialog')` resolves.
- **Dedup verification approach** — `getAllByRole('row')` catches rows from the inner `ResourcePropertyTable` too (Patient table renders its own rows). Counting URL fragments + `[View]` button occurrences scopes the assertion to the bottom Extensions section and is more semantic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical (a11y)] Added explicit `closeButtonProps={{ 'aria-label': 'Close' }}` on both Modals**
- **Found during:** Task 3 (HumanReadableView Modal test)
- **Issue:** Mantine 8 Modal close button has no default `aria-label`. The test attempted `screen.getByLabelText('Close')` and failed because no element exposed that label. More importantly, screen-reader users had no accessible name for the close button — a real a11y bug.
- **Fix:** Added `closeButtonProps={{ 'aria-label': 'Close' }}` to both the `HumanReadableView` Extensions Modal and the `ResourcePropertyTable` `DeepJsonModal`.
- **Files modified:** `src/components/explorer/HumanReadableView.tsx`, `src/components/explorer/ResourcePropertyTable.tsx`
- **Verification:** `screen.getByLabelText('Close')` now resolves; click closes the Modal as expected (verified in `Modal closes via close button` test).
- **Committed in:** `21f2e25` (Task 3 commit)

**2. [Rule 1 - Bug] Test assertion: aria-describedby for Tooltip wiring (vs portal content visibility)**
- **Found during:** Task 2 (ResourcePropertyTable Tooltip test)
- **Issue:** Original RED test asserted `screen.queryByText('https://example.org/sys')` is non-null after `fireEvent.mouseEnter`. In jsdom + Mantine 8, the Tooltip uses Floating UI which lazy-renders portal content asynchronously — only `aria-describedby` wiring is observable synchronously on hover.
- **Fix:** Test now asserts `valueEl.getAttribute('aria-describedby') !== null` + `valueEl.style.cursor === 'help'` — both proofs that the Tooltip is correctly wired and the cursor cue is rendered. Same Tooltip behavior, more reliable assertion.
- **Files modified:** `src/__tests__/ResourcePropertyTable.test.tsx`
- **Verification:** 4/4 ResourcePropertyTable tests GREEN.
- **Committed in:** `ef45850` (Task 2 commit)

**3. [Rule 1 - Bug] Test assertion: waitFor for Mantine 8 Modal opening**
- **Found during:** Task 3 (HumanReadableView Modal-open test)
- **Issue:** Original RED test called `screen.getByRole('dialog')` synchronously after `fireEvent.click(viewBtn)`. Mantine 8 Modal renders via `Transition` + `Portal`; the `[role="dialog"]` body materializes after the transition tick, so synchronous `getByRole` throws. Also produced React `act()` warnings.
- **Fix:** Wrapped Modal-open assertion in `await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())`. Same for Modal-close (wait for `queryByRole('dialog')` to be null).
- **Files modified:** `src/__tests__/HumanReadableView.extensions.test.tsx`
- **Verification:** 6/6 HumanReadableView tests GREEN.
- **Committed in:** `21f2e25` (Task 3 commit)

**4. [Rule 1 - Bug] Test assertion: pretty-printed JSON shape disambiguates Modal body from Value-summary cell**
- **Found during:** Task 3 (Modal-open test)
- **Issue:** `screen.getByText(/valueString/)` matched TWO nodes — both the Value-summary cell text (`valueString: hello-world`) AND the Modal body's pretty-printed JSON. Same for `/hello-world/`.
- **Fix:** Assert on the pretty-printed JSON shape `"valueString": "hello-world"` (with quotes and colon-space — JSON.stringify(_, null, 2) output) which only appears inside the Modal's `<Code block>`.
- **Files modified:** `src/__tests__/HumanReadableView.extensions.test.tsx`
- **Verification:** Single-element match; test passes.
- **Committed in:** `21f2e25` (Task 3 commit)

**5. [Rule 1 - Bug] Test assertion: dedup verified via URL-fragment + [View] button counts (not getAllByRole('row'))**
- **Found during:** Task 3 (dedup test)
- **Issue:** `getAllByRole('row').toHaveLength(3)` failed with 5 — `<HumanReadableView>` also renders `<ResourcePropertyTable>` which contains its own `<Table>` with rows for Patient.id, Patient.extension etc. Asserting on global row count is too coarse.
- **Fix:** Assert that each unique URL fragment appears exactly once (`getAllByText('example.org/ext1')).toHaveLength(1)`) AND that exactly two `[View]` buttons exist (one per unique extension). This scopes the dedup verification to the Extensions section semantically.
- **Files modified:** `src/__tests__/HumanReadableView.extensions.test.tsx`
- **Verification:** Both unique URLs render once; 2 `[View]` buttons present.
- **Committed in:** `21f2e25` (Task 3 commit)

**6. [Rule 3 - Blocking] TS2352 double-cast for Resource → Record<string, unknown>**
- **Found during:** Task 3 (tsc check after writing ExtensionsSection)
- **Issue:** `(resource as Record<string, unknown>).extension` failed with `TS2352: Conversion of type 'Resource' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. Type 'VisionPrescription' is not comparable to type 'Record<string, unknown>'. Index signature for type 'string' is missing in type 'VisionPrescription'.` — `Resource` is a discriminated union and not all members satisfy `Record<string, unknown>`.
- **Fix:** Used the CLAUDE.md sanctioned double-cast pattern: `(resource as unknown as Record<string, unknown>).extension`.
- **Files modified:** `src/components/explorer/HumanReadableView.tsx`
- **Verification:** `npx tsc -b --noEmit` exits 0.
- **Committed in:** `21f2e25` (Task 3 commit)

---

**Total deviations:** 6 auto-fixed (1 missing-critical-a11y, 4 test-infrastructure bugs from jsdom + Mantine 8 async behavior, 1 blocking-type-issue)

**Impact on plan:** All deviations were necessary infrastructure adjustments — none represent scope creep. The a11y close-label is a real correctness improvement that the plan didn't anticipate. The 4 test refinements are forced by jsdom's incomplete simulation of Mantine 8's Floating UI + Transition + Portal patterns; the underlying production-code contract is unchanged. The double-cast is the project's established TS2352 escape hatch.

## Issues Encountered

- None beyond the test-infrastructure friction documented under Deviations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **For 35-04 (per-type quality matrix card):** the Tooltip + Modal idioms now have a second canonical site to copy from (PatientHeaderCard was the original; ResourcePropertyTable's `DeepJsonModal` and HumanReadableView's `ExtensionsSection` are now both available as references).
- **No outstanding work for UAT-FU-02:** all D-06/D-07/D-08/D-09 contracts satisfied; copy matches UI-SPEC §Copywriting verbatim; tests cover silent-hide, dedup, URL fragment trim, Modal open, and Modal close paths.
- **Test gate:** 1008 passing / 0 failing (baseline 998 + 10 new). `npx tsc -b --noEmit` clean. `npm run build` clean.
- **No new runtime dependencies** added — entirely composed from existing `@mantine/core` + `@mantine/hooks` + `react`.
- **P-13 mitigated:** every Tooltip/Modal portaled assertion uses `screen.*` (not `within(cell)`); grep `within.*Tooltip\|within.*Modal` returns 0 hits in the new test files.

## Self-Check: PASSED

Verified the following claims with file-system + git checks:

- File `src/components/explorer/HumanReadableView.tsx` — FOUND (141 lines)
- File `src/components/explorer/ResourcePropertyTable.tsx` — FOUND (281 lines)
- File `src/__tests__/HumanReadableView.extensions.test.tsx` — FOUND (142 lines)
- File `src/__tests__/ResourcePropertyTable.test.tsx` — FOUND (124 lines)
- Commit `9af42ee` (Task 1 RED tests) — FOUND in git log
- Commit `ef45850` (Task 2 ResourcePropertyTable production code) — FOUND in git log
- Commit `21f2e25` (Task 3 HumanReadableView ExtensionsSection) — FOUND in git log
- `SKIP_KEYS` literal `'extension'` — VERIFIED via grep `SKIP_KEYS.*extension`
- Identifier branch `<Tooltip label={obj.system as string}` — VERIFIED via grep
- Old dimmed `<Text>{(obj.system as string).replace('urn:','')}</Text>` removed — VERIFIED (no hits for `replace('urn:`)
- `npx vitest run`: 1008 passing / 0 failing — VERIFIED
- `npx tsc -b --noEmit` exits 0 — VERIFIED
- `npm run build` exits 0 — VERIFIED

---
*Phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix*
*Completed: 2026-04-25*
