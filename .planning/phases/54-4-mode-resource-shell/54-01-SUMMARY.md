---
phase: 54
plan: "01"
subsystem: explorer
tags: [resource-shell, json-viewer, key-fields, summary-mode, json-mode, wave-0]
dependency_graph:
  requires:
    - "src/components/json/JsonViewer.tsx (Phase 52 PEEK-06 baseline)"
    - "src/utils/summarizeResource.ts (Phase 46)"
    - "src/utils/fhir-helpers.ts (toRecord)"
    - "src/quality/structuralValidator.ts (createStructuralBackend)"
    - "src/quality/profiles/index.ts (getProfileForType)"
    - "src/utils/export.ts (downloadString)"
  provides:
    - "src/utils/keyFieldsRegistry.ts → getKeyFields() for Plan 02 Summary mode"
    - "src/components/explorer/KeyFieldsTable.tsx → for Plan 02 Tabs.Panel summary"
    - "src/components/explorer/JsonModeView.tsx → for Plan 02 Tabs.Panel json"
    - "src/components/json/JsonViewer.tsx → showLineNumbers prop for JsonModeView"
    - "Wave 0 test scaffolds (6 new files + 1 appended) → for Plan 02 live test fill-in"
  affects:
    - "src/components/json/JsonViewer.tsx (extended, backward-compatible)"
tech_stack:
  added: []
  patterns:
    - "switch-on-resourceType registry (mirrors summarizeResource.ts pattern)"
    - "Optional-chaining throughout for missing field safety"
    - "Per-line re-tokenization in renderLineNumberedJson (JsonSyntaxHighlight tokenizer)"
    - "cancelled-flag async guard (validated useEffect cleanup per RESEARCH Pattern 4)"
    - "describe.skip Wave 0 scaffold pattern for pre-implementation test stubs"
key_files:
  created:
    - path: "src/utils/keyFieldsRegistry.ts"
      description: "getKeyFields(r) → KeyFieldEntry[] — 8 typed R4 handlers + generic fallback"
    - path: "src/components/explorer/KeyFieldsTable.tsx"
      description: "2-column Mantine Table for Summary mode; em-dash for undefined; monospace for generic"
    - path: "src/components/explorer/JsonModeView.tsx"
      description: "JSON mode toolbar (Copy/Download/validation chip/Open in validator) + line-numbered JsonViewer"
    - path: "src/__tests__/resource-detail-summary-mode.test.tsx"
      description: "Wave 0 describe.skip stubs for SHELL-02 (primary heading, incoming refs, patient related)"
    - path: "src/__tests__/resource-detail-graph-mode.test.tsx"
      description: "Wave 0 describe.skip stub for SHELL-03 (graph mode lazy)"
    - path: "src/__tests__/graph-redirect.test.tsx"
      description: "Wave 0 describe.skip stubs for SHELL-03 redirects (2 it() names)"
    - path: "src/__tests__/json-mode-view.test.tsx"
      description: "7 live tests for SHELL-04 (Copy/Download/chip states/Open in validator)"
    - path: "src/utils/__tests__/keyFieldsRegistry.test.ts"
      description: "19 live tests — 8 typed types + generic fallback with edge cases"
    - path: "src/components/json/__tests__/JsonViewer.test.tsx"
      description: "2 live tests — tree mode vs showLineNumbers flat <pre> gutter"
  modified:
    - path: "src/components/json/JsonViewer.tsx"
      description: "Added showLineNumbers?: boolean prop + renderLineNumberedJson helper (PEEK-06 invariant preserved)"
    - path: "src/__tests__/resource-detail.test.tsx"
      description: "Appended describe.skip('ResourceDetailPage 4-mode shell (SHELL-01)') with 4 stub it() names"
decisions:
  - "Option A for line numbers: extend JsonViewer with showLineNumbers prop (not a sibling component) — preserves PEEK-06 single-source-of-truth invariant"
  - "Per-line re-tokenization accepted: tokenize() is pure and cheap; no need to split tokens at newlines"
  - "Not validated chip state for unprofiled types: 5th chip state per UI-SPEC — haProfile=false shows 'Not validated' (gray) not '0 issues' (teal)"
  - "Validation chip uses cancelled-flag useEffect guard to prevent stale resource updates on rapid navigation"
  - "em-dash U+2014 for undefined values in KeyFieldsTable (not null/empty string)"
  - "BUNDLED_TYPED_RESOURCE_TYPES set in KeyFieldsTable for monospace font signal on generic-fallback rows"
metrics:
  duration_minutes: 10
  tasks_completed: 4
  files_created: 9
  files_modified: 2
  completed_date: "2026-05-04"
---

# Phase 54 Plan 01: Wave 0 scaffolds + foundation pieces Summary

**One-liner:** Wave 0 describe.skip test stubs for all SHELL-01..04 surfaces plus 3 production-ready foundation components (keyFieldsRegistry, KeyFieldsTable, JsonModeView) and JsonViewer showLineNumbers extension — all tested in isolation before Plan 02's ResourceDetailPage refactor.

## What Was Built

### Task 1: Wave 0 Test Scaffolds

Six new test files and one appended block give Plan 02 clear targets for the 4-mode shell live tests. All 7 files use `describe.skip` so they show as skipped rather than failed. Quick test command exits 0 with 43 passing + 10 skipped.

Key test names (verbatim, per VALIDATION.md): `renders 4 mode tabs`, `keyboard 1 activates Summary`, `URL mode persists`, `mode change replaces URL`, `primary heading`, `incoming refs in summary`, `patient related in summary`, `graph mode lazy`, `redirects /explorer/Patient/p1/graph to ?mode=graph`, `patient graph redirect`, `renders Copy + Download + chip + Open in validator`, `copy button`, `download filename`, `chip 0 issues`.

### Task 2: keyFieldsRegistry (SHELL-02, D-06)

New `src/utils/keyFieldsRegistry.ts` exports `getKeyFields(r: Resource): KeyFieldEntry[]`. Registry covers 8 R4 types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance) with 5 fields each, plus a generic fallback returning the first 4 non-meta/non-id/non-resourceType/non-text fields as JSON.stringify().slice(0,80) previews.

19 live tests validate all 8 typed handlers with fixture + edge cases. No `as any` casts; typed as `r as Patient` etc.

### Task 3: KeyFieldsTable + JsonModeView (SHELL-02 + SHELL-04, D-05, D-07)

**KeyFieldsTable**: 2-column Mantine Table (label 180px dimmed/sm | value sm). Undefined values render as em-dash. Generic-fallback rows get `ff="monospace"` for visual distinction (BUNDLED_TYPED_RESOURCE_TYPES set).

**JsonModeView**: Copy button → navigator.clipboard.writeText + notifications.show; Download button → downloadString(); Validation chip (5-state machine: pending gray "…" / 0-issues teal / N-issues yellow / Not validated gray for unprofiled types); "Open in validator" Anchor → /quality. Uses cancelled-flag useEffect for structural validation. 7 live tests cover all chip states and button behaviors.

### Task 4: JsonViewer showLineNumbers (SHELL-04, Option A)

Extended `JsonViewerProps` with `showLineNumbers?: boolean` (default false). When true: `renderLineNumberedJson()` renders a flat `<pre>` using the existing `JsonSyntaxHighlight` tokenizer with a 48px gutter column showing 1-indexed line numbers. When false: existing `JsonTreeView` branch unchanged.

PEEK-06 invariant: `import { JsonTreeView as TreeView } from '../explorer/JsonTreeView'` line unchanged. `git grep "react-syntax-highlighter" src/` → 0 hits. `git grep "JsonTreeView" src/` → hits only in `JsonViewer.tsx` (the single import) and `JsonTreeView.tsx` (the definition). PEEK drawer tests still pass.

## PEEK-06 Invariant Verification

| Gate | Before | After | Status |
|------|--------|-------|--------|
| `git grep "react-syntax-highlighter" src/` | 0 lines | 0 lines | PASS |
| `git grep "JsonTreeView" src/` (non-definition) | 1 line (JsonViewer.tsx import) | 1 line (same import, unchanged) | PASS |
| PEEK drawer tests | 3 passing | 3 passing | PASS |
| JsonViewer default showLineNumbers=false | — | tree renders, no `<pre>` | PASS |

## Chip State Machine Resolution

The UI-SPEC §Color validation chip has 5 states, not 4. The "Not validated" state for unprofiled resource types was added as task 7 (beyond the original 6 VALIDATION.md test names) because getProfileForType returns null for ~half of all R4 types:

| State | chipText | chipColor | When |
|-------|----------|-----------|------|
| Pending | `…` | gray | `hasProfile && issueCount === null` |
| 0 issues | `0 issues` | teal | `hasProfile && issueCount === 0` |
| 1 issue | `1 issue` | yellow | `hasProfile && issueCount === 1` |
| N issues | `N issues` | yellow | `hasProfile && issueCount >= 2` |
| Not validated | `Not validated` | gray | `!hasProfile` (no MII profile bundled) |

The Tooltip label distinguishes the unprofiled state: "Structural validation against bundled MII profile. No profile bundled for this resource type."

## Open Items Handed to Plan 02

- `ResourceDetailPage.tsx` refactor: replace 2-tab layout with 4-mode `<Tabs variant="pills">` shell using `useSearchParams` for `?mode=` persistence, `useShortcuts` for 1/2/3/4 keys
- `App.tsx`: add `<Navigate replace>` redirects for `/graph` sub-routes → `?mode=graph`
- `DeveloperJsonView.tsx`: obsolete by JsonModeView; delete in Plan 02
- Wave 0 describe.skip stubs → Plan 02 fills in live assertions for SHELL-01/02/03

## Deviations from Plan

None - plan executed exactly as written. The 7th test `'chip Not validated for unprofiled type'` was added to json-mode-view.test.tsx as the plan's Task 3 behavior spec explicitly required it ("Add a 7th test for the unprofiled case"). This is plan-aligned, not a deviation.

## Self-Check: PASSED

All 10 source files exist on disk. All 4 task commits found in git log.

| Check | Result |
|-------|--------|
| `src/utils/keyFieldsRegistry.ts` | FOUND |
| `src/components/explorer/KeyFieldsTable.tsx` | FOUND |
| `src/components/explorer/JsonModeView.tsx` | FOUND |
| `src/components/json/JsonViewer.tsx` (modified) | FOUND |
| 6 new test files | FOUND |
| Commit 5f2919a (Task 1 scaffolds) | FOUND |
| Commit d258862 (Task 2 keyFieldsRegistry) | FOUND |
| Commit d38baa1 (Task 3 KeyFieldsTable + JsonModeView) | FOUND |
| Commit ebc6b80 (Task 4 showLineNumbers) | FOUND |
| Quick test command: 43 pass / 10 skip | PASSED |
| PEEK-06 gate: 0 react-syntax-highlighter hits | PASSED |
| ResourceDetailPage.tsx unmodified | PASSED |
| App.tsx unmodified | PASSED |
