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

### Validated (v1.6 — shipped 2026-04-30)

7 phases (39-45), 14 active plans. Phase 45 deferred to v1.7 via documented `WAIVE-AND-DEFER` (Mantine peer-dep gate failed). 1207 → 1240 tests passing across milestone; `npm run build` clean. See [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md) for full details.

- [x] **NYQ-01 + AUDIT-01** — v1.5 audit-trail backfill: 3 retroactive VALIDATION.md files + 5 `nyquist_compliant: false → true` flips + 38.1-VERIFICATION.md — Phase 39
- [x] **DEUT-01** — Headless deuteranopia simulation (Brettel/Machado JS matrix CIEDE2000 gate over 21 MII module adjacent pairs in vitest) — closes Phase 37 deferral — Phase 40
- [x] **EXPL-01** — Explorer "Hide empty resource types" toggle (Mantine Switch, localStorage-persisted) — Phase 41 (former 999.1)
- [x] **QUAL-01** — `/quality?tab=completeness` non-empty-types-to-top sort (N/A rows sink to bottom) — Phase 41 (former 999.2)
- [x] **QUAL-02** — Per-type quality matrix heat-column gradient — Phase 41
- [x] **QUAL-03** — CSV export of per-type quality matrix — Phase 41
- [x] **MII-EXT-15** — Pre-probe extension-module counts on Patient detail (`useMiiExtensionCounts` fans out `_summary=count` with per-type cache + zero-count tab dimming) — Phase 42
- [x] **VAL-06** — Validator HTTP authentication: Basic + Bearer (`Authorization` header injection AFTER PHI gate, bearer-token in `localStorage[validator.bearerToken.v1]` only — never persisted to settings.yaml; `auth-missing` / `auth-failed` notify events; banner reflects auth state) — Phase 43
- [x] **VAL-07** — Semantic near-miss detection (opt-in `semanticNearMisses: boolean`; bounded BFS over `CodeSystem/$lookup` parent/child hierarchy, depth=3, ≤50 nodes, ≤10 suggestions; "Did you mean?" inline expandable rows in `ResourceIssueTable`) — Phase 43
- [x] **IPS-01** — IPS Compositions support: `hl7.fhir.uv.ips@2.0.0` bundled (32 trimmed StructureDefinitions); URL-keyed lazy-load `IPS_REGISTRY` mirroring Phase 36; pure-function `validateIpsBundle` walker (16-section LOINC catalogue, 3 severity levels per D-09); new `IPSPanel.tsx` at `/quality/ips` (paste + server picker tabs); LICENSE/ATTRIBUTION compliance — Phase 44
- [~] **STACK-01** — Mantine 9 / React 19 upgrade — DEFERRED to v1.7 (peer-dep gate: `@medplum/react@5.1.9` peers Mantine `^8.0.0` only) — Phase 45 closed `deferred` with no source diff

### Validated (v1.7 — shipped 2026-05-04)

6 phases (46-51), 14 plans, 124 commits. v1.6 baseline: 1240 tests; v1.7 final: 1412 passing / 0 failing. `npm run build` clean. See [milestones/v1.7-ROADMAP.md](milestones/v1.7-ROADMAP.md) for full details.

- [x] **NAV-01** — `summarizeResource(r) → { primary, secondary? }` pure-function registry (8 typed R4 entries + generic walker); bundle −22.59 KB gz by deduping 3 inline copies — Phase 46
- [x] **NAV-02** — All 5 call sites (SearchResultsPage, FhirResourcesView, MiiModuleTab, PatientTimeline, ClinicalTimeline) migrated to `summarizeResource`; `extractSummary` symbol removed — Phase 46 + Phase 51
- [x] **READ-01** — References auto-resolve in HumanReadableView via lazy fetch + session-level `Map<type/id, Resource|null>` cache; silent 404 fallback — Phase 47
- [x] **READ-02** — Property-level extensions surfaced via `ExtensionChip` inline reveal — Phase 47
- [x] **READ-03** — Contained resources (`Resource.contained[]`) render inline via `ContainedResourcesAccordion` — Phase 47
- [x] **REVR-01** — Curated `reverseReferenceCatalog.ts` (9 source-type keys, typed `as const satisfies`) — Phase 48
- [x] **REVR-02** — `IncomingReferencesPanel` at bottom of every non-Patient resource detail; parallel `_summary=count` queries — Phase 48
- [x] **REVR-03** — `PatientRelatedResources` (107 → 28 LOC) + shared `RelatedResourcesPanel`; byte-identical Patient UAT snapshot — Phase 48
- [x] **GRPH-01** — Lazy `/explorer/:type/:id/graph` route (Graph button on ResourceDetailPage); initial-load delta −4.88 KB gz; lazy chunk 71.2 KB gz — Phase 49
- [x] **GRPH-02** — G1 graph: outgoing + incoming refs at depth 1–3; hard cap; `@xyflow/react@12.10.2` + `@dagrejs/dagre@3.0.0` — Phase 49
- [x] **GRPH-03** — Nodes clickable → `/explorer/{type}/{id}`; labels `summarizeResource(r).primary`; edge labels show FHIR field names; hover Tooltip with `.secondary`; patient-context preserved via `useParams` — Phase 49 + Phase 51
- [x] **GRPH-04** — Hierarchical dagre layout; Mantine CSS-variable theme bridge (zero-remount on light↔dark); zoom/pan/minimap — Phase 49
- [~] **STACK-01** — DEFERRED to v1.8 via Phase 50 WAIVE-AND-DEFER (second deferral; gate MIXED 2026-05-01). Acceptable closure per requirement definition.

### Validated (v1.8 — shipped 2026-05-05, Phases 52–57)

- [x] **PEEK-01..06**: JSON peek drawer (JsonViewer extraction, useShortcuts, PeekContext, JsonPeekDrawer) wired to Explorer, Patients list, IncomingReferencesPanel, Human-mode reference rows — Phase 52 (foundation) + Phase 53 (call-site expansion). *Validated in Phase 52–53: 2026-05-04*
- [x] **SHELL-01**: ResourceDetailPage 4-mode shell — `Summary | Human | Graph | JSON` mode switcher (`<Tabs variant="pills">`), `?mode=` URL persistence via `useSearchParams`, keyboard shortcuts 1/2/3/4 via `useShortcuts` — Phase 54. *Validated in Phase 54: 2026-05-04*
- [x] **SHELL-02**: Summary mode — `summarizeResource().primary` heading + `KeyFieldsTable` (8 typed FHIR R4 handlers + generic fallback, 4-6 fields per type) + reference panels in Summary-only slot — Phase 54. *Validated in Phase 54: 2026-05-04*
- [x] **SHELL-03**: Graph mode inlined via `React.lazy + Suspense`; `compact` prop suppresses standalone header; `/graph` routes redirect to `?mode=graph` via `NavigateToMode` — Phase 54. *Validated in Phase 54: 2026-05-04*
- [x] **SHELL-04**: JSON mode toolbar — Copy (clipboard), Download (`${resourceType}-${id}.json`), offline structural validation chip (`createStructuralBackend`), "Open in validator" in-app link; `JsonViewer.showLineNumbers` prop — Phase 54. *Validated in Phase 54: 2026-05-04*
- [x] **EXPL-01**: Explorer list two-line summary — primary bold (`fw={600}` `size="sm"`) + conditional secondary dim/mono (`c="dimmed"` `ff="monospace"` `size="xs"`) via `summarizeResource()` — Phase 55. *Validated in Phase 55: 2026-05-04*
- [x] **EXPL-02**: Density SegmentedControl (Cards/Table/Compact) with localStorage persistence (`explorer.density.v1`); Cards mode `SimpleGrid` + `Paper` with J-key focusability (`tabIndex={0}`, `onFocus/onBlur`) — Phase 55. *Validated in Phase 55: 2026-05-04*
- [x] **EXPL-03**: J key JSON peek on Explorer rows in all density modes (implementation from Phase 52–53; test coverage added in Phase 55) — Phase 55. *Validated in Phase 55: 2026-05-04*
- [x] **SIDE-01**: ⌘K command palette (`<Spotlight shortcut="mod+K">`) — lazy actions (0 until ≥2 chars), resource types from `CapabilityStatement` via `parseResourceTypes()`, grouped by `CATEGORY_ORDER`, action navigates to `/explorer/{type}` — Phase 56. *Validated in Phase 56: 2026-05-04*
- [x] **SIDE-02**: Expert Toggle — compact Switch row in sidebar footer; state persisted via `useLocalStorage({ key: 'app.expertMode.v1', defaultValue: false })` in `ExpertModeProvider`; default off — Phase 56. *Validated in Phase 56: 2026-05-04*
- [x] **SIDE-03**: Expert-mode effects — Explorer ID cells drop `truncate="end"` + `maxWidth` cap when `isExpert` (both Cards-mode Text + Table-mode Anchor); sidebar Server card shows monospace server base URL when `isExpert && serverUrl` — Phase 56. *Validated in Phase 56: 2026-05-04*
- [x] **SIDE-04**: Sidebar v2 polish — `⌘K` `UnstyledButton` hint above Server card (calls `openSpotlight()`); Explorer nav row `Badge` showing count of resource types with data > 0; `@mantine/spotlight/styles.css` imported — Phase 56. *Validated in Phase 56: 2026-05-04*

- [x] **LENS-02**: Outgoing References panel — `extractOutgoingReferences()` pure walker + `OutgoingReferencesPanel` (no Card chrome, monospace path label, Phase-47 ReferenceLink per entry); mounted in Summary mode for non-Patient resources after `IncomingReferencesPanel`; returns null when empty — Phase 57. *Validated in Phase 57: 2026-05-05*

### Active (v1.9 — Polish, Discovery & UAT Closure)

- [ ] **UAT-01** — Phase 58 UAT backlog closure: ~31 deferred browser-only items across Phases 42–54 (Groups A, C–G). Full inventory in `.planning/phases/58-uat-backlog-closure/58-CONTEXT.md`. Requires live Blaze + real browser. **v1.9 scope: close Groups A, C–G; WAIVE Group B (data-blocked, need Blaze seed fixtures) with revisit note.**
- [ ] **REVR-04** — CapabilityStatement-driven reverse reference discovery: replace hand-curated `reverseReferenceCatalog.ts` with a dynamic catalog built from the server's CapabilityStatement SearchParameters; fall back gracefully to the curated catalog when the CapabilityStatement is unavailable or incomplete.
- [x] **FIX-01..08** — Code quality sweep: 8 low-priority backlog items — NAV-01 (middle-click ReferenceLink loses patient context; needs `BasePathContext`), TYPE-01 (HumanReadableView `extension` double-cast), EDGE-01 (NavigationBreadcrumbs misses bare `/patients` path), EDGE-02 (referenceChecker id slice not validated against `FHIR_ID_PATTERN`), EDGE-03 (structuralValidator ignores `AbortSignal`), ERR-01 (ConnectionContext throws plain object not `Error`), TEST-01 (completenessWalker sliced-array limitation lacks regression test), ICON-01 (IconShareplay → IconExternalLink on `$everything` button). *Validated in Phase 59: 2026-05-24*

### Deferred (carry-forward, not v1.9)

- [~] **STACK-01** (deferred indefinitely — 2026-05-04): Mantine 9 / React 19 upgrade. Bottleneck remains `@medplum/react`'s `@mantine/core: ^8.0.0` peer pin. React 19 independently unblocked (`^18.0.0 || ^19.0.0`) but D-02 keeps them coupled.
  - **Re-attempt trigger:** `npm view @medplum/react peerDependencies` — if `@mantine/core` peer range now includes `^9.x`, open new phase.
  - **Reactivation source:** `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-CONTEXT.md` + `50-SUMMARY.md`.
  - **Out of scope (rejected workarounds — do NOT revisit without re-discussing D-05/D-06/D-07):** React-19-only upgrade (D-05), `--legacy-peer-deps` (D-06), Mantine 9 codemod preview (D-07).

## Current State

**v1.9 in progress** — Phase 59 (Code Quality Sweep) complete 2026-05-24. 8 LOW-severity backlog fixes shipped: `BasePathContext` for patient-context href preservation, `HumanReadableView` extension cast cleanup, `NavigationBreadcrumbs` bare-path fix, `referenceChecker` FHIR-ID validation, `structuralValidator` AbortSignal honoring, `ConnectionContext` Error-instance throws, completenessWalker sliced-array regression test, `IconShareplay → IconExternalLink` swap. 1544 tests passing / 0 failing. Code review surfaced 3 additional issues (CR-01..CR-03) for follow-up.

**v1.8 shipped 2026-05-05** — 6 code phases (52–57), 12 plans. v1.7 baseline: 1412 tests; v1.8 final: 1525 passing / 0 failing. `npm run build` + `tsc -b --noEmit` clean. src/ +5,296/−315 across 57 files. Key additions: JSON Peek Drawer (4 surfaces), 4-Mode Resource Shell, Explorer density modes, ⌘K Spotlight, Expert Toggle, Outgoing References Panel. Phase 58 UAT backlog documented — pending human walkthrough. See [MILESTONES.md](MILESTONES.md) and [milestones/v1.8-ROADMAP.md](milestones/v1.8-ROADMAP.md).

**App shape after v1.8:**

- **Explorer resource detail.** `ResourceDetailPage` now has 4 URL-driven modes via pill tabs: Summary (key fields table + incoming/outgoing reference panels), Human (HumanReadableView), Graph (lazy React Flow), JSON (copy/download toolbar + structural validation chip). Keyboard shortcuts 1/2/3/4 switch modes; `?mode=` param persists across navigation.
- **Explorer list.** Two-line summary cells (bold primary + dim/mono secondary). Three density modes via SegmentedControl: Table / Cards / Compact; persisted to `explorer.density.v1`. J key opens JSON peek in all modes.
- **JSON Peek Drawer.** Right-side 420px drawer opened by `J` on Explorer/PatientList rows or `⌘`+click on any `ReferenceLink`. Error-state branch for unresolvable references. 4 wired surfaces.
- **Sidebar.** `⌘K` opens AppSpotlight with lazy resource-type actions from CapabilityStatement. Expert Toggle (localStorage-persisted) reveals monospace IDs in Explorer and server URL in sidebar. Resource-type count badge on Explorer nav entry.
- **localStorage keys added in v1.8:** `explorer.density.v1`, `app.expertMode.v1`.

**v1.7 gap closure complete 2026-05-02** — Phase 51 closed GAP-1 (NAV-02 `extractSummary` removed) and GAP-2 (GRPH-03 patient context via `useParams`). See [milestones/v1.7-ROADMAP.md](milestones/v1.7-ROADMAP.md).

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

## Current Milestone: v1.9 Polish, Discovery & UAT Closure

**Goal:** Close the accumulated UAT backlog, fix 8 low-priority code issues, and upgrade reverse-reference lookup from a hand-curated catalog to dynamic CapabilityStatement-driven discovery.

**Target features:**
- Code quality sweep — 8 backlog fixes (NAV-01, TYPE-01, EDGE-01/02/03, ERR-01, TEST-01, ICON-01)
- Rev-ref CapabilityStatement-driven discovery (REVR-04) — dynamic catalog with hand-curated fallback
- UAT backlog closure (UAT-01) — Groups A, C–G from Phase 58; Group B WAIVEd (data-blocked)

<details>
<summary>Archived: v1.8 milestone goals (shipped 2026-05-05)</summary>

**Goal:** Make the resource detail experience production-quality — a JSON peek drawer accessible from any list, a 4-mode resource shell replacing the legacy 2-tab layout, Explorer UX improvements, a ⌘K command palette, an expert toggle, and an outgoing references panel completing the incoming/outgoing reference pair.

**Phases:** 52 (JSON Peek Drawer) → 53 (Peek call-sites) → 54 (4-mode shell) → 55 (Explorer UX) → 56 (Sidebar v2 + ⌘K + Expert Toggle) → 57 (Outgoing References) → 58 (UAT backlog, human-only)

</details>

<details>
<summary>Archived: v1.7 milestone goals (shipped 2026-05-04)</summary>

**Goal:** Make resources navigable. Improve the human-readable view, add a compact summary util used everywhere a resource appears in a list, surface incoming references at the bottom of resource details, and ship a graphical reference graph for the resource at hand.

</details>

**Bundle budget:** Initial-load delta target 0 KB gz (graph route is lazy-loaded; ~73 KB gz lands only when route is visited). Theme A util adds ~2–4 KB gz to initial chunk.

**Reference baselines (v1.6 close):** 1240 tests passing, `npm run build` clean.

<details>
<summary>Archived: v1.6 milestone goals (shipped 2026-04-30)</summary>

**Goal:** Close v1.5 tech-debt carry-overs, ship Explorer/Quality UX polish, and add two standards-track features (IPS Compositions, validator auth) without major redirection.

<details>
<summary>Archived: v1.6 milestone goals (shipped 2026-04-30)</summary>

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

</details>

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
*Last updated: 2026-05-11 — Milestone v1.9 started: Polish, Discovery & UAT Closure. Active requirements: UAT-01 (Phase 58 backlog closure), REVR-04 (CapabilityStatement-driven reverse reference discovery), FIX-01..08 (code quality sweep). STACK-01 moved to Deferred (indefinite). Deferred items not in v1.9: Graph G2, Graph depth > 3, federated cohort / CQL.*

*Last updated: 2026-05-02 — Phase 50 (Theme E — STACK-01 carry-over) closed `deferred` via WAIVE-AND-DEFER. Gate result MIXED at 2026-05-01: `@medplum/react@5.1.10` peers `@mantine/core: ^8.0.0` (Mantine 9 still closed) but `react: ^18.0.0 || ^19.0.0` (React 19 newly open). Per user decision D-02 (50-CONTEXT.md), React/Mantine remain coupled; entire upgrade defers to v1.8 deferred-items list. v1.7 milestone now at 5/5 phases complete; STACK-01 traceability flipped to `deferred → v1.8` in REQUIREMENTS.md. Closure docs: `50-SUMMARY.md` + `50-VERIFICATION.md` (status `passed` per v1.6 Phase 45 pure-doc closure precedent). v1.8 candidates block added: STACK-01 watch with `npm view @medplum/react peerDependencies` re-attempt trigger.*

*Last updated: 2026-05-01 — Phase 49 (Theme D — Graph View: Reference Graph, GRPH-01 + GRPH-02 + GRPH-03 + GRPH-04) complete: 3/3 plans (49-01 Foundation, 49-02 BFS+Node+Layout, 49-03 Theme+Tests+Bundle+UAT), status `human_needed` (5/5 ROADMAP success criteria auto-verified; 7 live-Blaze UAT items in `49-HUMAN-UAT.md` for tactile/visual checks). 49-01: pinned `@xyflow/react@12.10.2` + `@dagrejs/dagre@3.0.0` (exact, no caret); confirmed Mantine 9 / React 19 NOT pulled in transitively (5× `@mantine/core@8.3.18`, 0× v9); registered 9th lazy route `/explorer/:type/:id/graph` following Phase 27 EFF-02 precedent in `src/App.tsx`; mounted `IconAffiliate` "Graph" button in `ResourceDetailPage.tsx` toolbar `<Group>` next to "Raw JSON"/"$everything"; created Wave-0 scaffolds (`scripts/check-bundle-delta.cjs` 332.74 KB gz baseline, 3 test stubs with `it.todo()` markers). 49-02: shipped `useGraphBfs.ts` (272 LOC — depth-bounded BFS with `MAX_DEPTH=3` + `MAX_NODES=150` + `PER_FETCH_COUNT=100` constants, parallel `Promise.all` fanout per level, cancellation flag from Phase 48 `RelatedResourcesPanel.tsx:33-54` idiom — explicitly NOT `AbortController`), `ResourceGraphNode.tsx` (73 LOC — Mantine Card 220×64 with `summarizeResource(r).primary` label + Tooltip on `secondary` + indigo-6 root accent), `applyDagreLayout.ts` (63 LOC — `rankdir: 'TB'`, `nodesep=60`, `ranksep=90`, `edgesep=24`, `NODE_WIDTH=220 × NODE_HEIGHT=64`), filled 6 BFS+node tests (depth cap, node count cap, parallel fanout, click navigation, label render, tooltip secondary) — 1379 passing baseline. 49-03: replaced Plan-01 stub `<ResourceGraphView>` with full implementation (Slider depth control 1-3 with marks, React Flow Controls + MiniMap, smoothstep edges with FHIR-field-name labels, locked copy strings for empty/truncation/all-failed alerts, `data-testid="graph-flow-root"` for theme-switch invariant), shipped `graph.module.css` mapping 20 React Flow `--xy-*` CSS vars to Mantine `--mantine-color-*` (theme switches re-render zero React components — proven by `expect(refAfter).toBe(refBefore)` DOM identity test), filled remaining D-20 tests (theme switch invariant, dagre layout positions, edge label, parallel fetch fanout RTL), bundle gate **PASS** with main delta **−4.88 KB** (lazy chunk `ResourceGraphView-Bcu76g3a.js` 71.20 KB gz; main contains zero `xyflow`/`dagre` strings), scaffolded `49-HUMAN-UAT.md` with 7 manual-only verifications (pan/zoom feel, minimap drag, dark-mode fidelity, Slow-3G skeleton, empty-graph readability, truncation alert at 150 nodes, browser back/forward), flipped VALIDATION.md frontmatter `nyquist_compliant: false → true`. Test gate: 1386 passing / 1 pre-existing Phase-40 deuteranopia carry-over (NOT a regression); `tsc -b --noEmit` exit 0; `npm run build` exit 0 (526-554ms). Code review: 0 critical / 3 warnings (URL encoding defense-in-depth in `useGraphBfs.ts:126`, bundle-delta CLI fail-open on malformed `--max-delta-kb`, CSS module scoping leak in `graph.module.css`) / 5 info (advisory non-blocking — none introduce security or correctness issues). GRPH-01 + GRPH-02 + GRPH-03 + GRPH-04 satisfied; v1.7 Theme D (Graph View) closed pending live-Blaze HUMAN-UAT walk. v1.7 milestone progress: 4/5 phases complete (Phase 50 STACK-01 Mantine 9 gate is the final phase). Two new patterns established: (1) CSS-variable bridge for third-party canvas widgets (React Flow → Mantine) usable for any future graph/diagram surface; (2) BFS-with-cancellation-flag idiom over FHIR client extending Phase-48's parallel-fetch pattern to multi-level traversal. **Deferred to a follow-up phase:** the `Summary | Human | Graph | JSON` 4-mode resource shell from `design_handoff_v1.7_navigation/README.md` — represents the user's documented v1.7+ design direction but cannot be folded into Phase 49 without doubling its scope; tracked as a future phase to open after Phase 50 closes.*

*Last updated: 2026-05-01 — Phase 48 (Theme C — Reverse References / Incoming-References Panel, REVR-01 + REVR-02 + REVR-03) complete: 4/4 plans (48-01, 48-02, 48-03, 48-04), status `human_needed` (5/5 must-haves auto-verified; 3 live-Blaze UAT items scaffolded in `48-HUMAN-UAT.md` — UAT-01 panel-below-Tabs spatial check, UAT-02 card-click navigation on real data, UAT-03 Slow-3G skeleton visualization). 48-01 (REVR-01): new `src/utils/reverseReferenceCatalog.ts` (89 LOC) — typed const `as const satisfies ReverseReferenceCatalog`, 9 source-type keys (Patient byte-identical to old 11-entry RELATED_TYPES; plus Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, Practitioner) with D-03 corrections (no `MedicationStatement.reason-reference` per FHIR R4 SearchParameter audit). 48-02 (REVR-02): new shared `RelatedResourcesPanel.tsx` (102 LOC, fetch+skeleton+grid+click owner) + thin `IncomingReferencesPanel.tsx` (29 LOC) wrapper for non-Patient resources. 48-03 (REVR-03): refactored `PatientRelatedResources.tsx` 28 LOC delegate (down from inline 11-entry array + render block); relocated mount point in `ResourceDetailPage.tsx` from above-Tabs to below-Tabs ternary on `resourceType === 'Patient'`; pre-refactor 484-LOC snapshot in `__snapshots__/PatientRelatedResources.test.tsx.snap` proves byte-identical Patient-detail DOM through the refactor. 48-04 (gap closure for WR-01): composite-key helper `entryKey(e) = ${e.type}:${e.param}` introduced in `RelatedResourcesPanel.tsx` and routed through 8 collision sites (initial map seed, fetch resolve/reject, populated filter, JSX `key` prop on skeleton + populated card, `counts[...]` reads); FHIR query URL still uses `e.type` (composite-key is internal-only); visible card label still `<Text>{e.type}</Text>`. New regression test feeds two `Observation` entries with `has-member` + `derived-from` mocked to distinct totals 5/8, asserts BOTH cards render AND no React duplicate-key warning fires; Patient snapshot byte-identical (zero-line `git diff`). Code review post-48-04: status `clean` (0 critical / 0 warning / 0 info). Test gate: 25 phase-48 tests / 1371 full-suite passing / 1 pre-existing Phase-40 deuteranopia carry-over (NOT a regression); `tsc -b --noEmit` exit 0; `npm run build` exit 0 (537ms). Bundle delta neutral (component file LOC slightly increased by `entryKey` helper, but initial-load chunk unaffected — explorer pages already in main chunk). REVR-01 + REVR-02 + REVR-03 satisfied; v1.7 Theme C (Reverse References) closed pending live-Blaze HUMAN-UAT walk.*

*Last updated: 2026-05-01 — Phase 46 (Theme A — `summarizeResource` foundation, NAV-01 + NAV-02) complete: 2/2 plans, status `human_needed` (4/5 SC verified; SC#4 visual UAT postponed by user, captured in `46-HUMAN-UAT.md` with 3 deferred items). Wave 1 (46-01, NAV-01): new `src/utils/summarizeResource.ts` (328 LOC) — pure function `summarizeResource(r: Resource, now?: Date) → { primary, secondary? }`, typed switch over 8 R4 types (Patient/Observation/Condition/Encounter/MedicationStatement/Procedure/DiagnosticReport/AllergyIntolerance), `summarizeGeneric` 7-step walker for the long tail, inline djb2 base36-6 hash for Patient name-missing fallback (D-03) with explicit "NOT cryptographic" JSDoc; reuses `getCodeDisplay`+`toRecord` from `fhir-helpers`. Sub-decisions pinned by tests: A1 (`gender='other' → 'O'`), A2 (partial birthDate → omit `(age/sex)` parenthetical), A3 (HumanName legacy comma-join `family, given1, given2`), D-12 (generic walker → `secondary` always undefined). Test file `src/utils/__tests__/summarizeResource.test.ts` ships 52 tests across 12 describe blocks (1240 baseline → 1292 passing). Wave 2 (46-02, NAV-02): deleted 3 inline summary functions (`getResourceSummary` in `SearchResultsPage.tsx` line 32-70, `getSummary` in `FhirResourcesView.tsx` line 51-68, `getSummary` in `MiiModuleTab.tsx` line 20-38); all 3 sites now `import { summarizeResource } from '../../utils/summarizeResource'` and render via `{summarizeResource(r).primary}`; unused `toRecord`/`getCodeDisplay` imports cleaned from `MiiModuleTab.tsx` (Pitfall 6 closed). Net diff: +1014 LOC source / +686 LOC tests / −86 LOC migration deletions / 6 insertions across 3 component files. Bundle initial-load gz: 606.76 KB baseline → 584.17 KB (**−22.59 KB gz**, well within +5 KB Theme A budget — bundle SHRANK because deduplicated walker beats 3 inline copies). Test gate: 1292 passing / 1 pre-existing failure (deuteranopia pair #13, Phase 40 carry-over — NOT a regression); `tsc -b --noEmit` exit 0; `npm run build` exit 0 (459-693ms). Code review: 0 critical / 1 warning / 4 info (advisory — WR-01 generic walker drops `status` precedence step intentionally per D-11 / NAV-01 "NO status field"; IN-02 `now: Date = new Date()` weakens determinism claim at render sites; IN-03 missing zero-value test for `valueQuantity.value === 0`). NAV-01 + NAV-02 satisfied; v1.7 Theme A (foundation) closed pending visual UAT. Two new patterns: (1) typed-switch-with-cast registry mirroring `getResourceDateByType` (SearchResultsPage:108-167); (2) HumanName legacy comma-join helper extracted from inline call site to shared util. **Design handoff received during execution:** `design_handoff_v1.7_navigation/` — 4-mode resource shell (Summary | Human | Graph | JSON), JSON peek drawer (proposed Phase 46.5), sidebar v2 with Expert toggle + ⌘K, Patients-as-lens IA collapse — to be folded into Phases 47/48/49 scope or inserted as new phases.*

*Last updated: 2026-04-30 — Phase 44 (IPS Compositions support — IPS-01) complete: 2/2 plans, status `human_needed` (9/9 must-haves auto-verified; 2 manual-only items deferred — live-Blaze server-picker mode + large-bundle perf in `44-VALIDATION.md`). Wave 1 (44-01): new `scripts/fetch-ips-profiles.mjs` pins `hl7.fhir.uv.ips@2.0.0` (CC0-1.0); 32 IPS profiles bundled under `src/quality/profiles/ips/` (Composition + Bundle + 30 supporting SDs). Shared `scripts/lib/trim-profile.mjs` extracted DRY — both MII + IPS fetchers now import the same trim function (Phase 34 behavior preserved). `IPS_REGISTRY` URL-keyed lazy-load mirror of Phase 36 `EXTENSION_REGISTRY` (module-scoped Map + in-flight Promise sharing + StrictMode-safe). `getIpsProfileForUrl()` + `IPS_COMPOSITION_PROFILE_URL` const exported. `LICENSE` root file appended with HL7 IPS attribution section; `src/quality/profiles/ips/ATTRIBUTION.md` carries per-package metadata. `package.json` `prepare` hook chains MII + IPS fetchers with `|| true` offline-resilience (Phase 34 D-14 idiom preserved). T-44-05 license-compliance grep test (`hl7.fhir.uv.ips` AND `CC0-1.0` AND `2.0.0` in LICENSE). Wave 2 (44-02): pure-function `src/quality/ipsBundleValidator.ts` walks the 16-section IPS catalogue (3 required `min:1` — Problems `11450-4`, Allergies `48765-2`, Medications `10160-0`; 13 optional) embedded verbatim per RESEARCH §3; emits 3 severity levels (D-09: error=section-absent, warning=entry-empty, information=unresolvable-ref); `expression: ['Composition.section[N].title']` per D-11; synchronous (no async, no requestIdleCallback per D-16). Walker is DEDICATED — does NOT import `cascadingValidator` (per D-08; verified by grep). Bundle.entry slicing OUT of scope per RESEARCH A5 (section-level only). New `IPSPanel.tsx` at `/quality/ips` lazy route (Mantine 8 `<Tabs>` paste/server, `<JsonInput autosize minRows={10} maxRows={30}>` per D-15, `<Button loading>` + `<Skeleton height={200}>` per D-07). Sidebar entry "IPS Validator" under Quality cluster; `QualityOverviewPage.tsx` tile. `ResourceIssueTable.tsx` UNMODIFIED (verified: last modified Phase 43 commit `4b33ca1`). 3 fixtures (complete: 0 issues / incomplete: ≥2 / malformed: ≥2). Test gate: 1207 → 1240 passing (+33 net new); Phase 43 auth tests still green (no regression); `npm run build` clean; IPSPanel lazy chunk 14 KB raw / 4.3 KB gz. Code review: 0 critical / 2 warnings / 5 info (advisory non-blocking — IPSPanel handleValidate tab-switch race window WR-01; parseBundleFromPaste useCallback churn WR-02). All 12 phase-specific invariants PASS. IPS-01 satisfied; v1.6 Theme-4 (Standards & Stack) IPS half closed. Two new patterns established: (1) shared trim function across multiple package fetchers; (2) URL-keyed lazy-load registry parallel to MII extensions but in a separate license/attribution domain.*

*Last updated: 2026-04-30 — Phase 43 (Validator hardening — auth + semantic near-miss, VAL-06 + VAL-07) complete: 2/2 plans, status `human_needed` (7/7 must-haves auto-verified; 3 live-Blaze UAT cases scaffolded in `43-HUMAN-UAT.md` — basic-auth URL, bearer-token URL, invalid-SNOMED near-miss — deferred to manual session). Wave 1 (43-01, VAL-06): `validation.externalValidator.auth: { type: 'basic' | 'bearer'; username?; password? }` schema in `settings.yaml`; `cascadingValidator.tryExternal` injects `Authorization` header AFTER PHI gate, BEFORE `AbortController` (awk-locked at `phi=213 < auth=233`); bearer tokens live in `localStorage['validator.bearerToken.v1']` ONLY (grep-zero in `types.ts`/`settings.ts`/`settings.yaml`); new `ValidatorAuthSettingsModal` (Mantine 8 `PasswordInput`) writes/clears the key from `SettingsPage`; new notify events `auth-missing` (token absent → server-tier demote) and `auth-failed` (401/403 → demote with banner "auth: <type> — failed (server fallback)"); `useConformanceRun` carries `AuthBannerState`; probe-cache invalidation on bearer rotation via length-signature in `extSerialized` (T-43-04). Wave 2 (43-02, VAL-07): new `src/quality/semanticNearMissWalker.ts` — bounded BFS over `CodeSystem/$lookup` (parent + child properties), `MAX_DEPTH=3`, `MAX_NODES=50`, `MAX_SUGGESTIONS=10`, ancestors-first ordering, alphabetical tiebreak, visited-set defeats SNOMED `Is a` cycles; reuses Phase-4 `TerminologyResolver.lookupDisplay` LRU cache (no parallel cache); silent fallback when terminology unavailable (`return []` on null client / failed seed / try-catch in `fetchLookupWithProperties`); triple-condition gate (`semanticNearMisses && client && onSuggestions`) keeps default-off (Tests 24/24b/27); `NormalizedIssue.code` preserves raw `OperationOutcome.issue.code`; `ResourceIssueTable` renders inline `<Mantine.Collapse>` "Did you mean?" rows (chevron toggle, `Display | Code | Relation` columns, tooltip with full SNOMED display + system URL). Bundle delta +0.82 KB gz (within ±5 KB target). Test gate: 1207 passing / 1 pre-existing fail (Phase-40 deuteranopia pair #13, deferred-items.md) / 22 todo. Code review: 0 critical / 2 warnings / 4 info (WR-01 bearer-key constant duplicated across 3 files; WR-02 extSerialized localStorage-on-every-render). All 7 phase-specific invariants PASS automated verification: PHI-gate ordering, bearer-disk isolation, header-build locality, walker bounds, default-off, cache reuse, silent fallback. VAL-06 + VAL-07 satisfied; v1.6 Theme-3 (validator hardening) closed.*

*Last updated: 2026-04-29 — Phase 42 (Pre-probe extension-module counts — MII-EXT-15) complete: 2/2 plans, status `human_needed` (3/4 SC verified; SC #4 live-Blaze UAT walk deferred to `42-HUMAN-UAT.md` scaffold). New hook `src/hooks/useMiiExtensionCounts.tsx` fans out `_summary=count` GETs across 14 MII extension modules with `Promise.all`, per-type `.catch(() => 0)` fallback, hook-internal `useRef<Map>` cache keyed `${patientId}:${moduleId}`, cancelled-flag cleanup (NOT `AbortController` — Medplum v5.1.7 `client.get()` doesn't accept signal), and Phase-34 `EmptyExtensionsCoordinator.reportEmptiness` integration via stable-ref pattern (avoids infinite re-render loop from no-Provider fallback). `MiiModuleTabs.tsx` `TabPillLabel` extended with optional `count?` + `isEmpty?`; outer-div opacity-0.55 dim (NOT on `<Tabs.Tab>`, preserves Mantine 8 active-pill indicator per Pitfall #5); base 7 + Zeitleiste call sites byte-for-byte unchanged via prop-absence exemption (D-04). Test gate: 1154 passing / 22 todo / 1 pre-existing failing (deuteranopia pair #13, Phase-40 artifact, documented in `deferred-items.md` as out of scope); `npm run build` clean. Code review: 0 critical / 3 warnings / 6 info (advisory non-blocking — cache lifetime invariant docs, vacuous cache test, deep-link hidden-tab UX edge). MII-EXT-15 satisfied. Two new patterns established for project: (1) stable-ref read for context-no-Provider-fallback callbacks; (2) outer-div opacity dim for tab pills mirroring `MiiModuleTab.tsx:143` idiom.*

*Last updated: 2026-04-29 — v1.6 milestone defined: Hardening, UX Polish & Carry-Overs. 12 items across 4 themes (v1.5 closeout / UX polish / validator hardening / standards & stack). Phase numbering continues from 38.2 → starts at Phase 39. genomDE → MII CDS mapping pipeline removed from candidate scope (moved to a separate project).*

*Last updated: 2026-04-28 — Phase 37 (Phase 34 empirical UAT capture — deuteranopia + TTI) closed with **gaps_found** (deuteranopia leg deferred). D-22 TTI gate closed: `tti-snapshot.json` PASS (baseline 256.523 ms at commit `048e99c` Phase 33 tail / post-phase 268.604 ms at `a7e4544` Phase 34 HEAD / delta_ms +12.08 ms ≤ 100 / delta_pct +4.71% ≤ 10), method substituted to **Lighthouse 13.1 headless Chrome** rather than the plan-required Chrome DevTools Performance panel manual capture (substitution accepted by user; documented in `tti-snapshot.json.method` and `37-EMPIRICAL.md` §3). MII-EXT-11 deuteranopia leg **NOT closed** — user opted to skip the Chrome DevTools Rendering panel manual capture step at the `checkpoint:human-verify` gate; `37-EMPIRICAL.md` §1 (7 within-family pairs) and §2 (14 cross-family pairs) carry `[deferred]` markers in the Empirical column for all 21 adjacent pairs; the borderline pairs #7 (mikrobiologie ↔ molekulargenetik HIGH color-collapse risk) and #12 (pro ↔ seltene MEDIUM-HIGH risk) remain qualitative paper predictions only. `34-06-UAT.md` flipped to **PARTIALLY COMPLETE (TTI closed via Lighthouse; deuteranopia deferred to v1.6+)** with deuteranopia checkbox `[ ] DEFERRED 2026-04-28` and TTI checkbox `[x] PASS (Lighthouse-substituted)`. Branch A (no contingency) — source code untouched (`src/utils/mii-icons.ts`, `src/utils/mii-modules.ts`, `.planning/research/color-design-audit.md` last commits all from Phase 34). Test gate: 1060 passing / 0 failing; `tsc -b --noEmit` exit 0; `npm run build` clean. Code review skipped (zero source files changed in Phase 37 — doc-only phase). New v1.6+ candidate added to `.planning/ROADMAP.md` §Deferred Items: headless deuteranopia simulation in Vitest using a Brettel/Machado JS matrix to retroactively close `37-EMPIRICAL.md` §1+§2 for any future HEAD. v1.5 milestone now at last phase Phase 38 (HUMAN-UAT live-Blaze smoke tests, 12 items merged from former backlog 999.1+999.4). Phase 36 (lazy-load) summary preserved: 4/4 plans, MII-EXT-12 deferred lazy-load clause closed.*

*Last updated: 2026-04-26 — v1.5 in progress. Phase 36 (Phase 34 profile lazy-load — bundle-size waiver follow-up) complete: 4/4 plans, MII-EXT-12 deferred lazy-load clause closed. `src/quality/profiles/extensions/index.ts` switched from 501 eager static SD imports to 481 URL-keyed `() => import('./X.json')` thunks; `getExtensionProfileForUrl` now async with module-scoped `extensionProfileCache` + StrictMode-safe `extensionProfileInFlight` dedup Map; production caller wired in `useConformanceRun.ts` Step 2b (resolves extension SDs on-demand from `meta.profile[*]` then runs `validateConformance` per match). Bundle gate result: BASELINE_GZ_BYTES 949,591 → INITIAL_LOAD_GZ_BYTES 621,324 = **−320.57 KB gz initial-load delta** (4× under the 100 KB target). On-disk total grew +480 KB due to per-chunk gzip overhead from 472 individual extension-SD async chunks emitted by Vite — informational only; chunks are non-blocking (absent from `dist/index.html` initial-load critical path). Test gate: 1060 passing / 0 failed; `tsc -b --noEmit` exit 0; `npm run build` clean (504ms). Code review: 0 critical / 4 warnings / 5 info (advisory non-blocking — Set lookup for `BUNDLED_EXTENSION_PROFILE_URLS.includes`, `AbortController` not threaded through extension-profile loads, defense-in-depth on `sd.url` codegen, module-scoped cache reset API). Phase 35 (Phase-30 UAT Follow-ups + Per-Type Quality Matrix) complete: UAT-FU-01 per-type Date/Status extractors in `SearchResultsPage.tsx` for Patient/Condition/Observation/MedicationStatement/Encounter/Procedure (TDD baseline-drift commit pair landing 17 new dateStatus tests) with FHIR R4 field paths verified — Encounter uses `period.start` (not `.date`), Condition uses `clinicalStatus.coding[0].code` (CodeableConcept walk), MedicationStatement uses flat `effectiveDateTime`; UAT-FU-02 `HumanReadableView.tsx` extension cleanup — Mantine `<Tooltip>` on identifier-system URLs replaces inline rendering, Mantine `<Modal>` viewer for address-extension JSON, bottom "Extensions" section deduplicates `Resource.extension[]` by URL with `[View]` Modal per row + `aria-label="Close"` a11y; `ResourcePropertyTable.tsx` mirrors the Tooltip + Modal idioms; UAT-FU-03 `ResourceDetailPage.tsx` Tabs reduced 3→2 (NOT SegmentedControl 4→3 as initially specified — RESEARCH.md P-09 corrected), Developer→JSON rename, `ClinicalRawView.tsx` deleted (7 grep hits across 4 files cleaned to 0); UAT-FU-05 per-type quality matrix card via new `QualityByTypeMatrix.tsx` (402 lines) under `/quality?tab=counts` — 7 data + 1 chevron columns (Resource type / Complete% / Coverage% / Validation% / References% / Dup / Issues / chevron), sortable via `<SortableTh>`, sparse cells render em-dash (NEVER `0%`), threshold breach via `useThresholds().isBreached(metricKey, value)` curried hook, chevron deep-link to `/quality?tab=<metric>&type=<resourceType>` with PHI gate preserved (Phase 7); 5 per-metric contexts extended with `byType: Record<string, number>` slot + functional `setByType` setter; ValidationContext gains a NEW second slot `validationIssuesByType` for the Issues column (RESEARCH.md Q-01 resolution); 4 producers migrate (`useCompletenessReport`, `useCodingCoverage`, `ValidationPanel`, `ReferencesPanel`) with ValidationPanel + ReferencesPanel honoring `?type=` URL pre-selection via `useSearchParams` (Q-02); Phase 32 facade `useQualityMetrics()` invariant preserved (zero-line diff). Test gate: 1054 passing / 22 todo / 0 failing (998 baseline + 56 new). Code review: 0 critical / 4 warnings / 7 info (advisory). Shelved to backlog: Phase 999.4 (live-Blaze HUMAN-UAT — 6 observational items including Date/Status with real Synthea data, Tooltip hover, Modal transitions, bottom-Extensions visual layout, matrix card + chevron PHI gate). v1.5 milestone (Phases 31-35) at LAST PHASE — Phase 31 has gap-closure 31-02 outstanding; all other phases shipped. Ready to discuss milestone close-out.*
