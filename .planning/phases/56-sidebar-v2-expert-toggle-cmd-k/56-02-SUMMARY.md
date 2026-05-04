---
phase: 56
plan: 02
subsystem: sidebar, explorer
tags: [expert-mode, sidebar, search-results, ui]
dependency_graph:
  requires: [56-01]
  provides: [SIDE-02, SIDE-03, SIDE-04]
  affects: [Sidebar, SearchResultsPage]
tech_stack:
  added: []
  patterns: [isExpert conditional render, source-grep contract test]
key_files:
  modified:
    - src/components/layout/Sidebar.tsx
    - src/components/explorer/SearchResultsPage.tsx
    - src/__tests__/sidebar-terminology-row.test.tsx
    - src/components/layout/__tests__/Sidebar.test.tsx
    - src/__tests__/peek-srp-integration.test.tsx
    - src/__tests__/search-results-density.test.tsx
    - src/__tests__/search-results-peek.test.tsx
    - src/__tests__/search-results-summary.test.tsx
  created:
    - src/__tests__/expert-toggle.test.tsx
decisions:
  - D-04 honored: localStorage key app.expertMode.v1
  - D-05 honored: Switch placement after Settings section
  - D-06 honored: ID cell truncation + server URL as expert effects
  - D-07 honored: cmd-k hint button + Explorer count badge
  - Test 5 as source-grep contract avoids mounting SearchResultsPage in isolation
metrics:
  duration: ~20 min
  completed: "2026-05-04T21:45:32Z"
  tasks_completed: 3
  files_modified: 9
  files_created: 1
---

# Phase 56 Plan 02: Sidebar v2 Expert Toggle + ID Cell + Count Badge Summary

Expert mode user-visible surfaces wired: ExpertModeProvider toggle in Sidebar footer, conditional ID truncation in SearchResultsPage, conditional server URL in Sidebar Server card, cmd-k hint button, and Explorer count badge.

## What Was Built

### Task 1 — SearchResultsPage ID cell truncation (SIDE-03)
- Added `useExpertMode` import from `ExpertModeContext`
- Added `const { isExpert } = useExpertMode()` inside `SearchResultsPage()`
- Cards-mode ID Text: `truncate` and `maxWidth:180` suppressed when `isExpert`
- Table-mode ID Anchor: `truncate` and `maxWidth:200` suppressed when `isExpert`
- Commit: `b45fbf3`

### Task 2 — Sidebar 4 new surfaces (SIDE-02 / SIDE-03 / SIDE-04)
Added to `Sidebar.tsx`:
- New imports: `Kbd`, `Switch` (Mantine), `openSpotlight`, `useExpertMode`, `useConnectionContext`, `useResourceCounts`, `parseResourceTypes`
- Surface 1 (SIDE-04): `⌘K` hint `UnstyledButton` above Server card, `data-testid="cmd-k-hint"`
- Surface 2 (SIDE-03): Conditional server URL `Text` inside Server card Stack, `data-testid="sidebar-server-url"`
- Surface 3 (SIDE-02): Expert mode `Switch` in new `AppShell.Section` after Settings, `data-testid="expert-mode-switch"`
- Surface 4 (SIDE-04): Explorer count `Badge` via `SidebarRow rightSection` prop, `data-testid="explorer-count-badge"`
- `SidebarRow` extended with optional `rightSection?: React.ReactNode` prop
- Commit: `5b3c28b`

### Task 3 — Expert toggle tests (5 tests)
Created `src/__tests__/expert-toggle.test.tsx`:
1. `defaults to expert mode = false (Switch unchecked)` — verifies Switch is unchecked on mount
2. `flips state and persists to localStorage when Switch is toggled` — localStorage key `app.expertMode.v1` becomes `'true'`
3. `hides sidebar-server-url when expert mode is OFF` — `queryByTestId` returns null
4. `shows sidebar-server-url with correct URL text when expert mode is ON` — pre-sets localStorage to `'true'`, checks text content
5. `source-grep contract` — reads SearchResultsPage.tsx as text, asserts import + conditional truncation patterns present

Rule 1 fixes: Added `vi.mock('../contexts/ExpertModeContext')` to 6 existing test files that mount Sidebar or SearchResultsPage but lacked the provider.
- Commit: `255d1ef`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree behind main branch**
- **Found during:** Initial file reads
- **Issue:** Worktree was at commit `26efb93` (v1.7 milestone), 86 commits behind main which had Plan 01 work
- **Fix:** `git merge main --no-edit` — merged cleanly, no conflicts
- **Impact:** Required re-reading Sidebar.tsx and SearchResultsPage.tsx which had evolved

**2. [Rule 3 - Blocking] AppShell context required by Sidebar.Section**
- **Found during:** Task 3 first test run
- **Issue:** `AppShell.Section` throws "AppShell was not found in tree" without ancestor `AppShell`
- **Fix:** Wrapped test render in `<AppShell navbar=...><AppShell.Navbar>` (same as existing sidebar-terminology-row.test.tsx pattern)

**3. [Rule 1 - Bug] Test regressions from adding useExpertMode to Sidebar + SearchResultsPage**
- **Found during:** Full test suite run after Tasks 1+2
- **Issue:** 31 tests failed — existing Sidebar and SearchResultsPage tests lacked ExpertModeProvider mock
- **Fix:** Added `vi.mock('../contexts/ExpertModeContext')` stub to 6 test files:
  - `Sidebar.test.tsx`, `sidebar-terminology-row.test.tsx` (Sidebar consumers)
  - `peek-srp-integration.test.tsx`, `search-results-density.test.tsx`, `search-results-peek.test.tsx`, `search-results-summary.test.tsx` (SearchResultsPage consumers)

**4. [Rule 1 - Bug] sidebar-terminology-row.test.tsx also needed ConnectionContext + SettingsContext mocks**
- **Found during:** Same regression sweep
- **Issue:** Using real `SettingsProvider` + `ConnectionProvider` but Sidebar now calls `useSettingsContext()` and `useConnectionContext()` directly; `loadSettings` async call in SettingsProvider was causing issues
- **Fix:** Added vi.mock for both contexts + `useSettingsContext` in that test file

### Test 5 Implementation Note
Test 5 uses a source-grep contract (reads SearchResultsPage.tsx as text via `readFileSync`) rather than a full component mount. This avoids the need to mock the complex `ExplorerLayout` outlet context while still providing a contract that would catch regressions if the conditional truncation is removed.

## Phase 56 Closure

SIDE-01..SIDE-04 delivered across Plans 01 + 02:
- **SIDE-01** (Plan 01): `ExpertModeContext` with `useLocalStorage` persistence (`app.expertMode.v1`)
- **SIDE-01** (Plan 01): `AppSpotlight` component with resource-type actions wired to `ExpertModeProvider + AppLayout`
- **SIDE-02** (Plan 02): Expert Toggle Switch in Sidebar footer
- **SIDE-03** (Plan 02): Expert effects — ID truncation in SearchResultsPage + server URL in Sidebar
- **SIDE-04** (Plan 02): cmd-k hint button + Explorer count badge in Sidebar

## Final Verification

- `npx tsc -b --noEmit`: exit 0
- `npm test -- --run`: 1510/1510 passed (0 regressions, 5 new)
- `npm run build`: exit 0 (built in 491ms)

## Self-Check: PASSED
