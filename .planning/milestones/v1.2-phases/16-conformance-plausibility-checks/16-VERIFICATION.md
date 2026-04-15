---
phase: 16-conformance-plausibility-checks
verified: 2026-04-14T09:10:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "TypeScript build compiles cleanly with no new errors (implied by ROADMAP Phase 14 baseline)"
    status: failed
    reason: "7 TS2352 errors introduced by phase-16 files. profileConformanceChecker.ts (5 errors) and temporalPlausibilityWalker.ts (2 errors) cast ElementDefinition/Resource to Record<string,unknown> in ways tsc rejects. The SUMMARY claimed 'no new errors beyond pre-existing' but these files did not exist before phase 16 — they are new errors."
    artifacts:
      - path: "src/quality/profileConformanceChecker.ts"
        issue: "5x TS2352: Conversion of type 'ElementDefinition' to 'Record<string, unknown>' — lines 139, 142, 143, 144, 147; and line 296 Resource cast"
      - path: "src/quality/temporalPlausibilityWalker.ts"
        issue: "1x TS2352: Conversion of type 'Resource' to 'Record<string, unknown>' — line 439"
    missing:
      - "In profileConformanceChecker.ts: replace '(el as Record<string, unknown>)' with '(el as unknown as Record<string, unknown>)' or access enriched fields via typed assertions"
      - "In temporalPlausibilityWalker.ts: replace '(resource as Record<string, unknown>)' with '(resource as unknown as Record<string, unknown>)' in normalizeTemporalIssues"
human_verification:
  - test: "Navigate to /quality on a running instance with a connected Blaze server"
    expected: "6 tabs visible: Counts | Completeness | Coding Coverage | Validation | Plausibility | Lab Ranges"
    why_human: "Tab rendering requires a running browser session; cannot verify with grep"
  - test: "On Validation tab, click 'Validate sample' against a server with observations that have coded values"
    expected: "Conformance issues (cardinality, type, value-set) appear in ResourceIssueTable; clicking a resource row navigates to /explorer/:type/:id"
    why_human: "End-to-end data flow from FHIR server to UI requires live server and browser"
  - test: "Disconnect or misconfigure terminology server URL, then run Validation"
    expected: "Orange 'Terminology server unavailable' banner appears; other conformance checks still show results"
    why_human: "Requires controlling network conditions / misconfigured server URL"
  - test: "On Plausibility tab, select 'Patient', run checks against a server with patients having birthDate in the future or age > 150"
    expected: "Issues flagged with correct check-type badges (age=red, future-date=orange); ResourceIssueTable links are clickable"
    why_human: "Requires live FHIR data with known implausible dates"
  - test: "On Lab Ranges tab, run checks against a server with Observation resources that have valueQuantity"
    expected: "Summary badges appear (In range / Out of range / No range); per-LOINC table renders when LOINC-coded observations exist"
    why_human: "Requires live Observation data with valueQuantity and referenceRange"
---

# Phase 16: Conformance & Plausibility Checks Verification Report

**Phase Goal:** Dashboard detects and reports value set violations, cardinality errors, implausible dates, and out-of-range lab values
**Verified:** 2026-04-14T09:10:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard flags coded values that do not belong to the expected value set for their field | VERIFIED | `profileConformanceChecker.ts` exports `validateConformance` with value-set binding check; `useConformanceRun` wires it to `ValidationPanel`; `ResourceIssueTable` renders clickable issues |
| 2 | Dashboard flags resources missing required fields or containing unexpected repeated values per resource type | VERIFIED | `validateConformance` checks min cardinality (`required`) and max cardinality (`max-cardinality`) against enriched MII profile JSONs; wired through `useConformanceRun` into `ValidationPanel` |
| 3 | Dashboard flags implausible temporal values (future dates, encounter end before start, negative age) | VERIFIED | `temporalPlausibilityWalker.ts` implements all 4 check categories; `usePlausibilityReport` wires it to `PlausibilityPanel`; 15/15 tests pass |
| 4 | Dashboard flags lab observations with values outside configurable reference ranges | VERIFIED | `labRangeChecker.ts` validates against config or embedded ranges; `useLabRangesReport` wires it to `LabRangesPanel`; 13/13 tests pass |
| 5 | All conformance and plausibility findings are accessible via the Phase 15 drill-down (clickable to resource detail) | VERIFIED | All panels (ValidationPanel, PlausibilityPanel, LabRangesPanel, PlausibilityDrillDown, LabRangesDrillDown) use `ResourceIssueTable` which renders `<Link to="/explorer/:type/:id">` for every issue row |

**Score:** 4/5 roadmap truths verified (truth 2 and 3 and 4 and 5 are fully verified; all 5 succeed functionally — however the TypeScript build fails on new errors introduced by phase-16 files, which is a gap against the project's build-clean standard established in Phase 14)

**Effective score:** All 5 functional truths pass. One cross-cutting gap: `npm run build` fails with 7 new TS2352 errors in phase-16 files.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/quality/profileConformanceChecker.ts` | Unified conformance validation | VERIFIED | Exports `validateConformance`, `ConformanceIssue`, `normalizeConformanceIssues`; 303 lines, fully implemented |
| `src/quality/valueSetCache.ts` | In-memory $expand result cache | VERIFIED | Exports `ValueSetCache` with `expand` and `isAvailable`; concurrent coalescing + size cap implemented |
| `src/quality/profileConformanceChecker.test.ts` | Unit tests for DQ-03 and DQ-04 | VERIFIED | 9 test cases, all passing |
| `src/quality/valueSetCache.test.ts` | Unit tests for $expand caching | VERIFIED | 6 test cases, all passing |
| `src/quality/temporalPlausibilityWalker.ts` | Temporal plausibility check engine | VERIFIED | Exports `checkTemporalPlausibility`, `discoverTemporalPaths`, `normalizeTemporalIssues`, `TemporalIssue`, `PlausibilityThresholds` |
| `src/quality/temporalPlausibilityWalker.test.ts` | Unit tests for DQ-05 | VERIFIED | 15 test cases, all passing |
| `src/quality/labRangeChecker.ts` | Lab reference range validation | VERIFIED | Exports `checkLabRanges`, `normalizeLabRangeIssues`, `LabRangeIssue`, `LabRangeSummary` |
| `src/quality/labRangeChecker.test.ts` | Unit tests for DQ-06 | VERIFIED | 13 test cases, all passing |
| `src/config/types.ts` | Extended AppSettings with plausibility and referenceRanges | VERIFIED | `plausibility?: { maxAge?, maxEncounterDays? }` and `referenceRanges?: Record<string, ...>` present |
| `src/components/quality/PlausibilityPanel.tsx` | Plausibility tab content | VERIFIED | "Run checks" and "Stop plausibility check" buttons; ResourceIssueTable wired |
| `src/components/quality/LabRangesPanel.tsx` | Lab Ranges tab content | VERIFIED | "Run lab range checks" and "Stop lab range check" buttons; per-LOINC table; ResourceIssueTable wired |
| `src/components/quality/PlausibilityDrillDown.tsx` | Per-type temporal drill-down | VERIFIED | "Back to Plausibility" back button; uses `usePlausibilityReport` + `ResourceIssueTable` |
| `src/components/quality/LabRangesDrillDown.tsx` | Observation lab range drill-down | VERIFIED | "Back to Lab Ranges" back button; uses `useLabRangesReport` + `ResourceIssueTable` |
| `src/components/quality/CohortSelector.tsx` | Dashboard-level resource type filter | VERIFIED | `quality.cohort.v1` localStorage key; MultiSelect with summary text |
| `src/hooks/useConformanceRun.ts` | Hook wrapping conformance checker + value set cache | VERIFIED | `terminologyAvailable` in return type; creates ValueSetCache; calls `validateConformance` in batch loop |
| `src/hooks/usePlausibilityReport.ts` | Hook wrapping temporal plausibility walker | VERIFIED | Batch runner with cancel; calls `checkTemporalPlausibility` + `normalizeTemporalIssues` |
| `src/hooks/useLabRangesReport.ts` | Hook wrapping lab range checker | VERIFIED | Batch runner; calls `checkLabRanges` + `normalizeLabRangeIssues`; returns `summary` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `profileConformanceChecker.ts` | `completenessWalker.ts` | `isPathPopulated` | WIRED | Direct import; called in min cardinality check |
| `useConformanceRun.ts` | `profileConformanceChecker.ts` | `validateConformance` | WIRED | Imported and called per-resource in batch loop |
| `useConformanceRun.ts` | `profiles/index.ts` | `getProfileForType` | WIRED | Imported and called to get profile before batch |
| `useConformanceRun.ts` | `valueSetCache.ts` | `ValueSetCache` | WIRED | `useRef(new ValueSetCache())` with `expand()` called for all binding URLs |
| `usePlausibilityReport.ts` | `temporalPlausibilityWalker.ts` | `checkTemporalPlausibility` | WIRED | Imported and called per-resource |
| `usePlausibilityReport.ts` | `profiles/index.ts` | `getProfileForType` | WIRED | Imported and called per-run |
| `useLabRangesReport.ts` | `labRangeChecker.ts` | `checkLabRanges` | WIRED | Imported and called with sampled observations |
| `labRangeChecker.ts` | `config/types.ts` | `referenceRanges` (via `ReferenceRangeConfig`) | WIRED | `ReferenceRangeConfig` interface defined in checker; `AppSettings.referenceRanges` uses same shape |
| `QualityOverviewPage.tsx` | `PlausibilityPanel.tsx` | `Tabs.Panel` rendering | WIRED | Imported and rendered in `Tabs.Panel value="plausibility"` |
| `QualityOverviewPage.tsx` | `LabRangesPanel.tsx` | `Tabs.Panel` rendering | WIRED | Imported and rendered in `Tabs.Panel value="lab-ranges"` |
| `QualityOverviewPage.tsx` | `CohortSelector.tsx` | rendered in toolbar | WIRED | Imported and rendered; `cohortTypes` state flows to `effectiveTypes` for all panels |
| `App.tsx` | `PlausibilityDrillDown.tsx` | Route `plausibility/:type` | WIRED | `<Route path="plausibility/:type" element={<PlausibilityDrillDown />} />` present |
| `App.tsx` | `LabRangesDrillDown.tsx` | Route `lab-ranges` | WIRED | `<Route path="lab-ranges" element={<LabRangesDrillDown />} />` present |
| `ValidationPanel.tsx` | `useConformanceRun.ts` | replaces `useValidationRun` | WIRED | `import { useConformanceRun }` at line 57; used as primary runner |
| `validationBackends.ts` | (exports `createConformanceBackend`) | wraps profileConformanceChecker | WIRED | `export function createConformanceBackend` present at line 54 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ValidationPanel.tsx` | `run.issues` (NormalizedIssue[]) | `useConformanceRun` -> `validateConformance` -> profile snapshot elements + value sets | Yes — batch over sampled resources, results accumulated per resource | FLOWING |
| `PlausibilityPanel.tsx` | `run.issues` (NormalizedIssue[]) | `usePlausibilityReport` -> `checkTemporalPlausibility` -> discovered temporal paths | Yes — profile-driven path discovery, date arithmetic on real field values | FLOWING |
| `LabRangesPanel.tsx` | `run.issues` + `run.summary` | `useLabRangesReport` -> `checkLabRanges` -> `sampleResources('Observation', ...)` | Yes — samples live Observation resources, compares valueQuantity to config/embedded ranges | FLOWING |
| `PlausibilityDrillDown.tsx` | `run.issues` | `usePlausibilityReport` (auto-starts on mount) | Yes — same engine as panel, auto-started | FLOWING |
| `LabRangesDrillDown.tsx` | `run.issues` | `useLabRangesReport` (auto-starts on mount) | Yes — same engine as panel, auto-started | FLOWING |

### Behavioral Spot-Checks

Step 7b: Partially run. The quality engine modules (checkers, walker, cache) are all pure functions or class instances with no server dependency — tested via Vitest.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 43 phase-16 unit tests pass | `npx vitest run src/quality/valueSetCache.test.ts src/quality/profileConformanceChecker.test.ts src/quality/temporalPlausibilityWalker.test.ts src/quality/labRangeChecker.test.ts` | 4 test files, 43 tests, 0 failures | PASS |
| TypeScript build compiles | `npm run build` | 7 TS2352 errors in profileConformanceChecker.ts (5) and temporalPlausibilityWalker.ts (2) | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DQ-03 | 16-01, 16-04 | Dashboard checks resources against expected value sets and flags non-conforming coded values | SATISFIED | `validateConformance` checks `binding.valueSet` membership via `ValueSetCache`; wired to ValidationPanel |
| DQ-04 | 16-01, 16-04 | Dashboard checks cardinality rules (required fields present, no unexpected repeats) per resource type | SATISFIED | `validateConformance` checks `min >= 1` (required) and `max === '1'` (max-cardinality); enriched profile JSONs carry the metadata |
| DQ-05 | 16-02, 16-04 | Dashboard flags implausible temporal values (dates in the future, encounter end before start, negative age) | SATISFIED | `checkTemporalPlausibility` covers all 4 check categories; `PlausibilityPanel` and `PlausibilityDrillDown` expose the results |
| DQ-06 | 16-03, 16-04 | Dashboard flags lab observations with values outside configurable reference ranges | SATISFIED | `checkLabRanges` implements config-precedence range check; `LabRangesPanel` and `LabRangesDrillDown` expose results |

### Anti-Patterns Found

| File | Lines | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `src/quality/profileConformanceChecker.ts` | 139, 142, 143, 144, 147, 296 | TS2352 unsafe cast: `(el as Record<string, unknown>)` on `ElementDefinition`; `(resource as Record<string, unknown>)` on `Resource` | Warning | Build fails; runtime behavior correct since enriched profile JSON has the fields, but tsc strict mode rejects the cast pattern. Fix: cast through `unknown` first. |
| `src/quality/temporalPlausibilityWalker.ts` | 439 | TS2352 unsafe cast: `(resource as Record<string, unknown>)` on `Resource` | Warning | Same as above — build fails on this line in `normalizeTemporalIssues`. |

No placeholder/TODO markers found. No empty implementations found. All functions are substantive.

### Human Verification Required

#### 1. 6-Tab Quality Dashboard Rendering

**Test:** Start `npm run dev` (after fixing TS errors), navigate to `/quality`
**Expected:** 6 tabs visible in order: Counts | Completeness | Coding Coverage | Validation | Plausibility | Lab Ranges
**Why human:** Tab rendering in browser requires running dev server; cannot verify tab count from static analysis alone (grep confirmed 6 `Tabs.Tab` entries but visual confirmation needed)

#### 2. Conformance Checker End-to-End (Validation Tab)

**Test:** On the Validation tab with a connected Blaze server, click "Validate sample" for a resource type that has a bundled MII profile (e.g., Condition, Patient)
**Expected:** Conformance issues (cardinality, type constraints, value-set violations) appear in ResourceIssueTable; clicking a resource row navigates to `/explorer/:type/:id`
**Why human:** Requires live FHIR server with real data; also confirms the terminology banner behavior when terminology server is reachable or not

#### 3. Terminology Unavailable Banner

**Test:** Configure a non-reachable terminology server URL in settings, run Validation
**Expected:** Orange "Terminology server unavailable" banner appears; value-set checks are skipped but other conformance checks (cardinality, type) still run and show results; banner is dismissible
**Why human:** Requires controlling terminology server availability (network condition)

#### 4. Plausibility Tab with Real Data

**Test:** On Plausibility tab, select Patient and run checks against a Blaze server with test data including deliberately implausible birthDates
**Expected:** Issues flagged with correct check-type badges and severity colors; ResourceIssueTable shows per-resource findings; cancel button works during run
**Why human:** Requires live FHIR data with known temporal anomalies

#### 5. Lab Ranges Tab with Observation Data

**Test:** On Lab Ranges tab, run checks against a Blaze server with Observation resources that have valueQuantity
**Expected:** Summary badges render (in range / out of range / no range counts); per-LOINC breakdown table populates when LOINC-coded observations exist; cancel works
**Why human:** Requires live Observation data with numeric valueQuantity values

### Gaps Summary

**One gap blocks unconditional "passed" status:**

The TypeScript build (`npm run build`) fails with 7 new TS2352 errors introduced by phase-16 files. Both `profileConformanceChecker.ts` and `temporalPlausibilityWalker.ts` use the cast pattern `(el as Record<string, unknown>)` and `(resource as Record<string, unknown>)` which TypeScript's strict mode rejects because `ElementDefinition` and the union type `Resource` do not have an index signature. The fix is minimal — changing these casts to go through `unknown` first (`(el as unknown as Record<string, unknown>)`) resolves all 7 errors.

The runtime behavior is correct (the enriched JSON properties are accessed correctly at runtime), but the project established a "zero TypeScript errors" standard in Phase 14, and phase 16 regresses against that standard.

All 43 unit tests pass. All functional goals (DQ-03, DQ-04, DQ-05, DQ-06) are structurally implemented and wired. Human verification of live UI interactions is needed separately but is independent of the TS fix.

---

_Verified: 2026-04-14T09:10:00Z_
_Verifier: Claude (gsd-verifier)_
