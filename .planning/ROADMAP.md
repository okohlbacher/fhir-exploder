# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- ✅ **v1.4 -- Hardening & Tech-Debt Sweep (shipped 2026-04-23)** -- [Archive](milestones/v1.4-ROADMAP.md) . [Requirements](milestones/v1.4-REQUIREMENTS.md) . [Audit](milestones/v1.4-MILESTONE-AUDIT.md)
- 🚧 **v1.5 -- Validation, Performance & MII Extensions (in progress, started 2026-04-23)** -- phases 31-38, 31 requirements (phases 36-38 promoted from backlog 2026-04-25 to close shelved deuteranopia/TTI capture, profile lazy-load, and live-Blaze HUMAN-UAT items before milestone completion)

## Deferred Items

_None carried forward beyond v1.5 at the moment. v1.4's EFF-R14 + UX-01 deferrals are both promoted into v1.5 (Phases 31 + 32)._

v1.6+ candidates (from `.planning/REQUIREMENTS.md` §v1.6+):

- IPS Compositions (Empty-Sections-and-Missing-Data) support
- CSV export of per-type quality matrix
- Semantic near-miss detection for UX-01 (SNOMED CT + ICD-10 graph walking)
- Validator authentication (Basic/Bearer)
- Mantine 9 upgrade (coupled to React 19; wait for Medplum 5.x peer-dep refresh)
- Heat-column gradient on per-type quality matrix
- Pre-probe extension-module counts on Patient detail
- **Headless deuteranopia simulation in Vitest (closes Phase 37 deferral).** Apply Brettel/Machado JS simulation matrix to rendered RGBA from the Dashboard tile grid + tab row, then assert pairwise icon+color discriminability for the 21 MII module adjacent pairs. Would close `37-EMPIRICAL.md` §1+§2 retroactively for any future HEAD and catch palette/icon regressions on every PR. Phase 37 left the borderline pairs (#7 mikrobiologie↔molekulargenetik HIGH; #12 pro↔seltene MEDIUM-HIGH) as qualitative paper predictions only — empirical capture deferred 2026-04-28 by user decision. See `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-VERIFICATION.md` and `37-EMPIRICAL.md` §7(a) for the rationale and recommended approach.

---

## Phases

<details>
<summary>✅ v1.2 Tech Debt & Quality Monitoring (Phases 14-20) — SHIPPED 2026-04-15</summary>

- [x] Phase 14: Tech Debt Cleanup (2/2 plans) — completed 2026-04-13
- [x] Phase 15: Quality Check Engine & Drill-Down (3/3 plans) — completed 2026-04-13
- [x] Phase 16: Conformance & Plausibility Checks (4/4 plans) — completed 2026-04-14
- [x] Phase 17: Duplicate Detection & Relational Integrity (3/3 plans) — completed 2026-04-14
- [x] Phase 18: Quality Alerting & Thresholds (4/4 plans) — completed 2026-04-14
- [x] Phase 19: Quality Trends & PDF Reports (3/3 plans) — completed 2026-04-14
- [x] Phase 20: v1.2 Milestone Gap Closure (3/3 plans) — completed 2026-04-14

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3 Cohort Definition & Storage (Phases 21-22) — SHIPPED 2026-04-16</summary>

- [x] Phase 21: Interactive Cohort Builder + Rename (6/6 plans) — completed 2026-04-16
- [x] Phase 22: Programmatic Cohort Definition (FHIRPath + FDPG) (3/3 plans) — completed 2026-04-16

Full details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

</details>

<details>
<summary>✅ v1.4 Hardening & Tech-Debt Sweep (Phases 23-30) — SHIPPED 2026-04-23</summary>

- [x] Phase 23: v1.3 Close-Out (7/7 plans) — completed 2026-04-17
- [x] Phase 24: Data-Fetching Foundation (4/4 plans) — completed 2026-04-17
- [x] Phase 25: Quality Module Dedup (4/4 plans) — completed 2026-04-22
- [x] Phase 26: App-Shell Dedup (3/3 plans) — completed 2026-04-22
- [x] Phase 27: Efficiency Polish (2/2 plans) — completed 2026-04-23
- [x] Phase 28: Micro-Consistency Sweep (2/2 plans) — completed 2026-04-23
- [~] Phase 29: Backlog UX — SUPERSEDED by Phase 30 (UX-02 covered; UX-01 deferred to v1.5 Phase 31)
- [x] Phase 29.5: Test Baseline Repair (1/1 plan) — completed 2026-04-23
- [x] Phase 30: Layout Redesign (1/1 plan, 8 steps) — completed 2026-04-23

Full details: [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md)

</details>

### 🚧 v1.5 Validation, Performance & MII Extensions (Phases 31-38)

- [~] **Phase 31: UX-01 External Validator Cascade** — Execute the preserved `29-02-PLAN.md` verbatim: three-tier cascade (external → server `$validate` → local structural), PHI-gate extraction, `normalizeOperationOutcomeIssue`, probe cache, AbortController + 15 s timeout, active-strategy status line. Parallel-safe with Phase 32. (31-01 completed 2026-04-23; 31-02 gap-closure in progress — closes CR-01 PHI ack key mismatch)
- [x] **Phase 32: EFF-R14 QualityMetricsContext Split** — Option A: 7 per-metric `React.createContext` providers + `<QualityMetricsProviders>` composer. Facade `useQualityMetrics()` preserved. Parallel-safe with Phase 31 (merge-conflict watch on `ValidationPanel.tsx`). (completed 2026-04-23)
- [x] **Phase 33: MII Schema Foundation + Extension-Modules Collapse UI** — Helpers-first refactor (`fhirResourceTypesOf`, `findModuleForType`, `getPatientSearchParamForType`), schema widening (`fhirResourceType: string | string[]` + `category` + `patientSearchParamOverrides?`), `MiiModuleTab` fan-out, collapsible Extension modules section. Absorbs UAT-FU-04 (Dashboard MII tile scoping) and UAT-FU-06 (empty per-patient MII/FHIR panel investigation). (completed 2026-04-24)
- [x] **Phase 34: 14 MII Extension Modules + Palette + Bundled Profiles** — 14 extension module entries, 7 custom `MantineColorsTuple`s (WCAG AA audit), 21 Tabler icons, `scripts/fetch-mii-profiles.mjs` via `fhir-package-loader@^2.2.4` devDep + `prepare` lifecycle, CC-BY-4.0 attribution, dimmed empty-state + "Show N empty" toggle. (completed 2026-04-25)
- [x] **Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix** — UAT-FU-01 Explorer Date/Status extractor (TDD), UAT-FU-02 HumanReadableView extension cleanup, UAT-FU-03 ResourceDetailPage mode removal + Developer→JSON rename, UAT-FU-05 per-type quality matrix card under Counts tab (requires Phase 32). (completed 2026-04-25)
- [x] **Phase 36: Phase 34 profile lazy-load (bundle-size waiver follow-up)** — Promoted from backlog 999.3 (2026-04-25 audit). Switch `src/quality/profiles/extensions/index.ts` from static imports to dynamic `import()` per-canonical-URL; define a real consumer for `getExtensionProfileForUrl` / `BUNDLED_EXTENSION_PROFILE_URLS` (closes the orphaned-export integration finding); re-measure with `rollup-plugin-visualizer`; aim for <100 KB gz delta. Closes deferred clause of MII-EXT-12. **Fully automatable.** (completed 2026-04-26)
- [x] **Phase 37: Phase 34 empirical UAT capture (deuteranopia + TTI)** — Promoted from backlog 999.2 (2026-04-25 audit). Capture 3 deuteranopia screenshots via Chrome DevTools Rendering → Emulate vision deficiencies (`/dashboard`, `/patients/:id` tab row, `ClinicalTimeline`); commit as `deuteranopia-{dashboard,tab-row,timeline}.png`. Capture TTI before/after via Chrome DevTools Performance panel — baseline at commit `048e99c`, post-phase at Phase 34 HEAD; commit as `tti-snapshot.json`. Reconcile against paper predictions in `.planning/research/color-design-audit.md` §4b/§4c. Closes deferred clauses of MII-EXT-11 (deuteranopia) and the D-22 TTI override accepted in Phase 34. **Human-execution-bound** (Chrome DevTools required). (completed 2026-04-28)
- [x] **Phase 38: v1.5 HUMAN-UAT live-Blaze smoke tests (Phase 33 + Phase 35)** — Merger of backlog 999.1 + 999.4 (2026-04-25 audit). Run the 12 live-Blaze observational items from `33-HUMAN-UAT.md` (6 items: Synthea Laborbefund extraQuery; timeline color/label; Dashboard heading; tile Drawer UX; deep-link auto-expand; UAT-FU-06 previously-empty-panel) and `35-HUMAN-UAT.md` (6 items: Date/Status real data; identifier-system Tooltip; Modal transition; bottom Extensions section; per-type quality matrix card with real metric data + chevron deep-link; PHI gate behavior on chevron click). Records pass/fail per test in updated HUMAN-UAT files; any fail surfaces as blocking gap. **Human-execution-bound** (live Blaze + Synthea browser session required). (completed 2026-04-28)
- [ ] **Phase 38.1: Fix `_sort=-date` Blaze incompatibility (INSERTED)** — Surfaced by Phase 38 HUMAN-UAT walk on 2026-04-28 as 3 critical-severity hits in `33-HUMAN-UAT.md` (Tests 1, 2, 6). Blaze 1.6.2 rejects `_sort=-date` with HTTP 400 `"Unknown search-param 'date' in sort clause."` on every per-patient resource search. Swap `_sort=-date` → `_sort=-_lastUpdated` (or remove sort entirely) in 4 source files: `src/components/patients/MiiModuleTab.tsx:81`, `src/components/patients/ClinicalTimeline.tsx:72`, `src/components/patients/PatientTimeline.tsx:122`, `src/components/patients/FhirResourcesView.tsx:132`. After landing, append `→ fixed in Phase 38.1, commit <sha>` to each failing row in `33-HUMAN-UAT.md` (rows keep `result: fail` per D-03 — historical record of what the v1.5 walk surfaced). **Fully automatable.**

## Phase Details

### Phase 31: UX-01 External Validator Cascade
**Goal**: Deliver a three-tier validator cascade (external HTTP → server `$validate` → local structural) gated by the existing PHI acknowledgment, with timeout fallback and a per-resource-type active-strategy status line. Closes the v1.4 carry-over by executing `29-02-PLAN.md` with decisions D-07..D-16 already locked.
**Depends on**: Nothing (parallel-safe with Phase 32; merge-conflict watch on `ValidationPanel.tsx` — ship before Phase 32 or coordinate rebase).
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-05
**Success Criteria** (what must be TRUE):
  1. With `validation.externalValidator.enabled: true` + a reachable HAPI-style endpoint, running "Validate sample" on any resource type routes through the external tier: `ValidationPanel` displays `Active strategy: external` (with validator variant suffix when detectable, e.g. `external (HAPI)`) and the returned `OperationOutcome` issues render in the existing `ResourceIssueTable`.
  2. When the external validator times out (configurable `timeoutMs`, default 15 s) a single blue Mantine toast fires, the cascade demotes to server `$validate`, and the per-`(serverUrl, externalValidatorUrl, resourceType)` probe cache records the demotion so subsequent runs skip the external tier until settings change or the user clicks "Validate sample" again.
  3. Before ANY external-tier `fetch`, `isPhiAcknowledged(serverUrl, externalValidatorUrl)` is consulted; regression test locks the contract that `vi.spyOn(global, 'fetch')` sees zero outbound calls before the user clicks the PHI acknowledgment button (D-09 invariant preserved).
  4. `src/quality/phiGate.ts`, `src/quality/normalizers.ts`, and `src/quality/cascadingValidator.ts` exist with dedicated unit tests; `normalizers.test.ts` includes severity-mapping fixtures for HAPI, Firely, and IG-Publisher shapes.
  5. Unmounting `ValidationPanel` mid-run aborts both external-tier and server-tier fetches via threaded `AbortSignal` (no orphan requests in DevTools Network).
  6. `public/settings.yaml` ships a commented `externalValidator:` example block; schema in `src/config/types.ts` accepts `{ url, enabled, timeoutMs }`; `deepMerge` handles missing block gracefully.
**Plans:** 2/2 plans complete

Plans:
- [x] 31-01-PLAN.md — Three-tier cascade (external → server → local) + PHI gate extraction + normalizers extraction + settings schema + useConformanceRun wiring + Active-strategy status line; woven with D-17..D-20 deltas
- [x] 31-02-PLAN.md — Gap closure: fix CR-01 PHI ack key mismatch in ValidationPanel (key external-tier URL, extend banner visibility to external-only deployments) + integration test locking UI↔cascade key agreement (VAL-01 PARTIAL → SATISFIED, VAL-04 PARTIAL → SATISFIED)
**Effort**: ~2-2.5 days (plan pre-litigated; 3 new src files + 3 new test files + touches to 6 existing files; regression-test contract drives most of the work)
**UI hint**: yes (active-strategy status line + timeout toast + PHI gate Alert copy)

### Phase 32: EFF-R14 QualityMetricsContext Split
**Goal**: Split the monolithic `QualityMetricsContext` so a single metric update re-renders only its own tile. API-preserving via a facade `useQualityMetrics()` that composes 7 per-metric hooks. Unblocks the Phase 35 per-type quality matrix, which cannot ship without per-metric context isolation.
**Depends on**: Nothing (parallel-safe with Phase 31; merge-conflict watch on `ValidationPanel.tsx`). Blocks Phase 35's UAT-FU-05.
**Requirements**: EFF-R14-01, EFF-R14-02, EFF-R14-03, EFF-R14-04, EFF-R14-05, EFF-R14-06
**Success Criteria** (what must be TRUE):
  1. Seven per-metric context modules exist under `src/quality/metrics/` (CompletenessContext, CoverageContext, ValidationContext, PlausibilityContext, LabRangesContext, ReferencesContext, DuplicatesContext), each with an API-stable `use<Metric>Rollup()` returning `{value, set}` (or `{overall, breakdown, contribute}` for Duplicates).
  2. `<QualityMetricsProviders>` composite at `src/quality/metrics/index.tsx` wraps all 7 providers and is mounted once in `QualityLayout.tsx`; a smoke test asserts all 7 providers populate independently and rejects any shared-context-symbol regression.
  3. A React Profiler snapshot test asserts per-tile render isolation: updating `overallCompleteness` re-renders only the Completeness tile in `OverviewStrip`, not the other 6 tiles.
  4. `useQualityMetrics()` facade continues to return the pre-split shape; bulk consumers (`QualityOverviewPage.tsx` capture-snapshot + PDF export, `PdfReportLayout.tsx`) work without modification.
  5. All 7 producer sites migrated from `useQualityMetrics()` destructure to the specific per-metric hook (`useCompletenessReport`, `useCodingCoverage`, `ValidationPanel`, `PlausibilityPanel`, `LabRangesPanel`, `ReferencesPanel`, `DuplicatesPanel`); `OverviewStrip` and `QualityOverviewPage` tab labels subscribe per-metric.
  6. All 8 existing test wrappers migrated from `QualityMetricsProvider` to the composite; `npm test` shows 836+ passing / 0 failing; no "Maximum update depth exceeded" from missing `useMemo` on provider values.
**Plans:** 4/4 plans complete
Plans:
- [x] 32-01-PLAN.md — Scaffold: create 7 per-metric context modules under src/quality/metrics/ + QualityMetricsProviders composer + providers-smoke test (Wave 0 file); legacy provider untouched
- [x] 32-02-PLAN.md — Facade rewrite: useQualityMetrics() composes 7 hooks; legacy QualityMetricsProvider deleted; QualityLayout.tsx swapped; 7 direct-wrap test files + 1 vi.mock retargeted
- [x] 32-03-PLAN.md — Producer + consumer migration: 7 producers push via per-metric hooks (ValidationPanel on :229 per RESEARCH correction); OverviewStrip decomposed into MetricTile children; QualityOverviewPage tab labels subscribe per-metric (facade preserved for capture/export)
- [x] 32-04-PLAN.md — Profiler per-tile isolation test (Wave 0 file) + full-phase regression gate (npm test >=870 passing / 0 failing; tsc clean; 6 EFF-R14 grep verifications)
**Effort**: ~2-2.5 days (internal refactor, API-preserving; main cost is the producer + consumer migration sweep and the Profiler-based per-tile isolation test)

### Phase 33: MII Schema Foundation + Extension-Modules Collapse UI
**Goal**: Widen the MII module schema and ship the collapsible "Extension modules" UI shell WITHOUT yet adding the 14 new data entries. Helpers-first codemod isolates the mechanical refactor from the later data rollout so silent breakage (TS cannot flag `===` on `string` vs `string | string[]`) cannot hide. Absorbs two Phase-30 UAT follow-ups as pre-tasks: UAT-FU-04 (Dashboard MII tile scoping decision) and UAT-FU-06 (empty per-patient MII/FHIR panel investigation) so the `patient=` vs `subject=` pattern propagates correctly.
**Depends on**: Nothing (independent of Phases 31 and 32). Blocks Phase 34. Intra-phase ordering: MII-EXT-07 (UAT-FU-06 investigation) BEFORE MII-EXT-01 (helpers) BEFORE MII-EXT-02 (schema widen) BEFORE MII-EXT-04/05/06 (UI partition); MII-EXT-03 and MII-EXT-08 follow the schema landing.
**Requirements**: MII-EXT-01, MII-EXT-02, MII-EXT-03, MII-EXT-04, MII-EXT-05, MII-EXT-06, MII-EXT-07, MII-EXT-08 (subsumes UAT-FU-04 + UAT-FU-06)
**Success Criteria** (what must be TRUE):
  1. `src/utils/mii-modules.ts` exports `fhirResourceTypesOf(mod)`, `findModuleForType(type, modules)`, `getPatientSearchParamForType(mod, type)`, and `getExtraQueryForType(mod, type)`; all existing call sites (`MiiModuleTab`, `MiiModuleTabs`, `ClinicalTimeline`, `DashboardPage` MII tile) consume helpers — no direct `.fhirResourceType` string comparison remains (grep-verified).
  2. `MiiModule` interface accepts `fhirResourceType: string | string[]` and `category: 'base' | 'extension'` (required field, no default); all 7 existing base modules are explicitly tagged `'base'`. Optional `patientSearchParamOverrides?: Record<string, string>` and per-type `extraQuery` structure exist in the type and are unused for the 7 base modules (exercised by Phase 34 data).
  3. `MiiModuleTab` fans out to N concurrent FHIR searches via `Promise.all(types.map(...))` with per-type `.catch()` preserving "empty for that type"; single-type modules behave identically to v1.4.
  4. `MiiModuleTabs.tsx` renders base pill tabs at top; extension tabs live inside a `<Collapse>` block beneath with its own `<Tabs.List>`. Collapse defaults CLOSED; auto-expands when `activeTab` matches an extension module key (deep-link support). Extension `Tabs.Panel`s drop `keepMounted`; base 7 keep it.
  5. Dashboard MII tile grid (`DashboardPage.tsx:345-384`) partitions base vs extension; extension section gated behind a "Show extension modules" toggle. The Dashboard MII tile count scoping decision (per-patient vs server-wide, from UAT-FU-04) is resolved and a single label clarifies scope — no ambiguous count badges remain.
  6. UAT-FU-06 root cause for Synthea empty per-patient MII/FHIR panels identified and fixed (likely per-module `patientSearchParam` mismatch — `patient=` vs `subject=`); regression test locks the pattern so it propagates to Phase 34's 21 modules.
  7. `ClinicalTimeline.tsx:85-86` `MII_MODULES.find` uses `fhirResourceTypesOf(m).includes(resource.resourceType)`; timeline entries keep badge color + German label for multi-type modules (verified via test fixture with a Bildgebung-style multi-type module stub).
  8. `npm test` shows 836+ passing / 0 failing. `mii-modules.test.ts` type assertions relaxed to accept `string | string[]`; exact-match tests for the 7 base modules remain unchanged.
**Plans**: TBD (Task 1: UAT-FU-06 investigation; Task 2: helpers + call-site migration; Task 3: schema widen; Task 4: MiiModuleTab fan-out; Task 5: MiiModuleTabs partition + Collapse; Task 6: Dashboard partition + UAT-FU-04 decision)
**Effort**: ~2.5-3 days (codemod across ~8 consumer sites; two investigations; no data payload yet)
**UI hint**: yes (collapsible Extension modules header, Dashboard MII section split)

### Phase 34: 14 MII Extension Modules + Palette + Bundled Profiles
**Goal**: Populate the shell that Phase 33 built. Ship 14 extension module entries with per-type search-param overrides, a 21-module color palette (7 base unchanged + 7 custom `MantineColorsTuple`s), 21 Tabler icons, and bundled CC-BY-4.0 trimmed StructureDefinition JSON via a one-time `fhir-package-loader` devDep. Per-module empty-state UX at 0.55 opacity with specific copy.
**Depends on**: Phase 33 (schema, helpers, UI shell must exist). Blocks Phase 35 UAT-FU-05 indirectly via the per-type matrix's module-color usage (not a hard dep; matrix can ship first and colors retroactively apply, but color sign-off ideally lands here).
**Requirements**: MII-EXT-09, MII-EXT-10, MII-EXT-11, MII-EXT-12, MII-EXT-13, MII-EXT-14
**Success Criteria** (what must be TRUE):
  1. 14 MII extension modules (Onkologie, Kardiologie, Intensivmedizin, Bildgebung, Pathologie, Mikrobiologie, Molekulargenetik, Seltene Erkrankungen, Symptom, Biobank, Studie, Dokument, MTB, PRO) exist in `MII_MODULES` with per-module `fhirResourceType` array, `patientSearchParam` default + optional `patientSearchParamOverrides`, `badgeColor` from the Phase-34 palette, and an `icon` from `@tabler/icons-react`. Per-module spec verified against the current MII FHIR IGs (per-module research deliverable committed under `.planning/research/color-design-audit.md` or sibling).
  2. `src/theme.ts` declares 7 custom `MantineColorsTuple`s (oncology-red, imaging-cyan, genetics-grape, pathology-violet, bioanalysis-teal, administration-indigo, patient-reported-pink) with a WCAG AA contrast audit committed to `.planning/research/color-design-audit.md`; base 7 module colors (blue/indigo/teal/violet/pink/cyan/orange) are UNCHANGED.
  3. 21 Tabler icons rendered in Timeline dots, tab subtitle, and Dashboard tile swatch; per-module icon assignment documented in the palette audit file. Deuteranopia simulation pass confirms color + icon combination remains discriminable.
  4. `scripts/fetch-mii-profiles.mjs` fetches the 14 MII extension `StructureDefinition`s via `fhir-package-loader@^2.2.4` from packages.fhir.org at build time; trimmed JSON (`{url, name, type, snapshot.element[{path, min, max, mustSupport}]}`) lands under `src/quality/profiles/extensions/`. Pre-GA packages (Kardiologie `2026.0.0-alpha.2`, Symptom `2024.0.0-ballot`) bundled as-latest-available with a `console.info` warning. `npm install` via the `prepare` lifecycle hook auto-runs the script on fresh clones so `npm test` passes without a manual prebuild step.
  5. `src/quality/profiles/extensions/ATTRIBUTION.md` + an appendix in the root `LICENSE` carry CC-BY-4.0 attribution per MII IG page requirements.
  6. Extension-module empty-state renders the module tab visible + 0.55 opacity + "— no {module} data for this patient" copy; a "Show N empty modules" toggle persists per-patient collapse state in `localStorage.patients.hideEmptyExtensions.v1`.
  7. Patient-detail `/patients/:id` Time-to-Interactive unchanged from v1.4 baseline (verified via Chrome DevTools Performance snapshot — no regression from concurrent-fetch storm; Phase 33's `keepMounted` drop on extensions is the enabling guard). Bundle-size delta <100 KB post-gzip (verified via `rollup-plugin-visualizer` treemap).
**Plans**: 6 plans
- [x] 34-01-PLAN.md — Per-module research + color/icon/palette audit + paper-only deuteranopia assessment
- [x] 34-02-PLAN.md — Theme palette (7 MantineColorsTuple) + MiiModule.icon schema field
- [x] 34-03-PLAN.md — scripts/fetch-mii-profiles.mjs + prepare hook + CC-BY-4.0 attribution
- [x] 34-04-PLAN.md — 14 MII_MODULES extension entries + ICON_MAP + 3 consumer render sites
- [x] 34-05-PLAN.md — Empty-state UX (opacity 0.55 + em-dash copy) + Hide/Show toggle + localStorage coordinator
- [x] 34-06-PLAN.md — UAT: empirical deuteranopia screenshots + TTI before/after + bundle-size treemaps + D-24 ≥902 reassessment
**Effort**: ~3-3.5 days (larger than Phase 33 because of the per-module research payload + color/icon design sign-off + profile bundling pipeline)
**UI hint**: yes (palette rollout across tabs, Dashboard tiles, ClinicalTimeline dots; empty-state UX)

### Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix
**Goal**: Close the four remaining Phase-30 UAT gaps and ship the per-type quality matrix card under the Counts tab. Small, mostly-independent plans — split freely.
**Depends on**: Phase 32 (UAT-FU-05 per-type matrix consumes the per-metric context slots introduced by EFF-R14). UAT-FU-01/02/03 are independent and can run in parallel with Phases 31-34.
**Requirements**: UAT-FU-01, UAT-FU-02, UAT-FU-03, UAT-FU-05 (UAT-FU-04 subsumed by Phase 33 MII-EXT-06; UAT-FU-06 subsumed by Phase 33 MII-EXT-07 — both cross-referenced here for traceability)
**Success Criteria** (what must be TRUE):
  1. `SearchResultsPage.tsx` Date and Status columns populate for Patient (`birthDate` / `active`), Condition (`onsetDateTime` / `clinicalStatus`), Observation (`effectiveDateTime` / `status`), MedicationStatement, Encounter, and Procedure; TDD commits show assertion tests written first capturing current "empty = empty" behavior, then extractor + baseline updates landed in a single reviewable commit (UAT-FU-01).
  2. `HumanReadableView.tsx` + `ResourcePropertyTable.tsx` move identifier-system URLs to a Mantine `Tooltip` (not rendered in the main row), replace address-extension JSON with a Modal viewer, and collect all extensions into a bottom "Extensions" section with one row per unique `url` and a "View" button → Modal (UAT-FU-02).
  3. `ResourceDetailPage.tsx` SegmentedControl options reduce from 4 to 3: `Clinical + raw` display mode removed entirely; `Developer` renamed to `JSON`; `ClinicalRawView.tsx` deleted with references grep-clean (UAT-FU-03).
  4. Per-type quality matrix card renders under `/quality?tab=counts` below the existing counts table. Columns: `Resource type | Complete% | Coverage% | Validation% | References% | Dup | Issues | chevron`. Each % cell has an inline horizontal fill bar. Rows sortable via the shared `SortableTh`. Clicking a row navigates to the per-type drill-down panel filtered by resource type. Threshold breach coloring applied per cell via `isBreached(key, value)` — consistent with OverviewStrip. Consumes per-metric context slots from Phase 32 (no duplicate metric computation) (UAT-FU-05).
  5. All Phase-30 UAT gaps listed in `.planning/milestones/v1.4-phases/30-layout-redesign/30-UAT.md` Gaps section closed; live-Blaze UAT confirms Explorer Date/Status columns populated across the six verified resource types.
  6. `npm test` 836+ passing / 0 failing; `npm run build` clean; design-token grep (`grep -rn 'color: #' src/ --include='*.tsx'`) returns 0 new hits.
**Plans:** 4/4 plans complete

Plans:
- [x] 35-01-PLAN.md — UAT-FU-03 ResourceDetailPage mode cleanup (drop Clinical+Raw tab; rename Developer → JSON; delete ClinicalRawView.tsx; grep-clean tests)
- [x] 35-02-PLAN.md — UAT-FU-01 SearchResultsPage per-type Date/Status extractors (TDD baseline-drift commit pair across 6 FHIR R4 types)
- [x] 35-03-PLAN.md — UAT-FU-02 HumanReadableView extension cleanup (Tooltip identifier system + Modal address-extension + bottom Extensions section)
- [x] 35-04-PLAN.md — UAT-FU-05 per-type quality matrix card under Counts tab + 5 per-metric byType slot extension + ValidationContext validationIssuesByType (Q-01) + 4 producer migrations + URL-driven type pre-selection (Q-02)
**Effort**: ~2-2.5 days (UAT-FU-01 ~0.5 day via TDD; UAT-FU-02 ~0.5 day; UAT-FU-03 ~0.25 day mechanical rename; UAT-FU-05 ~1-1.25 day — matrix is smaller than OverviewStrip because `SortableTh`, `ResourceIssueTable`, and breach colors are already primitives)
**UI hint**: yes (per-type matrix table under Counts, HumanReadableView modal, SegmentedControl trim)

### Phase 36: Phase 34 profile lazy-load (bundle-size waiver follow-up)
**Goal**: Address D-23 bundle-size gate failure from Plan 34-06 (post-phase delta +227.81 KB gz vs <100 KB floor; 98.6% of delta from 482 trimmed extension profile JSONs in `profiles-*.js`). Switch `src/quality/profiles/extensions/index.ts` from static imports to dynamic `import()` per-canonical-URL so the ~277 KB gz extension-profile chunk loads on-demand only when a completeness walker actually consults an extension profile. Define a real production consumer for `getExtensionProfileForUrl` / `BUNDLED_EXTENSION_PROFILE_URLS` (closes the orphaned-export integration finding from the v1.5 audit). Re-measure with `rollup-plugin-visualizer`; commit before/after treemaps.
**Depends on**: Phase 34 (profile registry + REGISTRY mounting must already exist).
**Requirements**: closes deferred lazy-load clause of MII-EXT-12 (no new REQ-ID)
**Success Criteria** (what must be TRUE):
  1. `src/quality/profiles/extensions/index.ts` no longer uses static `import` for SD JSONs; per-canonical-URL `import()` resolved on first call to `getExtensionProfileForUrl`.
  2. At least one production caller of `getExtensionProfileForUrl` exists (likely in completeness walker / validation pipeline) and is exercised by a unit test.
  3. `rollup-plugin-visualizer` treemap shows initial-load bundle delta vs Phase 34 baseline ≤ 100 KB gz; before/after HTMLs committed under `.planning/phases/36-.../`.
  4. `npm test` 1054+ passing / 0 failing; `npx tsc -b --noEmit` clean; `npm run build` clean.
**Plans:** 4/4 plans complete

Plans:
- [x] 36-01-PLAN.md — Wave 0: stub tests for async getExtensionProfileForUrl (4 cases) + skipped consumer-wiring stub + capture Phase 35 HEAD baseline visualizer treemap (`36-visualizer-before.html`) with on-disk gz total
- [x] 36-02-PLAN.md — Wave 1: rewrite scripts/fetch-mii-profiles.mjs emit logic to URL→thunk map; regenerate src/quality/profiles/extensions/index.ts (483 lazy thunks, 0 static SD imports); replace getExtensionProfileForUrl with async wrapper + module-scoped cache + in-flight dedup Map (Plan 01 tests pass meaningfully)
- [x] 36-03-PLAN.md — Wave 2: insert Step 2b in useConformanceRun.ts (reads meta.profile[*], lazy-loads matching extension SDs via Promise.all, calls validateConformance per extension SD); activate the integration test (it.skip → it) — closes orphaned-export finding
- [x] 36-04-PLAN.md — Wave 3: ANALYZE=1 build, capture `36-visualizer-after.html` + POST_REFACTOR_GZ_BYTES; author 36-04-BUNDLE-DELTA.md with delta + gate verdict + async-chunk evidence; final regression gate (npm test ≥ 1059 passing / 0 failing, tsc clean, build clean)
**Effort**: ~0.5-1 day (focused refactor; risk: ensure dynamic import path resolves correctly under Vite's chunk splitting)

### Phase 37: Phase 34 empirical UAT capture (deuteranopia + TTI)
**Goal**: Close the human-gated UAT items left open by Plan 34-06. Two artifacts: (1) deuteranopia screenshots — `/dashboard`, `/patients/:id` tab row, `ClinicalTimeline` — captured via Chrome DevTools Rendering → Emulate vision deficiencies → deuteranopia, committed under `.planning/phases/37-.../deuteranopia-{dashboard,tab-row,timeline}.png`. (2) TTI before/after — baseline at commit `048e99c` (Phase 33 tail), post-phase at Phase 34 HEAD, both via Chrome DevTools Performance panel, written to `.planning/phases/37-.../tti-snapshot.json`. Reconcile paper predictions in `.planning/research/color-design-audit.md` §4b/§4c against empirical results.
**Depends on**: Phase 34 (palette + icons must be live for empirical capture).
**Requirements**: closes deferred clauses of MII-EXT-11 (deuteranopia discriminability) and the D-22 TTI override accepted in Phase 34 (no new REQ-ID)
**Success Criteria** (what must be TRUE):
  1. 3 deuteranopia PNGs committed; reconciliation table in a `37-EMPIRICAL.md` reports paper vs empirical agreement per pair (7 within-family + 14 cross-family).
  2. `tti-snapshot.json` records `baseline_ms` (at `048e99c`) and `post_phase_ms` (at Phase 34 HEAD); delta documented; if regression > 10% a follow-up note explains.
  3. Any disagreement between paper and empirical for HIGH/MEDIUM-HIGH pairs (mikrobiologie↔molekulargenetik; pro↔seltene) drives a contingency icon swap or color-tweak commit.
**Plans:** 3/3 plans complete

Plans:
- [x] 37-01-PLAN.md — Wave 1: Capture 3 deuteranopia screenshots (checkpoint:human-verify) + write 37-EMPIRICAL.md §1+§2 reconciliation tables (7 within-family + 14 cross-family pairs); §3-§7 stubbed for downstream plans
- [x] 37-02-PLAN.md — Wave 1 (parallel): Twin-worktree TTI capture at 048e99c (baseline) and a7e4544 (post-phase); 3 runs per checkout via Chrome DevTools Performance panel (checkpoint:human-verify); write tti-snapshot.json with D-08 dual-gate verdict
- [x] 37-03-PLAN.md — Wave 2: Populate 37-EMPIRICAL.md §3-§7 (TTI summary + contradictions + contingency decision + future hardening); contingency icon swap iff HIGH/MEDIUM-HIGH borderline pair fails empirically (RESEARCH §Pitfall 5 — probe Tabler 3.41.1 availability before swap); update 34-06-UAT.md §1d/§2/§5 closure

**Effort**: ~0.5-1 day (mostly browser-driven; reconciliation writeup is small)
**Execution**: **Human-execution-bound** (Chrome DevTools Rendering + Performance panels)

### Phase 38: v1.5 HUMAN-UAT live-Blaze smoke tests (Phase 33 + Phase 35)
**Goal**: Run the 12 live-Blaze observational items from `33-HUMAN-UAT.md` (6 items) and `35-HUMAN-UAT.md` (6 items) in a single browser session against live Blaze + Synthea. Records pass/fail per test in updated HUMAN-UAT files; any fail surfaces as blocking gap that requires either a code fix or a documented user-acceptance override.
**Depends on**: Phases 31-35 (all Phase 33 + Phase 35 code must be live).
**Requirements**: closes Phase 33 SC5 (live-Blaze UAT clause) + Phase 35 SC5 (live-Blaze UAT clause) — no new REQ-ID; updates statuses on existing MII-EXT-04/06/07/08 + UAT-FU-01/02/05 from `human_needed` → `passed`
**Success Criteria** (what must be TRUE):
  1. All 12 tests in `33-HUMAN-UAT.md` + `35-HUMAN-UAT.md` updated with `result: pass` (or `result: fail` + linked fix commit / accepted override).
  2. Phase 33's `33-VERIFICATION.md` status flipped from `human_needed` → `passed` (with re-verification stanza pointing to Phase 38).
  3. Phase 35's `35-VERIFICATION.md` status flipped from `human_needed` → `passed` (with re-verification stanza pointing to Phase 38).
  4. Phase 38 SUMMARY records the live Blaze server URL + Synthea bundle ID used so the smoke session is reproducible.
**Plans**: TBD (2 tasks: walk 33-HUMAN-UAT 6 tests; walk 35-HUMAN-UAT 6 tests)
**Effort**: ~0.5-1 day (single browser session + writeups; assumes Blaze + Synthea already running)
**Execution**: **Human-execution-bound** (live Blaze + Synthea + browser required)

### Phase 38.1: Fix `_sort=-date` Blaze incompatibility (INSERTED)
**Goal**: Swap `_sort=-date` → `_sort=-_lastUpdated` (or remove the sort clause entirely) across 4 patient-detail components so per-patient FHIR resource searches stop returning HTTP 400 from Blaze 1.6.2. Restore the live-Blaze behavior of Phase 33's MII module tabs and clinical timeline that the Phase 38 walk found broken.
**Depends on**: Phase 38 (HUMAN-UAT walk that surfaced the regression).
**Requirements**: closes the 3 critical-severity hits in `33-HUMAN-UAT.md` Tests 1, 2, 6 (Laborbefund extraQuery; Timeline color/label; per-patient Laborbefund populated). No new REQ-IDs — sub-phase fixes existing MII-EXT-04 / MII-EXT-06 / MII-EXT-07 / MII-EXT-08 / UAT-FU-06 implementations whose Phase 33 verification was programmatic-only (jsdom mocks) and missed the Blaze sort-param incompatibility.
**Success Criteria** (what must be TRUE):
  1. All 4 source files updated to use a sort that Blaze 1.6.2 accepts (or no `_sort` clause at all):
     - `src/components/patients/MiiModuleTab.tsx:81` (every MII tab panel — base + extension)
     - `src/components/patients/ClinicalTimeline.tsx:72` (Zeitleiste — 4 TIMELINE_RESOURCE_TYPES)
     - `src/components/patients/PatientTimeline.tsx:122` ($everything view)
     - `src/components/patients/FhirResourcesView.tsx:132` (cross-resource patient view)
  2. Existing test suite stays green (no regressions in the 1054-test baseline).
  3. New regression test asserts the URL constructor for at least one of the patched sites does NOT include `_sort=-date` (and either contains `_sort=-_lastUpdated` or contains no `_sort` clause).
  4. Re-walk of Phase 33 Tests 1, 2, 6 against the same Blaze + Synthea fingerprint (`38-SESSION.md`) shows `result: pass` — appended into `33-HUMAN-UAT.md` as `→ fixed in Phase 38.1, commit <sha>` per D-03 (original `result: fail` rows preserved as historical record).
**Plans:** 1 plan

Plans:
- [ ] 38.1-01-PLAN.md — 4 atomic per-file `_sort=-date` → `_sort=-_lastUpdated` swaps in `MiiModuleTab.tsx`, `ClinicalTimeline.tsx`, `PatientTimeline.tsx`, `FhirResourcesView.tsx` + 2 regression-locking test assertions (`MiiModuleTab.test.tsx`, `ClinicalTimeline.test.tsx`) + final live-Blaze re-walk of Phase 33 HUMAN-UAT Tests 1, 2, 6 with `→ fixed in Phase 38.1, commit <sha>` evidence appends (preserves `result: fail` per D-03)
**Effort**: < 0.5 day (4 single-line swaps + 2 test-assertion additions + re-walk of 3 tests)
**Execution**: Mostly automatable — final re-walk step is human-execution-bound (browser session against live Blaze + Synthea, ideally inheriting Phase 38's session if still alive).

## Dependencies & Ordering

```
Phase 31 (UX-01 cascade) ──────────────────────┐
  Parallel-safe with 32.                        │
  File-overlap watch: ValidationPanel.tsx       │
  (ship 31 first, 32 rebases).                  │
                                                │
Phase 32 (EFF-R14 split) ──────────────────┐    │
  Parallel-safe with 31.                    │    │
  API-preserving via facade.                │    │
  Blocks Phase 35 UAT-FU-05 (per-type       │    │
  matrix) via per-metric contexts.          ├────┤
                                            │    │
                                            ▼    ▼
Phase 33 (MII schema + Collapse UI) ──┐   (both can merge before 35)
  Helpers → schema → UI shell.        │
  Subsumes UAT-FU-04 + UAT-FU-06.     │
  Independent of 31, 32.              │
  Blocks Phase 34.                    │
  Intra-phase order:                  │
    MII-EXT-07 (UAT-FU-06) →          │
    MII-EXT-01 (helpers) →            │
    MII-EXT-02 (schema) →             │
    MII-EXT-04/05/06 (UI) →           │
    MII-EXT-03/08 (fan-out + timeline)│
                                      ▼
Phase 34 (14 modules + palette + profiles)
  Data payload into Phase 33's shell.
  Per-module research + color audit are pre-tasks.
                                      │
                                      ▼
Phase 35 (UAT follow-ups + matrix)
  UAT-FU-01/02/03 independent — can land in parallel
  with 31-34 if a warm-up window opens.
  UAT-FU-05 (matrix) hard-depends on Phase 32.
```

**Key ordering constraints:**
- Phase 31 + Phase 32 are the two parallel-safe entry points. Recommend shipping Phase 31 first to avoid the `ValidationPanel.tsx` merge conflict; Phase 32 can start same day in a sibling branch and rebase.
- Phase 33 ships helpers BEFORE schema widening BEFORE UI/data — TypeScript cannot flag `===` on `string` vs `string | string[]`, so the mechanical codemod must land in its own commit before the type change (per PITFALLS #13).
- Phase 34 depends on Phase 33's schema + UI shell. The 14-module data rollout is a single coherent drop even though research + palette + profile-fetch can proceed in parallel during Phase 33's execution.
- Phase 35 UAT-FU-05 (per-type matrix) depends on Phase 32's per-metric contexts. UAT-FU-01/02/03 are independent of every other phase and can be done any time after Phase 30 baseline.
- UAT-FU-04 (Dashboard MII tile scoping) and UAT-FU-06 (empty per-patient MII/FHIR panels) are absorbed into Phase 33 because their fixes propagate directly into the 21-module rollout — solving them once prevents 14-way regression.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31. UX-01 External Validator Cascade | v1.5 | 2/2 | Complete    | 2026-04-25 |
| 32. EFF-R14 QualityMetricsContext Split | v1.5 | 4/4 | Complete    | 2026-04-24 |
| 33. MII Schema + Extension-Modules Collapse UI | v1.5 | 7/7 | Complete    | 2026-04-24 |
| 34. 14 MII Extension Modules + Palette + Profiles | v1.5 | 6/6 | Complete    | 2026-04-25 |
| 35. Phase-30 UAT Follow-ups + Per-Type Quality Matrix | v1.5 | 4/4 | Complete    | 2026-04-25 |
| 36. Phase 34 profile lazy-load (bundle-size waiver follow-up) | v1.5 | 4/4 | Complete    | 2026-04-26 |
| 37. Phase 34 empirical UAT capture (deuteranopia + TTI) | v1.5 | 3/3 | Complete    | 2026-04-28 |
| 38. v1.5 HUMAN-UAT live-Blaze smoke tests (Phase 33 + Phase 35) | v1.5 | 4/3 | Complete    | 2026-04-28 |

## Effort Totals (v1.5)

| Phase | Theme | Estimated Effort |
|-------|-------|------------------|
| 31 | UX-01 External Validator Cascade | ~2-2.5 days |
| 32 | EFF-R14 QualityMetricsContext Split | ~2-2.5 days |
| 33 | MII Schema Foundation + Extension-Modules Collapse UI | ~2.5-3 days |
| 34 | 14 MII Extension Modules + Palette + Bundled Profiles | ~3-3.5 days |
| 35 | Phase-30 UAT Follow-ups + Per-Type Quality Matrix | ~2-2.5 days |
| 36 | Phase 34 profile lazy-load (bundle-size waiver follow-up) | ~0.5-1 day |
| 37 | Phase 34 empirical UAT capture (deuteranopia + TTI) | ~0.5-1 day |
| 38 | v1.5 HUMAN-UAT live-Blaze smoke tests (Phase 33 + Phase 35) | ~0.5-1 day |
| **Total** | — | **~13-16.5 focused engineering days** (original 11.5-13.5 for phases 31-35 + ~1.5-3 days for promoted backlog phases 36-38; phases 37 + 38 are human-execution-bound and incremental on a single browser session) |

**Calibration vs v1.4:** The v1.4 baseline landed 11-13 days across 8 phases (including Phase 30's ~3-day layout redesign). v1.5 compresses to 5 phases with similar day-count because Phase 34's 14-module payload + Phase 33's codemod are denser than a typical v1.4 dedup phase. Phase 24's ~1.5 days is the reference point for a foundational hook (comparable to Phase 32's internal refactor); Phase 25's ~2 days for ≥400-LOC dedup maps to Phase 33's codemod scale; Phase 30's ~3-4 days for 7-view layout redesign maps to Phase 34's 21-module palette + profile rollout.

## Research References (v1.5)

- `.planning/research/SUMMARY.md` — cross-document synthesis, 16 locked decisions, 4 hard phase-ordering constraints, top-5 pitfalls, resolved tensions
- `.planning/research/STACK.md` — single new devDep (`fhir-package-loader@^2.2.4`), 14 MII extension packages with versions + licenses, zero new runtime deps, vanilla-React verdict on EFF-R14
- `.planning/research/FEATURES.md` — P1/P2/P3 priority breakdown, anti-features with rationale, 21-module UX patterns, per-type matrix table-stakes columns
- `.planning/research/ARCHITECTURE.md` — 7 integration questions file:line-verified, MII consumer enumeration (8 sites), EFF-R14 producer/consumer map, phase dependency graph
- `.planning/research/PITFALLS.md` — 20 pitfalls with warning signs + prevention + phase mapping (top 5: PHI-gate bypass, 22-tab fetch storm, schema-widening silent breakage, probe-cache staleness, re-subscription loops)
- `.planning/REQUIREMENTS.md` — 31 REQ-IDs across 4 scope groups with traceability table
- `.planning/milestones/v1.4-phases/29-backlog-ux/29-02-PLAN.md` — UX-01 plan preserved verbatim with decisions D-07..D-16 locked (Phase 31 executes this verbatim)
- `.planning/milestones/v1.4-phases/30-layout-redesign/30-UAT.md` — 6 off-phase follow-ups (Phase 33 + Phase 35 close these)

## Backlog

_All v1.5 backlog items (former 999.1, 999.2, 999.3, 999.4) were promoted into active phases 36, 37, 38 on 2026-04-25 per `/gsd-plan-milestone-gaps`. See §Phase Details for Phase 36, 37, 38._

### Phase 999.1: Explorer — toggle to hide zero-count resource types (BACKLOG)

**Goal:** Add a Mantine `Switch` near the top of the Explorer resource-type landing (`/explorer`) labeled "Hide empty resource types" (default off, persisted to localStorage). When on, types with `counts[type] === 0` collapse out of the list. When off, the existing full list is shown.

**Why:** Today `/explorer` lists every supported FHIR resource type. Many show 0 against typical Synthea bundles (e.g. on the Phase 38 walk: `MedicationStatement`, `AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest` were all zero). The list is noisy when most types are empty.

**Likely files:**
- `src/components/explorer/ResourceTypeLanding.tsx` — landing component
- Counts source: same map the Dashboard uses (`src/components/dashboard/DashboardPage.tsx`)

**Source:** Verifier observation surfaced during Phase 38 HUMAN-UAT walk (2026-04-28), Plan 38-02 Test 1 (Explorer Date/Status columns across 6 types). The MedicationStatement empty-state navigation made the noise pattern obvious.

**Requirements:** TBD
**Plans:** 4/3 plans complete

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: Quality completeness — sort non-empty resource types to the top (BACKLOG)

**Goal:** Change the default sort behavior in `/quality?tab=completeness` so resource types with actual data (non-empty `total`) appear at the top of the per-type table; types with no records (`total === 0`, pct=null) sink to the bottom.

**Why:** Today the panel's default sort is `completeness ASC / worst-first` (`CompletenessPanel.tsx`). Zero-count types map their pct to `null → -1` in `compareRows`, which under ascending sort puts them BEFORE every populated type. Result: against a Synthea bundle the user opens the page and sees five empty types stacked at the top (`AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest`, `MedicationStatement` — all 0 records) before any meaningful row. Verifier observation: "non-empty Resources in `/quality?tab=completeness` are at the end rather than at the top of the list."

**Suggested fix:** Treat `pct === null` as "not-applicable" rather than "worst possible" in `compareRows`. Push N/A rows to the end regardless of sort direction (mirror the existing `aSettled !== bSettled` pattern that already pushes loading/error rows to the end). Possibly add a small "—" badge or muted styling for the empty rows so it's obvious why they're sorted to the bottom.

**Likely files:**
- `src/components/quality/CompletenessPanel.tsx` — `compareRows` (line ~59) and `toRow` (line ~50ish)
- Same pattern likely applies to `CoveragePanel`, `ValidationPanel`, `ReferencesPanel` if they sort similarly — audit before fixing.

**Source:** Verifier observation during Phase 38 HUMAN-UAT walk (2026-04-28).

**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

