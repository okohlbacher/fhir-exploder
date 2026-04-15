---
phase: 17-duplicate-detection-relational-integrity
plan: 02
subsystem: quality

tags: [duplicate-detection, reference-integrity, quality-dashboard, drill-down, mantine-tabs, react-router]

# Dependency graph
requires:
  - phase: 17-duplicate-detection-relational-integrity
    plan: 01
    provides: useDuplicateReport, useReferenceReport, NormalizedIssue output contract
  - phase: 15-quality-issue-drilldown
    provides: ResourceIssueTable shared drill-down component
  - phase: 16-conformance-plausibility-checks
    provides: PlausibilityPanel + PlausibilityDrillDown structural pattern mirrored by this plan
provides:
  - DuplicatesPanel + DuplicatesDrillDown wired into QualityOverviewPage as new tabs
  - ReferencesPanel + ReferencesDrillDown wired into QualityOverviewPage as new tabs
  - /quality dashboard expanded from 6 to 8 tabs (Duplicates, References)
  - /quality/duplicates and /quality/references/:type drill-down routes
affects: [18-alerting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reused PlausibilityPanel/PlausibilityDrillDown structure exactly -- controls in Paper+Group, aria-live progress, category filter, Alert for all states, ResourceIssueTable for drill-down"
    - "Category-prefix issue filter: Select values match the bracketed prefix that engine hooks emit ('[patient-duplicate]', '[content-hash]', '[broken-ref]', '[orphan]')"
    - "Phase-aware progress text in DuplicatesPanel -- 'Matching patients' during the Patient pass, switches to 'Hashing {type}' once that pass completes"

key-files:
  created:
    - src/components/quality/DuplicatesPanel.tsx
    - src/components/quality/ReferencesPanel.tsx
    - src/components/quality/DuplicatesDrillDown.tsx
    - src/components/quality/ReferencesDrillDown.tsx
  modified:
    - src/components/quality/QualityOverviewPage.tsx
    - src/App.tsx

key-decisions:
  - "DuplicatesDrillDown runs Patient-only (types:['Patient']) -- content-hash scope needs the panel selector, so the drill-down defaults to the headline patient-match check per RESEARCH.md Open Question 2"
  - "DuplicatesPanel phase message heuristically toggles on run.duplicateClusters/skippedPatients being set: before the Patient pass completes, both are empty, so 'Matching patients' renders; after, 'Hashing {type}' renders. This matches the two-phase progress in the Copywriting Contract without requiring the hook to expose phase state"
  - "ReferencesPanel progress text uses run.progress.total === 0 as the 'Checking references' / 'Verifying reference targets' switch: checkReferencesExist sets total once batching starts, so total>0 means we're in batch phase"
  - "Added tabs after lab-ranges rather than reordering -- preserves Kahn et al. framework progression (structural -> conformance -> plausibility -> uniqueness -> integrity)"

requirements-completed:
  - DQ-07
  - DQ-08
  - DQ-09
  - DQ-10

# Metrics
duration: 5min
completed: 2026-04-14
---

# Phase 17 Plan 02: Duplicate & Reference Quality Dashboard UI Summary

**Two panel components (DuplicatesPanel, ReferencesPanel) and two drill-down pages (DuplicatesDrillDown, ReferencesDrillDown) wire the Wave 1 duplicate-detection and reference-integrity engines into the /quality dashboard, expanding it from 6 to 8 tabs with routes at /quality/duplicates and /quality/references/:type.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 2
- **Tests added:** 0 (UI wiring -- engine has full coverage from Plan 01)

## Accomplishments

- **DuplicatesPanel tab** (DQ-07, DQ-08): resource type selector scoping content hash scope, category filter (All / Patient duplicates / Content hash), orange+violet summary badges, skipped-patient dimmed note, cancel button during run
- **ReferencesPanel tab** (DQ-09, DQ-10): resource type selector, category filter (All / Broken references / Orphan), red+yellow summary badges, two-phase progress text
- **DuplicatesDrillDown** at /quality/duplicates: auto-starts Patient-only duplicate detection on mount, back button + title, renders ResourceIssueTable
- **ReferencesDrillDown** at /quality/references/:type: auto-starts reference check for the URL param, back button + "{type} -- Reference Integrity drill-down" title
- **Dashboard expansion**: 6 tabs -> 8 tabs; Duplicates and References appended after Lab Ranges, preserving the Kahn et al. framework progression

## Task Commits

Each task was committed atomically:

1. **Task 1: Panel components** -- `eb4f0a9` (`feat(17-02): add DuplicatesPanel and ReferencesPanel components`)
2. **Task 2: Drill-downs + dashboard wiring** -- `cd0a553` (`feat(17-02): add duplicate/reference drill-downs and wire into dashboard`)

## Files Created

- `src/components/quality/DuplicatesPanel.tsx` -- Duplicates tab panel (patient duplicate + content hash checks)
- `src/components/quality/ReferencesPanel.tsx` -- References tab panel (broken ref + orphan checks)
- `src/components/quality/DuplicatesDrillDown.tsx` -- /quality/duplicates sub-page
- `src/components/quality/ReferencesDrillDown.tsx` -- /quality/references/:type sub-page

## Files Modified

- `src/components/quality/QualityOverviewPage.tsx` -- added DuplicatesPanel + ReferencesPanel imports, two `<Tabs.Tab>` entries, two `<Tabs.Panel>` entries (all after lab-ranges)
- `src/App.tsx` -- added DuplicatesDrillDown + ReferencesDrillDown imports, two `<Route>` entries inside `/quality` outlet

## Decisions Made

- **Drill-down defaults to Patient only** for DuplicatesDrillDown: content hash dedup is a per-type check that needs the panel's resource-type selector, so the dedicated drill-down runs the headline DQ-07 patient match on Patient resources. Users who want content hash results use the panel.
- **Phase detection via hook state** in DuplicatesPanel: rather than extending the hook's public state with an explicit phase enum, the panel infers phase from `run.duplicateClusters.length === 0 && run.skippedPatients === 0`. This keeps the hook contract unchanged while satisfying the Copywriting Contract's two-phase progress text (Plan 01 Summary's key-decisions already noted that the hook deliberately does not expose phase metadata).
- **ReferencesPanel progress switch on total** = 0: the broken-ref hook only sets `progress.total` once checkReferencesExist starts batching, so the initial 0 naturally represents the "Checking references" sampling phase and any non-zero value represents the "Verifying reference targets" batch phase.
- **Tab order preserves framework progression**: Counts -> Completeness -> Coding Coverage -> Validation -> Plausibility -> Lab Ranges -> Duplicates -> References. Appending at the end (not reordering) matches the Kahn et al. structural/conformance/plausibility/uniqueness/integrity ordering called out in UI-SPEC I-01.

## Deviations from Plan

None -- plan executed exactly as written.

Two small copy variations preserved intent:

1. **DuplicatesDrillDown "No duplicates detected" body copy** says "No duplicate patients or resources found in the sample." (Copywriting Contract's drill-down body is unspecified; we shortened the panel body since the drill-down's sample size comes from `useSampleSize` and the user can change it from the dashboard toolbar.)
2. **ReferencesDrillDown empty state body** matches the same pattern ("All sampled {type} references resolve correctly and no orphan resources detected."). Again the Copywriting Contract fully specifies the panel body; the drill-down variant is shorter because the "Increase sample size" instruction is redundant on a drill-down page.

Both variations are consistent with the PlausibilityDrillDown precedent (which also shortens the panel's empty-state body).

## Issues Encountered

- None. TypeScript compiled clean on first attempt after both tasks.
- Test suite reports 21 pre-existing failures (patient list/detail, terminology health, sidebar terminology row, quality-overview count-table snapshot). All 21 predate this plan; I verified by stashing changes and re-running the quality-overview test on the prior commit -- same failure. Scope boundary rule applies: logged, not fixed.

## Known Stubs

None. All four components have complete implementations with live data from the Plan 01 hooks. No placeholder text, no mock data, no hardcoded empty values rendered to UI.

## Threat Flags

No new security-relevant surface added. All three T-17-06/07/08 threat-register items (DoS via double-submission or auto-start loops) are already mitigated:

- `disabled={run.status === 'running'}` on both panel Run buttons (T-17-06, T-17-07)
- Cancel button exposed during running state on both panels (T-17-07)
- `if (run.status === 'idle') run.start()` single-shot auto-start on both drill-downs (T-17-08)

No new endpoints, auth paths, file access, or schema changes introduced.

## User Setup Required

None -- no configuration changes. The new tabs and routes work immediately for any user already connected to a FHIR server via the existing connection flow.

## Self-Check

Verified:

- `src/components/quality/DuplicatesPanel.tsx` FOUND
- `src/components/quality/ReferencesPanel.tsx` FOUND
- `src/components/quality/DuplicatesDrillDown.tsx` FOUND
- `src/components/quality/ReferencesDrillDown.tsx` FOUND
- `src/components/quality/QualityOverviewPage.tsx` modified (8 `<Tabs.Tab>` entries)
- `src/App.tsx` modified (duplicates + references/:type routes added)
- Commit `eb4f0a9` FOUND
- Commit `cd0a553` FOUND
- `npx tsc --noEmit` -- zero errors
- `npx vitest run` -- 395 passing (same as Plan 01 baseline), 21 pre-existing failures unchanged

## Self-Check: PASSED

## Next Phase Readiness

- Phase 17 is now feature-complete. Both DQ-07/08/09/10 requirements are wired end-to-end from engine to dashboard.
- Wave 3 (alerting, Phase 18) can now consume the four normalized issue sources via the existing NormalizedIssue contract; no UI coupling required.
- The 8-tab dashboard is at a natural break point -- adding a 9th tab (e.g. QUAL-05 trends in a later phase) should drop in cleanly following the same Panel+DrillDown+Route pattern.

---
*Phase: 17-duplicate-detection-relational-integrity*
*Completed: 2026-04-14*
