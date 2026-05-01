---
phase: 46
plan: 02
status: complete
nav_closure: closed pending UAT
completed: 2026-05-01
---

# Plan 46-02: Migrate Call Sites — SUMMARY

## Objective achieved

Migrated the three legacy inline summary implementations to call `summarizeResource(r).primary` from the util shipped in Plan 46-01. All inline `getResourceSummary` / `getSummary` functions deleted; render sites updated; bundle delta well within budget. NAV-02 closed pending live visual UAT (deferred by user).

## Tasks completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Migrate SearchResultsPage.tsx — delete `getResourceSummary`, add import, update render site | done | `7f35b47` |
| 2 | Migrate FhirResourcesView.tsx + MiiModuleTab.tsx — delete `getSummary`, add imports, update render sites | done | `71a971c` |
| 3 | Bundle-size check — production build clean, initial-load delta within budget | done | (verification only — no code commit) |
| 4 | Visual spot-check — confirm all 3 migrated render sites display correctly | **postponed** | (no code action — UAT deferred by user) |

## Files modified

| File | Lines deleted | Notes |
|------|---------------|-------|
| `src/components/explorer/SearchResultsPage.tsx` | −41 | Removed `getResourceSummary` (lines 32-70); added import; updated render site at line 447. |
| `src/components/patients/FhirResourcesView.tsx` | −18 | Removed `getSummary` (lines 51-68); added import; updated render site at line 205. |
| `src/components/patients/MiiModuleTab.tsx` | −19 | Removed `getSummary` (lines 20-38); added import; updated render site at line 165. Also removed unused `toRecord` / `getCodeDisplay` imports per RESEARCH.md § Pitfall 6. |

Net change: 6 insertions / 86 deletions across 3 files (verified via `git show 71a971c --stat` and `git show 7f35b47 --stat`).

## Verification

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| Type check | `npx tsc -b --noEmit` | 0 | Clean. |
| Zero legacy summary fns | `! grep -rn "function getResourceSummary\|function getSummary" src/components/` | 0 | All 3 inline impls deleted. |
| Render sites updated | `grep -rn "summarizeResource(r).primary" src/components/` | 0 | 3 matches (one per file). |
| Imports added | `grep -rn "import { summarizeResource }" src/components/` | 0 | 3 matches. |
| Test suite | `npm test` | 0 | **1292 passed** / 22 todo / 1 pre-existing failure (deuteranopia pair #13, carryover from Phase 40 — NOT a regression introduced here). |
| Build | `npm run build` | 0 | Built in 459ms. No new chunk-size warnings. |

## Bundle delta

- **Initial-load gz:** 584.17 KB (sum of 25 chunks per `dist/index.html` modulepreloads + entry).
- **Baseline (v1.6 close per REQUIREMENTS.md line 6):** 606.76 KB gz.
- **Delta: −22.59 KB gz** — bundle SHRANK; well within the +5 KB Theme A budget.
- Plan 02 removed ~73 lines of duplicated inline-summary logic from 3 components, more than offsetting the ~+2 KB Plan 01 added via `summarizeResource.ts`.

## Postponed Verification

The `checkpoint:human-verify` blocking gate at Task 4 was deferred by the user. Tasks 1-3 automated gates all PASS, but no live visual spot-check was performed. **The following items must be verified before declaring NAV-02 fully closed:**

### Site 1 — SearchResultsPage (Explorer Summary column)

**Test path:**
1. Start `npm run dev`.
2. Open `http://localhost:5173/explorer/Patient`.
3. Confirm the Summary column renders patient names with `(age/sex)` parenthetical where birthDate + gender are present (e.g. `Müller, Anna (68/F)`).
4. Confirm no Patient rows show bare `id` strings where names were expected.
5. Confirm truncation still applied (long summaries cut off at ~400px via the existing `<Anchor>` `maxWidth: 400`).
6. Open DevTools — confirm no React/console errors.
7. Navigate to `/explorer/Observation` (and any other resource type). Confirm meaningful display text in the Summary column. No console errors.

**Expected improvement vs v1.6 baseline:** Patient cells now include `(age/sex)` parenthetical (intentional NAV-01 enrichment).

### Site 2 — FhirResourcesView (Patient detail, expanded resource accordion)

**Test path:**
1. Navigate to `http://localhost:5173/patients/<any-patient-id>`.
2. Expand a resource type accordion (Observation, Condition, Encounter).
3. Confirm each resource row shows a non-empty, human-readable summary string (not just a bare FHIR id).
4. No console errors.

### Site 3 — MiiModuleTab (MII module rows)

**Test path:**
1. On the same patient detail page, click a MII module tab (Diagnose, Medikation, Laborbefund — whichever is populated for this patient).
2. Confirm rows render summaries:
   - Diagnose → Condition `code` display
   - Medikation → MedicationStatement medication name
   - Laborbefund → Observation lab `value · code` (with U+00B7 middot separator)
3. Confirm the description-fallback that previously existed only in MiiModuleTab is gone — Diagnose now uses typed `summarizeCondition` (correctness improvement).
4. No console errors.

**Acceptance criterion:** All 3 sites render summaries; no site shows fewer characters or less information than v1.6 baseline (Patient cells GAIN `(age/sex)` — intended improvement). No JS errors in any of the 3 sites.

These items will be persisted as a HUMAN-UAT artifact at the phase level so they surface in `/gsd-progress` and `/gsd-audit-uat` until verified.

## NAV-02 closure status

**Closed pending UAT.** All automated success criteria met:
- ✓ Zero legacy inline summary computations remain in `src/components/`
- ✓ All 3 component files import and call `summarizeResource(r).primary`
- ✓ `tsc -b --noEmit` exit 0
- ✓ Full test suite passes (1292 tests, no new regressions)
- ✓ `npm run build` exit 0
- ✓ Bundle gz delta within +5 KB budget (−22.59 KB, well under)
- ⏸ Visual spot-check deferred — tracked as HUMAN-UAT for later verification

## Issues encountered

None during execution. Two procedural notes:

1. **Worktree cleanup glitch (orchestrator-side):** The post-Wave-1 worktree-merge cleanup logic deleted `46-01-SUMMARY.md` from the working tree because the file didn't exist in the pre-merge file list (the resurrection-detection logic mistakenly treats new files added by the executor as resurrected files). Restored manually via `git checkout HEAD -- .planning/phases/46-theme-a-foundation-summary-util/46-01-SUMMARY.md`. No data loss; the file was already committed.
2. **Continuation worktree base mismatch:** The continuation agent for the post-checkpoint Task 4 was spawned in a fresh worktree based on `a20f2c3` instead of the prior worktree's tip. Resolved by merging the original Plan 02 worktree branch (`worktree-agent-af237336a65fead53` at `71a971c`) directly into main and writing this SUMMARY inline.
