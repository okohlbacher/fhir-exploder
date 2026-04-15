---
phase: 19-quality-trends-pdf-reports
plan: 02
subsystem: ui
tags: [quality, trends, mantine, charts, recharts, localstorage, hooks]

requires:
  - phase: 19-quality-trends-pdf-reports
    provides: trendsHistory pure-function layer (QualitySnapshot, TRENDS_STORAGE_KEY, filterSnapshotsByServer, computeBreachedFlag, serverUrlSlug)
  - phase: 18-quality-alerting-thresholds
    provides: thresholds store + MetricKey type + METRIC_LABELS
provides:
  - useTrendsHistory hook (hydration-gated localStorage backing)
  - TrendMiniChart component (320x200 default + 120x40 compact PDF mode)
  - TrendOverlayChart component (7-series categorical overlay at h=420)
  - TrendsPanel component (empty/single/grid/overlay + clear-history modal + soft warning)
  - BreachDot exported function (per-point breach coloring + per-server shape rotation)
  - /quality?tab=trends route panel (9th tab in QualityOverviewPage)
affects: [19-03 pdf-reports, future-quality-features]

tech-stack:
  added: []
  patterns:
    - "Hydration-gate pattern via Mantine useLocalStorage + useEffect-flipped hydrated flag (same as Phase 18 thresholds)"
    - "Direct window.localStorage.setItem probe BEFORE setStored to catch QuotaExceededError that Mantine's useLocalStorage swallows"
    - "Exported inner sub-component (BreachDot) for direct unit-testing, sidestepping recharts 0x0 ResponsiveContainer rendering in jsdom"
    - "Per-server shape-rotation via serverIndex % 4 for colorblind-safe disambiguation (circle/outlined square/filled triangle/outlined diamond)"
    - "Per-snapshot threshold overlay via recharts stepped second data series (NOT static referenceLines)"

key-files:
  created:
    - src/hooks/useTrendsHistory.ts
    - src/components/quality/TrendMiniChart.tsx
    - src/components/quality/TrendOverlayChart.tsx
    - src/components/quality/TrendsPanel.tsx
    - src/__tests__/use-trends-history.test.tsx
    - src/__tests__/trends-panel.test.tsx
  modified:
    - src/components/quality/QualityOverviewPage.tsx

key-decisions:
  - "BreachDot exported for direct unit-testing: recharts ResponsiveContainer reports 0x0 in jsdom so per-point dot SVGs do not render through the full chart pipeline. Unit-testing BreachDot directly is the authoritative way to verify UI-SPEC I-07 shape rotation."
  - "Direct localStorage probe in useTrendsHistory.append BEFORE setStored: Mantine useLocalStorage wraps setItem in its own try/catch with console.warn and never re-throws, so we must call window.localStorage.setItem ourselves first to catch QuotaExceededError and surface the red notification per T-19-09."
  - "hasOtherServers uses otherServerSnapshots.length > 0 (NOT distinctServers.size > 1): when all snapshots are from server B and current server is A, distinct size is 1, so the Include-other-servers switch would incorrectly be disabled. The correct semantic is any snapshot on a non-current server."
  - "Clear history button accessible name driven by aria-label per UI-SPEC Copywriting table: Mantine sets aria-label as the accessible name, overriding button text content."

patterns-established:
  - "Compact/PDF mode via single boolean prop: TrendMiniChart `compact?: boolean` strips chrome (no header strip, no tooltip, no legend, no yAxis ticks, no VisuallyHidden summary) while preserving identical two-series chart config + BreachDot. Used by Plan 03 PdfReportLayout."
  - "Hydration-gate pattern: useLocalStorage stored state + useEffect-flipped hydrated flag + coerce-non-array-to-empty for tampered payloads."

requirements-completed: [QUAL-05]

duration: 15min
completed: 2026-04-14
---

# Phase 19 Plan 02: Trends Tab Summary

**7-mini-chart small-multiples grid with per-snapshot threshold overlay, per-point breach coloring, overlay mode, include-other-servers filter with per-server shape disambiguation, and clear-history modal — wired into /quality?tab=trends with hydration-gated localStorage hook.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-14T21:54:13+02:00
- **Completed:** 2026-04-14T22:08:55+02:00
- **Tasks:** 2 (both TDD)
- **Files created:** 5 (hook + 3 components + 2 test files)
- **Files modified:** 1 (QualityOverviewPage.tsx)

## Accomplishments

- `useTrendsHistory` hook with hydration gate, corrupt-payload coercion (`Array.isArray` → `[]` + single `console.warn`), and QuotaExceededError notification (T-19-07, T-19-09)
- `TrendMiniChart` (320x200 default + 120x40 `compact` PDF mode) with two-series chart (solid monotone score + stepped dashed threshold per D-11) and `BreachDot` per-point coloring (red breach / blue ok / gray disabled / null → nothing, per D-12)
- Per-server shape rotation via `serverIndex % 4` (circle / outlined square / filled triangle / outlined diamond) — colorblind-safe disambiguation per UI-SPEC I-07
- `TrendOverlayChart` (7-series LineChart, h=420, blue/grape/teal/orange/cyan/pink/indigo shade-6 palette) with optional per-server shape dots
- `TrendsPanel` composition: hydration skeletons → empty / single / filtered-empty (with other-server tail line) / grid / overlay — plus Clear History button + modal + `History cleared` notification + >500 soft warning
- Wire-up into `QualityOverviewPage`: `trends` added to `VALID_TABS`, Tab + Panel pair rendered with `client.getBaseUrl()`
- 18 tests green (5 hook + 13 panel) including direct `BreachDot` unit test bypassing recharts/jsdom limitations

## Task Commits

1. **Task 1: useTrendsHistory hook (TDD)**
   - RED: `1100dc5` test(19-02): add failing tests for useTrendsHistory
   - GREEN: `b1a66da` feat(19-02): add useTrendsHistory hook with hydration gate + quota handling
2. **Task 2: TrendsPanel + TrendMiniChart + TrendOverlayChart + QualityOverviewPage wire-up (TDD)**
   - RED: `218fee4` test(19-02): add failing tests for TrendsPanel + TrendMiniChart
   - GREEN: `ac22ed1` feat(19-02): ship Trends tab with mini-charts, overlay, filter, clear

## Files Created/Modified

- `src/hooks/useTrendsHistory.ts` - React hook exposing `{ snapshots, hydrated, append, clearAll }` backed by Mantine `useLocalStorage` on `quality.trends.v1`; coerces non-array payloads to `[]` with single `console.warn`; catches `QuotaExceededError` via direct `window.localStorage.setItem` probe (Mantine's wrapper swallows it) and surfaces red notification.
- `src/components/quality/TrendMiniChart.tsx` - 320x200 default card (header strip + LineChart h=160 + VisuallyHidden summary) with two series (`score` monotone blue + `threshold` stepped dashed gray). Custom tooltip with 4-line Paper. Exports `BreachDot` for direct unit-testing of per-point breach coloring + per-server shape rotation. Also supports `compact` mode (120x40, no chrome) for Plan 03 PDF layout.
- `src/components/quality/TrendOverlayChart.tsx` - Single 7-series LineChart at h=420 with categorical shade-6 palette (blue/grape/teal/orange/cyan/pink/indigo). No breach coloring or threshold lines (D-09). Optional `ServerShapeDot` factory for per-color per-server shape rotation when `includeOtherServers && sortedServers.length > 1`.
- `src/components/quality/TrendsPanel.tsx` - Toolbar (Clear history button + Overlay/Include switches with state-driven aria-labels) + soft-warning Alert at `>500` + content area (hydration skeletons → filtered-empty with other-server count → empty → single → overlay → grid) + Clear History Modal with `Keep history`/`Clear history` buttons + `History cleared` notification on confirm.
- `src/__tests__/use-trends-history.test.tsx` - 5 hook tests including `Probe` component pattern for observing pre-hydration `hydrated: false` state (React 18's `renderHook` flushes effects before first read).
- `src/__tests__/trends-panel.test.tsx` - 13 panel tests including direct `BreachDot` unit test (test #13) asserting all 4 `data-server-shape` values (0/1/2/3) plus presence of `<rect>` at shape 1 and `<polygon>` at shape 2. Clear-history tests match exact aria-label strings per UI-SPEC Copywriting table.
- `src/components/quality/QualityOverviewPage.tsx` - Added `TrendsPanel` import, `'trends'` to `VALID_TABS`, `Tabs.Tab value="trends"` + `Tabs.Panel value="trends"` rendering `<TrendsPanel serverUrl={client.getBaseUrl()} />`.

## Decisions Made

- **BreachDot direct unit-test instead of chart-pipeline DOM test** — recharts `ResponsiveContainer` reports 0x0 in jsdom; per-point dot SVGs do not land in the DOM through the full chart pipeline. Exporting `BreachDot` and rendering it directly in an `<svg>` wrapper is the authoritative way to verify UI-SPEC I-07 shape rotation logic.
- **Direct `window.localStorage.setItem` probe in `useTrendsHistory.append`** — Mantine's `useLocalStorage` wraps `setItem` in its own `try/catch` with `console.warn` and never re-throws, so we must call the browser API directly to catch `QuotaExceededError` and surface the red notification per T-19-09.
- **`hasOtherServers = otherServerSnapshots.length > 0`** (NOT `distinctServers.size > 1`) — when all snapshots are from server B and current is A, distinct-set size is 1, which would incorrectly disable the `Include other servers` switch. Correct semantic: any snapshot on a non-current server.
- **Clear history button accessible name via aria-label** — Mantine sets `aria-label` as the accessible name, overriding button text content. Tests match exact strings from UI-SPEC Copywriting: `'Clear all snapshots from browser storage.'` and `'Clear all snapshots (no snapshots to clear).'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exported `BreachDot` for direct unit-testing**
- **Found during:** Task 2 RED phase
- **Issue:** Plan's test #13 (shape disambiguation) expected rendered `data-server-shape` attributes on per-point dots inside the grid mini-charts. recharts `ResponsiveContainer` reports 0x0 in jsdom so per-point dot SVGs never land in the DOM. Mocking `recharts` did not help — the inner `LineChart` still got 0x0.
- **Fix:** Exported `BreachDot` from `TrendMiniChart.tsx` (with TypeScript-exported `BreachDotProps`) and rewrote test #13 to render it directly in an `<svg>` wrapper, asserting all 4 `data-server-shape` values and presence of `<rect>` at index 1 and `<polygon>` at index 2. Documented the rationale in a comment at the top of the test file.
- **Files modified:** `src/components/quality/TrendMiniChart.tsx`, `src/__tests__/trends-panel.test.tsx`
- **Verification:** Test #13 green; build clean; UI-SPEC I-07 shape-rotation logic verified.
- **Committed in:** `ac22ed1` (Task 2 GREEN)

**2. [Rule 3 - Blocking] Direct `window.localStorage.setItem` probe to catch `QuotaExceededError`**
- **Found during:** Task 1 GREEN phase
- **Issue:** Plan specified `useTrendsHistory.append` must surface a red notification on `QuotaExceededError` (T-19-09). But Mantine's `useLocalStorage` wraps `setItem` in its own try/catch with `console.warn` and never re-throws, so the error never reached our catch block.
- **Fix:** Added `window.localStorage.setItem(TRENDS_STORAGE_KEY, JSON.stringify(next))` as a probe BEFORE delegating to `setStored(next)` for React state sync. Catches `DOMException.name === 'QuotaExceededError'` and fires the red notification, then returns without mutating state.
- **Files modified:** `src/hooks/useTrendsHistory.ts`
- **Verification:** Hook test `QuotaExceededError surfaces notification` green; `notifications.show` mock captures the red color + title.
- **Committed in:** `b1a66da` (Task 1 GREEN)

**3. [Rule 1 - Bug] Fixed `hasOtherServers` semantic**
- **Found during:** Task 2 GREEN (panel test for filtered-empty state)
- **Issue:** Initial implementation used `distinctServers.size > 1`. When all snapshots are from server B and the current server is A, `distinctServers.size` is 1, incorrectly disabling the `Include other servers` switch and failing the filtered-empty-state test.
- **Fix:** Changed to `otherServerSnapshots.length > 0` where `otherServerSnapshots = snapshots.filter(s => s.serverUrl !== serverUrl)`. Now correctly enables the switch whenever ANY snapshot on a non-current server exists.
- **Files modified:** `src/components/quality/TrendsPanel.tsx`
- **Verification:** Filtered-empty test green + Include-other-servers disabled-with-one-server test still green.
- **Committed in:** `ac22ed1` (Task 2 GREEN)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All three necessary for plan correctness. Deviation #1 reshapes test strategy but preserves acceptance-criteria semantic (shape rotation verified). Deviations #2 + #3 fix subtle integration issues that only surface at runtime. No scope creep.

## Issues Encountered

- **React 18 renderHook flushes effects before first read:** Initial hydration test attempted to assert `hydrated: false` after first render — impossible because React 18's `act()`-wrapped `renderHook` flushes effects before returning the first `result.current`. Fixed with a `Probe` component using a closure-captured `observedFirst` variable to capture the pre-effect value.
- **21 pre-existing full-suite test failures baselined:** Stashed and re-ran at HEAD `218fee4` — confirmed failures in patient-list, patient-detail, terminology-health, patient-view-toggle, quality-overview, resource-type-landing-counts, sidebar-terminology-row are all pre-existing (NOT caused by Plan 19-02). Out of scope per deviation SCOPE BOUNDARY rule.
- **Pre-existing TS2352 errors in `profileConformanceChecker.ts` and `temporalPlausibilityWalker.ts`:** Already documented in Plan 01's deferred-items.md. `npm run build` exits non-zero, but all errors are pre-existing — Plan 19-02 introduced zero new TypeScript errors (the two TS6133 `unused import` errors I introduced were fixed before committing Task 2).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 (PDF report layout) has full dependency: `TrendMiniChart compact mode` exposed via `compact?: boolean` prop, captures identical chart config with all chrome stripped — Plan 03 can render 7 compact mini-charts in the PDF layout.
- `useTrendsHistory.append` ready to be called by Plan 03's `Capture snapshot` button on the main `/quality` toolbar. `onCapture` prop already threaded through `TrendsPanel` / `EmptyState` for Plan 03 wiring.
- No blockers or concerns.

## Self-Check: PASSED

All files verified present:
- `src/hooks/useTrendsHistory.ts` — FOUND
- `src/components/quality/TrendMiniChart.tsx` — FOUND
- `src/components/quality/TrendOverlayChart.tsx` — FOUND
- `src/components/quality/TrendsPanel.tsx` — FOUND
- `src/__tests__/use-trends-history.test.tsx` — FOUND
- `src/__tests__/trends-panel.test.tsx` — FOUND

All commits verified present:
- `1100dc5` (RED hook test) — FOUND
- `b1a66da` (GREEN hook) — FOUND
- `218fee4` (RED panel test) — FOUND
- `ac22ed1` (GREEN panel + components + wire-up) — FOUND

---
*Phase: 19-quality-trends-pdf-reports*
*Completed: 2026-04-14*
