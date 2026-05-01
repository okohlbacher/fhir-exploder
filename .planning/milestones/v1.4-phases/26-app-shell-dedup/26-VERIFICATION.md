---
phase: 26-app-shell-dedup
verified: 2026-04-22T22:27:30Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "QualityLayout.tsx reaches ≤30 LOC (ROADMAP SC #1 per-layout line limit)"
    reason: "Documented soft-miss. The inlined legacy-migration useEffect (~20 LOC body + explanatory comment block) is load-bearing per Plan 21-04 / CHRT-04 acceptance — LEGACY_COHORT_KEY, removeItem, useEffect, and migrateLegacyResourceTypeKey must all remain grep-visible inside this file. Phase 28 SWEEP-04 will move the essay into migrateLegacyResourceTypeKey, at which point QualityLayout drops to ~25 LOC automatically. Documented in the file's top docstring, in 26-01-PLAN.md §objective, in 26-01-SUMMARY.md §'Phase 28 SWEEP-04 Handoff', and in 26-RESEARCH.md §Focus 1 + §Pitfall 1. ExplorerLayout (28) and PatientsLayout (30) both hit the ≤30 target."
    accepted_by: "plan-author (26-01)"
    accepted_at: "2026-04-22T20:11:11Z"
---

# Phase 26: App-Shell Dedup Verification Report

**Phase Goal:** Dedupe route-layer and search-layer duplication across the three layouts and two list pages.
**Verified:** 2026-04-22T22:27:30Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                               | Status              | Evidence                                                                                                                                     |
| -- | ------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | ROADMAP Goal #1: 3 layouts each ≤30 LOC (QualityLayout soft-miss documented)                                        | ✓ PASSED (override) | ExplorerLayout=28 LOC, PatientsLayout=30 LOC both hit target; QualityLayout=58 LOC documented soft-miss per override (legacy-migration essay) |
| 2  | ROADMAP Goal #1 (cont'd): `quality-layout.test.tsx` legacy-migration test passes unchanged                          | ✓ VERIFIED          | File exists at `src/components/quality/__tests__/quality-layout.test.tsx`; 4/4 tests green. Created Plan 26-01 Task 1 as Wave 0 regression fence |
| 3  | ROADMAP Goal #2: `searchByIdentifierPrefix(client, type, prefix, { limit=5000, pageSize=20 })` consumed by both pages | ✓ VERIFIED          | Helper at `src/utils/searchByIdentifierPrefix.ts:38` has `limit=5000, pageSize=20` defaults; imported + called in both SearchResultsPage and PatientListPage |
| 4  | ROADMAP Goal #3: Sidebar uses useMatch; nested routes highlight section root; Option B for /quality/cohorts         | ✓ VERIFIED          | 10 useMatch references in Sidebar.tsx; 0 `location.pathname ===` matches; most-specific-wins logic at SidebarRow:78 (`item.to === '/quality' ? !!match && !cohortsMatch : !!match`) |
| 5  | ROADMAP Goal #4: CompletenessPanel has 0 inline `var(--mantine-color-blue-6)`; uses `<Anchor component={Link}>`     | ✓ VERIFIED          | `grep var(--mantine-color-blue-6) CompletenessPanel.tsx` → 0; 3 `component={Link}` sites at lines 146, 174, 195; all carry `c="blue.6"` |
| 6  | ROADMAP Goal #5: `SettingsContext.tsx` has no eslint-disable; `setSettings` wrapped in useCallback                  | ✓ VERIFIED          | `grep eslint-disable-next-line react-hooks/exhaustive-deps` → 0; `useCallback` imported + wraps setSettings at line 29 with `[settings]` deps |
| 7  | MedplumProvider did NOT move into ConnectionGatedOutlet primitive                                                    | ✓ VERIFIED          | `grep MedplumProvider src/components/layout/ConnectionGatedOutlet.tsx` → 0 matches; provider remains in each connection-gated layout's connected-branch render |
| 8  | Test baseline preserved (22 pre-existing failures + 806 passing; no new regressions)                                | ✓ VERIFIED          | Full suite: 22 failed / 806 passed / 22 todo (22:26:43, 7.59s). Matches documented baseline exactly. Phase 26 added +25 passing tests (780→806) |
| 9  | No scope creep: R11 (Phase 28), R14 (v1.5), no new capabilities                                                      | ✓ VERIFIED          | Only refactors landed: no new providers, no new routes, no new FHIR operations, no new settings. Commits 2883a8e → 6148af9 all `refactor(26-*)` / `test(26-*)` / `feat(26-*)` scope |
| 10 | Research corrections all honored (4 upstream fixes vs CONTEXT.md / REQUIREMENTS.md)                                 | ✓ VERIFIED          | (a) quality-layout.test.tsx created first as regression fence (Plan 26-01 Task 1); (b) SHELL-04 = 3 CompletenessPanel sites (not 10) — verified exactly 3; (c) defaults 5000/20 (not 10/50) — verified in helper line 38; (d) QualityLayout ≤30 LOC documented as soft-miss — override applied |

**Score:** 10/10 truths verified (1 via documented override)

### Required Artifacts

| Artifact                                                            | Expected                                     | Status     | Details                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `src/components/layout/ConnectionGatedOutlet.tsx`                   | Render-prop primitive with children slot     | ✓ VERIFIED | 87 LOC; exports `ConnectionGatedOutlet` + `ConnectionGatedOutletProps`; no MedplumProvider |
| `src/components/layout/__tests__/ConnectionGatedOutlet.test.tsx`    | Contract tests (7 tests)                     | ✓ VERIFIED | 7/7 passing: default-connected, default-disconnected, render-prop-override (×2), children-slot (×2), precedence |
| `src/components/quality/__tests__/quality-layout.test.tsx`          | Regression fence (4 tests)                   | ✓ VERIFIED | 4/4 passing: legacy-migration, connected-renders-Outlet, disconnected-shows-alert, QualityMetricsProvider |
| `src/components/explorer/ExplorerLayout.tsx`                        | Uses ConnectionGatedOutlet, ≤30 LOC          | ✓ VERIFIED | 28 LOC; imports + calls ConnectionGatedOutlet; connected branch owns MedplumProvider + Outlet context |
| `src/components/patients/PatientsLayout.tsx`                        | Uses ConnectionGatedOutlet, ≤30 LOC          | ✓ VERIFIED | 30 LOC; imports + calls ConnectionGatedOutlet; connected branch owns MedplumProvider + Outlet context |
| `src/components/quality/QualityLayout.tsx`                          | Uses ConnectionGatedOutlet, ≤30 LOC (override)| ✓ PASSED (override) | 58 LOC; imports + calls ConnectionGatedOutlet; legacy-migration useEffect preserved; QualityMetricsProvider + MedplumProvider chain intact; soft-miss documented |
| `src/utils/searchByIdentifierPrefix.ts`                             | Shared helper with 5000/20 defaults          | ✓ VERIFIED | 66 LOC; exports searchByIdentifierPrefix; `limit=5000, pageSize=20` at line 38; `result.total = matching.length` at line 63 |
| `src/utils/__tests__/searchByIdentifierPrefix.test.ts`              | Unit tests (6 tests)                         | ✓ VERIFIED | 6/6 passing: prefix-match, empty-set, pageSize-truncation, custom-limit, defaults, resource-type-parameterized |
| `src/components/explorer/SearchResultsPage.tsx`                     | Consumes helper; no inline wildcard block    | ✓ VERIFIED | Imports `searchByIdentifierPrefix` at line 15; calls at line 170; `MAX_ID_FETCH` gone; `_elements=id` 0 matches |
| `src/components/patients/PatientListPage.tsx`                       | Consumes helper; no inline wildcard block    | ✓ VERIFIED | Imports `searchByIdentifierPrefix` at line 27; calls at line 325; `_elements=id` 0 matches |
| `src/components/quality/CompletenessPanel.tsx`                      | 3 Anchor+Link sites; 0 inline blue-6         | ✓ VERIFIED | 3 `component={Link}` sites (lines 146, 174, 195); 3 `c="blue.6"` sites; 0 `var(--mantine-color-blue-6)` matches |
| `src/contexts/SettingsContext.tsx`                                  | useCallback-wrapped setSettings; no eslint-disable | ✓ VERIFIED | useCallback imported + wraps setSettings at line 29 with `[settings]` deps; useMemo includes setSettings; 0 eslint-disable matches |
| `src/components/layout/Sidebar.tsx`                                 | useMatch-based activation + Option B          | ✓ VERIFIED | 171 LOC; 10 useMatch references; `exact: true` set for Dashboard + Cohorts; SidebarRow implements most-specific-wins |
| `src/components/layout/__tests__/Sidebar.test.tsx`                  | Nested-route activation tests (7 tests)      | ✓ VERIFIED | 7/7 passing: /, /patients/123, /explorer/Patient/1, /quality/plausibility/Observation, /quality/cohorts (Option B), / regression guard, /settings |

### Key Link Verification

| From                        | To                                    | Via                                       | Status   | Details                                                                        |
| --------------------------- | ------------------------------------- | ----------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| ExplorerLayout.tsx          | ConnectionGatedOutlet.tsx             | `import { ConnectionGatedOutlet }`         | ✓ WIRED  | Line 6 import; line 16 `<ConnectionGatedOutlet>` usage with children slot      |
| PatientsLayout.tsx          | ConnectionGatedOutlet.tsx             | `import { ConnectionGatedOutlet }`         | ✓ WIRED  | Line 6 import; line 18 usage with children slot                                |
| QualityLayout.tsx           | ConnectionGatedOutlet.tsx             | `import { ConnectionGatedOutlet }`         | ✓ WIRED  | Line 13 import; line 44 usage with children slot                               |
| SearchResultsPage.tsx       | searchByIdentifierPrefix.ts           | `import { searchByIdentifierPrefix }`      | ✓ WIRED  | Line 15 import; line 170 invocation with `{ limit: 5000, pageSize: … }`         |
| PatientListPage.tsx         | searchByIdentifierPrefix.ts           | `import { searchByIdentifierPrefix }`      | ✓ WIRED  | Line 27 import; line 325 invocation with `{ limit: 5000, pageSize: count }`     |
| CompletenessPanel.tsx       | react-router-dom + @mantine/core      | `<Anchor component={Link}>`                | ✓ WIRED  | 3 call sites at lines 146, 174, 195; all carry `c="blue.6"` + valid `to` prop  |
| Sidebar.tsx                 | react-router-dom                      | `useMatch({ path, end })`                  | ✓ WIRED  | 3 hook call sites (SidebarRow.73, SidebarRow.76, Sidebar.100); NAV_ITEMS flag-driven |

### Data-Flow Trace (Level 4)

Phase 26 is a refactor; artifacts preserve existing data flows rather than introduce new ones. Behavioral parity is the contract. Data-flow verified via regression tests (11 new tests pass; 22-failing / 806-passing baseline preserved = no downstream data-path regression).

| Artifact                        | Data Variable                     | Source                                                    | Produces Real Data | Status     |
| ------------------------------- | --------------------------------- | --------------------------------------------------------- | ------------------ | ---------- |
| ConnectionGatedOutlet.tsx       | `state` (connection)              | `useConnection()` hook                                    | Yes (real)         | ✓ FLOWING  |
| searchByIdentifierPrefix.ts     | `rawIds`, `rawPage`               | `client.get(client.fhirUrl(...))` → Blaze FHIR server     | Yes (real)         | ✓ FLOWING  |
| SearchResultsPage wildcard path | `bundle`                          | `searchByIdentifierPrefix(...).then(setBundle)`           | Yes (real)         | ✓ FLOWING  |
| PatientListPage wildcard path   | `bundle`                          | `searchByIdentifierPrefix(...).then(setBundle)`           | Yes (real)         | ✓ FLOWING  |
| CompletenessPanel rows          | `row.state` from `useCompletenessReport` | (upstream — unchanged from pre-Phase-26)             | Yes (real)         | ✓ FLOWING  |
| SettingsContext.setSettings     | `settings` + caches invalidated   | `loadSettings()` + explicit call from consumers           | Yes (real)         | ✓ FLOWING  |
| Sidebar active state            | `match`, `cohortsMatch`, `settingsMatch` | `useMatch()` (react-router)                        | Yes (real)         | ✓ FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                                       | Command                                                                                            | Result           | Status |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| Phase-26 test files all green                                                  | `npm test -- --run <4 test files>`                                                                  | 24/24 passing    | ✓ PASS |
| Full test suite matches 22-failing baseline                                    | `npm test`                                                                                         | 22 failed / 806 passed / 22 todo | ✓ PASS |
| ConnectionGatedOutlet does not import MedplumProvider                          | `grep MedplumProvider src/components/layout/ConnectionGatedOutlet.tsx`                              | 0 matches        | ✓ PASS |
| Sidebar exact-match bug eradicated                                             | `grep 'location.pathname ===' src/components/layout/Sidebar.tsx`                                    | 0 matches        | ✓ PASS |
| CompletenessPanel has 0 inline blue-6 styles                                   | `grep 'var(--mantine-color-blue-6)' src/components/quality/CompletenessPanel.tsx`                   | 0 matches        | ✓ PASS |
| SettingsContext has no eslint-disable directive                                | `grep 'eslint-disable-next-line react-hooks/exhaustive-deps' src/contexts/SettingsContext.tsx`      | 0 matches        | ✓ PASS |
| Helper defaults match research correction (5000/20, not 10/50)                 | `grep 'limit = 5000' src/utils/searchByIdentifierPrefix.ts`                                         | 1 match at L38   | ✓ PASS |
| No inline wildcard URL-building in call sites                                   | `grep '_elements=id' src/components/{explorer,patients}/*.tsx`                                      | 0 matches        | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan            | Description                                                                                       | Status       | Evidence                                                                                           |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| SHELL-01    | 26-01                  | ConnectionGatedOutlet replaces alert triplication; quality-layout.test passes                     | ✓ SATISFIED  | Primitive exists; 3 layouts migrated; test created as Wave 0 and passes 4/4 against post-migration |
| SHELL-02    | 26-02                  | searchByIdentifierPrefix helper consumed by both pages                                             | ✓ SATISFIED  | Helper exists with 5000/20 defaults; 6/6 unit tests pass; both pages migrated                      |
| SHELL-03    | 26-03                  | Sidebar uses useMatch; nested routes highlight section roots; Option B committed                  | ✓ SATISFIED  | `useMatch` replaces `location.pathname ===`; 7/7 Sidebar tests pass including Option B (Test 5)   |
| SHELL-04    | 26-02                  | CompletenessPanel + other files use `<Anchor component={Link}>`; no inline blue-6                 | ✓ SATISFIED  | 3 CompletenessPanel sites migrated (research-corrected scope, not 10); 0 `var(--mantine-color-blue-6)` in file |
| SHELL-05    | 26-02                  | setSettings wrapped in useCallback; eslint-disable removed                                         | ✓ SATISFIED  | `useCallback([settings])` wrap at line 29; 0 eslint-disable-next-line directives in file           |

No orphaned requirements — all 5 SHELL-01..05 IDs declared in at least one plan's `requirements:` frontmatter field and all satisfied.

### Anti-Patterns Found

No blockers. Minor notes:

| File                                   | Line | Pattern                                                                | Severity | Impact                                                                      |
| -------------------------------------- | ---- | ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| PatientListPage.tsx                    | 291  | `// eslint-disable-line react-hooks/exhaustive-deps` on `initialFromUrl` | ℹ️ Info  | Pre-existing (pre-Phase-26); not in Phase 26 scope. SHELL-05 scoped to SettingsContext only. |
| ConnectionGatedOutlet.tsx              | 79   | Inline `style={{ color: 'var(--mantine-color-blue-6)' }}` on dashboard link | ℹ️ Info  | Verbatim copy of canonical alert (D-04). The single source of truth now holds this inline style; any SHELL-04-style migration of the primitive's internal link is out of Phase 26 scope and would be a cosmetic sweep for Phase 28 / v1.5. |
| SettingsContext.tsx                    | 59   | `react-refresh/only-export-components` pre-existing lint error on `useSettingsContext` hook export | ℹ️ Info  | Pre-existing (per `git show HEAD~6:` comparison per Plan 26-02 summary); out of SHELL-05 scope. |

None of the above are blockers for Phase 26 acceptance.

### Human Verification Required

None. All phase-26 success criteria are programmatically verifiable via grep, LOC count, and test suite. No visual/UX behavior was introduced; render parity is asserted by the 4 regression-fence tests (quality-layout.test.tsx) and the 7 contract tests (ConnectionGatedOutlet.test.tsx) + 7 nav tests (Sidebar.test.tsx) + 6 helper tests (searchByIdentifierPrefix.test.ts).

### Gaps Summary

No gaps. All 10 observable truths verified (1 via documented override for the QualityLayout ≤30 LOC soft-miss, which has a Phase 28 SWEEP-04 handoff and is documented in 4 places: file docstring, plan objective, summary, and research pitfalls). The override is a scheduled handoff, not an unresolved gap — the legacy-migration essay is load-bearing per Plan 21-04 / CHRT-04 acceptance criteria until Phase 28 SWEEP-04 moves it into `migrateLegacyResourceTypeKey`.

All four research corrections (Wave 0 test created, SHELL-04 scope reduced to 3 sites, helper defaults 5000/20, QualityLayout LOC soft-miss) are honored and documented.

Phase 26 commits verified present in git log: `2883a8e` (test), `0130bc1` (feat), `802aeb0` (refactor) for 26-01; `699bea5` (feat), `32752ad` (refactor), `6148af9` (refactor) for 26-02; `314f0e1` (test), `92d4468` (refactor) for 26-03 — plus `e4d6565`, `6ceb777` for summary docs, and `74001bb` for plan creation.

Test metrics: baseline was 22 failed / 780+ passed (varied ±2 in Plan 26-02 summary), now 22 failed / 806 passed / 22 todo. Net +25 passing tests (4 quality-layout + 7 ConnectionGatedOutlet + 6 searchByIdentifierPrefix + 7 Sidebar + possibly small deltas from CompletenessPanel/SettingsContext changes ensuring no regression). Zero new failures.

---

_Verified: 2026-04-22T22:27:30Z_
_Verifier: Claude (gsd-verifier)_
