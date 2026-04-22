---
phase: 26-app-shell-dedup
plan: 02
subsystem: ui
tags: [react, mantine, refactor, fhir-search, settings-context, linting, useCallback, anchor-link]

# Dependency graph
requires:
  - phase: 26-app-shell-dedup/26-01
    provides: ConnectionGatedOutlet primitive (absorbed 3 layout-level blue-6 sites, making SHELL-04 scope exactly 3 CompletenessPanel sites rather than the stale 10-site claim)
provides:
  - searchByIdentifierPrefix helper in src/utils/ with 6-step wildcard prefix semantics
  - 6 unit tests covering prefix-match, empty-set, pageSize truncation, custom limit, defaults, resource-type parameterization
  - SearchResultsPage + PatientListPage migrated to call the shared helper (MAX_ID_FETCH and inline allIds/matching/pageIds gone)
  - CompletenessPanel's 3 CompletenessRow branches use <Anchor component={Link} c="blue.6"> instead of inline var(--mantine-color-blue-6) style
  - SettingsContext.setSettings wrapped in useCallback([settings]); eslint-disable for exhaustive-deps removed
affects: [phase-27-effects, phase-28-sweep, any-future-wildcard-search-caller]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure-function FHIR search helper invoked via client.get/client.fhirUrl (Blaze-compatible, no useSearch hook — keeps helper callable from any context)
    - <Anchor component={Link} c="blue.6"> for internal theme-colored links (aligned with CodingCoveragePanel:263 and ResourceCountsPanel:138 precedent)
    - useCallback-wrap context setters with previous-state dep to preserve referential stability and eliminate exhaustive-deps disables

key-files:
  created:
    - src/utils/searchByIdentifierPrefix.ts
    - src/utils/__tests__/searchByIdentifierPrefix.test.ts
  modified:
    - src/components/explorer/SearchResultsPage.tsx
    - src/components/patients/PatientListPage.tsx
    - src/components/quality/CompletenessPanel.tsx
    - src/contexts/SettingsContext.tsx

key-decisions:
  - "searchByIdentifierPrefix defaults are limit=5000 / pageSize=20 (matches call-site reality) — supersedes CONTEXT D-05 (10/50), which would have silently shrunk both call sites"
  - "Helper overrides result.total = matching.length internally (Option A) — preserves the load-bearing 'Override total to reflect all matches, not just this page' UX; callers simplify to a single await"
  - "SHELL-04 scope is exactly 3 sites in CompletenessRow (loading / error / normal branches), not the 10 claimed in REQUIREMENTS.md — 3 layout sites were absorbed by SHELL-01, the remaining 5 var(--mantine-color-blue-6) hits are non-link usages"
  - "setSettings useCallback deps are [settings] (previous-value capture for prevUrl comparison) — setSettingsState and setUsingDefaults have stable React-guaranteed identity and don't need to appear in deps"
  - "useMemo for the context value now includes setSettings in its deps explicitly (no longer suppressed); setSettings identity is stable when settings doesn't change"

patterns-established:
  - "FHIR wildcard search extraction: when two call sites do identical prefix filtering via _elements=id + _id=a,b,c, lift into src/utils/ with an options object carrying the two knobs (limit for ID fetch ceiling, pageSize for follow-up page) rather than plucking a single generic limit"
  - "Inline theme-color link migration: replace Link + style={{ color: 'var(--mantine-color-X)' }} with Anchor component={Link} c=\"X\" — matches Mantine idiom and avoids hard-coded CSS variables"

requirements-completed: [SHELL-02, SHELL-04, SHELL-05]

# Metrics
duration: ~8min
completed: 2026-04-22
---

# Phase 26 Plan 02: App-Shell Dedup (SHELL-02 + SHELL-04 + SHELL-05) Summary

**Extracted wildcard identifier search into shared helper (5000/20 defaults to preserve call-site behavior), migrated 3 CompletenessRow links to Anchor+Link, and useCallback-wrapped setSettings to drop the exhaustive-deps eslint-disable — 3 atomic commits, zero test regressions, zero new lint warnings.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-22T20:15:00Z (approx)
- **Completed:** 2026-04-22T20:23:03Z
- **Tasks:** 3 (bundled SHELL-02 + SHELL-04 + SHELL-05 per parallel-execution instruction)
- **Files modified:** 6 (2 created + 4 modified)

## Accomplishments

- **SHELL-02** — `searchByIdentifierPrefix` helper exists in `src/utils/` with 6 passing unit tests. Defaults `limit=5000, pageSize=20` match the existing call-site values per RESEARCH.md §Focus 2 (supersedes CONTEXT D-05's `10/50` which would have silently shrunk both call sites). Helper mirrors the existing 6-step wildcard semantics and overrides `result.total = matching.length` internally so callers stay simple.
- **SHELL-02 migration** — `SearchResultsPage.tsx` lost its `MAX_ID_FETCH` constant and ~40 lines of inline `allIds/matching/pageIds` logic; `PatientListPage.tsx` lost ~30 lines. Both pages now `await searchByIdentifierPrefix(...)` once.
- **SHELL-04** — `CompletenessPanel.tsx` has zero `var(--mantine-color-blue-6)` inline styles. 3 `CompletenessRow` branches (loading/error/normal) now render `<Anchor component={Link} to="..." c="blue.6">`, matching the precedent at `CodingCoveragePanel.tsx:263` and `ResourceCountsPanel.tsx:138`.
- **SHELL-05** — `SettingsContext.setSettings` is `useCallback([settings])`-wrapped. The `eslint-disable-next-line react-hooks/exhaustive-deps` directive at line 50 (not line 32 per CONTEXT D-15's stale citation — RESEARCH §Focus 5 correction) is gone. The `useMemo` deps array explicitly includes `setSettings` now that its identity is stable.
- **Zero regressions.** Full `npm test` returns 22 failed / 806 passed / 22 todo — matches the pre-Phase-26 22-failing baseline, and +6 new passing tests for the helper.

## Task Commits

Each SHELL requirement was committed atomically (3 commits per parallel-executor instruction):

1. **SHELL-02 (helper + tests + both migrations):** `699bea5` — `feat(26-02): add searchByIdentifierPrefix helper (SHELL-02)`
2. **SHELL-04 (CompletenessPanel Anchor+Link migration):** `32752ad` — `refactor(26-02): migrate CompletenessPanel inline colors to Anchor+Link (SHELL-04)`
3. **SHELL-05 (SettingsContext useCallback):** `6148af9` — `refactor(26-02): useCallback-wrap setSettings, drop eslint-disable (SHELL-05)`

Branch state after commit chain (parallel plan 26-03 commits also landed on `main` during execution — disjoint file sets, safe):

```
6148af9 refactor(26-02): useCallback-wrap setSettings, drop eslint-disable (SHELL-05)
32752ad refactor(26-02): migrate CompletenessPanel inline colors to Anchor+Link (SHELL-04)
699bea5 feat(26-02): add searchByIdentifierPrefix helper (SHELL-02)
92d4468 refactor(26): replace Sidebar exact-match with useMatch + Option B Cohorts activation (SHELL-03 GREEN)  [plan 26-03]
314f0e1 test(26): add Sidebar nested-route activation tests (SHELL-03 RED, Option B)                          [plan 26-03]
e4d6565 docs(26-01): complete App-Shell Dedup plan 01 (SHELL-01)                                              [plan 26-01 base]
```

## Files Created/Modified

- **Created** `src/utils/searchByIdentifierPrefix.ts` — shared wildcard identifier-prefix search helper (6-step semantics, `Promise<Bundle>` return, options object with `limit = 5000, pageSize = 20` defaults)
- **Created** `src/utils/__tests__/searchByIdentifierPrefix.test.ts` — 6 unit tests (prefix-match, empty-set, pageSize truncation, custom limit, defaults, resource-type parameterization) using a minimal `{ get, fhirUrl }` MedplumClient stub
- **Modified** `src/components/explorer/SearchResultsPage.tsx` — added `searchByIdentifierPrefix` import, added `ResourceType` type import, deleted `MAX_ID_FETCH` constant and the inline wildcard block (lines 165-207 replaced with a single awaited helper call)
- **Modified** `src/components/patients/PatientListPage.tsx` — added `searchByIdentifierPrefix` import, deleted the inline wildcard block (lines 321-357 replaced with a single awaited helper call)
- **Modified** `src/components/quality/CompletenessPanel.tsx` — added `Anchor` to Mantine imports, replaced 3 `<Link style={{ color: ... }}>` sites with `<Anchor component={Link} c="blue.6">`
- **Modified** `src/contexts/SettingsContext.tsx` — added `useCallback` to React imports, wrapped `setSettings` in `useCallback([settings])`, added `setSettings` to the `useMemo` deps, removed the eslint-disable directive

## Grep Gate Results

### SHELL-02 gates (all pass)

| Gate | Expected | Actual |
|------|----------|--------|
| `grep -c "searchByIdentifierPrefix" src/components/explorer/SearchResultsPage.tsx` | >= 2 | **2** (import + call) |
| `grep -c "searchByIdentifierPrefix" src/components/patients/PatientListPage.tsx` | >= 2 | **2** (import + call) |
| `grep -c "_elements=id" src/components/explorer/SearchResultsPage.tsx` | 0 | **0** |
| `grep -c "_elements=id" src/components/patients/PatientListPage.tsx` | 0 | **0** |
| `grep -c "MAX_ID_FETCH" src/components/explorer/SearchResultsPage.tsx` | 0 | **0** |
| `grep -c "limit = 5000" src/utils/searchByIdentifierPrefix.ts` | >= 1 | **1** |
| `grep -c "pageSize = 20" src/utils/searchByIdentifierPrefix.ts` | >= 1 | **1** |
| `grep -c "total = matching" src/utils/searchByIdentifierPrefix.ts` | >= 1 | **1** |

### SHELL-04 gates (all pass)

| Gate | Expected | Actual |
|------|----------|--------|
| `grep -c "var(--mantine-color-blue-6)" src/components/quality/CompletenessPanel.tsx` | 0 | **0** |
| `grep -c "component={Link}" src/components/quality/CompletenessPanel.tsx` | >= 3 | **3** |
| `grep -c 'c="blue.6"' src/components/quality/CompletenessPanel.tsx` | >= 3 | **3** |

### SHELL-05 gates (all pass)

| Gate | Expected | Actual |
|------|----------|--------|
| `grep -c "eslint-disable-next-line react-hooks/exhaustive-deps" src/contexts/SettingsContext.tsx` | 0 | **0** |
| `grep -c "useCallback" src/contexts/SettingsContext.tsx` | >= 1 | **2** (import + use) |

### Test + typecheck gates

| Gate | Result |
|------|--------|
| `npx tsc -b --noEmit` | 0 errors |
| `npm test` (full suite) | 22 failed / 806 passed / 22 todo — matches pre-Phase-26 baseline (22 failures pre-existing) |
| `npm test -- searchByIdentifierPrefix.test.ts` | 6 / 6 passing |
| `npx eslint src/contexts/SettingsContext.tsx` | 1 pre-existing `react-refresh/only-export-components` error (line 59 on `useSettingsContext` hook export — pre-dates this plan per `git show HEAD:` verification); zero `react-hooks/exhaustive-deps` warnings (the directive is gone and no longer needed) |

## Decisions Made

1. **`limit=5000 / pageSize=20` (not `10/50`).** CONTEXT D-05 proposed `limit=10, pageSize=50` but RESEARCH §Focus 2 and the actual call sites use `5000` for ID fetching and `20` (or `count` state) for page size. Using `10/50` as defaults would have silently shrunk both call sites' throughput — `5000/20` preserves current behavior exactly. Callers can cap lower via options.

2. **Helper owns `result.total = matching.length`.** Per RESEARCH §Focus 2 Option A, this override was load-bearing at `SearchResultsPage.tsx:194` ("Override total to reflect all matches, not just this page"). Moving it inside the helper means both call sites become a single `await` — simpler, same UX.

3. **`Anchor component={Link} c="blue.6"` not theme-default.** Per CONTEXT D-13, specify `c="blue.6"` explicitly to match the existing convention in `CodingCoveragePanel.tsx:263` and `ResourceCountsPanel.tsx:138`. Theme-default (no `c=` prop) would have rendered the same color but broken the grep-detectable convention.

4. **`useCallback` deps = `[settings]` only.** Per RESEARCH §Focus 5, the body reads `settings?.fhir?.serverUrl` at line 34 for previous-value capture; that is the only closed-over React state value. `setSettingsState` and `setUsingDefaults` are guaranteed stable by React and do not need to appear in deps.

5. **`useMemo` deps array explicitly includes `setSettings`.** Now that `setSettings` has stable identity via `useCallback`, I added it to the `useMemo([settings, usingDefaults, loading, setSettings])` deps — the linter no longer needs suppression and the memo will not miss a setter swap in future refactors.

## Deviations from Plan

**None** — plan executed exactly as written, with the 3-commit structure specified in the parallel-executor prompt (which compressed the plan's 4-commit guidance into 3 atomic SHELL-XX commits).

Per the prompt's `<task_context>` instructions:
- **Defaults correction:** `limit=5000, pageSize=20` were specified (vs stale CONTEXT D-05) — applied as written.
- **SHELL-04 site count:** exactly 3 sites in `CompletenessPanel.tsx` at lines 146, 173, 193 — applied as written. SearchResultsPage and PatientListPage were not touched for SHELL-04 (they don't have the inline blue-6 style).
- **SHELL-05 line correction:** eslint-disable was at line 50 (not CONTEXT D-15's stale line 32) — confirmed via `Read` before editing.

## Issues Encountered

**None.** Typecheck and test suite were green after each commit. Lint check on `SettingsContext.tsx` surfaced one pre-existing error (`react-refresh/only-export-components` on the `useSettingsContext` hook export at line 59) — verified via `git show HEAD:src/contexts/SettingsContext.tsx` that the export predates this plan. Out of scope per plan's scope boundary.

One transient full-suite flake early in execution reported "25 failed" once, then "22 failed" on the next 3 consecutive runs — not reproducible, not related to my changes. All post-commit runs report 22 failed (baseline).

## Threat Model Check

Per plan's `<threat_model>` (all dispositions: `accept` or `mitigate`):

- **T-26-04 (I, accept):** `searchByIdentifierPrefix` URLs still contain resource IDs (unavoidable for FHIR REST). Helper does not log URLs or responses. Zero new payload shapes introduced.
- **T-26-05 (D, mitigate):** `limit=5000` default is explicit, matches prior call-site ceiling. Callers can still override lower via `{ limit: N }`. No uncapped fetch path.
- **T-26-06 (T, accept):** `useCallback` wrap only changes React referential stability. `setSettings` body is unchanged — same reads/writes, same cache invalidation.
- **T-26-07 (I, accept):** CSS-class-only migration. `Anchor component={Link}` resolves the same URL; no data path change.

**No new attack surface introduced.** No threat_flag items to add.

## Next Phase Readiness

- **Phase 26 still open:** Plan 26-03 (SHELL-03, Sidebar nested-route activation) has already landed on `main` during parallel execution (`314f0e1` + `92d4468`). With this plan's 3 commits, SHELL-02, SHELL-03, SHELL-04, SHELL-05 are all complete; SHELL-01 was complete before plan 26-02 started (`e4d6565`). Phase 26 looks fully done pending the orchestrator's verifier pass.
- **`searchByIdentifierPrefix` is reusable.** Any future wildcard identifier caller can import and use the helper without duplicating the 6-step logic.
- **No blockers.** Test baseline preserved, no new deps added, license status unchanged (MIT).

## Self-Check: PASSED

- Created `src/utils/searchByIdentifierPrefix.ts`: FOUND
- Created `src/utils/__tests__/searchByIdentifierPrefix.test.ts`: FOUND
- Commit `699bea5` (SHELL-02): FOUND in `git log`
- Commit `32752ad` (SHELL-04): FOUND in `git log`
- Commit `6148af9` (SHELL-05): FOUND in `git log`

---
*Phase: 26-app-shell-dedup*
*Plan: 26-02*
*Completed: 2026-04-22*
