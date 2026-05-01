---
phase: 48-theme-c-reverse-references-incoming-references-panel
plan: 04
subsystem: ui
tags: [react, vitest, rtl, fhir, reverse-references, gap-closure, REVR-02, REVR-03, WR-01]

# Dependency graph
requires:
  - phase: 48-02
    provides: RelatedResourcesPanel shared render (the file being patched)
  - phase: 48-03
    provides: PatientRelatedResources delegation + byte-identical snapshot baseline (the regression guard this plan must not perturb)
provides:
  - WR-01 gap closed in RelatedResourcesPanel — composite-key state Record + JSX `key` props
  - 7th vitest case in RelatedResourcesPanel.test.tsx (`duplicate-target-type entries: both render distinct cards (WR-01 regression)`)
  - Phase-48 verifier path to flip from `gaps_found` to `passed` on re-verification (5/5 must-haves)
affects: [48 (verification re-run), 49 (graph view consumes the same panel idiom; correctness fix benefits any future caller adding multi-param-same-target catalog entries)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composite-key state pattern for Record<string, T> when input array has multi-property identity (target.type + searchParam pair) — `${e.type}:${e.param}` template literal as key extractor at every map read/write site"
    - "WR-01 regression test pattern: console.error spy + grep-discoverable test name (literal 'WR-01 regression') so verifier can trace gap-closure"

key-files:
  created: []
  modified:
    - src/components/explorer/RelatedResourcesPanel.tsx
    - src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx

key-decisions:
  - "Composite key `${e.type}:${e.param}` chosen over alternatives (param-only, hash, index) — matches 48-REVIEW.md WR-01 fix sketch verbatim; preserves ResourceType in the key for debuggability when reading state in dev tools"
  - "Visible card labels at lines 75 + 91 keep `e.type` (not the composite) — the user sees the FHIR type name, not the internal map key"
  - "All 8 collision sites updated atomically in a single edit pass (state seed, fetch resolve, fetch reject, populated filter (2 reads), 2 JSX key props, badge value read) to prevent partial-fix races"
  - "RED commit precedes GREEN commit per TDD plan discipline — RED commit captures the failing test as proof-of-bug, GREEN commit captures the fix; verifier can re-execute the RED commit's failure to confirm the bug existed before the fix"
  - "Patient snapshot byte-identity gate enforced via md5 + git diff --stat (zero insertions / zero deletions) — Patient catalog has unique target type per entry, so the entryKey transform is a pure no-op for Patient DOM output"

patterns-established:
  - "Pattern: Gap-closure plans append a single regression test (test name literal includes the gap ID — here 'WR-01 regression' — so verifier can grep-trace the gap-closure)"
  - "Pattern: Pre/post snapshot md5 capture + zero-line git diff --stat as the byte-identity invariant for refactor-style fixes"
  - "Pattern: Composite-key helper at module scope kept short (one-line const arrow) so it doesn't crowd the component-level JSDoc; placed between props interface and component JSDoc"

requirements-completed: [REVR-02, REVR-03]

# Metrics
duration: 5min
completed: 2026-05-01
---

# Phase 48 Plan 04: Gap Closure for WR-01 — RelatedResourcesPanel State-Key Collision Summary

**Closes the WR-01 state-key collision gap from 48-VERIFICATION.md by routing the `counts` Record through a composite `${e.type}:${e.param}` key at all 8 internal lookup sites; adds 1 regression test; Patient detail snapshot byte-identical (md5 preserved); 25/25 phase-48 tests green.**

Source-code link: 48-VERIFICATION.md `gaps[0].missing` items 1-5 are the verbatim acceptance scenario this plan implements. WR-01's diagnosis lives in 48-REVIEW.md; the fix sketch in that file is the exact pattern adopted here.

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-01T20:28:29Z
- **Completed:** 2026-05-01T20:33:32Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files created:** 0
- **Files modified:** 2 (matches `files_modified` frontmatter exactly)
- **Lines changed:** test file +49 lines (219 → 268); source file +9 lines (102 → 111, helper + JSDoc)

## Accomplishments

- **WR-01 closed.** All 8 collision sites in `RelatedResourcesPanel.tsx` now route through a composite-key helper `entryKey(e) = `${e.type}:${e.param}``: state seed (line 45), fetch resolve (55), fetch reject (59), populated filter (67 — 2 occurrences), skeleton-card React `key` (82), populated-card React `key` (91), badge value read (103). 8 occurrences in source per `grep -o "entryKey(e)"`.
- **WR-01 regression test added.** `it('duplicate-target-type entries: both render distinct cards (WR-01 regression)')` feeds `[{type:'Observation', param:'has-member'}, {type:'Observation', param:'derived-from'}]`, mocks `client.get` to resolve `{total:5}` for has-member URL and `{total:8}` for derived-from URL, and asserts: 2 `Observation` cards rendered (`screen.getAllByText('Observation').length === 2`), badges contain BOTH `5` and `8`, both URL variants dispatched (`mockGet.mock.calls` count = 2), 2 distinct `[class*=mantine-Card-root]` DOM nodes, and `console.error` was NOT called with any message matching `/Encountered two children with the same key/`.
- **Patient snapshot byte-identical.** `__snapshots__/PatientRelatedResources.test.tsx.snap` md5 preserved (`91c2ccab3963eba4ecca6c759f17d77f` before and after) — `git diff --stat` reports zero insertions and zero deletions on the snapshot file. REVR-03 byte-identical invariant proven.
- **Visible behavior unchanged.** Card labels still render `e.type` (NOT the composite), click navigation still calls `onCardNavigate(e)` with the entry, all UI-SPEC visual locks preserved (Title order=5 mb=sm, SimpleGrid cols={base:2,sm:3,md:4}, Badge size=sm variant=light color=blue, _summary=count&_count=0 query pattern, empty guard, cancellation idiom, silent-drop / no console logging).

## Task Commits

Each task was committed atomically (TDD: RED then GREEN; both with `--no-verify` per parallel-executor protocol):

1. **Task 1 RED — failing test for WR-01 collision:** `453bd2b` (test) — added `it('duplicate-target-type entries: both render distinct cards (WR-01 regression)')` + module-scoped `COLLIDING_ENTRIES` const. Test fails as designed: both rendered cards show count `8` because derived-from's resolution overwrites has-member's slot (last-write-wins). Captured failure output in commit message body.
2. **Task 2 GREEN — composite-key fix:** `090c38d` (fix) — inserted `entryKey(e)` helper + JSDoc; replaced 8 internal `[e.type]` lookups with `[entryKey(e)]`; preserved 2 visible `>{e.type}<` Text labels; preserved Mantine UI-SPEC props verbatim. WR-01 test flips RED → GREEN; 7/7 file tests pass; full Phase 48 suite 25/25.

_Per plan instructions, no STATE/ROADMAP edits in this plan — orchestrator owns those after the wave completes._

## Files Created/Modified

### Created

None.

### Modified

- `src/components/explorer/RelatedResourcesPanel.tsx` — 102 → 111 lines. New module-scoped `entryKey(e: ReverseReferenceEntry) => `${e.type}:${e.param}`` helper with JSDoc placed between `RelatedResourcesPanelProps` and the component-level JSDoc. 8 internal lookup sites updated to route through `entryKey(e)`. Visible labels and all UI-SPEC visual locks preserved.
- `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` — 219 → 268 lines. New module-scoped `COLLIDING_ENTRIES` const (3 lines) appended after `ONE_ENTRY` (line 86–89). New 7th `it()` block appended before the closing `});` of `describe('RelatedResourcesPanel', ...)` — test name literal `'duplicate-target-type entries: both render distinct cards (WR-01 regression)'`. The 6 pre-existing `it()` blocks were not touched.

## Decisions Made

- **Composite key `${e.type}:${e.param}`** chosen over param-only / hash / index alternatives — preserves ResourceType in the key string for debuggability and matches 48-REVIEW.md fix sketch verbatim. Same shape used at every read/write site for consistency.
- **Visible labels keep `e.type`.** Lines 75 (skeleton label) and 91 (populated label) still render `{e.type}` so the user sees `"Observation"`, not `"Observation:has-member"`. The composite is an internal map key only.
- **All 8 sites updated atomically.** A partial fix would leave keys mismatched between writes and reads, producing nonsense card grids; updating all 8 sites in the same commit (in 8 sequential Edit calls within Task 2) prevents intermediate-state races.
- **Test name includes literal `WR-01 regression`** so the verifier can grep-trace the gap-closure step.
- **Snapshot byte-identity enforced via md5 + git diff --stat** — both checks zero-delta gate the GREEN commit. Patient catalog has unique target type per entry, so the entryKey transform is a pure no-op for Patient DOM output (validated empirically, not just assumed).

## Deviations from Plan

None - plan executed exactly as written. All 8 collision sites updated; helper placed at the documented module-scope position; visible labels preserved; snapshot byte-identical; 7/7 file tests + 25/25 phase-48 suite green; tsc + build clean; full suite 1371/1372 (1 pre-existing Phase 40 deuteranopia carry-over, expected per VALIDATION.md baseline — NOT a regression).

One environment-level operational issue worth noting (NOT a plan deviation): the Edit tool's first attempts mis-routed to the main repo's path instead of the worktree path, leaving the worktree file pristine. Diagnosed via `find` showing two file copies and `git status` in the worktree showing no diff. Reverted the main-repo accidental write with `git checkout --` and re-applied edits using the explicit worktree absolute path. No commits in the main repo; main repo working tree restored to its pre-execution state. The fix was: always pass the FULL worktree absolute path (`/Users/kohlbach/Claude/Exploder/.claude/worktrees/agent-aede5d49071dd759c/...`) to Edit, not the project-relative path that would have resolved against the main repo.

## Issues Encountered

- **Worktree path resolution (operational, not a plan deviation):** The Edit tool initially wrote to `/Users/kohlbach/Claude/Exploder/src/...` (main repo) instead of the worktree path. Discovered when `wc -l` and `git status` in the worktree showed no diff after a "successful" Edit. Resolved by reverting the main repo's accidental change (`git checkout -- <path>`) and re-issuing edits with the full worktree absolute path. Main repo working tree returned to its pre-execution state.

## User Setup Required

None — pure source + test edit; no env vars, no schemas, no deployments, no service config.

## Verification

Per the plan's `<verification>` block:

| Check | Result |
|-------|--------|
| `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` | PASS — 7/7 tests green (was 6/6 + WR-01 regression flipped RED → GREEN) |
| `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | PASS — 5/5 tests green (unchanged) |
| `npx vitest run src/components/explorer/__tests__/PatientRelatedResources.test.tsx` | PASS — 6/6 tests green incl. byte-identical snapshot |
| `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts` | PASS — 7/7 tests green (catalog unchanged) |
| Phase-48 combined run | PASS — 4 files / 25 tests green in 798ms |
| `npx tsc -b --noEmit` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (built in 600ms) |
| `npm test` (full suite) | 1371 passed / 1 failed (Phase 40 deuteranopia pair #13, pre-existing per 48-VALIDATION.md and Phase 47 verification) |
| `git diff --stat src/components/explorer/__tests__/__snapshots__/PatientRelatedResources.test.tsx.snap` | PASS — zero insertions, zero deletions; md5 preserved (`91c2ccab3963eba4ecca6c759f17d77f`) |

Acceptance grep checks (per plan task 2 acceptance_criteria):

```
grep "const entryKey\\s*=\\s*\\(e:\\s*ReverseReferenceEntry\\)\\s*=>" RelatedResourcesPanel.tsx → 1 match (helper exists)
grep -o "entryKey(e)" RelatedResourcesPanel.tsx | wc -l                                          → 8 occurrences (>= 8 required)
grep -c "\\[e\\.type\\]" RelatedResourcesPanel.tsx                                                → 0 (zero remaining)
grep -c "counts\\[e\\.type\\]" RelatedResourcesPanel.tsx                                          → 0 (zero remaining)
grep -c "key={entryKey(e)}" RelatedResourcesPanel.tsx                                             → 2 (skeleton + populated)
grep -c "key={e.type}" RelatedResourcesPanel.tsx                                                  → 0 (no e.type-only keys)
grep -c ">{e.type}<" RelatedResourcesPanel.tsx                                                    → 2 (visible labels preserved)
grep -c "Title order={5} mb=\"sm\"" RelatedResourcesPanel.tsx                                     → 1 (typography lock)
grep -c "cols={{ base: 2, sm: 3, md: 4 }}" RelatedResourcesPanel.tsx                              → 1 (grid lock)
grep -c "Badge size=\"sm\" variant=\"light\" color=\"blue\"" RelatedResourcesPanel.tsx            → 1 (color lock)
grep -c "_summary=count&_count=0" RelatedResourcesPanel.tsx                                       → 1 (D-15 query pattern)
grep -c "if (!loading && populated.length === 0) return null" RelatedResourcesPanel.tsx           → 1 (D-12 empty guard)
grep -c "let cancelled = false" RelatedResourcesPanel.tsx                                         → 1 (cancellation idiom)
grep -cE "console\\.(error|warn)" RelatedResourcesPanel.tsx                                       → 0 (D-11 silent-drop)
grep -c "WR-01 regression" RelatedResourcesPanel.test.tsx                                         → 1 (test-name literal)
grep -c "COLLIDING_ENTRIES" RelatedResourcesPanel.test.tsx                                        → 2 (declaration + usage)
grep -c "type: 'Observation', param: 'has-member'" RelatedResourcesPanel.test.tsx                 → 1
grep -c "type: 'Observation', param: 'derived-from'" RelatedResourcesPanel.test.tsx               → 1
grep -c "Encountered two children with the same key" RelatedResourcesPanel.test.tsx               → 1 (negative assertion)
```

All 19 grep gates PASS.

## Next Phase Readiness

- **Phase 48 verifier re-run unblocked.** WR-01 closed; the verifier should report `status: passed`, `score: 5/5 must-haves verified`, `gaps: []`. Truth #5 ("Tests cover REVR-01 / REVR-02 / REVR-03; full suite passes; build clean") now satisfied — the WR-01 edge-case is covered by the new regression test.
- **No blockers.** All Phase-48 plans (48-01 catalog, 48-02 panel + IncomingReferencesPanel, 48-03 PatientRelatedResources delegation + mount unification, 48-04 gap closure) complete.
- **Phase 49 (graph view) inherits a stronger foundation.** When Phase 49 consumes the catalog for incoming-edge discovery, the composite-key correctness fix protects any future caller that adds multi-param-same-target entries (e.g. if Practitioner ever gains a second SearchParameter pointing at Encounter).

## Self-Check: PASSED

- [x] `src/components/explorer/RelatedResourcesPanel.tsx` modified (worktree FOUND, 111 LOC, helper + 8 collision-site fixes)
- [x] `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` modified (worktree FOUND, 268 LOC, 7 it() blocks, WR-01 regression present)
- [x] Commit `453bd2b` exists (FOUND — test RED)
- [x] Commit `090c38d` exists (FOUND — fix GREEN)
- [x] Snapshot byte-identical (md5 `91c2ccab3963eba4ecca6c759f17d77f` preserved; `git diff --stat` zero insertions / zero deletions on snap file)
- [x] No edits to out-of-scope files (catalog, wrappers, ResourceDetailPage, snapshot file all untouched; verified via `git log --name-only` showing only the 2 in-scope files)
- [x] Phase-48 4-file suite 25/25 green
- [x] `npx tsc -b --noEmit` exit 0
- [x] `npm run build` exit 0
- [x] `npm test` 1371 passed / 1 pre-existing Phase 40 deuteranopia fail (baseline preserved; +1 over baseline 1370 from the new WR-01 regression test)

---
*Phase: 48-theme-c-reverse-references-incoming-references-panel*
*Plan: 04 (gap closure for WR-01)*
*Completed: 2026-05-01*
