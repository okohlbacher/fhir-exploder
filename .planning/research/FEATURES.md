# Feature Research — v1.5 Validation, Performance & MII Extensions

**Domain:** FHIR data quality auditing / MII-Kerndatensatz-native explorer for a local Blaze server
**Researched:** 2026-04-23
**Confidence:** HIGH for UX-01 (FHIR R4 spec is authoritative, prior-art exists in Firely/HAPI/Inferno/Touchstone); HIGH for per-type matrix (dashboard patterns well-established); MEDIUM for 21-module taxonomy (clinical-chart prior art is vendor-specific and not openly documented; MII extension-module list is confirmed from the MII site but complete resource-type mapping is inferred from existing `mii-modules.ts` plus MII FHIR IGs); MEDIUM for the 21-color strategy (categorical palette research is mature but medical-specialty color standards do NOT exist — this is a design choice, not a compliance requirement).

> NOTE: This file covers ONLY the NEW v1.5 features. Existing v1.0–v1.4 features (patient list, explorer rail, three display modes, 7 base MII tabs, 7 quality panels, OverviewStrip, thresholds, trends, PDF export, cohorts) are OUT OF SCOPE per `<milestone_context>`. See `.planning/milestones/v1.4-research/FEATURES.md` for the v1.4 feature baseline.

## Scope Overview

v1.5 ships four feature groups, researched below as distinct landscapes:

1. **External FHIR validator cascade** (UX-01) — three-tier (external → server `$validate` → local) with active-strategy indicator
2. **21-module patient-detail UX** — base (7) + extension (14) split with a collapsible "Extension modules" section
3. **Per-type quality matrix card** (Phase-30 UAT follow-up #3) — Resource type / Complete% / Coverage% / Validation% / References% / Dup / Issues table under the Counts tab
4. **Color strategy for 21 modules** — cross-cutting: applies to MII pill tabs, Dashboard MII tile grid, ClinicalTimeline badges, and extension-module badges/chips
5. **Empty-state UX for extension modules** — cross-cutting: what to show on /patients/:id when an Onkologie/Pathologie/MTB module has zero resources for the current patient

EFF-R14 (`QualityMetricsContext` per-metric split) is a pure internal refactor — no user-visible feature change — so it does not have a feature landscape. It is covered here only as a **dependency** for the per-type quality matrix (feature #3).

## Feature Landscape — 1. External FHIR validator cascade (UX-01)

### 1.a Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Three-tier cascade: external → server `$validate` → local structural | The user's current pain point is "Blaze doesn't implement `$validate`, so we only get the bundled-MII structural check". Table-stakes because it directly closes the v1.4 deferred UX-01 request and has a preserved plan (`29-02-PLAN.md`) with lockdown decisions D-07..D-16. | M | `src/quality/cascadingValidator.ts` per the plan. Cascade decision is per `(serverUrl, resourceType)` — some types have `$validate` on Blaze, others don't. |
| Capability probe via existing `CapabilityStatement` | FHIR R4 canonical mechanism: walk `rest[].resource[].operation[]` for `name === 'validate'`. `QualityLayout` already fetches the CapabilityStatement and exposes it via `useOutletContext<QualityOutletContext>()` — no new HTTP. | S | Zero-HTTP addition if we reuse existing capability. Memoize per `serverUrl` (matches Phase 24 `Map<serverUrl, ...>` foundation). |
| Active-strategy indicator on ValidationPanel | Today the `ValidationPanel` shows 3 static badges (Conformance / Terminology / Remote (configured)) that conflate "configured" with "active". Users cannot tell which tier ran. REQ: replace the static badge row with a one-line status: `Active strategy: external` \| `Active strategy: server` \| `Active strategy: local` reading from the probe cache. | S | Single `<Text>` line above the issues table. Per 29-02 `must_haves`: "sourced from the probe cache for the currently selected resource type". |
| PHI acknowledgment gate before external tier | `quality.validation.phiAcknowledged.v1:{serverUrl}|{externalUrl}` already exists as an inline gate in `ValidationPanel.tsx:72,100-107,235,270-294`. Must be EXTRACTED to `src/quality/phiGate.ts` so `cascadingValidator.ts` can consult it non-UI-ly. Regression test: `vi.spyOn(global, 'fetch')` must observe zero external fetches before consent. | S | Plan D-09. Extraction is ≤30 LOC shared across two consumers; writing the fetch-spy regression is the hard part. |
| `AbortController` + 15s timeout per external call | Users expect "if this is slow, cancel it gracefully". 15s is the plan's locked default. On timeout, fall back to server tier and show a blue Mantine toast: `External validator timed out after 15s — falling back to server`. | S | Plan D-10. `notifications.show({ color: 'blue', autoClose: 5000, ... })`. |
| `normalizeOperationOutcomeIssue` mapper shared between Resources tab and external tier | Prevents drift. Extract `ValidationPanel.tsx:167-178` to `src/quality/normalizers.ts`. ≥5 unit tests: severity mapping, location fallback, code extraction, extension handling, empty-issue fallback. | S | Plan D-12. |
| Settings schema: `validation.externalValidator: { url, enabled, timeoutMs }` | Backward-compatible extension of existing `validation.validatorUrl`. `enabled: false` default so config migration is additive. Documented in `public/settings.yaml` as a commented example block. | S | Plan D-07. |
| Probe cache invalidation on server-URL change | Matches the D-10 cohort-cache pattern: when user switches servers, previous probe result is stale. | S | Clear probe Map entries whose key starts with old serverUrl. Already established pattern from Phase 24. |
| Suppress "Blaze `$validate` unsupported" banner when `hasRemote === true` | Current banner claims "we'll run local structural"; if external is configured the actual path is external, not local. Conflicting messaging is worse than no messaging. | S | One conditional guard at the banner render site. |

**Complexity rollup:** 1 plan (29-02) already written with locked decisions, 3 new source files + 3 test files + touches to 6 existing files. Total: **M** (medium). Single phase.

### 1.b Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Test connectivity" button next to validator URL in Settings | Firely Simplifier's Validator Playground has a dropdown picker; HAPI Tester has a banner. None offer a single-click "is the URL I pasted actually a validator?" probe. Returns: reachable / reachable but no `$validate` / unreachable. | M | `GET {validatorUrl}/metadata` → search operation array. Slightly more than the cascade itself but isolated to the Settings UI surface. DEFERRED per 29-02 (not in must_haves); flag as v1.5 P2 addition if cycles permit. |
| Per-resource-type active-strategy (not one strategy for the whole run) | Blaze may publish `$validate` on Observation but not on MedicationStatement. The cascade decision is per-type, not per-run. Surface that in the status line: `Validating Condition via server · Validating Observation via local`. | M | Requires the status line to be per-type. If the run covers 1 type at a time (current behavior per `ValidationPanel`'s single-type Select), this is already cheap. |
| Latency annotation on the active-strategy line | `Validating via external · avg 2.3s/resource`. Trust-building for users comparing validators. | S | Track p50 per probe-cache entry. Defer — adds instrumentation slot without proven user ask. |
| Dismiss-per-session toast for timeout fallbacks | Show "external→server" toast once, not every time. Reduces notification fatigue on a slow validator. | S | Simple session-scoped Set. Worth doing. |

### 1.c Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-populate `validator.fhir.org` when no validator configured | "Just make it work" | Surprising PHI egress to a third-party service. Public validator has no SLA, rate-limited. Violates the explicit PHI-acknowledgment gate's intent. v1.4 FEATURES.md flagged this exact anti-feature. | Keep explicit-config requirement. Settings UI may SUGGEST `https://validator.fhir.org/validator` as a placeholder but never auto-populate. |
| Build a local full FHIR validator in browser | "Full offline operation; no PHI egress" | Full FHIR validation = snapshot generation, terminology, slicing/discriminator, FHIRPath evaluation, profile chasing — JVM-size dependency. The official validator is Java. No credible JS port exists. | Keep the structural checker (v1.0) for offline use; rely on external validator for high-fidelity. Document the gap inline. |
| Retry with exponential backoff on validator 5xx | "Validators behind a CDN may 503 once" | Adds latency on the common failure case (misconfiguration, not flake). A local tool's user wants fast feedback. | Single attempt + clear error message. User can re-run if they believe it was transient. |
| Stream partial OperationOutcome | "Show issues as they arrive" | FHIR `$validate` is request/response, not streaming. No SSE/websocket spec. Cross-validator implementations don't support it. | Per-resource progress bar (already exists in `RunProgress`). |
| Server-side `mode=create/update/delete` validation | "Simulate conflicts on update" | App is read-only by charter. `mode=none` (default) is correct. | Hardcode `mode` absent. |

### 1.d Prior-Art Reference

| Tool | Active-validator disclosure pattern | What we borrow |
|------|-------------------------------------|----------------|
| [Firely Simplifier Validation Playground](https://simplifier.net/organization/firely/news/192) | Dropdown picker: "validator to use" (new .NET / legacy .NET / Java). Shows issues inline, annotated on the resource. | Dropdown is too heavyweight for our use case (we auto-cascade, not pick). Borrow the inline annotation idea via the existing `ResourceIssueTable` drill-down. |
| [HAPI FHIR Tester](https://hapifhir.io/hapi-fhir/docs/validation/instance_validator.html) | Banner with current endpoint URL | Minimalist. Borrow: show external URL in the status line when tier === external. |
| [Inferno Framework](https://inferno-framework.github.io/docs/writing-tests/fhir-validation.html) | Labels each test with its endpoint; silent-skip when capability absent | Silent-skip is wrong for us (user gets no feedback). Borrow: surface the fallback decision in a toast. |
| [Touchstone (AEGIS)](https://touchstone.aegis.net/) | Requires the validator URL upfront, no auto-discovery | Too rigid. Our cascade auto-discovers server capability; Touchstone's "config-first" model is exactly what we're avoiding. |
| [validator.fhir.org](https://validator.fhir.org/) | Web form — paste resource, get OperationOutcome | Single-shot, no cascade. Reference for the default external URL in Settings. |

## Feature Landscape — 2. 21-module patient-detail UX

### 2.a Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Schema: `MiiModule.fhirResourceType: string \| string[]` + `category: 'base' \| 'extension'` | Current type is `fhirResourceType: string` (single type). Extension modules map to MULTIPLE resource types: Onkologie = `Condition` + `Procedure`; Bildgebung = `DiagnosticReport` + `ImagingStudy`; Pathologie = `DiagnosticReport` + `Specimen`; MTB = `ServiceRequest`. Hardcoding single-type breaks them. | M | Discriminated field. `mii-modules.ts` has 7 entries; extending to 21 is the mechanical part; the type union + all consumer call-sites (MiiModuleTab, ClinicalTimeline, FhirResourcesView, DashboardPage MII tile grid) need to handle the `string \| string[]` branch. |
| Collapsible "Extension modules" section below the 7 base pill tabs on `/patients/:id` | Per `<milestone_context>`: "collapsible Extension modules section below the 7 base-module tabs". Matches `<details>`/Mantine `Collapse` idiom already used on Dashboard's "Data by Category" and "MII Kerndatensatz Modules" collapsible sections. Respects user's locked `MII_MODULES` ordering for the 7 base tabs. | M | Mantine `<Collapse>` + controlled `opened` state in `localStorage` key `patients.extensionModules.expanded.v1` so the user's preference persists. Default: **collapsed** — 14 extra tabs is too much on first visit. |
| Per-module `patientSearchParam` already on `MiiModule` | Already in schema (`src/utils/mii-modules.ts:29`). Some extension modules still use `subject=` instead of `patient=` — this field absorbs that variation without a per-call-site conditional. Existing modules use `patient` except Person (uses `_id`). | S | Add `subject` as the param for modules whose primary resource uses `subject=Reference(Patient)`: ResearchStudy (N/A — not patient-scoped), DocumentReference (`patient`), Specimen (`subject`), ImagingStudy (`patient`), ServiceRequest (`patient` works). |
| Module name + FHIR type subtitle on every tab | Already the pattern on the 7 base tabs (`TabPillLabel`): German primary / FHIR resource type secondary. For multi-type modules, show the primary resource type or a count (e.g., `Bildgebung · DiagnosticReport + ImagingStudy`). | S | Reuse `TabPillLabel`. Multi-type label: show `N types` or join with `+` sign for 2-type cases. |
| Empty-state UX for zero-resource modules (see landscape #5 below) | 14 extension modules × N patients — most will be empty for most patients. UX must not make the user wade through 14 empty tabs. | M | See landscape #5. |
| Dashboard MII tile grid extension: ALL 21 modules or only 7 base with "+ 14 extensions" summary tile | Dashboard MII tile grid (per Phase 30) shows server-wide counts in a 4-col grid. Adding 14 more tiles = 21 tiles = 6 rows at 4-col. Too visually dense. | M | Two options: (a) keep dashboard at 7 base + one summary tile linking to a dedicated MII modules page; (b) show all 21 with a "Base modules" / "Extension modules" section split mirroring the patient page. Recommend (b) for consistency. |

**Complexity rollup:** Schema change (S) + 14 new module entries (S) + collapsible section (S) + DashboardPage extension (S) + empty-state UX (M) + per-module patient-search-param verification (S). Total: **L** (large) — likely a single phase spanning 2-3 plans.

### 2.b Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Relevance filtering" — hide extension modules with zero resources by default | Respects the Phase 30 Dashboard pattern (MII tiles with count 0 render at 55% opacity, em-dash). On `/patients/:id`, pre-probe counts per module and hide zero-count extensions behind a "Show N empty modules" toggle. | M | Requires a pre-probe (`_summary=count`) across 14 extension modules' primary resource types at patient-detail mount. 14 parallel HEAD-like GETs = ~500-800ms cold. Defer to first-open of the collapsible section to avoid delaying the Person/Fall/Diagnose first-paint. |
| Extension-module counts in the collapsible section header | `Extension modules (3 with data / 14 total)` — user learns at a glance how many apply to this patient BEFORE expanding. | S | Derived from the pre-probe above. |
| Badge on each extension module showing per-patient count | Small dimmed count next to module label when >0: `Onkologie · 3`. Matches Explorer rail dimmed counts. | S | Data already available from pre-probe. |
| "Jump to extension with most data" shortcut | For a cancer patient with 50 Onkologie-Conditions, open Onkologie directly when collapsible expands. | S | Auto-select the highest-count extension module on first expand. |
| German-label-first sort within extension section | Base modules keep their curated order (Person, Fall, Diagnose, …). Extension modules are alphabetical by German label (Biobank, Bildgebung, Dokument, Intensivmedizin, Kardiologie, Mikrobiologie, Molekulargenetik, MTB, Onkologie, Pathologie, PRO, Seltene Erkrankungen, Studie, Symptom). Predictable muscle memory. | S | `MII_EXTENSION_MODULES.sort((a,b) => a.germanLabel.localeCompare(b.germanLabel, 'de'))` once at definition. |

### 2.c Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-hide extension modules without data entirely (no toggle) | "Less clutter" | Hidden modules are undiscoverable — a user who doesn't know Pathologie exists will never learn it's an option. Violates the "FHIR Exploder = browse ecosystem without deep FHIR expertise" core value. | Collapse-by-default + "Show N empty modules" explicit toggle. Modules exist, user can find them. |
| All 21 tabs in one flat row | "One tab row is simpler" | 21 tabs at ~100px each = 2100px. Exceeds viewport on any realistic display. Forces horizontal scroll or pill-wrap. Both are cognitive hell. | Base/extension split with collapsible extensions. Done. |
| "Smart" grouping (Diagnostik together: Onkologie, Pathologie, Molekulargenetik) | "Clinical logic" | Adds a second taxonomic layer that users have to learn. MII itself does NOT group extensions beyond "base vs extension". Imposing our grouping is opinionated mid-scope. | Alphabetical within extensions. Refactor if MII ever publishes an official grouping. |
| Render every extension tab's content eagerly on patient-load | "Snappy tab switches" | 14 parallel patient-scoped searches on every patient visit = 14×200ms = 2.8s extra cold load. For a patient with zero cancer data, that's 14× wasted round-trips. | Lazy-render each extension tab's content on first activation (matches current `MiiModuleTabs` `keepMounted` semantics — mount on first switch, keep mounted thereafter). |
| Pin user-favorite extension modules to the top | "Power users want their specialties first" | Adds preference-persistence complexity, conflicts with the "discover the ecosystem" core value, and cohort scoping already exists for power-user slicing. | Alphabetical order + collapse state memory in localStorage is enough. |

### 2.d Prior-Art Reference

| Tool | Taxonomy handling | What we borrow |
|------|-------------------|----------------|
| [Epic Chart Review](https://epicsupport.sites.uiowa.edu/epic-resources/chart-review) | Tabbed interface with specialty-specific customization; users can customize which tabs show and which are hidden, with Bookmarks tab for key items | Customization-first philosophy — but we apply "show empty modules" toggle rather than per-user pinning. Epic bookmarks are out of scope for a read-only tool. |
| [Cerner PowerChart Ambulatory](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Ambulatory_Organizer/Ambulatory_Organizer_in_PowerChart.htm) | Three tabs (AMB Summary / AMB Custom / Future Orders); 3-column summary layout; user-based customization with expand/collapse defaults per component | Collapse-by-default for heavy sections matches our "collapse extensions" default. |
| [Medplum Chart Demo](https://github.com/medplum/medplum-chart-demo) | Left panel patient history, center panel notes; uses `PatientTimeline`, `Tabs`, `ResourceAvatar`; composes multiple FHIR resources into tabs | Confirms the "tabs per resource type" pattern is idiomatic in Medplum's own reference. |
| IPS (International Patient Summary) empty-section handling | FHIR-standard: `Composition.section.emptyReason` with codes `unavailable` / `notasked` / `asked-declined` | Philosophy: absence has semantics. Our empty-state UX inherits this — "no data" ≠ "module doesn't exist". |

## Feature Landscape — 3. Per-type quality matrix card (Phase-30 UAT #3)

### 3.a Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Columns: Resource type / Complete% / Coverage% / Validation% / References% / Dup / Issues / chevron | Phase 30 handoff spec (from 30-01-SUMMARY.md deferred item #1 and Step 4 commit). Matches per-metric columns users already understand from the OverviewStrip. | S | Layout is `Mantine <Table>` + `SortableTh` (already extracted in Phase 25). |
| Sortable by every column | Users want "show me the WORST type for Validation%" at a glance. | S | `SortableTh` handles sort state; each column provides accessor. |
| Clickable row → drill-down to the resource-type's panel (or the per-resource issue list filtered to that type) | Matches the existing drill-down pattern (v1.2 DQ-01) where metric tiles navigate to `/quality?tab=X`. The matrix row should navigate to the issue list filtered to that type. | S | Reuse existing `ResourceIssueTable` routing; add optional `?resourceType=X` filter query param. |
| Conditional formatting (cell color by breach) | Users scan tables for red first. Threshold breach per cell in a metric's column should show red text + subtle red cell background. Matches OverviewStrip's breach treatment. | S | Reuse `isBreached(key, value)` per cell. |
| Lives under `Counts` tab (not a new tab) | Phase 30 scoping: "per-type quality matrix card under Counts tab". User already goes to Counts for per-type numbers. | S | New `<Card>` below the existing counts table. |
| EFF-R14 per-metric context split is a PREREQUISITE | `QualityMetricsContext` today exposes only overall aggregates (7 `overall*` numbers). The matrix needs per-`(resourceType, metric)` values. EFF-R14 splits the context so each metric owns its per-type record. | L | EFF-R14 itself is a pure refactor but MUST land before the matrix. ~20 files touched; no public API change from consumer standpoint. |

**Complexity rollup:** Matrix itself is S. EFF-R14 prerequisite is L. Total **M+L** — EFF-R14 as one phase, matrix as a follow-up plan.

### 3.b Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Heat-column per metric (green→yellow→red gradient cell background) | At-a-glance heat-map read. Great Expectations' Data Docs use this; dbt's Elementary dashboard uses this. For 20+ types the visual scan is much faster than numbers alone. | M | CSS variables per-cell based on percent. Risks conflicting with OverviewStrip's binary breach treatment — pick a consistent rule (we use text color only for cells; reserve cell background for breach). |
| Mini-sparkline per row showing 7-day trend | Users inherit trends-history from v1.2. Per-type trend visibility is absent. | M | `trendsHistory` already stores per-snapshot data; extracting per-type is schema-dependent. Defer until trends schema explicitly records per-type. |
| Column chooser | 7 columns may be too many on narrow viewports. | M | Defer. Matrix is new; ship with all columns visible; re-evaluate. |
| Export matrix to CSV | Parity with PDF export, but tabular. Useful for data stewards. | S | `downloadString` helper from `fdpgCodec` era already in the codebase. Defer past the MVP. |

### 3.c Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time auto-refresh of matrix every 30s | "Live quality view" | Recomputing is expensive (sampling + walker per type). Quality metrics change slowly. Live refresh is a battery/bandwidth cost without proportional value. | Explicit Recompute button (already exists in the Quality toolbar). Auto-tick only the "Last computed Xm ago" label. |
| Combined "Overall Quality" rank column | "Which type is the worst overall?" | Combining orthogonal Kahn dimensions into one score hides which dimension failed. Already established as an anti-feature in v1.4 FEATURES.md. | Separate columns + sort-by. User picks the dimension. |
| Nested matrix (resource type × profile) | "Some types have multiple profiles" | Two-axis matrices are hard to scan; most users care about the type, not the profile. | Keep the matrix one row per resource type. If a type has multiple profiles, show the worst-breach one and link to profile-specific drill-down. |
| Rank types by breach severity | "Put the worst first" | Default sort should be stable (alphabetical by type). Users learn position; re-sorting on every render breaks muscle memory. Same argument as OverviewStrip v1.4 anti-feature. | Default alphabetical. User can sort by any column. |

### 3.d Prior-Art Reference

| Tool | Per-table matrix pattern | What we borrow |
|------|--------------------------|----------------|
| [Great Expectations Data Docs](https://www.getorchestra.io/guides/data-quality-with-dbt-great-expectations) | Auto-generated HTML reports with per-expectation tables, pass/fail status per check, sortable columns | Auto-generate from engine output pattern; sortable columns. |
| [dbt-expectations + Elementary](https://www.metaplane.dev/blog/dbt-expectations) | Per-model test-result dashboards; heat-cell coloring; links to failed row samples | Heat-cell coloring on breach (we already do this on OverviewStrip). Failed-row drill-down (we already have this via `ResourceIssueTable`). |
| [Soda Core dashboards](https://atlan.com/open-source-data-quality-tools/) | Per-table / per-column monitors; alert severity columns; history sparklines | Per-table view confirms the pattern. Alert severity columns match our breach treatment. |
| [OpenRefine faceting](https://openrefine.org/docs/manual/facets) | Per-column facets with text/numeric/duplicates/blank count displays; visual inline indicators | Confirms "per-column metric display" is an established idiom in data-quality tooling. OpenRefine's duplicates/blank facets map directly onto our Dup/Completeness columns. |

## Feature Landscape — 4. Color strategy for 21 modules

### 4.a Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Every module has a deterministic visible color | Already the pattern: `MiiModule.badgeColor` on all 7 base modules. Cannot ship 21 modules with 14 unstyled tabs. | S | Deterministic = same module → same color across sessions and surfaces (tab, badge, timeline, dashboard tile). |
| Mantine's 14-color palette (`blue`, `indigo`, `violet`, `grape`, `pink`, `red`, `orange`, `yellow`, `lime`, `green`, `teal`, `cyan`, `gray`, `dark`) does NOT cover 21 unique modules | 21 > 14. Picking colors randomly = duplicates = confusion. | — | Math. |
| Accessibility: WCAG contrast on every color against white and indigo pill background | Already a Phase 30 UAT item (pill contrast fix for MII tabs, eec2331). Any 21-color palette must pass AA (4.5:1) for text on the pill. | S | Enforce at palette-selection time, not runtime. |
| Deuteranopia-safe (no red/green adjacency) | ~1% of males have deuteranopia. A 21-color palette has high risk of placing red and green next to each other in a tab bar. | M | Sort by perceptual luminance + hue, alternate cool/warm. |
| Color is NEVER the sole discriminator | UX standard: color + shape / icon / label. We already do this (label + FHIR-type subtitle + badge color). | S | Inherit. The pill label + subtitle does the heavy lifting; color is secondary. |

### 4.b Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-category palette: base modules share a muted indigo family, extension modules use distinctive hues | Visual grouping of "base" vs "extension" reinforces the hierarchy without a border. | M | Base modules in 7 shades of indigo/gray (muted, foundational). Extension modules get the colorful end of the palette — matches "these are domain-specific, attention-grabbing". |
| Category-grouped palette (future-proof): Diagnostik modules (Pathologie, Mikrobiologie, Molekulargenetik) share a hue family | If MII publishes categorization later, we're aligned. If not, still visually communicative (three diagnostik modules lighting up together in timeline = visible cluster). | M | Assign hues by likely grouping: Diagnostik → cyan/teal family; Onkologie/Seltene Erkrankungen/Kardiologie → warm family; Dokument/Studie/PRO → neutral/gray family. |
| Deterministic hash-to-color for unknown modules | Future-proofing: a 22nd module appears, the palette doesn't need curated extension. | S | `hash(module.key) % 20` into a curated 20-color Glasbey-like palette. Defer until we actually have an unknown module; curated is better for MVP. |
| Palette generation via Glasbey algorithm (maximally perceptually distinct) | 32 maximally-distinct colors, CAM02-UCS color space. Published 2007. Widely used in data-viz for categorical sets >14. | M | Overkill for 21 modules; hand-curate from Mantine palette shades (e.g., `indigo.6`, `indigo.3`, `teal.6`, `teal.3`, …) to get 21 distinct values within the existing theme. Glasbey is the fallback if curation fails. |
| Per-module icon via Tabler Icons | Color + icon = two-channel differentiation. Covers color-blind users without relying on shape. | M | `IconMicroscope` for Pathologie/Mikrobiologie, `IconDna` for Molekulargenetik, `IconHeart` for Kardiologie, `IconLungs` for Intensivmedizin, etc. Tabler Icons ships ~5000+ glyphs; 21 fits easily. This is the HIGHEST-leverage differentiator — replaces the color-crisis entirely. |

### 4.c Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| ICD-10 / body-system color coding | "Clinical convention" | There is NO such convention. Different EHR vendors use different palettes. Epic ≠ Cerner ≠ Medplum. Imposing one invents a standard. | Our own palette, deterministic, documented. |
| Generate random colors per module at runtime | "Easiest to implement for 14+ modules" | Random = non-deterministic across sessions = broken muscle memory. Also risks low-contrast or deuteranopia-hostile picks. | Hand-curated 21-color palette checked into `mii-modules.ts`. |
| Rainbow palette (evenly-spaced hues) | "Maximum distinction" | Bright saturated hues fatigue the eye in a tab bar. Low-luminance differences between reds/greens trip deuteranopia. | Muted mid-luminance palette from Mantine's `.4`/`.6` shades. |
| Using just two colors (e.g., indigo for base, teal for extension) | "Simpler" | Can't distinguish one extension module from another by color alone — falls back entirely to the label. Loses the quick-scan affordance that base modules enjoy today. | Base = muted indigo family; extensions = distinct (but harmonized) hues per module. |
| Emoji or flag icons in tab labels | "Universal, colorful" | Emoji rendering varies by OS; cross-platform inconsistency. Flags are political. Tabler line icons are safer. | Tabler Icons per module. |

### 4.d Concrete palette proposal (to seed Requirements phase)

```ts
// 7 base modules — cool/muted family (existing v1.4 assignments preserved)
person       → 'blue'    (blue.6)
fall         → 'indigo'  (indigo.6)
diagnose     → 'teal'    (teal.6)
prozedur     → 'violet'  (violet.6)
consent      → 'pink'    (pink.6)    // slightly warm outlier = governance
laborbefund  → 'cyan'    (cyan.6)
medikation   → 'orange'  (orange.6)

// 14 extension modules — assigned to avoid clashing with base and
// maintain hue-family grouping where clinical intent permits:
onkologie          → 'red'     (red.7)     // gravity; distinct from pink
pathologie         → 'grape'   (grape.6)   // diagnostik family
mikrobiologie      → 'lime'    (lime.7)    // diagnostik family
molekulargenetik   → 'yellow'  (yellow.7)  // diagnostik family
bildgebung         → 'cyan'    (cyan.4)    // lighter cyan, offset from laborbefund
intensivmedizin    → 'red'     (red.5)     // urgency; lighter than onkologie
kardiologie        → 'pink'    (pink.8)    // heart; darker pink offset from consent
symptom            → 'orange'  (orange.4)  // lighter orange offset from medikation
seltene_erkrankungen → 'violet' (violet.3)  // uncommon; lighter violet offset from prozedur
biobank            → 'gray'    (gray.7)    // tissue/storage; neutral
studie             → 'gray'    (gray.5)    // research; neutral
dokument           → 'dark'    (dark.4)    // reference; dark neutral
mtb                → 'indigo'  (indigo.3)  // tumor board; lighter indigo offset from fall
pro                → 'green'   (green.6)   // patient-reported; distinct green
```

**Caveats:** Several extension modules reuse base-module hues at different shades (Kardiologie = `pink.8`, Consent = `pink.6`). In a tab bar this is distinguishable; in a small timeline dot it's NOT. ClinicalTimeline will need a per-extension icon to disambiguate small-footprint surfaces. Recommend the **icon + color** pairing as the canonical strategy. The table above is a starting point; final palette should be verified with an online deuteranopia simulator before committing to `mii-modules.ts`.

### 4.e Prior-Art Reference

| Source | Palette approach | What we borrow |
|--------|------------------|----------------|
| [Glasbey et al. palette (GitHub)](https://github.com/taketwo/glasbey) | 32 maximally-distinct colors, CAM02-UCS perceptual space | Reference for 21 distinct hues. Use as fallback if curated fails deuteranopia. |
| [Tableau 20 / viridis categorical](https://colorcet.holoviz.org/user_guide/Categorical.html) | 20-color categorical palette, color-blind-safe | Tableau20 is a well-established 20-color set; can be imported and remapped. |
| [Mantine 14-color palette](https://mantine.dev/theming/colors/) | 10 shades × 14 named colors = 140 tokens; no categorical-specific guidance | Use shade offset to stretch 14 colors to 21. |
| [Deuteranopia Color Palette Guide](https://designsystemproblems.com/accessibility-compliance/deuteranopia-color-palette/) | Avoid red+green adjacency; use blue/yellow axis; luminance variation | Sort palette by luminance, alternate hue families. |
| [Accessible Color Sequences for Data Visualization (arXiv 2107.02270)](https://arxiv.org/pdf/2107.02270) | Formal method for generating color-blind-safe categorical palettes | Algorithmic reference for future automation. |

## Feature Landscape — 5. Empty-state UX for extension modules

### 5.a Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Empty module is VISIBLE (discoverability) | Core value of FHIR Exploder = "browse the ecosystem". Hiding modules entirely hides discoverability. An Onkologie tab that says "no oncology data for this patient" teaches the user the module exists. | S | Default: show all with reduced opacity (0.55, matching the Phase 30 Dashboard MII tile empty-state convention). |
| Empty-state CONTENT is specific, not generic | `"No data found"` → `"No Onkologie data (Condition, Procedure) found for this patient."` — user learns which FHIR types were queried. Matches Phase 30 UAT's mention of the current empty-state text on the Diagnose tab. | S | Template: `"No ${module.germanLabel} data (${fhirResourceTypes.join(', ')}) found for this patient."` |
| User toggle "Show N empty modules" | For users who want dense patient views, hide the empties. Progressive-disclosure pattern. | S | State in `localStorage.patients.hideEmptyExtensions.v1`; default: show all (discoverability wins for new users). |
| Link to Explorer filtered to the module's resource type | When a tab is empty, give the user a way to check whether the type has ANY data on the server: `"Check all ${fhirResourceType} resources on this server →"` link. | S | Existing `/explorer/:type` route already supports direct navigation. |
| Loading skeleton during per-module count probe | During the extension collapsible's first open (pre-probe in §2.b), user sees skeleton states, not flickering empty-state copy. | S | Mantine `<Skeleton>` already widely used. |

### 5.b Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| IPS-style `emptyReason` display | If a server serializes `Composition.section.emptyReason` for a given module, surface it: `"unavailable"`, `"notasked"`, `"asked-declined"`. Teaches users the DIFFERENCE between "we didn't ask" and "the patient refused". | M | Most Blaze servers will NOT have IPS-style sections, so surface only when present. Very low-cost check: search for IPS Composition for this patient, inspect sections. Defer — Blaze typically lacks this; implement only when user reports IPS-style content. |
| "Search this module across all patients on the server" link | When a module is empty for ONE patient but not others, the user may want to find patients who DO have oncology data. | M | Cohort builder already exists; link to `/quality/cohorts?new=condition-code&system=...`. Nice but cohort-builder integration adds scope. |
| Contextual explanation on first empty-module encounter | On first visit to an empty tab, explain why extension modules matter and what's in them: "Extension modules capture specialized domains beyond the base MII Kerndatensatz. Onkologie specifically contains structured tumor data per ADT-GEKID." | S | Dismissible tip, shown once per module per user (localStorage `patients.extensionModules.explained.${module.key}.v1`). |
| Suggested data-fix action when near-miss detected | If Onkologie has no data but patient has Condition resources with ICD-10-GM C-codes, nudge: "This patient has 3 Conditions with C-codes that could be Onkologie data if a profile is attached." | L | Requires semantic analysis of patient data against module definitions. Defer to v1.6+ or later. High value, high effort. |

### 5.c Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hide empty modules entirely (no toggle) | "Less clutter" | Destroys discoverability; new users never learn what modules exist. Blocks the core value prop. | Opacity dimming + explicit toggle. |
| Render empty tabs as "disabled" (cannot be clicked) | "Visual affordance: disabled = empty" | Mantine `<Tabs.Tab disabled>` blocks click entirely. User can't see the empty-state copy, can't click the "check this type on server" link, can't learn about the module. | Always clickable. Dim opacity + empty-state content inside. |
| Auto-generate placeholder data / mock resources | "So the UI doesn't look broken" | Dishonest. Misleads users about what's on the server. Ethical issue for a quality auditor. | Honest empty-state copy. |
| Omit the module from the list if its FHIR type doesn't exist on server | "Server lacks the type entirely, module is moot" | Confuses "server lacks the type" with "patient has no data of this type". A server WITH Condition but NO oncology-profiled Condition resources should still show Onkologie tab. The server-capability check is independent from the patient-data check. | Always show modules whose primary type the server supports (per CapabilityStatement); dim when patient has no data. |
| Per-tab badge with "0" count | "Clear count" | Visible zero = noise on 14 extension modules for most patients. 14 red zeros = visual alarm. | Use dimmed opacity (no badge) for zero; show count only when >0. |

### 5.d Prior-Art Reference

| Source | Empty-state approach | What we borrow |
|--------|----------------------|----------------|
| [IPS Empty Sections and Missing Data](https://build.fhir.org/ig/HL7/fhir-ips/branches/master/en/Empty-Sections-and-Missing-Data.html) | `Composition.section.emptyReason` with codes `unavailable`, `notasked`, `asked-declined` | Philosophy: absence has semantics. Our empty-state copy acknowledges "queried, found none" vs "module not supported". |
| [Medplum Patient Summary sections](https://www.medplum.com/docs/react) | `PatientSummary` renders section-per-resource-type; empty sections render a terse "None" | Minimal empty-state: dim + single-line copy is enough when the section label is clear. |
| [Progressive Disclosure pattern (ui-patterns.com)](https://ui-patterns.com/patterns/ProgressiveDisclosure) | "Show more" reveals more information; rarely used features in secondary screens | Toggle "Show N empty modules" is a textbook application. |
| [Firely Simplifier validator UI](https://simplifier.net/organization/firely/news/192) | Filter by severity; inline annotated results | Filter-by-severity parallel = filter-by-has-data for our tabs. |

## Feature Dependencies

```
[UX-01 Validator Cascade]
  ├──requires──> [existing CapabilityStatement fetch in QualityLayout]
  ├──requires──> [existing phiAcknowledged inline gate in ValidationPanel (EXTRACT to phiGate.ts)]
  ├──requires──> [existing legacyIssues mapper inline in ValidationPanel (EXTRACT to normalizers.ts)]
  └──enhances──> [existing ValidationPanel 3-badge backend indicator row]

[EFF-R14 Per-metric Context split]  (PREREQUISITE for feature #3)
  └──enhances──> [existing QualityMetricsContext with per-type record storage per metric]

[Per-type Quality Matrix]
  ├──requires──> [EFF-R14 per-metric context split]
  └──enhances──> [existing /quality?tab=counts page with new matrix card below counts table]

[21-module patient-detail]
  ├──requires──> [Schema change: MiiModule.fhirResourceType: string | string[], category: 'base' | 'extension']
  ├──requires──> [existing MiiModuleTab component (parameterize for multi-type queries)]
  ├──requires──> [existing patientSearchParam on MiiModule (verify per extension module)]
  ├──enhances──> [existing /patients/:id MiiModuleTabs (add collapsible extensions section)]
  ├──enhances──> [existing Dashboard MII tile grid (split into base + extension sections)]
  └──enhances──> [existing ClinicalTimeline type-badge rendering (per-module icon + color)]

[21-module color strategy]
  ├──cross-cuts──> [21-module patient-detail]
  ├──cross-cuts──> [Dashboard MII tiles]
  ├──cross-cuts──> [ClinicalTimeline type badges]
  └──cross-cuts──> [Per-type Quality Matrix row-coloring if module-scoped]

[Empty-state UX for extensions]
  └──cross-cuts──> [21-module patient-detail]
```

### Dependency Notes

- **UX-01 is independent of EFF-R14 and 21-module features.** Different files, different concerns. Can parallelize within v1.5.
- **Per-type Quality Matrix requires EFF-R14 first.** `QualityMetricsContext` currently exposes only `overall*` aggregates. The matrix needs per-`(resourceType, metric)` cells. EFF-R14 splits the context to per-metric providers that expose their own per-type records. Without this split, the matrix must either duplicate the metric-computation engines (bad) or force re-renders of all panels on every cell update (worse, the exact regression EFF-R14 prevents).
- **21-module features depend on the schema change FIRST.** `fhirResourceType: string \| string[]` and `category` field must land before the 14 new entries are added, otherwise existing consumers (`MiiModuleTab`, `FhirResourcesView`, `ClinicalTimeline`, `DashboardPage`) break on first multi-type encounter. One small schema plan; then a second plan adds 14 entries + the collapsible section.
- **Color strategy is cross-cutting.** Applies once in `mii-modules.ts` and propagates to every surface that consumes `MiiModule.badgeColor`. No phase-ordering constraint — can land with the 14-entry add. Recommend bundling: schema change → entries + palette → collapsible UI.
- **Empty-state UX depends on 21-module features.** 7 base modules already have empty states; only the 14 extensions need new treatment. But the UX is part of the extension rollout, not a separable phase.
- **Phase-30 UAT follow-ups #1, #2, #4 and #5 are independent of everything else.** Explorer Date/Status per-type extractor; HumanReadableView extension cleanup; remove Clinical+Raw tab + rename Developer→JSON; investigate empty MII/FHIR panels for Synthea. These are 4 small plans with no inter-dependency; bundle into a single phase or split freely.

## MVP Definition (v1.5 scope)

### Launch With (v1.5 ship)

**UX-01 validator cascade** — every item from `29-02-PLAN.md` must_haves:

- [ ] Extract PHI gate to `src/quality/phiGate.ts` with regression test
- [ ] Extract `normalizeOperationOutcomeIssue` to `src/quality/normalizers.ts` with ≥5 unit tests
- [ ] `src/quality/cascadingValidator.ts` with 3-tier decision
- [ ] `validation.externalValidator: { url, enabled, timeoutMs }` in settings schema
- [ ] `useConformanceRun` calls `validateWithCascade` on external-capable path
- [ ] Active-strategy status line in `ValidationPanel` sourced from probe cache
- [ ] 15s `AbortController` + Mantine blue-toast on timeout
- [ ] Banner-suppression when `hasRemote === true`
- [ ] Both pending todos moved to `.planning/todos/completed/`

**EFF-R14 context split** — prerequisite for per-type matrix:

- [ ] Per-metric context providers (Option A per PROJECT.md)
- [ ] Single metric update re-renders only its own tile
- [ ] All existing consumer imports unchanged (no public API break)

**21-module patient-detail UX:**

- [ ] Schema: `MiiModule.fhirResourceType: string \| string[]` + `category: 'base' \| 'extension'`
- [ ] 14 new module entries in `mii-modules.ts` (per `<milestone_context>` list)
- [ ] Collapsible "Extension modules" section below base tabs on `/patients/:id`
- [ ] `MiiModuleTab` handles multi-type queries (merge N bundles into one issue view)
- [ ] Per-module `patientSearchParam` verified for each of 14 extensions
- [ ] Dashboard MII tile grid split into Base (7) + Extensions (14)
- [ ] ClinicalTimeline type badges handle multi-type modules

**Per-type Quality Matrix** (blocked on EFF-R14):

- [ ] Matrix card under `/quality?tab=counts` (after counts table)
- [ ] Columns: Resource type, Complete%, Coverage%, Validation%, References%, Dup, Issues, chevron
- [ ] Sortable via existing `SortableTh`
- [ ] Row click → drill-down (filtered `ResourceIssueTable`)
- [ ] Breach coloring via `isBreached` per cell

**Color strategy:**

- [ ] Hand-curated 21-color palette in `mii-modules.ts` (per §4.d proposal)
- [ ] Per-extension Tabler icon (21 unique icons, verified accessible)
- [ ] Deuteranopia simulation check on final palette

**Empty-state UX for extensions:**

- [ ] Modules with zero resources rendered at 0.55 opacity
- [ ] Empty-state copy includes FHIR types queried
- [ ] "Show N empty modules" localStorage toggle
- [ ] "Check all X on server" link to `/explorer/:type`

**Phase-30 UAT follow-ups (6 items):**

- [ ] Explorer Date/Status per-resource-type extractor (Patient→birthDate+active, Condition→onsetDateTime+clinicalStatus, …)
- [ ] HumanReadableView extension cleanup (identifier-system tooltip, address-extension modal, extensions section at bottom with table)
- [ ] Remove Clinical+Raw view mode; rename Developer → JSON
- [ ] Investigate empty MII/FHIR Resources panels on Synthea test patient
- [ ] Dashboard MII tile counts: scope to current patient OR explicit server-wide label
- [ ] (Per-type quality matrix — covered above)

### Add After Validation (v1.6+)

- [ ] Settings UI "Test connectivity" button for validator URL (UX-01 differentiator)
- [ ] Per-session toast deduplication for timeout fallbacks
- [ ] Pre-probe extension modules on collapsible expand → show count badges
- [ ] "Jump to extension with most data" auto-select
- [ ] Column chooser for quality matrix
- [ ] CSV export of quality matrix
- [ ] Mini-sparkline per matrix row (requires per-type trend history)

### Future Consideration (v2+)

- [ ] Heat-column gradient on quality matrix (design-review gated)
- [ ] IPS-style `emptyReason` display on empty modules
- [ ] Semantic "near-miss" detection (Conditions with C-codes → suggest Onkologie profile)
- [ ] Cohort-builder integration from empty-module "search across patients" link
- [ ] Validator profile-pack selection (MII KDS vs US Core vs other)
- [ ] Validator auth (basic/bearer)
- [ ] Validator-result cache by resource hash
- [ ] Batch `Bundle/$validate` mode
- [ ] Full local FHIR validator in browser (unlikely ever)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| UX-01 cascade (all 29-02 must_haves) | HIGH | M (plan already written) | P1 |
| EFF-R14 per-metric context split | MEDIUM (no user-visible) | L (~20 files) | P1 (matrix prereq) |
| Per-type quality matrix | HIGH | S (after EFF-R14) | P1 |
| Schema: multi-type + category | HIGH (blocks 14 modules) | S | P1 |
| 14 extension module entries | HIGH | S | P1 |
| Collapsible extensions section | HIGH | S | P1 |
| Dashboard base/extension split | MEDIUM | S | P1 |
| 21-color + icon palette | HIGH (affects all surfaces) | M | P1 |
| Empty-state dimmed-opacity + copy | HIGH | S | P1 |
| "Show N empty modules" toggle | MEDIUM | S | P1 |
| Explorer Date/Status extractor | MEDIUM (UAT-recorded) | M | P1 |
| HumanReadableView extension cleanup | HIGH (UAT-flagged major) | M | P1 |
| Clinical+Raw removal / Developer→JSON rename | MEDIUM | S | P1 |
| Synthea empty MII/FHIR investigation | HIGH (UAT-flagged major) | M | P1 |
| Dashboard MII tile scope/label | MEDIUM | S | P1 |
| Validator "Test connectivity" button | MEDIUM | M | P2 |
| Per-module pre-probe counts | MEDIUM | M | P2 |
| "Jump to most data" auto-select | LOW | S | P2 |
| CSV export quality matrix | LOW | S | P3 |
| Heat-column gradient matrix | LOW (visual nit) | M | P3 |
| IPS `emptyReason` support | LOW (rare server config) | M | P3 |
| Semantic near-miss detection | HIGH (if accurate) | L | P3 |
| Validator auth / profile-pack | LOW until requested | M | P3 |

**Priority key:**
- P1: Must have for v1.5 launch
- P2: Ship in v1.5 if cycles permit, otherwise v1.6
- P3: Defer to v1.6+ with explicit trigger condition

## Competitor Feature Analysis

| Feature | Epic Chart Review | Cerner PowerChart | Medplum Chart Demo | Our Approach (v1.5) |
|---------|-------------------|-------------------|-------------------|---------------------|
| Large taxonomy handling | Specialty-customizable tabs with Bookmarks | 3-tab Ambulatory (Summary / Custom / Future Orders) + Table of Contents | Flat tabs composed per-app | Base (7) + collapsible Extensions (14). Icon + color per module. |
| Empty section display | User-hidden via customization | Collapse-by-default on custom components | Terse "None" | Opacity dim + empty copy + "Show N empty" toggle + "Check on server" link |
| User personalization | Heavy (tab order, bookmarks, custom tabs) | Moderate (component arrangement, default expand) | None (app-specific) | Minimal (collapse state + show-empty toggle in localStorage). No drag-reorder, no user-custom tabs. |
| Multi-resource-type per section | Implicit (tabs bundle related orders/meds/docs) | Implicit | Explicit (section composes multiple types) | Explicit: `fhirResourceType: string \| string[]` on the module |

| Feature | Firely Simplifier | HAPI Tester | Inferno | Touchstone | Our Approach (v1.5) |
|---------|-------------------|-------------|---------|------------|---------------------|
| Validator selection | Dropdown (new .NET / legacy / Java) | Single endpoint | Auto-detect capability, silent-skip | Manual config-first | Auto-cascade: external → server $validate → local. Status line shows active tier. |
| Config UX | Playground dropdown | Text field | Config file | Upfront paste | Settings YAML + future "Test connectivity" button |
| Empty/failed feedback | Inline annotated issues on resource | Error banner | Per-test endpoint label + skip reason | Test-script output | Active-strategy status line + timeout toast + OperationOutcome normalized to `ResourceIssueTable` |

| Feature | Great Expectations | dbt-expectations / Elementary | Soda | OpenRefine | Our Approach (v1.5) |
|---------|---------------------|------------------------------|------|------------|---------------------|
| Per-table quality view | Auto-generated Data Docs, pass/fail per check | Per-model test dashboard + history sparklines | Per-table monitors + alerts | Per-column facets | Per-resource-type matrix: Complete/Coverage/Validation/References/Dup/Issues cols, sortable, click-through. |
| Breach visualization | Color-coded status (pass/fail) | Heat cell coloring | Alert severity columns | Inline count indicators | Threshold-based breach coloring (red text on breach); reuse existing `isBreached`. |
| Failed-row drill-down | Sample failed rows in Data Docs | Links to failed row samples | Drill-into records | Click facet value to filter | Click matrix row → filtered `ResourceIssueTable` (existing primitive). |

## Sources

### Authoritative (HIGH confidence)

- [FHIR R4 — Resource Operation Validate](https://hl7.org/fhir/R4/resource-operation-validate.html) — URL forms, payload shape, OperationOutcome response convention
- [FHIR R4 — CapabilityStatement](https://hl7.org/fhir/capabilitystatement.html) — `rest[].resource[].operation[]` discovery mechanism
- [HAPI FHIR — Instance Validator](https://hapifhir.io/hapi-fhir/docs/validation/instance_validator.html) — wire format reference
- [MII — Extension Modules of the MII Core Data Set](https://www.medizininformatik-initiative.de/en/extension-modules-mii-core-data-set) — confirmed modules: Microbiology, Pathology, Molecular Genetics, Intensive Care, Biobank, Research Projects
- [MII — Microbiology Module](https://www.medizininformatik-initiative.de/de/kerndatensatz-erweiterungsmodul-mikrobiologie) — FHIR profile reference
- [MII — Biobank Module (2026.0.0)](https://www.medizininformatik-initiative.de/de/ankuendigung-zur-kommentierung-des-kerndatensatzmoduls-biobank-bioprobendaten-version-202600-der) — current FHIR profile version
- [MII — Pathology Module](https://www.medizininformatik-initiative.de/de/kerndatensatz-erweiterungsmodul-diagnostik-pathologie-befund) — IHE-PaLM-based profile
- [IPS — Empty Sections and Missing Data](https://build.fhir.org/ig/HL7/fhir-ips/branches/master/en/Empty-Sections-and-Missing-Data.html) — `emptyReason` convention
- [IPS — Absent and Unknown Data CodeSystem](http://hl7.org/fhir/uv/ips/STU1.1/CodeSystem-absent-unknown-uv-ips.html) — `unavailable` / `notasked` / `asked-declined` codes
- In-repo: `.planning/phases/29-backlog-ux/29-02-PLAN.md` — locked UX-01 plan with all must_haves and decisions D-07..D-16
- In-repo: `.planning/phases/30-layout-redesign/30-UAT.md` — 11 UAT gaps, 5 resolved + 6 off-phase follow-ups
- In-repo: `src/components/patients/MiiModuleTabs.tsx` — pills tab variant with `TabPillLabel` (already contrast-fixed)
- In-repo: `src/utils/mii-modules.ts` — existing 7-module schema + `patientSearchParam` + `extraQuery` pattern
- In-repo: `src/components/quality/ValidationPanel.tsx` — current inline PHI gate at lines 72/100-107/235/270-294; inline OperationOutcome mapper at 167-178
- In-repo: `src/components/quality/OverviewStrip.tsx` — existing 9-tile grid (note: v1.4 FEATURES.md already planned 9→7 reduction, which Phase 30 implemented as ring-free 7-tile)

### Prior Art (MEDIUM confidence — vendor UI patterns not publicly documented in depth)

- [Firely Simplifier Validation Playground 2025.5](https://simplifier.net/organization/firely/news/192) — validator dropdown picker UI
- [validator.fhir.org](https://validator.fhir.org/) — web-based FHIR validator reference
- [HL7 Conformance Testing](https://www.fhir.org/conformance-testing/) — lists Touchstone, Inferno, Crucible
- [Inferno Framework](https://inferno-framework.github.io/docs/writing-tests/fhir-validation.html) — validation test suite patterns
- [Touchstone (AEGIS)](https://touchstone.aegis.net/touchstone/userguide/html/release-notes/web.html) — upfront-config validator model
- [Epic Chart Review — University of Iowa training](https://epicsupport.sites.uiowa.edu/epic-resources/chart-review) — tab customization pattern
- [Cerner PowerChart Ambulatory Organizer](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Ambulatory_Organizer/Ambulatory_Organizer_in_PowerChart.htm) — 3-tab + 3-column structure
- [Medplum Charting docs](https://www.medplum.com/docs/charting) — PatientTimeline + Tabs composition guidance
- [Medplum Chart Demo](https://github.com/medplum/medplum-chart-demo) — reference implementation of tabs-per-resource pattern

### Data Quality Dashboards (MEDIUM confidence)

- [Great Expectations Data Docs](https://www.getorchestra.io/guides/data-quality-with-dbt-great-expectations) — auto-generated per-expectation HTML reports
- [dbt-expectations + Elementary](https://www.metaplane.dev/blog/dbt-expectations) — per-model test dashboards
- [Soda Core](https://atlan.com/open-source-data-quality-tools/) — per-table monitors
- [OpenRefine faceting](https://openrefine.org/docs/manual/facets) — per-column quality facet patterns

### Color & Accessibility (HIGH confidence)

- [Glasbey palette](https://github.com/taketwo/glasbey) — maximally-distinct 32-color categorical palette
- [colorcet Categorical palettes](https://colorcet.holoviz.org/user_guide/Categorical.html) — glasbey, glasbey_bw variants
- [Accessible Color Sequences for Data Visualization (arXiv 2107.02270)](https://arxiv.org/pdf/2107.02270) — formal color-blind-safe palette generation
- [Deuteranopia Color Palette Guide](https://designsystemproblems.com/accessibility-compliance/deuteranopia-color-palette/) — avoid red+green adjacency, use luminance + blue-yellow axis
- [Mantine color theming](https://mantine.dev/theming/colors/) — 14-color × 10-shade system
- [UX Collective — Color blindness in user interfaces](https://uxdesign.cc/color-blindness-in-user-interfaces-66c27331b858) — never color-only; pair with icon/label

### UX Patterns (MEDIUM confidence)

- [Progressive Disclosure (ui-patterns.com)](https://ui-patterns.com/patterns/ProgressiveDisclosure) — "Show more" toggles
- [UXmatters — Designing for Progressive Disclosure](https://www.uxmatters.com/mt/archives/2020/05/designing-for-progressive-disclosure.php) — when to defer info

---

*Feature research for: FHIR Exploder v1.5 Validation, Performance & MII Extensions*
*Researched: 2026-04-23*
*Note: Extension-module FHIR-type mappings (Onkologie = Condition+Procedure; Bildgebung = DiagnosticReport+ImagingStudy; etc.) in `<milestone_context>` are taken as authoritative for this research — they come from the milestone scope doc. Any discrepancy with a specific MII profile version (e.g., if Molekulargenetik 2026.0.0 adds a third type) should be reconciled during Requirements.*
