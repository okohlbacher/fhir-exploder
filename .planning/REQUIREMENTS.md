# Requirements: FHIR Exploder v1.5 — Validation, Performance & MII Extensions

**Defined:** 2026-04-23
**Status:** Active (v1.4 shipped 2026-04-23; v1.5 now the current milestone)
**Core Value:** Close the v1.4 carry-over (UX-01 external validator, EFF-R14 context split, six Phase-30 UAT follow-ups) and ship the 14 MII Kerndatensatz extension modules with a collapsible *Extension modules* section on `/patients/:id` — keeping the "browse the ecosystem" discoverability of the base-module UX while adding 3× the module coverage.

## Background

Four inputs drive this milestone:

1. **Carry-over from v1.4** — two requirements deferred from v1.4: **UX-01** external FHIR validator cascade (Phase 29-02-PLAN.md preserved verbatim); **EFF-R14** per-metric `QualityMetricsContext` split (Phase 27 risk-deferred).
2. **Phase-30 UAT gaps** — `.planning/phases/30-layout-redesign/30-UAT.md` recorded 6 off-phase follow-ups (Explorer Date/Status extractor, HumanReadableView extension cleanup, ResourceDetailPage mode removal + Developer→JSON rename, empty per-patient panels, Dashboard MII tile scoping, per-type quality matrix).
3. **Phase 999.1 backlog promotion** — 14 MII Kerndatensatz extension modules (Onkologie, Kardiologie, Intensivmedizin, Bildgebung, Pathologie, Mikrobiologie, Molekulargenetik, Seltene Erkrankungen, Symptom, Biobank, Studie, Dokument, MTB, PRO) with a confirmed *collapsible Extension modules section below base tabs* UX.
4. **Research synthesis (`research/SUMMARY.md`)** — locks 16 decisions across 4 research dimensions (STACK, FEATURES, ARCHITECTURE, PITFALLS) and surfaces 4 hard phase-ordering constraints: EFF-R14 → per-type quality matrix; MII helpers → schema widening → 14 extension entries; UAT-4 → MII rollout; UAT-5 decision → 21 tiles.

The research phase also locked three cross-cutting invariants:

- **One new devDep only** (`fhir-package-loader@^2.2.4`). Zero new runtime deps.
- **EFF-R14 = Option A**: seven `React.createContext` symbols + `<QualityMetricsProviders>` composer; facade `useQualityMetrics()` preserved.
- **PHI gate D-09 invariant** (zero outbound fetch before consent): re-evaluate gate before EVERY external-tier fetch; regression-tested.

## v1.5 Requirements

Requirements grouped into four scope groups. Phase numbering continues from Phase 30 (v1.4's last shipped phase).

### Group A — UX-01 External FHIR Validator Cascade (Phase 31)

Execute `.planning/milestones/v1.4-phases/29-backlog-ux/29-02-PLAN.md` verbatim (the plan is preserved with all decisions D-07..D-16 locked). Adds a three-tier validator cascade (external HTTP → server `$validate` → local structural) with PHI-gate routing, probe cache, and active-strategy indicator.

- [x] **VAL-01**: `settings.yaml` accepts a `validation.externalValidator: { url, enabled, timeoutMs }` block; `ValidationPanel` cascades external → server `$validate` → local checker, predicated on a per-`(serverUrl, externalValidatorUrl, resourceType)` probe cache that resets on settings change AND on "Validate sample" click.
- [x] **VAL-02**: Every external-validator `fetch` wrapped in `AbortController` with a configurable timeout (default 15 s) AND routed through the existing Phase 7 PHI acknowledgment gate (regression-tested: no fetch fires before user consent, per D-09); on timeout the cascade falls back to local checker with a visible Mantine toast; CORS failure surfaces root cause in the demote notification.
- [x] **VAL-03**: `ValidationPanel` renders an "Active strategy: external / server / local" status line per resource type; OperationOutcome issues normalized via a unit-tested `normalizeOperationOutcomeIssue` mapper into the existing `NormalizedIssue` type; per-validator `validatorVariant` recorded so UI can surface "Active strategy: external (HAPI)" etc.
- [x] **VAL-04**: `src/quality/phiGate.ts` extracted from inline `ValidationPanel.tsx:72,100-107,167-178` with unit tests locking the bypass-prevention contract. PHI gate Alert + acknowledge button remain in `ValidationPanel` but import helpers from the extracted module.
- [x] **VAL-05**: Server tier (`remoteValidator.ts`) accepts an `AbortSignal` so unmount-mid-fetch does not orphan the server-tier request.

**Acceptance evidence:** `src/quality/__tests__/phiGate.test.ts`, `src/quality/__tests__/normalizers.test.ts`, `src/quality/__tests__/cascadingValidator.test.ts` all green; three-validator severity fixtures in normalizer tests (HAPI, Firely, IG-Publisher).

### Group B — EFF-R14 QualityMetricsContext Split (Phase 32)

Split the monolithic `QualityMetricsContext` (all 8 fields in one provider → every tile re-renders on any metric update) into 7 per-metric context symbols + a facade composer. API-preserving; producers migrate to per-metric hooks; multi-metric consumers (OverviewStrip, tab labels) migrate to per-metric subscriptions; bulk-read consumers (PdfReportLayout, capture-snapshot) keep the facade.

- [x] **EFF-R14-01**: 7 per-metric context modules created under `src/quality/metrics/` (CompletenessContext, CoverageContext, ValidationContext, PlausibilityContext, LabRangesContext, ReferencesContext, DuplicatesContext). Each exports a `use<Metric>Rollup()` hook returning `{value, set}` (or `{overall, breakdown, contribute}` for Duplicates).
- [x] **EFF-R14-02**: `<QualityMetricsProviders>` composite component in `src/quality/metrics/index.tsx` wraps all 7 providers; `QualityLayout.tsx` replaces `<QualityMetricsProvider>` with the composite. A smoke test asserts all 7 providers populate (prevents silent 7/8 data loss if a shared context symbol is accidentally introduced).
- [x] **EFF-R14-03**: `useQualityMetrics()` facade preserved in `src/quality/QualityMetricsContext.tsx`; reimplemented as composition of the 7 per-metric hooks. Existing bulk consumers (`QualityOverviewPage.tsx:220-245` capture, `:247-328` PDF export) unchanged.
- [x] **EFF-R14-04**: Per-metric consumers migrated to the specific hook: `OverviewStrip.tsx:67-98` (7 tiles → 7 subscriptions); `QualityOverviewPage.tsx:444-462` (tab labels → per-metric). Rendered tile-by-tile re-render verified by a React Profiler snapshot in a new test.
- [x] **EFF-R14-05**: 7 producer sites migrated from `useQualityMetrics()` destructure to the specific hook (`useCompletenessReport.ts:42`, `useCodingCoverage.ts:41`, `ValidationPanel.tsx:200`, `PlausibilityPanel.tsx:109`, `LabRangesPanel.tsx:51`, `ReferencesPanel.tsx:69`, `DuplicatesPanel.tsx:102`).
- [x] **EFF-R14-06**: All 8 existing test wrappers migrated from `QualityMetricsProvider` to `QualityMetricsProviders` composite; zero new test-setup boilerplate per wrapper (the composite is one drop-in replacement).

**Acceptance evidence:** `npm test` 836+ passing; Profiler snapshot asserts per-metric render isolation; no "Maximum update depth exceeded" from missing `useMemo` on provider values.

### Group C — MII Extension Modules (Phases 33 + 34)

Promote backlog Phase 999.1. Schema-widen `MiiModule` with helpers first, then add 14 extension modules + collapsible UI + palette + bundled profiles. Split into two phases to isolate the mechanical codemod (Phase 33) from the data rollout (Phase 34).

#### Phase 33 — Schema + Collapse UI Foundation

- [x] **MII-EXT-01**: Helper utilities shipped in `src/utils/mii-modules.ts` **before** the schema widens: `fhirResourceTypesOf(mod)`, `findModuleForType(type, modules)`, `getPatientSearchParamForType(mod, type)`, `getExtraQueryForType(mod, type)`. Mechanical refactor with no behavior change; call sites migrated to helpers in a separate commit from the schema change so silent breakage cannot hide.
- [x] **MII-EXT-02**: `MiiModule` interface widened: `fhirResourceType: string | string[]` + `category: 'base' | 'extension'` (required, no default — all 7 existing base modules explicitly tagged `'base'`) + `patientSearchParamOverrides?: Record<string, string>` + per-type `extraQuery` structure supports multi-type modules.
- [x] **MII-EXT-03**: `MiiModuleTab` fans out to N concurrent FHIR searches via `Promise.all(types.map(...))`; entries concatenated and sorted by date; `.catch()` per-type preserves "empty for that type" behavior on failure.
- [x] **MII-EXT-04**: `MiiModuleTabs.tsx` partitions base vs extension modules. Base pill tabs render at top (unchanged layout); `<Collapse>` block beneath contains a second `<Tabs.List>` with extension tabs. Collapse defaults CLOSED; auto-expands if `activeTab` matches an extension module key (deep-link support).
- [x] **MII-EXT-05**: Extension tabs drop `keepMounted` (base 7 keep it) so 22 concurrent FHIR searches don't fire on `/patients/:id` mount. Extension panels mount lazily when selected.
- [x] **MII-EXT-06**: Dashboard MII tile grid (`DashboardPage.tsx:345-384`) partitions base vs extension; extension section gated behind a "Show extension modules" toggle. Decision on Dashboard MII tile **scoping** (per-patient vs server-wide, from Phase-30 UAT follow-up #5) resolved in this phase.
- [x] **MII-EXT-07**: Investigation of Phase-30 UAT follow-up #4 (empty per-patient MII/FHIR panels for Synthea test patient) completed as a pre-task; root cause (likely per-module `patientSearchParam` mismatch) fixed and regression test added so the pattern propagates correctly to all 21 modules.
- [x] **MII-EXT-08**: `ClinicalTimeline.tsx:85-86` `MII_MODULES.find` updated from `m.fhirResourceType === resource.resourceType` to `fhirResourceTypesOf(m).includes(resource.resourceType)`. Timeline entries keep badge color + German label for multi-type modules.

#### Phase 34 — 14 Extension Modules + Palette + Profiles

- [x] **MII-EXT-09**: 14 MII extension modules added to `MII_MODULES` with per-module `fhirResourceType` array, `patientSearchParam` + optional `patientSearchParamOverrides`, `badgeColor` from the new palette, and `icon` (from `@tabler/icons-react`). Per-module research deliverable (spec lookup against current MII FHIR IGs) completes Phase 34 Task 1.
- [x] **MII-EXT-10**: 7 custom `MantineColorsTuple`s added to `createTheme()` in `src/theme.ts`. Base 7 module colors UNCHANGED. Extension colors picked via hand-curated categorical palette (oncology-red, imaging-cyan, genetics-grape, pathology-violet, bioanalysis-teal, administration-indigo, patient-reported-pink) with a WCAG AA contrast audit at `.planning/research/color-design-audit.md`.
- [x] **MII-EXT-11**: 21 Tabler icons assigned per module (tier-3 color + icon differentiation for deuteranopia safety). Icons render in Timeline dots, tab subtitle, Dashboard tile swatch.
- [x] **MII-EXT-12**: `scripts/fetch-mii-profiles.mjs` (new Node script) fetches the 14 MII extension `StructureDefinition`s via `fhir-package-loader` from packages.fhir.org at build time; trimmed JSON lands under `src/quality/profiles/extensions/`. Pre-GA packages (Kardiologie `2026.0.0-alpha.2`, Symptom `2024.0.0-ballot`) bundled as-latest-available with a console warning on fetch.
- [x] **MII-EXT-13**: `prepare` npm lifecycle hook runs the fetch script on fresh clones so `npm test` passes without a manual prebuild step. CC-BY-4.0 attribution in `src/quality/profiles/extensions/ATTRIBUTION.md` + LICENSE appendix.
- [x] **MII-EXT-14**: Empty-state UX for extension modules: visible + 0.55 opacity + "— no {module} data for this patient" copy + a "Show N empty modules" toggle (matches Phase-30 Dashboard MII tile convention). `MiiModuleTab.tsx:93-99` updated with module-specific empty copy.

**Acceptance evidence:** 21 total modules render; patient-detail `/patients/:id` Time-to-Interactive unchanged from v1.4 baseline (verified via Chrome DevTools Performance snapshot — no regression from concurrent-fetch storm); bundle size delta <100 KB post-gzip (verified via `rollup-plugin-visualizer` treemap).

### Group D — Phase-30 UAT Follow-ups (Phase 35)

Six follow-ups surfaced during Phase 30 UAT walkthrough. Five are independent; one (#6 per-type quality matrix) depends on EFF-R14 (Phase 32).

- [x] **UAT-FU-01**: **Explorer Date/Status per-resource-type extractor** — `SearchResultsPage.tsx` gets a per-type field extractor (Patient → `birthDate` + `active`; Condition → `onsetDateTime` + `clinicalStatus`; Observation → `effectiveDateTime` + `status`; etc.). TDD approach: assertion tests written first to capture current "empty = empty" behavior, then extractor added, then assertions updated in a single commit so the baseline drift is deliberate and reviewable.
- [x] **UAT-FU-02**: **HumanReadableView extension cleanup** — `HumanReadableView.tsx` + `ResourcePropertyTable.tsx`: identifier-system URLs moved to tooltip (not rendered in main row); address-extension JSON replaced with a Modal viewer; all extensions collected into a "Extensions" section at the bottom with one row per unique `url` and a "View" button → Modal.
- [x] **UAT-FU-03**: **ResourceDetailPage mode cleanup** — `Clinical + raw` display mode removed entirely; `Developer` tab renamed to `JSON`. `ClinicalRawView.tsx` deleted. SegmentedControl options reduced from 4 to 3.
- [x] **UAT-FU-04**: **Dashboard MII tile scoping decision** — already resolved in MII-EXT-06. Cross-referenced here for traceability.
- [x] **UAT-FU-05**: **Per-type quality matrix card** (blocked on EFF-R14) — new card under Quality Counts tab: table with columns `Resource type | Complete% | Coverage% | Validation% | References% | Dup | Issues | chevron`. Each % cell has an inline horizontal fill bar. Chevron drill-down to per-type panel. Uses the new per-type slots of each per-metric context (Phase 32's EFF-R14 enables the per-type data).
- [x] **UAT-FU-06**: **Phase-30 UAT follow-up #4 fix propagation** — already resolved in MII-EXT-07. Cross-referenced here for traceability.

**Acceptance evidence:** All Phase-30 UAT gaps listed in `.planning/milestones/v1.4-phases/30-layout-redesign/30-UAT.md` Gaps section closed; live-Blaze UAT confirms Explorer Date/Status columns populated for Patient, Condition, Observation, and MedicationStatement.

## Cross-Cutting Verification (every phase)

- [ ] Design token compliance grep: `grep -rn 'color: #' src/ --include='*.tsx'` returns 0 new hits; no new `color="indigo"` literal outside Mantine theme primitives.
- [ ] Test baseline preserved: `npm test` shows 836+ passing / 0 failed after every atomic commit.
- [ ] `npm run build` exits clean (tsc -b + vite).
- [ ] Live-Blaze UAT per phase (smoke test at minimum).

## Out of Scope (explicit non-requirements)

- **Retry-with-backoff on 5xx** from external validator (anti-feature per FEATURES.md §2.b; adds complexity without predictable value)
- **Auto-populate `validator.fhir.org`** as default external validator URL (anti-feature; creates unexpected network calls)
- **Local full FHIR validator in the browser** (rejected per STACK.md; bundle-size cost > value)
- **IPS `emptyReason` extension support** on Patient detail panels (deferred; most Blaze servers don't serialize IPS Compositions)
- **Validator authentication** (Basic / Bearer) — rejected for v1.5; add if a Blaze user reports they need it
- **CSV export of per-type quality matrix** (P3 per FEATURES.md; adds in v1.6 if asked)
- **Semantic near-miss detection in UX-01** (P3; requires SNOMED CT + ICD-10 graph walking infrastructure)
- **Mantine 9 upgrade** (requires React 19; holds us on React 18 per Medplum 5.1.7 peer dependency)
- **State management library** (zustand / jotai / use-context-selector) — vanilla React per PROJECT.md locked decision
- **Rainbow color palette for 21 modules** (anti-feature per FEATURES.md §4.d; perceptual collapse under deuteranopia)

## v1.6+ (Deferred Requirements)

Tracked but not in this milestone:

- **IPS Compositions** (Empty-Sections-and-Missing-Data) support when a Blaze instance serializes them
- **CSV export** of per-type quality matrix (table → `.csv` download)
- **Semantic near-miss detection** for UX-01 (SNOMED CT + ICD-10 graph walking)
- **Validator authentication** (Basic/Bearer)
- **Mantine 9 upgrade** (coupled to React 19 upgrade; wait for Medplum 5.x peer-dep refresh)
- **Heat-column gradient** on per-type quality matrix
- **Pre-probe extension-module counts** on Patient detail (render count badge per tab before expand)

## Traceability (REQ-ID → Phase)

| REQ-ID | Phase | Depends on |
|--------|-------|------------|
| VAL-01..05 | 31 | — |
| EFF-R14-01..06 | 32 | — |
| MII-EXT-01..08 | 33 | MII-EXT-01 before -02 (ordering within phase) |
| MII-EXT-09..14 | 34 | MII-EXT-02 (schema), MII-EXT-04 (UI shell) |
| UAT-FU-01 | 35 | — |
| UAT-FU-02 | 35 | — |
| UAT-FU-03 | 35 | — |
| UAT-FU-04 | 33 (subsumed by MII-EXT-06) | — |
| UAT-FU-05 | 35 | EFF-R14-01..06 (per-metric data slots) |
| UAT-FU-06 | 33 (subsumed by MII-EXT-07) | — |

### Gap-closure phases (promoted from backlog 2026-04-25)

Phases 36-38 were promoted from backlog to close shelved clauses of existing v1.5 REQ-IDs identified in `v1.5-MILESTONE-AUDIT.md`. They do not introduce new REQ-IDs — they complete deferred portions of work already counted toward the 31 satisfied requirements.

| Phase | Closes | Source clause |
|-------|--------|---------------|
| 36 | MII-EXT-12 (lazy-load + real consumer) | Phase 34 D-23 WAIVE-AND-DEFER + v1.5-MILESTONE-AUDIT integration finding (orphaned `getExtensionProfileForUrl` exports) |
| 37 | MII-EXT-11 (empirical deuteranopia) + Phase 34 D-22 (TTI capture) | Phase 34 VERIFICATION overrides accepted by user |
| 38 | Phase 33 SC5 + Phase 35 SC5 (live-Blaze UAT clauses) — flips both VERIFICATIONs from `human_needed` → `passed` | `33-HUMAN-UAT.md` (6 tests, partial) + `35-HUMAN-UAT.md` (6 tests, shelved) |

## Research References

- `.planning/research/SUMMARY.md` — cross-document synthesis, locked decisions, phase ordering, top-5 pitfalls, resolved tensions
- `.planning/research/STACK.md` — single new devDep (`fhir-package-loader@^2.2.4`), 14 MII extension packages with versions + licenses, zero new runtime deps
- `.planning/research/FEATURES.md` — P1/P2/P3 priority breakdown, anti-features with rationale, 21-module UX patterns, per-type matrix table-stakes columns
- `.planning/research/ARCHITECTURE.md` — 7 integration questions file:line-verified, MII consumer enumeration, EFF-R14 producer/consumer map, phase dependency graph
- `.planning/research/PITFALLS.md` — 20 pitfalls with warning signs + prevention + phase mapping

## Sources

- `.planning/PROJECT.md` — v1.5 milestone scope lock (4 groups)
- `.planning/milestones/v1.4-phases/29-backlog-ux/29-02-PLAN.md` — preserved UX-01 plan (D-07..D-16 decisions)
- `.planning/milestones/v1.4-phases/30-layout-redesign/30-UAT.md` — 6 off-phase follow-up gaps
- `.planning/MILESTONES.md` — v1.4 accomplishments baseline
- Research documents listed above (all committed 2026-04-23 on main)
