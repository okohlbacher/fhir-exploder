---
phase: 17-duplicate-detection-relational-integrity
verified: 2026-04-14T11:12:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Dashboard identifies potential duplicate patients by matching on name + date of birth (SC-1 / DQ-07) — DuplicatesPanel.tsx line 73 now uses c.patients.length, not c.members.length"
    - "Dashboard identifies potential duplicate resources by detecting same content hash with different IDs (SC-2 / DQ-08) — DuplicatesPanel.tsx line 82 now uses c.resources.length, not c.members.length"
  gaps_remaining: []
  regressions: []
  closure_commits:
    - "0ed47d4 fix(17-03): correct cluster field references in DuplicatesPanel"
    - "e9d3ef2 test(17-03): regression test for DuplicatesPanel non-empty cluster rendering"
    - "cf2ae98 docs(17-03): complete duplicate-panel field-name gap-closure plan"
human_verification:
  - test: "Verify Duplicates and References tabs render correctly in the dashboard"
    expected: "Both tabs appear in the 8-tab quality dashboard, controls are visible, Run buttons are clickable"
    why_human: "Visual layout and tab rendering cannot be verified without a running browser instance"
  - test: "Verify drill-down navigation from issue table rows"
    expected: "Clicking a row in ResourceIssueTable navigates to /explorer/:type/:id resource detail page"
    why_human: "React Router navigation behavior requires browser interaction to verify end-to-end"
---

# Phase 17: Duplicate Detection & Relational Integrity — Verification Report

**Phase Goal:** Dashboard surfaces potential duplicate records and broken/orphan references across the FHIR dataset
**Verified:** 2026-04-14T11:12:00Z (re-verification after gap closure)
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 17-03)

## Re-Verification Summary

The initial verification at 2026-04-14T10:52:00Z marked SC-1 and SC-2 as FAILED because `DuplicatesPanel.tsx` lines 73 and 82 dereferenced a non-existent `.members` field, crashing the Duplicates tab at runtime whenever the engine returned non-empty clusters. Plan 17-03 (gap closure) was executed and:

1. **Fixed line 73** from `c.members.length` to `c.patients.length` (PatientDuplicateCluster) — commit `0ed47d4`
2. **Fixed line 82** from `c.members.length` to `c.resources.length` (ContentHashCluster) — same commit
3. **Added regression test** at `src/__tests__/duplicates-panel.test.tsx` (3 tests, all passing) — commit `e9d3ef2`

All three close-out commits are present in `git log`. Verification of the fix:
- `grep -c "c\.members" src/components/quality/DuplicatesPanel.tsx` returns `0`
- `grep -c "c\.patients\.length" src/components/quality/DuplicatesPanel.tsx` returns `1`
- `grep -c "c\.resources\.length" src/components/quality/DuplicatesPanel.tsx` returns `1`
- `npx vitest run src/__tests__/duplicates-panel.test.tsx` — 3/3 pass
- `npx tsc --noEmit` — exit 0
- 62 engine unit tests — all still pass

**SC-1 and SC-2 advance from FAILED to VERIFIED.** No regressions introduced. Score moves from 4/5 → 5/5.

Two human-verification items identified in the initial verification remain unaddressed (visual tab layout + end-to-end drill-down navigation). Because automated verification alone cannot confirm browser-level behavior, the overall status is **human_needed** per the Step 9 decision tree.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard identifies potential duplicate patients by matching on name + date of birth | VERIFIED | Engine (`patientDuplicateDetector.ts`) clusters by normalized `family|given|birthDate`. Hook (`useDuplicateReport`) populates `duplicateClusters` and `issues`. DuplicatesPanel line 73 now reads `c.patients.length` (gap-closure commit `0ed47d4`). Regression test `duplicates-panel.test.tsx` renders a non-empty PatientDuplicateCluster and asserts `(2 patients involved)` without throwing. |
| 2 | Dashboard identifies potential duplicate resources by detecting same content hash with different IDs | VERIFIED | `contentHasher.ts` and `useDuplicateReport` correct. DuplicatesPanel line 82 now reads `c.resources.length` (same commit `0ed47d4`). Regression test asserts `(3 resources involved)` without throwing. |
| 3 | Dashboard reports broken references (dangling pointers to non-existent resources) | VERIFIED | `referenceWalker.ts` extracts references, `referenceChecker.ts` batch-checks via `_id` search with concurrency=5, `useReferenceReport` orchestrates and exposes `brokenCount`. `ReferencesPanel` renders `ResourceIssueTable` with `filteredIssues` and a red `broken: N` Badge. 17 engine tests green. |
| 4 | Dashboard reports orphan resources (resources that should reference a parent but have no such reference) | VERIFIED | `orphanDetector.ts` reads `min>=1 Reference` elements from MII profiles with R4 FALLBACK map. `useReferenceReport` accumulates orphan issues, exposes `orphanCount`. `ReferencesPanel` shows yellow `orphan: N` Badge and `ResourceIssueTable`. 13 engine tests green. |
| 5 | All duplicate and integrity findings are accessible via the Phase 15 drill-down (clickable to resource detail) | VERIFIED | `ResourceIssueTable.tsx` renders each issue as a `Link` to `/explorer/:type/:id`. All four components (`DuplicatesPanel`, `ReferencesPanel`, `DuplicatesDrillDown`, `ReferencesDrillDown`) use `ResourceIssueTable`. Drill-down pages auto-start on mount and render `run.issues` directly. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/quality/patientDuplicateDetector.ts` | findPatientDuplicates pure function | VERIFIED | Exports `findPatientDuplicates`, `PatientDuplicateCluster`, `normalizePatientDuplicateIssues`. Cluster field is `.patients`. |
| `src/quality/contentHasher.ts` | canonicalize + hashResource + findContentHashDuplicates | VERIFIED | Exports all 6 required symbols. Uses `crypto.subtle.digest('SHA-256')`. Cluster field is `.resources`. |
| `src/quality/referenceWalker.ts` | extractReferences pure function | VERIFIED | Exports `extractReferences` and `ExtractedReference`. Skips `#`, `urn:`, normalizes absolute URLs. |
| `src/quality/referenceChecker.ts` | checkReferencesExist async function | VERIFIED | Exports `checkReferencesExist` and `normalizeBrokenRefIssues`. Batches via `_id` with concurrency=5. |
| `src/quality/orphanDetector.ts` | detectOrphans pure function | VERIFIED | Exports `detectOrphans` and `getRequiredReferenceFields`. FALLBACK map present. |
| `src/hooks/useDuplicateReport.ts` | useDuplicateReport hook | VERIFIED | Exports `useDuplicateReport`, `DuplicateRunState`, `DuplicateRunStatus`. `cancelledRef` pattern present. |
| `src/hooks/useReferenceReport.ts` | useReferenceReport hook | VERIFIED | Exports `useReferenceReport`, `ReferenceRunState`, `ReferenceRunStatus`. `cancelledRef` pattern present. |
| `src/components/quality/DuplicatesPanel.tsx` | Duplicates tab panel component | VERIFIED | Exports `DuplicatesPanel`. Lines 73/82 now reference `c.patients.length` and `c.resources.length` respectively. No field-name bug. |
| `src/components/quality/ReferencesPanel.tsx` | References tab panel component | VERIFIED | Exports `ReferencesPanel`. Full implementation with category filter, badges, all states. |
| `src/components/quality/DuplicatesDrillDown.tsx` | Duplicates drill-down page | VERIFIED | Exports `DuplicatesDrillDown`. Auto-start useEffect, back button, title, ResourceIssueTable. |
| `src/components/quality/ReferencesDrillDown.tsx` | References drill-down page | VERIFIED | Exports `ReferencesDrillDown`. `useParams` for `:type`, auto-start, back button, title, ResourceIssueTable. |
| `src/__tests__/duplicates-panel.test.tsx` | Component regression test | VERIFIED | 3 tests passing (non-empty cluster render, finite integer assertion, empty-state path). Added in plan 17-03. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useDuplicateReport.ts` | `src/quality/patientDuplicateDetector.ts` | import findPatientDuplicates | WIRED | Import `findPatientDuplicates`, `normalizePatientDuplicateIssues`, `PatientDuplicateCluster` |
| `src/hooks/useDuplicateReport.ts` | `src/quality/contentHasher.ts` | import findContentHashDuplicates | WIRED | Import `findContentHashDuplicates`, `normalizeContentHashIssues`, `ContentHashCluster` |
| `src/hooks/useReferenceReport.ts` | `src/quality/referenceWalker.ts` | import extractReferences | WIRED | Import `extractReferences` |
| `src/hooks/useReferenceReport.ts` | `src/quality/referenceChecker.ts` | import checkReferencesExist | WIRED | Import `checkReferencesExist`, `normalizeBrokenRefIssues` |
| `src/hooks/useReferenceReport.ts` | `src/quality/orphanDetector.ts` | import detectOrphans | WIRED | Import `detectOrphans` |
| `src/components/quality/QualityOverviewPage.tsx` | `src/components/quality/DuplicatesPanel.tsx` | import DuplicatesPanel | WIRED | Line 30: import; line 130: `<DuplicatesPanel …/>` |
| `src/components/quality/QualityOverviewPage.tsx` | `src/components/quality/ReferencesPanel.tsx` | import ReferencesPanel | WIRED | Line 31: import; line 133: `<ReferencesPanel …/>` |
| `src/App.tsx` | `src/components/quality/DuplicatesDrillDown.tsx` | Route path="duplicates" | WIRED | Line 19 import; line 77 `<Route path="duplicates" …/>` |
| `src/App.tsx` | `src/components/quality/ReferencesDrillDown.tsx` | Route path="references/:type" | WIRED | Line 20 import; line 78 `<Route path="references/:type" …/>` |
| `src/__tests__/duplicates-panel.test.tsx` | `src/components/quality/DuplicatesPanel.tsx` | vi.mock useDuplicateReport + render | WIRED | Mocks `../hooks/useDuplicateReport`, renders panel under MantineProvider+MemoryRouter |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| DuplicatesPanel.tsx | `run.issues` | useDuplicateReport → findPatientDuplicates → normalizePatientDuplicateIssues | Yes — real patient samples from sampleResources | FLOWING |
| DuplicatesPanel.tsx | `patientsInvolved` (summary metric) | `run.duplicateClusters` via `.patients` | Yes — correct field name reads real PatientDuplicateCluster members | FLOWING |
| DuplicatesPanel.tsx | `hashResourcesInvolved` (summary metric) | `run.contentHashClusters` via `.resources` | Yes — correct field name reads real ContentHashCluster members | FLOWING |
| ReferencesPanel.tsx | `run.issues` | useReferenceReport → checkReferencesExist + detectOrphans | Yes — real server queries via `_id` search | FLOWING |
| DuplicatesDrillDown.tsx | `run.issues` | useDuplicateReport → normalizePatientDuplicateIssues | Yes — real data | FLOWING |
| ReferencesDrillDown.tsx | `run.issues` | useReferenceReport → normalizeBrokenRefIssues + detectOrphans | Yes — real server queries | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 62 engine unit tests pass | `npx vitest run src/__tests__/patient-duplicate-detector.test.ts src/__tests__/content-hasher.test.ts src/__tests__/reference-checker.test.ts src/__tests__/orphan-detector.test.ts` | 62/62 passed | PASS |
| 3 DuplicatesPanel regression tests pass | `npx vitest run src/__tests__/duplicates-panel.test.tsx` | 3/3 passed | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | Exit 0 | PASS |
| CR-01 bug no longer present | `grep -c "c\.members" src/components/quality/DuplicatesPanel.tsx` | `0` | PASS |
| PatientDuplicateCluster correct field in panel | `grep -c "c\.patients\.length" src/components/quality/DuplicatesPanel.tsx` | `1` | PASS |
| ContentHashCluster correct field in panel | `grep -c "c\.resources\.length" src/components/quality/DuplicatesPanel.tsx` | `1` | PASS |
| Gap-closure commits present | `git log --oneline \| grep -E "0ed47d4\|e9d3ef2\|cf2ae98"` | All three present | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DQ-07 | 17-01, 17-02, 17-03 | Dashboard detects potential duplicate patients by matching on name + date of birth | SATISFIED | Engine + hook + panel + drill-down + regression test all in place. DuplicatesPanel renders PatientDuplicateCluster results without crashing (verified via duplicates-panel.test.tsx:renders non-empty cluster summaries). |
| DQ-08 | 17-01, 17-02, 17-03 | Dashboard detects potential duplicate resources (same content hash, different IDs) | SATISFIED | Engine + hook + panel + drill-down + regression test all in place. DuplicatesPanel renders ContentHashCluster results without crashing (verified via same test file). |
| DQ-09 | 17-01, 17-02 | Dashboard checks for broken references (dangling pointers to non-existent resources) | SATISFIED | `referenceWalker.ts` + `referenceChecker.ts` + `useReferenceReport` + `ReferencesPanel` all correct. 17 unit tests green. |
| DQ-10 | 17-01, 17-02 | Dashboard checks for orphan resources (resources that should reference a parent but don't) | SATISFIED | `orphanDetector.ts` + `useReferenceReport` + `ReferencesPanel` all correct. 13 unit tests green. |

All four Phase 17 requirement IDs (DQ-07, DQ-08, DQ-09, DQ-10) accounted for across plans 17-01, 17-02, and 17-03. No orphaned requirements detected in REQUIREMENTS.md for this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/components/quality/DuplicatesDrillDown.tsx | 49 | `eslint-disable-next-line react-hooks/exhaustive-deps` | Info | Auto-start effect suppresses hook dependency lint; intentional pattern matching PlausibilityDrillDown; acceptable |
| src/components/quality/ReferencesDrillDown.tsx | 50 | `eslint-disable-next-line react-hooks/exhaustive-deps` | Info | Same pattern as above; intentional |

No blocker or warning anti-patterns remain after gap closure. The two previously-blocker `c.members.length` dereferences are resolved.

### Human Verification Required

#### 1. Quality Dashboard Tab Layout

**Test:** Open `/quality` in the browser and inspect the tab strip.
**Expected:** 8 tabs visible in order: Counts, Completeness, Coding Coverage, Validation, Plausibility, Lab Ranges, Duplicates, References.
**Why human:** Tab rendering and visual layout requires browser interaction. QualityOverviewPage.tsx declares exactly 8 `<Tabs.Tab>` entries in the correct order (verified in source), but visual confirmation still requires a running browser.

#### 2. Drill-Down Navigation from Issue Table

**Test:** On the References tab, run a reference check, then click a row in the issue table.
**Expected:** Browser navigates to `/explorer/:resourceType/:id` showing the resource detail page.
**Why human:** React Router navigation and resource detail page loading requires browser interaction to verify end-to-end. `ResourceIssueTable` renders each row as a `<Link>`, and the routes are wired in `App.tsx`, but live navigation needs human confirmation.

### Gaps Summary

**All automated gaps closed.** The SC-1/SC-2 field-name bug (previously documented as CR-01) is resolved by two one-line fixes in `DuplicatesPanel.tsx` plus a 3-test regression guard at `src/__tests__/duplicates-panel.test.tsx`. The regression test was bug-falsification-proven in the summary (reverting the fix causes 2/3 tests to fail with the expected TypeError).

**Human verification remains required** for two browser-level concerns: visual confirmation of the 8-tab layout and end-to-end drill-down navigation. Both are standard human-UAT items and do not block phase closure — they gate the user-visible acceptance pass rather than the code-level verification.

**No regressions.** All 62 engine unit tests still pass, TypeScript still compiles clean, and the four Phase 17 panels remain fully wired. The 21 pre-existing test failures noted in 17-03-SUMMARY.md are in unrelated files (patient-list, terminology-health, sidebar terminology row, etc.) and predate this phase — they are out of scope and tracked separately.

---

_Re-verified: 2026-04-14T11:12:00Z_
_Initial verification: 2026-04-14T10:52:00Z (status: gaps_found, 4/5)_
_Verifier: Claude (gsd-verifier)_
