---
phase: 56
plan: "01"
subsystem: layout
tags: [spotlight, expert-mode, cmd-k, context, appshell]
dependency_graph:
  requires: [PeekContext, ConnectionContext, fhir-categories, capability.ts]
  provides: [ExpertModeContext, AppSpotlight]
  affects: [AppLayout, main.tsx]
tech_stack:
  added: ["@testing-library/user-event@^14"]
  patterns: [useLocalStorage-persistence, portal-component, lazy-filter-gate]
key_files:
  created:
    - src/contexts/ExpertModeContext.tsx
    - src/components/layout/Spotlight.tsx
    - src/__tests__/expert-mode-context.test.tsx
    - src/__tests__/spotlight-cmd-k.test.tsx
  modified:
    - src/components/layout/AppLayout.tsx
    - src/main.tsx
decisions:
  - "D-01: mod+K shortcut on Spotlight — honored; uses shortcut='mod+K' prop on <Spotlight>"
  - "D-02: AppSpotlight mounted at AppLayout shell level — honored; inside ExpertModeProvider above AppShell"
  - "D-03: Lazy >=2 char gate — honored; groups useMemo returns [] when query.length < 2"
  - "D-04: useLocalStorage key app.expertMode.v1 — honored; getInitialValueInEffect: false"
metrics:
  duration_minutes: 12
  completed: "2026-05-04T21:33:33Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 2
---

# Phase 56 Plan 01: AppSpotlight + ExpertModeContext Shell Wiring Summary

ExpertModeProvider with localStorage persistence and AppSpotlight ⌘K palette with lazy (>=2 char) resource-type search, both mounted at AppLayout shell level.

## What Was Built

### ExpertModeContext (`src/contexts/ExpertModeContext.tsx`)
- `ExpertModeProvider` persists `isExpert` boolean to localStorage key `app.expertMode.v1`
- `getInitialValueInEffect: false` avoids hydration flicker
- `useExpertMode()` hook throws with a clear message when used outside provider
- Exposes `{ isExpert, toggle, setExpert }` — ready for Wave 2 (Plan 02) consumers

### AppSpotlight (`src/components/layout/Spotlight.tsx`)
- Mounts a single `<Spotlight shortcut="mod+K">` instance (Mantine v8 API, not `<SpotlightProvider>`)
- Lazy action loading: `groups` useMemo returns `[]` until `query.length >= 2` (D-03)
- Reads `useConnectionContext()` to parse resource types from CapabilityStatement
- Groups actions by `CATEGORY_ORDER` from `fhir-categories.ts`
- `nothingFound` label is context-aware: disconnected vs. too-short query vs. no matches
- `closeSpotlight()` called on action click after `navigate()`

### AppLayout updates (`src/components/layout/AppLayout.tsx`)
- Wraps entire layout with `<ExpertModeProvider>`
- Mounts `<AppSpotlight />` before `<AppShell>` (inside ExpertModeProvider)
- All existing structure preserved verbatim: RouteLoadingFallback JSDoc, PeekProvider, JsonPeekDrawer, FeedbackButton gating

### main.tsx
- Added `import '@mantine/spotlight/styles.css'` after notifications styles

## Tests

| Suite | File | Tests |
|-------|------|-------|
| ExpertModeContext | expert-mode-context.test.tsx | 3 |
| AppSpotlight | spotlight-cmd-k.test.tsx | 5 |
| **Total new** | | **8** |

Full suite result: **1505 tests, 168 files — all passing** (up from 1240+ baseline).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @testing-library/user-event dependency**
- **Found during:** Task 3 — test file uses `userEvent.type()`
- **Issue:** Package not installed; import failed at test runtime
- **Fix:** `npm install --save-dev @testing-library/user-event`
- **Files modified:** package.json, package-lock.json
- **Commit:** e486418

**2. [Rule 1 - Bug] Test polyfills missing for Mantine 8 jsdom compat**
- **Found during:** Task 3 — tests failed with `window.matchMedia is not a function`
- **Issue:** Mantine 8 MantineProvider calls `window.matchMedia` in layout effects; jsdom doesn't implement it
- **Fix:** Added `ResizeObserver`, `matchMedia`, and `scrollIntoView` polyfills at the top of the test file, following the canonical pattern from `coding-coverage-panel.test.tsx`
- **Files modified:** src/__tests__/spotlight-cmd-k.test.tsx
- **Commit:** e486418

**3. [Rule 1 - Bug] Test assertions used unregistered jest-dom matchers**
- **Found during:** Task 3 — `toBeInTheDocument` threw "Invalid Chai property"
- **Issue:** `@testing-library/jest-dom` is installed but not configured as a global setup file
- **Fix:** Added `import '@testing-library/jest-dom'` explicitly in the test file
- **Files modified:** src/__tests__/spotlight-cmd-k.test.tsx
- **Commit:** e486418

**4. [Rule 1 - Bug] `findByText('Patient')` failed due to highlightQuery text splitting**
- **Found during:** Task 3 — Mantine Spotlight with `highlightQuery` renders `<mark>Pa</mark><span>tient</span>`, breaking exact text match
- **Issue:** `screen.findByText('Patient')` fails when text is split across child elements
- **Fix:** Changed assertions to use `getByRole('button', { name: /Patient/i })` which matches accessible name across child elements
- **Files modified:** src/__tests__/spotlight-cmd-k.test.tsx
- **Commit:** e486418

**5. [Rule 1 - Bug] Spotlight input not immediately available after synchronous `act(() => openSpotlight())`**
- **Found during:** Task 3 — Spotlight modal uses animation/portal, input not in DOM synchronously
- **Issue:** `screen.getByPlaceholderText(...)` threw after synchronous `act()`
- **Fix:** Changed to `await screen.findByPlaceholderText(...)` and added `waitFor()` wrappers
- **Files modified:** src/__tests__/spotlight-cmd-k.test.tsx
- **Commit:** e486418

## API Note

Mantine v8 uses `<Spotlight>` (not `<SpotlightProvider>` — that name doesn't exist in v8). The CONTEXT.md reference was a misnomer; correct v8 API confirmed from `node_modules/@mantine/spotlight/lib/Spotlight.d.ts` before writing.

`scrollable` and `maxHeight` props are valid on `SpotlightRootProps` (confirmed from `SpotlightRoot.d.ts`) and pass TypeScript clean.

## Hand-off for Plan 02

`ExpertModeProvider` is mounted at the AppLayout shell level. Any descendant can call `useExpertMode()` to read/toggle `isExpert`. Key consumers for Plan 02:
- `src/components/layout/Sidebar.tsx` — add expert mode toggle UI
- `src/pages/explorer/SearchResultsPage.tsx` — conditionally show raw FHIR fields

The `AppSpotlight` is live and reachable via ⌘K (or `openSpotlight()` programmatically). Plan 02 can extend the action set or add keyboard shortcut hints to the Sidebar.

## Self-Check: PASSED

Files verified present:
- src/contexts/ExpertModeContext.tsx — FOUND
- src/components/layout/Spotlight.tsx — FOUND
- src/__tests__/expert-mode-context.test.tsx — FOUND
- src/__tests__/spotlight-cmd-k.test.tsx — FOUND
- src/components/layout/AppLayout.tsx — FOUND (modified)
- src/main.tsx — FOUND (modified)

Commits verified:
- c87bb18 (ExpertModeContext) — FOUND
- 2ca645c (AppSpotlight) — FOUND
- e486418 (AppLayout + main.tsx + tests) — FOUND
