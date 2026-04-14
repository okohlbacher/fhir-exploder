---
phase: 16-conformance-plausibility-checks
plan: 04
subsystem: quality-dashboard
tags: [conformance, plausibility, lab-ranges, cohort, dashboard, ui]
dependency_graph:
  requires:
    - 16-01 (profileConformanceChecker, ValueSetCache)
    - 16-02 (temporalPlausibilityWalker)
    - 16-03 (labRangeChecker, extended AppSettings)
  provides:
    - useConformanceRun hook (conformance validation with ValueSetCache)
    - usePlausibilityReport hook (temporal checks with cancellation)
    - useLabRangesReport hook (lab range checks with summary)
    - PlausibilityPanel (Plausibility tab content)
    - LabRangesPanel (Lab Ranges tab content)
    - PlausibilityDrillDown (/quality/plausibility/:type)
    - LabRangesDrillDown (/quality/lab-ranges)
    - CohortSelector (dashboard-level resource type filter)
    - createConformanceBackend (ValidationBackend wrapper)
  affects:
    - src/components/quality/QualityOverviewPage.tsx (6-tab layout)
    - src/components/quality/ValidationPanel.tsx (conformance badges, terminology banner)
    - src/quality/validationBackends.ts (createConformanceBackend export)
    - src/App.tsx (new routes)
tech_stack:
  added: []
  patterns:
    - useState-based runner with cancellation (usePlausibilityReport, useLabRangesReport)
    - Batch iteration with progress (T-16-09, T-16-10 mitigation)
    - Dismissible banner with scoped localStorage keys
key_files:
  created:
    - src/hooks/useConformanceRun.ts
    - src/hooks/usePlausibilityReport.ts
    - src/hooks/useLabRangesReport.ts
    - src/components/quality/PlausibilityPanel.tsx
    - src/components/quality/LabRangesPanel.tsx
    - src/components/quality/PlausibilityDrillDown.tsx
    - src/components/quality/LabRangesDrillDown.tsx
    - src/components/quality/CohortSelector.tsx
  modified:
    - src/components/quality/ValidationPanel.tsx
    - src/components/quality/QualityOverviewPage.tsx
    - src/quality/validationBackends.ts
    - src/App.tsx
    - src/__tests__/validation-panel.test.tsx
    - src/__tests__/quality-overview.test.tsx
key_decisions:
  - "Conformance badge replaces Structural badge; Terminology badge added (green/gray)"
  - "Terminology unavailable banner scoped per serverUrl with localStorage dismissal"
  - "CohortSelector persists to localStorage quality.cohort.v1, scopes Completeness/Coverage/Plausibility"
  - "Per-LOINC breakdown table sorted by % OOR descending for quick identification of worst codes"
metrics:
  duration: "9m 29s"
  completed: "2026-04-14T06:47:31Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 6
requirements_completed: [DQ-03, DQ-04, DQ-05, DQ-06]
---

# Phase 16 Plan 04: Quality Dashboard UI Wiring Summary

6-tab quality dashboard with conformance validation, temporal plausibility checks, lab range analysis, and cohort-scoped resource type filtering across all panels.

## What Was Built

### Task 1: Enhanced Validation Panel + Conformance Hook

- **useConformanceRun hook** (`src/hooks/useConformanceRun.ts`): useState-based runner that creates a ValueSetCache, expands all binding value sets from the profile, then batch-iterates resources through `validateConformance()`. Also runs legacy backends (structural + remote) for backwards compatibility. Exposes `terminologyAvailable` boolean for UI banner control.
- **createConformanceBackend** (`src/quality/validationBackends.ts`): Wraps profileConformanceChecker into the ValidationBackend interface for backend composition.
- **ValidationPanel updates**: Replaced "Structural" badge with "Conformance" (blue). Added "Terminology" badge (green when available, gray with "(unavailable)" when not). Added dismissible orange "Terminology server unavailable" banner with localStorage key `quality.validation.termBannerDismissed.v1:{serverUrl}`. Merged conformance + legacy issues for ResourceIssueTable display.

### Task 2: New Panels, Drill-downs, Cohort Selector, Routes

- **usePlausibilityReport** (`src/hooks/usePlausibilityReport.ts`): Batch temporal checks with cancellation. T-16-09 mitigation via batch iteration + cancel button.
- **useLabRangesReport** (`src/hooks/useLabRangesReport.ts`): Lab range checks with summary stats. T-16-10 mitigation via sampleSize bounds + cancellation.
- **PlausibilityPanel**: Resource type Select (searchable), check-type filter (all/future dates/period consistency/age/clinical duration), "Run checks" button, progress bar, check-type breakdown badges (color-coded), ResourceIssueTable, empty/error states.
- **LabRangesPanel**: "Run lab range checks" button, progress bar, summary badges (in range green / out of range yellow / no range gray), per-LOINC table (striped, sorted by %OOR desc), ResourceIssueTable, empty states for no observations / no reference ranges.
- **PlausibilityDrillDown** (`/quality/plausibility/:type`): Auto-starts on mount, "Back to Plausibility" button, renders ResourceIssueTable.
- **LabRangesDrillDown** (`/quality/lab-ranges`): Auto-starts on mount, "Back to Lab Ranges" button, renders ResourceIssueTable.
- **CohortSelector**: MultiSelect with `quality.cohort.v1` localStorage persistence. Shows "Scoped to: X, Y" or "All resource types" summary text. Scopes effectiveTypes for Completeness, Coverage, and Plausibility panels.
- **QualityOverviewPage**: 6 tabs (Counts, Completeness, Coding Coverage, Validation, Plausibility, Lab Ranges). CohortSelector in toolbar before SampleSizeControl.
- **App.tsx**: Added routes `plausibility/:type` and `lab-ranges` under `/quality`.
- **Test updates**: Updated validation-panel test (Conformance badge). Added panel mocks for PlausibilityPanel and LabRangesPanel in quality-overview test.

### Task 3: Human Verification -- APPROVED

All 7 verification items passed by the user:
1. 6 tabs visible at /quality
2. Validation tab: Conformance badge, terminology banner behavior
3. Plausibility tab: resource type selection, run checks, progress, results
4. Lab Ranges tab: run checks, summary badges, per-LOINC table
5. CohortSelector scoping across tabs
6. Drill-down navigation working
7. Cancel buttons functioning during running checks

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 46dc58a | Enhanced validation panel with conformance checker and terminology banner |
| 2 | be078e3 | 6-tab dashboard with plausibility, lab ranges, cohort selector, and drill-downs |
| 3 | (checkpoint) | Human verification approved -- all 7 items passed |

## Test Results

- validation-panel.test.tsx: 11 passed (updated Conformance badge assertion)
- quality-overview.test.tsx: 10 passed, 1 failed (pre-existing unrelated failure)
- Full suite: 33 passed files, 8 failed files (pre-existing), 3 skipped -- no regressions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed quality-overview test failures from new panels**
- **Found during:** Task 2
- **Issue:** PlausibilityPanel and LabRangesPanel (rendered via keepMounted) called useSettings() which requires SettingsProvider, but the test only wraps with QualityMetricsProvider.
- **Fix:** Added vi.mock() stubs for PlausibilityPanel and LabRangesPanel in quality-overview.test.tsx
- **Files modified:** src/__tests__/quality-overview.test.tsx
- **Commit:** be078e3

## Known Stubs

None. All hooks are fully wired to the Plan 01-03 checker engines. No placeholder data or TODO markers.

## Threat Surface Scan

No new network endpoints or auth paths added. The hooks use the existing MedplumClient and terminology client patterns already in the codebase. CohortSelector is purely client-side (localStorage). No new trust boundaries.

## Verification Checklist

- [x] `src/hooks/useConformanceRun.ts` exports hook with `terminologyAvailable` in return type
- [x] `src/components/quality/ValidationPanel.tsx` contains "Terminology server unavailable"
- [x] `src/components/quality/ValidationPanel.tsx` contains Badge with text "Conformance"
- [x] `src/components/quality/ValidationPanel.tsx` contains `termBannerDismissed` localStorage key
- [x] `src/quality/validationBackends.ts` exports `createConformanceBackend`
- [x] `src/components/quality/QualityOverviewPage.tsx` contains 6 Tabs.Tab entries
- [x] `src/components/quality/QualityOverviewPage.tsx` imports and renders CohortSelector
- [x] `src/components/quality/PlausibilityPanel.tsx` contains "Run checks" and "Stop plausibility check"
- [x] `src/components/quality/LabRangesPanel.tsx` contains "Run lab range checks" and "Stop lab range check"
- [x] `src/components/quality/PlausibilityDrillDown.tsx` contains "Back to Plausibility"
- [x] `src/components/quality/LabRangesDrillDown.tsx` contains "Back to Lab Ranges"
- [x] `src/components/quality/CohortSelector.tsx` contains `quality.cohort.v1`
- [x] `src/App.tsx` contains route path `plausibility/:type` and `lab-ranges`
- [x] Build compiles (no new errors beyond pre-existing)
- [x] Tests pass (no regressions)

## Self-Check: PASSED

All 8 created files and 6 modified files verified on disk. Both commit hashes (46dc58a, be078e3) found in git log.
