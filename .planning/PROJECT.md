# FHIR Exploder

## What This Is

A local-first React application for exploring, browsing, and auditing data on a FHIR server (Blaze). Built with Medplum React components, it provides three entry points — patient-centric browsing, generic resource exploration, and data quality auditing — with the MII Kerndatensatz as an optional navigation lens. Resolves terminology display values via the MII Terminology Server.

As of v1.3, the data quality surface is the most developed of the three entry points: it covers completeness, coding coverage, profile conformance, value set conformance, cardinality, temporal/age/duration plausibility, lab reference ranges, duplicate detection (patient matching + content hash), relational integrity (broken refs + orphans), configurable breach thresholds, trend history, PDF export, and cohort-scoped analysis — all wired through a shared drill-down pattern that links every finding back to the underlying resource detail view. Cohorts can be defined interactively (date range, condition code, reference list), programmatically (FHIRPath), or imported from the MII FDPG Codex Structured Query format.

## Core Value

Connect to a Blaze FHIR server and make its contents human-readable and navigable — from patient-level clinical views down to raw FHIR JSON — without requiring deep FHIR expertise to understand what's in there.

## Requirements

### Validated (v1.0 — shipped 2026-04-12)

- [x] Blaze connectivity with configurable URL + auth (open/basic/bearer) via settings.yaml — Phase 1
- [x] Generic resource explorer: browse, search, paginate, inspect any FHIR resource type — Phase 2
- [x] Three display modes per resource (human-readable/clinical+raw/developer) — Phase 2
- [x] Reference field click-through with patient-context preservation — Phase 2 + Phase 6 (gap closure)
- [x] `_include` / `_revinclude` for related resources — Phase 2
- [x] Patient-centric browsing with MII Kerndatensatz module tabs + clinical timeline — Phase 3
- [x] MII Kerndatensatz as optional navigation lens alongside raw FHIR — Phase 3
- [x] CodeableConcept resolution via MII Terminology Server (Ontoserver) with LRU cache + graceful fallback — Phase 4
- [x] Data quality dashboard: counts, field completeness, coding coverage, profile validation — Phase 5
- [x] Sampling-based quality analysis (10..1000 clamp) to handle 50K+ resource sets — Phase 5
- [x] Settings management via settings.yaml (server URL, auth, terminology, validation) — Phase 1 + Phase 4 + Phase 5

### Validated (v1.1 — shipped 2026-04-12)

- [x] Dev feedback system + 8 user-feedback-driven UI improvements (custom search table, ResourcePropertyTable, collapsible JSON tree, dashboard tiles, wildcard search, patient related resources, Blaze compatibility fixes)

### Validated (v1.2 — shipped 2026-04-15)

- [x] **DEBT-01**: All 17 info-level code review findings from v1.0 phases 4+5 resolved — Phase 14
- [x] **DEBT-02**: `npm run build` (tsc -b) exits with zero errors — Phase 14 → Phase 20 (gap closure)
- [x] **DQ-01**: Quality metric drill-down — click any dashboard tile to see the specific resources and fields causing the issue — Phase 15
- [x] **DQ-02**: Each drill-down entry links to the resource detail view — Phase 15
- [x] **DQ-03**: Value set conformance — flag coded values that don't belong to the expected value set for their field — Phase 16
- [x] **DQ-04**: Cardinality validation — flag missing required fields or unexpected repeats per resource type — Phase 16
- [x] **DQ-05**: Temporal plausibility — flag future dates, encounter end before start, negative age, implausible durations — Phase 16
- [x] **DQ-06**: Lab reference range validation — flag lab observations outside configurable reference ranges — Phase 16
- [x] **DQ-07**: Potential duplicate patients by name + date of birth — Phase 17
- [x] **DQ-08**: Potential duplicate resources by content hash with differing IDs — Phase 17
- [x] **DQ-09**: Broken references (dangling pointers to non-existent resources) — Phase 17
- [x] **DQ-10**: Orphan resources (resources that should reference a parent but don't) — Phase 17
- [x] **DQ-11**: User-configurable quality thresholds per metric, persisting across reloads — Phase 18
- [x] **DQ-12**: Dashboard visually highlights metrics that breach their configured thresholds — Phase 18
- [x] **QUAL-05**: Chart showing how quality metrics change across multiple measurement points — Phase 19
- [x] **QUAL-06**: Generate and download a PDF quality report reflecting the current dashboard state — Phase 19

### Validated (v1.3 — shipped 2026-04-16)

- [x] **CHRT-01**: Interactive cohort builder with date range + condition code + reference-list inclusion — Phase 21
- [x] **CHRT-02**: Cohort definitions persist in `localStorage` under `quality.cohorts.v1` and survive reloads — Phase 21
- [x] **CHRT-03**: Dashboard quality analyses (7 panels) scoped to active cohort, composing with resource-type filter — Phase 21
- [x] **CHRT-04**: "Cohort" → "Resource types" rename + legacy-key migration + trend snapshot rewrite + PDF dual-line surface — Phase 21
- [x] **CHRT-05**: FHIRPath programmatic cohort definition with dry-run count validation (AST-to-FHIR-search-URL translator) — Phase 22
- [x] **CHRT-06**: MII FDPG Codex Structured Query v3 import/export with 1 MB cap + prototype-pollution defence — Phase 22
- [x] **CHRT-07**: Cohort CRUD — Edit (with D-10 cache invalidation), Duplicate ("(copy)" suffix), Delete (clears active) — Phase 22

### Validated (v1.4 — shipped 2026-04-23)

Hardening + tech-debt sweep + mid-milestone layout redesign. 29/31 original reqs satisfied; UX-01 (external validator cascade) deferred to v1.5, UX-02 (OverviewStrip rings) satisfied via Phase 30's more aggressive redesign.

- [x] **CLOSE-01..07**: v1.3 close-out — 3 code-review warnings (W1/W2/W3), 2 integration notes (I1/I2), 8 live-Blaze UAT, nyquist sign-off path — Phase 23
- [x] **FOUND-01..04**: Cross-mount count cache, per-server `Map<serverUrl, QualityMetricsCache>` with 2-entry LRU, `useAsyncRun<TIssue>` hook, closure-scoped cancellation throughout — Phase 24
- [x] **QDDEP-01..06**: `perPathExamples` in `PerTypeCoverageReport`, `<DrillDownShell>`, `useSampleWalker<T>`, drop `keepMounted` on Completeness + Coding, shared `SortableTh`, `<RunProgress>` — Phase 25
- [x] **SHELL-01..05**: `<ConnectionGatedOutlet>`, `searchByIdentifierPrefix`, sidebar nested-route activation (`useMatch`), `Anchor component={Link}` standardization, useCallback-wrapped `setSettings` — Phase 26
- [x] **EFF-01..03**: `ResourceIssueTable` pagination memo, `React.lazy()` drill-down routes with chunk-load retry, `rollup-plugin-visualizer` treemap — Phase 27 (EFF-R14 per-metric context split explicitly deferred to v1.5+)
- [x] **SWEEP-01..04**: `toRecord` helper sweep, en/em-dash unification, 4 drill-down eslint-disables dropped, ref-type fixes — Phase 28
- [x] **UX-02** (formally Phase 29, shipped via Phase 30): OverviewStrip ring reduction — satisfied by Phase 30's complete ring drop
- [x] **TEST-REPAIR-01..02** (Phase 29.5): 22 → 0 baseline test failures (`SettingsProvider` / `ConnectionProvider` wrappers, `fhirUrl` mock, `useSearchParams` router mock, stale-DOM assertion updates). Unblocked the Phase 30 test gate with zero production changes.
- [x] **UX-REDESIGN-01..08** (Phase 30): Design tokens (IBM Plex + indigo + warm neutrals) + 7-view restyle — Sidebar Server card + nested Quality sub-nav; Dashboard 4-card strip + MII Kerndatensatz tile grid; Patients list filter card + active-filter chips + row-index + initials avatar; Quality 2-tier toolbar + no-ring `OverviewStrip` + pills tabs + inline overall-%; Explorer 240-px `<ResourceTypeRail>` + Category breadcrumb; Patient detail 3-col header + Raw JSON/`$everything` actions + pills MII tabs; Cohorts 2-col grid

### Active (v1.5 candidates — pending scope)

- [ ] **UX-01** (deferred from Phase 29): External FHIR validator cascade (external → server `$validate` → local structural) with PHI gate, AbortController, probe cache, and `normalizeOperationOutcomeIssue` — `29-02-PLAN.md` preserved verbatim in the archive
- [x] **EFF-R14** (deferred from Phase 27): Split `QualityMetricsContext` so single-metric updates re-render only their own tile *(complete 2026-04-24, Phase 32)* — 7 per-metric `React.createContext` providers + `<QualityMetricsProviders>` composer, facade `useQualityMetrics()` preserved over composition, Profiler-based per-tile isolation test passes 1/1. EFF-R14-01..06 satisfied.
- [x] **Phase 31 (UX-01) — external FHIR validator cascade** *(complete 2026-04-23)* — Three-tier cascade (external HTTP → server `$validate` → local structural) with PHI gate alignment, OperationOutcome normalizer extraction, AbortSignal threading, CORS heuristic, probe cache, and Active-strategy status line. VAL-01..VAL-05 satisfied.
- [ ] **Phase 30 UAT follow-ups (6)**: Explorer Date/Status per-resource-type extractor; HumanReadableView extension cleanup (identifier-system tooltip, address-extension modal); ResourceDetailPage remove *Clinical + raw* + rename *Developer → JSON*; empty per-patient MII/FHIR panel investigation; Dashboard MII tile count scoping or explicit labelling; per-type quality matrix card under Counts tab
- [ ] **Phase 999.1**: 14 MII Kerndatensatz extension modules (Onkologie, Kardiologie, Intensivmedizin, Bildgebung, Pathologie, Mikrobiologie, Molekulargenetik, Seltene Erkrankungen, Symptom, Biobank, Studie, Dokument, MTB, PRO). Requires multi-type module schema, 21-tab UI grouping, per-module patient search param (some use `subject=`), Mantine color strategy for 21 modules.

## Current State

**v1.4 shipped 2026-04-23** — 11 phases (23-30 plus 29.5; 29 superseded), 35 plans, 51 tasks, 175 commits on main. Production-code diff: src/ +7,611 / −2,360 across 108 files. Test suite: 836 passed / 22 todo / 3 skipped / 0 failed. `npm run build` clean. See [MILESTONES.md](MILESTONES.md) for the full accomplishments list.

**App shape after v1.4:**

- **Chrome.** Sidebar now consolidates the two status pills into a single Server card (uppercase label, Connected badge, terminology row) with click-to-modal on each row. Quality sub-nav renders as indented children (Overview / Cohorts / Thresholds) on `/quality/*` with the "most-specific-wins" active-row rule. Active rows get a 2-px indigo left rail + white background.
- **Dashboard.** Four-tile summary strip (Total Resources / Resource Types / With Data / Patients) with big mono tabular values, two collapsible sections open by default: "Data by Category" (swatch + mono count + 3-px progress bar, no rings) and "MII Kerndatensatz Modules" (4-col grid tile per module).
- **Patients.** Single `<Card>` filter bar (search + `⌘K` kbd hint, age-min / age-max with en-dash, gender, search button right-pushed). Active-filter chip row below dismisses per-filter plus Clear all. Table gains leading row-index mono cell and 28-px initials avatar in Name cell.
- **Quality.** Two-tier toolbar — title + action buttons on top, scope (Resource types / Active cohort / Sample size) in a `<Card>` below. `SummaryCard` restyled: uppercase dimmed label, `within` / `near` / `breach` badge top-right, big mono value, 3-px fill bar (RingProgress removed entirely). Tabs use `variant="pills"` with inline overall-% (e.g. `Completeness · 92%`).
- **Explorer.** 240-px `<ResourceTypeRail>` left of every `/explorer/*` route — search input, grouped-by-category list with monospace type names + dimmed mono counts + indigo active rail. Breadcrumb reads `Explorer › <Category> › <Type>`.
- **Patient detail.** 3-col `PatientHeaderCard` (64-px avatar / name + badges + demographics / Raw JSON button + `$everything` icon). MII module tabs render as pills with contrast-fixed subtitles. `MII_MODULES` order: Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation.
- **Cohorts.** 2-column layout (`1fr / 380px` on desktop, stacks on <960 px) — saved-cohorts table left, live builder preview right.

**Design system.** IBM Plex Sans + Mono fonts (preloaded via `index.html`); Mantine theme uses `primaryColor: 'indigo'`, warm-neutral gray ramp override, radii `sm/md/lg = 4/6/10 px`, component defaults on Card / Table / Button / Tabs.

**localStorage keys** unchanged from v1.3: `quality.thresholds.v1`, `quality.trends.v1`, `quality.cohorts.v1`, `quality.activeCohortId.v1`, `quality.resourceTypes.v1`.

## Current Milestone: v1.5 Validation, Performance & MII Extensions

**Goal:** Close the v1.4 carry-over (external FHIR validator cascade, `QualityMetricsContext` re-render split, six Phase-30 UAT follow-ups) and ship the 14 MII Kerndatensatz extension modules with a collapsible **Extension modules** section below the base MII tabs on `/patients/:id`.

**Target features (four scope groups):**

1. **UX-01 external FHIR validator cascade** — Execute `29-02-PLAN.md` verbatim. Three-tier validator (external → server `$validate` → local structural) gated by the existing PHI acknowledgment, wrapped in `AbortController` with 15 s timeout, per-`(serverUrl, resourceType)` probe cache, `normalizeOperationOutcomeIssue` mapper, and "Active strategy: external / server / local" status line in `ValidationPanel`.
2. **EFF-R14 QualityMetricsContext split** — Per-metric context providers (Option A). Single metric update must re-render only its own tile instead of all ≤8 panels. Risk-weighted refactor across ~20 files; no public API changes to consumers.
3. **Phase-30 UAT follow-ups (6)** — Explorer Date/Status per-resource-type extractor; HumanReadableView extension cleanup (identifier-system → tooltip, address-extension JSON → modal, extensions section at bottom); ResourceDetailPage remove *Clinical + raw* view + rename *Developer* tab → *JSON*; investigate empty per-patient MII/FHIR Resources panels on Synthea test patient; Dashboard MII tile count scoping or explicit server-wide label; per-type quality matrix card under Counts tab (blocked on EFF-R14).
4. **MII extension modules (Phase 999.1 promoted)** — Schema change: `MiiModule.fhirResourceType: string | string[]` + `category: 'base' | 'extension'` field. Collapsible **Extension modules** heading below the 7 base-module tabs on `/patients/:id`. Per-module patient search param (some use `subject=` not `patient=`). Empty-state UX for zero-resource extension modules. Color strategy: per-category palette or shape/icon differentiation (Mantine's 14 colors don't cover 21 modules). Optional relevance filtering (hide extension modules with no matching resources).

**Ordering:**
- UX-01 validator and EFF-R14 are independent; can parallelize.
- MII extensions depend on the schema change (multi-type + category fields) landing first.
- Per-type quality matrix (Phase-30 follow-up #3) depends on EFF-R14 per-metric context providers.

**Key context:**
- Phase numbering continues from 30 (v1.4's last phase). No `--reset-phase-numbers`.
- Design system unchanged — Phase 30 tokens (IBM Plex, indigo, warm neutrals) remain baseline.
- Estimate: ~3-4 focused engineering weeks — larger than v1.4 (7 days). Single milestone, not split.
- 4-researcher parallel research step is enabled to explore MII extension module profiles and color strategy before requirements definition.

### Out of Scope

- Write operations (creating/updating/deleting FHIR resources) — this is a read-only explorer
- User authentication/authorization for the app itself — local-only tool, no login
- SMART on FHIR launch context — not needed for direct Blaze access
- Multi-server simultaneous browsing — one server connection at a time
- Data export/ETL — focus is exploration, not extraction (quality PDF export in v1.2 is a visual report, not bulk data)
- ETL-integrated quality screening — FHIR Exploder is a browser, not an ETL tool
- Federated cohort queries (server-side CQL execution) — v1.3 shipped client-side definition only; server-side evaluation deferred
- Cohort versioning / audit history — v1.3 shipped simple create/edit/delete; no change log
- Phenotype-style multi-criteria builder with complex boolean logic — deferred beyond v1.3

## Context

- **FHIR Server:** Blaze (https://github.com/samply/blaze), running locally in a container at localhost:8080
- **UI Components:** Medplum React (`@medplum/react`) + Mantine 8 provide ResourceTable, BundleDisplay, and resource-specific rendering components
- **Type System:** `@medplum/fhirtypes` for TypeScript FHIR R4 type definitions
- **Terminology:** MII Terminology Server is publicly accessible, used for $lookup and $translate operations on CodeableConcepts
- **MII Kerndatensatz modules:** Person (Patient), Fall (Encounter), Diagnose (Condition), Prozedur (Procedure), Laborbefund (Observation), Medikation (MedicationStatement/MedicationRequest), Consent
- **Data quality theoretical foundation:** Kahn et al. framework (conformance, completeness, plausibility) as applied in Spengler (2021) "Improving Data Quality in Medical Research: A Monitoring Architecture for Clinical and Translational Data Warehouses"
- **Data scale:** Production-scale datasets (50K+ resources), so efficient FHIR search with _count, _sort, and pagination links is critical
- **Stack:** TypeScript + React 18 + Vite, Mantine 8, @mantine/charts (Recharts under the hood), jspdf + html-to-image for PDF export
- **Persistence:** `localStorage` keyed by `quality.thresholds.v1` (thresholds), `quality.trends.v1` (snapshot history), `quality.cohorts.v1` (cohorts), `quality.activeCohortId.v1`, `quality.resourceTypes.v1`
- **Current codebase:** ~35,000 LOC TypeScript/TSX, `npm run build` + `tsc -b --noEmit` both clean

## Constraints

- **Tech stack**: React + Vite + TypeScript with Medplum React components — chosen for FHIR-native rendering
- **Runtime**: Local-only, runs in browser against localhost or reachable FHIR server
- **FHIR version**: R4 (Blaze default, MII profiles are R4)
- **Terminology**: Must handle terminology server being unavailable gracefully (fall back to raw codes)
- **License**: MIT (see `LICENSE` at the repo root)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Medplum React for FHIR rendering | TypeScript-first, comprehensive resource components, maintained | ✓ Validated Phase 1 |
| settings.yaml for configuration | Simple file-based config, no database needed for a local tool | ✓ Validated Phase 1 |
| MII Kerndatensatz as optional lens | Users may want MII-structured OR raw FHIR views depending on task | ✓ Validated Phase 3 |
| Three auth modes (open/basic/token) | Covers common Blaze deployment configurations | ✓ Validated Phase 1 |
| Mantine-only visuals for v1.0 (no charts library) | Bundle budget (~150KB savings); Progress/RingProgress satisfy visual indicator needs | ✓ Validated v1.0 |
| Dual-source profile validation (structural + optional remote) | Blaze does not implement $validate; structural walker always available, remote via user-configured validatorUrl | ✓ Validated Phase 5 |
| Sampling over full scans | 50K+ resources can OOM browser; first N per type with client-side 10..1000 clamp | ✓ Validated Phase 5 |
| PHI acknowledgment gate for remote validation | Explicit user consent before POSTing full resources to external validator | ✓ Validated Phase 7 |
| Adopted `@mantine/charts` (Recharts) in v1.2 for trends | `v1.0` constraint lifted — trend visualization requires proper charting; Mantine wrapper maintains theming cohesion | ✓ Validated Phase 19 |
| Shared `ResourceIssueTable` as drill-down primitive | Single component reused across 8+ drill-down pages keeps patterns consistent | ✓ Validated Phase 15 |
| `NormalizedIssue` type for all quality findings | Unifies completeness, coding, validation, conformance, plausibility, duplicates, references into one shape → enables cross-cutting drill-down | ✓ Validated Phase 15 |
| Pure-function quality engines + state-machine hooks | Engines testable without React; hooks manage loading/error/success state for each engine | ✓ Validated Phase 17 |
| Three-state threshold override (enabled/disabled/default) | User can explicitly disable alerting per metric, not just raise threshold | ✓ Validated Phase 18 |
| Breach coloring preserved historically in trends | When user changes a threshold, past snapshots retain their original breach state (D-11) | ✓ Validated Phase 19 |
| Off-screen React portal + html-to-image + jsPDF for PDF | Deterministic layout independent of viewport; font-readiness gate prevents race | ✓ Validated Phase 19 |
| TS2352 double-cast pattern (`as unknown as T`) | Single-cast rejected by strict mode on `unknown`-typed walker params; double-cast is the sanctioned escape hatch | ✓ Validated Phase 20 |
| Retrospective VERIFICATION.md acceptable for gap closure | When functional code satisfies requirements but formal verification was skipped at phase time, retrospective verification against existing artifacts closes the audit gap without re-execution | ✓ Validated Phase 20 |
| Discriminated-union `CohortCriterion` with `assertNever` tail | Four variants (date-range, condition-code, reference-list, fhirpath) extended without runtime type-switching; exhaustive-check surfaces missing branches at compile time | ✓ Validated Phase 22 |
| D-10 resolver cache keyed on `cohort.id + updatedAt` | Edit-with-active triggers dashboard recompute without cache poisoning; historic snapshots retain their original resolved patient sets | ✓ Validated Phase 22 |
| Legacy localStorage key migration in parent `useEffect` before child reads | `QualityLayout` mount effect runs `migrateLegacyResourceTypeKey` before any `useLocalStorage` child hook fires — prevents race where child reads old key | ✓ Validated Phase 21 |
| GET-vs-POST cutover at 40 patient IDs in `sampleResources` | URL length limits on long `patient=` param lists; switch to `POST /_search` form-urlencoded body above threshold | ✓ Validated Phase 21 |
| Medplum AST (`parseFhirPath`) + whitelisted operator/path mapping | Safe FHIRPath→FHIR search translation without string concat; `URLSearchParams` only, rejects `and`/`or`/`exists()` with precise errors | ✓ Validated Phase 22 |
| 1 MB file-size cap + field-by-field parse for FDPG JSON import | Prevents DoS via oversized payload and prototype pollution via `__proto__`/`constructor` keys — no `Object.assign` or spread on parsed input | ✓ Validated Phase 22 |
| `FileButton` + `downloadString` for cohort import/export | Browser-native file I/O with no dependencies; jsdom untestable surface captured as human UAT | ✓ Validated Phase 22 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-24 — v1.5 in progress. Phase 33 (MII Schema Foundation + Extension-Modules Collapse UI) complete: 4 helpers (`fhirResourceTypesOf`, `findModuleForType`, `getPatientSearchParamForType`, `getExtraQueryForType`) exported from `src/utils/mii-modules.ts`; `MiiModule.fhirResourceType` widened to `string | string[]` plus required `category: 'base' | 'extension'` and optional `patientSearchParamOverrides` / `extraQueryByType` maps; `MiiModuleTab` fans out N concurrent FHIR searches via `Promise.all(types.map(...))` with per-type `.catch()`; `MiiModuleTabs` partitions base vs extension with a `<Collapse>` extension section (deep-link auto-expand, selective `keepMounted`); Dashboard MII tile grid partitions base vs extension behind a "Show extension modules" toggle, heading clarified to "MII Kerndatensatz · Server-wide totals" (UAT-FU-04 closure), tile click opens a Mantine `<Drawer>` with "Open in Explorer" (replaces `navigate('/patients')`, no new fetches); UAT-FU-06 root-caused and fixed via `extraQuery` URL append at `MiiModuleTab.tsx:81` plus D-17 per-module `patientSearchParam` contract test; `ClinicalTimeline` migrated to `findModuleForType` with multi-type regression coverage. MII-EXT-01..08 satisfied; full suite 902 passing / 22 todo / 0 failing; 6 human smoke-test items shelved to backlog Phase 999.1. Next: Phase 34 — 14 MII Extension Modules + Palette + Bundled Profiles.*
