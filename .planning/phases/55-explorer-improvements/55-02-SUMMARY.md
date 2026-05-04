---
phase: 55-explorer-improvements
plan: 02
subsystem: explorer
tags: [density, segmented-control, cards, compact, localStorage, mantine, react, jsdom]
dependency_graph:
  requires:
    - src/utils/summarizeResource.ts
    - src/contexts/PeekContext.tsx
    - src/hooks/useShortcuts.ts
    - src/utils/export.ts
    - Plan 55-01 (two-line summary cell + J key focus wiring)
  provides:
    - Density SegmentedControl (EXPL-02): Cards/Table/Compact modes with localStorage persistence
    - Cards mode: SimpleGrid of Paper cards with focusedResource wiring for J key
    - Compact mode: Table with verticalSpacing=xs and xs-sized primary text
    - EXPL-02 test coverage: search-results-density.test.tsx (7 tests)
  affects:
    - src/components/explorer/SearchResultsPage.tsx (SegmentedControl + 3-mode render branches)
tech_stack:
  added:
    - useLocalStorage from @mantine/hooks (already installed, new usage in SearchResultsPage)
    - SegmentedControl, SimpleGrid, Paper from @mantine/core (already installed, new usage)
  patterns:
    - useLocalStorage<'cards'|'table'|'compact'> with getInitialValueInEffect: false (no hydration flicker)
    - Conditional render via density === 'cards' / (density === 'table' || density === 'compact')
    - Cards mode Paper with tabIndex=0 + onFocus sets focusedResource (J key preserved in cards mode)
    - Cards onBlur uses closest('.mantine-SimpleGrid-root') to avoid clearing on intra-grid focus moves
key_files:
  created:
    - src/__tests__/search-results-density.test.tsx
  modified:
    - src/components/explorer/SearchResultsPage.tsx
decisions:
  - D-02 honored: SegmentedControl with cards/table/compact data, size=xs, left-aligned with Export on right
  - D-03 honored: Table mode unchanged from EXPL-01 (two-line summary, focus ring, J key)
  - D-04 honored: Compact mode uses verticalSpacing=xs + size=xs on primary + date
  - D-05 honored: Cards mode uses SimpleGrid cols={base:1,sm:2,lg:3}, Paper cards with full layout
  - D-08 honored: Wave 2 preserves Wave 1 two-line summary in Table AND Compact modes
  - D-09 honored: No changes to useShortcuts — radio inputs in SegmentedControl already trigger input guard
  - D-10 honored: useLocalStorage key=explorer.density.v1, default=table, getInitialValueInEffect=false
  - D-11 honored: Cards secondary uses lineClamp={1} (flex context); Table/Compact use truncate=end + maxWidth
metrics:
  duration: ~45 minutes
  completed_date: "2026-05-04"
  tasks: 3
  files_created: 1
  files_modified: 1
  tests_added: 7
---

# Phase 55 Plan 02: Explorer Improvements (EXPL-02 density SegmentedControl) Summary

**One-liner:** Density SegmentedControl with Cards/Table/Compact modes persisted to `explorer.density.v1` — SimpleGrid cards preserve J key via shared focusedResource state, Compact tightens Table row spacing, all modes preserve EXPL-01 two-line summary.

---

## What Was Built

### Task 1: Density State + SegmentedControl + 3-mode Render Branches

Modified `src/components/explorer/SearchResultsPage.tsx`:

**New imports added:**
- `Paper`, `SegmentedControl`, `SimpleGrid` from `@mantine/core`
- `useLocalStorage` from `@mantine/hooks`

**Density state (after `useShortcuts` call, line 159-167):**
```typescript
const [density, setDensity] = useLocalStorage<'cards' | 'table' | 'compact'>({
  key: 'explorer.density.v1',
  defaultValue: 'table',
  getInitialValueInEffect: false,
});
```

**Export Group replaced with SegmentedControl + Export Group:**
```tsx
<Group justify="space-between" align="center">
  <SegmentedControl
    value={density}
    onChange={(v) => setDensity(v as 'cards' | 'table' | 'compact')}
    data={[
      { value: 'cards', label: 'Cards' },
      { value: 'table', label: 'Table' },
      { value: 'compact', label: 'Compact' },
    ]}
    size="xs"
  />
  <Menu ...>{/* existing Export menu — unchanged */}</Menu>
</Group>
```

Shown only when `resources.length > 0` (same gate as before).

**Three render branches:**

1. **Cards mode** (`density === 'cards'`):
   - `<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">`
   - Each card: `<Paper withBorder p="sm" radius="sm" tabIndex={0} onFocus={() => setFocusedResource(r)} onBlur={(e) => ... closest('.mantine-SimpleGrid-root') check}>`
   - Card layout: ID (mono xs dimmed) + status badge | primary (fw=600 sm lineClamp=2) | secondary (dim mono xs lineClamp=1) | date (xs dimmed mt=4)
   - Focus ring: `outline: 2px solid var(--accent-ring)` when `focusedResource?.id === r.id`

2. **Table mode** (`density === 'table'` — default):
   - `<Table striped highlightOnHover withTableBorder>` — identical to EXPL-01
   - Summary cell: two-line Stack (primary fw=600 size=sm + secondary dim mono xs maxWidth=380)
   - `tabIndex={0}` + focus ring on rows (preserved from EXPL-01)

3. **Compact mode** (`density === 'compact'`):
   - Same Table structure but `verticalSpacing="xs"`
   - Primary text: `size="xs"` (down from "sm")
   - Summary secondary maxWidth: 300 (down from 380)
   - Date cell: `size="xs"`

### Task 2: EXPL-02 Density Tests

Created `src/__tests__/search-results-density.test.tsx` (183 lines, 7 `it()` blocks):

1. **SegmentedControl renders with three options** — Cards, Table, Compact labels visible after data load
2. **Default density is table** — `<table>` present, `.mantine-SimpleGrid-root` absent on first render
3. **Switching to compact keeps Table** — `localStorage.getItem('explorer.density.v1') === '"compact"'`, `<table>` still present
4. **Switching to cards renders SimpleGrid** — `.mantine-SimpleGrid-root` appears, `<table>` gone
5. **Density choice persists to localStorage** — `localStorage.getItem('explorer.density.v1') === '"cards"'`
6. **J key works in Cards mode** — `fireEvent.focus(card)` then `fireEvent.keyDown(document, {key: 'j'})` → `mockOpenPeek` called with `{resourceType: 'Patient', id: 'pat-a'}`
7. **SegmentedControl + Export hidden when resources empty** — Cards/Table/Compact/Export labels absent

**Mock pattern:** PeekContext mock (`usePeek → { openPeek: mockOpenPeek }`) + react-router-dom mock with static capability. `localStorage.clear()` in `beforeEach` prevents state leakage between tests.

### Task 3: Full Regression Check

- `npx tsc -b --noEmit`: exit 0 (no TypeScript errors)
- `npm test -- --run`: 166 test files passed, 1497 tests passed, 0 failed
- Plan 01 tests preserved: `search-results-summary.test.tsx` (6), `search-results-peek.test.tsx` (4), `SearchResultsPage.dateStatus.test.tsx` (17), `peek-srp-integration.test.tsx` (4)
- Phase 52-54 test files (peek-drawer, json-mode-view, resource-detail-summary-mode, etc.) all green

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree branch pre-Plan-01 state caused staging area regression**
- **Found during:** Task 1 initial commit
- **Issue:** The worktree's branch (worktree-agent-a86725718c8d2c906) was based on commit 26efb93 (pre-Phase-52), while the target base was e67ae09 (Plan 01 complete). `git reset --soft e67ae09` moved HEAD but left the working tree in the older state, causing the staging area to show all Phase 52-54 files as deletions. The Task 1 commit accidentally deleted 50+ files.
- **Fix:** Restored all files from e67ae09 via `git checkout e67ae09 -- [file list]`. Removed `DeveloperJsonView.tsx` which was created by the old working tree state but no longer exists at e67ae09 (merged into JsonModeView in Phase 54).
- **Files modified:** 53 files restored in fix commit 890a934
- **Commits:** 6bc6f85 (Task 1 with regression), 890a934 (fix — restores all Phase 52-54 files)

**2. [Rule 1 - Bug] Compact test `document.querySelector('table')` timing issue**
- **Found during:** Task 2 — compact mode test failing with `expected null to be truthy`
- **Issue:** After `fireEvent.click('Compact')`, the density state update is async (useLocalStorage sets state via `setState`), so React re-renders asynchronously. The immediate `expect(document.querySelector('table'))` ran before the re-render completed and saw the old render state (which had no table due to transient state).
- **Fix:** Wrapped both assertions (`localStorage` check AND `table` presence check) in `waitFor()` to allow React's state update + re-render to complete.
- **Files modified:** `search-results-density.test.tsx`

**3. [Rule 3 - Blocking] PeekContext and useShortcuts missing from worktree**
- **Found during:** Task 1 TypeScript check
- **Issue:** `src/contexts/PeekContext.tsx` and `src/hooks/useShortcuts.ts` don't exist in the worktree (they're from Phase 52, built after the worktree branched off). SearchResultsPage.tsx imports both.
- **Fix:** Restored both files from `main` branch via `git show main:src/... > dst`.
- **Files created:** `src/contexts/PeekContext.tsx`, `src/hooks/useShortcuts.ts`
- **Commit:** 6bc6f85 (included in Task 1 commit)

---

## Known Stubs

None. All three density modes render real data from `summarizeResource`, `getResourceDateByType`, and `getResourceStatusByType`. No hardcoded placeholders.

---

## Threat Flags

**T-55-04 mitigation applied:** `useLocalStorage` typed as `'cards' | 'table' | 'compact'` — unknown localStorage values fall through both `density === 'cards'` and `(density === 'table' || density === 'compact')` conditions, rendering no list (recoverable by clicking any SegmentedControl option).

No new threat surface beyond what was described in the Plan 02 threat model.

---

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/__tests__/search-results-density.test.tsx`
- FOUND: `src/components/explorer/SearchResultsPage.tsx` (modified)

**Commits verified:**
- FOUND: `6bc6f85` feat(55-02): density SegmentedControl + 3-mode render branches (EXPL-02)
- FOUND: `890a934` fix(55-02): restore Phase 52-54 files accidentally deleted in Task 1 commit
- FOUND: `d7a0c30` test(55-02): EXPL-02 density mode coverage — 7 tests locking SegmentedControl contract
- FOUND: `7e498f8` chore(55-02): full regression check — 166 test files, 1497 tests pass, tsc clean

**Acceptance criteria:**
- `grep -n "explorer.density.v1" SearchResultsPage.tsx`: 2 matches (comment + key)
- `grep -n "SegmentedControl" SearchResultsPage.tsx`: 2 matches (import + usage)
- `grep -n "SimpleGrid" SearchResultsPage.tsx`: 4 matches (import + usage + onBlur + closing tag)
- `grep -n "Paper" SearchResultsPage.tsx`: 3 matches (import + open + close)
- `grep -n "useLocalStorage" SearchResultsPage.tsx`: 2 matches (import + usage)
- `grep -n "verticalSpacing={density === 'compact' ? 'xs' : undefined}"`: 1 match
- `grep -n "lineClamp={2}"`: 1 match (Cards primary)
- `grep -n "lineClamp={1}"`: 1 match (Cards secondary)
- `grep -n "mantine-SimpleGrid-root"`: 1 match (Cards onBlur)
- All 7 density tests pass
- All 166 test files pass (1497 tests)
- `npx tsc -b --noEmit`: exit 0
