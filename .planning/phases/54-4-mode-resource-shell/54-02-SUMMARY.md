---
phase: 54
plan: "02"
subsystem: explorer
tags: [resource-shell, 4-mode-tabs, url-driven-mode, shortcuts, graph-redirect, developer-json-view-delete]
dependency_graph:
  requires:
    - "src/utils/keyFieldsRegistry.ts (Plan 01)"
    - "src/components/explorer/KeyFieldsTable.tsx (Plan 01)"
    - "src/components/explorer/JsonModeView.tsx (Plan 01)"
    - "src/components/json/JsonViewer.tsx showLineNumbers (Plan 01)"
    - "src/hooks/useShortcuts.ts (Phase 52)"
    - "src/utils/summarizeResource.ts (Phase 46)"
    - "src/utils/lazyRetry.ts (Phase 27)"
    - "react-router-dom useSearchParams (Phase 42)"
  provides:
    - "src/components/explorer/ResourceDetailPage.tsx → 4-mode URL-driven shell (SHELL-01..04)"
    - "src/components/explorer/ResourceGraphView.tsx → compact prop for embedded use (SHELL-03)"
    - "src/App.tsx → NavigateToMode redirect for legacy /graph routes (SHELL-03)"
  affects:
    - "src/App.tsx (Route /graph replaced with NavigateToMode)"
    - "src/components/json/JsonViewer.tsx (stale comments updated)"
    - "All tests that render ResourceDetailPage (mocks updated)"
tech_stack:
  added: []
  patterns:
    - "URL-driven tab mode via useSearchParams + setSearchParams(replace:true) (mirrors QualityOverviewPage pattern)"
    - "useShortcuts hook for keyboard shortcuts (replaces raw document.addEventListener)"
    - "React.lazy + Suspense + retry() for code-split ResourceGraphView inside Tabs.Panel"
    - "NavigateToMode adapter component for legacy /graph route redirects"
    - "compact prop pattern for suppressing standalone page chrome in embedded context"
key_files:
  created:
    - path: ".planning/phases/54-4-mode-resource-shell/54-VALIDATION.md"
      description: "Phase gate tracking — all SHELL-01..04 requirements green, nyquist_compliant=true, wave_0_complete=true"
  modified:
    - path: "src/components/explorer/ResourceDetailPage.tsx"
      description: "Full rewrite: 2-tab legacy → 4-mode URL-driven shell (Summary | Human | Graph | JSON)"
    - path: "src/components/explorer/ResourceGraphView.tsx"
      description: "Added ResourceGraphViewProps with compact?: boolean — suppresses Title+Back when inlined"
    - path: "src/App.tsx"
      description: "Add NavigateToMode adapter + replace /graph Routes; remove orphaned lazy ResourceGraphView"
    - path: "src/__tests__/resource-detail.test.tsx"
      description: "Updated mocks (DeveloperJsonView→JsonModeView), updated UAT-FU-03 tests (2→4 tabs), added live SHELL-01 tests"
    - path: "src/__tests__/resource-detail-summary-mode.test.tsx"
      description: "Replaced describe.skip with 3 live Summary mode tests (SHELL-02)"
    - path: "src/__tests__/resource-detail-graph-mode.test.tsx"
      description: "Replaced describe.skip with 1 live Graph mode test (SHELL-03)"
    - path: "src/__tests__/graph-redirect.test.tsx"
      description: "Replaced describe.skip with 2 live NavigateToMode redirect tests (SHELL-03)"
    - path: "src/__tests__/display-modes.test.tsx"
      description: "Removed DeveloperJsonView describe block (file deleted); retained HumanReadableView tests"
    - path: "src/__tests__/reference-navigation.test.tsx"
      description: "Swapped DeveloperJsonView mock for JsonModeView + added missing component mocks"
    - path: "src/components/explorer/__tests__/ResourceGraphView.test.tsx"
      description: "Updated 'Graph button mount' test → 'Graph tab visible' test (D-08: standalone button removed)"
    - path: "src/components/json/JsonViewer.tsx"
      description: "Updated stale DeveloperJsonView comments to reference JsonModeView"
  deleted:
    - path: "src/components/explorer/DeveloperJsonView.tsx"
      description: "Deleted — replaced by JsonModeView; no remaining importers"
decisions:
  - "D-01: Tabs variant=pills, keepMounted UNSET at root (defaults to true — all 4 panels stay mounted)"
  - "D-02: URL-driven mode via useSearchParams; setSearchParams(next, {replace:true}) — no history push per mode swap"
  - "D-03: useShortcuts for 1/2/3/4 keyboard shortcuts (replaces raw document.addEventListener)"
  - "D-04: lazy ResourceGraphView import moved from App.tsx to ResourceDetailPage.tsx; App.tsx /graph routes → NavigateToMode"
  - "D-05: Summary mode renders summarizeResource(r).primary as Title order=3, then KeyFieldsTable, then reference panel"
  - "D-08: Standalone Graph button (IconAffiliate + Tooltip) removed from header; mode 3 (Graph tab) replaces it"
  - "D-09: PatientRelatedResources/IncomingReferencesPanel ONLY inside Summary Tabs.Panel; legacy bottom-mount removed"
  - "References-out deferred to Phase 57 / LENS-02 per RESEARCH OQ#1 / UI-SPEC §Open Items Resolved"
  - "Build gate: fixed 2 pre-existing TS errors blocking npm run build (capability.test.ts UnknownType, PatientTimeline.tsx unused Resource)"
metrics:
  duration_minutes: 15
  tasks_completed: 4
  files_created: 1
  files_modified: 12
  files_deleted: 1
  completed_date: "2026-05-04"
---

# Phase 54 Plan 02: 4-Mode Resource Shell — Final Wiring Summary

**One-liner:** ResourceDetailPage refactored from legacy 2-tab layout to URL-driven 4-mode shell (Summary | Human | Graph | JSON) with useShortcuts keyboard nav, lazy graph, and DeveloperJsonView deleted — all Wave 0 stubs promoted to live tests.

## What Was Built

### ResourceDetailPage Refactor (SHELL-01..04)

**Before:** 2-tab Tabs (`human-readable` | `developer`) with raw `document.addEventListener('keydown')` for 1/2 keys, standalone Graph button with `IconAffiliate` in header, `activeTab` useState, `DeveloperJsonView` import, `PatientRelatedResources`/`IncomingReferencesPanel` mounted unconditionally below the tabs.

**After:** 4-mode URL-driven `<Tabs variant="pills">` shell:

| Mode | Value | Panel Contents |
|------|-------|---------------|
| Summary | `summary` (default) | `summarizeResource(r).primary` heading + `KeyFieldsTable` + reference panel |
| Human | `human` | `HumanReadableView` |
| Graph | `graph` | `React.lazy(ResourceGraphView)` with `compact` prop inside `Suspense` |
| JSON | `json` | `JsonModeView` (Copy/Download/chip/line-numbered viewer) |

URL persistence: `useSearchParams()` + `setSearchParams(next, { replace: true })` — mode changes replace history entry, no push.

Keyboard: `useShortcuts({ '1': summary, '2': human, '3': graph, '4': json })` — replaces raw `document.addEventListener`.

D-09: Both reference panels (`PatientRelatedResources` and `IncomingReferencesPanel`) now live ONLY inside the Summary `Tabs.Panel`. The legacy unconditional bottom-mount is removed.

### ResourceGraphView compact prop (Task 1)

New `ResourceGraphViewProps { compact?: boolean }` — when `compact=true`, the `<Group>` containing `<Title order={2}>Reference graph</Title>` and "Back to resource" Button is suppressed. Depth Slider, React Flow canvas, error/empty states unchanged. Used by ResourceDetailPage Graph tab to avoid doubled header.

### App.tsx redirect wiring (Task 3)

`export function NavigateToMode({ mode })` adapter added. Both legacy `/graph` routes replaced:
- `/explorer/:resourceType/:id/graph` → `<NavigateToMode mode="graph" />`
- `/patients/:patientId/:resourceType/:id/graph` → `<NavigateToMode mode="graph" />`

Orphaned `const ResourceGraphView = lazy(...)` declaration removed from App.tsx. ResourceDetailPage owns the lazy import internally.

### DeveloperJsonView Deletion

`src/components/explorer/DeveloperJsonView.tsx` deleted. It was a thin wrapper over `JsonViewer` that is now superseded by `JsonModeView`. All 3 dependent files updated:
- `src/__tests__/resource-detail.test.tsx` — mock swapped
- `src/__tests__/reference-navigation.test.tsx` — mock swapped
- `src/__tests__/display-modes.test.tsx` — DeveloperJsonView describe block removed

`git grep "DeveloperJsonView" src/` → 0 hits.

### Wave 0 Stubs → Live Tests

All 4 previously-skipped test blocks promoted to live assertions:

| File | describe.skip → describe | Tests added |
|------|--------------------------|-------------|
| `resource-detail.test.tsx` | SHELL-01 block | 4 live tests (4 tabs, keyboard 1, URL persistence, replace) |
| `resource-detail-summary-mode.test.tsx` | SHELL-02 block | 3 live tests (heading, incoming refs, patient related) |
| `resource-detail-graph-mode.test.tsx` | SHELL-03 block | 1 live test (graph mode lazy) |
| `graph-redirect.test.tsx` | SHELL-03 block | 2 live tests (explorer + patients redirect) |

## D-XX Decision Implementation Map

| Decision | Implementation | File | Line(s) |
|----------|---------------|------|---------|
| D-01: Tabs pills, keepMounted default | `<Tabs variant="pills">` (no keepMounted prop) | ResourceDetailPage.tsx | ~L175 |
| D-02: URL-driven mode | `useSearchParams() + setSearchParams(next, {replace:true})` | ResourceDetailPage.tsx | ~L68-85 |
| D-03: useShortcuts | `useShortcuts({ '1':..., '2':..., '3':..., '4':... })` | ResourceDetailPage.tsx | ~L88-93 |
| D-04: lazy ResourceGraphView in component | `const ResourceGraphView = lazy(() => retry(...))` | ResourceDetailPage.tsx | ~L50-54 |
| D-05: Summary mode composition | `<Title order={3}>` + `<KeyFieldsTable>` + ref panels | ResourceDetailPage.tsx | ~L196-213 |
| D-08: Remove Graph button | No `IconAffiliate`/`Tooltip`/Graph button in header | ResourceDetailPage.tsx | header Group |
| D-09: Panels only in Summary | Reference panels inside Summary Tabs.Panel only | ResourceDetailPage.tsx | ~L200-212 |

## References-Out Deferral

Per RESEARCH OQ#1 / UI-SPEC §Open Items Resolved: "References-out" (a references FROM this resource card) is deferred to Phase 57 / LENS-02. Summary mode currently shows only reverse-references (IncomingReferencesPanel for non-Patient, PatientRelatedResources for Patient).

## PEEK-06 Invariant Verification

| Gate | Status |
|------|--------|
| `git grep "react-syntax-highlighter" src/` | 0 lines — PASS |
| `git grep "JsonTreeView" src/` | 4 lines (2 def + 1 import + 1 comment) — PASS |
| PEEK drawer tests (peek-related-resources) | 3 passing — PASS |

## Phase 52/53 Regression

`npm test -- src/__tests__/peek-related-resources.test.tsx --run --no-coverage` → 3 passing. PEEK drawer unaffected.

## Browser-Only UAT Items (Deferred to Phase 58)

These require a live Blaze connection or visual browser verification and cannot be tested in jsdom:
- Visual: 4 pill tabs render at `/explorer/:type/:id`
- Visual: Pressing 1/2/3/4 swaps modes in browser
- Visual: Graph tab renders React Flow SVG canvas
- Visual: Validation chip colors (teal/yellow/gray computed CSS)
- Functional: Download button saves valid JSON file

## Open Items Handed Forward

- **Phase 56**: Expert toggle drives default mode (D-11 from CONTEXT.md)
- **Phase 57**: Patient-specific Summary mode + References-out card (LENS-02)
- **Phase 58**: Live browser UAT for 4-mode shell

## Deviations from Plan

**[Rule 1 - Bug] Fixed 2 pre-existing TypeScript build errors**
- **Found during:** Task 4 (full-suite gate — `npm run build` failed)
- **Issue 1:** `src/__tests__/capability.test.ts:59` — `'UnknownType'` not assignable to `ResourceType` (TS2322); pre-existing in base commit
- **Issue 2:** `src/components/patients/PatientTimeline.tsx:26` — `'Resource'` declared but unused (TS6196); pre-existing in base commit
- **Fix:** `as any` cast for test fixture + removed unused type import
- **Files modified:** `src/__tests__/capability.test.ts`, `src/components/patients/PatientTimeline.tsx`
- **Commit:** f1ba74d

**[Rule 1 - Bug] Updated ResourceGraphView.test.tsx for removed Graph button**
- **Found during:** Task 4 (full-suite gate — 1 test failure)
- **Issue:** `'Graph button mount'` test asserted `getByRole('button', { name: /^Graph$/i })` — the standalone Graph button was removed per D-08
- **Fix:** Rewrote test to assert `getByRole('tab', { name: /^Graph$/i })` (Graph tab in 4-mode shell); added mocks for new ResourceDetailPage dependencies
- **Files modified:** `src/components/explorer/__tests__/ResourceGraphView.test.tsx`
- **Commit:** f1ba74d

## Self-Check: PASSED
