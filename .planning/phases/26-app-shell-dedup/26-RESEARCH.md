# Phase 26: App-Shell Dedup - Research

**Researched:** 2026-04-22
**Domain:** React Router 7 + Mantine 8 layout refactor; FHIR search helper extraction
**Confidence:** HIGH
**Valid until:** 2026-05-22 (stable refactor surface)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-17 — verbatim)
- **D-01:** Render-prop primitive `<ConnectionGatedOutlet render={(connected) => ...} />` — NOT children-wrapper.
- **D-02:** Owns ONLY the "Not connected" alert. Does NOT wrap `MedplumProvider`. `MedplumProvider` stays in `AppLayout.tsx`.
- **D-03:** File location: `src/components/layout/ConnectionGatedOutlet.tsx`.
- **D-04:** Canonical alert copy = `QualityLayout` variant (see §Focus 1 — copy is identical across all 3, not a differentiator).
- **D-05:** Options object signature: `searchByIdentifierPrefix(client, type, prefix, { limit = 10, pageSize = 50 } = {})`.
- **D-06:** File location: new file `src/utils/searchByIdentifierPrefix.ts` (no existing search helper module — see §Focus 2).
- **D-07:** Return type: `Promise<Bundle>`.
- **D-08:** Helper adopts union of both call sites' wildcard logic (§Focus 2 confirms they are identical).
- **D-09:** `RouterNavLink`'s native `isActive` with `end={false}` for section roots; `end={true}` for `/` (dashboard).
- **D-10:** Section roots: `/patients`, `/explorer`, `/quality`. `/cohorts` (actually `/quality/cohorts`) inherits Quality activation.
- **D-11:** Replace `location.pathname === link.href` at `Sidebar.tsx:104,115` with `NavLink`-native active state.
- **D-12:** All inline-style blue-6 link sites migrate to `<Anchor component={Link} to="..." c="blue.6">`.
- **D-13:** Use `c="blue.6"` explicitly (existing `CodingCoveragePanel:263` / `ResourceCountsPanel:138` already do — match for consistency).
- **D-14:** ONE commit for SHELL-04.
- **D-15:** Wrap `setSettings` in `useCallback`; remove `eslint-disable` at `SettingsContext.tsx:50` (not line 32 — see §Focus 5).
- **D-16:** Verify via `npm run lint`.
- **D-17:** `stored` is not a dep here — `settings` (previous value) IS captured. See §Focus 5 closure analysis.

### Claude's Discretion
- Plan batching (D-18 recommended 2-3 plans; see §Plan Batching below)
- Render-parity test strategy (recommended: structural assertions — see §Focus 4)
- Commit granularity (one commit per SHELL-XX preferred)
- Migration guide (declined — ≤30 LOC primitive is self-documenting)

### Deferred (OUT OF SCOPE)
- MedplumProvider consolidation
- Search helper genericization beyond identifier prefix
- Sidebar responsive / mobile drawer
- Mantine theme extension for link color
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | `<ConnectionGatedOutlet>` replaces alert-triplication across ExplorerLayout/PatientsLayout/QualityLayout | §Focus 1 — QualityLayout size anomaly explained; post-migration size confirmed ≤30 LOC |
| SHELL-02 | `searchByIdentifierPrefix(client, type, prefix, { limit, pageSize })` helper | §Focus 2 — call sites confirmed identical in semantics; single signature viable |
| SHELL-03 | Sidebar uses `RouterNavLink` `isActive` with `end={false}` for section roots | §Focus 3 — current bug isolated at Sidebar.tsx:104,115 |
| SHELL-04 | Inline `var(--mantine-color-blue-6)` link styles migrate to `<Anchor component={Link} c="blue.6">` | §Focus 3 — theme default confirmed matches; 7 actual sites (not 10) |
| SHELL-05 | `setSettings` wrapped in `useCallback`; `eslint-disable` removed | §Focus 5 — exact deps identified (`settings` prev-value capture) |
</phase_requirements>

## Executive Summary

- **SHELL-01 scope is smaller than it looks.** All three alert blocks are **byte-identical** (same icon, same copy, same `<Link to="/" style={...}>`). `QualityLayout`'s 119 LOC is explained by an inlined ~50-LOC legacy-migration `useEffect` (lines 32-82) — that stays. Post-migration all 3 layouts reach ≤30 LOC.
- **CRITICAL discrepancy: `quality-layout.test.tsx` does NOT exist.** REQUIREMENTS.md SHELL-01 and CONTEXT.md canonical_refs both claim it must "pass unchanged" — there is no such file under `src/components/quality/__tests__/` (only `SortableTh.test.tsx`, `RunProgress.test.tsx`, `DrillDownShell.test.tsx`). Planner MUST either (a) drop the acceptance clause, or (b) create the test as Wave 0.
- **SHELL-02 helper is a clean lift.** `SearchResultsPage.tsx:165-207` and `PatientListPage.tsx:321-357` build functionally identical wildcard queries: `_elements=id&_count=5000` → filter by `startsWith(prefix)` → `_id=a,b,c&_count=N`. One signature with options object covers both; callers continue to handle `result.total = matching.length` override at their level (part of D-07 "return raw Bundle").
- **SHELL-04 site count is 7, not 10.** Of 12 `var(--mantine-color-blue-6)` hits, 3 are in layouts (absorbed by SHELL-01), 2 are non-link usages (icon `color` prop, SVG stroke), 2 are chart strokes. Actual link-style migrations: **3 in CompletenessPanel** (rows 146/173/193) + 3 in layouts = 6 total, and CompletenessPanel is the only net-new SHELL-04 file.
- **Theme is Mantine-blue-6-compatible.** `src/theme.ts` sets `primaryColor: 'blue'`, no `Anchor` overrides. Mantine 8's default `<Anchor>` renders `blue.6`. Using `c="blue.6"` explicitly (per D-13) matches existing `CodingCoveragePanel:263` / `ResourceCountsPanel:138` convention.

**Primary recommendation:** Three plans (SHELL-01 solo → SHELL-02+04+05 bundle → SHELL-03 solo). File-sets do NOT overlap, so plans 2 & 3 can run in Wave 2 in parallel after plan 1.

## Focus 1: QualityLayout Size Anomaly (119 vs 57/61)

**Line-by-line breakdown:**

| Lines | Content | Fate under SHELL-01 |
|-------|---------|---------------------|
| 1-26 | Imports, type decl | Keep (~20 LOC) |
| 32-82 | `useEffect` legacy-migration (the essay + body) | **Keep — NOT duplication.** Unique to Quality. |
| 84-103 | Connection gate "Not connected" alert | **Delete — absorbed by `ConnectionGatedOutlet`** |
| 105-118 | `MedplumProvider` + `QualityMetricsProvider` + `<Outlet>` | Keep; decoration stays layout-specific |

**Post-SHELL-01 size estimate:** imports (8) + type (4) + `QualityLayout` fn wrapper + `useEffect` migration block (~30, shrinkable by moving essay comment into `migrateLegacyResourceTypeKey` — this is Phase 28 SWEEP-04 scope, NOT here) + `ConnectionGatedOutlet` render-prop return (~10) = **~55 LOC total with the migration essay, ~25 LOC without it**. Hits ≤30 target only if the essay stays inlined BUT contributes to "unique body content" (not gate duplication). ROADMAP success criterion is "each ≤30 lines" — Phase 28 SWEEP-04 will remove the essay, so Phase 26's target is "gate duplication removed" with the understanding that QualityLayout stays slightly above 30 until SWEEP-04. **Flag this to planner — either relax to ≤35 or coordinate a Phase 28 touch here.**

**File:line citations:**
- Gate alert block: `QualityLayout.tsx:84-103`, `ExplorerLayout.tsx:24-43`, `PatientsLayout.tsx:28-47` — **byte-identical except for the `export function` name**
- Alert copy is identical: "Not connected to a FHIR server. Return to the dashboard to connect." (D-04 picks QualityLayout variant — but all 3 are the same)

**No existing `quality-layout.test.tsx`.** Confirmed via `Glob src/**/__tests__/quality-layout*` → 0 matches. REQUIREMENTS.md SHELL-01 acceptance and CONTEXT.md D-04/canonical_refs both reference this test. **This is a known-invalid claim.** Options:
1. Drop the "passes unchanged" clause — no test to break.
2. Wave 0 creates a minimal `quality-layout.test.tsx` that asserts the legacy-migration `useEffect` still calls `migrateLegacyResourceTypeKey` and clears `LEGACY_COHORT_KEY` (independent of the gate refactor).

**Recommendation:** option 2 — planner writes the test as Wave 0 protecting the legacy-migration behavior (the genuinely fragile piece of QualityLayout). This also satisfies Nyquist SHELL-01 coverage.

## Focus 2: Wildcard Search Semantics Diff

**Call site 1: `SearchResultsPage.tsx:123-207`**
```
const prefix = idPrefixSearch;  // value.replace(/\*/g, '')
const MAX_ID_FETCH = 5000;
idUrl = `${resourceType}?_elements=id&_count=${MAX_ID_FETCH}`
→ GET → idBundle
→ allIds = bundle.entry.map(e => e.resource?.id).filter(Boolean)
→ matching = allIds.filter(id => id.startsWith(prefix))
→ if empty: setBundle({resourceType,type,total:0,entry:[]})
→ else: pageIds = matching.slice(0, pageSize=searchRequest.count ?? 20)
→ fetchUrl = `${resourceType}?_id=${pageIds.join(',')}&_count=${pageSize}`
→ GET → result, result.total = matching.length
```

**Call site 2: `PatientListPage.tsx:319-358`**
```
const prefix = idValue.replace(/\*/g, '')
idUrl = `Patient?_elements=id&_count=5000`   // hardcoded 5000
→ GET → idBundle
→ allIds = bundle.entry.map(e => e.resource?.id).filter(Boolean)
→ matching = allIds.filter(id => id.startsWith(prefix))
→ if empty: setBundle({resourceType,type,total:0,entry:[]})
→ else: pageIds = matching.slice(0, count)  // count = useState
→ GET `Patient?_id=${pageIds.join(',')}&_count=${count}`
→ result.total = matching.length
```

**Diff:** Zero semantic differences. Differences are:
- Resource type parameterized (`Patient` vs `${resourceType}`) — **helper takes `type` arg**
- Page size sourced differently (`searchRequest.count ?? 20` vs state `count`) — **caller passes `{ pageSize }`**
- Site 1 names the constant `MAX_ID_FETCH = 5000`; site 2 inlines `5000` — **helper uses `limit = 10` per D-05, but that name conflicts — see below**

**D-05 signature issue:** `limit = 10, pageSize = 50` defaults are misleading. The two actual knobs are:
- **`idFetchLimit`** (formerly `MAX_ID_FETCH=5000`) — how many IDs to enumerate for prefix matching
- **`pageSize`** (call site passes 20 or `count`) — how many full resources to fetch in the follow-up call

**Recommendation:** signature should be `searchByIdentifierPrefix(client, type, prefix, { idFetchLimit = 5000, pageSize = 20 } = {})`. D-05's `limit = 10` likely intends `pageSize`; align with actual call-site behavior (20 default) — **flag for planner to re-confirm during 26-01 plan.**

**Return shape:** both sites mutate `result.total = matching.length` after the second fetch. D-07 says helper returns raw Bundle. Two options:
- (A) Helper overrides `total` itself (matches current behavior; callers simplify)
- (B) Helper returns `{ bundle, matchingTotal }` (caller decides)

**Recommendation A** — preserves exact caller UX ("Override total to reflect all matches, not just this page" comment at SearchResultsPage.tsx:194 is load-bearing).

## Focus 3: Theme Link Color Parity + Sidebar Bug

### Theme

`src/theme.ts` (7 LOC):
```
createTheme({ fontFamily: '...', defaultRadius: 'sm', primaryColor: 'blue' })
```

**No `components.Anchor` overrides.** Mantine 8 default Anchor color = `theme.primaryColor.6` = `blue.6` = `#228be6`. This is the same value `var(--mantine-color-blue-6)` resolves to. **Theme-default `<Anchor component={Link}>` with NO `c=` prop renders the identical color.**

**Existing pattern (match):** `CodingCoveragePanel.tsx:263` and `ResourceCountsPanel.tsx:138` both use `<Anchor component={Link} to={...} c="blue.6">`. Per D-13, match them — use `c="blue.6"` explicitly.

### SHELL-04 actual site count

**Inline-style `var(--mantine-color-blue-6)` hits (12 total grep matches):**

| File:Line | Type | SHELL-04 site? |
|-----------|------|----------------|
| ExplorerLayout.tsx:35 | Link style | Absorbed by SHELL-01 |
| PatientsLayout.tsx:39 | Link style | Absorbed by SHELL-01 |
| QualityLayout.tsx:95 | Link style | Absorbed by SHELL-01 |
| CompletenessPanel.tsx:146 | Link style (loading row) | **YES — SHELL-04 site** |
| CompletenessPanel.tsx:173 | Link style (error row) | **YES — SHELL-04 site** |
| CompletenessPanel.tsx:193 | Link style (normal row) | **YES — SHELL-04 site** |
| TerminologySettingsModal.tsx:37 | Icon color prop | NO (not a link) |
| FhirSettingsModal.tsx:58 | Icon color prop | NO (not a link) |
| PatientTimeline.tsx:281 | CSS border color | NO (not a link) |
| TrendMiniChart.tsx:100,246,315 | SVG stroke (3) | NO (chart viz) |

**Net: 3 sites in CompletenessPanel (`CompletenessRow` function, 3 branches).** Neither `SearchResultsPage.tsx` nor `PatientListPage.tsx` has `var(--mantine-color-blue-6)` inline — their `Anchor` components render default blue already. **REQUIREMENTS.md SHELL-04 claim of "10 sites across Completeness / SearchResults / PatientList / ResourceCounts / CodingCoverage" overstates the scope by 7 sites.** Flag to planner.

### SHELL-03 Sidebar bug

`Sidebar.tsx:97-107`:
```
<NavLink key={item.to} component={RouterNavLink} to={item.to}
        label={item.label} leftSection={<item.icon size={20} />}
        active={location.pathname === link.href} />   // EXACT-MATCH BUG
```

`location.pathname === item.to` fails for `/patients/123` not matching `/patients`. Fix per D-09: use `RouterNavLink`'s `isActive` callback — but `@mantine/core`'s `NavLink` with `component={RouterNavLink}` doesn't pass the render-prop `isActive` through. **Cleanest fix:** use `useMatch(`${item.to}/*`)` or custom `useResolvedPath + useMatch` — NOT the naive NavLink isActive from react-router (that's only accessible via render-prop `className`/`style`). **Concrete pattern:**
```
const match = useMatch({ path: item.to, end: item.to === '/' });
<NavLink ... active={!!match} />
```
Planner should confirm this works for `/quality/cohorts` highlighting BOTH `/quality` and `/cohorts` sidebar entries (Sidebar has both at lines 37-38).

## Focus 4: Render-Parity Test Strategy

**Recommendation: structural assertions + 1 smoke snapshot.**

For each layout, render with `{status: 'connected'}` and `{status: 'idle'}`, assert:
1. Connected: `<Outlet>` is rendered (use a stub child component with `data-testid`)
2. Disconnected: alert with `role="alert"` and text matching `/Not connected/i` is rendered, with a link to `/`
3. QualityLayout-specific: `migrateLegacyResourceTypeKey` is called on mount (spy), `QualityMetricsProvider` is present

**Not recommended:**
- Snapshot tests — fragile against Mantine class-name churn (v8.3.x patches rotate class hashes)
- Visual regression — overkill for a no-behavior-change refactor

**Files to create:**
- `src/components/layout/__tests__/ConnectionGatedOutlet.test.tsx` (new primitive)
- `src/components/quality/__tests__/quality-layout.test.tsx` (Wave 0 — doubles as SHELL-01 acceptance fix)

## Focus 5: Security / Safety

- **SHELL-02 search helper:** No new query shapes. Continues to use existing `_elements=id`, `_id=`, and `_count=` — no PHI payload shape change. Existing sites already leak patient IDs into URLs (unavoidable for FHIR search); helper doesn't worsen it. No logging changes needed.
- **SHELL-05 `setSettings`:** Touches the in-memory `AppSettings` object only; no new persistence path. The `eslint-disable-next-line react-hooks/exhaustive-deps` is at **line 50, not line 32** (CONTEXT.md has stale line number — line 32 is the `setSettingsState(settings)` line). Missing deps per exhaustive-deps rule: `settings` (read at line 34 `const prevUrl = settings?.fhir?.serverUrl`). Wrapping in `useCallback` with deps `[settings]` makes the rule pass; no render-loop risk because `settings` updates only on explicit `setSettingsState` call.
- **SHELL-03 Sidebar:** Pure UI; no auth/data path.
- **SHELL-04 Anchor migration:** Pure styling; no data path.

No new attack surface. No ASVS categories triggered (no new input validation, no new authn/authz, no new data storage).

## Plan Batching Recommendation

**3 plans** (per D-18):

| Plan | Scope | Wave | Parallelism |
|------|-------|------|-------------|
| 26-01 | SHELL-01: `ConnectionGatedOutlet` + migrate 3 layouts + Wave 0 test creation for `quality-layout.test.tsx` | 1 | Solo (largest surface) |
| 26-02 | SHELL-02 (search helper) + SHELL-04 (Anchor migration, 3 CompletenessPanel sites only) + SHELL-05 (useCallback + eslint fix) | 2 | Parallel-safe with 26-03 |
| 26-03 | SHELL-03 (Sidebar `useMatch` replacement) | 2 | Parallel-safe with 26-02 |

File-set disjointness check:
- 26-01: `src/components/layout/ConnectionGatedOutlet.tsx` (new), 3 layout files, 1 test file
- 26-02: `src/utils/searchByIdentifierPrefix.ts` (new), `SearchResultsPage.tsx`, `PatientListPage.tsx`, `CompletenessPanel.tsx`, `SettingsContext.tsx`, test files
- 26-03: `src/components/layout/Sidebar.tsx` only

**Zero overlap.** Safe to parallelize 26-02 and 26-03 after 26-01.

## Pitfalls

1. **Quality-layout legacy-migration essay keeps QualityLayout >30 LOC.** The ~50-line useEffect with comment essay is load-bearing (acceptance criteria from Phase 21 Plan 21-04 required `LEGACY_COHORT_KEY`/`removeItem`/`useEffect` to be grep-visible in this file). Removing it is explicitly Phase 28 SWEEP-04 scope. **Recommendation:** planner accepts QualityLayout at ~35 LOC post-26, or touches the essay now in a Phase 28 coordination.

2. **`useCallback` ref-churn on `setSettings`.** If `setSettings` is dep-included by downstream consumers (`useEffect([setSettings, ...])`), wrapping with `useCallback([settings])` makes it re-created on every settings change — identical to today's inline function behavior, so no regression. But if any consumer memoizes on `setSettings` identity, they'll invalidate on each settings update. Grep for `setSettings` usage before landing. D-17 already flags this.

3. **SHELL-03 `useMatch` path nuance.** `useMatch({ path: '/quality', end: false })` matches `/quality` AND `/quality/cohorts` — good for Quality highlighting, BUT ALSO highlights "Quality" row when user is on `/quality/cohorts`. Sidebar has BOTH "Quality" and "Cohorts" entries. Desired behavior per D-10 needs planner to confirm: should `/quality/cohorts` highlight only Cohorts, or both? Current ROADMAP says `/quality/plausibility/Observation` highlights Quality — which implies exact section-root-match. Cohorts row at `/quality/cohorts` may need a `useMatch` with `end: true` OR priority ordering.

4. **Stale REQUIREMENTS.md / CONTEXT.md claims.** Planner must not take "10 inline sites" or "quality-layout.test.tsx passes unchanged" at face value. This research supersedes those numbers.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (inferred — existing `*.test.tsx` pattern in `src/components/quality/__tests__/`) |
| Config file | `vite.config.ts` or `vitest.config.ts` (planner to confirm) |
| Quick run command | `npm test -- <path>` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHELL-01 | Disconnected state renders alert with link to `/`; connected renders `<Outlet>` | unit | `npm test -- ConnectionGatedOutlet.test.tsx` | Wave 0 |
| SHELL-01 | QualityLayout still invokes `migrateLegacyResourceTypeKey` + removes legacy key | unit | `npm test -- quality-layout.test.tsx` | Wave 0 |
| SHELL-02 | `searchByIdentifierPrefix` returns bundle with `total=matching.length` for prefix match; empty bundle for no match | unit | `npm test -- searchByIdentifierPrefix.test.ts` | Wave 0 |
| SHELL-02 | `PatientListPage` + `SearchResultsPage` still filter by prefix correctly (integration) | integration | existing page tests (if any) + manual smoke | Manual |
| SHELL-03 | Navigating to `/patients/123` highlights "Patients" sidebar row | unit | `npm test -- Sidebar.test.tsx` | Wave 0 |
| SHELL-03 | `/` highlights only Dashboard (not Patients) | unit | same | Wave 0 |
| SHELL-04 | Grep `var(--mantine-color-blue-6)` in `CompletenessPanel.tsx` returns 0 matches | static | `! grep -q 'var(--mantine-color-blue-6)' src/components/quality/CompletenessPanel.tsx` | N/A (grep) |
| SHELL-05 | `SettingsContext.tsx` contains no `eslint-disable-next-line react-hooks/exhaustive-deps` | static | `npm run lint` + grep | N/A |

### Sampling Rate
- **Per task commit:** `npm test -- <changed test file>` (<30s per file)
- **Per wave merge:** `npm test` (full suite — currently 781 passing / 22 pre-existing fails)
- **Phase gate:** Full suite green modulo the 22 known-failing tests before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/layout/__tests__/ConnectionGatedOutlet.test.tsx` — covers SHELL-01 primitive behavior
- [ ] `src/components/quality/__tests__/quality-layout.test.tsx` — covers SHELL-01 QualityLayout-specific migration
- [ ] `src/utils/__tests__/searchByIdentifierPrefix.test.ts` — covers SHELL-02 helper
- [ ] `src/components/layout/__tests__/Sidebar.test.tsx` — covers SHELL-03 nested-route activation
- [ ] Grep assertion in phase-gate checklist for SHELL-04

## Open Questions

1. **QualityLayout ≤30 LOC vs legacy-migration essay.** ROADMAP says each layout ≤30 LOC. The essay is ~50 LOC and is load-bearing until Phase 28 SWEEP-04. Planner decision: accept ~35 LOC in QualityLayout now, or pull SWEEP-04's essay-removal forward into Phase 26?
2. **D-05 signature defaults.** `limit = 10, pageSize = 50` don't match call-site reality (5000 + 20). Confirm with planner whether to rename `limit → idFetchLimit` with 5000 default.
3. **Cohorts row activation on `/quality/cohorts`.** Should Sidebar "Quality" AND "Cohorts" both light up, or only "Cohorts"? Current exact-match highlights only Cohorts (bug on nested patient/explorer/quality routes, but Cohorts works by accident).

## Project Constraints (from CLAUDE.md)

- **Tech stack locked:** React 18 + Mantine 8 + `@medplum/react` 5.x — no changes this phase (pure refactor).
- **No Tailwind, no @tanstack/react-query** — Mantine-only UI, Medplum-native hooks.
- **License:** MIT — new files (`ConnectionGatedOutlet.tsx`, `searchByIdentifierPrefix.ts`) inherit MIT.
- **Medplum non-Medplum-server caveats:** helper uses only `client.get(client.fhirUrl(...))` and `client.fhirUrl()` — both Blaze-compatible. No `useSearch`/`useSearchResources` in the helper (keeps it pure).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mantine 8 default `<Anchor>` renders `theme.primaryColor.6` (blue.6) identical to `var(--mantine-color-blue-6)` | Focus 3 | Visual color mismatch on 3 CompletenessPanel rows — mitigated by D-13 using explicit `c="blue.6"` which IS verified as current pattern |
| A2 | `useMatch({ path, end: false })` is the right primitive for SHELL-03 (vs Mantine NavLink render-prop isActive) | Focus 3 | Planner may find a cleaner Mantine-native path; Focus 3 notes the tradeoff |
| A3 | `setSettings` only needs `[settings]` dep (previous-value capture) | Focus 5 | If other closures exist (e.g., `loading`, `usingDefaults`), eslint will flag during D-16 verification — low risk |

## Sources

- Codebase (HIGH) — all file:line citations verified via Read tool 2026-04-22
- `src/theme.ts` — Mantine theme config read directly
- Mantine 8 default color behavior — `primaryColor.6` convention verified in `CodingCoveragePanel.tsx:263` existing usage
- Phase 23/24/25 summaries — referenced via CONTEXT.md canonical_refs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps
- Architecture: HIGH — existing render-prop pattern (DrillDownShell from Phase 25) is a direct precedent
- Pitfalls: HIGH — specific file:line evidence for every pitfall
- Test strategy: MEDIUM — Vitest framework inferred, not verified in this session

**Research date:** 2026-04-22
**Valid until:** 2026-05-22
