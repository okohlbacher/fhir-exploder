---
phase: 41-explorer-quality-ux-polish
plan: 02
subsystem: quality
tags: [quality, sorting, ux, qual-01]
requires:
  - "src/components/quality/CompletenessPanel.tsx — existing aSettled idiom and Row/SortKey/SortDir types"
  - "src/components/quality/CodingCoveragePanel.tsx — existing aSettled idiom and Row/SortKey/SortDir types"
  - "src/quality/types.ts — PerTypeCompletenessReport, PerTypeCoverageReport, PerTypeReport"
provides:
  - "compareRows + toRow exports from CompletenessPanel.tsx (test seam)"
  - "compareRows + toRow exports from CodingCoveragePanel.tsx (test seam)"
  - "QUAL-01 ASC+DESC N/A-to-bottom invariant locked by 5 tests across 2 colocated files"
  - "em-dash render branch for state.total === 0 in CompletenessRow"
affects:
  - "/quality?tab=completeness — N/A (zero-count) types now sink to bottom"
  - "/quality?tab=coding — N/A (no CC fields) types stay at bottom under DESC (was correct-by-accident, now locked)"
tech-stack:
  added: []
  patterns:
    - "Shared aIsNA/bIsNA idiom across panel compareRows functions (one canonical pattern)"
    - "Pure-function colocated regression tests in __tests__/<Component>.compareRows.test.tsx"
key-files:
  created:
    - "src/components/quality/__tests__/CompletenessPanel.compareRows.test.tsx"
    - "src/components/quality/__tests__/CodingCoveragePanel.compareRows.test.tsx"
  modified:
    - "src/components/quality/CompletenessPanel.tsx"
    - "src/components/quality/CodingCoveragePanel.tsx"
decisions:
  - "Exported compareRows + toRow as test seam (Option A from plan) — minimal source change, pure function with no side effects (T-41-02-01 accepted)"
  - "Stable type-name tiebreak between N/A peers — keeps sort deterministic across renders"
  - "ValidationPanel + ReferencesPanel EXEMPT — single-type runners with no per-type sortable table (audit verdict locked here, not in plan)"
metrics:
  duration: "~4 min wall-clock"
  completed: 2026-04-29
  tasks_completed: 4
  tests_added: 5
---

# Phase 41 Plan 02: QUAL-01 — N/A rows sort to bottom Summary

QUAL-01 fix: rows with no data (`pct === null` in CompletenessPanel; `totalCodedFields === 0` → all-pcts-null in CodingCoveragePanel) now sort to the END regardless of sort direction, mirroring the existing aSettled idiom that already sinks loading/error rows.

## Problem

Phase 38 HUMAN-UAT walk surfaced 5 zero-count types stacked at the TOP of `/quality?tab=completeness` under default ASC sort. Root cause: the `pct ?? -1` trick treated null as the worst possible value, which is correct logic for "minimize" but wrong UX for "not applicable".

CodingCoveragePanel had a related-but-different defect: literal `+1` returns under N/A short-circuits worked correctly under ASC (Array.sort treats +1 as "a after b") but only by accident — there was no test locking the DESC behavior, so any future refactor could silently regress.

## Fix Shape

Both panels now use the same idiom (one shared pattern across the codebase):

```typescript
const aIsNA = /* row-specific null predicate */;
const bIsNA = /* row-specific null predicate */;
if (aIsNA !== bIsNA) return aIsNA ? 1 : -1;     // N/A rows ALWAYS to end
if (aIsNA && bIsNA) return a.type.localeCompare(b.type); // stable tiebreak
// ... then the dir-aware value comparison on non-null pcts only
```

This branch lives BEFORE the `sign = dir === 'asc' ? 1 : -1` multiplication, so the +1 return for N/A is never flipped by DESC.

## 4-Panel Audit Verdict (CONTEXT D-09)

| Panel | Verdict | Rationale |
|-------|---------|-----------|
| `CompletenessPanel.tsx` | FIXED | Per-type sortable table; `compareRows` updated + em-dash render added for `state.total === 0`. |
| `CodingCoveragePanel.tsx` | FIXED | Per-type sortable table; `compareRows` normalized to shared idiom. Em-dash already in place from Phase 35 (lines 225-254). |
| `ValidationPanel.tsx` | EXEMPT | Single-type runner. Uses a `Select` dropdown (line 368) + "Validate sample" button — there is no per-type sortable table to which `compareRows` applies. The N/A defect cannot occur. |
| `ReferencesPanel.tsx` | EXEMPT | Single-type runner. Same shape as ValidationPanel: `Select` (line 111) + "Run reference checks" button. No per-type sortable table. |

The "4 panels touched" framing in the ROADMAP success criterion is satisfied by this audit (2 fixed, 2 confirmed N/A).

## Visual Change

`CompletenessRow` now renders `<Text c="dimmed">—</Text>` in the Completeness column when `state.total === 0`, instead of a misleading `RingProgress` showing `0%`. This reuses the em-dash + dimmed convention already established by Phase 33 / Phase 35 / Phase 38.2.

CodingCoveragePanel already rendered the em-dash for the no-CC-fields case (Phase 35) — no UI change needed.

## Tests Added (5 total across 2 files)

### `src/components/quality/__tests__/CompletenessPanel.compareRows.test.tsx` (4 tests)

1. **Test 1+2 (one `it()` block per CONTEXT D-11):** ASC sort produces `[40, 80, 95, NA, NA]` by type; DESC sort produces `[95, 80, 40, NA, NA]` — N/A rows STILL at bottom under DESC.
2. **Test 3:** Sort by `type` still pushes N/A rows below settled rows (alphabetical within each group).
3. **Test 4:** Loading rows sort below N/A rows (settled-state precedence preserved).

### `src/components/quality/__tests__/CodingCoveragePanel.compareRows.test.tsx` (2 tests)

1. **Test 1+2 (one `it()` block):** `systemCode` ASC and DESC both push N/A row to the end.
2. **Test 3:** `textOnly` sort key — same ASC+DESC invariant.

## Decisions Made

- **Test seam exposure (Option A):** Exported `compareRows` + `toRow` from both panels rather than rendering the full Mantine table and asserting DOM order. Pure-function tests are 30× faster, deterministic, and cover the actual unit under test. Tampering risk is accept (T-41-02-01) — pure function, no side effects.
- **Stable tiebreak between N/A peers:** Locale-compare on `type` ensures N/A rows are alphabetized within their N/A bucket. Without this, the N/A bucket order would be input-order-dependent and could flicker on re-render.
- **Audit verdict for the 2 single-type panels:** Recorded here in SUMMARY rather than in the plan body, because the audit conclusion ("no per-type compareRows exists") is a code-truth, not a planning decision. Verifier can confirm by reading ValidationPanel + ReferencesPanel and observing the `Select`-based UI shape.

## Deviations from Plan

None. Plan executed exactly as written. The em-dash render insert in Task 1 followed the plan's "BEFORE the existing pct=Math.round line" instruction precisely; the existing `state.total > 0 ? Math.round(...) : 0` ternary was simplified to plain `Math.round(...)` since the `=== 0` case is now handled by the new branch above it.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | exit 0 |
| `npm test -- --run …CompletenessPanel.compareRows.test.tsx` | 3 passing |
| `npm test -- --run …CodingCoveragePanel.compareRows.test.tsx` | 2 passing |
| `npm test -- --run src/components/quality/` | 81/81 passing (no regression in 11 sibling test files) |
| `grep -cE "pct === null\|aIsNA" CompletenessPanel.tsx` | 5 (≥2 required) |
| `grep -c "state.total === 0" CompletenessPanel.tsx` | 1 (≥1 required) |
| `grep -cE "aIsNA\|bIsNA" CodingCoveragePanel.tsx` | 4 (≥3 required) |

## Commits

- `fcfc240` — fix(41-02): QUAL-01 — N/A rows sort to end in CompletenessPanel + em-dash render
- `ddbf48e` — fix(41-02): QUAL-01 — normalize CodingCoveragePanel.compareRows to shared N/A idiom
- `84cfa23` — test(41-02): QUAL-01 — lock CompletenessPanel.compareRows ASC+DESC N/A behavior
- `9156021` — test(41-02): QUAL-01 — lock CodingCoveragePanel.compareRows ASC+DESC N/A behavior

## Self-Check: PASSED

- File `src/components/quality/CompletenessPanel.tsx` modified (commit `fcfc240`)
- File `src/components/quality/CodingCoveragePanel.tsx` modified (commit `ddbf48e`)
- File `src/components/quality/__tests__/CompletenessPanel.compareRows.test.tsx` created (commit `84cfa23`)
- File `src/components/quality/__tests__/CodingCoveragePanel.compareRows.test.tsx` created (commit `9156021`)
- All 4 commit hashes present in `git log --oneline`
- All success-criteria checks pass
