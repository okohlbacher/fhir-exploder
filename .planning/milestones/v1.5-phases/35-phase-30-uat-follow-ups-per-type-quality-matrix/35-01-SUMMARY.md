---
phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix
plan: 01
subsystem: ui
tags: [react, mantine, tabs, ui-cleanup, tdd, vitest, fhir-explorer]

requires:
  - phase: 30-layout-redesign
    provides: ResourceDetailPage 3-tab structure (Human-readable | Clinical+Raw | Developer)
  - phase: 02 (foundational)
    provides: Reference click delegation wrapper + isValidFhirReference guard

provides:
  - 2-tab ResourceDetailPage (Human-readable + JSON) with deleted Clinical+Raw mode
  - ClinicalRawView.tsx fully removed from src/ (grep returns 0 hits)
  - Renamed Developer tab → JSON (label-only; value attribute "developer" preserved)
  - Remapped keyboard shortcut "2" from clinical-raw → JSON; "3" is dead key
  - Preserved click-delegation wrapper + handleReferenceClick for remaining 2 panels
  - 5 new RED→GREEN tests codifying tabs cleanup contract (UAT-FU-03)

affects:
  - Plan 35-02 (UAT-FU-01 SearchResultsPage extractor) — independent files but same review surface
  - Plan 35-03 (UAT-FU-02 HumanReadableView extension cleanup) — touches same explorer subdir
  - Phase 35 ROADMAP success criterion #3 (`grep -rn "ClinicalRawView" src/` returns 0)

tech-stack:
  added: []
  patterns:
    - TDD baseline-drift commit pattern (RED tests in commit #1, GREEN production change in commit #2)
    - Code-deletion via `git rm` + grep verification gate (`grep ... && exit 1` else continue)

key-files:
  created: []
  modified:
    - src/components/explorer/ResourceDetailPage.tsx
    - src/__tests__/resource-detail.test.tsx
    - src/__tests__/display-modes.test.tsx
    - src/__tests__/reference-navigation.test.tsx
  deleted:
    - src/components/explorer/ClinicalRawView.tsx

key-decisions:
  - "Preserved <Tabs.Tab value=\"developer\"> attribute despite label rename to JSON — keeps query-string contracts intact (?tab=developer remains valid deep-link)"
  - "Remapped keyboard '2' → developer (not '3' → developer) — matches visible-tab order: '1' = first tab, '2' = second tab"
  - "Removed case '3' branch entirely (deletion over keep-as-no-op) — clean switch statement, no dead code"
  - "D-13 localStorage migration confirmed NO-OP — ResourceDetailPage uses plain useState('human-readable'), no useLocalStorage; RESEARCH P-10 verified"
  - "Preserved `<div onClick={handleReferenceClick}>` wrapper untouched — click delegation continues for remaining 2 panels per RESEARCH P-12 + threat T-35-01-01 mitigation"

patterns-established:
  - "Atomic-delete pattern: `git rm` source file + grep-clean test in single commit"
  - "Tabs.Tab label rename ≠ Tabs.Tab value rename — labels are user-facing, values are URL/state contracts"
  - "Mantine Tabs role='tab' + aria-selected='true|false' is the correct test query for active-tab assertions (not visual highlighting)"

requirements-completed: [UAT-FU-03]

duration: 4min
completed: 2026-04-25
---

# Phase 35 Plan 01: UAT-FU-03 ResourceDetailPage Mode Cleanup Summary

**Reduced ResourceDetailPage tabs from 3 → 2 by deleting `Clinical + Raw` mode + `ClinicalRawView.tsx`, renamed `Developer` → `JSON`, remapped keyboard shortcut, and cleaned 7 grep hits across 4 files — 998 → 999 tests passing.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-25T06:42:46Z
- **Completed:** 2026-04-25T06:46:29Z
- **Tasks:** 2
- **Files modified:** 4 + 1 deleted

## Accomplishments

- Removed `ClinicalRawView.tsx` (38 LOC) entirely — grep `ClinicalRawView` in `src/` returns **0 hits** (was 7 hits across 4 files pre-plan)
- Reduced `ResourceDetailPage.tsx` Tabs from 3 (`Human-readable | Clinical + Raw | Developer`) to 2 (`Human-readable | JSON`) per UAT-FU-03 + ROADMAP success criterion #3
- Renamed `Developer` tab label → `JSON` while preserving `value="developer"` for query-string contracts (RESEARCH P-09)
- Remapped keyboard shortcut: `1` → human-readable (unchanged), `2` → developer/JSON (was clinical-raw), `3` → dead key (case branch deleted)
- Preserved `<div onClick={handleReferenceClick}>` click-delegation wrapper untouched (T-35-01-01 mitigation, RESEARCH P-12)
- Confirmed D-13 localStorage migration is a true no-op — no `useLocalStorage` for active tab; RESEARCH P-10 validated
- Added 5 RED→GREEN tests codifying the post-cleanup contract: tab count = 2, no "Clinical + Raw" label, "JSON" label exists, default tab = human-readable, keyboard "2" activates JSON
- Cleaned `vi.mock('../components/explorer/ClinicalRawView', ...)` blocks from `resource-detail.test.tsx` + `reference-navigation.test.tsx` and removed the entire `describe('ClinicalRawView')` block + 4 stub assertions from `display-modes.test.tsx`
- Updated `ResourceDetailPage` JSDoc from "three display modes" → "two display modes"
- Updated legacy scaffold test description from "renders three tab buttons: Human-readable, Clinical + Raw, Developer" → "renders two tab buttons: Human-readable, JSON"

## Task Commits

Each task was committed atomically per D-26 RED → GREEN cadence:

1. **Task 1: RED tests for Tabs cleanup** — `1070c15` (test) — 5 new tests, 4 fail RED against current 3-tab production code
2. **Task 2: GREEN cleanup — delete ClinicalRawView + Clinical+Raw tab + remap keyboard + clean test refs** — `8c6c03e` (feat) — 5 files modified (1 deleted), grep returns 0 hits, all 5 RED tests now GREEN

## Files Created/Modified

- `src/components/explorer/ResourceDetailPage.tsx` (modified) — Removed `ClinicalRawView` import, deleted middle Tabs.Tab + Tabs.Panel, renamed Developer label → JSON, remapped keyboard `2` → developer, deleted `case '3':` branch, updated JSDoc; click-delegation wrapper preserved verbatim
- `src/components/explorer/ClinicalRawView.tsx` (**deleted** via `git rm`) — 38-LOC component removed entirely
- `src/__tests__/resource-detail.test.tsx` (modified) — Added 5 new tests in `describe('Tabs cleanup (UAT-FU-03)')`, removed `vi.mock('../components/explorer/ClinicalRawView', ...)` block, updated legacy scaffold test description (3-tab → 2-tab)
- `src/__tests__/display-modes.test.tsx` (modified) — Removed `import { ClinicalRawView }` + entire `describe('ClinicalRawView')` block (4 trivial assertions)
- `src/__tests__/reference-navigation.test.tsx` (modified) — Removed `vi.mock('../components/explorer/ClinicalRawView', ...)` block

## Verification Results

### grep verification command output (0 hits)

```bash
$ grep -rn 'ClinicalRawView' src/ --include='*.ts' --include='*.tsx'
$ echo "EXIT: $?"
EXIT: 1
```

Pre-plan: 7 grep hits across 4 files.
Post-plan: **0 grep hits** (exit code 1).

### Test count delta (998 baseline → 999 post)

```
Test Files  107 passed | 3 skipped (110)
     Tests  999 passed | 22 todo (1021)
```

| Phase | Test count | Delta source |
|-------|-----------|--------------|
| Phase 34 baseline (D-24 gate) | 998 passing | — |
| Plan 35-01 deleted | -4 | `display-modes.test.tsx` `describe('ClinicalRawView')` 4 trivial assertions |
| Plan 35-01 added | +5 | `resource-detail.test.tsx` `describe('Tabs cleanup (UAT-FU-03)')` |
| **Plan 35-01 net** | **+1 → 999** | matches D-23 conservative target trajectory (≥ 1015 post-Phase-35) |

### TypeScript + Build

```
$ npx tsc -b --noEmit
TSC_EXIT: 0

$ npm run build
... built in 534ms (clean — chunk-size warning is pre-existing/expected)
```

### D-13 localStorage migration confirmed NO-OP

Verified `ResourceDetailPage.tsx:51` uses plain `useState<string | null>('human-readable')` — no `useLocalStorage` for the active tab. No migration code added (RESEARCH P-10 validated). Stale URL deep-links `?tab=clinical-raw` fall back to default human-readable per Mantine Tabs behavior (T-35-01-02 accept disposition).

### Click-delegation wrapper preserved (RESEARCH P-12 / T-35-01-01)

```
$ grep -n "onClick={handleReferenceClick}" src/components/explorer/ResourceDetailPage.tsx
184:          <div onClick={handleReferenceClick}>
```

Wrapper at line 184 preserved untouched. `reference-navigation.test.tsx` Tests A/B/E/F all pass — click delegation continues to function for the remaining 2 panels.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Preserve `value="developer"` after label rename | Query-string deep-links (`?tab=developer`) remain valid contracts; only the visible label changes |
| Remap keyboard `2` → developer (not `3` → developer) | Matches visible-tab ordinal: `1` = first tab, `2` = second tab. Keeps muscle-memory natural for users who used `1` + `3` historically |
| Delete `case '3':` branch entirely | Clean switch statement; no dead code; signals "3 is unmapped" via absence rather than no-op fallthrough |
| Update JSDoc + legacy scaffold test description | Truth-in-documentation — comment claiming "three display modes" would mislead future readers; legacy stub test claiming "three tab buttons" would create false-positive baseline drift |
| `git rm` + grep gate as deletion-verification pattern | Single mechanical guarantee that no dangling references remain (vs. relying on TypeScript to catch — which it would, but grep is the explicit ROADMAP success criterion) |

## Deviations from Plan

None — plan executed exactly as written.

All deviations contemplated by the plan were already encoded as auto-fix branches (e.g., legacy test description update at `resource-detail.test.tsx:141` was an obvious truth-in-docs adjustment that the plan implicitly required by reducing the visible tab count). No CLAUDE.md violations encountered. No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural decisions needed.

## Issues Encountered

None. All steps proceeded as specified:

- Task 1 RED tests failed in expected pattern (4/5 fail — the 5th "default active tab is Human-readable" passes because that's already the production default per D-12, which is correct expected behavior for that assertion)
- Task 2 GREEN edits applied without conflict
- Concurrent parallel-plan edits (`35-02-PLAN.md`, `35-04-PLAN.md`, `STATE.md`, `SearchResultsPage.tsx`) detected in `git status` but correctly excluded from staging — this plan only touches its 5 owned files

## User Setup Required

None — no external service configuration required. The change is purely a UI cleanup; no env vars, dashboards, or third-party services touched.

## Next Phase Readiness

- **For sibling Wave 1 plans (35-02, 35-03):** ResourceDetailPage.tsx review surface is now clean. Both sibling plans touch different files (`SearchResultsPage.tsx` and `HumanReadableView.tsx` / `ResourcePropertyTable.tsx`), no merge conflicts expected.
- **For Plan 35-04 (Wave 2 — per-type quality matrix):** No dependency on this plan. Independent.
- **For ROADMAP Phase 35 success criteria:** Criterion #3 (`grep -rn "ClinicalRawView" src/` = 0) **SATISFIED**. Other criteria remain blocked on plans 35-02/03/04.
- **No blockers.** No deferred items. No new pitfalls discovered.

## Self-Check: PASSED

**Files verified:**

```bash
$ test ! -f src/components/explorer/ClinicalRawView.tsx && echo "PASS: ClinicalRawView.tsx deleted"
PASS: ClinicalRawView.tsx deleted

$ ls -la src/components/explorer/ResourceDetailPage.tsx src/__tests__/resource-detail.test.tsx src/__tests__/display-modes.test.tsx src/__tests__/reference-navigation.test.tsx
FOUND: src/components/explorer/ResourceDetailPage.tsx
FOUND: src/__tests__/resource-detail.test.tsx
FOUND: src/__tests__/display-modes.test.tsx
FOUND: src/__tests__/reference-navigation.test.tsx
```

**Commits verified:**

```bash
$ git log --oneline | grep -E "1070c15|8c6c03e"
8c6c03e feat(35-01): drop ClinicalRawView + Clinical+Raw tab; rename Developer → JSON (UAT-FU-03)
1070c15 test(35-01): RED tests for ResourceDetailPage tabs cleanup (UAT-FU-03)
FOUND: 1070c15
FOUND: 8c6c03e
```

**Acceptance criteria checks:**

- [x] `grep -rn 'ClinicalRawView' src/ --include='*.ts' --include='*.tsx'` returns exit 1 (0 hits)
- [x] `src/components/explorer/ClinicalRawView.tsx` does not exist
- [x] `ResourceDetailPage.tsx` contains `<Tabs.Tab value="developer">JSON</Tabs.Tab>` exactly once
- [x] `ResourceDetailPage.tsx` contains `<Tabs.Tab value="human-readable">Human-readable</Tabs.Tab>` exactly once
- [x] `ResourceDetailPage.tsx` does NOT contain `'clinical-raw'`, `'Clinical + Raw'`, or `ClinicalRawView`
- [x] Keyboard switch contains `case '2': setActiveTab('developer');` and does NOT contain `case '3':`
- [x] `<div onClick={handleReferenceClick}>` wrapper preserved at line 184
- [x] All 5 `Tabs cleanup` tests passing
- [x] `npx vitest run` reports 999 passing / 0 failing (≥ 998 baseline preserved; net +1)
- [x] `npx tsc -b --noEmit` exits 0
- [x] `npm run build` exits 0
- [x] Two atomic commits landed (RED then GREEN) per D-26
- [x] No localStorage migration code added (D-13 confirmed no-op per RESEARCH P-10)

---
*Phase: 35-phase-30-uat-follow-ups-per-type-quality-matrix*
*Completed: 2026-04-25*
