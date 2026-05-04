# Milestones

## v1.7 Resource Navigation (Shipped: 2026-05-04)

**Phases completed:** 6 phases (46-51), 14 plans, 124 commits
**Files changed:** 327 files, +27,852/−432 LOC since v1.6
**Tests:** 1240 → 1412 passing; `npm run build` clean
**Requirements:** 12/13 satisfied; 1 deferred-acceptable (STACK-01)

**Key accomplishments:**

- **`summarizeResource` foundation (Phase 46)** — Pure-function `summarizeResource(r) → { primary, secondary? }` registry over 8 typed R4 resource types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance) + generic 7-step walker; 52 vitest cases; bundle SHRANK −22.59 KB gz by replacing 3 inline copies across SearchResultsPage, FhirResourcesView, MiiModuleTab. NAV-01, NAV-02.
- **HumanReadableView self-sufficient (Phase 47)** — References auto-resolve via lazy fetch + per-session `Map<type/id, Resource|null>` cache; `ExtensionChip` surfaces property-level extensions inline; `ContainedResourcesAccordion` renders `Resource.contained[]` in-place. READ-01, READ-02, READ-03.
- **Incoming references panel (Phase 48)** — Curated `reverseReferenceCatalog.ts` (9 source-type keys); `IncomingReferencesPanel` at the bottom of every non-Patient resource detail; `PatientRelatedResources` (107 LOC) generalized into shared `RelatedResourcesPanel` (28 LOC delegate); byte-identical Patient UAT snapshot proven. REVR-01, REVR-02, REVR-03.
- **G1 reference graph (Phase 49)** — Lazy `/explorer/:type/:id/graph` route powered by React Flow 12 (`@xyflow/react@12.10.2`) + `@dagrejs/dagre@3.0.0`; depth 1–3; click-to-navigate; Mantine CSS-variable theme bridge (zero-remount on light↔dark switch); bundle main delta −4.88 KB gz (lazy chunk 71.2 KB gz). GRPH-01, GRPH-02, GRPH-03, GRPH-04.
- **STACK-01 second WAIVE-AND-DEFER (Phase 50)** — Peer-dep gate MIXED: React 19 newly open (`^18.0.0 || ^19.0.0`) but Mantine 9 still pinned `^8.0.0` by `@medplum/react@5.1.10`; user decision D-02 keeps React/Mantine coupled; deferred to v1.8 with documented re-attempt trigger. STACK-01.
- **Phase 51 gap closure** — All timeline surfaces (PatientTimeline, ClinicalTimeline) now consume `summarizeResource(r).primary` exclusively; `extractSummary` symbol physically removed; `ResourceGraphNode` preserves patient context via `useParams` + `FHIR_ID_PATTERN` validation; 22 test stubs implemented; deuteranopia palette pair #13 fixed (administration shade-6 `#3b5bdb` → `#4c68dc`, ΔE2000 1.406 → 5.405). NAV-02, GRPH-03.

---

## v1.6 Hardening, UX Polish & Carry-Overs (Shipped: 2026-04-30)

**Phases completed:** 20 phases, 48 plans, 78 tasks

**Key accomplishments:**

- Delivered the cohort-domain pure module (types, storage keys, parsePatientRefs, findActiveCohort) plus all 7 Wave 0 test files with skip-stubs locking VALIDATION.md -t filters for Plans 21-02..05 to un-skip.
- 1. [Rule 3 — Blocking] Strict TS on test fixtures
- Helper
- Component shape:
- Status:
- FHIRPath AST-to-FHIR-search-URL translator and cohortResolver fhirpath branch — both foundations for CHRT-05 programmatic cohort definitions ship with full test coverage and a 10K-ID cap, ready for the Plan 22-03 UI layer.
- MII FDPG Codex Structured Query v3 codec (cohortToFdpgSq / fdpgSqToCohort) with 1 MB cap and prototype-pollution defence, plus useCohorts.updateCohort/deleteCohort/duplicateCohort extensions satisfying D-10 cache-invalidation.
- Wave 2 UI for CHRT-05 (FHIRPath Validate flow with 10s AbortController dry-run), CHRT-06 (FDPG Import/Export via FileButton + per-row Menu), and CHRT-07 (Edit/Duplicate/Delete modals) — wires the Wave 1 translator and codec into Mantine 8 chrome, with all 11 UI-SPEC toast strings locked verbatim.
- One-liner:
- One-liner:
- proceed
- One-liner:
- Unit-level fix for the T-6.3 A UAT failure: scoped FHIR counts plumbed through useResourceCounts + autoStart:true added to 4 stale report hooks so cohort activation actually changes the quality dashboard.
- Milestone audit:
- Pure `asyncRunReducer` + React `useAsyncRun<TIssue>` hook with closure-scoped cancellation, ref-of-handles for cross-run cancel, and `autoStart` opt-in — 17/17 new tests green, zero `as` casts, zero `cancelledRef` variables.
- Module-scope `Map<\`${serverUrl}::${type}\`, number>` read-through cache in `useResourceCounts` with closure-scoped `let cancelled` replacing `cancelledRef` and memoized `typesKey` absorbing the Phase 27 R12 effect-dep bug — all in one file touch.
- Per-serverUrl `Map<serverUrl, QualityMetricsCache>` registry with 2-entry LRU + MRU touch replaces the rotating singleton in `useCompletenessReport` / `useCodingCoverage`; `SettingsContext.setSettings` and the Settings "Clear metrics cache" button now invalidate BOTH the metrics registry AND the count cache under a single user action.
- All 4 async report hooks (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) now wrap `useAsyncRun<NormalizedIssue>` from Plan 24-01 — 635 → 340 LOC across the four files (-46%), zero `cancelledRef` variables remain, zero new `as` casts in the 6 quality consumer panels, all 4 existing panel test suites pass UNCHANGED, full vitest suite shows the same 22 pre-existing failures (no regressions).
- PerTypeCoverageReport gains a deterministic representative CodeableConcept per aggregation path, populated in the walker's existing single pass, eliminating the `useExamplesByPath` double-fetch and halving coding drill-down server calls.
- Generic N-run worker-pool hook (sibling to useAsyncRun) extracted from useCompletenessReport and useCodingCoverage; two shared UI primitives (SortableTh, RunProgress) collapse duplicated inline definitions from 11 Quality-module files.
- Unified drill-down chrome extracted to `<DrillDownShell>`; 5 simple drill-downs collapse to a single invocation each and 2 asymmetric drill-downs (Coding, Completeness) PARTIAL-migrate via the shell-chrome + bespoke-body-sibling composition pattern, producing 164 LOC of gross reduction in this plan and a 287 LOC cumulative reduction versus RESEARCH.md's pre-25-02 baseline.
- Cold-opening `/quality?tab=counts` no longer fires Completeness or Coding Coverage sampling -- the two Tabs.Panel entries drop `keepMounted` and the parent `<Tabs>` flips to `keepMounted={false}` so the Mantine OR-combine semantics let each panel's own prop decide. A new `vi.spyOn(SamplingModule, 'sampleResources')` regression test codifies the behavior with `.not.toHaveBeenCalled()` on cold Counts-tab mount. Closes Phase 25 with all 6 QDDEP requirements delivered.
- Triplicated "Not connected" alert block extracted into a render-prop `<ConnectionGatedOutlet>` primitive with a children-slot escape hatch; three layouts migrated, regression-fenced by two new test files (11 tests).
- Extracted wildcard identifier search into shared helper (5000/20 defaults to preserve call-site behavior), migrated 3 CompletenessRow links to Anchor+Link, and useCallback-wrapped setSettings to drop the exhaustive-deps eslint-disable — 3 atomic commits, zero test regressions, zero new lint warnings.
- Sidebar nested-route activation migrated from exact-match to useMatch with per-row exact flag and most-specific-wins Quality/Cohorts rule — /patients/123, /explorer/Patient/1, /quality/plausibility/Observation now highlight their section roots; /quality/cohorts highlights ONLY Cohorts.
- 1. [Rule 1 — Test design] Test B Text-node identity signal does not flip RED → GREEN
- 1. [Rule 3 — Blocking issue] lazy-routes test harness initially included full AppLayout, which dragged in Sidebar's context dependencies
- One-liner:
- 1. [Rule 4 - Architectural assumption mismatch] DrillDownShell ref type — already correct, no edit applied
- Source (15)
- Three retroactive v1.5 VALIDATION.md files written — Phase 31 cites the 33-test cascade surface (phiGate/normalizers/cascadingValidator + ValidationPanel.phi-gate.integration); Phase 33 cites the ~66 net new tests across mii-modules + MiiModuleTab + ClinicalTimeline (836 → 902); Phase 38 declares observational posture with `phase_character: human_uat_observational` and enumerates the 12 walked HUMAN-UAT tests as its validation contract. All three flip `nyquist_compliant: true` based on retroactive review of existing test inventory; none fabricate compliance.
- Closed AUDIT-01 + 4/5 NYQ-01 nyquist flips by retroactively writing 38.1-VERIFICATION.md (status passed, 6/6) and flipping `nyquist_compliant: false → true` on Phases 32/34/35/36; Phase 37 kept `false` with `pending: DEUT-01 in Phase 40` annotation per CONTEXT D-05.
- One-liner:
- Pure-JS Machado 2009 deuteranopia simulation + CIEDE2000 perceptual-distance gate covering all 21 MII module adjacent pairs in Vitest; surfaced one empirical regression (pair #6 kardiologie ↔ mikrobiologie ΔE2000 = 1.406 < 5.0) that paper analysis had missed.
- `useMiiExtensionCounts(patientId)` React hook fans out one `_summary=count` GET per (extension module, FHIR type) pair on patient mount, sums per-type totals into per-module counts (D-02), and feeds the Phase-34 `EmptyExtensionsCoordinator` so the "Hide N empty modules" toggle is accurate on mount instead of accumulating after each extension tab is clicked (D-05).
- `MiiModuleTabs.tsx` now consumes `useMiiExtensionCounts(patientId)` from inside `MiiModuleTabsInner` so extension tabs render `{germanLabel} (N)` on patient mount, dim 0-count pills via outer-div `opacity: 0.55` (preserving Mantine 8's active-pill indicator per Pitfall #5), and feed the Phase-34 `EmptyExtensionsCoordinator` with accurate emptiness counts WITHOUT requiring any tab click. Live-Blaze UAT scaffold authored for ROADMAP §42 SC #4.
- One-liner:
- One-liner:
- hl7.fhir.uv.ips@2.0.0 (CC0-1.0) bundled as 32 trimmed StructureDefinitions with URL-keyed lazy-load IPS_REGISTRY, getIpsProfileForUrl helper, LICENSE attribution, and Wave 0 stubs ready for Plan 44-02 walker.
- Pure-function IPS bundle walker + IPSPanel UI (paste tab + server picker + Validate button) reachable at `/quality/ips`, surfacing missing-required-section, empty-entry, and unresolvable-reference findings via the unmodified Phase 15 ResourceIssueTable.

---

## v1.6 Hardening, UX Polish & Carry-Overs (Shipped: 2026-04-30)

**Phases completed:** 20 phases, 48 plans, 78 tasks

**Key accomplishments:**

- Delivered the cohort-domain pure module (types, storage keys, parsePatientRefs, findActiveCohort) plus all 7 Wave 0 test files with skip-stubs locking VALIDATION.md -t filters for Plans 21-02..05 to un-skip.
- 1. [Rule 3 — Blocking] Strict TS on test fixtures
- Helper
- Component shape:
- Status:
- FHIRPath AST-to-FHIR-search-URL translator and cohortResolver fhirpath branch — both foundations for CHRT-05 programmatic cohort definitions ship with full test coverage and a 10K-ID cap, ready for the Plan 22-03 UI layer.
- MII FDPG Codex Structured Query v3 codec (cohortToFdpgSq / fdpgSqToCohort) with 1 MB cap and prototype-pollution defence, plus useCohorts.updateCohort/deleteCohort/duplicateCohort extensions satisfying D-10 cache-invalidation.
- Wave 2 UI for CHRT-05 (FHIRPath Validate flow with 10s AbortController dry-run), CHRT-06 (FDPG Import/Export via FileButton + per-row Menu), and CHRT-07 (Edit/Duplicate/Delete modals) — wires the Wave 1 translator and codec into Mantine 8 chrome, with all 11 UI-SPEC toast strings locked verbatim.
- One-liner:
- One-liner:
- proceed
- One-liner:
- Unit-level fix for the T-6.3 A UAT failure: scoped FHIR counts plumbed through useResourceCounts + autoStart:true added to 4 stale report hooks so cohort activation actually changes the quality dashboard.
- Milestone audit:
- Pure `asyncRunReducer` + React `useAsyncRun<TIssue>` hook with closure-scoped cancellation, ref-of-handles for cross-run cancel, and `autoStart` opt-in — 17/17 new tests green, zero `as` casts, zero `cancelledRef` variables.
- Module-scope `Map<\`${serverUrl}::${type}\`, number>` read-through cache in `useResourceCounts` with closure-scoped `let cancelled` replacing `cancelledRef` and memoized `typesKey` absorbing the Phase 27 R12 effect-dep bug — all in one file touch.
- Per-serverUrl `Map<serverUrl, QualityMetricsCache>` registry with 2-entry LRU + MRU touch replaces the rotating singleton in `useCompletenessReport` / `useCodingCoverage`; `SettingsContext.setSettings` and the Settings "Clear metrics cache" button now invalidate BOTH the metrics registry AND the count cache under a single user action.
- All 4 async report hooks (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) now wrap `useAsyncRun<NormalizedIssue>` from Plan 24-01 — 635 → 340 LOC across the four files (-46%), zero `cancelledRef` variables remain, zero new `as` casts in the 6 quality consumer panels, all 4 existing panel test suites pass UNCHANGED, full vitest suite shows the same 22 pre-existing failures (no regressions).
- PerTypeCoverageReport gains a deterministic representative CodeableConcept per aggregation path, populated in the walker's existing single pass, eliminating the `useExamplesByPath` double-fetch and halving coding drill-down server calls.
- Generic N-run worker-pool hook (sibling to useAsyncRun) extracted from useCompletenessReport and useCodingCoverage; two shared UI primitives (SortableTh, RunProgress) collapse duplicated inline definitions from 11 Quality-module files.
- Unified drill-down chrome extracted to `<DrillDownShell>`; 5 simple drill-downs collapse to a single invocation each and 2 asymmetric drill-downs (Coding, Completeness) PARTIAL-migrate via the shell-chrome + bespoke-body-sibling composition pattern, producing 164 LOC of gross reduction in this plan and a 287 LOC cumulative reduction versus RESEARCH.md's pre-25-02 baseline.
- Cold-opening `/quality?tab=counts` no longer fires Completeness or Coding Coverage sampling -- the two Tabs.Panel entries drop `keepMounted` and the parent `<Tabs>` flips to `keepMounted={false}` so the Mantine OR-combine semantics let each panel's own prop decide. A new `vi.spyOn(SamplingModule, 'sampleResources')` regression test codifies the behavior with `.not.toHaveBeenCalled()` on cold Counts-tab mount. Closes Phase 25 with all 6 QDDEP requirements delivered.
- Triplicated "Not connected" alert block extracted into a render-prop `<ConnectionGatedOutlet>` primitive with a children-slot escape hatch; three layouts migrated, regression-fenced by two new test files (11 tests).
- Extracted wildcard identifier search into shared helper (5000/20 defaults to preserve call-site behavior), migrated 3 CompletenessRow links to Anchor+Link, and useCallback-wrapped setSettings to drop the exhaustive-deps eslint-disable — 3 atomic commits, zero test regressions, zero new lint warnings.
- Sidebar nested-route activation migrated from exact-match to useMatch with per-row exact flag and most-specific-wins Quality/Cohorts rule — /patients/123, /explorer/Patient/1, /quality/plausibility/Observation now highlight their section roots; /quality/cohorts highlights ONLY Cohorts.
- 1. [Rule 1 — Test design] Test B Text-node identity signal does not flip RED → GREEN
- 1. [Rule 3 — Blocking issue] lazy-routes test harness initially included full AppLayout, which dragged in Sidebar's context dependencies
- One-liner:
- 1. [Rule 4 - Architectural assumption mismatch] DrillDownShell ref type — already correct, no edit applied
- Source (15)
- Three retroactive v1.5 VALIDATION.md files written — Phase 31 cites the 33-test cascade surface (phiGate/normalizers/cascadingValidator + ValidationPanel.phi-gate.integration); Phase 33 cites the ~66 net new tests across mii-modules + MiiModuleTab + ClinicalTimeline (836 → 902); Phase 38 declares observational posture with `phase_character: human_uat_observational` and enumerates the 12 walked HUMAN-UAT tests as its validation contract. All three flip `nyquist_compliant: true` based on retroactive review of existing test inventory; none fabricate compliance.
- Closed AUDIT-01 + 4/5 NYQ-01 nyquist flips by retroactively writing 38.1-VERIFICATION.md (status passed, 6/6) and flipping `nyquist_compliant: false → true` on Phases 32/34/35/36; Phase 37 kept `false` with `pending: DEUT-01 in Phase 40` annotation per CONTEXT D-05.
- One-liner:
- Pure-JS Machado 2009 deuteranopia simulation + CIEDE2000 perceptual-distance gate covering all 21 MII module adjacent pairs in Vitest; surfaced one empirical regression (pair #6 kardiologie ↔ mikrobiologie ΔE2000 = 1.406 < 5.0) that paper analysis had missed.
- `useMiiExtensionCounts(patientId)` React hook fans out one `_summary=count` GET per (extension module, FHIR type) pair on patient mount, sums per-type totals into per-module counts (D-02), and feeds the Phase-34 `EmptyExtensionsCoordinator` so the "Hide N empty modules" toggle is accurate on mount instead of accumulating after each extension tab is clicked (D-05).
- `MiiModuleTabs.tsx` now consumes `useMiiExtensionCounts(patientId)` from inside `MiiModuleTabsInner` so extension tabs render `{germanLabel} (N)` on patient mount, dim 0-count pills via outer-div `opacity: 0.55` (preserving Mantine 8's active-pill indicator per Pitfall #5), and feed the Phase-34 `EmptyExtensionsCoordinator` with accurate emptiness counts WITHOUT requiring any tab click. Live-Blaze UAT scaffold authored for ROADMAP §42 SC #4.
- One-liner:
- One-liner:
- hl7.fhir.uv.ips@2.0.0 (CC0-1.0) bundled as 32 trimmed StructureDefinitions with URL-keyed lazy-load IPS_REGISTRY, getIpsProfileForUrl helper, LICENSE attribution, and Wave 0 stubs ready for Plan 44-02 walker.
- Pure-function IPS bundle walker + IPSPanel UI (paste tab + server picker + Validate button) reachable at `/quality/ips`, surfacing missing-required-section, empty-entry, and unresolvable-reference findings via the unmodified Phase 15 ResourceIssueTable.

---

## v1.5 Validation, Performance & MII Extensions (Shipped: 2026-04-29)

**Phases completed:** 7 phases, 30 plans, 79 tasks

**Key accomplishments:**

- Three-tier FHIR validator cascade (external HTTP → server `$validate` → local structural) wired into `ValidationPanel` with PHI-gated external tier, 15s AbortController timeout, distinct blue toasts for timeout vs CORS, 3-part probe cache, D-20 unmount-safe AbortSignal threading, and an `Active strategy: external (HAPI) | server | local` status line.
- Closes the CR-01 critical bug from 31-REVIEW.md: `ValidationPanel`'s PHI ack key now derives from `externalValidator.url` when the external tier is enabled, matching the key `cascadingValidator.tryExternal` reads via `isPhiAcknowledged(serverUrl, ext.url)`. Banner visibility extends to external-only deployments. Integration test locks the UI<->cascade key agreement at end-to-end level.
- Seven per-metric React contexts (`Completeness`, `Coverage`, `Validation`, `Plausibility`, `LabRanges`, `References`, `Duplicates`) plus a `QualityMetricsProviders` composer and a Wave-0 smoke test — shipped alongside the legacy monolith with zero changes to existing consumers.
- QualityMetricsContext.tsx now a 125-LOC facade composing 7 per-metric hooks; 8 test wrappers migrated end-to-end; bulk consumers untouched; full regression 870/0.
- Migrated 7 producer sites to per-metric rollup hooks, decomposed OverviewStrip into 7 MetricTile leaf components, and split QualityOverviewPage tab labels to per-metric subscriptions while preserving the facade for capture/export bulk reads.
- React.Profiler test asserting setCompleteness(42) re-renders ONLY the Completeness tile (1 update vs 0 for the other 6) — formally closes EFF-R14-04 and pushes the suite from 870 to 871 passing / 0 failing.
- Live Blaze probe confirms all 7 MII-base-module patientSearchParam values are correct; separately fixes the latent MiiModuleTab.tsx:63 bug where module.extraQuery was declared in the type but never appended to the URL (Laborbefund tab shed 1121 non-lab Observations per probe patient once fixed); locks the contract with a 7-row table-driven test (D-17).
- Four new pure helpers (`fhirResourceTypesOf`, `findModuleForType`, `getPatientSearchParamForType`, `getExtraQueryForType`) land in `src/utils/mii-modules.ts` with the exact signatures locked by D-01 / D-04 / D-05; every existing call site that read `.fhirResourceType` directly or built a per-module URL now routes through the helpers; grep-verified zero survivors in source code. Pure refactor — behavior is identical under the narrow schema, and plan 33-03's widen becomes a type-level change only.
- One-liner:
- `MiiModuleTab` now fans out N concurrent FHIR GETs via `Promise.all(types.map(fetchOne))` with per-type `.catch(() => [] as Resource[])`, results concatenated with `.flat()` and sorted by `getDate()` descending (D-06/D-07); 5 unit tests lock single-type, multi-type, per-type-failure, and per-type override behavior.
- `MiiModuleTabs` now partitions `MII_MODULES` into base vs extension via `m.category`, wraps the extension `Tabs.List` in a session-only `Collapse` (`useDisclosure(false)` — D-09) with deep-link auto-expand (D-10), and drops `keepMounted` from extension `Tabs.Panel`s while keeping it on the base 7 + timeline (D-11). Phase 33 data has 0 extension modules, so the Collapse + trigger are length-guarded out; Phase 34's data drop flips the UI on without any further component change.
- `DashboardPage.tsx` MII section partitions `MII_MODULES` into `baseModules` + `extensionModules` via `m.category`, wraps the extension tile subgrid in a session-only `Collapse` (`useDisclosure(false)` — D-12), switches the tile click target from `navigate('/patients')` to a right-edge `Drawer` showing module details + an "Open in Explorer" button (D-14), and rewords the section heading to `MII Kerndatensatz · Server-wide totals` — closing UAT-FU-04's scoping-ambiguity complaint (D-13). Phase 33 data has 0 extension modules so the toggle + subgrid are length-guarded invisible; Phase 34's data drop flips them on without any further component change. No new FHIR fetches — the Drawer reads only the `counts[type]` values already fetched by `useResourceCounts`.
- Grep 1 — zero `===` survivors on the timeline `.find` path:
- Pre-implementation audit produced per-module spec table (14 rows × 10 cols), 7-palette WCAG AA contrast audit (all PASS after 3 seed-darkening tweaks), 21 Tabler icon assignments, and a paper-deuteranopia discriminability hypothesis that unblocks Plans 34-02 through 34-06.
- Landed 7 MII extension MantineColorsTuple palettes in theme.colors and added optional MiiModule.icon?: string field in three atomic TDD commits — zero visible UI change, full 925-test suite green, schema now ready for Plan 34-04's 21-module data-append.
- Stood up `scripts/fetch-mii-profiles.mjs` + `prepare` hook + CC-BY-4.0 attribution scaffold — fetched 482 trimmed StructureDefinitions from 14 MII extension IG packages, mounted URL-keyed EXTENSION_REGISTRY alongside base 7 type-keyed REGISTRY, extended LICENSE with CC-BY-4.0 NOTICE appendix.
- Data-drop plan: populated MII_MODULES with 14 extension entries + icons on all 21 modules, stood up ICON_MAP / resolveMiiIcon helper, rendered 21 icons at 3 consumer sites (Timeline 14px, Tabs 14px, Dashboard tiles 32px + Drawer 20px). 6 known multi-profile modules ship fhirResourceType as ARRAY per D-02 blocking-verify; 986 tests passing (+56 over Phase 33 baseline 930).
- Empty-state UX plan: extension tab panels with no data render at opacity 0.55 + em-dash copy ("— no {germanLabel} data for this patient"); MiiModuleTabs renders a per-patient "Hide/Show N empty modules" toggle (localStorage-persisted) that filters empty extension pills out of the Collapse; base 7 modules preserve Phase 33 empty copy (D-21 exemption); test count 986 → 998 (+12 net), all green.
- Commit:
- Reduced ResourceDetailPage tabs from 3 → 2 by deleting `Clinical + Raw` mode + `ClinicalRawView.tsx`, renamed `Developer` → `JSON`, remapped keyboard shortcut, and cleaned 7 grep hits across 4 files — 998 → 999 tests passing.
- Per-resource-type Date and Status field extractors for SearchResultsPage covering Patient (birthDate / active), Condition (onsetDateTime / clinicalStatus.coding[0].code), Observation / MedicationStatement / Procedure (effective[Date|Performed]Time / status), and Encounter (period.start / status), shipped via the TDD baseline-drift commit pair with all 4 RESEARCH-identified pitfalls mitigated and the existing badge color + empty-state behavior preserved.
- Identifier-system URL moves to hover Tooltip; address-extension JSON dump becomes a [View] Modal; bottom Extensions section in HumanReadableView aggregates all Resource.extension[] entries with deduped per-row [View] Modal triggers — closes UAT-FU-02.
- Per-type quality matrix card under Counts tab with 8-column sortable table fed by byType extensions to 5 Phase-32 per-metric contexts; sparse-cell em-dash invariant locked, chevron navigation honors PHI gate, ValidationPanel + ReferencesPanel honor `?type=` URL param.
- Captured Phase 35 HEAD bundle-size baseline (949,591 gz bytes) and committed two RED-state stub tests targeting the post-refactor async getExtensionProfileForUrl contract and the useConformanceRun extension-profile consumer wiring.
- 1. [Rule 3 — Blocking] TS2352 cast through `unknown`
- 1. [Rule 3 — Blocking] vi.mock factory hoisting bug in plan-authored test code
- Initial-load bundle SHRANK by 320.57 KB gz (from 927.33 → 606.76 KB) by lazy-loading 472 MII extension StructureDefinition JSONs into async-only chunks; full regression gate (1060 passing / 0 failing tests, tsc clean, build clean) green; ROADMAP success criteria 3 + 4 closed.
- Plan 37-01 was DEFERRED.
- Empirical Phase 34 TTI dual-gate captured PASS via twin git worktrees (048e99c → a7e4544) with Lighthouse 13.1 headless Chrome — baseline 256.5 ms, post-phase 268.6 ms, delta +12.08 ms (+4.71%), well under the D-08 100 ms / 10 % thresholds.
- Branch A taken — 0 contradictions enumerable because Plan 37-01 deferred the deuteranopia capture; Phase 34 UAT closes asymmetrically with TTI [x] (Lighthouse-substituted, PASS) and deuteranopia [ ] DEFERRED to v1.6+ hardening.

---

## v1.4 Hardening & Tech-Debt Sweep (Shipped: 2026-04-23)

**Phases completed:** 8 active phases (23-28, 29.5, 30) + Phase 29 superseded by Phase 30. 35 plans, 51 tasks.
**Git range:** `f8fdf18` → `fea1eea` (175 commits on main; src/ +7,611 / −2,360 across 108 files)
**Timeline:** 2026-04-16 → 2026-04-23 (7 days)
**Requirements:** 29/31 satisfied (UX-02 via Phase 30; UX-01 deferred); 10 new requirements introduced mid-milestone (TEST-REPAIR-01/02, UX-REDESIGN-01..08)

**Key accomplishments:**

- **v1.3 Close-Out (Phase 23)** — Closed 3 code-review warnings (W1 closure-capture, W2 quota probe, W3 truncation false-positive) with regression tests, resolved 2 cosmetic integration notes (FhirpathLike alias, stale toast), persisted 8 live-Blaze UAT items for Phase 21/22, and wired scoped FHIR counts through `useResourceCounts` with `autoStart: true` on 4 stale report hooks to fix the T-6.3 A cohort-dashboard bug.
- **Data-Fetching Foundation (Phase 24)** — Shipped the reusable `useAsyncRun<TIssue>` hook (closure-scoped `let cancelled`, 17/17 tests), a module-scope per-server `Map<serverUrl::type, number>` count cache, a 2-entry-LRU `Map<serverUrl, QualityMetricsCache>` registry with single-action invalidation in SettingsContext, and migrated all 4 async report hooks (plausibility / labRanges / duplicate / reference) to `useAsyncRun` — 635 → 340 LOC across those files (-46 %).
- **Quality Module Dedup (Phase 25)** — Eliminated the `useExamplesByPath` double-fetch by threading `perPathExamples` through the walker's single pass (coding drill-down server calls halved), extracted the generic `useSampleWalker<T>` worker pool plus `SortableTh` and `<RunProgress>` primitives (11 files consolidated), unified drill-down chrome into `<DrillDownShell>` (287 LOC cumulative reduction), and dropped `keepMounted` on Completeness + Coding so cold `/quality?tab=counts` no longer triggers their sampling.
- **App-Shell Dedup (Phase 26)** — Factored the triplicated "Not connected" alert into render-prop `<ConnectionGatedOutlet>` (11 regression tests), extracted `searchByIdentifierPrefix`, migrated 3 CompletenessRow links to `Anchor component={Link}`, useCallback-wrapped `setSettings` to drop its eslint-disable, and refactored sidebar active-state to `useMatch` with per-row exact flag + "most-specific-wins" so `/quality/cohorts` highlights only Cohorts.
- **Efficiency Polish (Phase 27)** — `ResourceIssueTable` pagination memo, `React.lazy()` + chunk-load retry on drill-down routes, and `rollup-plugin-visualizer` wired via `ANALYZE=1`. EFF-R14 (QualityMetricsContext re-render split) explicitly deferred to v1.5+ on risk/reward grounds (≤8 panels, ~20 files blast radius).
- **Micro-Consistency Sweep (Phase 28)** — `toRecord` helper replacement (0 `as unknown as Record` remaining), en/em-dash unification, 4 drill-down eslint-disables dropped, and ref-type fixes.
- **Test Baseline Repair (Phase 29.5)** — Insertional phase fixing 22 pre-existing failing tests that blocked Phase 30's `npm test` gate. Test-setup-only: `SettingsProvider` / `ConnectionProvider` wrappers across 7 React tests, `fhirUrl()` added to the terminology fixture + component client mocks, `useSearchParams` added to the router mock, stale DOM-structure assertions rewritten against current UI. `npm test` went from 22 failing / 814 passing → 0 failing / 835 passing with zero production changes.
- **Layout Redesign (Phase 30)** — External design-team handoff ported across 7 views + design tokens in 8 single-commit steps on `gsd/phase-30-layout-redesign`. Design tokens (`src/styles/tokens.css` + IBM Plex + Mantine theme rewrite to indigo / warm neutrals); Sidebar Server card + nested Quality sub-nav with 2-px indigo active rail; Dashboard 4-tile summary strip + collapsible sections + MII Kerndatensatz tile grid (ringless); Patients list `<Card>` filter bar + active-filter chip row + row-index / initials-avatar table cols; Quality 2-tier toolbar + no-ring `SummaryCard` with within/near/breach badges + pills tabs with inline overall-% + per-type quality matrix deferred; Explorer 240-px `<ResourceTypeRail>` + Category breadcrumb; Patient detail 3-col header with Raw JSON / `$everything` actions + pills MII tabs (contrast-fixed) + `MII_MODULES` reordered per UAT; Cohorts 2-col grid (1 fr / 380 px). 19-step UAT walkthrough resolved with 5 in-scope fixes and 6 off-phase follow-ups queued to v1.5.
- **Quick tasks (mid-milestone)** — Auto-connect to FHIR server on startup (one-shot `useEffect`), date-range picker UX (typed shortcut parser + `maxLevel="decade"` cascade), pinned selected resource types in MultiSelect.

**Tests:** 836 passing / 22 todo / 3 skipped / 0 failing at milestone close. `npm run build` clean.

**Tech debt carried forward to v1.5:**

- **UX-01** external FHIR validator cascade — `29-02-PLAN.md` preserved; three-tier validator (external → server `$validate` → local) with PHI gate, AbortController, OperationOutcome normalizer, probe cache
- **EFF-R14** per-metric QualityMetricsContext split — risk/reward deferred from Phase 27
- **Phase 30 UAT follow-ups (6)** — Explorer Date/Status columns per-type extractor; HumanReadableView extension cleanup (identifier-system tooltip, address-extension modal); ResourceDetailPage remove *Clinical + raw* + rename *Developer → JSON*; per-patient MII/FHIR Resources panels render empty for Synthea; Dashboard MII tile counts scope or label; per-type quality matrix card
- **Nyquist coverage** — 5 of the 6 formal v1.4 phases carry `nyquist_compliant: false` VALIDATION.md, matching the v1.3 pattern

**Archives:**

- [v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md) — full phase details
- [v1.4-REQUIREMENTS.md](milestones/v1.4-REQUIREMENTS.md) — requirements traceability
- [v1.4-MILESTONE-AUDIT.md](milestones/v1.4-MILESTONE-AUDIT.md) — `tech_debt` verdict, 29/31 requirements satisfied

---

## v1.3 Cohort Definition & Storage (Shipped: 2026-04-16)

**Phases completed:** 2 phases (21-22), 9 plans, 16 tasks
**Git range:** `5a4c0dd` → `d3b16cc` (46 commits; src/ +6,737 / −231 across 56 files)
**Timeline:** 2026-04-15 → 2026-04-16
**Requirements:** 7/7 satisfied at code level (human UAT deferred on 8 items)

**Key accomplishments:**

- **Interactive cohort builder (Phase 21)** — `/quality/cohorts` page with date-range + condition-code + reference-list criterion builder, localStorage persistence at `quality.cohorts.v1`, hydration-gated `useCohorts` hook with QuotaExceededError handling, 10K-patient cap + truncation Alert (CHRT-01, CHRT-02)
- **Dashboard cohort scoping (Phase 21)** — `resolveCohort` AND-intersects criterion sets, per-criterion 10K cap, `cohort.id + updatedAt` cache key (D-10); `ActiveCohortSelect` drives `patientIds` prop into 7 quality panels; `sampleResources` GET/POST cutover at 40 IDs (`_id=` for Patient, `patient=` for others) (CHRT-03)
- **Cohort / Resource types rename (Phase 21)** — `CohortSelector.tsx` → `ResourceTypeSelector.tsx`, legacy `quality.cohort.v1` → `quality.resourceTypes.v1` migration in `QualityLayout` mount effect, `migrateSnapshot` rewrites historic trend snapshots, PDF layout surfaces both `Resource types:` and `Cohort:` lines (CHRT-04)
- **FHIRPath programmatic cohorts (Phase 22)** — `fhirpathTranslator.ts` AST-to-FHIR-search-URL translator (6 comparison operators, URLSearchParams-only, 10K-ID cap), `dryRunCount` validation with `_summary=count`, `FhirpathCriterionCard` with 10s AbortController timeout and aria-live result row, `FhirpathCriterion` 4th variant on `CohortCriterion` union (CHRT-05)
- **MII FDPG import/export (Phase 22)** — `fdpgCodec.ts` bidirectional codec targeting MII SQ v3 schema, 1 MB file-size cap, prototype-pollution defence (field-by-field parse, no `Object.assign`), `CohortsPage` `FileButton` Import + per-row Menu Export, fhirpath-cohort Export disabled with explanatory tooltip (CHRT-06)
- **Cohort CRUD (Phase 22)** — `useCohorts.updateCohort` (bumps `updatedAt` for cache invalidation), `deleteCohort` (clears `activeCohortId` if matching), `duplicateCohort` (fresh UUID + `(copy)` suffix); `EditCohortModal` (size-lg with D-10 recompute warning) + `DeleteCohortModal` (size-sm red-button confirm), per-row three-dot Menu with Edit/Duplicate/Export/Delete items (CHRT-07)

**Tests:** 219 phase-scoped tests GREEN (59 Phase 21 + 160 Phase 22). Full suite: 582 passed / 22 pre-existing failures (no regressions). `npm run build` and `tsc -b --noEmit` both exit 0.

**Tech debt carried forward:**

- 8 human UAT items deferred to `.planning/phases/*/22-HUMAN-UAT.md` and Phase 21 checkpoint gates (live Blaze validate, FDPG browser download/import, Edit-with-active recompute, visual Duplicate/Delete, Export-disabled tooltip)
- 3 code review warnings (WR-01 handleExport loop-variable capture in `CohortsPage.tsx`, WR-02 `activateCohort` bypasses quota probe, WR-03 `PATIENT_REF_CAP` truncation false-positive after dedupe)
- 2 cosmetic integration notes (`FhirpathLike` alias redundancy in `fdpgCodec.ts:51-52`, `EditCohortModal` stale-name toast)
- Nyquist sign-off gate never flipped (`nyquist_compliant: false` on both VALIDATION.md files; tests GREEN but wave-0 approval deferred)

**Archives:**

- [v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) — full phase details
- [v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md) — all 7 requirements satisfied
- [v1.3-MILESTONE-AUDIT.md](milestones/v1.3-MILESTONE-AUDIT.md) — tech_debt status; 28/28 integration, 7/7 flows

---

## v1.2 Tech Debt & Quality Monitoring (Shipped: 2026-04-15)

**Phases completed:** 7 phases (14-20), 22 plans
**Git range:** `60e9010` → `661109d` (216 files, +35,490 / −378)
**Timeline:** 2026-04-13 → 2026-04-14
**Requirements:** 16/16 satisfied

**Key accomplishments:**

- **Tech debt cleanup (Phase 14)** — zero TypeScript build errors, shared `fhir-helpers` utility (`toRecord`, `getCodeDisplay`), all 17 deferred code review findings from v1.0 phases 4+5 resolved (DEBT-01, DEBT-02)
- **Quality drill-down foundation (Phase 15)** — `NormalizedIssue` type, per-resource walker output, shared `ResourceIssueTable` with pagination/filters/severity badges, drill-down pages wired for completeness, coding coverage, and validation with clickable links to resource detail (DQ-01, DQ-02)
- **Conformance & plausibility checks (Phase 16)** — profile conformance engine with value set cache, cardinality validation, profile-driven temporal plausibility (future dates, period consistency, age, duration), lab reference range validation; 6-tab quality dashboard (DQ-03, DQ-04, DQ-05, DQ-06)
- **Duplicate detection & relational integrity (Phase 17)** — five pure-function engines (patient dedup, content-hash resource dedup, reference walking, existence checking, orphan detection) + two state-machine hooks + `DuplicatesPanel`/`ReferencesPanel` (DQ-07, DQ-08, DQ-09, DQ-10)
- **Quality alerting & thresholds (Phase 18)** — `useThresholds` localStorage hook with hydration gate, three-state override precedence, `/quality/thresholds` config page with save-on-blur + reset-to-defaults, `SummaryCard` breach primitive, 9-tile `OverviewStrip` with `?tab=` deep-linking (DQ-11, DQ-12)
- **Quality trends & PDF reports (Phase 19)** — `trendsHistory` pure module with localStorage persistence + quota handling, 7-mini-chart small-multiples with per-point breach coloring + overlay mode, cross-server filter, off-screen React portal + html-to-image + jsPDF multi-page export wired to `/quality` toolbar (QUAL-05, QUAL-06)
- **Milestone gap closure (Phase 20)** — TS2352 cast widening in `profileConformanceChecker.ts` + `temporalPlausibilityWalker.ts` (`as unknown as` double-cast), retrospective `15-VERIFICATION.md` + `18-VERIFICATION.md`, REQUIREMENTS.md traceability sync to 16/16 (closes `v1.2-MILESTONE-AUDIT.md`)

**Archives:**

- [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) — full phase details
- [v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md) — all 16 requirements satisfied
- [v1.2-MILESTONE-AUDIT.md](milestones/v1.2-MILESTONE-AUDIT.md) — initial audit (gaps closed by Phase 20)

---
