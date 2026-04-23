# Feature Research — v1.4 Hardening & Tech-Debt Sweep

**Domain:** FHIR data quality auditing tool (FHIR Exploder), subsequent milestone
**Researched:** 2026-04-16
**Scope:** ONLY the two new user-visible features (T1, T2). Refactor work R1-R15 is internal architecture and intentionally excluded.
**Confidence:** HIGH — both features are scoped narrowly and have well-established prior art (FHIR R4 spec for `$validate`; observability dashboard patterns for status lines).

> NOTE: This file replaces the v1.0 ecosystem feature research (2026-04-11). Prior version covered table-stakes for the FHIR explorer as a whole; v1.4 is a hardening milestone with only two new user-visible features, so the research is correspondingly narrow. The v1.0 ecosystem material is preserved in `.planning/MILESTONES.md` and the original audit artifacts.

## Existing-feature inventory (DO NOT re-research)

Already shipped in v1.0–v1.3 and explicitly out of this research's scope:

- Patient browser, generic resource explorer, three display modes (human/clinical+raw/developer)
- Reference click-through, `_include` / `_revinclude`, MII Kerndatensatz module tabs
- Terminology server resolution with LRU cache + graceful fallback
- Quality dashboard (9 tabs): counts, completeness, coding, validation, conformance, plausibility, lab ranges, duplicates, references/orphans, cohorts, thresholds, trends
- PDF export, threshold configuration, trend history
- Cohorts (interactive builder, FHIRPath, FDPG SQ v3 import/export, CRUD, active-cohort scoping)
- Settings via `settings.yaml` (server URL + auth, terminology, validation.validatorUrl, batchSize, plausibility, referenceRanges)

The relevant existing scaffolding for v1.4 work:

- `src/quality/remoteValidator.ts` — already POSTs to `{validatorUrl}/{ResourceType}/$validate?profile={canonical}` via a dedicated MedplumClient instance, returns `outcome.issue ?? []`, degrades to a single `error/exception` issue on network failure (T-05-05-02 mitigation).
- `src/quality/validationBackends.ts` — `resolveBackends(settings, resourceType)` returns ordered backends `[structural, ...maybeRemote]` and reports `{ hasRemote, hasProfile, validatorUrl }`.
- `src/components/quality/ValidationPanel.tsx` — already shows three Badges (`Conformance` blue, `Terminology` green/gray, `Remote (configured)` / `Remote (not configured)` green/gray) plus the Blaze-`$validate`-unsupported dismissible banner and the PHI-acknowledgement gate.
- `src/components/quality/OverviewStrip.tsx` — current 9-tile `SimpleGrid` (`GRID_COLS = { base: 1, xs: 2, sm: 3, md: 4, lg: 5, xl: 9 }`) renders 2 informational tiles (Total resources, Resource types, fed by `summary` prop) followed by 7 metric `SummaryCard` rings (completeness/coverage/validation/plausibility/labRanges/duplicates/references), with the metric tiles wired through `useQualityMetrics()` + `useThresholds()` and clickable to `/quality?tab=...`.

This means v1.4 is mostly **wiring + UX**, not new infrastructure. T1's work is primarily: detect server `$validate` capability, decide a 3-way priority, surface the active strategy, add a "Test connectivity" affordance. T2's work is: drop two cells from a SimpleGrid, render a status line, rebalance the grid columns, update one test.

## Feature Landscape — T1: External FHIR `$validate` integration

### T1 table stakes (users expect these)

| Feature | Why expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 3-tier priority cascade: external validator → server `$validate` → local structural checker | Existing config already supports external; users expect "use the best available" without manual switching. Today the local check runs unconditionally even when the server *does* implement `$validate`. | MEDIUM | Decision tree on every Validate-sample run. Capability probe must be cached per `serverUrl` to avoid repeating the metadata fetch on every Run. |
| Capability probe via `CapabilityStatement.rest.resource.operation` | Standard FHIR R4 mechanism for "does this server support $validate?" — `GET {base}/metadata`, walk `rest[].resource[].operation[]` for `name === 'validate'`. Blaze publishes a CapabilityStatement; capability is already fetched in `QualityLayout` (passed via `QualityOutletContext`). HEAD/OPTIONS are NOT idiomatic for FHIR operation discovery. | LOW | The capability is already in scope (`useOutletContext<QualityOutletContext>()` in ValidationPanel exposes `capability`). The probe is "find `validate` operation in the existing CapabilityStatement", no extra fetch needed. Cache result; recompute on server-URL change (matches existing cohort-cache invalidation pattern from D-10). |
| URL shape: `POST {base}/{ResourceType}/$validate` (type-level) | Per [FHIR R4 spec](https://hl7.org/fhir/R4/resource-operation-validate.html): two URL forms exist (`[base]/{Resource}/$validate` type-level and `[base]/{Resource}/{id}/$validate` instance-level). For sampled resources where the goal is "would this be acceptable as a create", type-level is correct. Instance-level is for `mode=update/delete`. The existing `remoteValidator.ts` already uses type-level. | LOW | No code change — existing implementation matches the spec. `?profile={canonical}` query param appended when MII profile is known (already implemented). |
| Payload: raw resource JSON in body (NOT Parameters wrapper) | FHIR R4 spec accepts both: raw resource POST OR a `Parameters` resource with named `resource` parameter and optional `mode`/`profile` parameters. Raw JSON is the simpler form and what HAPI/`validator.fhir.org`/Azure/AWS HealthLake/InterSystems all accept. The Parameters form is needed only when the caller must pass `mode=create/update/delete` server-side. For a quality auditor running ad-hoc validation on existing resources, raw POST is the right default. | LOW | Existing `remoteValidator.ts` uses raw POST. Document the choice in code comment. |
| Response: `OperationOutcome.issue[]` with severities `fatal/error/warning/information` | Per FHIR R4: $validate ALWAYS returns `OperationOutcome` with HTTP **200 OK** regardless of whether the resource passed (validation outcome is in the body, not the status code). HTTP 4xx/5xx mean the validator itself failed. This is a common pitfall — implementations that treat HTTP 422 as "failed validation" are incorrect per spec, though some servers (notably HAPI) historically returned 422. The existing `remoteValidator.ts` catches errors via `client.post(...).catch` which already handles both cases correctly. | LOW | Existing severity mapping in `ValidationPanel.tsx` already collapses `fatal\|error → error`, `warning → warning`, default → `info`. |
| Surface active strategy in the Validation panel status line | User has no way to tell which backend ran. The current Badge row says `Remote (configured)` but conflates "configured" with "active". Required UX: replace the static badges with a single-line status that reports the actual runtime decision per resource type, e.g. `Validating Condition via External validator @ https://validator.fhir.org/validator` or `Validating Condition via Server $validate (Blaze 0.27)` or `Validating Condition via local MII profile bundle`. | MEDIUM | Compose label from `BackendResolution` plus capability-probe result. Update on `resourceType` change (since some types have profiles and others don't, and Blaze may publish $validate on some types but not others). |
| Settings UI: paste validator URL + "Test connectivity" button | The `validation.validatorUrl` field is currently silently configured via `settings.yaml`. Users editing YAML get no feedback until they run validation and see network errors. Test-connectivity = `GET {validatorUrl}/metadata` → check that returned `CapabilityStatement.rest[].resource[].operation` includes a `validate` operation. Returns "Reachable, supports $validate on N resource types" / "Reachable but no $validate" / "Unreachable: <message>". | MEDIUM | Settings UI exists for server URL/auth; add a `validation` section. The validator client factory (`createValidatorClient`) already exists in `remoteValidator.ts`. |
| Per-run timeout with user-visible cancellation | Validators can take 30-60s per resource on cold start (HAPI's snapshot generation, terminology lookups). Existing `useConformanceRun` already has a Cancel button — verify it actually aborts the in-flight fetch (not just stops processing the next resource). FHIR validators typically expose their own `-validation-timeout` flag, but client-side timeout is independent. | LOW | Wire `AbortController` through `createValidatorClient`'s `fetch` call (currently passes through directly). Default 30s timeout per resource, configurable via `settings.validation.timeoutMs`. |
| Network/payload error UX: clear message, not crash | Existing implementation already returns a single `error/exception` issue on remote failure rather than throwing. Keep that behavior. Add: differentiate "validator unreachable" (network error) vs. "validator returned 4xx/5xx" (validator misbehaved) vs. "validator returned non-OperationOutcome body" (wrong endpoint configured). | LOW | Three distinct error messages map to one issue row; user sees actionable text. |

### T1 differentiators (nice-to-have, not blocking)

| Feature | Value proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Validator profile-pack selection (e.g. "MII KDS 2024" vs "US Core 6") | Today the only profile passed is the bundled MII canonical. A multi-pack future is mentioned in the todo file ("profile pack selection") but is YAGNI for v1.4 since the app's other quality engines all assume MII. Keep the slot in the settings schema; do not implement UI. | MEDIUM | Reserve `settings.validation.externalValidator.profilePack: 'mii-kds' \| 'us-core' \| string`. Default `'mii-kds'`. |
| Per-validator-type retry with exponential backoff | Validators behind a CDN/cache may 503 once and succeed on retry. Adds value for production deployment, low value for a local exploration tool. | MEDIUM | Defer. The existing single-attempt behavior with a clear error message is acceptable for v1.4. |
| Batch validation via `Bundle/$validate` | Some validators accept a transaction Bundle and validate every entry. Could reduce the per-resource RTT. HAPI supports this; `validator.fhir.org` historically did not. | HIGH | Defer — requires response unbundling and per-entry result mapping. Not aligned with the v1.4 "Hardening" theme. |
| Auth on the validator endpoint (basic / bearer) | Production validators behind a reverse proxy may require auth. The existing FHIR-server settings already support `mode: 'open' \| 'basic' \| 'bearer'`. Mirror that schema for the validator. The todo file mentions "optional auth" so this is in-scope-but-likely-deferred. | MEDIUM | Add `settings.validation.externalValidator.auth: { mode, username?, password?, token? }`. Settings UI must explicitly warn that bearer tokens stored in `settings.yaml` are plaintext — same warning the FHIR server auth already shows. |
| Cache validator OperationOutcome by resource hash | If the user re-runs validation on an unchanged sample, hit a cache rather than re-POSTing. Aligns with v1.4's data-fetching foundation theme (Phase 24's `Map<serverUrl, ...>` cache pattern). | MEDIUM | Defer. Validation is rare enough that this is premature optimization; risks cache-staleness if profile pack changes. |
| Abort-on-tab-switch | If the user navigates away from the Validation tab mid-run, cancel the in-flight requests. Already partially handled by `useConformanceRun`'s cancel mechanism but not wired to React's unmount. | LOW | Cleanup function in `useEffect` that calls `run.cancel()` on unmount. Worth doing during Phase 29; one-line change. |

### T1 anti-features (commonly requested, often problematic)

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Build a local full FHIR validator in the browser | Full offline operation; no PHI leaves the machine | Full FHIR validation requires snapshot generation, terminology resolution, slicing/discriminator logic, FHIRPath evaluation, profile chasing — tens of thousands of lines, megabytes of bundled data. The official FHIR validator is a JVM library; transpiling/porting is unrealistic. The todo file explicitly lists this as a non-goal. | Keep the structural checker (already shipped in v1.0) for offline use; rely on external validator for high-fidelity. Document the gap in the existing dismissible banner. |
| Auto-detect and silently use validator.fhir.org if no validator configured | Saves the user a config step | (1) Surprising network egress with PHI to a third party. (2) Public validator has no SLA and is rate-limited. (3) Violates the existing PHI-acknowledgement gate's intent (explicit consent before each new validator URL). | Keep the explicit-config requirement. Phase 29 settings UI can suggest validator.fhir.org as an example URL, but never auto-populate. |
| Server-side `mode=create/update/delete` validation | Validators can simulate "would this conflict with an existing resource on update" | The app is read-only by charter (PROJECT.md Out of Scope); there are no create/update/delete operations to validate. `mode=none` (the default) is correct here. | Hardcode `mode=none` (which is implicit when no `mode` parameter is sent). |
| Stream OperationOutcome partial results during long validations | Show issues as they arrive rather than waiting for the full response | FHIR `$validate` is a single request/response operation; there is no streaming spec. The HAPI HTTP server returns one OperationOutcome at the end. Implementing this would require a non-standard SSE/websocket layer that no validator implements. | Show a per-resource progress bar (already exists in `ValidationPanel`) so the user sees forward progress within a sample, even if each individual `$validate` call is monolithic. |
| Support FHIR R5 / R6 validators while the app is R4 | "Future-proofing" | The bundled profiles and resource shape are R4 (`@medplum/fhirtypes` is R4). Pointing an R4 resource at an R5 validator yields false-positive structure errors. Cross-version validation is its own large topic. | Document (in the Test-connectivity feedback) that the validator must support R4. Future R5 support is a separate milestone. |

## Feature Landscape — T2: OverviewStrip 9→7 + status-line header

### T2 table stakes (users expect these)

| Feature | Why expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Separate cardinality info from quality metrics | Mixing a counter ("12,785 resources") with a percentage ring ("Completeness 87%") in the same visual class confuses what's "good vs bad". Information-architecture rule from observability dashboards: golden-signal metrics get the prominent position, context/cardinality goes into a header bar. | LOW | Drop two cells from `SimpleGrid` in `OverviewStrip.tsx`. Move presentation into a status `Group` rendered above the strip in `QualityOverviewPage.tsx`. |
| Status line: "N resources · M types · Last computed Xm ago" | The proposal is the standard "data freshness indicator" pattern. `N resources · M types` is the data-scope summary; `Last computed Xm ago` is the freshness signal. Standard separator: middle dot (`·`) or pipe (`\|`). | LOW | The "Last computed" caption already exists in `QualityOverviewPage` per the todo. Re-use its formatter. |
| Rebalanced grid for 7 tiles | 9-column XL row had ~133px tiles which clipped the ring + label. 7-column XL row gives ~170px, comfortable for the ring + 2-line label. Below XL, the existing breakpoints (`base: 1, xs: 2, sm: 3, md: 4, lg: 5`) need a recheck — at `lg=5` and 7 tiles you get a 5+2 layout (last row half-full); consider `lg: 4` so two even rows of 4+3 or `lg: 7` if width allows. The todo proposes `{ base: 1, xs: 2, sm: 3, md: 4, lg: 4, xl: 7 }`, which is reasonable. | LOW | One literal change in `GRID_COLS`. |
| Test updates: assertions for the moved labels | `quality-overview.test.tsx` likely asserts presence of "Total resources" / "Resource types" labels somewhere — those move from the strip to the header but should still be detectable. | LOW | Re-target the `getByText` calls to the header status element. Prefer a `data-testid="overview-status"` so the assertion is structural rather than positional. |
| Skeleton loading state for the status line | The strip already renders a 9-tile Skeleton during `isLoading`. The new status line needs its own Skeleton (a single text-row Skeleton is enough) so the page doesn't visibly reflow when load completes. | LOW | Wrap the status line in `{isLoading ? <Skeleton h={20} w={280} /> : <Group>...</Group>}`. |

### T2 differentiators (nice-to-have)

| Feature | Value proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Click-to-refresh on "Last computed Xm ago" | Standard dashboard pattern: clicking the freshness timestamp recomputes. Saves a trip to the toolbar's existing Re-run button. | LOW | The todo is silent on this; the original feedback says "move … to a status over the strip" — it does NOT request click-to-refresh. Defer unless the user asks; adds an interaction surface that wasn't requested. |
| Tooltip on "Resource types" with the type list | Power-user disclosure: hover to see which 18 types are in scope. | LOW | Mantine `Tooltip` over the `M types` text. Defer — the Counts tab already shows the breakdown. |
| Auto-tick "Xm ago" every 30 seconds | Without auto-update, the timestamp goes stale on a long-open tab and lies. | LOW | `setInterval` in a `useEffect`. Worth doing — costs almost nothing, prevents user confusion. |
| Live-update badge ("Stale" when >24h since computed) | Per Smashing Magazine's [2025 real-time dashboards article](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/), freshness indicators are most useful when they shift state. | LOW | Optional polish; the existing trend-history feature already addresses long-term staleness more rigorously. Defer. |

### T2 anti-features (commonly requested, often problematic)

| Feature | Why requested | Why problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Make the cardinality tiles "still clickable" by linking them in the status line | "I clicked Total resources before to drill in" | The Total resources tile was never a drill-down per existing UI-SPEC (`OverviewStrip.tsx` lines 102-112: "informational, NOT clickable, no onClick prop"). Promoting it to a clickable status link reverses a deliberate decision and adds an interaction surface that the test suite will need to cover. | Keep the status line as plain text per the existing contract; the Counts tab remains the canonical drill-in. |
| Replace the 7 metric rings with a single combined "Health" score | "Simplify further" | A combined score hides which dimension is bad — a high coverage with low completeness aggregates to a meaningless middle value. Per Kahn et al., the dimensions are intentionally orthogonal. | Keep 7 rings; the redesign is about classification (info vs metric), not aggregation. |
| Split the strip into two strips ("Conformance row" vs "Plausibility row") | "More semantic grouping" | Doubles vertical real estate above the panel content. v1.3 has 9 tabs in addition to the strip — vertical budget is already tight. | Keep one strip with 7 tiles; the metric icons (`IconCircleCheck` for completeness, `IconShieldCheck` for validation, etc.) already convey category. |
| Sort tiles by breach severity (errors first) | Surface breaches | Metric position is currently in Kahn order (a stable, learnable convention). Re-ordering on every render based on data state breaks muscle memory and complicates the deep-link routing in `METRIC_ROUTES`. | Use the existing `breached` color treatment to surface alerts; keep the position stable. |
| Move the metric tiles into the sidebar | "Save horizontal space on the dashboard" | The strip's purpose is at-a-glance status; putting it in the sidebar buries it behind a nav element and breaks the click→tab deep-link. | Keep horizontal strip; out of scope for T2. |

## Feature Dependencies

```
T1 — External $validate
├─ requires ─> capability probe over CapabilityStatement
│              (already fetched in QualityLayout via QualityOutletContext)
├─ requires ─> settings.validation.validatorUrl
│              (already in src/config/types.ts:14-22)
├─ requires ─> createRemoteBackend in remoteValidator.ts
│              (already exists, wire format spec-compliant)
├─ enhances ─> existing 3-state Backend Badge row in ValidationPanel
│              (replace with strategy status line)
├─ enhances ─> Settings UI (test-connectivity affordance)
│              (new addition — slot exists, UI does not yet)
└─ conflicts with ─> the dismissible "Blaze $validate unsupported" banner
                     when external validator is configured
                     (banner copy currently assumes local-fallback;
                      needs conditional copy or auto-dismiss when
                      strategy === 'external')

T2 — OverviewStrip 9→7 + status header
├─ requires ─> existing summary prop (CountSummary { total, typeCount })
│              (already passed in OverviewStripProps)
├─ requires ─> "Last computed" caption already in QualityOverviewPage
│              (per todo file)
├─ enhances ─> SummaryCard ring legibility at narrow widths
│              (already partially fixed in this session per todo)
└─ conflicts with ─> none — pure CSS/layout move
                     (one test file needs label-target updates)

T1 ──independent of── T2
   (different files, different concerns; can land in either order
    or in parallel within Phase 29)
```

### Dependency notes

- **T1 requires capability probe**: The `QualityLayout` already fetches CapabilityStatement and passes it as `capability` via `useOutletContext<QualityOutletContext>()`. No new fetch needed; T1's probe is "search the existing CapabilityStatement for `rest[].resource[].operation[].name === 'validate'`". This is an in-memory predicate, not a new API call.
- **T1 conflicts with the dismissible banner**: When external validator is configured AND the server lacks `$validate`, the current banner ("This server does not implement $validate. Phase 5 runs structural validation locally") is incorrect — the app will use the external validator, not the local checker. Two options: (a) suppress the banner when `hasRemote === true` (simpler), or (b) change the copy to explain the cascade. Pick (a) for v1.4.
- **T2 enhances SummaryCard**: The proposal's stated goal is to give each ring more pixels. Verify after refactor that the lg breakpoint (4 columns × 7 tiles = 4+3 layout) doesn't visually weight the second row inconsistently — may want `lg: 7` if the dashboard width permits, or keep `lg: 4` and accept the half-row.
- **T1 ↔ T2 are independent**: Different files, different concerns. Phase 29 can ship them in either order. The plan-draft estimates them at L (T1) and S (T2), so T2 is the warm-up.

## MVP Definition (for v1.4 scope)

### Launch with (Phase 29)

T1 (External validator) — minimum to ship:
- [ ] **T1.a** — 3-tier priority: external > server `$validate` > local structural — predicated on capability probe over the existing CapabilityStatement. *Why essential: solves the user feedback ("FHIR server does not support $validate") with semantic correctness.*
- [ ] **T1.b** — Active strategy surfaced in ValidationPanel as a single status line (replaces or augments the current 3-Badge row). *Why essential: without this the user can't tell which backend ran, defeating the purpose of the cascade.*
- [ ] **T1.c** — Settings UI: paste validator URL + "Test connectivity" button (returns reachability + `$validate` support summary). *Why essential: editing `settings.yaml` blind is the current pain point.*
- [ ] **T1.d** — Conditional copy on the existing `$validate-unsupported` banner: suppress when `hasRemote === true`. *Why essential: prevents stale messaging contradicting the actual backend in use.*
- [ ] **T1.e** — Per-fetch `AbortController` plumbed through `createValidatorClient`, default 30s timeout. *Why essential: a misconfigured/slow validator must not freeze the panel.*

T2 (OverviewStrip) — minimum to ship:
- [ ] **T2.a** — Drop "Total resources" + "Resource types" tiles from `SimpleGrid`; render `N resources · M types · Last computed Xm ago` status line above. *Why essential: the requested feature.*
- [ ] **T2.b** — Rebalance `GRID_COLS` for 7 tiles: `{ base: 1, xs: 2, sm: 3, md: 4, lg: 4, xl: 7 }`. *Why essential: 9-col grid math no longer applies; tiles will mis-size without this.*
- [ ] **T2.c** — Update `quality-overview.test.tsx` to find the moved labels in the status line (prefer `data-testid="overview-status"`). *Why essential: tests will fail without this.*
- [ ] **T2.d** — Update `18-UI-SPEC.md` Layout Contract to reflect new structure. *Why essential: the spec is the canonical reference; drift breaks future work.*
- [ ] **T2.e** — Skeleton loading state for the status line. *Why essential: prevents visible reflow on initial load.*

### Add after validation (v1.5+)

- [ ] **T1 deferred** — Validator auth (`mode/username/password/token` block) — gated on user reporting they have a behind-auth validator. Schema slot in `settings.validation.externalValidator.auth` is reserved.
- [ ] **T1 deferred** — Profile-pack selection UI — gated on US Core / non-MII users actually appearing.
- [ ] **T1 deferred** — Validator-result cache by resource hash — gated on profiler showing $validate as a hot path.
- [ ] **T1 deferred** — Abort-on-tab-switch cleanup — one-line `useEffect` cleanup, ship in any subsequent phase.
- [ ] **T2 deferred** — Auto-tick "Xm ago" every 30s — low-cost polish.
- [ ] **T2 deferred** — Click-to-refresh on the timestamp — only if user requests it.

### Future consideration (v2+)

- [ ] Local in-browser FHIR validator (likely never — out of scope per todo non-goal)
- [ ] Bundle/$validate batch mode
- [ ] Streaming partial OperationOutcome (no spec for this)
- [ ] R5/R6 validator support

## Feature Prioritization Matrix

| Feature | User value | Implementation cost | Priority |
|---------|------------|---------------------|----------|
| T1.a 3-tier cascade with capability probe | HIGH | LOW (capability already fetched) | P1 |
| T1.b Active strategy status line | HIGH | MEDIUM (label composition logic) | P1 |
| T1.c Settings UI: URL + Test connectivity | HIGH | MEDIUM (new UI surface) | P1 |
| T1.d Conditional banner suppression | MEDIUM | LOW (one conditional) | P1 |
| T1.e AbortController + timeout | MEDIUM | LOW (one fetch override) | P1 |
| T1 Validator auth | LOW until requested | MEDIUM | P3 |
| T1 Profile-pack selection | LOW (MII-only today) | MEDIUM | P3 |
| T1 Result cache | LOW | MEDIUM | P3 |
| T2.a Drop tiles + add status line | HIGH | LOW | P1 |
| T2.b Rebalance GRID_COLS | HIGH | LOW | P1 |
| T2.c Update tests | HIGH (tests must pass) | LOW | P1 |
| T2.d Update UI-SPEC | MEDIUM | LOW | P1 |
| T2.e Skeleton state | MEDIUM | LOW | P1 |
| T2 Auto-tick timestamp | LOW | LOW | P2 |
| T2 Click-to-refresh | LOW (not requested) | LOW | P3 |

**Priority key:** P1 = ship in Phase 29 v1.4; P2 = ship in v1.4 if cycles permit, otherwise defer; P3 = defer to a later milestone with explicit triggering condition.

## Comparable products / prior art

| Concern | What others do | Our approach |
|---------|----------------|--------------|
| Server-side $validate cascade | HAPI FHIR's HAPI Tester UI lets the user pick the validator endpoint; Inferno test-suite probes capability and skips tests if absent; Touchstone (Aegis) requires the validator URL upfront. | Auto-cascade with explicit "Test connectivity" affordance — better UX than Touchstone's manual config, more robust than Inferno's silent-skip. |
| Capability probe | Inferno fetches `/metadata` once per session, caches, walks operations. fhir-validator-wrapper reads the OperationDefinition by canonical. | Use the CapabilityStatement we already fetched in `QualityLayout`; no new HTTP. |
| Active-strategy disclosure | HAPI Tester shows a banner with the current endpoint; Postman FHIR collections show endpoint URL in the request bar; Inferno labels each test with its endpoint. | Single status line in ValidationPanel: `Validating {Type} via {Strategy}` — minimal UI weight, learnable on first read. |
| Validator timeout | HAPI defaults to 60s socket timeout; FHIR validator CLI exposes `-validation-timeout` flag; AWS HealthLake $validate caps at 25s per request. | 30s default per resource, configurable via `settings.validation.timeoutMs`; sits between AWS's tight cap and HAPI's generous default. |
| Dashboard summary header pattern | Grafana puts data-source freshness in the panel's header bar (`Last update: 12:34:56`). Datadog uses a top-right "Live"/"Paused"/"Stale" badge. Tremor (open-source dashboards) uses an explicit Subheader element with `lastUpdatedAt`. | Status line above the strip: `N resources · M types · Last computed Xm ago` — matches the Tremor convention. |
| Freshness indicator | Smashing Magazine 2025 review of real-time dashboard UX recommends: timestamp + relative ("3m ago") + optional manual refresh. Modern KPI patterns (per Material Tailwind, Untitled UI) put `Updated 5m ago` in a header bar separated from the metric tiles. | Match: relative time, no auto-refresh button (the toolbar's existing Re-run is the canonical refresh). |

## Risks & callouts (carried over from v1.4 plan-draft)

- **T1 scope creep** — the v1.4 plan-draft's risk callout explicitly says: "keep to 'configure URL, probe connectivity, surface active strategy' for v1.4; do NOT implement a local full-validator." This research's T1 P1 list respects that boundary.
- **T1 PHI gating** — the existing PHI-acknowledgement gate (Phase 7, `quality.validation.phiAcknowledged.v1` localStorage key) MUST continue to fire when external validator is configured AND the strategy resolves to `external`. Do not let the cascade silently skip the PHI prompt when both server `$validate` and external validator are available.
- **T1 capability cache invalidation** — must clear when `serverUrl` changes (matches the D-10 cohort-cache pattern and Phase 24's `Map<serverUrl, ...>` foundation that lands first in v1.4).
- **T2 GRID_COLS lg breakpoint** — the proposed `lg: 4` produces a 4+3 second-row layout. Verify visual weight is acceptable; the alternative `lg: 7` may overfill a 1280px dashboard. Test on the actual breakpoint widths before committing the literal.

## Sources

### Authoritative (HIGH confidence)

- [FHIR R4 — Resource Operation Validate](https://hl7.org/fhir/R4/resource-operation-validate.html) — URL forms (type-level vs instance-level), supported parameters (`resource`, `mode`, `profile`), response format (OperationOutcome with severities), HTTP 200 convention regardless of validation outcome.
- [FHIR R4 — CapabilityStatement](https://hl7.org/fhir/capabilitystatement.html) — `rest[].resource[].operation[]` is where per-resource operations like `$validate` are advertised.
- [HAPI FHIR Documentation — Instance Validator](https://hapifhir.io/hapi-fhir/docs/validation/instance_validator.html) — confirms the wire format used by HAPI's `$validate` endpoint matches the spec.
- [HAPI FHIR Documentation — Client Configuration](https://hapifhir.io/hapi-fhir/docs/client/client_configuration.html) — typical timeout patterns (connect timeout, socket timeout).
- [HL7 FHIR Validation Overview](https://hl7.org/fhir/validation.html) — explains the layered validation model (structure, profile, terminology, business rules).
- [Microsoft Learn — Validate FHIR resources against profiles in Azure Health Data Services](https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/validation-against-profiles) — confirms `?profile=` query parameter is the standard way to request profile-specific validation.
- [AWS HealthLake — $validate operation](https://docs.aws.amazon.com/healthlake/latest/devguide/reference-fhir-operations-validate.html) — confirms AWS's implementation matches the spec form.
- Existing in-repo: `src/quality/remoteValidator.ts` — current implementation already spec-compliant: `POST {validatorUrl}/{ResourceType}/$validate?profile={canonical}` with raw resource JSON body, returns `outcome.issue ?? []`.
- Existing in-repo: `src/quality/validationBackends.ts` — current `resolveBackends()` orders backends as `[structural, ...maybeRemote]` with `hasRemote/hasProfile/validatorUrl` predicates.
- Existing in-repo: `src/components/quality/ValidationPanel.tsx` — current Badge row + dismissible banner + PHI acknowledgement gate to extend.
- Existing in-repo: `src/components/quality/OverviewStrip.tsx` — current `SimpleGrid` + `GRID_COLS` + `METRIC_ORDER` to refactor.
- Existing in-repo: `.planning/v1.4-PLAN-DRAFT.md` — Phase 29 scoping for both T1 and T2; risk callouts.
- Existing in-repo: `.planning/todos/pending/2026-04-14-add-external-validator-integration-for-full-fhir-validate.md` — original feedback + non-goals.
- Existing in-repo: `.planning/todos/pending/2026-04-14-reduce-overview-strip-tile-count-move-totals-to-header.md` — original feedback + proposed `GRID_COLS`.

### Secondary (MEDIUM confidence — current ecosystem patterns)

- [Smashing Magazine — UX Strategies for Real-Time Dashboards (Sep 2025)](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) — data freshness indicator pattern, "Live/Stale/Paused" status, manual refresh control.
- [Tremor — Copy-and-paste Tailwind dashboard components](https://www.tremor.so/) — header subhead pattern with `lastUpdatedAt`.
- [Material Tailwind PRO — KPI Cards](https://www.material-tailwind.com/blocks/kpi-cards) — modern KPI layout with timestamp in header bar.
- [Untitled UI — React Dashboards](https://www.untitledui.com/react/components/dashboards) — KPI tile + status header convention.
- [InterSystems Developer Community — New FHIR Server Profile-based Validation](https://community.intersystems.com/post/new-fhir-server-profile-based-validation) — confirms `?profile=` convention across vendors.

### Confidence summary

- T1 wire format / payload / capability-probe approach: **HIGH** (FHIR R4 spec is authoritative; multiple vendor implementations confirm).
- T1 timeout/abort patterns: **MEDIUM** (HAPI's defaults documented; client-side defaults are a judgment call).
- T1 active-strategy UX: **MEDIUM** (no canonical FHIR convention; the proposed status-line approach is the simplest pattern that meets the user feedback).
- T2 dashboard pattern: **HIGH** (consistent across Grafana, Tremor, Material Tailwind, Untitled UI; Smashing Magazine 2025 review confirms it's current best practice).
- T2 implementation cost: **HIGH** (it's a localized SimpleGrid edit + one test file; the surrounding architecture is unchanged).

---
*Feature research for: FHIR Exploder v1.4 Phase 29 backlog UX (T1 external validator, T2 OverviewStrip refactor)*
*Researched: 2026-04-16*
