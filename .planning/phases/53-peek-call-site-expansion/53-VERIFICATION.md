---
phase: 53-peek-call-site-expansion
verified: 2026-05-04T17:55:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app against live Blaze server. Navigate to a resource with reference fields in Human mode. Cmd+click a resolved reference chip. Confirm the 420px drawer opens showing the referenced resource's JSON."
    expected: "Drawer opens immediately with JSON of the referenced resource. Drawer title shows 'Type/id' in monospace. [Open full →] button is visible. URL does not change."
    why_human: "Requires a running Blaze FHIR server and a live browser. The visual 420px width and actual DOM focus cannot be confirmed in jsdom. ReferenceLink resolved-path Cmd+click does involve real fetch state that vitest mocks."
  - test: "Cmd+click a failed reference chip (one that shows a raw 'Type/id' with no resolved summary). Confirm the drawer opens in error state."
    expected: "Drawer opens with 'Type/id' as monospace title (NOT 'Reference unresolvable'). Drawer body shows 'Reference unresolvable' text in dimmed color. [Open full →] button is NOT visible. No toast notification appears."
    why_human: "Visual presentation of dimmed text, monospace styling, and presence/absence of [Open full →] requires a real browser. The D-01 contract (title=rawRef, body='Reference unresolvable') has integration-test coverage but visual validation of color/font needs human confirmation."
  - test: "Navigate to PatientListPage (/patients). Tab through patient rows. Confirm each row gets an indigo focus ring. Press J while a row is focused."
    expected: "Focused row shows a 2px indigo outline. Pressing J opens the drawer with that patient's JSON. Pressing Esc closes the drawer and returns focus to the row."
    why_human: "CSS var(--accent-ring) focus ring visibility and computed outline style are not reliably testable in jsdom. This is the visual acceptance criterion for PEEK-05 surface 2."
  - test: "Navigate to a resource detail page with an IncomingReferencesPanel or PatientRelatedResources panel. Cmd+click one of the resource count cards."
    expected: "Drawer opens with the first matching resource's JSON after a brief fetch. Drawer title shows 'Type/id'. Plain click still navigates to the filtered Explorer view without opening the drawer."
    why_human: "Requires live Blaze to return real searchResources results. The async fetch + drawer open sequence is unit-tested but needs live-server confirmation. Also confirms the regression: plain click must still navigate, not peek."
deferred: []
---

# Phase 53: Peek Call-Site Expansion Verification Report

**Phase Goal:** The JSON peek drawer is reachable from every list/reference surface a user encounters in normal navigation.
**Verified:** 2026-05-04T17:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `Cmd/Ctrl+click` on any reference chip opens the drawer with the referenced resource resolved via the Phase 47 cache; failed resolution shows inline "Reference unresolvable" state — no toast | VERIFIED | `ReferenceLink.tsx:72-92` wires `handleAnchorClick` factory; resolved branch calls `openPeek(resource, ...)`, failed branch calls `openPeekError(rawText, ...)`; 3 live tests in `peek-reference-link.test.tsx` passing |
| 2 | Failed reference resolution renders an inline "Reference unresolvable" state inside the drawer body — no toast notification | VERIFIED | `JsonPeekDrawer.tsx:119-121` branches on `isError` to render `<Text c="dimmed">Reference unresolvable</Text>`; `PeekContext.tsx:79` sets `error: 'Reference unresolvable'` atomically in `openPeekError`; 4 live tests in `peek-drawer.test.tsx` covering the full error flow |
| 3 | Drawer is reachable from at least 4 distinct surfaces (Explorer table, Patients list, IncomingReferencesPanel cards, Human-mode reference rows) — each surface verified by a vitest test | VERIFIED | 4 surfaces confirmed: (1) `SearchResultsPage.tsx:148` J-on-row; (2) `PatientListPage.tsx:371` J-on-row; (3) `ReferenceLink.tsx:87-89` Cmd+click on anchors; (4) `RelatedResourcesPanel.tsx:41,72-75` Cmd+click on cards — each covered by a dedicated integration test file |

**Score:** 3/3 truths verified

### Deferred Items

None identified — all ROADMAP success criteria for Phase 53 have artifact and wiring evidence. The partial "Summary-mode reference chips" surface mentioned in SC1 will be reached automatically once Phase 54 ships the Summary mode, since `ReferenceLink` (already wired with Cmd+click peek) is consumed by `ResourcePropertyTable.tsx:119` which will render inside Summary mode.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/contexts/PeekContext.tsx` | `openPeekError` + nullable `PeekState.resource` + `error`/`referenceText` fields | VERIFIED | `PeekState.resource: Resource | null` (line 13); `openPeekError` callback (lines 40-44, 71-85); `error?: string` and `referenceText?: string` fields (lines 20-27) |
| `src/components/json/JsonPeekDrawer.tsx` | Error-body branch + monospace referenceText title + hidden Open-full button + Enter no-op guard | VERIFIED | `isError` computed line 40; body branch lines 119-123; title branch lines 87-89; button guard line 106; Enter guard line 70 |
| `src/__tests__/peek-drawer.test.tsx` | Extended unit tests for `openPeekError` flow | VERIFIED | 13 tests passing: 9 from Phase 52 + 4 new PEEK-04 error-state tests in `describe('JsonPeekDrawer error state (PEEK-04)')` |
| `src/__tests__/peek-reference-link.test.tsx` | Live PEEK-04 integration tests (was Wave 0 stub) | VERIFIED | 3 live tests passing — resolved Cmd+click, failed Cmd+click (asserts BOTH raw-reference title AND 'Reference unresolvable' body), plain-click regression |
| `src/__tests__/peek-patients-integration.test.tsx` | Live PEEK-05 surface 2 integration tests | VERIFIED | 3 live tests passing — J on focused row, INPUT-focus guard, no-focused-row no-op |
| `src/__tests__/peek-related-resources.test.tsx` | Live PEEK-05 surfaces 3+4 integration tests | VERIFIED | 3 live tests passing — Cmd+click first-result, fetch-failure error drawer, plain-click regression |
| `src/components/explorer/ReferenceLink.tsx` | Cmd/Ctrl+click intercept on resolved + failed + fragment-resolved Anchor paths | VERIFIED | `handleAnchorClick` factory (lines 73-93) wired to 3 Anchor render paths: fragment-resolved (line 109), resolved (line 157), failed (line 172) |
| `src/components/explorer/RelatedResourcesPanel.tsx` | Cmd/Ctrl+click intercept with one-shot `searchResources` first-result fetch | VERIFIED | `handleCardClick` async function (lines 55-83) wires modifier-key check, `client.searchResources()` call (line 66), success → `openPeek`, empty/rejected → `openPeekError` |
| `src/components/patients/PatientListPage.tsx` | `focusedPatient` state + `useShortcuts({ j })` + `tabIndex=0` + indigo ring on PatientRow | VERIFIED | `useShortcuts({ j: handleJ })` at line 379; `focusedPatient` state at line 372; `tabIndex={0}` at line 267; indigo outline at lines 270-271; `relatedTarget`/`tbody.contains` blur guard at lines 725-727 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/json/JsonPeekDrawer.tsx` | `src/contexts/PeekContext.tsx` | `usePeek()` reads `peekState.resource` (nullable) and `peekState.referenceText` | WIRED | `isError = peekState?.resource === null` (line 40); `titleText` branches on `isError` (lines 87-89); body branches on `isError` (lines 119-123) |
| `src/components/json/JsonPeekDrawer.tsx` | Mantine Text | renders 'Reference unresolvable' as `<Text c="dimmed">` | WIRED | `<Text c="dimmed">Reference unresolvable</Text>` at line 120 |
| `src/components/explorer/ReferenceLink.tsx` | `src/contexts/PeekContext.tsx` | `usePeek()` → `openPeek` (resolved path) + `openPeekError` (failed path) | WIRED | `usePeek()` at line 72; `openPeek` called at line 87; `openPeekError` called at line 89 |
| `src/components/explorer/RelatedResourcesPanel.tsx` | `src/contexts/PeekContext.tsx` | `usePeek()` → `openPeek` + `openPeekError` | WIRED | `usePeek()` at line 41; `openPeek` at line 72; `openPeekError` at lines 74, 77 |
| `src/components/explorer/RelatedResourcesPanel.tsx` | `@medplum/core MedplumClient.searchResources` | `client.searchResources(type, { [param]: refValue, _count: '1' })` | WIRED | `client.searchResources(e.type as ResourceType, { [e.param]: refValue, _count: '1' })` at line 66 |
| `src/components/patients/PatientListPage.tsx` | `src/hooks/useShortcuts.ts` + `src/contexts/PeekContext.tsx` | `useShortcuts({ j: handleJ })` + `usePeek().openPeek(focusedPatient, ...)` | WIRED | `useShortcuts({ j: handleJ })` at line 379; `openPeek(focusedPatient as Resource, ...)` at line 376 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `JsonPeekDrawer.tsx` | `peekState.resource` / `peekState.referenceText` | `PeekContext` → `openPeek(resource)` or `openPeekError(ref)` called from ReferenceLink/RelatedResourcesPanel/PatientListPage | Yes — caller passes actual FHIR Resource from cache or fetch | FLOWING |
| `ReferenceLink.tsx` | `resource` from `useReferenceResolver(reference)` | Phase 47 session-level reference resolution cache + FHIR server fetch | Yes — `useReferenceResolver` fetches real resources | FLOWING |
| `RelatedResourcesPanel.tsx` | `results[0]` from `client.searchResources(...)` | Medplum FHIR client `searchResources` → Blaze server | Yes — live server query (`_count: '1'`) | FLOWING |
| `PatientListPage.tsx` | `focusedPatient` from `useState<Patient | null>` | Set by `onFocus` on `PatientRow` which receives a `Patient` from the page's search results | Yes — patient data from Blaze FHIR fetch | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 5 peek test files pass | `npm test -- --run --no-coverage peek-` | 5 files / 26 tests passed | PASS |
| Phase 47/48 regression tests pass | `npm test -- --run --no-coverage RelatedResourcesPanel ReferenceLink` | 2 files / 15 tests passed | PASS |
| `openPeekError` present in PeekContext | `grep -n "openPeekError" src/contexts/PeekContext.tsx` | Lines 40, 71-85, 95, 96 | PASS |
| "Reference unresolvable" appears 2x in functional source (non-comment) | `grep -rn "Reference unresolvable" src/ | grep -v ".test."` | PeekContext.tsx:79 (literal) + JsonPeekDrawer.tsx:120 (JSX) — 2 functional occurrences, 3 in comments | PASS |
| 4 surfaces confirmed with `openPeek` calls | `grep -n "openPeek\|openPeekError" src/components/*/...` | SearchResultsPage, PatientListPage, ReferenceLink, RelatedResourcesPanel all wire the drawer | PASS |
| Nyquist compliance flag in VALIDATION.md | `grep nyquist_compliant .planning/phases/53-peek-call-site-expansion/53-VALIDATION.md` | `nyquist_compliant: true` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PEEK-04 | 53-01 (foundation), 53-02 (call-site wiring) | `Cmd/Ctrl+click` on any reference chip opens the drawer; failed resolution shows inline "Reference unresolvable" — no toast | SATISFIED | `ReferenceLink.tsx` wired with `handleAnchorClick` factory; `JsonPeekDrawer.tsx` error-state branch; `PeekContext.tsx` `openPeekError`; 4 new error-state tests in peek-drawer.test.tsx + 3 live tests in peek-reference-link.test.tsx |
| PEEK-05 | 53-02 (call-site wiring) | Drawer reachable from at least 4 surfaces: Explorer table, Patients list, IncomingReferencesPanel cards, Human-mode reference rows | SATISFIED | 4 surfaces confirmed with integration tests: peek-srp-integration (Phase 52), peek-patients-integration, peek-reference-link, peek-related-resources — all 4 file × 3 tests = 9+ tests passing |

Both requirements declared in plan frontmatter are satisfied. REQUIREMENTS.md traceability table maps PEEK-04 and PEEK-05 to Phase 53 — no orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | All `return null` occurrences in the 5 source files are legitimate guard clauses (empty state, unprovided data), not stubs. No TODO/FIXME/PLACEHOLDER markers in modified source files. No hardcoded empty data flowing to rendering. |

### Human Verification Required

**Visual and live-server behaviors that cannot be confirmed programmatically:**

#### 1. Resolved Cmd+click on ReferenceLink in Human mode (live Blaze)

**Test:** Navigate to a resource with FHIR references displayed in Human mode (`/explorer/:type/:id`). Cmd+click (Mac) or Ctrl+click (Windows/Linux) on a resolved reference chip (one that shows a human-readable summary, not the raw `Type/id`).
**Expected:** 420px right-side drawer opens immediately with the referenced resource's full FHIR JSON. Drawer title shows `ResourceType/id` in monospace font. `[Open full →]` button is visible in the title bar. URL does NOT change. No toast notification.
**Why human:** Requires a live Blaze FHIR server. The visual 420px width, monospace font rendering, and indigo button color require a real browser environment. jsdom integration tests mock `useReferenceResolver` and confirm the drawer opens, but live-server cache hit path needs browser validation.

#### 2. Failed Cmd+click error state visual confirmation

**Test:** Find or construct a reference chip that fails resolution (a resource referenced but not present in Blaze). Cmd+click it.
**Expected:** Drawer opens with the raw reference text (e.g., `Patient/unknown-id`) as the drawer title in monospace. Drawer body shows "Reference unresolvable" in dimmed/gray text. `[Open full →]` button is NOT present. No toast notification fires.
**Why human:** D-01 contract (title = raw reference, body = "Reference unresolvable") is covered by integration tests, but the visual dimmed color (`c="dimmed"` Mantine prop) and absence of the button require live browser confirmation. jsdom's computed style is unreliable for Mantine theme tokens.

#### 3. PatientListPage focus ring visual (indigo outline on Tab navigation)

**Test:** Navigate to `/patients`. Click into the patient table and press Tab to cycle through rows. Observe each row as it receives focus.
**Expected:** Focused `<tr>` shows a 2px solid indigo outline with -1px offset. The outline color matches the `var(--accent-ring)` CSS variable from the Mantine theme. Other rows have no outline.
**Why human:** CSS custom properties (`var(--accent-ring)`) are not reliably resolved in jsdom. The conditional style `outline: isFocused ? '2px solid var(--accent-ring)' : undefined` is code-verified but visual confirmation requires a real browser.

#### 4. RelatedResourcesPanel Cmd+click on live server (async fetch + drawer)

**Test:** Navigate to any resource detail page that shows an IncomingReferencesPanel (e.g., a Patient resource that has Observations). Wait for counts to load. Cmd+click a non-zero count card.
**Expected:** Drawer opens (after brief network fetch) with the first matching resource's JSON. Drawer title shows the resource's `Type/id`. Plain click on the same card still navigates to the filtered Explorer view without opening a drawer.
**Why human:** Requires live Blaze returning actual `searchResources` results. The async fetch timing and actual first-result content depend on real server data. The regression (plain click navigates) requires live interaction to confirm the browser's default click behavior is unaffected.

---

## Gaps Summary

No gaps were found. All 3 ROADMAP success criteria and both PLAN must-haves are fully verified with passing integration tests and correct source-level wiring.

**The phase requires human UAT confirmation** (4 items above) before marking fully PASSED. These items test:
- Visual CSS properties (indigo focus ring, dimmed text color, monospace title font)
- Live Blaze server integration (resolved/failed reference fetch paths, async card click)
- Real browser behavior (no toast, URL unchanged, plain click regression)

All automated checks pass. Status is `human_needed`.

---

_Verified: 2026-05-04T17:55:00Z_
_Verifier: Claude (gsd-verifier)_
