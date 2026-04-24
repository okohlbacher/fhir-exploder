---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
plan: 06
subsystem: mii-kerndatensatz
tags: [mii, ui, dashboard, drawer, extension-partition, collapse, uat-fu-04, mii-ext-06, schema-foundation]

# Dependency graph
requires:
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    plan: 03
    provides: "Widened MiiModule schema with required `category: 'base' | 'extension'` field — enables type-safe .filter((m) => m.category === ...) partition in DashboardPage"
  - phase: 33-mii-schema-foundation-extension-modules-collapse-ui
    plan: 05
    provides: "MiiModuleTabs partition + useDisclosure(false) session-only pattern — DashboardPage re-uses the same idiom for the extension tile subgrid"
provides:
  - "DashboardPage MII tile grid partitions MII_MODULES into baseModules + extensionModules via m.category (D-12)"
  - "Session-only Collapse state via useDisclosure(false) — extensionGridOpened wraps the extension SimpleGrid subgrid"
  - "D-13 heading clarification — 'MII Kerndatensatz · Server-wide totals' ends UAT-FU-04 scope ambiguity"
  - "D-14 Drawer-based tile click target — clicks open a right-edge Drawer with module details + 'Open in Explorer' button (no new FHIR fetches)"
  - "Length-guarded extension toggle + Collapse — extensionModules.length === 0 in Phase 33 so no new surface; Phase 34 ships the 14 modules that activate this path"
affects:
  - "34 (14 MII extension modules) — dropping module rows with category: 'extension' into MII_MODULES flips on the 'Show extension modules' toggle + subgrid + Drawer click target; no further DashboardPage changes required"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MII_MODULES.filter((m) => m.category === 'base' | 'extension') — exhaustive partition over the D-02/D-03 required category field, identical idiom to plan 33-05's MiiModuleTabs"
    - "Session-only useDisclosure(false) wrapping a secondary SimpleGrid — length-guarded via extensionModules.length > 0 so the extension subgrid is structurally present but visually empty in Phase 33"
    - "Drawer-based click target with selectedModule: MiiModule | null — read-only surface over already-fetched counts[type] values, no new FHIR fetches"
    - "renderMiiTile helper closure — extracted so baseModules.map(renderMiiTile) and extensionModules.map(renderMiiTile) share identical tile rendering (Phase 33 symmetry preserved forward)"
    - "Per-type `counts` aggregation via types.reduce() loading-aware sum — identical across tile + Drawer so values are guaranteed to match"

key-files:
  created: []
  modified:
    - "src/components/dashboard/DashboardPage.tsx (partition + Drawer + renderMiiTile + heading rewrite; parent-level navigate('/patients') MII click dropped)"

key-decisions:
  - "D-13 heading copy: 'MII Kerndatensatz · Server-wide totals' — uses the middle-dot separator (·, U+00B7) as a tight label adjunct, mirroring Mantine/iOS system-label style. Short, Germanic-legible, explicit scope — the three alternatives floated by the plan (parens-form, em-dash-form) were considered interchangeable per D-13; picked the most compact."
  - "renderMiiTile as a component-local helper rather than a top-level function — tile rendering closure-captures `counts`, `handleTileClick`, and `MONO_NUMERIC` from the DashboardPage scope, so extracting to module-level would require a prop-drilled adapter that obscures intent."
  - "Drawer position='right', size='sm', padding='md' — matches the Mantine 8 default Drawer visual weight; size='sm' (320px) keeps the Drawer narrow enough not to dominate the main dashboard viewport."
  - "Drawer 'Open in Explorer' uses variant='light' (indigo soft fill) — matches the Dashboard's established 'not the primary action' treatment for tile/card CTAs. Closing the Drawer BEFORE navigate is explicit so the Drawer transition doesn't race the route change."
  - "Drawer count aggregation duplicates the tile's types.reduce() loop — acceptable duplication because (a) the tile version threads loading state for the '—' fallback and (b) the Drawer version is only ever shown when the tile is visible so the user has already seen the same number. Not a helper candidate."

requirements-completed: [MII-EXT-06]

# Metrics
duration: "~2 min"
completed: 2026-04-24
---

# Phase 33 Plan 06: Dashboard MII Partition + Drawer Click Target Summary

**`DashboardPage.tsx` MII section partitions `MII_MODULES` into `baseModules` + `extensionModules` via `m.category`, wraps the extension tile subgrid in a session-only `Collapse` (`useDisclosure(false)` — D-12), switches the tile click target from `navigate('/patients')` to a right-edge `Drawer` showing module details + an "Open in Explorer" button (D-14), and rewords the section heading to `MII Kerndatensatz · Server-wide totals` — closing UAT-FU-04's scoping-ambiguity complaint (D-13). Phase 33 data has 0 extension modules so the toggle + subgrid are length-guarded invisible; Phase 34's data drop flips them on without any further component change. No new FHIR fetches — the Drawer reads only the `counts[type]` values already fetched by `useResourceCounts`.**

## Performance

- **Duration:** ~2 min (1 commit)
- **Commit:** `68d9cfa`
- **Tasks:** 1 (refactor + UI change; no test file — DashboardPage has no unit-test suite, behavior is covered by manual dashboard smoke verification per plan)
- **Files modified:** 1 (`src/components/dashboard/DashboardPage.tsx`)
- **Files created:** 0

## Accomplishments

- Imported `Drawer`, `Button` from `@mantine/core`, `useState` from `react`, and the `MiiModule` type from `../../utils/mii-modules`.
- Added three new component-local pieces of state:
  - `[extensionGridOpened, { toggle: toggleExtensionGrid }] = useDisclosure(false)` — D-12 session-only extension toggle.
  - `[drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false)` — D-14 drawer visibility.
  - `[selectedModule, setSelectedModule] = useState<MiiModule | null>(null)` — tracks which module's details to render in the drawer body.
- Added partition + handler + renderer inside the component body (before the return):
  - `baseModules = MII_MODULES.filter((m) => m.category === 'base')` and `extensionModules = MII_MODULES.filter((m) => m.category === 'extension')`.
  - `handleTileClick(mod)` → `setSelectedModule(mod); openDrawer();`.
  - `renderMiiTile(module)` closure — extracted from the old inline `MII_MODULES.map(...)` block, closes over `counts`, `handleTileClick`, `MONO_NUMERIC`.
- Replaced the old MII `<SectionHeader>` title `"MII Kerndatensatz Modules"` with `"MII Kerndatensatz · Server-wide totals"` (D-13 scope clarification — closes UAT-FU-04).
- Replaced the old inline `SimpleGrid` + `MII_MODULES.map(...)` block with:
  - Base `SimpleGrid` rendering `baseModules.map(renderMiiTile)` — unchanged 4-col layout.
  - Length-guarded extension section `{extensionModules.length > 0 && (...)}` — `UnstyledButton` toggle + chevron + dimmed `"Show extension modules ({count})"` copy, then a nested `Collapse` wrapping a second `SimpleGrid` rendering `extensionModules.map(renderMiiTile)`.
- Added a `<Drawer>` at the end of the connected-UI branch:
  - `position="right"`, `size="sm"`, `padding="md"`.
  - Title = `selectedModule?.germanLabel ?? 'Module details'` (graceful null fallback).
  - Body renders only when `selectedModule !== null`: colored swatch + German label, uppercase-dimmed "FHIR resource type(s)" label + monospace comma-joined types, uppercase-dimmed "Server-wide count" label + mono numeric sum, light-variant `<Button fullWidth>` "Open in Explorer" that calls `navigate(\`/explorer/${primary}\`)` (primary = `fhirResourceTypesOf(selectedModule)[0]`) and closes the Drawer first.

## Heading Copy Chosen for D-13

**Final:** `MII Kerndatensatz · Server-wide totals`

- Uses the middle-dot separator (U+00B7) for compact label adjuncts — reads well against the Dashboard's `<Title order={4}>` weight.
- "Server-wide" is unambiguous — no user can mistake the counts for per-cohort or per-patient values (closes UAT-FU-04).
- Three alternatives considered (plan-provided): `"MII Kerndatensatz Modules (server-wide counts)"`, `"MII Kerndatensatz — totals across all patients"`, and the chosen compact form. All three satisfy D-13; picked the most compact.

## FHIR Fetch Site Diff (plan invariant verification)

**Before (plan 33-02 → 33-05 baseline):**
| Line | Fetch site | Triggered by |
| ---- | ---------- | ------------ |
| `useResourceCounts(client, resourceTypeNames)` (~line 113) | `useResourceCounts` hook batches GET `/fhir/<Type>?_summary=count` for every resource type in the CapabilityStatement | Once per `client` / resource-type-list change, cached cross-mount by Phase 24's server-keyed counts Map |

**After (plan 33-06):**
| Line | Fetch site | Triggered by |
| ---- | ---------- | ------------ |
| `useResourceCounts(client, resourceTypeNames)` (line 113, unchanged) | same as before | same as before |

**Delta:** 0 new fetch sites. The Drawer reads `counts[type]` from the same `useResourceCounts` map that the tiles read — the count shown in the Drawer is always identical to the count shown on the tile the user just clicked.

Grep confirms: `grep -cE "client\\.search|searchResources|useSearch|useResourceCounts|client\\.get|client\\.post|fetch\\(" src/components/dashboard/DashboardPage.tsx` → 2 (import + call site, identical before/after).

## Extension Toggle Readiness for Phase 34

All five wiring points are in place; dropping 14 rows with `category: 'extension'` into `MII_MODULES` will:
1. Flip `extensionModules.length > 0` → true — `UnstyledButton` trigger + chevron + `"Show extension modules (14)"` copy render below the base grid.
2. Click on the trigger toggles `extensionGridOpened` → opens the nested `Collapse`.
3. Inside the Collapse, `extensionModules.map(renderMiiTile)` renders 14 tiles in the same 4-col grid as the base 7.
4. Clicking an extension tile sets `selectedModule` + opens the Drawer (same `handleTileClick` handler — no `category`-aware branching needed).
5. Drawer "Open in Explorer" resolves `fhirResourceTypesOf(selectedModule)[0]` for the multi-type extension modules (e.g. Bildgebung → `['ImagingStudy', 'DiagnosticReport']` primary = `'ImagingStudy'`) and navigates to `/explorer/ImagingStudy`.

No code changes required in `DashboardPage.tsx` for Phase 34 activation.

## Structural Diff (summary)

### Before (plan 33-05 baseline MII section)

```tsx
<SectionHeader title="MII Kerndatensatz Modules" opened={miiOpened} onToggle={toggleMii} />
<Collapse in={miiOpened}>
  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
    {MII_MODULES.map((module) => {
      const types = fhirResourceTypesOf(module);
      const c = types.reduce(...);
      const n = typeof c === 'number' ? c : null;
      // ... inline <Card onClick={() => navigate('/patients')}>
    })}
  </SimpleGrid>
</Collapse>
```

### After (plan 33-06 partitioned + Drawer)

```tsx
<SectionHeader title="MII Kerndatensatz · Server-wide totals" opened={miiOpened} onToggle={toggleMii} />
<Collapse in={miiOpened}>
  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
    {baseModules.map(renderMiiTile)}
  </SimpleGrid>
  {extensionModules.length > 0 && (
    <>
      <UnstyledButton onClick={toggleExtensionGrid} aria-expanded={extensionGridOpened} mt="md">
        <Group gap="xs">
          {extensionGridOpened ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <Text size="sm" c="dimmed">Show extension modules ({extensionModules.length})</Text>
        </Group>
      </UnstyledButton>
      <Collapse in={extensionGridOpened}>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mt="xs">
          {extensionModules.map(renderMiiTile)}
        </SimpleGrid>
      </Collapse>
    </>
  )}
</Collapse>

<Drawer opened={drawerOpened} onClose={closeDrawer} position="right" size="sm" padding="md"
        title={selectedModule?.germanLabel ?? 'Module details'}>
  {selectedModule && (
    <Stack gap="sm">
      {/* colored swatch + label */}
      {/* FHIR type(s) */}
      {/* Server-wide count */}
      <Button fullWidth variant="light" onClick={() => {
        const primary = fhirResourceTypesOf(selectedModule)[0];
        closeDrawer();
        navigate(`/explorer/${primary}`);
      }}>Open in Explorer</Button>
    </Stack>
  )}
</Drawer>
```

## Acceptance Criteria Verification

All plan grep criteria pass against `src/components/dashboard/DashboardPage.tsx`:

| Criterion | Expected | Actual |
| --------- | -------- | ------ |
| `Drawer` occurrences | ≥ 2 | 11 (import + `<Drawer ...>` + 5 × `openDrawer`/`closeDrawer` + JSDoc refs) |
| `Server-wide totals\|server-wide\|Server-wide counts\|Server-wide count` occurrences | ≥ 2 | 3 (heading + Drawer "Server-wide count" label + comment) |
| `extensionGridOpened` | ≥ 2 | 4 (state + `aria-expanded` + `Collapse in={...}` + ternary chevron) |
| `m.category === 'base'` | 1 | 1 |
| `m.category === 'extension'` | 1 | 1 |
| `renderMiiTile\|handleTileClick` | ≥ 2 | 6 (2 × `renderMiiTile` definition + use × 2; `handleTileClick` definition + call + comment) |
| `navigate(\`/explorer/` | ≥ 2 | 2 (existing category-card click at line 277 + new Drawer "Open in Explorer" button) |
| `navigate('/patients')` | 0 | 0 (MII tile click no longer navigates to /patients) |
| `npx tsc -b --noEmit` exit | 0 | 0 |
| `npm test` ≥ 841 / 0 failing | met | 896 passed / 22 todo / 3 skipped / 0 failing |

## Decisions Made

- **D-13 copy: `MII Kerndatensatz · Server-wide totals`** — middle-dot (U+00B7) separator produces a tight, system-label-style heading. Germanic-legible, compact, unambiguous. Three alternatives considered; picked the most compact.
- **renderMiiTile as component-local helper (not module-level).** Closure-captures `counts`, `handleTileClick`, `MONO_NUMERIC`. Extracting to module-level would need a prop-drilled adapter that obscures intent; tile rendering is inherently coupled to the DashboardPage scope.
- **Drawer `position="right"`, `size="sm"`, `padding="md"`.** Matches Mantine 8 default Drawer weight; `size="sm"` (≈320 px) keeps the Drawer narrow enough not to dominate the main dashboard viewport. No user-reported preference elicited; chose conservative defaults.
- **Drawer "Open in Explorer" uses `variant="light"`.** Matches the Dashboard's established "not the primary action" treatment for tile/card CTAs. The `closeDrawer()` call happens BEFORE `navigate(...)` so the Drawer transition doesn't race the route change.
- **Drawer count aggregation duplicates the tile's `types.reduce()` loop.** Acceptable because (a) the tile version threads loading state for the '—' fallback while the Drawer version just shows 0 for loading (acceptable — the Drawer is only shown when the tile is already visible, so the user has already seen the real number), and (b) extracting a shared helper would require a 3-param function for minor DRY savings. Not a helper candidate.

## Deviations from Plan

None — plan executed exactly as written.

Zero CLAUDE.md constraints violated; zero deviation rules (1-4) triggered. The change is purely refactor + heading rewrite + Drawer addition; no new network, no schema change, no architectural surface.

## Issues Encountered

None — no blocked tasks, no auth gates, no architectural triggers.

## Authentication Gates

None.

## User Setup Required

None — pure in-repo UI change. Manual smoke test recommended on a live Blaze + Synthea patient to confirm:
- Heading reads `"MII Kerndatensatz · Server-wide totals"` (or equivalent D-13 phrasing).
- Base 7 tiles still render in 4-col grid.
- Clicking a tile opens the right-edge Drawer with the correct module name + FHIR type(s) + count.
- Clicking "Open in Explorer" navigates to `/explorer/<primary-type>` and closes the Drawer.
- Extension toggle is NOT visible in Phase 33 (length-guarded).
- No new network GETs fire when clicking tiles (Drawer reads already-fetched counts).

## Verification Evidence

- `npx tsc -b --noEmit` → exit 0.
- `npx vitest run` (full suite) → `Test Files 101 passed | 3 skipped (104)`, `Tests 896 passed | 22 todo (918)`, 0 failing.
- `grep -c "Drawer" src/components/dashboard/DashboardPage.tsx` → 11.
- `grep -cE "Server-wide totals|server-wide|Server-wide counts|Server-wide count" src/components/dashboard/DashboardPage.tsx` → 3.
- `grep -c "extensionGridOpened" src/components/dashboard/DashboardPage.tsx` → 4.
- `grep -c "m\\.category === 'base'" src/components/dashboard/DashboardPage.tsx` → 1.
- `grep -c "m\\.category === 'extension'" src/components/dashboard/DashboardPage.tsx` → 1.
- `grep -cE "renderMiiTile|handleTileClick" src/components/dashboard/DashboardPage.tsx` → 6.
- `grep -cE 'navigate\\(`/explorer/' src/components/dashboard/DashboardPage.tsx` → 2.
- `grep -c "navigate\\('/patients'\\)" src/components/dashboard/DashboardPage.tsx` → 0.
- Fetch-site grep: `grep -cE "client\\.search|searchResources|useSearch|useResourceCounts|client\\.get|client\\.post|fetch\\(" src/components/dashboard/DashboardPage.tsx` → 2 (import + call site, unchanged from before plan 33-06).

## Self-Check: PASSED

**Files:**
- `src/components/dashboard/DashboardPage.tsx` → FOUND (modified: partition + renderMiiTile + Drawer + D-13 heading rewrite).

**Commits:**
- `68d9cfa` `refactor(33-06): partition Dashboard MII tiles + Drawer click target + D-13 scope label` → FOUND in `git log`.

**Success criteria:**
- [x] MII-EXT-06 binding criterion met: base/extension partition landed; extension toggle + Collapse structurally present (length-guarded); heading clarifies scope (UAT-FU-04 closure).
- [x] D-12 session-only `useDisclosure(false)` for both extension toggle AND drawer — no localStorage.
- [x] D-13 heading ambiguity resolved (`"MII Kerndatensatz · Server-wide totals"`).
- [x] D-14 minimal read-only Drawer with "Open in Explorer" link; no new FHIR fetches.
- [x] D-21 green-gate: `npx tsc -b --noEmit` + `npx vitest run` both clean.

## Next Phase Readiness

- **Plan 33-07 (MII-EXT-08 ClinicalTimeline multi-type verification) unblocked.** Independent of this plan's scope.
- **Phase 34 (14 MII extension modules) structurally ready in Dashboard.** Dropping module rows with `category: 'extension'` into `MII_MODULES` flips the `extensionModules.length > 0` guard ON, activating the "Show extension modules" trigger + secondary `SimpleGrid` + Drawer click target for the new tiles. No further changes to `DashboardPage.tsx` required — the `renderMiiTile` helper is symmetric across base and extension.

---

*Phase: 33-mii-schema-foundation-extension-modules-collapse-ui*
*Plan: 06*
*Completed: 2026-04-24*
