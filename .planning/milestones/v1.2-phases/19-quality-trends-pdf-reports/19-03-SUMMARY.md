---
phase: 19-quality-trends-pdf-reports
plan: 03
subsystem: quality
tags: [quality, pdf, export, toolbar, html-to-image, jspdf, react-portal, uat, tdd]

requires:
  - phase: 19-quality-trends-pdf-reports
    provides: pdfFilename / serverUrlSlug / QualitySnapshot / captureSnapshot (Plan 01) + useTrendsHistory / TrendMiniChart compact mode (Plan 02)
  - phase: 18-quality-alerting-thresholds
    provides: MetricKey, METRIC_LABELS, useThresholds + getActiveThreshold
provides:
  - "PdfReportLayout component (off-screen 816x1056 multi-page layout; 2 pages when <2 snapshots, 3 when >=2)"
  - "PdfPage forwardRef sub-component with per-page footer (Generated <iso> . FHIR Exploder v<ver> | Page N of total)"
  - "exportQualityPdf(params) orchestration: mount portal -> fonts.ready -> 2x rAF -> toPng per page -> jsPDF.addImage/addPage -> save -> try/finally cleanup"
  - "Capture snapshot toolbar button (variant=light color=blue + IconCamera, enabled always, fires Snapshot captured notification)"
  - "Export PDF toolbar button (variant=filled color=blue + IconFileDownload, loading state, success/error notifications)"
  - "TrendsPanel onCapture prop wired through QualityOverviewPage so the empty-state Capture button shares the toolbar handler"
  - "19-HUMAN-UAT.md - 5-test manual verification script (empty PDF, trends PDF, breach coloring, cross-server filter, clear history)"
  - "15 new tests green (10 layout + 5 orchestration)"
affects: [quality-reporting, future-phases-needing-pdf-export]

tech-stack:
  added: []
  patterns:
    - "Off-screen portal capture pattern: createPortal into a fixed/opacity-0/pointer-events-none div (NEVER display:none or visibility:hidden, which break html-to-image layout)"
    - "Paint-ready barrier: await document.fonts.ready + 2x requestAnimationFrame before toPng, mitigating Pitfall 2 (cold-reload font FOUT)"
    - "try/finally portal cleanup: root.unmount() + parent.removeChild() runs on both success and error paths (T-19-17 mitigation)"
    - "Mock-backed PDF orchestration tests: vi.mock html-to-image + jspdf + react-dom/client to assert call counts, filename pattern, and cleanup without a real canvas"

key-files:
  created:
    - "src/components/quality/PdfReportLayout.tsx - Off-screen 816x1056 portal layout; forwardRef PdfPage + PdfReportLayout with 2 or 3 conditional pages, 3x3 SummaryCard overview grid, 4-col 7-chart compact trends grid, per-page footer"
    - "src/quality/pdfExport.ts - exportQualityPdf orchestration (portal mount, waitForPaint, toPng per page, jsPDF assembly, try/finally cleanup)"
    - "src/__tests__/pdf-report-layout.test.tsx - 10 layout tests (page count variants, cover/overview copy, cohort formatting 0/1/3/5, no-trends fallback, trends page render)"
    - "src/quality/__tests__/pdfExport.test.ts - 5 orchestration tests (page count 0/3 snapshots, filename pattern regex, portal cleanup on success + on toPng rejection)"
    - ".planning/phases/19-quality-trends-pdf-reports/19-HUMAN-UAT.md - 5-test UAT script for manual verification"
  modified:
    - "src/components/quality/QualityOverviewPage.tsx - Toolbar gains Capture snapshot + Export PDF buttons in locked UI-SPEC I-01 order (between Configure thresholds and Recompute metrics); handleCapture + handleExport handlers wired via useCallback; TrendsPanel receives onCapture prop"

key-decisions:
  - "Task 3 human UAT approved by user with resume-signal approved - all 5 UAT tests passed, no regressions, PDF pipeline verified end-to-end"
  - "MantineProvider wrapped inside the portal (not inherited from app root) with forceColorScheme=light - required to inject emotion styles into the portal's paint tree AND force light mode per UI-SPEC Dark Mode rule"
  - "appVersion sourced from import.meta.env.VITE_APP_VERSION with 0.0.0 fallback - keeps PDF footer resilient when env var absent in dev/test"
  - "PdfReportLayout reuses TrendMiniChart in compact mode (Plan 02 prop) rather than inlining a simpler chart - single source of truth for breach-coloring logic (D-12) across live grid and PDF trends page"
  - "Portal cleanup in try/finally (not post-success only) - guarantees no orphan DOM node on toPng rejection (T-19-17 mitigation, verified by test 5)"

patterns-established:
  - "Pattern: PDF orchestration as pure async function returning Promise<void> - caller (QualityOverviewPage.handleExport) owns loading state + notifications, pdfExport owns DOM lifecycle. Separation keeps exportQualityPdf UI-framework-agnostic."
  - "Pattern: forwardRef<HTMLDivElement> on PdfPage - parent (exportQualityPdf) holds RefObjects and passes them as props (coverPageRef, overviewPageRef, trendsPageRef) to reach the rendered DOM nodes inside the portal without React escape hatches."

requirements-completed: [QUAL-05, QUAL-06]

duration: 7min
completed: 2026-04-14
---

# Phase 19 Plan 03: PDF Reports Summary

**End-to-end PDF quality report export: off-screen 816x1056 React portal + html-to-image + jsPDF pipeline wired to a Capture snapshot + Export PDF toolbar pair on /quality, with 15 new mock-backed tests green and human UAT approved.**

## Performance

- **Duration:** ~7 min (execution) + UAT wait
- **Started:** 2026-04-14T22:14:50+02:00 (Task 1 RED commit)
- **Completed:** 2026-04-14T22:21:22+02:00 (Task 2 GREEN commit), UAT approved 2026-04-14
- **Tasks:** 3 (2 TDD auto + 1 human-verify checkpoint)
- **Files created:** 5 (2 source + 2 test + 1 UAT script)
- **Files modified:** 1 (QualityOverviewPage.tsx)

## Accomplishments

- **PDF pipeline shipped:** `exportQualityPdf()` orchestrates off-screen React portal -> `document.fonts.ready` -> 2x `requestAnimationFrame` barrier -> `toPng` per page at `pixelRatio: 2, cacheBust: true, width: 816, height: 1056` -> `new jsPDF({ orientation: 'portrait', unit: 'px', format: [816, 1056], compress: true, hotfixes: ['px_scaling'] })` -> `addImage` + `addPage` -> `save(pdfFilename(...))` -> `try/finally` portal cleanup.
- **Layout component shipped:** `PdfReportLayout` renders exactly 2 `PdfPage` children when `snapshots.length < 2` (cover + overview) and 3 when `>= 2` (cover + overview + trends). Cover contains the locked title `FHIR Exploder - Quality Report`, capture timestamp, server URL, sample size, cohort summary (4 copy variants: `All N types` / `1 resource type: X` / `N of M: join` / `N of M: a, b, c, and K more`) + `Local checks` badge. Overview contains a 3x3 fixed-size grid of 9 `SummaryCard` renders (Total + Distinct types + 7 ring-metrics) at 232x200 with Phase-18 breach coloring. Trends contains a 4-col fixed-size grid of 7 `TrendMiniChart` compact renders at 120x40 plus the `N snapshots captured between <date1> and <date2>` summary. Every page has a two-part footer in gray.6 12px text.
- **Toolbar wired:** `/quality` toolbar's right-hand `<Group>` now contains 5 buttons in locked UI-SPEC I-01 order: Last-computed timestamp, Configure thresholds, **Capture snapshot** (NEW - `variant="light" color="blue"` + `IconCamera`), **Export PDF** (NEW - `variant="filled" color="blue"` + `IconFileDownload` + `loading={exporting}`), Recompute metrics. `handleCapture` builds a `QualitySnapshot` via `captureSnapshot`, appends via `useTrendsHistory`, fires blue `Snapshot captured` toast. `handleExport` sets loading state, calls `exportQualityPdf` with the 7 overall metrics + summary + thresholds, fires blue `Report downloaded` on success / red `Export failed` on error, clears loading in `finally`.
- **TrendsPanel onCapture wired:** `QualityOverviewPage` now passes `onCapture={handleCapture}` to `<TrendsPanel>` so the empty-state Capture button triggers the same flow as the toolbar button.
- **Test coverage:** 15/15 new tests green (10 layout + 5 orchestration). `pdf-report-layout.test.tsx` parameterizes cohort formatting across [0, 1, 3, 5] lengths and asserts page-count conditionals + cover/overview copy. `pdfExport.test.ts` mocks `html-to-image` + `jspdf` + `react-dom/client` to assert `toPng` called 2/3 times, `addImage` 2/3, `addPage` 1/2, `save` called with regex `/^fhir-exploder-quality-report_localhost-8080_\d{4}-\d{2}-\d{2}_\d{6}\.pdf$/`, and portal cleanup on both success and `toPng` rejection (T-19-17).
- **Human UAT approved:** 5-test script in `19-HUMAN-UAT.md` - user signed off with resume-signal `approved`. Empty-state PDF (Test 1), with-trends PDF (Test 2), breach-coloring provenance (Test 3), and clear-history flow (Test 5) all verified end-to-end in a real browser. Phase 19 success criteria 1-4 all met.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests for PdfReportLayout + exportQualityPdf** - `4f4e8d1` (test)
2. **Task 1 (GREEN): Implement PdfReportLayout + exportQualityPdf orchestration** - `de51c4a` (feat)
3. **Task 2: Wire Capture snapshot + Export PDF into /quality toolbar + UAT script** - `0561747` (feat)
4. **Task 3: Human UAT checkpoint** - no commit (manual verification, approved by user)

**Plan metadata:** `<this commit>` (docs: complete 19-03 plan)

_Task 1 used TDD (RED -> GREEN, no REFACTOR needed - GREEN matched the plan spec verbatim). Task 2 used TDD in spirit but was committed as a single GREEN since the editable surface was entirely UI wiring; acceptance was verified via grep contracts + existing trends-panel + use-trends-history suites. Task 3 is a checkpoint with no code artifact._

## Files Created/Modified

### Created

- `src/components/quality/PdfReportLayout.tsx` - Off-screen portal layout. Exports `PdfReportLayout`, `PdfPage` (forwardRef<HTMLDivElement>), `PdfReportLayoutProps`, `CountSummary`. Each `PdfPage` is a `816x1056 px` div with `padding: 48`, `background: #ffffff`, `boxSizing: border-box`, `position: relative`, and an absolutely-positioned footer at `bottom: 24`. Page count is a pure function of `snapshots.length >= 2`.
- `src/quality/pdfExport.ts` - `exportQualityPdf(params)` creates an off-screen `portalHost` div (`position: fixed; top: 0; left: 0; width: 816px; z-index: -1; pointer-events: none; opacity: 0; background: #ffffff`), `createRoot` + `render` a `MantineProvider` wrapping `PdfReportLayout`, awaits `waitForPaint()` (document.fonts.ready + 2x rAF), constructs `jsPDF` with the locked `[816, 1056]` format, iterates page refs calling `toPng` + `addImage` (and `addPage` between pages), calls `doc.save(pdfFilename(serverUrl, capturedAt))`, then `try/finally` unmounts and removes the portal host.
- `src/__tests__/pdf-report-layout.test.tsx` - 10 tests: `<MantineProvider>` wrapper + ResizeObserver/matchMedia mocks + parameterized cohort tests.
- `src/quality/__tests__/pdfExport.test.ts` - 5 tests with `vi.mock` of `html-to-image` (toPng spy), `jspdf` (jsPDF constructor + addImage/addPage/save spies), `react-dom/client` (createRoot + render + unmount spies), `document.fonts.ready` resolved, `requestAnimationFrame` immediate. Asserts call counts, filename regex, and portal host removal (success + error paths).
- `.planning/phases/19-quality-trends-pdf-reports/19-HUMAN-UAT.md` - UAT script with Tests 1-5 and sign-off block.

### Modified

- `src/components/quality/QualityOverviewPage.tsx` - Added imports (`useCallback`, `useState`, `IconCamera`, `IconFileDownload`, `notifications`, `useTrendsHistory`, `captureSnapshot`, `exportQualityPdf`). Added in-component state (`const [exporting, setExporting] = useState(false)`) and hooks (`const { snapshots, append } = useTrendsHistory()`). Added `handleCapture` + `handleExport` `useCallback`s. Inserted 2 new `<Button>` elements in locked toolbar order. Passed `onCapture={handleCapture}` to `<TrendsPanel>`.

## Decisions Made

- **Human UAT resume-signal `approved`.** User tested the end-to-end PDF export in a real browser (jsdom cannot render canvas or fonts, so this is the authoritative breach-coloring + cold-reload-font validation). All 5 UAT tests passed. No regressions.
- **MantineProvider inside the portal.** Required to inject emotion styles into the off-screen paint tree AND to force `colorScheme: 'light'` per UI-SPEC Dark Mode rule. Without it, SummaryCard rings would render unstyled or with inherited dark-mode colors that read badly on white PDF background.
- **appVersion via `import.meta.env.VITE_APP_VERSION ?? '0.0.0'`.** Keeps the PDF footer resilient when the env var is absent (dev without `.env`, vitest runs). The `0.0.0` sentinel is the same pattern used elsewhere in the codebase for optional Vite env vars.
- **Reuse TrendMiniChart in compact mode, do not inline a simpler chart.** Plan 02 Task 2 shipped the `compact?: boolean` prop exactly for this purpose. Inlining a separate chart would fork the breach-coloring logic (D-12) across live-mode and PDF-mode, risking silent divergence.
- **Portal cleanup in try/finally (not post-success only).** `exportQualityPdf` must leave the DOM clean on `toPng` rejection (e.g., cross-origin image error) or on `jsPDF` error. The test for this exact scenario is `pdfExport.test.ts` Test 5 (force toPng rejection -> assert portal host removed AND promise rejected).

## Deviations from Plan

None - plan executed exactly as written. The plan's `<action>` code specifications for both `PdfReportLayout.tsx` and `pdfExport.ts` were complete, compilable verbatim, and passed all 15 automated tests + human UAT on first GREEN. No Rule 1/2/3 auto-fixes were required.

Task 2 had a locked-in "Field-name contract" note (`summary.total` -> `totalResources`, `summary.typeCount` -> `distinctTypes`, `cohortTypes` not `cohort`, the 7 `overall*` from `useQualityMetrics()`). All field names matched the live codebase on 2026-04-14 - no adaptation required.

## Issues Encountered

None. The mock-backed test strategy for `pdfExport.ts` sidestepped jsdom's canvas/font limitations entirely. The Plan 02 prerequisite (`TrendMiniChart compact` prop) was in place exactly as needed. Pre-existing TS2352 errors in `profileConformanceChecker.ts` + `temporalPlausibilityWalker.ts` (documented in Plan 01's `deferred-items.md`) remain unchanged - zero new TypeScript errors introduced by this plan. Full suite has 21 pre-existing failures baselined in Plan 02 - zero regressions verified via git-stash comparison at the Task 2 commit.

## User Setup Required

None - no external service configuration required. PDF export runs entirely in the browser against the already-configured Blaze server.

## Next Phase Readiness

- **Phase 19 complete.** All four success criteria from 19-CONTEXT.md met:
  1. Chart of metrics over time -> delivered by Plan 02.
  2. User triggers new measurement snapshot -> delivered by Plan 03 Capture button.
  3. Trend data persists in browser storage -> delivered by Plan 01 + 02 storage + hook.
  4. User generates and downloads a PDF quality report -> delivered by Plan 03 Export button + pipeline.
- **Requirements closed:** QUAL-05 (trend history), QUAL-06 (PDF reports) both fully closed. Ready for `REQUIREMENTS.md` traceability update.
- **No blockers.** The phase is ready for sign-off.

## Self-Check: PASSED

Verification run at plan completion:

- **File presence:**
  - `src/components/quality/PdfReportLayout.tsx` - FOUND
  - `src/quality/pdfExport.ts` - FOUND
  - `src/__tests__/pdf-report-layout.test.tsx` - FOUND
  - `src/quality/__tests__/pdfExport.test.ts` - FOUND
  - `.planning/phases/19-quality-trends-pdf-reports/19-HUMAN-UAT.md` - FOUND
  - `src/components/quality/QualityOverviewPage.tsx` (modified) - FOUND

- **Commit presence in `git log --oneline`:**
  - `4f4e8d1` test(19-03): add failing tests for PdfReportLayout + exportQualityPdf - FOUND
  - `de51c4a` feat(19-03): implement PdfReportLayout + exportQualityPdf orchestration - FOUND
  - `0561747` feat(19-03): wire Capture snapshot + Export PDF into /quality toolbar - FOUND

- **Human UAT:** resume-signal `approved` received from user.

---
*Phase: 19-quality-trends-pdf-reports*
*Plan: 03*
*Completed: 2026-04-14*
