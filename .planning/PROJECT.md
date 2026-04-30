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

**v1.5 shipped 2026-04-29** — 10 phases (31-38 plus inserted 38.1, 38.2), 32 plans, 79 tasks. v1.4 baseline: 836 tests passing; v1.5 final: 1064 passing / 22 todo / 0 failing. `npm run build` clean. Notable shipped: three-tier FHIR validator cascade (Phase 31), per-metric `QualityMetricsContext` split (Phase 32), 21-module MII palette + lazy-loaded bundled profiles (Phases 33–34, 36), per-type quality matrix (Phase 35), live-Blaze HUMAN-UAT smoke tests (Phase 38), `_sort=-date` Blaze 400 fix (Phase 38.1), Quantity-render dispatch reorder (Phase 38.2). See [MILESTONES.md](MILESTONES.md) and [milestones/v1.5-MILESTONE-AUDIT.md](milestones/v1.5-MILESTONE-AUDIT.md).

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

## Current Milestone: v1.6 Hardening, UX Polish & Carry-Overs

**Goal:** Close v1.5 tech-debt carry-overs, ship Explorer/Quality UX polish, and add two standards-track features (IPS Compositions, validator auth) without major redirection.

**Target features (12 items across 4 themes):**

**Theme 1 — v1.5 closeout:**
- Headless deuteranopia simulation in Vitest (closes Phase 37 deferral; Brettel/Machado JS matrix on rendered RGBA → 21 adjacent-pair discriminability)
- Nyquist validation backfill (5 v1.5 phases `nyquist_compliant: false` + 3 missing VALIDATION.md)
- Phase 38.1 standalone VERIFICATION.md (audit-trail gap; evidence currently in SUMMARY.md + 33-HUMAN-UAT.md appends)

**Theme 2 — Explorer/Quality UX polish:**
- Explorer "Hide empty resource types" toggle (backlog 999.1)
- Quality completeness — sort N/A rows to bottom (backlog 999.2)
- Heat-column gradient on per-type quality matrix
- CSV export of per-type quality matrix
- Pre-probe extension-module counts on Patient detail (avoid empty-tab UX)

**Theme 3 — Validator hardening:**
- Validator authentication (Basic/Bearer; extends Phase 31 cascade)
- Semantic near-miss detection (SNOMED CT + ICD-10 graph walking)

**Theme 4 — Standards & Stack:**
- IPS Compositions (Empty-Sections-and-Missing-Data) support
- Mantine 9 upgrade — *conditional on Medplum 5.x peer-dep refresh; phase will gate on upstream readiness and defer to v1.7 if not ready*

**Key context:**
- Phase numbering continues from 38.2 (v1.5's last phase) → starts at Phase 39.
- Estimate: ~2–3 focused engineering weeks (smaller than v1.5; mostly polish + hygiene, with IPS + Mantine 9 as the larger items).
- v1.5 reference baselines: 1064 tests passing, `npm run build` clean, initial-load bundle 606.76 KB gz.

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
*Last updated: 2026-04-30 — Phase 44 (IPS Compositions support — IPS-01) complete: 2/2 plans, status `human_needed` (9/9 must-haves auto-verified; 2 manual-only items deferred — live-Blaze server-picker mode + large-bundle perf in `44-VALIDATION.md`). Wave 1 (44-01): new `scripts/fetch-ips-profiles.mjs` pins `hl7.fhir.uv.ips@2.0.0` (CC0-1.0); 32 IPS profiles bundled under `src/quality/profiles/ips/` (Composition + Bundle + 30 supporting SDs). Shared `scripts/lib/trim-profile.mjs` extracted DRY — both MII + IPS fetchers now import the same trim function (Phase 34 behavior preserved). `IPS_REGISTRY` URL-keyed lazy-load mirror of Phase 36 `EXTENSION_REGISTRY` (module-scoped Map + in-flight Promise sharing + StrictMode-safe). `getIpsProfileForUrl()` + `IPS_COMPOSITION_PROFILE_URL` const exported. `LICENSE` root file appended with HL7 IPS attribution section; `src/quality/profiles/ips/ATTRIBUTION.md` carries per-package metadata. `package.json` `prepare` hook chains MII + IPS fetchers with `|| true` offline-resilience (Phase 34 D-14 idiom preserved). T-44-05 license-compliance grep test (`hl7.fhir.uv.ips` AND `CC0-1.0` AND `2.0.0` in LICENSE). Wave 2 (44-02): pure-function `src/quality/ipsBundleValidator.ts` walks the 16-section IPS catalogue (3 required `min:1` — Problems `11450-4`, Allergies `48765-2`, Medications `10160-0`; 13 optional) embedded verbatim per RESEARCH §3; emits 3 severity levels (D-09: error=section-absent, warning=entry-empty, information=unresolvable-ref); `expression: ['Composition.section[N].title']` per D-11; synchronous (no async, no requestIdleCallback per D-16). Walker is DEDICATED — does NOT import `cascadingValidator` (per D-08; verified by grep). Bundle.entry slicing OUT of scope per RESEARCH A5 (section-level only). New `IPSPanel.tsx` at `/quality/ips` lazy route (Mantine 8 `<Tabs>` paste/server, `<JsonInput autosize minRows={10} maxRows={30}>` per D-15, `<Button loading>` + `<Skeleton height={200}>` per D-07). Sidebar entry "IPS Validator" under Quality cluster; `QualityOverviewPage.tsx` tile. `ResourceIssueTable.tsx` UNMODIFIED (verified: last modified Phase 43 commit `4b33ca1`). 3 fixtures (complete: 0 issues / incomplete: ≥2 / malformed: ≥2). Test gate: 1207 → 1240 passing (+33 net new); Phase 43 auth tests still green (no regression); `npm run build` clean; IPSPanel lazy chunk 14 KB raw / 4.3 KB gz. Code review: 0 critical / 2 warnings / 5 info (advisory non-blocking — IPSPanel handleValidate tab-switch race window WR-01; parseBundleFromPaste useCallback churn WR-02). All 12 phase-specific invariants PASS. IPS-01 satisfied; v1.6 Theme-4 (Standards & Stack) IPS half closed. Two new patterns established: (1) shared trim function across multiple package fetchers; (2) URL-keyed lazy-load registry parallel to MII extensions but in a separate license/attribution domain.*

*Last updated: 2026-04-30 — Phase 43 (Validator hardening — auth + semantic near-miss, VAL-06 + VAL-07) complete: 2/2 plans, status `human_needed` (7/7 must-haves auto-verified; 3 live-Blaze UAT cases scaffolded in `43-HUMAN-UAT.md` — basic-auth URL, bearer-token URL, invalid-SNOMED near-miss — deferred to manual session). Wave 1 (43-01, VAL-06): `validation.externalValidator.auth: { type: 'basic' | 'bearer'; username?; password? }` schema in `settings.yaml`; `cascadingValidator.tryExternal` injects `Authorization` header AFTER PHI gate, BEFORE `AbortController` (awk-locked at `phi=213 < auth=233`); bearer tokens live in `localStorage['validator.bearerToken.v1']` ONLY (grep-zero in `types.ts`/`settings.ts`/`settings.yaml`); new `ValidatorAuthSettingsModal` (Mantine 8 `PasswordInput`) writes/clears the key from `SettingsPage`; new notify events `auth-missing` (token absent → server-tier demote) and `auth-failed` (401/403 → demote with banner "auth: <type> — failed (server fallback)"); `useConformanceRun` carries `AuthBannerState`; probe-cache invalidation on bearer rotation via length-signature in `extSerialized` (T-43-04). Wave 2 (43-02, VAL-07): new `src/quality/semanticNearMissWalker.ts` — bounded BFS over `CodeSystem/$lookup` (parent + child properties), `MAX_DEPTH=3`, `MAX_NODES=50`, `MAX_SUGGESTIONS=10`, ancestors-first ordering, alphabetical tiebreak, visited-set defeats SNOMED `Is a` cycles; reuses Phase-4 `TerminologyResolver.lookupDisplay` LRU cache (no parallel cache); silent fallback when terminology unavailable (`return []` on null client / failed seed / try-catch in `fetchLookupWithProperties`); triple-condition gate (`semanticNearMisses && client && onSuggestions`) keeps default-off (Tests 24/24b/27); `NormalizedIssue.code` preserves raw `OperationOutcome.issue.code`; `ResourceIssueTable` renders inline `<Mantine.Collapse>` "Did you mean?" rows (chevron toggle, `Display | Code | Relation` columns, tooltip with full SNOMED display + system URL). Bundle delta +0.82 KB gz (within ±5 KB target). Test gate: 1207 passing / 1 pre-existing fail (Phase-40 deuteranopia pair #13, deferred-items.md) / 22 todo. Code review: 0 critical / 2 warnings / 4 info (WR-01 bearer-key constant duplicated across 3 files; WR-02 extSerialized localStorage-on-every-render). All 7 phase-specific invariants PASS automated verification: PHI-gate ordering, bearer-disk isolation, header-build locality, walker bounds, default-off, cache reuse, silent fallback. VAL-06 + VAL-07 satisfied; v1.6 Theme-3 (validator hardening) closed.*

*Last updated: 2026-04-29 — Phase 42 (Pre-probe extension-module counts — MII-EXT-15) complete: 2/2 plans, status `human_needed` (3/4 SC verified; SC #4 live-Blaze UAT walk deferred to `42-HUMAN-UAT.md` scaffold). New hook `src/hooks/useMiiExtensionCounts.tsx` fans out `_summary=count` GETs across 14 MII extension modules with `Promise.all`, per-type `.catch(() => 0)` fallback, hook-internal `useRef<Map>` cache keyed `${patientId}:${moduleId}`, cancelled-flag cleanup (NOT `AbortController` — Medplum v5.1.7 `client.get()` doesn't accept signal), and Phase-34 `EmptyExtensionsCoordinator.reportEmptiness` integration via stable-ref pattern (avoids infinite re-render loop from no-Provider fallback). `MiiModuleTabs.tsx` `TabPillLabel` extended with optional `count?` + `isEmpty?`; outer-div opacity-0.55 dim (NOT on `<Tabs.Tab>`, preserves Mantine 8 active-pill indicator per Pitfall #5); base 7 + Zeitleiste call sites byte-for-byte unchanged via prop-absence exemption (D-04). Test gate: 1154 passing / 22 todo / 1 pre-existing failing (deuteranopia pair #13, Phase-40 artifact, documented in `deferred-items.md` as out of scope); `npm run build` clean. Code review: 0 critical / 3 warnings / 6 info (advisory non-blocking — cache lifetime invariant docs, vacuous cache test, deep-link hidden-tab UX edge). MII-EXT-15 satisfied. Two new patterns established for project: (1) stable-ref read for context-no-Provider-fallback callbacks; (2) outer-div opacity dim for tab pills mirroring `MiiModuleTab.tsx:143` idiom.*

*Last updated: 2026-04-29 — v1.6 milestone defined: Hardening, UX Polish & Carry-Overs. 12 items across 4 themes (v1.5 closeout / UX polish / validator hardening / standards & stack). Phase numbering continues from 38.2 → starts at Phase 39. genomDE → MII CDS mapping pipeline removed from candidate scope (moved to a separate project).*

*Last updated: 2026-04-28 — Phase 37 (Phase 34 empirical UAT capture — deuteranopia + TTI) closed with **gaps_found** (deuteranopia leg deferred). D-22 TTI gate closed: `tti-snapshot.json` PASS (baseline 256.523 ms at commit `048e99c` Phase 33 tail / post-phase 268.604 ms at `a7e4544` Phase 34 HEAD / delta_ms +12.08 ms ≤ 100 / delta_pct +4.71% ≤ 10), method substituted to **Lighthouse 13.1 headless Chrome** rather than the plan-required Chrome DevTools Performance panel manual capture (substitution accepted by user; documented in `tti-snapshot.json.method` and `37-EMPIRICAL.md` §3). MII-EXT-11 deuteranopia leg **NOT closed** — user opted to skip the Chrome DevTools Rendering panel manual capture step at the `checkpoint:human-verify` gate; `37-EMPIRICAL.md` §1 (7 within-family pairs) and §2 (14 cross-family pairs) carry `[deferred]` markers in the Empirical column for all 21 adjacent pairs; the borderline pairs #7 (mikrobiologie ↔ molekulargenetik HIGH color-collapse risk) and #12 (pro ↔ seltene MEDIUM-HIGH risk) remain qualitative paper predictions only. `34-06-UAT.md` flipped to **PARTIALLY COMPLETE (TTI closed via Lighthouse; deuteranopia deferred to v1.6+)** with deuteranopia checkbox `[ ] DEFERRED 2026-04-28` and TTI checkbox `[x] PASS (Lighthouse-substituted)`. Branch A (no contingency) — source code untouched (`src/utils/mii-icons.ts`, `src/utils/mii-modules.ts`, `.planning/research/color-design-audit.md` last commits all from Phase 34). Test gate: 1060 passing / 0 failing; `tsc -b --noEmit` exit 0; `npm run build` clean. Code review skipped (zero source files changed in Phase 37 — doc-only phase). New v1.6+ candidate added to `.planning/ROADMAP.md` §Deferred Items: headless deuteranopia simulation in Vitest using a Brettel/Machado JS matrix to retroactively close `37-EMPIRICAL.md` §1+§2 for any future HEAD. v1.5 milestone now at last phase Phase 38 (HUMAN-UAT live-Blaze smoke tests, 12 items merged from former backlog 999.1+999.4). Phase 36 (lazy-load) summary preserved: 4/4 plans, MII-EXT-12 deferred lazy-load clause closed.*

*Last updated: 2026-04-26 — v1.5 in progress. Phase 36 (Phase 34 profile lazy-load — bundle-size waiver follow-up) complete: 4/4 plans, MII-EXT-12 deferred lazy-load clause closed. `src/quality/profiles/extensions/index.ts` switched from 501 eager static SD imports to 481 URL-keyed `() => import('./X.json')` thunks; `getExtensionProfileForUrl` now async with module-scoped `extensionProfileCache` + StrictMode-safe `extensionProfileInFlight` dedup Map; production caller wired in `useConformanceRun.ts` Step 2b (resolves extension SDs on-demand from `meta.profile[*]` then runs `validateConformance` per match). Bundle gate result: BASELINE_GZ_BYTES 949,591 → INITIAL_LOAD_GZ_BYTES 621,324 = **−320.57 KB gz initial-load delta** (4× under the 100 KB target). On-disk total grew +480 KB due to per-chunk gzip overhead from 472 individual extension-SD async chunks emitted by Vite — informational only; chunks are non-blocking (absent from `dist/index.html` initial-load critical path). Test gate: 1060 passing / 0 failed; `tsc -b --noEmit` exit 0; `npm run build` clean (504ms). Code review: 0 critical / 4 warnings / 5 info (advisory non-blocking — Set lookup for `BUNDLED_EXTENSION_PROFILE_URLS.includes`, `AbortController` not threaded through extension-profile loads, defense-in-depth on `sd.url` codegen, module-scoped cache reset API). Phase 35 (Phase-30 UAT Follow-ups + Per-Type Quality Matrix) complete: UAT-FU-01 per-type Date/Status extractors in `SearchResultsPage.tsx` for Patient/Condition/Observation/MedicationStatement/Encounter/Procedure (TDD baseline-drift commit pair landing 17 new dateStatus tests) with FHIR R4 field paths verified — Encounter uses `period.start` (not `.date`), Condition uses `clinicalStatus.coding[0].code` (CodeableConcept walk), MedicationStatement uses flat `effectiveDateTime`; UAT-FU-02 `HumanReadableView.tsx` extension cleanup — Mantine `<Tooltip>` on identifier-system URLs replaces inline rendering, Mantine `<Modal>` viewer for address-extension JSON, bottom "Extensions" section deduplicates `Resource.extension[]` by URL with `[View]` Modal per row + `aria-label="Close"` a11y; `ResourcePropertyTable.tsx` mirrors the Tooltip + Modal idioms; UAT-FU-03 `ResourceDetailPage.tsx` Tabs reduced 3→2 (NOT SegmentedControl 4→3 as initially specified — RESEARCH.md P-09 corrected), Developer→JSON rename, `ClinicalRawView.tsx` deleted (7 grep hits across 4 files cleaned to 0); UAT-FU-05 per-type quality matrix card via new `QualityByTypeMatrix.tsx` (402 lines) under `/quality?tab=counts` — 7 data + 1 chevron columns (Resource type / Complete% / Coverage% / Validation% / References% / Dup / Issues / chevron), sortable via `<SortableTh>`, sparse cells render em-dash (NEVER `0%`), threshold breach via `useThresholds().isBreached(metricKey, value)` curried hook, chevron deep-link to `/quality?tab=<metric>&type=<resourceType>` with PHI gate preserved (Phase 7); 5 per-metric contexts extended with `byType: Record<string, number>` slot + functional `setByType` setter; ValidationContext gains a NEW second slot `validationIssuesByType` for the Issues column (RESEARCH.md Q-01 resolution); 4 producers migrate (`useCompletenessReport`, `useCodingCoverage`, `ValidationPanel`, `ReferencesPanel`) with ValidationPanel + ReferencesPanel honoring `?type=` URL pre-selection via `useSearchParams` (Q-02); Phase 32 facade `useQualityMetrics()` invariant preserved (zero-line diff). Test gate: 1054 passing / 22 todo / 0 failing (998 baseline + 56 new). Code review: 0 critical / 4 warnings / 7 info (advisory). Shelved to backlog: Phase 999.4 (live-Blaze HUMAN-UAT — 6 observational items including Date/Status with real Synthea data, Tooltip hover, Modal transitions, bottom-Extensions visual layout, matrix card + chevron PHI gate). v1.5 milestone (Phases 31-35) at LAST PHASE — Phase 31 has gap-closure 31-02 outstanding; all other phases shipped. Ready to discuss milestone close-out.*
