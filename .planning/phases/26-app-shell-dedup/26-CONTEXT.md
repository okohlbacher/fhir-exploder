# Phase 26: App-Shell Dedup - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Source:** Auto-captured via `/gsd-discuss-phase 26 --auto` (recommended defaults selected)

<domain>
## Phase Boundary

Dedupe route-layer and search-layer duplication across the three layouts and two list pages. **Refactor phase, no net-new behavior.** Success measured by:

- 3 layouts (`ExplorerLayout` 57, `PatientsLayout` 61, `QualityLayout` 119) → **each ≤30 LOC** via shared `<ConnectionGatedOutlet>` render-prop
- Wildcard identifier search → **single helper** `searchByIdentifierPrefix()`
- Sidebar nested-route activation — `/patients/123`, `/explorer/Patient/1`, `/quality/plausibility/Observation` highlight section roots
- Internal links → **`Anchor component={Link}`** with Mantine theme colors (no inline `style={{ color: 'var(--mantine-color-blue-6)' }}` — 10 sites identified)
- `SettingsContext.setSettings` → `useCallback`-wrapped; `eslint-disable-next-line react-hooks/exhaustive-deps` removed

**Requirements covered:** SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05

**Explicitly NOT in this phase:**
- `React.lazy()` drill-down routes — Phase 27 (EFF-02)
- `ResourceIssueTable` pagination memo — Phase 27 (EFF-01)
- Any visual/design change — render parity mandatory
- Behavior changes to search, auth, or routing semantics

**Dependencies:** Phase 23 complete. **INDEPENDENT of Phases 24/25** per ARCHITECTURE research correction — could have run in parallel with them. Now runs after because the sequential chain continues.

**Effort (ROADMAP):** ~1 day.

</domain>

<decisions>
## Implementation Decisions

### SHELL-01: ConnectionGatedOutlet shape

- **D-01:** **Render-prop** primitive, NOT children-wrapper. API: `<ConnectionGatedOutlet>{(connected) => connected ? <Outlet /> : <Alert ... />}</ConnectionGatedOutlet>` — or equivalently, a child-function. Concretely for this codebase: `<ConnectionGatedOutlet render={(connected) => ...} />`. The render-prop is what makes the 3 layouts collapse to ≤30 LOC — direct `<Outlet />` wrapping leaves layout-specific decoration in each layout.
- **D-02:** **Owns ONLY the "Not connected" alert.** Does NOT wrap `MedplumProvider` (REQUIREMENTS.md SHELL-01 is explicit). `MedplumProvider` stays in `AppLayout.tsx` at the root.
- **D-03:** File location: `src/components/layout/ConnectionGatedOutlet.tsx`. Co-located with AppLayout + Sidebar.
- **D-04:** The "Not connected" alert copy + action is a single source of truth in the new primitive. The 3 current layouts have near-identical but slightly different alert text — choose the `QualityLayout` variant as canonical (it's the most complete) unless SHELL-01 acceptance requires otherwise.

### SHELL-02: searchByIdentifierPrefix helper

- **D-05:** Options object signature (NOT flat params) — `searchByIdentifierPrefix(client, type, prefix, { limit = 10, pageSize = 50 } = {})`. Options object is more extensible if the helper later needs a `system` filter or sort flag.
- **D-06:** File location: `src/quality/search.ts` or `src/utils/search.ts` — whichever module already hosts FHIR search helpers. Planner to confirm; fall back to `src/utils/searchByIdentifierPrefix.ts` as a new file.
- **D-07:** Return type: `Promise<Bundle>` (the raw Medplum search bundle), NOT the pre-processed hit list. Callers already normalize the bundle — breaking that would change two call sites beyond the dedup.
- **D-08:** Wildcard expansion: the existing copies in `SearchResultsPage.tsx:165` and `PatientListPage.tsx:107` each build the `:contains` or prefix query their own way. Helper adopts the UNION of both (whichever is more inclusive) — check both call sites' wildcard logic before extraction; planner must diff them in `<read_first>`.

### SHELL-03: Sidebar nested-route activation

- **D-09:** Use React Router 7's `NavLink`'s native `isActive` (via `RouterNavLink`) with an `end={false}` prop so prefix-match includes nested routes. Do NOT build a custom pathname-prefix matcher.
- **D-10:** Three section roots: `/patients`, `/explorer`, `/quality`. `/` (dashboard) stays exact-match via `end={true}`. `/cohorts` (if applicable) inherits Quality section activation on `/quality/cohorts`.
- **D-11:** `Sidebar.tsx:97-115` currently uses `location.pathname === link.href` (exact match). Replace with `NavLink`'s active class. No custom CSS needed — rely on the Mantine/RouterNavLink active state.

### SHELL-04: Anchor+Link standardization

- **D-12:** All 10 identified `var(--mantine-color-blue-6)` inline-style sites across `CompletenessPanel`, `SearchResultsPage`, `PatientListPage`, `ResourceCountsPanel`, `CodingCoveragePanel` (and any others discovered during planning) migrate to `<Anchor component={Link} to="..." c="blue">` or theme-default `<Anchor component={Link}>`.
- **D-13:** Theme color vs no color: prefer theme-default (`<Anchor component={Link}>` without `c=` prop) if the Mantine theme already defines link color. Specify `c="blue"` only if theme default doesn't match current rendering. Planner to confirm via one screenshot-less test: render a sample link, check it matches the inline-style color visually (same hex or equivalent).
- **D-14:** Commit granularity: ONE commit for SHELL-04 touching all 10 sites — grep-driven edit, low blast radius, no semantic change.

### SHELL-05: SettingsContext useCallback

- **D-15:** Wrap `setSettings` in `useCallback` with `[setStored, stored]` deps (or whatever the exhaustive-deps rule identifies as the actual closures). Remove the `eslint-disable-next-line react-hooks/exhaustive-deps` at `SettingsContext.tsx:32`.
- **D-16:** Verify via `npm run lint` — the disable directive should no longer be needed AND the file should pass without new warnings.
- **D-17:** If `useCallback` introduces a render-loop risk (per PITFALLS §7), memoize any non-primitive deps (`stored` if it's an object reference, use `JSON.stringify` or a selector hash). Low risk here — `SettingsContext` state is a plain object.

### Plan batching — Claude's Discretion (recommended)

- **D-18 (recommended plan shape):** 2-3 plans:
  - **Plan 26-01** (Wave 1): SHELL-01 (ConnectionGatedOutlet + migrate 3 layouts) — largest blast radius, touches AppLayout adjacency
  - **Plan 26-02** (Wave 1 OR Wave 2, parallel-safe with 26-01 if file sets don't overlap): SHELL-02 (searchByIdentifierPrefix) + SHELL-04 (Anchor+Link migration) + SHELL-05 (SettingsContext useCallback) — mechanical bundled cleanup
  - **Plan 26-03** (Wave 2, depends on 26-01 if Sidebar renders inside the new Outlet): SHELL-03 (Sidebar nested-route) — small, 1 file
  Planner may bundle differently; keep SHELL-01 in its own plan (largest surface).

### Claude's Discretion (blanket)

- Render-parity test strategy for the 3 layouts — snapshot OR structural assertions (planner picks)
- Commit granularity (one commit per SHELL-XX preferred)
- Whether to write a migration guide for future layouts (discretion: no unless ≤30 LOC addition)

### Folded Todos

None — the 6 pending todos (MII Synthea, auto-connect, date-range UX, pin resource types, external validator, OverviewStrip reduction) all belong elsewhere.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-level spec
- `.planning/ROADMAP.md` §"Phase 26: App-Shell Dedup" — goal, success criteria
- `.planning/REQUIREMENTS.md` §"Phase 26 — App-Shell Dedup" — SHELL-01 through SHELL-05 acceptance text

### Dependency context
- `.planning/phases/23-v1.3-close-out/23-04-SUMMARY.md` — Phase 23 complete (dependency satisfied)
- `.planning/research/ARCHITECTURE.md` — "Phase 26 INDEPENDENT of Phase 24" correction

### Target code (refactor surface)
- `src/components/layout/AppLayout.tsx` — root layout (MedplumProvider stays here, NOT moved to ConnectionGatedOutlet)
- `src/components/layout/Sidebar.tsx` (123 LOC, 97-115 is the exact-match bug site for SHELL-03)
- `src/components/patients/PatientsLayout.tsx` (61 LOC — migration target for SHELL-01)
- `src/components/quality/QualityLayout.tsx` (119 LOC — largest, also holds canonical "Not connected" alert copy)
- `src/components/explorer/ExplorerLayout.tsx` (57 LOC)
- `src/components/patients/PatientListPage.tsx` (wildcard search site SHELL-02)
- `src/components/explorer/SearchResultsPage.tsx` (other wildcard search site SHELL-02)
- `src/contexts/SettingsContext.tsx:32` (SHELL-05 eslint-disable removal site)

### Existing tests (render parity)
- `src/components/quality/__tests__/quality-layout.test.tsx` — SHELL-01 acceptance requires this test to pass unchanged (legacy-migration test)

### Related recent work
- `.planning/phases/25-quality-module-dedup/25-03-SUMMARY.md` — DrillDownShell render-prop pattern (similar architectural approach to ConnectionGatedOutlet)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **React Router 7 `NavLink` + `isActive`** — native active-state, no custom matcher needed
- **Mantine `Anchor` + `component` prop** — Mantine's idiomatic way to compose with React Router `Link`
- **Existing search query builders** in `SearchResultsPage.tsx:165` + `PatientListPage.tsx:107` — diff these for SHELL-02 helper's wildcard logic

### Established Patterns (from Phase 25)
- **Render-prop primitive for render-parity refactors** — `DrillDownShell` from Phase 25 QDDEP-02 is the reference pattern. `ConnectionGatedOutlet` should mirror its structure: ≤6 required props, optional extras, test file with structural assertions.
- **Theme-default over inline style** — Phase 25 didn't touch this but the Mantine convention is `Anchor` + theme colors; inline `style` is a code smell.
- **`useCallback` with memoized key deps** (Phase 23 Bug B lesson) — if `setSettings` needs array/object deps, memoize a key.

### Integration Points
- **AppLayout.tsx** — where MedplumProvider stays; ConnectionGatedOutlet drops in below it
- **3 layouts** — import `<ConnectionGatedOutlet>`, drop local "Not connected" alerts
- **2 list pages** — import `searchByIdentifierPrefix` helper, remove inline wildcard builders
- **5+ component files** — grep-driven `<Anchor component={Link}>` migration
- **SettingsContext.tsx** — single-line lint fix + useCallback wrap

### Test Baseline (post-Phase 25)
- 22 pre-existing failing tests, 781 passing
- `quality-layout.test.tsx` legacy-migration test MUST pass unchanged (SHELL-01 acceptance)

</code_context>

<specifics>
## Specific Ideas

- **`ConnectionGatedOutlet` must NOT move `MedplumProvider`** — REQUIREMENTS.md is explicit. The primitive shares only the "Not connected" alert, NOT the MedplumProvider wrapping. `MedplumProvider` stays at the AppLayout root.
- **`quality-layout.test.tsx` legacy-migration test** — SHELL-01 acceptance is "existing `quality-layout.test.tsx` legacy-migration test passes unchanged". Do NOT modify this test. If it breaks after SHELL-01 migration, adjust the ConnectionGatedOutlet API, not the test.
- **Wildcard semantics parity** — `SearchResultsPage.tsx:165` and `PatientListPage.tsx:107` may build the query slightly differently. The helper must adopt the more-inclusive variant (or union) to preserve search behavior for both call sites.

</specifics>

<deferred>
## Deferred Ideas

- **MedplumProvider consolidation** — NOT in scope. REQUIREMENTS.md SHELL-01 is explicit that the gate does NOT own the provider.
- **Search helper genericization (any resource type with identifier)** — keep the helper specific to what the two call sites need; over-generalization is Phase 27+ territory if ever.
- **Sidebar responsive collapse / mobile drawer** — not scoped in SHELL-03; remains as-is.
- **Mantine theme extension for link color** — if the theme doesn't have a canonical link color that matches `var(--mantine-color-blue-6)`, the SHELL-04 fix uses `c="blue"` explicitly rather than extending the theme (out of scope).

### Reviewed Todos (not folded)

None — no pending todos triggered a match against Phase 26 scope.

</deferred>

---

*Phase: 26-app-shell-dedup*
*Context gathered: 2026-04-22 via --auto (recommended defaults locked; user can edit this file before running `/gsd-plan-phase 26`)*
