# Roadmap: FHIR Exploder

## Milestones

- ✅ **v1.0 -- MVP (shipped 2026-04-12)** -- [Archive](milestones/v1.0-ROADMAP.md) . [Requirements](milestones/v1.0-REQUIREMENTS.md)
- ✅ **v1.1 -- UX Polish & Data Export (shipped 2026-04-12)** -- [Archive](milestones/v1.1-ROADMAP.md) . [Requirements](milestones/v1.1-REQUIREMENTS.md)
- ✅ **v1.2 -- Tech Debt & Quality Monitoring (shipped 2026-04-15)** -- [Archive](milestones/v1.2-ROADMAP.md) . [Requirements](milestones/v1.2-REQUIREMENTS.md)
- ✅ **v1.3 -- Cohort Definition & Storage (shipped 2026-04-16)** -- [Archive](milestones/v1.3-ROADMAP.md) . [Requirements](milestones/v1.3-REQUIREMENTS.md) . [Audit](milestones/v1.3-MILESTONE-AUDIT.md)
- ✅ **v1.4 -- Hardening & Tech-Debt Sweep (shipped 2026-04-23)** -- [Archive](milestones/v1.4-ROADMAP.md) . [Requirements](milestones/v1.4-REQUIREMENTS.md) . [Audit](milestones/v1.4-MILESTONE-AUDIT.md)
- ✅ **v1.5 -- Validation, Performance & MII Extensions (shipped 2026-04-29)** -- [Archive](milestones/v1.5-ROADMAP.md) . [Requirements](milestones/v1.5-REQUIREMENTS.md) . [Audit](milestones/v1.5-MILESTONE-AUDIT.md)
- 🚧 **v1.6 -- Hardening, UX Polish & Carry-Overs (in progress, started 2026-04-29)** -- 7 phases (39-45), 12 REQ-IDs across 4 themes

## Deferred Items

Carried beyond v1.6 (re-evaluate at v1.7 milestone-new):

- **STACK-01 fallback:** if Mantine 9 / React 19 peer-dep gate (Phase 45) fires `WAIVE-AND-DEFER`, the Mantine 9 upgrade slips to v1.7+. Track upstream `@medplum/react` peer-dep range monthly.
- Federated cohort queries (server-side CQL) — v1.3 deferred, no demand surfaced
- Cohort versioning / audit history — v1.3 deferred
- Phenotype-style multi-criteria builder — v1.3 deferred

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

<details>
<summary>✅ v1.5 Validation, Performance & MII Extensions (Phases 31-38.2) — SHIPPED 2026-04-29</summary>

- [x] Phase 31: UX-01 External Validator Cascade (2/2 plans) — completed 2026-04-25
- [x] Phase 32: EFF-R14 QualityMetricsContext Split (4/4 plans) — completed 2026-04-24
- [x] Phase 33: MII Schema Foundation + Extension-Modules Collapse UI (7/7 plans) — completed 2026-04-24
- [x] Phase 34: 14 MII Extension Modules + Palette + Bundled Profiles (6/6 plans) — completed 2026-04-25
- [x] Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix (4/4 plans) — completed 2026-04-25
- [x] Phase 36: Phase 34 profile lazy-load (4/4 plans) — completed 2026-04-26
- [x] Phase 37: Phase 34 empirical UAT capture (deuteranopia + TTI) (3/3 plans) — completed 2026-04-28 (deuteranopia leg deferred to v1.6)
- [x] Phase 38: v1.5 HUMAN-UAT live-Blaze smoke tests (4/3 plans) — completed 2026-04-28
- [x] Phase 38.1: Fix `_sort=-date` Blaze incompatibility (INSERTED, 1/1 plan) — completed 2026-04-28
- [x] Phase 38.2: Fix ValueQuantity render on Observation rows (INSERTED, 1/1 plan) — completed 2026-04-29

Full details: [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md) . [Audit](milestones/v1.5-MILESTONE-AUDIT.md)

</details>

### 🚧 v1.6 Hardening, UX Polish & Carry-Overs (Phases 39-45)

**Milestone Goal:** Close v1.5 tech-debt carry-overs, ship Explorer/Quality UX polish, and add two standards-track features (IPS Compositions, validator auth) without major redirection.

**Estimate:** ~2–3 focused engineering weeks (smaller than v1.5; mostly polish + hygiene, with IPS + Mantine 9 as the larger items).

**Phase numbering:** Continues from 38.2 → starts at Phase 39.

**Reference baselines (v1.5 close):** 1064 tests passing, `npm run build` clean, initial-load bundle 606.76 KB gz.

- [ ] **Phase 39: v1.5 audit-trail backfill (NYQ + AUDIT)** — Retroactive VALIDATION.md + 38.1-VERIFICATION.md so v1.5 audit closes cleanly
- [ ] **Phase 40: Headless deuteranopia simulation in Vitest (DEUT)** — Brettel/Machado JS matrix CI gate for the 21 MII module adjacent pairs; closes Phase 37 deferral
- [ ] **Phase 41: Explorer + Quality UX polish (EXPL + QUAL-01 + QUAL-02 + QUAL-03)** — Hide-empty-types toggle, N/A-rows-to-bottom sort fix, per-type matrix heat gradient, CSV export
- [ ] **Phase 42: Pre-probe extension-module counts (MII-EXT-15)** — Tab labels show `Onkologie (12)` before click via parallel `_summary=count` probes; zero-count tabs dimmed
- [ ] **Phase 43: Validator hardening — auth + semantic near-miss (VAL-06 + VAL-07)** — HTTP Basic/Bearer on external validator + opt-in SNOMED CT / ICD-10 graph-walked "Did you mean?" suggestions
- [ ] **Phase 44: IPS Compositions support (IPS-01)** — Bundle validation against IPS profile with Empty-Sections-and-Missing-Data drill-down
- [ ] **Phase 45: Mantine 9 upgrade (STACK-01)** — Conditional on `@medplum/react` peer-dep readiness; defers to v1.7 with `WAIVE-AND-DEFER` if gate fails

## Phase Details

### Phase 39: v1.5 audit-trail backfill (NYQ + AUDIT)
**Goal**: Close v1.5's audit-trail debt so the milestone audit can be re-run cleanly with no `tech_debt` verdict on documentation gaps.
**Depends on**: Nothing (first v1.6 phase; pure-doc work, no source change)
**Requirements**: NYQ-01, AUDIT-01
**Success Criteria** (what must be TRUE):
  1. `.planning/milestones/v1.5-phases/31-*/31-VALIDATION.md`, `33-*/33-VALIDATION.md`, and `38-*/38-VALIDATION.md` exist on disk and pass `/gsd-validate-phase` (`grep -l 'nyquist_compliant' v1.5-phases/{31,33,38}*/*VALIDATION.md` returns 3 paths).
  2. The five v1.5 phases currently `nyquist_compliant: false` (32, 34, 35, 36, 37) have their VALIDATION.md frontmatter flipped to `nyquist_compliant: true` after retroactive test-coverage review (`grep -c 'nyquist_compliant: false' v1.5-phases/**/VALIDATION.md` returns 0).
  3. `.planning/milestones/v1.5-phases/38.1-*/38.1-VERIFICATION.md` exists with `status: passed`, sourcing evidence from `38.1-01-SUMMARY.md` (`re_walk: passed`, 6/6 tasks, +6 test baseline) and the Phase 33 HUMAN-UAT cross-references on Tests 1, 2, 6.
  4. `.planning/milestones/v1.5-MILESTONE-AUDIT.md` re-run notes the audit-trail debt as resolved (no remaining `nyquist_compliant: false` rows; no missing VALIDATION.md / VERIFICATION.md entries).
**Plans**: 3 plans (2 waves; pure-doc work)
**Effort**: small (~1 day total — 3 retroactive VALIDATION.md + 1 VERIFICATION.md + 5 nyquist flag flips + audit refresh + final archive)
**Execution**: Fully automatable (doc-only; no source diff; verifier confirms grep counts)

Plans:
- [ ] 39-01-PLAN.md — wave 1: write 3 retroactive VALIDATION.md (phases 31, 33, 38)
- [ ] 39-02-PLAN.md — wave 1: write 38.1-VERIFICATION.md (AUDIT-01) + flip nyquist on 32/34/35/36, annotate Phase 37 with pending: DEUT-01 in Phase 40 (NYQ-01)
- [ ] 39-03-PLAN.md — wave 2: refresh v1.5-MILESTONE-AUDIT.md + archive 10 v1.5 phase dirs to .planning/milestones/v1.5-phases/

### Phase 40: Headless deuteranopia simulation in Vitest (DEUT)
**Goal**: A CI-runnable color-vision discriminability gate so v1.6+ icon/palette changes are blocked at PR time if any of the 21 MII module adjacent pairs collapses under deuteranopia.
**Depends on**: Phase 39 (clean audit baseline preferred but not required)
**Requirements**: DEUT-01
**Success Criteria** (what must be TRUE):
  1. New test file `src/utils/__tests__/deuteranopiaDiscriminability.test.ts` (or `src/__tests__/visual/deuteranopia.test.tsx`) loads a Brettel/Machado RGB-to-deuteranopia simulation matrix in pure JS and applies it to the rendered RGBA of the Dashboard tile grid + Patient-detail tab row + ClinicalTimeline at the post-Phase 34 HEAD.
  2. Test asserts a per-pair discriminability score (e.g. ΔE2000 or perceptual L*a*b* distance with documented threshold) for all 21 adjacent module pairs; specifically locks borderline pair #7 mikrobiologie ↔ molekulargenetik (HIGH) and pair #12 pro ↔ seltene (MEDIUM-HIGH) with explicit named assertions.
  3. Test runs in `npm test` headless (no Chrome DevTools; no manual capture) and is wired into the existing 1064-test baseline; full suite passes 1064+/0 failing.
  4. `.planning/milestones/v1.5-phases/37-*/37-EMPIRICAL.md` §1 + §2 `[deferred]` markers are flipped to `[verified by deuteranopiaDiscriminability.test.ts at commit <sha>]` for all 21 pairs; Phase 37 deferred clause closes.
**Plans**: TBD
**Effort**: medium (1–1.5 days — JS matrix port + 21-pair test scaffolding + RGBA capture pattern)
**Execution**: Fully automatable

Plans:
- [ ] 40-01: TBD (port Brettel/Machado matrix, build 21-pair test fixture, wire RGBA capture, close Phase 37 deferral)

### Phase 41: Explorer + Quality UX polish (EXPL + QUAL-01 + QUAL-02 + QUAL-03)
**Goal**: Ship four bundled UX-polish improvements across the Explorer landing and Quality dashboard surfaces — each small in isolation, grouped here so they share a single test-suite run + commit cadence.
**Depends on**: Phase 35 (consumes `QualityByTypeMatrix.tsx` for QUAL-02 + QUAL-03); Phase 18 (`useThresholds()` for QUAL-02 gradient driver)
**Requirements**: EXPL-01, QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. **EXPL-01:** `src/components/explorer/ResourceTypeLanding.tsx` renders a Mantine `<Switch>` near the top labeled "Hide empty resource types", default off, persisted to `localStorage` key `explorer.hideEmptyResourceTypes.v1`; when on, types with `counts[type] === 0` are filtered out. Regression test asserts switch toggle hides Synthea-zero types (AllergyIntolerance, Consent, Immunization, ServiceRequest, MedicationStatement).
  2. **QUAL-01:** `src/components/quality/CompletenessPanel.tsx` `compareRows` (~line 59) treats `pct === null` as "not-applicable" — N/A rows sort to the end regardless of sort direction (mirroring the existing `aSettled !== bSettled` pattern); same fix audited & applied to `CoveragePanel`, `ValidationPanel`, `ReferencesPanel` (per-panel verdict recorded in 41-SUMMARY.md); regression test asserts ASC and DESC both push N/A to bottom; empty rows render with a muted "—" badge.
  3. **QUAL-02:** `src/components/quality/QualityByTypeMatrix.tsx` renders a heat-column gradient on the Complete% / Coverage% / Validation% / References% columns: green ≥100%, yellow at threshold, red below threshold (threshold per metric pulled from `useThresholds()`); color is supplemental — `<SortableTh>` numeric value remains the primary semantic carrier (a11y).
  4. **QUAL-03:** "Download CSV" button on the matrix card produces a UTF-8 BOM-prefixed CSV with headers matching visible columns; sparse cells render empty (NOT `0%`); filename pattern `quality-matrix-{server-host}-{YYYY-MM-DD}.csv` asserted by regression test.
  5. No bundle-size regression > 5 KB gz vs v1.5 baseline (606.76 KB initial-load); recorded in 41-SUMMARY.md.
**Plans**: TBD
**Effort**: medium (1.5–2 days combined — 4 small surfaces + shared test-suite gate + bundle-size check)
**Execution**: Fully automatable
**UI hint**: yes

Plans:
- [ ] 41-01: TBD (EXPL-01 hide-empty-types Switch + persistence)
- [ ] 41-02: TBD (QUAL-01 compareRows N/A-to-bottom across 4 panels + muted-row styling)
- [ ] 41-03: TBD (QUAL-02 heat-column gradient with `useThresholds` driver + ARIA preservation)
- [ ] 41-04: TBD (QUAL-03 CSV export with BOM + filename pattern + sparse-cell rule + bundle-size gate)

### Phase 42: Pre-probe extension-module counts (MII-EXT-15)
**Goal**: Patient-detail extension-module tabs show counts on labels (e.g. `Onkologie (12)`) so users know which tabs have data before clicking — closes the empty-tab UX gap from Phase 34's data-drop.
**Depends on**: Phase 33 (helpers — `getPatientSearchParamForType`, `getExtraQueryForType`), Phase 34 (21-module data set)
**Requirements**: MII-EXT-15
**Success Criteria** (what must be TRUE):
  1. New hook (e.g. `useMiiExtensionCounts(patientId)`) fires one `_summary=count` FHIR GET per extension module on patient mount, in parallel via `Promise.all`, with per-type `.catch(() => 0)` fallbacks; cached per `(patientId, moduleId)` for the session (module-scope `Map` keyed by composite ID).
  2. `MiiModuleTabs` tab labels render counts inline as `{germanLabel} ({count})`; zero-count tabs render at opacity 0.55 (matching the Phase 34 empty-state idiom for panel content); regression test asserts both presence and dimming.
  3. AbortController threading: when the user navigates away from the patient detail page mid-probe, all in-flight count requests cancel (D-20 unmount-safe pattern, mirroring Phase 31's AbortSignal threading).
  4. Live-Blaze UAT smoke item recorded in 42-HUMAN-UAT.md confirms counts appear on at least 3 extension tabs against a real Synthea patient (e.g. an Onkologie patient with ≥1 extension hit).
**Plans**: TBD
**Effort**: medium (1–1.5 days — hook + cache + label render + abort threading + UAT)
**Execution**: Mixed (1 human-execution-bound: live-Blaze UAT against extension-module data)
**UI hint**: yes

Plans:
- [ ] 42-01: TBD (`useMiiExtensionCounts` hook + session cache + AbortController threading)
- [ ] 42-02: TBD (tab label render + dimmed-zero styling + regression tests + live-Blaze UAT)

### Phase 43: Validator hardening — auth + semantic near-miss (VAL-06 + VAL-07)
**Goal**: Extend Phase 31's external validator cascade with two productionization features — HTTP authentication for protected validators, and opt-in semantic suggestions for invalid codes.
**Depends on**: Phase 31 (UX-01 cascade — VAL-01..05 must be live)
**Requirements**: VAL-06, VAL-07
**Success Criteria** (what must be TRUE):
  1. `validation.externalValidator.auth: { type: 'basic' | 'bearer', credentials: string }` schema lands in `settings.yaml`; `cascadingValidator.tryExternal` injects the `Authorization` header before fetch; bearer tokens are stored in `localStorage` under a NEW `validator.bearerToken.v1` key (NEVER persisted to `settings.yaml` on disk — explicit decision recorded in 43-SUMMARY.md); banner copy in `ValidationPanel` updates to reflect "auth: <type>" when configured.
  2. Regression test exercises both `Authorization: Basic <base64>` (basic) and `Authorization: Bearer <token>` (bearer) header injection paths; PHI gate (Phase 7) is preserved — no auth-without-PHI bypass.
  3. New `validation.externalValidator.semanticNearMisses: boolean` setting (default false). When on and an `OperationOutcome.issue` carries `code-invalid`, `cascadingValidator` calls the configured terminology server's `$expand` / hierarchy endpoint to walk SNOMED CT / ICD-10 ancestors+descendants up to depth 3; results surface as "Did you mean?" suggestion rows in the issue panel; regression test asserts opt-in default-off behavior.
  4. Live-Blaze UAT covers (a) a basic-auth-protected validator URL, (b) a bearer-token validator URL, (c) a deliberately-invalid SNOMED code returning at least one near-miss suggestion; results recorded in 43-HUMAN-UAT.md.
**Plans**: TBD
**Effort**: large (2–3 days — auth path + bearer token storage + SNOMED graph walker + drill-down UI + UAT)
**Execution**: Mixed (2 human-execution-bound: auth UAT against protected validator, near-miss UAT against terminology server)
**UI hint**: yes

Plans:
- [ ] 43-01: TBD (settings.yaml schema + Authorization header injection + bearerToken.v1 storage + banner copy)
- [ ] 43-02: TBD (semantic near-miss walker + opt-in setting + suggestion rows + Phase 31 normalizer extension + UAT)

### Phase 44: IPS Compositions support (IPS-01)
**Goal**: Validate FHIR resource bundles against the IPS (International Patient Summary) Composition profile so users can audit IPS conformance and see Empty-Sections-and-Missing-Data patterns in the existing drill-down chrome.
**Depends on**: Phase 34 (consumes `fhir-package-loader` scaffolding + bundled-profile mechanism); Phase 15 (consumes `ResourceIssueTable` drill-down primitive)
**Requirements**: IPS-01
**Success Criteria** (what must be TRUE):
  1. `scripts/fetch-ips-profiles.mjs` (or extension to `scripts/fetch-mii-profiles.mjs`) pulls the IPS Composition profile package via `fhir-package-loader` and ships it under the existing URL-keyed `EXTENSION_REGISTRY` (or a parallel `IPS_REGISTRY`); LICENSE/NOTICE updated to reflect IPS attribution.
  2. Bundle validation entry-point lands in `ValidationPanel` (or a new dedicated `IPSPanel` reachable from `/quality`): user selects a Composition resource (or pastes a bundle), validator runs against the IPS profile and surfaces `OperationOutcome` issues classified by section.
  3. Per-section drill-down reuses Phase 15's `ResourceIssueTable` — Empty-Sections-and-Missing-Data findings render with section name, expected element, and severity; click-through to the underlying Composition resource works.
  4. Regression test fixture validates a known-incomplete IPS bundle and asserts at least 2 distinct empty-section findings (e.g. AllergyIntolerance section absent, Medications section empty); test passes 1064+/0 failing.
**Plans**: TBD
**Effort**: large (2–3 days — package loader extension + panel UI + drill-down wiring + fixture-driven test)
**Execution**: Fully automatable (with optional live-Blaze IPS UAT against a real IPS-tagged Composition if available)
**UI hint**: yes

Plans:
- [ ] 44-01: TBD (IPS profile fetch script + registry wiring + LICENSE update)
- [ ] 44-02: TBD (IPS panel UI + bundle validation runner + ResourceIssueTable drill-down + regression test)

### Phase 45: Mantine 9 upgrade (STACK-01)
**Goal**: Bump Mantine 8 → 9 (and React 18 → 19 if required by upgrade) to track the upstream stack — conditional on `@medplum/react` peer-dep range allowing it. If the gate fails, defer to v1.7 with a documented `WAIVE-AND-DEFER` decision.
**Depends on**: Phases 39-44 (run last; large blast radius across 100+ component files)
**Requirements**: STACK-01
**Success Criteria** (what must be TRUE):
  1. **Pre-flight gate documented in 45-CONTEXT.md:** `npm view @medplum/react@5.x peerDependencies` shows Mantine ^9.x AND React ^19.x in the allowed peer range. If gate fails → 45-SUMMARY.md records `WAIVE-AND-DEFER` decision with the actual peer range pinned, and Phase 45 closes as `deferred` with no source diff (defer to v1.7).
  2. **If gate passes:** `package.json` has `@mantine/core ^9.x`, `@mantine/hooks ^9.x`, `@mantine/notifications ^9.x`, `@mantine/spotlight ^9.x`, `@mantine/charts` matched, `react ^19.x`, `react-dom ^19.x`, `@types/react ^19.x`, `@types/react-dom ^19.x`. Lockfile regenerated; `npm install` is clean.
  3. **If gate passes:** `npm test` shows ≥1064 passing / 0 failing; `tsc -b --noEmit` exits 0; `npm run build` exits 0; visual regression spot-check (Sidebar, Dashboard, Quality, Patient detail, Cohorts) shows no breakage — recorded in 45-HUMAN-UAT.md.
  4. **If gate passes:** Bundle-size delta is within ±10% of the v1.5 baseline (606.76 KB gz initial-load); recorded in 45-SUMMARY.md with before/after gz bytes.
**Plans**: TBD
**Effort**: large (2–3 days IF gate passes — codemod + breaking-change sweep + visual regression UAT; ≤0.5 day IF gate fails and defers)
**Execution**: Mixed (1 human-execution-bound: visual regression UAT across 7 views)
**UI hint**: yes

Plans:
- [ ] 45-01: TBD (peer-dep pre-flight gate + decision record OR proceed with bump)
- [ ] 45-02: TBD (Mantine 9 + React 19 codemod + breaking-change sweep + visual UAT — conditional on 45-01 PASS)

## Progress

**Execution Order:**
v1.6 phases execute in numeric order: 39 → 40 → 41 → 42 → 43 → 44 → 45.
Phases 41, 42, 43, 44 are largely independent of each other (only consume already-shipped v1.5 surfaces) and can be reordered if execution preference shifts. Phase 39 first (audit hygiene); Phase 45 last (largest blast radius + peer-dep gate).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14-20 (v1.2) | v1.2 | 22/22 | ✅ Shipped | 2026-04-15 |
| 21-22 (v1.3) | v1.3 | 9/9 | ✅ Shipped | 2026-04-16 |
| 23-30 (v1.4) | v1.4 | 35/35 | ✅ Shipped | 2026-04-23 |
| 31-38.2 (v1.5) | v1.5 | 32/32 | ✅ Shipped | 2026-04-29 |
| 39. v1.5 audit-trail backfill (NYQ + AUDIT) | v1.6 | 0/3 | Not started | - |
| 40. Headless deuteranopia simulation (DEUT) | v1.6 | 0/TBD | Not started | - |
| 41. Explorer + Quality UX polish (EXPL + QUAL-01/02/03) | v1.6 | 0/TBD | Not started | - |
| 42. Pre-probe extension-module counts (MII-EXT-15) | v1.6 | 0/TBD | Not started | - |
| 43. Validator hardening — auth + semantic (VAL-06 + VAL-07) | v1.6 | 0/TBD | Not started | - |
| 44. IPS Compositions support (IPS-01) | v1.6 | 0/TBD | Not started | - |
| 45. Mantine 9 upgrade (STACK-01) | v1.6 | 0/TBD | Not started | - |

## Backlog

### Phase 999.1: Explorer — toggle to hide zero-count resource types (BACKLOG)

**Status:** PROMOTED to v1.6 Phase 41 (EXPL-01) on 2026-04-29.

**Goal:** Add a Mantine `Switch` near the top of the Explorer resource-type landing (`/explorer`) labeled "Hide empty resource types" (default off, persisted to localStorage). When on, types with `counts[type] === 0` collapse out of the list. When off, the existing full list is shown.

**Why:** Today `/explorer` lists every supported FHIR resource type. Many show 0 against typical Synthea bundles (e.g. on the Phase 38 walk: `MedicationStatement`, `AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest` were all zero). The list is noisy when most types are empty.

**Likely files:**
- `src/components/explorer/ResourceTypeLanding.tsx` — landing component
- Counts source: same map the Dashboard uses (`src/components/dashboard/DashboardPage.tsx`)

**Source:** Verifier observation surfaced during Phase 38 HUMAN-UAT walk (2026-04-28), Plan 38-02 Test 1 (Explorer Date/Status columns across 6 types). The MedicationStatement empty-state navigation made the noise pattern obvious.

**Requirements:** EXPL-01 (Phase 41)
**Plans:** Carried into Phase 41

### Phase 999.2: Quality completeness — sort non-empty resource types to the top (BACKLOG)

**Status:** PROMOTED to v1.6 Phase 41 (QUAL-01) on 2026-04-29.

**Goal:** Change the default sort behavior in `/quality?tab=completeness` so resource types with actual data (non-empty `total`) appear at the top of the per-type table; types with no records (`total === 0`, pct=null) sink to the bottom.

**Why:** Today the panel's default sort is `completeness ASC / worst-first` (`CompletenessPanel.tsx`). Zero-count types map their pct to `null → -1` in `compareRows`, which under ascending sort puts them BEFORE every populated type. Result: against a Synthea bundle the user opens the page and sees five empty types stacked at the top (`AllergyIntolerance`, `Consent`, `Immunization`, `ServiceRequest`, `MedicationStatement` — all 0 records) before any meaningful row. Verifier observation: "non-empty Resources in `/quality?tab=completeness` are at the end rather than at the top of the list."

**Suggested fix:** Treat `pct === null` as "not-applicable" rather than "worst possible" in `compareRows`. Push N/A rows to the end regardless of sort direction (mirror the existing `aSettled !== bSettled` pattern that already pushes loading/error rows to the end). Possibly add a small "—" badge or muted styling for the empty rows so it's obvious why they're sorted to the bottom.

**Likely files:**
- `src/components/quality/CompletenessPanel.tsx` — `compareRows` (line ~59) and `toRow` (line ~50ish)
- Same pattern likely applies to `CoveragePanel`, `ValidationPanel`, `ReferencesPanel` if they sort similarly — audit before fixing.

**Source:** Verifier observation during Phase 38 HUMAN-UAT walk (2026-04-28).

**Requirements:** QUAL-01 (Phase 41)
**Plans:** Carried into Phase 41
