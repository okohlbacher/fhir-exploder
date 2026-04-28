---
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
verified: 2026-04-25T09:18:00Z
status: passed
re_verified: 2026-04-28T14:04:57Z
re_verified_by: phase-38
score: 6/6 must-haves verified (programmatically); 1 success criterion requires live-Blaze human verification
overrides_applied: 0
human_verification:
  - test: "Live-Blaze UAT — open /explorer/Patient, /explorer/Condition, /explorer/Observation, /explorer/MedicationStatement, /explorer/Encounter, /explorer/Procedure"
    expected: "Date and Status columns populate with real values for each of the 6 verified resource types per UAT-FU-01 (ROADMAP Success Criterion #5)"
    why_human: "Requires running Blaze server with real FHIR data; programmatic tests cover extractor logic against typed fixtures but cannot exercise live Blaze responses"
  - test: "Open a Patient resource detail page; hover over identifier value cell"
    expected: "Mantine Tooltip appears showing the full system URL; system URL is NOT visible in the main row text (UAT-FU-02 D-06)"
    why_human: "Tooltip portal rendering + hover interaction requires real browser; jsdom tests use aria-describedby proxy assertions, not visible Tooltip content"
  - test: "Open a Patient resource with address.extension; trigger the deep-JSON fallback path"
    expected: "[View] button appears instead of inline JSON dump; click opens Modal with formatted JSON in Code block (UAT-FU-02 D-07)"
    why_human: "Modal Transition + Portal interaction requires real browser; jsdom tests use waitFor proxy assertions"
  - test: "Open a resource with resource-level extension[]; scroll to bottom of HumanReadableView"
    expected: "Bottom 'Extensions' section renders deduped table with one row per unique URL; [View] buttons open Modal with full extension JSON (UAT-FU-02 D-08)"
    why_human: "Visual layout, ScrollArea behaviour, and Modal interactions require real browser"
  - test: "Open /quality?tab=counts on a server with completeness/coverage/validation/references data"
    expected: "Per-type quality matrix card renders below counts table with 8 columns (Resource type | Complete % | Coverage % | Validation % | References % | Dup | Issues | chevron); sparse cells show em-dash; threshold breaches render red; clicking a row navigates to per-type drill-down (UAT-FU-05)"
    why_human: "Requires running Blaze server with completeness/coverage/validation/references producers having pushed real per-type data into the byType maps"
  - test: "On per-type quality matrix, click chevron on a row"
    expected: "Navigation only — does NOT auto-fire a validation or reference run; ValidationPanel/ReferencesPanel honor ?type=<resourceType> URL pre-selection but user still has to click 'Run' (PHI gate preserved per Pitfall P-08)"
    why_human: "Confirms PHI gate behaviour with real backend; programmatic test exists but a real PHI-sensitive deployment should observe no unexpected backend calls"
---

# Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix — Verification Report

**Phase Goal:** Close the four remaining Phase-30 UAT gaps (UAT-FU-01 Explorer Date/Status TDD, UAT-FU-02 HumanReadableView extension cleanup, UAT-FU-03 ResourceDetailPage mode cleanup, UAT-FU-05 per-type quality matrix card under Counts tab consuming Phase 32 per-metric contexts).
**Verified:** 2026-04-25T09:18:00Z
**Status:** human_needed (all programmatic gates pass; live-Blaze observational checks remain)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria + Plan Frontmatter Truths)

| #   | Truth (Roadmap Success Criterion)                                                                                                            | Status     | Evidence |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| SC1 | SearchResultsPage Date+Status columns populate for Patient/Condition/Observation/MedicationStatement/Encounter/Procedure via TDD baseline-drift commit pair | ✓ VERIFIED | `getResourceDateByType` + `getResourceStatusByType` exported (SearchResultsPage.tsx:108, :144) with all 6 cases + default fallback; render JSX calls `getResourceDateByType(r)` (line 494) and `getResourceStatusByType(r)` (line 498); commits `25ac79e` (RED) + `131bd7d` (GREEN) confirm baseline-drift pattern; 17 dateStatus.test.tsx assertions pass |
| SC2 | HumanReadableView + ResourcePropertyTable: identifier-system in Tooltip; address-extension in Modal viewer; bottom Extensions section with View buttons | ✓ VERIFIED | `Tooltip label={obj.system as string}` (ResourcePropertyTable.tsx:156); old dimmed `replace('urn:` line removed (grep returns 0 hits); `DeepJsonModal` (line 216) replaces JSON-dump fallback (line 204); HumanReadableView mounts `ExtensionsSection` (line 34) with dedup-by-url + per-row `[View]` Button (line 102) opening Modal with `closeButtonProps aria-label="Close"` (line 115) |
| SC3 | ResourceDetailPage 4→3 (effectively 3→2 per RESEARCH P-09) tabs: Clinical+Raw removed; Developer→JSON; ClinicalRawView.tsx deleted; grep-clean | ✓ VERIFIED | `grep -rn 'ClinicalRawView' src/ --include='*.ts' --include='*.tsx'` returns exit 1 (0 hits); `test ! -f ClinicalRawView.tsx` passes; ResourceDetailPage.tsx has exactly 2 `<Tabs.Tab>` elements (`human-readable` + `developer` labelled "JSON"); `case '3':` branch removed; `case '2':` remaps to `developer`; `<div onClick={handleReferenceClick}>` wrapper preserved at line 184 |
| SC4 | Per-type quality matrix card under /quality?tab=counts with 8 columns + inline horizontal fill bars + sortable + chevron drill-down + curried isBreached + Phase-32 context consumption | ✓ VERIFIED | `QualityByTypeMatrix.tsx` created (402 lines); 8 columns wired (Resource type | Complete % | Coverage % | Validation % | References % | Dup | Issues | chevron); `Progress size="xs"` per-cell (line 369); `SortableTh` columns (lines 208-256); curried `useThresholds().isBreached(metricKey, value)` (lines 338, 382); 5 per-metric hooks consumed (`useCompletenessRollup`/`useCoverageRollup`/`useValidationRollup`/`useReferencesRollup`/`useDuplicatesRollup`, lines 97-101); mounted at QualityOverviewPage.tsx:492 inside `Tabs.Panel value="counts"` |
| SC5 | All Phase-30 UAT gaps closed; **live-Blaze UAT confirms** Date/Status columns populated for 6 types | ? UNCERTAIN (programmatic) | UAT-FU-01/02/03/05 closed in code; UAT-FU-04 + UAT-FU-06 already closed in Phase 33 per ROADMAP. Live-Blaze observational confirmation is a human-verification item. |
| SC6 | `npm test` 836+ passing / 0 failing; `npm run build` clean; `grep -rn 'color: #' src/ --include='*.tsx'` returns 0 new hits | ✓ VERIFIED | `npx vitest run`: 1054 passed / 0 failed / 22 todo (115 files / 3 skipped); `npx tsc -b --noEmit`: exit 0; `npm run build`: exit 0 (only pre-existing chunk-size warning); design-token grep: 0 hits |

**Plan-Level must_haves truths (additional):**

| #     | Truth (Plan must_haves)                                                                                                | Status     | Evidence |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| 35-01 | `grep -rn 'ClinicalRawView' src/` returns 0 hits; reference click delegation preserved on remaining 2 panels             | ✓ VERIFIED | grep exit 1; wrapper line 184 preserved; reference-navigation.test.tsx still green (covered by full suite 1054 pass) |
| 35-02 | Patient (boolean→label), Condition (CodeableConcept walk), Encounter (period.start) — all 4 RESEARCH pitfalls mitigated | ✓ VERIFIED | SearchResultsPage.tsx:148 `if (p.active === false) return 'inactive'`; :149 `=== true → 'active'`; :154 `c.clinicalStatus?.coding?.[0]?.code ?? c.clinicalStatus?.text ?? ''`; :119 `(resource as Encounter).period?.start?.slice(0, 10)`; MedicationStatement uses FLAT `effectiveDateTime` |
| 35-03 | SKIP_KEYS extended with 'extension'; Tooltip wraps identifier value; DeepJsonModal replaces inline JSON dump            | ✓ VERIFIED | ResourcePropertyTable.tsx:18 `SKIP_KEYS = new Set(['resourceType', 'meta', 'text', 'extension'])`; line 156 Tooltip; line 204 returns DeepJsonModal; old `replace('urn:` not present |
| 35-04 | 5 per-metric contexts have byType slot; ValidationContext also has validationIssuesByType; Duplicates byType is derived  | ✓ VERIFIED | CompletenessContext.tsx:22 (slot) + :32 (useState) + :34 (memo); CoverageContext.tsx parallel; ReferencesContext.tsx parallel; ValidationContext.tsx:25 byType + :30 validationIssuesByType (Q-01) + :39 useState; DuplicatesContext.tsx:39 byType is derived getter (`byType: breakdown.hashByType` at :89) — NO new useState |
| 35-04 | Functional setter form on single-type producers (P-04 mitigation)                                                       | ✓ VERIFIED | ValidationPanel.tsx:255 `setByType((prev) => ({ ...prev, [resourceType]: pct }))`; :257 `setValidationIssuesByType((prev) => ({...}))`; ReferencesPanel.tsx imports `setReferencesByType` |
| 35-04 | useSearchParams('type') pre-selection in ValidationPanel + ReferencesPanel                                              | ✓ VERIFIED | ValidationPanel.tsx:49 import + :142 read; ReferencesPanel.tsx:10 import + :51 read |
| 35-04 | Sparse byType cells render em-dash, NEVER 0%; chevron click is navigation-only (PHI gate preserved)                     | ✓ VERIFIED | QualityByTypeMatrix.tsx:347 PercentTd em-dash branch; :384 IssuesCell em-dash branch; :160-175 handleRowClick uses `useNavigate(...)` only; no auto-fire of run.start |
| All   | npm test green; tsc clean; build clean                                                                                  | ✓ VERIFIED | 1054 pass / 0 fail; tsc exit 0; build exit 0 |

**Score:** 6/6 roadmap success criteria verified programmatically (SC5 partially programmatic; live-Blaze confirmation is a human item)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/components/explorer/ResourceDetailPage.tsx` | 2-tab Tabs UI (Human-readable + JSON); ClinicalRawView import deleted; '2' key remapped to developer | ✓ VERIFIED | Read full file (197 lines): line 9 imports HumanReadableView; line 10 imports DeveloperJsonView; NO ClinicalRawView import; lines 179-180 contain exactly 2 `<Tabs.Tab>` with values `human-readable` and `developer` (label "JSON"); switch cases `'1'` → human-readable, `'2'` → developer (lines 81-87); no `case '3'`; click delegation wrapper preserved at line 184 |
| `src/components/explorer/ClinicalRawView.tsx` | DELETED | ✓ VERIFIED | `test ! -f` returns "DELETED"; grep returns 0 hits |
| `src/components/explorer/SearchResultsPage.tsx` | exports `getResourceDateByType` + `getResourceStatusByType` covering 6 types + default fallback | ✓ VERIFIED | line 108 `export function getResourceDateByType` switches on 6 types + default; line 144 `export function getResourceStatusByType` switches on Patient (boolean→label), Condition (CodeableConcept walk), 4 enum-status types, default `''`; render JSX wired at lines 494, 498 |
| `src/components/explorer/HumanReadableView.tsx` | mounts `<ExtensionsSection>` after `<ResourcePropertyTable>` inside `<ScrollArea>` | ✓ VERIFIED | 142 lines; line 33 mounts ResourcePropertyTable; line 34 mounts ExtensionsSection; section silently hides when no extensions (line 65); dedupes by URL first-occurrence-wins (lines 67-74); URL trim heuristic `slice(-2).join('/')` (line 78); per-row `[View]` Button (line 102); Modal with closeButtonProps `aria-label="Close"` (line 115) |
| `src/components/explorer/ResourcePropertyTable.tsx` | SKIP_KEYS extended with 'extension'; identifier system rendered via `<Tooltip>`; depth-fallback uses `<DeepJsonModal>` | ✓ VERIFIED | 281 lines; line 18 `SKIP_KEYS` includes `'extension'`; line 156 `Tooltip label={obj.system as string}`; old `replace('urn:` removed (0 grep hits); line 204 `return <DeepJsonModal value={obj} title="JSON" />`; DeepJsonModal helper at line 216 |
| `src/components/quality/QualityByTypeMatrix.tsx` | NEW — 8-column sortable matrix card consuming 5 byType maps + validationIssuesByType + useResourceCounts | ✓ VERIFIED | 402 lines; 5 per-metric hook calls (lines 97-101); 8 columns rendered (lines 207-258); curried `useThresholds().isBreached` (lines 338, 382); sparse cells em-dash (lines 347, 384); navigation-only chevron (lines 160-175); first-non-empty heuristic with /explorer/<type> fallback (lines 166-172); card hidden when no rows (line 178) |
| `src/quality/metrics/CompletenessContext.tsx` | byType slot + setByType setter | ✓ VERIFIED | line 22 `byType: Record<string, number>`; line 25 `setByType: Dispatch<SetStateAction<...>>`; line 32 useState; memo deps `[value, byType]` line 36; outside-provider fallback line 44 |
| `src/quality/metrics/CoverageContext.tsx` | byType + setByType | ✓ VERIFIED | parallels Completeness (lines 20, 23, 30, 33, 41) |
| `src/quality/metrics/ValidationContext.tsx` | byType + setByType + validationIssuesByType + setValidationIssuesByType | ✓ VERIFIED | line 25 byType; line 28 setByType; line 30 validationIssuesByType (Q-01 NEW); line 33 setValidationIssuesByType; lines 39-40 useState calls; line 42 memo |
| `src/quality/metrics/ReferencesContext.tsx` | byType + setByType | ✓ VERIFIED | parallels Completeness (lines 19, 22, 29, 31, 40) |
| `src/quality/metrics/DuplicatesContext.tsx` | byType derived getter (no new state) | ✓ VERIFIED | line 39 byType in interface; line 89 `byType: breakdown.hashByType` (passthrough, identity-stable); no new useState (line 61 only existing breakdown state); fallback line 103 returns `EMPTY_DUPLICATES_BREAKDOWN.hashByType` |
| `src/components/quality/QualityOverviewPage.tsx` | Mounts QualityByTypeMatrix in Tabs.Panel value="counts" inside Stack | ✓ VERIFIED | line 48 imports QualityByTypeMatrix; line 492 renders inside Stack within Tabs.Panel value="counts" (sibling to ResourceCountsPanel) |
| `src/hooks/useCompletenessReport.ts` | populates byType via setCompletenessByType | ✓ VERIFIED | line 45 destructures `setByType: setCompletenessByType`; lines 50-57 builds Record + calls setter; line 62 deps include setter |
| `src/hooks/useCodingCoverage.ts` | populates byType via setCoverageByType | ✓ VERIFIED | line 43 destructures setter; lines 48-57 builds Record + calls setter; line 63 deps |
| `src/components/quality/ValidationPanel.tsx` | useSearchParams pre-selection + functional setByType + setValidationIssuesByType | ✓ VERIFIED | line 49 imports useSearchParams; line 142 reads searchParams; lines 246-247 destructures both setters; lines 255-257 functional updates; lines 267-268 deps |
| `src/components/quality/ReferencesPanel.tsx` | useSearchParams + functional setByType | ✓ VERIFIED | line 10 imports useSearchParams; line 51 reads; line 82 destructures setter |
| `src/__tests__/SearchResultsPage.dateStatus.test.tsx` | 17 unit tests covering 6 Date + 8 Status + 3 edge cases | ✓ VERIFIED | file exists; targeted test run: 17 passed |
| `src/__tests__/HumanReadableView.extensions.test.tsx` | 6 tests for bottom Extensions section | ✓ VERIFIED | file exists; targeted run: 6 passed |
| `src/__tests__/ResourcePropertyTable.test.tsx` | 4 tests across Tooltip / SKIP_KEYS / Modal trigger | ✓ VERIFIED | file exists; targeted run: 4 passed |
| `src/__tests__/QualityByTypeMatrix.test.tsx` | 11 tests covering rows / em-dash / threshold breach / chevron / sort | ✓ VERIFIED | file exists; targeted run: 11 passed |
| `src/quality/metrics/__tests__/byType.test.tsx` | 17 contract tests across all 5 affected contexts + Duplicates derived getter + reference-stable setter | ✓ VERIFIED | file exists; targeted run: 17 passed |
| `src/__tests__/resource-detail.test.tsx` | new `Tabs cleanup (UAT-FU-03)` describe block (5 tests) | ✓ VERIFIED | targeted run with `-t 'Tabs cleanup'`: 5 passed |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| ResourceDetailPage.tsx | HumanReadableView.tsx | import + Tabs.Panel value='human-readable' | ✓ WIRED | line 9 import; line 186 `<HumanReadableView resource={resource} />` |
| ResourceDetailPage.tsx | DeveloperJsonView.tsx | import + Tabs.Panel value='developer' | ✓ WIRED | line 10 import; line 190 `<DeveloperJsonView resource={resource} />` |
| `<div onClick={handleReferenceClick}>` | remaining 2 Tabs.Panel children | preserved click delegation wrapper | ✓ WIRED | line 184 wrapper unchanged |
| SearchResultsPage render JSX | getResourceDateByType / getResourceStatusByType | function calls | ✓ WIRED | line 494 `{getResourceDateByType(r)}`; line 498 `getResourceStatusByType(r)` |
| Extractor functions | @medplum/fhirtypes | type imports | ✓ WIRED | extended import at top of SearchResultsPage.tsx |
| HumanReadableView | ExtensionsSection (co-located) | JSX child after ResourcePropertyTable | ✓ WIRED | line 34 `<ExtensionsSection resource={display} />` |
| ResourcePropertyTable identifier branch | Mantine Tooltip | Wraps value Code in Tooltip | ✓ WIRED | line 156 `<Tooltip label={obj.system as string} withArrow position="top">` |
| Bottom Extensions [View] Button onClick | Mantine Modal opened state | useState<string \| null>(null) + setOpenUrl | ✓ WIRED | line 63 useState; line 102 onClick→setOpenUrl; line 111 Modal opened={openUrl !== null} |
| QualityByTypeMatrix | 5 per-metric rollup hooks | hook calls | ✓ WIRED | lines 97-101 |
| QualityByTypeMatrix | useResourceCounts (via prop) | counts prop drives row inclusion + skeleton loading | ✓ WIRED | lines 110-114 includedTypes filter; lines 268-274 loading branch |
| QualityByTypeMatrix | useThresholds().isBreached(metricKey, value) | curried hook form per D-18 | ✓ WIRED | line 338 PercentTd; line 382 IssuesCell |
| QualityByTypeMatrix row click | useNavigate('/quality?tab=<metric>&type=<type>') OR /explorer/<type> | first-non-empty heuristic | ✓ WIRED | lines 102, 160-175 |
| QualityOverviewPage Tabs.Panel value='counts' | `<QualityByTypeMatrix />` rendered as sibling Card BELOW `<ResourceCountsPanel />` | added inside Tabs.Panel value='counts' | ✓ WIRED | line 492 inside Stack inside Tabs.Panel |
| ValidationPanel + ReferencesPanel | useSearchParams('type') | URL-driven pre-selection on mount | ✓ WIRED | ValidationPanel.tsx:142; ReferencesPanel.tsx:51 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| QualityByTypeMatrix | `completeness.byType[type]` | useCompletenessReport.ts pushes via setCompletenessByType (lines 50-57) populated from `reports` prop | ✓ Yes (already-mapped producer migration) | ✓ FLOWING |
| QualityByTypeMatrix | `coverage.byType[type]` | useCodingCoverage.ts pushes via setCoverageByType (lines 48-57) | ✓ Yes | ✓ FLOWING |
| QualityByTypeMatrix | `validation.byType[type]` + `validationIssuesByType[type]` | ValidationPanel.tsx:255-258 functional setters on run.complete | ✓ Yes (single-type producer; sparse on first load — sparse cells render em-dash, expected) | ✓ FLOWING |
| QualityByTypeMatrix | `references.byType[type]` | ReferencesPanel.tsx:82 single-type producer (similar pattern) | ✓ Yes | ✓ FLOWING |
| QualityByTypeMatrix | `duplicates.byType[type]` | DuplicatesContext.tsx:89 derived from existing breakdown.hashByType (DuplicatesPanel.contribute is sole producer) | ✓ Yes (passthrough of existing data) | ✓ FLOWING |
| HumanReadableView ExtensionsSection | `extensions` (Resource.extension[]) | Real FHIR resource passed via `resource` prop from ResourceDetailPage | ✓ Yes | ✓ FLOWING |
| SearchResultsPage Date/Status columns | `r` per-row Resource | Real FHIR search results from MedplumClient | ✓ Yes (extractor switches on real resourceType) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full test suite green | `npx vitest run` | 1054 passed / 0 failed / 22 todo (115 files / 3 skipped) | ✓ PASS |
| TypeScript strict-mode clean | `npx tsc -b --noEmit` | exit 0 | ✓ PASS |
| Production build clean | `npm run build` | built in 393ms; only pre-existing chunk-size warning | ✓ PASS |
| ClinicalRawView grep-clean | `grep -rn 'ClinicalRawView' src/ --include='*.ts' --include='*.tsx'` | exit 1 (0 hits) | ✓ PASS |
| Design-token grep | `grep -rn 'color: #' src/ --include='*.tsx'` | 0 hits | ✓ PASS |
| Plan-specific tests | `npx vitest run` on 5 new test files | 55 passed / 0 failed | ✓ PASS |
| UAT-FU-03 Tabs cleanup tests | `npx vitest run resource-detail.test.tsx -t 'Tabs cleanup'` | 5 passed | ✓ PASS |
| ClinicalRawView.tsx deleted | `test -f src/components/explorer/ClinicalRawView.tsx` | DELETED (file does not exist) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| UAT-FU-01 | 35-02-PLAN.md | Explorer Date/Status per-resource-type extractor with TDD baseline-drift commit pair | ✓ SATISFIED | SearchResultsPage.tsx exports `getResourceDateByType` + `getResourceStatusByType`; commits `25ac79e` (RED) + `131bd7d` (GREEN); 17 dateStatus tests pass; all 4 RESEARCH pitfalls (P-01/P-02/P-03 + FLAT effectiveDateTime) mitigated |
| UAT-FU-02 | 35-03-PLAN.md | HumanReadableView extension cleanup: identifier in Tooltip; address-extension Modal; bottom Extensions section | ✓ SATISFIED | ResourcePropertyTable.tsx Tooltip + DeepJsonModal + SKIP_KEYS extension; HumanReadableView.tsx ExtensionsSection co-located with dedup + per-row View Modal; 10 tests pass (6 + 4); commits `9af42ee` + `ef45850` + `21f2e25` |
| UAT-FU-03 | 35-01-PLAN.md | ResourceDetailPage mode cleanup: drop Clinical+Raw; rename Developer→JSON; delete ClinicalRawView.tsx | ✓ SATISFIED | grep returns 0 hits; ClinicalRawView.tsx deleted; 2 tabs render; keyboard remapped; click-delegation wrapper preserved; commits `1070c15` + `8c6c03e` |
| UAT-FU-05 | 35-04-PLAN.md | Per-type quality matrix card under Counts tab consuming Phase 32 per-metric contexts | ✓ SATISFIED | QualityByTypeMatrix.tsx (402 lines) created and mounted at QualityOverviewPage.tsx:492; 5 contexts extended with byType (4 new useState + 1 derived); 4 producer migrations live; useSearchParams pre-selection in ValidationPanel + ReferencesPanel; 28 new tests; commits `9c4b80c` + `299acf4` + `6680450` + `35814aa` |

**Note on UAT-FU-04 + UAT-FU-06:** REQUIREMENTS.md confirms these were closed in Phase 33 (subsumed by MII-EXT-06 + MII-EXT-07 respectively); they are explicitly out of scope for Phase 35 and not expected in any 35-XX-PLAN.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | — | — | No blocker, warning, or info-level anti-patterns found in modified files. Two intentional `as unknown as Record<string, unknown>` double-casts (HumanReadableView.tsx:60; byType.test.tsx) are explicitly the project's sanctioned TS2352 escape hatch per CLAUDE.md and not stub markers. The full suite confirms no test stubs are present. |

### Human Verification Required

See `human_verification` block in frontmatter. Six items require live-Blaze observational confirmation (Date/Status column population on real data; Tooltip hover behaviour in real browser; Modal Transition behaviour; bottom Extensions section visual layout; matrix card behaviour with real data; PHI gate behaviour on chevron click).

### Gaps Summary

No programmatic gaps found. All artifacts exist, are substantive, are wired, and have flowing data. All key links verified. All requirements satisfied per code evidence. All gates green (1054 tests passing / 0 failing; tsc clean; build clean; design-token grep clean; ClinicalRawView grep clean).

The only remaining items are observational live-Blaze verifications listed in the `human_verification` section — these are inherent to UI work that touches real browser interactions (hover, transition, portal rendering) and live FHIR data (per-type extractors against actual server responses, byType maps populated by real producer runs). Programmatic tests cover the contracts; live-Blaze testing closes the visual / behavioural feedback loop on the deployment.

---

_Verified: 2026-04-25T09:18:00Z_
_Verifier: Claude (gsd-verifier)_

## Re-verification (Phase 38, a2ef59f)

Phase 38 walked the 6 live-Blaze HUMAN-UAT items in a single browser session against
`http://localhost:8080/fhir` (Synthea fingerprint pinned in `38-SESSION.md`).

| # | Test | Outcome | Rationale |
|---|------|---------|-----------|
| 1 | Date/Status real-data population (6 types) | pass | All 5 non-empty types render real Date+Status; empty cells render as empty strings; MedicationStatement empty-state clean (count=0, accepted data-coverage gap) |
| 2 | Identifier-system Tooltip hover behavior | pass | Mantine Tooltip portal shows system URL; cursor=help; URL not duplicated in main row text |
| 3 | Modal transition + 3 close paths | pass | X button (`aria-label="Close"`), backdrop click, and Escape key — all 3 close paths verified |
| 4 | Bottom Extensions section dedup | fail-overridden | Dedup/hiding/[View]-open all correct; value summary blank for nested-extension shapes (us-core-race/ethnicity) — accepted as cosmetic, no fix in v1.5; full JSON reachable via [View] |
| 5 | Per-type quality matrix populated | pass | em-dash invariant held (no literal `0%`); 4 cells populated after panel runs; threshold colors + sortable headers verified |
| 6 | PHI gate behavior on chevron click | pass | URL pre-select via `useSearchParams`; zero outbound fetches to validator before PHI ack click; Phase 7 P-08 invariant intact |

**Walk plan:** `.planning/phases/38-v1.5-human-uat-live-blaze-smoke-tests/38-02-PLAN.md`
**Recorded results:** `.planning/phases/35-phase-30-uat-follow-ups-per-type-quality-matrix/35-HUMAN-UAT.md`
**Closure summary:** `.planning/phases/38-v1.5-human-uat-live-blaze-smoke-tests/38-SUMMARY.md`
