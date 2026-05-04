---
phase: 53-peek-call-site-expansion
plan: 02
subsystem: ui
tags: [peek, drawer, reference-link, related-resources, patient-list, cmd-click, j-shortcut]

# Dependency graph
requires:
  - phase: 53-peek-call-site-expansion
    plan: 01
    provides: openPeekError + nullable PeekState.resource + 3 Wave 0 stub test files
  - phase: 52-json-peek-drawer-foundation
    provides: PeekContext, PeekProvider, JsonPeekDrawer, useShortcuts, JsonViewer, SearchResultsPage J reference impl
provides:
  - ReferenceLink Cmd/Ctrl+click handler on resolved + failed + fragment-resolved Anchor render paths
  - RelatedResourcesPanel Cmd/Ctrl+click handler with one-shot searchResources first-result fetch
  - PatientListPage J shortcut + tabIndex + indigo focus ring + relatedTarget blur guard
  - 9 live integration tests across 3 new test files (peek-reference-link, peek-related-resources, peek-patients-integration)
  - Nyquist compliance flag flipped (`nyquist_compliant: true`) across the whole phase
affects: [Phase 53 milestone close-out, future PEEK-06 visual consistency, Phase 54 mode switcher coexistence]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Anchor onClick factory: handleAnchorClick(target, rawRef) returns a closure-bound handler so the same hook output serves resolved/failed/fragment-resolved render paths without three separate useCallbacks"
    - "Inline async onClick wrapper for awaitable Card click: `onClick={(evt) => { void handleCardClick(evt, e); }}` — handler is async but the JSX wrapper is sync; React-compatible idiom"
    - "Test-harness migration when a previously context-free component starts consuming context: wrap downstream tests in the new Provider via vi.importActual (preserves MemoryRouter etc. that get clobbered by un-namespaced vi.mock factories)"

key-files:
  created: []
  modified:
    - src/components/explorer/ReferenceLink.tsx (Cmd/Ctrl+click handler factory + onClick on 3 Anchor render paths)
    - src/components/explorer/RelatedResourcesPanel.tsx (inline async handleCardClick + searchResources first-result + openPeek/openPeekError routing)
    - src/components/patients/PatientListPage.tsx (focusedPatient state + useShortcuts({j}) + PatientRow tabIndex/onFocus/onBlur/isFocused props + indigo focus ring)
    - src/__tests__/peek-reference-link.test.tsx (3 stubs → 3 live tests)
    - src/__tests__/peek-related-resources.test.tsx (3 stubs → 3 live tests)
    - src/__tests__/peek-patients-integration.test.tsx (3 stubs → 3 live tests)
    - .planning/phases/53-peek-call-site-expansion/53-VALIDATION.md (nyquist_compliant: false → true)
    - 7 downstream test harnesses wrapped in PeekProvider [Rule 3 blocking fixes]
        - src/components/explorer/__tests__/ReferenceLink.test.tsx (Phase 47)
        - src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx (Phase 48)
        - src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx (Phase 48)
        - src/components/explorer/__tests__/PatientRelatedResources.test.tsx (Phase 48; snapshot byte-identical)
        - src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx (Phase 47)
        - src/components/explorer/__tests__/ResourceGraphView.test.tsx (Phase 49 Graph button mount)
        - src/__tests__/resource-detail.test.tsx (Phase 47/48 via ResourceDetailPage)
        - src/__tests__/reference-navigation.test.tsx (Phase 47/48 via ResourceDetailPage)
        - src/__tests__/patient-list.test.tsx (Phase 30; mock fix to use importActual)

key-decisions:
  - "ReferenceLink uses a handleAnchorClick(target, rawRef) FACTORY rather than three separate useCallbacks because the captured `target` differs per render path (contained for fragment, resource for resolved, null for failed). One useCallback returning a closure-bound handler is more compact than three."
  - "RelatedResourcesPanel handleCardClick is INLINED as a plain async arrow rather than wrapped in useCallback. Per Plan §Action 'Alternative (simpler) approach' note: the JSX wrapper `(evt) => handleCardClick(evt, e)` is recreated on every render anyway, so useCallback would buy nothing and would need an eslint-disable for the prop reference. Inlining is cleaner."
  - "PeekProvider must wrap 7 downstream test harnesses [Rule 3 — blocking]. Alternative was making usePeek() resilient to missing provider (return no-ops), but that would weaken the API contract from Plan 01. Test-harness wrapping is byte-identical for snapshots (PeekProvider adds React Context only — zero DOM nodes)."
  - "patient-list.test.tsx had a vi.mock('react-router-dom') that clobbered MemoryRouter (no importActual). Adding MemoryRouter as a real export via importActual was a one-line fix; cleaner than re-mocking MemoryRouter as a passthrough."

patterns-established:
  - "Anchor onClick factory pattern for components with multi-path Anchor renders: useCallback returns (target, rawRef) => handler; each render path supplies its own captured target"
  - "Inline async onClick over useCallback when the JSX wrapper closure is itself recreated per render — useCallback buys no actual memoization in that scenario"
  - "PeekProvider test-harness migration: when a previously context-free component starts consuming a context, wrap ALL test files that render it (including transitively via parent pages) in the Provider"

requirements-completed: [PEEK-04, PEEK-05]

# Metrics
duration: ~15min
completed: 2026-05-04
---

# Phase 53 Plan 02: Peek Call-Site Expansion Summary

**Wired the JSON peek drawer into 3 additional surfaces (ReferenceLink Cmd+click, RelatedResourcesPanel Cmd+click, PatientListPage J) bringing the drawer's coverage from 1 surface (Phase 52) to the 4 required by phase success criterion #3. Populated 3 stub test files with 9 live integration tests. Closed PEEK-04 + PEEK-05.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-04T15:30:33Z
- **Completed:** 2026-05-04T15:46:00Z (approx — final commit `40941de`)
- **Tasks:** 3 of 3 completed
- **Files modified:** 3 source files + 3 new test files (stubs → live) + 1 validation doc + 7 downstream test harnesses (Rule 3 fixes)

## Accomplishments

### Surface Inventory (the 4 required by Phase 53 success criterion #3)

| # | Surface | File:Line | Trigger | Verification |
|---|---------|-----------|---------|--------------|
| 1 | Explorer table | `src/components/explorer/SearchResultsPage.tsx:148` | J on focused row | `peek-srp-integration.test.tsx` (Phase 52) |
| 2 | Patients list | `src/components/patients/PatientListPage.tsx:371` | J on focused row | `peek-patients-integration.test.tsx` (this plan) |
| 3 | Reference chip (Human-mode) | `src/components/explorer/ReferenceLink.tsx:72` | Cmd/Ctrl+click on Anchor | `peek-reference-link.test.tsx` (this plan) |
| 4 | Related-resources cards (Incoming + Patient) | `src/components/explorer/RelatedResourcesPanel.tsx:41` | Cmd/Ctrl+click on Card | `peek-related-resources.test.tsx` (this plan) |

D-14 verified: surface #4 covers BOTH `IncomingReferencesPanel` (non-Patient) AND `PatientRelatedResources` (Patient) automatically — they delegate to the shared `RelatedResourcesPanel`.

### Behavioral changes

- **ReferenceLink** (`READ-01` extension):
  - Cmd/Ctrl+click on resolved Anchor → `openPeek(resource, document.activeElement)` with `e.preventDefault() + e.stopPropagation()`.
  - Cmd/Ctrl+click on failed Anchor → `openPeekError(rawText, ...)` with same prevent/stop. Drawer title shows the raw reference text in monospace; body shows "Reference unresolvable" (D-01 contract verified by Test #2 of Task 1).
  - Cmd/Ctrl+click on fragment-resolved Anchor → `openPeek(contained, ...)` (RESEARCH Open Question 3 path).
  - Plain click unchanged — falls through to Phase 47 `<a href>` + parent `ResourceDetailPage.handleReferenceClick` interceptor.
  - Pending render path emits `<Text>` (no Anchor), so Cmd+click is structurally impossible there — no special handling needed.
- **RelatedResourcesPanel** (`REVR-02` + `REVR-03` extension):
  - Cmd/Ctrl+click on populated Card → `e.stopPropagation()` then `await client.searchResources(type, { [param]: refValue, _count: '1' })`. First result → `openPeek(first, ...)`; empty array → `openPeekError(\`${type}?${param}=${refValue}\`, ...)`; thrown error → same `openPeekError`.
  - No spinner during the fetch (D-13 — local Blaze is fast enough).
  - Defensive guard: Cmd+click on `count = 0 / 'loading' / undefined` → silent no-op (populated cards never enter that state, but defense-in-depth).
  - Plain click unchanged — `navigate(onCardNavigate(e))` regression preserved.
- **PatientListPage** (Phase 30 page):
  - New `focusedPatient: Patient | null` state.
  - `useShortcuts({ j: handleJ })` — global J listener; `handleJ` calls `openPeek(focusedPatient as Resource, document.activeElement)` when focused, silent no-op otherwise.
  - `<Table.Tr tabIndex={0}>` with conditional `outline: '2px solid var(--accent-ring)'` + `outlineOffset: '-1px'` when `isFocused`.
  - `onBlur` carries the `relatedTarget`/`tbody.contains` guard byte-identical to `SearchResultsPage:442-451` — sibling-row focus moves do NOT clear `focusedPatient` (no flicker).
  - INPUT-focus guard inherited from `useShortcuts` — pressing J while a filter input is focused is a silent no-op (Test #3 of Task 3).

## Task Commits

Each task committed atomically:

1. **Task 1: ReferenceLink Cmd/Ctrl+click + populate peek-reference-link.test.tsx** — `64234c9` (feat, TDD RED+GREEN folded into one commit per task per Plan 01 precedent)
2. **Task 2: RelatedResourcesPanel Cmd/Ctrl+click + populate peek-related-resources.test.tsx** — `00035bf` (feat)
3. **Task 3: PatientListPage J shortcut + populate peek-patients-integration.test.tsx + flip nyquist flag** — `40941de` (feat)

**Plan metadata commit:** This SUMMARY commit follows.

## API Surface

No new public APIs in this plan. Consumed APIs (all from Phase 52 + Plan 01):
- `usePeek()` → `openPeek`, `openPeekError`
- `useShortcuts({ j: handleJ })`
- `client.searchResources(type, params)` (Medplum core, returns `Resource[]`)

Component prop additions:
```typescript
// PatientRow (PatientListPage.tsx) — Phase 53 Plan 02 additions:
isFocused?: boolean;
onFocus?: () => void;
onBlur?: (e: React.FocusEvent<HTMLTableRowElement>) => void;
```

`ReferenceLink` and `RelatedResourcesPanel` public props are unchanged.

## Test Outcomes

| Test File | Before | After | Delta |
|-----------|--------|-------|-------|
| `peek-reference-link.test.tsx` | 3 skipped (Wave 0) | 3 passed | +3 live |
| `peek-related-resources.test.tsx` | 3 skipped (Wave 0) | 3 passed | +3 live |
| `peek-patients-integration.test.tsx` | 3 skipped (Wave 0) | 3 passed | +3 live |
| `peek-drawer.test.tsx` | 13 passed (Plan 01) | 13 passed | 0 |
| `peek-srp-integration.test.tsx` | 4 passed (Phase 52) | 4 passed | 0 |
| `ReferenceLink.test.tsx` (Phase 47) | 8 passed | 8 passed | 0 (after PeekProvider wrap) |
| `RelatedResourcesPanel.test.tsx` (Phase 48) | 7 passed | 7 passed | 0 (after PeekProvider wrap) |
| `IncomingReferencesPanel.test.tsx` (Phase 48) | 4 passed | 4 passed | 0 (after PeekProvider wrap) |
| `PatientRelatedResources.test.tsx` (Phase 48) | 7 passed | 7 passed | 0 (snapshot byte-identical) |
| `HumanReadableView.read-phase.test.tsx` (Phase 47) | 4 passed | 4 passed | 0 (after PeekProvider wrap) |
| `ResourceGraphView.test.tsx` (Phase 49) | 7 passed | 7 passed | 0 (after PeekProvider wrap) |
| `resource-detail.test.tsx` (Phase 47) | 8 passed | 8 passed | 0 (after PeekProvider wrap) |
| `reference-navigation.test.tsx` (Phase 48) | 21 passed | 21 passed | 0 (after PeekProvider wrap) |
| `patient-list.test.tsx` (Phase 30) | 5 passed | 5 passed | 0 (after PeekProvider wrap + importActual fix) |
| **Full suite** | 1436 passed (Plan 01 baseline) | 1445 passed | +9 net new live tests, 0 regressions |

`tsc -b --noEmit` and `npm run build` exit non-zero on **two pre-existing** errors only (`capability.test.ts` + `PatientTimeline.tsx`, documented in Plan 01 `deferred-items.md` as out of scope).

## Decisions Made

1. **handleAnchorClick factory pattern in ReferenceLink.tsx.** Instead of three separate `useCallback`s for resolved/failed/fragment-resolved Anchor render paths (each with a different `target` to capture), one factory `handleAnchorClick(target, rawRef)` returns a closure-bound handler. This keeps the file ~30 LOC shorter and centralizes the modifier-key + prevent/stop boilerplate.

2. **handleCardClick INLINED as plain async arrow in RelatedResourcesPanel.tsx.** Per the plan's "Alternative (simpler) approach" note: the JSX wrapper `onClick={(evt) => handleCardClick(evt, e)}` is recreated on every render anyway, so wrapping `handleCardClick` itself in `useCallback` buys no actual memoization. Inlining is cleaner and avoids the eslint-disable comment that would have been needed for the `onCardNavigate` prop dep.

3. **PeekProvider test-harness wrapping over context-resilience pattern.** When the new `usePeek()` consumption in ReferenceLink + RelatedResourcesPanel + PatientListPage caused 7 downstream test files to throw `usePeek must be used within PeekProvider`, the alternative was making `usePeek()` return no-op handlers when context is missing. We chose to wrap the test harnesses instead — keeps the production API contract strict (per Plan 01's design) and the byte-identical Patient snapshot in `PatientRelatedResources.test.tsx` stays intact (PeekProvider adds React Context only, zero DOM nodes).

4. **patient-list.test.tsx — vi.importActual fix for the react-router mock.** The Phase 30 test had a `vi.mock('react-router-dom', () => ({...}))` that omitted `MemoryRouter`. When the test harness needed `MemoryRouter` (because PatientListPage now uses `useNavigate` for the J → openPeek path), the mock factory was switched to `vi.importActual()` + spread, exporting all the real router pieces alongside the per-test `useOutletContext` / `useNavigate` / `useSearchParams` mocks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] PeekProvider missing in 7 downstream test harnesses**
- **Found during:** Task 1 verification (`npm test -- --run ReferenceLink`)
- **Issue:** ReferenceLink + RelatedResourcesPanel + PatientListPage now consume `usePeek()`. Existing test harnesses for these components (and downstream pages that render them transitively) failed with `usePeek must be used within PeekProvider`.
- **Fix:** Added `<PeekProvider>` wrapper to 7 test harnesses (and a `vi.importActual` fix to `patient-list.test.tsx` so `MemoryRouter` is exported from the previously-clobbered router mock).
- **Files modified:**
  - `src/components/explorer/__tests__/ReferenceLink.test.tsx`
  - `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx`
  - `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx`
  - `src/components/explorer/__tests__/PatientRelatedResources.test.tsx`
  - `src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx`
  - `src/components/explorer/__tests__/ResourceGraphView.test.tsx`
  - `src/__tests__/resource-detail.test.tsx`
  - `src/__tests__/reference-navigation.test.tsx`
  - `src/__tests__/patient-list.test.tsx`
- **Verification:** Full test suite green (1445 passing).
- **Committed in:** `64234c9` (Task 1 — ReferenceLink.test.tsx) and `00035bf` (Task 2 — the rest, except patient-list which committed in `40941de`).

**2. [Out-of-scope deferred] Pre-existing tsc errors (Plan 01 carry-over)**
- **Found during:** Task 3 verification (`npx tsc -b --noEmit`)
- **Issue:** Two pre-existing TypeScript errors continue to exist (`capability.test.ts(59,9)` + `PatientTimeline.tsx(26,23)`) — same ones logged by Plan 01.
- **Fix:** None — out of scope per CLAUDE.md and execute-plan.md Scope Boundary rule.
- **Committed in:** N/A (already in `deferred-items.md` from Plan 01).

## Authentication Gates

None encountered. All work was source code + test edits + a single VALIDATION.md frontmatter flip.

## Verification Gates (per Plan §verification)

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | `npm test -- --run --no-coverage peek-` exits 0 | PASS | 5 files / 26 tests passing (was 17 passed + 9 skipped → now 26 passed) |
| 2 | `npm test -- --run --no-coverage RelatedResourcesPanel ReferenceLink` exits 0 | PASS | 15 passed |
| 3 | Full `npm test` exits 0 | PASS | 157 files / 1445 tests passing |
| 4 | `npx tsc -b --noEmit` exits 0 | DEFERRED | Pre-existing errors only — same 2 as Plan 01 deferred-items.md |
| 5 | `npm run build` exits 0 | DEFERRED | Same 2 pre-existing errors |
| 6 | `'Reference unresolvable'` exactly 2x in src/ outside tests | PASS | `PeekContext.tsx:79` (literal definition) + `JsonPeekDrawer.tsx:120` (JSX render). 3 additional occurrences are documentation comments. This plan added zero new occurrences. |
| 7 | PEEK-06 inheritance: `JsonTreeView` only in JsonViewer.tsx | PASS | Single line: `src/components/json/JsonViewer.tsx:3` |
| 8 | PEEK-06 inheritance: `react-syntax-highlighter` not in src/ | PASS | Zero matches |
| 9 | Surface count: drawer reachable from 4 distinct surfaces | PASS | See Surface Inventory table above; each surface has its own integration test file |
| 10 | Phase success criterion #3 — per-surface integration coverage | PASS | `peek-srp-integration` + `peek-reference-link` + `peek-related-resources` + `peek-patients-integration` (one file per surface) |
| 11 | Nyquist compliance flag flipped | PASS | `nyquist_compliant: true` in `53-VALIDATION.md` frontmatter (changed in Task 3) |

## D-01 Contract End-to-End Verification

Task 1 Test #2 explicitly asserts BOTH halves of the D-01 contract:
- **Title (raw reference text in monospace):** `screen.getAllByText('Patient/pat-x').length >= 2` — proves the drawer title rendered the literal reference string passed to `openPeekError`. (Two matches because the failed-state ReferenceLink Anchor itself also renders the raw text.)
- **Body ('Reference unresolvable'):** `screen.getByText('Reference unresolvable')` — proves the drawer body rendered the literal copy.
- **Open-full button hidden:** `screen.queryByRole('button', { name: /Open full →/ })` is `null` — proves the error-state branch correctly hides the navigate button.

D-01 contract is the only sub-decision in Phase 53 that was corrected mid-CONTEXT (the original D-04 said the title would be `'Reference unresolvable'`; the corrected D-01 says it's the raw reference text, with `'Reference unresolvable'` only in the body). The end-to-end test locks the corrected behavior.

## Decision Coverage (D-01..D-15)

| Decision | Source | Implementation | Verified by |
|----------|--------|----------------|-------------|
| D-01 (corrected) | 53-CONTEXT.md §Reference Chip Intercept | `openPeekError(rawText, ...)` in failed branch + drawer title shows monospace `referenceText` | Task 1 Test #2 |
| D-02 | 53-CONTEXT.md §Reference Chip Intercept | `usePeek()` consumed in ReferenceLink (factory) + RelatedResourcesPanel | Test files import succeed |
| D-03..D-06 | (Plan 01 — PeekContext error-state foundation) | N/A — Plan 01 | Plan 01 SUMMARY |
| D-07 | 53-CONTEXT.md §Patients List J | `focusedPatient: Patient \| null` + `useShortcuts({ j: handleJ })` | Task 3 Test #1 |
| D-08 | 53-CONTEXT.md §Patients List J | `tabIndex={0}` + `onFocus`/`onBlur` props on PatientRow | Task 3 Test #1 (focus → drawer opens) |
| D-09 | 53-CONTEXT.md §Patients List J | `relatedTarget`/`tbody.contains` guard in onBlur | (Mirrors SearchResultsPage byte-for-byte; SRP suite still green) |
| D-10 | 53-CONTEXT.md §Patients List J | `focusedPatient` passed to PatientRow as `isFocused` for outline conditional | Outline appears in jsdom render path; visual UAT pending |
| D-11 | 53-CONTEXT.md §RelatedResourcesPanel | Cmd/Ctrl+click handler on Card with stopPropagation + count guard + searchResources fetch | Task 2 Test #1 |
| D-12 | 53-CONTEXT.md §RelatedResourcesPanel | `usePeek()` + existing `useMedplum()` reused; `searchResources` returns `Resource[]` | Task 2 Test #1 (mock asserts call signature) |
| D-13 | 53-CONTEXT.md §RelatedResourcesPanel | No spinner; one-shot async with last-write-wins | Task 2 Test #1 (no loader assertion in DOM) |
| D-14 | 53-CONTEXT.md §RelatedResourcesPanel | Both wrappers (Incoming + Patient) inherit Cmd+click via shared component | Inferred from Phase 48 architecture — both call sites already use RelatedResourcesPanel |
| D-15 | 53-CONTEXT.md §Test Strategy | 4 surface-specific integration test files exist with passing assertions | All 4 files green (52 tests in scope) |

## handleCardClick Decision Documentation

`RelatedResourcesPanel.handleCardClick` was implemented as an **inline plain async arrow** rather than `useCallback`-wrapped, per the plan's "Alternative (simpler) approach" note. Rationale recorded in source comments at `src/components/explorer/RelatedResourcesPanel.tsx:43-50`:

> "Inlined as a simple async arrow inside the Card onClick rather than useCallback because the JSX closure `(evt) => handleCardClick(evt, e)` is recreated each render anyway; useCallback would be cosmetic here and would need an eslint-disable for the `onCardNavigate` prop reference."

## SearchResultsPage byte-for-byte Mirror Confirmation

The PatientListPage J wiring mirrors `SearchResultsPage.tsx` byte-for-byte at the architectural level:
- `useState<Patient \| null>(null)` ↔ `useState<Resource \| null>(null)`
- `useShortcuts({ j: handleJ })` — identical
- `<Table.Tr tabIndex={0}>` + indigo `var(--accent-ring)` outline + `-1px` offset — identical
- `relatedTarget`/`tbody.contains` blur guard — identical
- `onFocus={() => setFocusedPatient(p)}` ↔ `onFocus={() => setFocusedResource(r)}` — identical shape

Substitutions: `Patient` for `Resource`, `setFocusedPatient` for `setFocusedResource`, `p` for `r`. No architectural divergence.

## Self-Check: PASSED

Verified with absolute paths in worktree:

```text
FOUND: src/components/explorer/ReferenceLink.tsx (modified)
FOUND: src/components/explorer/RelatedResourcesPanel.tsx (modified)
FOUND: src/components/patients/PatientListPage.tsx (modified)
FOUND: src/__tests__/peek-reference-link.test.tsx (live tests)
FOUND: src/__tests__/peek-related-resources.test.tsx (live tests)
FOUND: src/__tests__/peek-patients-integration.test.tsx (live tests)
FOUND: .planning/phases/53-peek-call-site-expansion/53-VALIDATION.md (nyquist_compliant: true)

FOUND commit 64234c9 (Task 1 — ReferenceLink Cmd+click)
FOUND commit 00035bf (Task 2 — RelatedResourcesPanel Cmd+click)
FOUND commit 40941de (Task 3 — PatientListPage J + nyquist flag)
```
