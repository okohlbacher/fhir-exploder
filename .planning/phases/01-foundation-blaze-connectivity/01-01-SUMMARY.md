---
phase: 01-foundation-blaze-connectivity
plan: 01
subsystem: ui
tags: [react, vite, mantine, medplum, typescript, vitest, routing]

requires: []
provides:
  - Vite + React 18 + TypeScript project scaffold with all dependencies
  - Mantine AppShell with 240px sidebar and navigation
  - Settings loader (loadSettings) with YAML parsing and fallback defaults
  - AppSettings type with FHIR server URL and auth mode configuration
  - Vitest test infrastructure with scaffold files for CONN-01 through CONN-05
  - React Router routes for all entry points (/, /explorer, /patients, /quality, /settings)
  - Vite dev proxy for CORS bypass to Blaze at localhost:8080
affects: [01-02, 01-03, 02-resource-explorer, 03-patient-browser]

tech-stack:
  added: [react@18, vite@8, typescript@5.9, mantine@8, medplum@5.1.7, react-router-dom@7, js-yaml@4.1.1, vitest@4, tabler-icons-react]
  patterns: [mantine-appshell-sidebar, settings-yaml-fetch, deep-merge-defaults]

key-files:
  created:
    - src/main.tsx
    - src/App.tsx
    - src/theme.ts
    - src/config/types.ts
    - src/config/settings.ts
    - src/components/layout/AppLayout.tsx
    - src/components/layout/Sidebar.tsx
    - public/settings.yaml
    - vitest.config.ts
    - vite.config.ts
  modified: []

key-decisions:
  - "settings.yaml placed in public/ (Vite serves it at /settings.yaml) since browsers cannot read local filesystem"
  - "React 18 chosen over React 19 for Mantine 8 compatibility stability"
  - "TypeScript 5.9 used (within ^5.7.0 range) -- TS 6.x excluded per CLAUDE.md guidance"
  - "Connection status modeled as idle/connecting/connected/error state machine from plan start"

patterns-established:
  - "Settings loading: fetch /settings.yaml, parse with js-yaml, deep-merge with DEFAULTS"
  - "Layout: Mantine AppShell with fixed 240px sidebar, gray.0 background, lg padding"
  - "Navigation: react-router NavLink integrated with Mantine NavLink component"
  - "Test scaffolds: describe blocks with it.todo() for future implementation"

requirements-completed: [CONN-01]

duration: 5min
completed: 2026-04-11
---

# Phase 1 Plan 01: Project Scaffold Summary

**Vite + React 18 + Mantine 8 app shell with sidebar navigation, settings.yaml loader, and vitest test scaffolds**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-11T15:17:52Z
- **Completed:** 2026-04-11T15:22:40Z
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments
- Full Vite + React 18 + TypeScript project with all Medplum, Mantine, and routing dependencies installed
- Mantine AppShell with 240px sidebar containing Explorer, Patients, Quality, Settings nav items with tabler icons and connection status dot
- Settings loader that fetches public/settings.yaml, parses with js-yaml, deep-merges with defaults, and handles missing/malformed files gracefully
- Vitest configured with 22 todo test scaffolds covering settings, errors, capability, and FHIR categories

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite project, install dependencies, configure build tooling and test infrastructure** - `b3ed1a9` (feat)
2. **Task 2: Create config types, settings loader, and theme** - `0a7a9aa` (feat)
3. **Task 3: Create app shell with sidebar, routing, and entry point** - `f6dc59e` (feat)

## Files Created/Modified
- `package.json` - All dependencies: Medplum, Mantine, routing, config, icons, testing
- `vite.config.ts` - Vite config with /fhir proxy to localhost:8080
- `vitest.config.ts` - Vitest with jsdom environment and globals
- `index.html` - Entry HTML with "FHIR Exploder" title
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` - TypeScript project references
- `src/main.tsx` - App entry with MantineProvider, BrowserRouter, Notifications
- `src/App.tsx` - Router setup with 5 routes and settings loading
- `src/theme.ts` - Mantine theme with system font stack, blue primary
- `src/config/types.ts` - AppSettings interface with FHIR auth modes
- `src/config/settings.ts` - loadSettings() with YAML fetch and deep-merge
- `src/components/layout/AppLayout.tsx` - Mantine AppShell with sidebar and Outlet
- `src/components/layout/Sidebar.tsx` - Navigation sidebar with connection status indicator
- `public/settings.yaml` - Default settings (localhost:8080, open auth)
- `src/__tests__/settings.test.ts` - 4 todo tests for settings loading
- `src/__tests__/errors.test.ts` - 8 todo tests for error classification
- `src/__tests__/capability.test.ts` - 5 todo tests for CapabilityStatement parsing
- `src/__tests__/fhir-categories.test.ts` - 5 todo tests for resource categorization

## Decisions Made
- **settings.yaml in public/:** D-05 specifies settings.yaml at project root, but browsers cannot read the local filesystem. Placed in `public/` so Vite serves it at `/settings.yaml`. Users edit `public/settings.yaml` instead of `./settings.yaml`. This is a technical necessity for browser-based apps.
- **React 18 over Vite scaffold default (React 19):** Vite 8 scaffolds with React 19 by default. Downgraded to React 18 per CLAUDE.md for Mantine 8 compatibility stability.
- **TypeScript 5.9 over scaffold default (TS 6.0):** Vite 8 scaffolds with TS ~6.0.2. Changed to ^5.7.0 per CLAUDE.md guidance. Installed 5.9.3 which supports all needed features including erasableSyntaxOnly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vite scaffold generates React 19 + TS 6 defaults**
- **Found during:** Task 1 (project scaffolding)
- **Issue:** `npm create vite@latest` with react-ts template generates React 19 and TypeScript 6.0.2, which contradict CLAUDE.md requirements
- **Fix:** Rewrote package.json with React ^18.3.1, @types/react ^18.3.28, and TypeScript ^5.7.0 before installing
- **Files modified:** package.json
- **Verification:** npm install succeeded, tsc --noEmit passes, build passes
- **Committed in:** b3ed1a9

**2. [Rule 3 - Blocking] Vite scaffold cannot run in non-empty directory**
- **Found during:** Task 1 (project scaffolding)
- **Issue:** `npm create vite@latest .` cancelled because directory contains .planning/ and CLAUDE.md
- **Fix:** Scaffolded to /tmp/vite-scaffold, then copied files to project directory
- **Files modified:** All scaffold files
- **Verification:** All expected files present, build passes
- **Committed in:** b3ed1a9

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary to work within project constraints (CLAUDE.md stack requirements, existing directory). No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- App shell and routing ready for Plan 01-02 (connection flow with MedplumClient)
- Settings loader ready to provide server URL and auth config to connection flow
- Connection status state machine in place, ready to be wired to actual connection logic
- Test scaffolds ready for implementation in Plans 01-02 and 01-03

## Self-Check: PASSED

All 14 created files verified present. All 3 task commits verified in git history.

---
*Phase: 01-foundation-blaze-connectivity*
*Completed: 2026-04-11*
