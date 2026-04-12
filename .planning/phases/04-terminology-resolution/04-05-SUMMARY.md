---
phase: 04-terminology-resolution
plan: 05
subsystem: terminology
tags: [terminology, sidebar, settings, ui, health-probe, clear-cache]

requires:
  - phase: 04-terminology-resolution
    plan: "01"
    provides: probeTerminologyHealth + createTerminologyClient + TerminologyHealth union
  - phase: 04-terminology-resolution
    plan: "02"
    provides: TerminologyCache.clear() + LOCAL_STORAGE_PREFIX
  - phase: 04-terminology-resolution
    plan: "03"
    provides: TerminologyResolver + TerminologyProvider + useTerminology
  - phase: 04-terminology-resolution
    plan: "04"
    provides: TerminologyProvider mounted inside AppRoutes
provides:
  - "useTerminologyHealth() hook driving sidebar status row from probeTerminologyHealth"
  - "TERMINOLOGY_STATUS_CONFIG shared module (src/terminology/statusConfig.ts) — Sidebar + Settings use one map"
  - "Sidebar renders two-row status block: FHIR + Terminology, locked UI-SPEC C-1 copy"
  - "SettingsPage Terminology Server Paper section with URL, inline status, Clear button"
  - "Clear terminology cache button — atomic memory + localStorage wipe with Mantine notification"
affects: []

tech-stack:
  added: []
  patterns:
    - "Shared status map module avoids drift between Sidebar and Settings renderings"
    - "Hook-consumed useTerminologyHealth inside Sidebar keeps AppLayout prop surface unchanged"
    - "Mantine notifications.show invoked synchronously after cache.clear() — no async ceremony"
    - "jsdom color assertion via rgb() rather than hex — browsers normalize inline style colors to rgb(r,g,b)"

key-files:
  created:
    - "src/hooks/useTerminologyHealth.ts"
    - "src/terminology/statusConfig.ts"
    - "src/__tests__/sidebar-terminology-row.test.tsx"
    - "src/__tests__/settings-clear-cache.test.tsx"
  modified:
    - "src/components/layout/Sidebar.tsx"
    - "src/components/settings/SettingsPage.tsx"

key-decisions:
  - "Extracted TERMINOLOGY_STATUS_CONFIG into src/terminology/statusConfig.ts so Sidebar and Settings share one source of truth for copy + colors"
  - "useTerminologyHealth re-probes on settings.terminology.serverUrl change and resets to 'unknown' (rendered as 'Checking…') before each probe"
  - "Sidebar consumes the hook directly — AppLayout prop surface is unchanged (connectionStatus only), so no upstream refactor was needed"
  - "SettingsPage shows the inline status dot using the Sidebar's same token map; label prefix 'Terminology: ' is stripped at render time since the field already has its own 'Status' label"
  - "handleClearCache is synchronous — Map.clear() + localStorage.removeItem are cheap, so no loading state or async guard is needed"
  - "Test assertions match jsdom's rgb() normalization of inline hex colors, not the source hex literals — source still uses the exact UI-SPEC hex values"

patterns-established:
  - "Pattern: Shared status config module consumed by multiple components — keeps color/copy drift impossible"
  - "Pattern: Hooks that read settings + kick off a probe are self-contained; consumers don't pass state down through layout trees"
  - "Pattern: Mantine notification after a synchronous destructive-but-recoverable action (no modal confirm per UI-SPEC C-2)"

requirements-completed:
  - TERM-02
  - TERM-03

duration: 3min 49s
completed: 2026-04-12
---

# Phase 04 Plan 05: Sidebar Health Row + Settings Clear Button Summary

**User-visible chrome for Phase 4: the sidebar now renders a second status row beneath the FHIR row showing `Terminology: Reachable / Unreachable / Not configured / Checking…` with the exact UI-SPEC color tokens, and SettingsPage gains a `Terminology Server` Paper with URL, inline status dot, and a `Clear terminology cache` Button that atomically wipes memory + localStorage and announces the result via Mantine notification.**

## Performance

- **Duration:** 3 min 49 s
- **Started:** 2026-04-12T07:36:07Z
- **Completed:** 2026-04-12T07:39:56Z (approx)
- **Tasks:** 2 (TDD: RED → GREEN for each)
- **Files created:** 4
- **Files modified:** 2

## Accomplishments

- `useTerminologyHealth()` drives the sidebar's second row with `'unknown' | 'ok' | 'unreachable' | 'not-configured'` — re-probes on `settings.terminology.serverUrl` change, never throws (D-08)
- Sidebar renders a `<Stack gap="xs" mt="xs">` with two `<Group gap="xs">` rows using identical 8px dot geometry and the exact UI-SPEC Copywriting Contract strings (`FHIR server: Connected`, `Terminology: Reachable`, etc.)
- `TERMINOLOGY_STATUS_CONFIG` lives in `src/terminology/statusConfig.ts` — Sidebar and SettingsPage import the same map, guaranteeing color + copy parity (`#40c057`, `#fa5252`, `#adb5bd` with pulse on `unknown`)
- SettingsPage gets a new `<Paper p="lg" shadow="xs">` section titled `Terminology Server` with three rows: Server URL (`<Code>` or dimmed "Not configured — set terminology.serverUrl in settings.yaml"), Status (inline dot + stripped label), and Clear button
- Clear button is `variant="light"` `color="red"` with `IconTrash size={16}` leftSection per UI-SPEC C-2 — `onClick` reads `resolver.cache.size()` BEFORE `.clear()` and dispatches the correct empty/singular/plural Mantine notification copy (D-06 / D-11)
- V-15 UI-layer assertion green: 4 new tests in `sidebar-terminology-row.test.tsx` mock `useTerminologyHealth` with each state and assert both the label text and dot color
- V-09 integration test green: `settings-clear-cache.test.tsx` pre-populates two cache entries, clicks Clear, asserts `cache.size() === 0`, no `tx-cache:v1:` keys remain in localStorage, and the `Cache cleared` toast body matches the N>1 copy
- 6 new tests green, 0 regressions: full suite at 170 passed / 22 todo / 3 skipped (24 test files)

## Task Commits

Each task committed atomically in TDD order:

1. **Task 1 RED:** `0bf631d` — `test(04-05): add failing sidebar terminology row test (V-15 UI)`
2. **Task 1 GREEN:** `5f16825` — `feat(04-05): add useTerminologyHealth + two-row sidebar status block`
3. **Task 2 RED:** `4f92812` — `test(04-05): add failing clear-cache integration test (V-09)`
4. **Task 2 GREEN:** `ce506be` — `feat(04-05): add Terminology Server section with Clear cache button`

## Public API

### useTerminologyHealth

```typescript
import { useTerminologyHealth } from './hooks/useTerminologyHealth';

function MyComponent() {
  const health = useTerminologyHealth();
  // health: 'unknown' | 'ok' | 'unreachable' | 'not-configured'
}
```

**Contract:**
- `'unknown'` until the probe settles (Sidebar / Settings render this as `Checking…` with a pulsing dot)
- Re-probes when `settings.terminology.serverUrl` changes (returns to `unknown` then resolves to one of `ok`/`unreachable`/`not-configured`)
- Never throws — all probe failure modes collapse into `'unreachable'`

### TERMINOLOGY_STATUS_CONFIG

```typescript
import { TERMINOLOGY_STATUS_CONFIG } from './terminology/statusConfig';

const { color, label, pulse } = TERMINOLOGY_STATUS_CONFIG[health];
```

Shared by Sidebar (full label) and SettingsPage (label with `Terminology: ` prefix stripped).

## Sidebar New Structure

```tsx
<AppShell.Section p="md">
  <Text fw={600} size="lg">FHIR Exploder</Text>
  <Stack gap="xs" mt="xs">
    <Group gap="xs">{/* FHIR status: 8px dot + Text size="xs" c="dimmed" */}</Group>
    <Group gap="xs">{/* Terminology status: same pattern */}</Group>
  </Stack>
</AppShell.Section>
```

AppLayout's prop surface is unchanged (still `connectionStatus: ConnectionStatus`). The Sidebar consumes `useTerminologyHealth` itself.

## SettingsPage New Section

Rendered below the existing FHIR `<Paper>`:

```
Terminology Server                   ← Title order={3}
  Server URL                         ← Text fw={600} size="sm"
  <Code>https://r4.ontoserver.csiro.au/fhir</Code>  (or dimmed empty-state)

  Status                             ← Text fw={600} size="sm"
  ● Reachable                        ← 8px dot + Text size="sm"

  [ 🗑 Clear terminology cache ]     ← Button variant="light" color="red" size="sm"
```

### Notification Copy Rules (V-09)

| Cache size before click | Toast body                                                   |
| ----------------------- | ------------------------------------------------------------ |
| 0                       | `No cached terms to clear.`                                  |
| 1                       | `1 cached term removed from memory and local storage.`       |
| N > 1                   | `${N} cached terms removed from memory and local storage.`   |

Toast title is always `Cache cleared`, color `green`.

## Shared Status Config Module

`src/terminology/statusConfig.ts` was extracted (plan allowed a local copy OR extraction, extraction was preferred). Sidebar and SettingsPage both import `TERMINOLOGY_STATUS_CONFIG` from this module. Adding a new state or re-tuning a color is now a single-file change.

## Notifications Provider Mount

Already mounted in `src/main.tsx` from Phase 1. No changes required:

```tsx
<MantineProvider theme={theme} defaultColorScheme="light">
  <Notifications />
  <BrowserRouter>…</BrowserRouter>
</MantineProvider>
```

## Decisions Made

- **Shared status config module:** extracted into `src/terminology/statusConfig.ts` rather than duplicating the map in Sidebar and SettingsPage. Plan 05 explicitly permitted either approach; extraction was chosen so copy + color drift between the two surfaces is impossible.
- **Sidebar consumes the hook directly:** `useTerminologyHealth` is called inside `Sidebar.tsx` rather than threaded as a prop through `AppLayout`. Keeps AppLayout's prop surface minimal (still just `connectionStatus`) and matches the pattern already used by `useTerminology` inside detail views.
- **Hook signal resets to `'unknown'` before each probe:** when `settings.terminology.serverUrl` changes, the hook synchronously flips state back to `'unknown'` (rendered as `Checking…` with a pulsing dot) before kicking off the async probe. Avoids a visual glitch where stale `'ok'` lingers after the URL changes to a dead server.
- **Synchronous clear action:** `Map.clear()` + `localStorage.removeItem` are cheap — no loading state or async guard needed. Mantine `notifications.show` fires immediately after, consistent with UI-SPEC C-2 "action is synchronous".
- **Color assertions use jsdom-normalized rgb():** jsdom rewrites inline hex colors like `#40c057` to `rgb(64, 192, 87)` in `getAttribute('style')`. The four V-15 UI tests match the rgb() form; the source components still use the exact UI-SPEC hex literals (greppable for audit).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Removed `@testing-library/user-event` dependency from test**

- **Found during:** Task 2 RED — first run of `settings-clear-cache.test.tsx`
- **Issue:** Plan Task 2 sketch suggested `userEvent.click()`. But `@testing-library/user-event` is NOT installed in this project (only `@testing-library/react`). The RED test failed at import resolution rather than with a real assertion failure.
- **Fix:** Swapped to `fireEvent.click()` from `@testing-library/react`, matching the pattern used in `patient-view-toggle.test.tsx`. Behavioral semantics identical for a plain `onClick` handler with no hover/focus side effects.
- **Files modified:** `src/__tests__/settings-clear-cache.test.tsx`
- **Verification:** 2/2 green after the fix.
- **Committed in:** `4f92812` (bundled with Task 2 RED)

**2. [Rule 1 — Bug] Removed `toBeInTheDocument` jest-dom matcher from sidebar test**

- **Found during:** Task 1 first attempt at running `sidebar-terminology-row.test.tsx`
- **Issue:** Plan Task 1 sketch used `expect(...).toBeInTheDocument()` — a `@testing-library/jest-dom` matcher. `jest-dom` is NOT a dependency of this project (zero pre-existing uses). The test failed with `Invalid Chai property: toBeInTheDocument`.
- **Fix:** Swapped to `expect(...).toBeTruthy()`, which works against the node returned by `screen.getByText()`. Functionally equivalent (`getByText` throws if the node is not found, so `toBeTruthy` is satisfied only when the text IS in the document).
- **Files modified:** `src/__tests__/sidebar-terminology-row.test.tsx`
- **Verification:** 4/4 green after the fix.
- **Committed in:** `0bf631d` (bundled with Task 1 RED — the test was authored with the fix baked in).

**3. [Rule 1 — Bug] Color assertions matched jsdom rgb() output, not source hex**

- **Found during:** Task 1 GREEN — first run after Sidebar was updated
- **Issue:** Plan Task 1 sketch asserted `toHaveStyle({ backgroundColor: '#40c057' })` or `/#40c057/i` regex against `getAttribute('style')`. jsdom normalizes inline hex colors to `rgb(64, 192, 87)` when reading them back — the raw hex never appears in the DOM-side style string.
- **Fix:** Each color assertion now matches the jsdom-normalized form, e.g. `/rgb\(64,\s*192,\s*87\)/i` for `#40c057`, `/rgb\(250,\s*82,\s*82\)/i` for `#fa5252`, `/rgb\(173,\s*181,\s*189\)/i` for `#adb5bd`. The UI-SPEC hex literals remain intact in the Sidebar + Settings source (greppable for audit).
- **Files modified:** `src/__tests__/sidebar-terminology-row.test.tsx`
- **Verification:** 4/4 green after the fix.
- **Committed in:** `5f16825` (bundled with Task 1 GREEN).

---

**Total deviations:** 3 auto-fixed bugs in the plan's test sketches — all caused by the plan reaching for matchers/utilities not installed in this project. No behavior changes to the shipped Sidebar or Settings code.

## Issues Encountered

None beyond the three auto-fixes above.

## Deferred Issues

Pre-existing TypeScript errors unchanged since Plan 01 and still **out of scope**:

- `src/__tests__/display-modes.test.tsx(7,7)` — unused `mockPatient`
- `src/__tests__/json-highlight.test.ts(3,1)` — unused `JsonToken`
- `src/__tests__/resource-type-landing-counts.test.tsx(11,1)` — `Cannot find name 'global'`
- `src/components/explorer/ResourceDetailPage.tsx(56,21)` — FHIR resource-type string assignability
- `src/components/explorer/SearchResultsPage.tsx(59,10)` and `(62,10)` — SearchRequest/Record conversion
- `src/components/patients/FhirResourcesView.tsx(106,17)` — same FHIR resource-type string assignability

All 6 files touched by this plan (`useTerminologyHealth.ts`, `statusConfig.ts`, `Sidebar.tsx`, `SettingsPage.tsx`, `sidebar-terminology-row.test.tsx`, `settings-clear-cache.test.tsx`) type-check cleanly.

## User Setup Required

None.

## Next Phase Readiness

Phase 4 is now complete. All five plans delivered:

- Plan 01: Terminology config + client + health probe
- Plan 02: Terminology cache (LRU + localStorage)
- Plan 03: TerminologyResolver + context + hook
- Plan 04: useResolvedResource hook + view integration
- Plan 05: Sidebar health row + Settings Clear button (this plan)

Terminology-resolution requirements TERM-01 / TERM-02 / TERM-03 are fully satisfied. The app now:
- shows terminology server health in the sidebar (D-08)
- resolves Coding display values progressively via a bounded LRU + localStorage cache (TERM-01 / TERM-02)
- falls back silently to raw codes when resolution fails (TERM-03)
- exposes a Clear button that atomically wipes both tiers of the cache (D-06 / D-11)

Ready for Phase 5 (Data Quality dashboard).

## Self-Check: PASSED

All 4 created files present on disk:

- `src/hooks/useTerminologyHealth.ts` — FOUND
- `src/terminology/statusConfig.ts` — FOUND
- `src/__tests__/sidebar-terminology-row.test.tsx` — FOUND
- `src/__tests__/settings-clear-cache.test.tsx` — FOUND

Both modified files updated:

- `src/components/layout/Sidebar.tsx` — FOUND (modified, two-row status block)
- `src/components/settings/SettingsPage.tsx` — FOUND (modified, Terminology Server Paper added)

All 4 task commits present in `git log`:

- `0bf631d` (Task 1 RED) — FOUND
- `5f16825` (Task 1 GREEN) — FOUND
- `4f92812` (Task 2 RED) — FOUND
- `ce506be` (Task 2 GREEN) — FOUND

Verification commands green:

- `npm test -- src/__tests__/sidebar-terminology-row.test.tsx` — 4/4 tests passed
- `npm test -- src/__tests__/settings-clear-cache.test.tsx` — 2/2 tests passed
- `npm test` full suite — 170 passed / 22 todo / 3 skipped (24 test files)
- `npm run build` — only pre-existing deferred errors remain; new/modified files type-check cleanly

grep-verified acceptance criteria:

- `export function useTerminologyHealth` in `useTerminologyHealth.ts` — FOUND
- `probeTerminologyHealth` in `useTerminologyHealth.ts` — FOUND
- `TERMINOLOGY_STATUS_CONFIG` in `Sidebar.tsx` — FOUND (via import)
- `'Terminology: Reachable'` + `'Terminology: Unreachable'` + `'Terminology: Not configured'` + `'Terminology: Checking…'` — FOUND in `statusConfig.ts` (imported by Sidebar)
- `'FHIR server: Connected'` in `Sidebar.tsx` — FOUND
- `useTerminologyHealth` in `Sidebar.tsx` — FOUND
- Two `<Group gap="xs">` inside a `<Stack` in `Sidebar.tsx` — FOUND
- `sidebar-terminology-row.test.tsx` — 4 `it(` blocks, contains `'Terminology: Unreachable'`, contains `vi.mock` of `useTerminologyHealth` — FOUND
- `'Clear terminology cache'` in `SettingsPage.tsx` — FOUND
- `IconTrash` + `variant="light"` + `color="red"` + `notifications.show` + `resolver.cache.clear` — FOUND in `SettingsPage.tsx`
- `<Title order={3}>Terminology Server</Title>` — FOUND
- `'Not configured — set terminology.serverUrl in settings.yaml'` — FOUND in `SettingsPage.tsx`
- `settings-clear-cache.test.tsx` contains 2 `it(` blocks and `Clear terminology cache` — FOUND

---
*Phase: 04-terminology-resolution*
*Completed: 2026-04-12*
