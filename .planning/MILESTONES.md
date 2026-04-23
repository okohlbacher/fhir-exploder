# Milestones

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
