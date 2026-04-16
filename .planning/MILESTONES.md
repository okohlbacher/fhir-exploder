# Milestones

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
