# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- ✅ **v1.4 -- Hardening & Tech-Debt Sweep (shipped 2026-04-23)** -- [Archive](milestones/v1.4-ROADMAP.md) . [Requirements](milestones/v1.4-REQUIREMENTS.md) . [Audit](milestones/v1.4-MILESTONE-AUDIT.md)
- 🚧 **v1.5 -- Validation, Performance & MII Extensions (in progress, started 2026-04-23)** -- phases 31-35, 31 requirements

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

### 🚧 v1.5 Validation, Performance & MII Extensions (Phases 31-35)

- [~] **Phase 31: UX-01 External Validator Cascade** — Execute the preserved `29-02-PLAN.md` verbatim: three-tier cascade (external → server `$validate` → local structural), PHI-gate extraction, `normalizeOperationOutcomeIssue`, probe cache, AbortController + 15 s timeout, active-strategy status line. Parallel-safe with Phase 32. (31-01 completed 2026-04-23; 31-02 gap-closure in progress — closes CR-01 PHI ack key mismatch)
- [x] **Phase 32: EFF-R14 QualityMetricsContext Split** — Option A: 7 per-metric `React.createContext` providers + `<QualityMetricsProviders>` composer. Facade `useQualityMetrics()` preserved. Parallel-safe with Phase 31 (merge-conflict watch on `ValidationPanel.tsx`). (completed 2026-04-23)
- [ ] **Phase 33: MII Schema Foundation + Extension-Modules Collapse UI** — Helpers-first refactor (`fhirResourceTypesOf`, `findModuleForType`, `getPatientSearchParamForType`), schema widening (`fhirResourceType: string | string[]` + `category` + `patientSearchParamOverrides?`), `MiiModuleTab` fan-out, collapsible Extension modules section. Absorbs UAT-FU-04 (Dashboard MII tile scoping) and UAT-FU-06 (empty per-patient MII/FHIR panel investigation).
- [ ] **Phase 34: 14 MII Extension Modules + Palette + Bundled Profiles** — 14 extension module entries, 7 custom `MantineColorsTuple`s (WCAG AA audit), 21 Tabler icons, `scripts/fetch-mii-profiles.mjs` via `fhir-package-loader@^2.2.4` devDep + `prepare` lifecycle, CC-BY-4.0 attribution, dimmed empty-state + "Show N empty" toggle.
- [ ] **Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix** — UAT-FU-01 Explorer Date/Status extractor (TDD), UAT-FU-02 HumanReadableView extension cleanup, UAT-FU-03 ResourceDetailPage mode removal + Developer→JSON rename, UAT-FU-05 per-type quality matrix card under Counts tab (requires Phase 32).

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
**Plans**: TBD (Task 1: per-module spec research + color audit; Task 2: palette + icons added to theme + MII_MODULES; Task 3: fetch-mii-profiles script + prepare hook + attribution; Task 4: 14 module entries + empty-state UX)
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
**Plans**: TBD (UAT-FU-01 extractor; UAT-FU-02 HumanReadableView cleanup; UAT-FU-03 mode cleanup; UAT-FU-05 per-type matrix)
**Effort**: ~2-2.5 days (UAT-FU-01 ~0.5 day via TDD; UAT-FU-02 ~0.5 day; UAT-FU-03 ~0.25 day mechanical rename; UAT-FU-05 ~1-1.25 day — matrix is smaller than OverviewStrip because `SortableTh`, `ResourceIssueTable`, and breach colors are already primitives)
**UI hint**: yes (per-type matrix table under Counts, HumanReadableView modal, SegmentedControl trim)

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
| 31. UX-01 External Validator Cascade | v1.5 | 2/2 | Complete    | 2026-04-23 |
| 32. EFF-R14 QualityMetricsContext Split | v1.5 | 4/4 | Complete    | 2026-04-24 |
| 33. MII Schema + Extension-Modules Collapse UI | v1.5 | 1/7 | In Progress|  |
| 34. 14 MII Extension Modules + Palette + Profiles | v1.5 | 0/? | 📋 Not started | — |
| 35. Phase-30 UAT Follow-ups + Per-Type Quality Matrix | v1.5 | 0/? | 📋 Not started | — |

## Effort Totals (v1.5)

| Phase | Theme | Estimated Effort |
|-------|-------|------------------|
| 31 | UX-01 External Validator Cascade | ~2-2.5 days |
| 32 | EFF-R14 QualityMetricsContext Split | ~2-2.5 days |
| 33 | MII Schema Foundation + Extension-Modules Collapse UI | ~2.5-3 days |
| 34 | 14 MII Extension Modules + Palette + Bundled Profiles | ~3-3.5 days |
| 35 | Phase-30 UAT Follow-ups + Per-Type Quality Matrix | ~2-2.5 days |
| **Total** | — | **~11.5-13.5 focused engineering days** (≈3-4 calendar weeks with parallelism on 31/32 and on UAT-FU-01/02/03) |

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
