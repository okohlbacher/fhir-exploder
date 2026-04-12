---
phase: 05-data-quality-dashboard
verified: 2026-04-12T12:12:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 05: Data Quality Dashboard Verification Report

**Phase Goal:** Users can audit the data on their FHIR server — seeing resource counts, field completeness, coding quality, and profile conformance issues at a glance.
**Verified:** 2026-04-12T12:12:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can view a dashboard showing resource counts per type across the entire server | VERIFIED | `/quality` mounted in App.tsx → QualityOverviewPage → OverviewStrip (4 summary cards with total resource count) + ResourceCountsPanel (sortable per-type Table with Progress bars). `useResourceCounts` hook wires to real FHIR searches. |
| 2 | User can see field completeness statistics per resource type | VERIFIED | CompletenessPanel uses `useCompletenessReport` hook → walks bundled MII profiles via `requiredElementPaths` + `isPathPopulated` → returns populated/total counts. 7 bundled MII profiles in `src/quality/profiles/*.json`. 48px RingProgress per-type. Drill-down at `/quality/completeness/:type`. |
| 3 | User can see coding coverage metrics (systemCode vs textOnly vs empty) | VERIFIED | CodingCoveragePanel uses `useCodingCoverage` hook → `classifyCodedFields` walks every CodeableConcept, classifies into three buckets with Pitfall 5 Identifier exclusion. 3-segment stacked Progress.Root bars. Drill-down at `/quality/coding/:type` with CodeableConceptDisplay examples. |
| 4 | User can validate resources against MII profiles and see conformance issues | VERIFIED | ValidationPanel + `useValidationRun` batch runner. `structuralValidator` uses bundled MII profiles; `remoteValidator` optional via `settings.validation.validatorUrl`. ValidationIssueList renders severity-sorted issues with `/explorer/` links. JSON report export. T-05-05-02 safety guard (never POSTs to Blaze). |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/quality/types.ts` | Contract module | VERIFIED | 105 lines, all contract types exported |
| `src/quality/keys.ts` | Cache key helpers | VERIFIED | 22 lines, `buildMetricsKey` + `LOCAL_STORAGE_PREFIX='quality-metrics:v1:'` |
| `src/quality/sampling.ts` | sampleResources helper | VERIFIED | Uses `client.searchResources(..., { _count })` |
| `src/quality/metricsCache.ts` | LRU + localStorage cache | VERIFIED | 178 lines; `QualityMetricsCache` + `clearAllQualityMetrics` |
| `src/quality/QualityMetricsContext.tsx` | Rollup context | VERIFIED | 59 lines; `QualityMetricsProvider` + `useQualityMetrics` hook |
| `src/quality/counts.ts` | summarizeCounts + sortCounts | VERIFIED | 90 lines |
| `src/quality/completenessWalker.ts` | requiredElementPaths + isPathPopulated + computeCompleteness | VERIFIED | 101 lines |
| `src/quality/codingCoverageWalker.ts` | classifyCodedFields + aggregateCoverage | VERIFIED | 184 lines, Pitfall 5 allowlist in place |
| `src/quality/profiles/*.json` | 7 MII StructureDefinitions | VERIFIED | All 7 present (Condition, Observation, Patient, Procedure, MedicationStatement, Encounter, Consent) |
| `src/quality/profiles/index.ts` | Profile registry | VERIFIED | `getProfileForType` + `BUNDLED_PROFILE_TYPES` |
| `src/quality/structuralValidator.ts` | Structural validator | VERIFIED | 52 lines, reuses Plan 03 walker |
| `src/quality/remoteValidator.ts` | Remote validator | VERIFIED | 74 lines, independent MedplumClient |
| `src/quality/validationBackends.ts` | resolveBackends + dedupeIssues | VERIFIED | 75 lines |
| `src/hooks/useQualityMetrics.ts` | Orchestrator hook | VERIFIED | 109 lines; wraps useResourceCounts |
| `src/hooks/useCompletenessReport.ts` | Completeness hook | VERIFIED | 156 lines; rollup via setCompleteness |
| `src/hooks/useCodingCoverage.ts` | Coverage hook | VERIFIED | 141 lines; rollup via setCoverage |
| `src/hooks/useValidationRun.ts` | Batch runner | VERIFIED | 196 lines |
| `src/components/quality/QualityLayout.tsx` | Connection-gated outlet | VERIFIED | 64 lines, wraps Outlet in MedplumProvider + QualityMetricsProvider |
| `src/components/quality/SampleSizeControl.tsx` | Sample size control | VERIFIED | 56 lines, useSampleSize with 10..1000 clamp |
| `src/components/quality/OverviewStrip.tsx` | 4-card summary | VERIFIED | 70 lines |
| `src/components/quality/SummaryCard.tsx` | Card primitive | VERIFIED | 50 lines |
| `src/components/quality/ResourceCountsPanel.tsx` | Sortable counts table | VERIFIED | 176 lines |
| `src/components/quality/QualityOverviewPage.tsx` | Real dashboard | VERIFIED | 107 lines; stub replaced |
| `src/components/quality/CompletenessPanel.tsx` | Real completeness panel | VERIFIED | 260 lines; stub replaced |
| `src/components/quality/CompletenessDrillDown.tsx` | Real drill-down | VERIFIED | 131 lines; stub replaced |
| `src/components/quality/CodingCoveragePanel.tsx` | Real coverage panel | VERIFIED | 323 lines; stub replaced |
| `src/components/quality/CodingDrillDown.tsx` | Real drill-down | VERIFIED | 222 lines; stub replaced |
| `src/components/quality/ValidationPanel.tsx` | Real validation panel | VERIFIED | 291 lines; stub replaced |
| `src/components/quality/ValidationIssueList.tsx` | Issue list | VERIFIED | 114 lines |
| `src/config/types.ts` | validation block | VERIFIED | `validatorUrl?` + `batchSize?` present (lines 21, 23) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/App.tsx` | `QualityLayout` | `<Route path="/quality" element={<QualityLayout />}>` | WIRED | App.tsx:66; nested routes at lines 67-69 |
| `QualityLayout` | `QualityMetricsContext` | `<QualityMetricsProvider>` wraps `<Outlet/>` | WIRED | QualityLayout.tsx:52, 61 |
| `QualityLayout` | `MedplumProvider` | `<MedplumProvider medplum={state.client}>` | WIRED | QualityLayout.tsx:51 |
| `QualityOverviewPage` | `useQualityMetrics` orchestrator | Destructures counts/summary/lastComputed/recompute | WIRED | QualityOverviewPage.tsx:47 |
| `QualityOverviewPage` | `OverviewStrip` + `ResourceCountsPanel` + 3 panels | Component usage | WIRED | QualityOverviewPage.tsx:22-26, 82, 93, 96, 99, 102 |
| `useQualityMetrics` | `useResourceCounts` | Imports + calls | WIRED | useQualityMetrics.ts:61, 91 |
| `useCompletenessReport` | `QualityMetricsContext.setCompleteness` | Rollup side-effect useEffect | WIRED | useCompletenessReport.ts:120-134; Math.round arithmetic mean |
| `useCodingCoverage` | `QualityMetricsContext.setCoverage` | Rollup side-effect useEffect | WIRED | useCodingCoverage.ts:122-138; Math.round arithmetic mean |
| `ValidationPanel` | `resolveBackends` + `useValidationRun` | Imports + usage | WIRED | ValidationPanel.tsx:56-57, 109, 117 |
| `SettingsPage` | `clearAllQualityMetrics` | Button handler | WIRED | SettingsPage.tsx:8, 42, 202 |
| `sampleResources` | `client.searchResources(_count)` | FHIR fetch | WIRED | sampling.ts:15 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| QualityOverviewPage | counts | `useResourceCounts(client, types)` → `client.search(type, { _summary: 'count' })` | Yes (Blaze count queries) | FLOWING |
| CompletenessPanel | reports | `useCompletenessReport` → `sampleResources(client, type, n)` → `client.searchResources()` | Yes (FHIR sample fetches through 4-way worker pool) | FLOWING |
| CodingCoveragePanel | reports | `useCodingCoverage` → `sampleResources` → `client.searchResources()` | Yes (same pattern as completeness) | FLOWING |
| ValidationPanel | issues/byResource | `useValidationRun` → `sampleResources` + `validateStructural` / `createRemoteBackend` | Yes (structural always-on; remote optional) | FLOWING |
| OverviewStrip cards 3-4 | overallCompleteness/overallCoverage | `QualityMetricsContext` (fed by useCompletenessReport/useCodingCoverage setter effects) | Yes (em-dash fallback when undefined; Math.round integer when settled) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite passes | `npx vitest run` | 274 passed, 22 todo, 0 failed, 33 files passed + 3 skipped | PASS |
| No lingering stubs in quality components | `grep "// STUB\|data-testid=\"stub-" src/components/quality/` | 0 matches | PASS |
| No TODO/FIXME markers in quality modules | `grep -i "TODO\|FIXME\|Coming in Plan" src/quality/ src/components/quality/` | 0 matches (only 1 comment describing empty-object placeholder behavior) | PASS |
| Route mounted correctly | `grep QualityLayout src/App.tsx` | Import + `<Route path="/quality">` + nested routes for completeness/coding drill-downs | PASS |
| All 7 MII profiles bundled | `ls src/quality/profiles/*.json` | 7 JSON files present | PASS |
| Connect server live-run end-to-end | Requires running Blaze + navigating UI | N/A | SKIP (human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| QUAL-01 | 05-02 | User can view a dashboard showing resource counts per type across the server | SATISFIED | QualityOverviewPage + OverviewStrip + ResourceCountsPanel with sortable Table, Progress bars; totals from useResourceCounts |
| QUAL-02 | 05-03 | User can view field completeness statistics per resource type | SATISFIED | CompletenessPanel (RingProgress per-type, sortable) + CompletenessDrillDown (per-path Progress rows); 7 bundled MII profiles |
| QUAL-03 | 05-04 | User can view coding coverage metrics (systemCode vs textOnly) | SATISFIED | CodingCoveragePanel (stacked 3-bucket Progress bars) + CodingDrillDown with CodeableConceptDisplay examples; Pitfall 5 Identifier exclusion |
| QUAL-04 | 05-05 | User can validate resources against MII profiles and see conformance issues | SATISFIED | ValidationPanel with structural backend (always-on) + remote backend (optional via validation.validatorUrl); ValidationIssueList with severity sort + /explorer/ links; JSON export |

All 4 requirements declared in plan frontmatter AND mapped to Phase 5 in REQUIREMENTS.md (lines 104-107). Zero orphaned requirements. REQUIREMENTS.md lines 45-48 and 104-107 both mark QUAL-01..04 as Complete.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/quality/codingCoverageWalker.ts | 55 | Comment mentions "placeholder" in behavioral description (empty-object CC placeholder) | Info | None — this is a comment describing the empty-object behavior rule, not a code stub |

No blockers. No warnings. One informational match that is a legitimate comment describing the Pitfall 5 empty-object classification behavior.

### Human Verification Required

The phase is code-complete and 274 automated tests pass. The following scenarios require a live Blaze server + UI interaction to verify visual appearance, UX feel, and real-data behavior.

### 1. End-to-end Counts dashboard against live Blaze

**Test:** Start the app (`npm run dev`), connect to a real Blaze FHIR server via Settings, then navigate to `/quality`.
**Expected:** OverviewStrip Card 1 (Total resources) shows the sum of per-type counts; Card 2 (Resource types) shows the count of types with > 0 resources; ResourceCountsPanel lists every CapabilityStatement-declared resource type with an inline Progress bar scaled to the largest count. "Show empty types" toggle reveals zero-count rows.
**Why human:** Visual verification of real data flow + Progress bar scaling + sortable column interaction that cannot be meaningfully verified in jsdom.

### 2. Completeness tab shows worst-first sorted MII analysis

**Test:** On connected `/quality`, click the Completeness tab. Observe the table. Click into a type to see the drill-down (e.g., `/quality/completeness/Condition`).
**Expected:** Panel shows disclosure banner "Completeness and coverage are estimated from a sample of the first {N} resources per type." Each row has a 48px RingProgress with integer percentage, `populated / total` counts, sample size, and the bundled MII profile name (or "Structural (min>=1)" fallback). Drill-down shows per-path Progress rows with `{pct}% ({count}/{sampleSize})` captions.
**Why human:** Visual (RingProgress rendering, layout), UX (drill-down navigation), and real-data verification (actual MII profile compliance on a real server).

### 3. Coding Coverage tab displays stacked 3-bucket bars

**Test:** Navigate to the Coding Coverage tab. Observe stacked Progress bars. Click through to a type drill-down (e.g., `/quality/coding/Condition`).
**Expected:** Legend shows blue/orange/red color swatches for system+code / text-only / empty. Each row has a stacked 3-segment Progress.Root bar. Drill-down shows example CodeableConcept rendered via `CodeableConceptDisplay` (with resolved display values if terminology server is configured).
**Why human:** Visual (stacked bar rendering, color legend), and verification that CodeableConceptDisplay renders with real resolved terminology.

### 4. Validation tab warning banner + batch run

**Test:** Navigate to the Validation tab with no validatorUrl configured. Observe the warning banner. Select "Condition", click "Validate sample". Watch progress; optionally click Cancel mid-run.
**Expected:** Dismissible orange warning banner: "This server does not implement $validate on resources. Phase 5 runs structural validation locally against bundled MII profiles. To run full FHIR validation, set validation.validatorUrl in settings.yaml..." Backend indicator shows `Structural` (blue) + `Remote (not configured)` (gray). On run: progress Paper with animated bar, live region. Issues appear severity-sorted with `/explorer/{type}/{id}` links. Cancel preserves partial results with yellow cancellation alert. "Export report (JSON)" downloads a timestamped file.
**Why human:** Verification of live behavior (progress animation, cancellation timing, download triggering), banner dismissal persistence across reloads, and clickable `/explorer/` links working in the real nav tree.

### 5. Remote validator respects T-05-05-02 safety boundary (optional)

**Test:** Add `validation.validatorUrl: https://validator.fhir.org/validator` to `settings.yaml`, restart app, navigate to Validation tab, click "Validate sample". Observe the Network tab in devtools.
**Expected:** Backend indicator flips to `Remote (configured)` (green). POST requests go to `validator.fhir.org`, NEVER to the Blaze base URL. Results show both structural and remote issues, deduplicated via `dedupeIssues`.
**Why human:** Security-critical behavior cannot be fully verified without a live validator; the automated regression test confirms URL construction, but end-to-end wire verification should be checked by a human.

### 6. Overview Strip Card 3/4 flip from em-dash to live percentages

**Test:** Load `/quality` against a connected server. Observe Cards 3 (Overall completeness) and 4 (Overall coding coverage).
**Expected:** Initially show em-dash `—`. As the completeness batch settles, Card 3 flips to an integer percentage (e.g., "72%"). As coverage batch settles, Card 4 flips (e.g., "84%"). Values are arithmetic means of per-type percentages across settled types with positive denominators.
**Why human:** Real-time state transition over network latency cannot be verified in unit tests beyond the mocked regression; needs a live batch to observe the transition feel.

### Gaps Summary

No gaps. All 4 success criteria are met end-to-end in code:

- All 30 expected artifacts (contracts, hooks, panels, drill-downs, profile registry, validators, tests) exist and are substantive.
- All key wiring links verified: App routes → QualityLayout (connection-gated) → Providers → Outlet → QualityOverviewPage → 5 panels; producers (useCompletenessReport, useCodingCoverage) feed OverviewStrip cards 3-4 via QualityMetricsContext; ValidationPanel composes dual-source backends via resolveBackends.
- 274/274 tests pass (0 failed; 22 todos are unrelated pre-existing scaffolds from other phases per Plan 05-05 verification notes).
- Zero stubs, zero TODOs, zero "Coming in Plan" placeholders remain in quality modules.
- All 4 requirements (QUAL-01..04) are plan-declared, phase-mapped, and implementation-evidenced.

The reason `status = human_needed` rather than `passed` is that several goal-level truths involve visual UX, real-data behavior, live-server progress/cancellation, and security-critical wire verification (T-05-05-02) that are fundamentally only verifiable with a human interacting with a connected Blaze server. The automated verification demonstrates the code is sound; only the live-run sign-off remains.

---

_Verified: 2026-04-12T12:12:00Z_
_Verifier: Claude (gsd-verifier)_
