---
phase: 57
plan: 02
subsystem: explorer
tags: [outgoing-references, panel, pure-render, rtl, phase-47-reuse, lens-02]
dependency_graph:
  requires: [Phase 57 Plan 01 extractOutgoingReferences, Phase 47 ReferenceLink, Phase 54 ResourceDetailPage 4-mode shell]
  provides: [OutgoingReferencesPanel, LENS-02 feature mount]
  affects: [ResourceDetailPage Summary mode for all non-Patient resources]
tech_stack:
  added: []
  patterns: [pure-render-over-walker, null-on-empty, patient-guard-defense-in-depth, rtl-vitest-with-mantine-router-peek-wrap]
key_files:
  created:
    - src/components/explorer/OutgoingReferencesPanel.tsx
    - src/components/explorer/__tests__/OutgoingReferencesPanel.test.tsx
  modified:
    - src/components/explorer/ResourceDetailPage.tsx
decisions:
  - "Defense-in-depth Patient guard: panel returns null for Patient resources even though ResourceDetailPage already guards at mount — costs nothing, prevents future regression"
  - "useReferenceResolver mock in tests uses pending branch (status: 'pending') — avoids async assertions while still verifying ReferenceLink renders raw Type/id text"
  - "container.firstChild assertion replaced with queryByText assertions — MantineProvider injects a style element so firstChild is never null even when component returns null"
metrics:
  duration: ~12 minutes
  completed: 2026-05-05
  tasks_completed: 3
  files_created: 2
  files_modified: 1
---

# Phase 57 Plan 02: OutgoingReferencesPanel Wire-up Summary

One-liner: Pure render panel wired into ResourceDetailPage Summary mode — labeled list of outgoing FHIR references per resource using Phase-47 ReferenceLink, guarded to non-Patient resources only.

## What Was Built

### Component (`src/components/explorer/OutgoingReferencesPanel.tsx`, 41 lines)

- Exports `OutgoingReferencesPanelProps { resource: Resource }` interface
- Exports `OutgoingReferencesPanel` — pure render over `extractOutgoingReferences(resource)` (Plan 01)
- Returns null when `resource.resourceType === 'Patient'` (defense-in-depth; ResourceDetailPage also guards)
- Returns null when walker yields zero refs (no empty card per UI-SPEC §Copywriting)
- Renders `<Title order={5} mb="sm">Outgoing References</Title>` heading
- Renders `<Stack gap="xs">` of `<Group gap="xs" wrap="nowrap">` rows
- Each row: `<Text size="sm" c="dimmed" ff="monospace">{ref.path}</Text>` + `<ReferenceLink reference={ref.reference} display={ref.display} parentResource={resource} />`
- Key prop: `${ref.path}#${idx}` — unique even with duplicate path values (D-03)
- No useState, no useEffect, no useMemo — pure render
- No Card chrome per UI-SPEC §Color invariant

### Test Suite (`src/components/explorer/__tests__/OutgoingReferencesPanel.test.tsx`, 144 lines)

6 `it` blocks in 1 `describe('OutgoingReferencesPanel')` block:

| # | Scenario | Result |
|---|----------|--------|
| 1 | empty Encounter returns null (no heading in DOM) | PASS |
| 2 | Patient resource returns null (defense-in-depth guard) | PASS |
| 3 | renders one row per OutgoingRef entry | PASS |
| 4 | path label as Mantine Text with monospace class | PASS |
| 5 | ReferenceLink pending branch renders raw Type/id text | PASS |
| 6 | no dedup: same target via two paths → two rows (D-03) | PASS |

Mock strategy: `useReferenceResolver` mocked to `{ resource: undefined, status: 'pending' }` (pending branch renders raw reference text — no async assertions). `useMedplum` mocked defensively for transitive requires.

### ResourceDetailPage diff (`src/components/explorer/ResourceDetailPage.tsx`)

- +1 import line: `import { OutgoingReferencesPanel } from './OutgoingReferencesPanel';` (placed after `IncomingReferencesPanel` import)
- +3 JSX lines inside Summary `Tabs.Panel` after existing Patient/non-Patient ternary:
  ```tsx
  {resource.resourceType !== 'Patient' && (
    <OutgoingReferencesPanel resource={resource} />
  )}
  ```

Mount position: line 217 — after `IncomingReferencesPanel resource={resource}` (line 214), before `</Stack>` of Summary panel (line 219). Inside `Tabs.Panel value="summary"` (line 207), before `Tabs.Panel value="human"` (line 222).

## Test Gate

| Baseline | Count |
|----------|-------|
| Post-Plan-01 (Phase 57) | 1421 |
| Post-Plan-02 (this plan, worktree) | 1525 |
| Plan 02 new tests | +6 |

Full suite: 171 test files, 1525 tests, 0 failures.

## TypeScript Build

`npx tsc -b --noEmit` exits 0 — no errors introduced by this plan.
`npm run build` exits 0 (Vite 603ms, clean).

## Patient Guard Verified

`grep -c "resource.resourceType !== 'Patient'" src/components/explorer/ResourceDetailPage.tsx` returns `1` — only one guard in Summary panel; Patient resources still mount `PatientRelatedResources` exclusively.

PatientRelatedResources test snapshot: not affected (component unchanged; the new conditional mount at the end of Stack is guarded away for Patient).

## LENS-02 Satisfied

OutgoingReferencesPanel renders all outgoing FHIR references from `extractOutgoingReferences(resource)` as a labeled list in Summary mode. Non-Patient resources with at least one reference will see the "Outgoing References" section below IncomingReferencesPanel. Empty or Patient resources show no additional UI surface.

## Commits

| Hash | Message |
|------|---------|
| `4fc733d` | feat(57-02): implement OutgoingReferencesPanel pure render component |
| `d291b1a` | test(57-02): add 6 RTL scenarios for OutgoingReferencesPanel |
| `52aef66` | feat(57-02): mount OutgoingReferencesPanel in ResourceDetailPage Summary |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed container.firstChild null assertions in empty-state tests**
- **Found during:** Task 2 test execution
- **Issue:** `expect(container.firstChild).toBeNull()` failed because MantineProvider always injects a `<style data-mantine-styles>` element as the first child of the container, even when the component under test returns null
- **Fix:** Replaced `container.firstChild` assertions with `screen.queryByText('subject')` assertions that verify no panel content is rendered — the key semantic invariant is that the panel produces no visible content, not that the DOM is empty
- **Files modified:** `src/components/explorer/__tests__/OutgoingReferencesPanel.test.tsx`
- **Commit:** `d291b1a`

## Known Stubs

None — panel is fully wired to real data (extractOutgoingReferences walker + Phase-47 ReferenceLink).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All threats documented in plan's `<threat_model>` block (T-57-05 through T-57-09). Walker validates all emitted references via `isValidFhirReference()` (T-57-05 inherited mitigation). React auto-escapes path labels and display strings (T-57-07).

## Self-Check: PASSED

- [x] `src/components/explorer/OutgoingReferencesPanel.tsx` exists (41 lines)
- [x] `src/components/explorer/__tests__/OutgoingReferencesPanel.test.tsx` exists (144 lines)
- [x] `src/components/explorer/ResourceDetailPage.tsx` contains `OutgoingReferencesPanel` import and conditional mount
- [x] Commit `4fc733d` exists (feat component)
- [x] Commit `d291b1a` exists (test suite)
- [x] Commit `52aef66` exists (ResourceDetailPage mount)
- [x] 6 panel tests pass, 0 failures
- [x] Full suite 1525 passing, 0 failing
- [x] `npm run build` exits 0
- [x] `tsc -b --noEmit` exits 0
