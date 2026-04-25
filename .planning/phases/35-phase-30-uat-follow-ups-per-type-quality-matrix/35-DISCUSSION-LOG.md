# Phase 35: Phase-30 UAT Follow-ups + Per-Type Quality Matrix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 35-phase-30-uat-follow-ups-per-type-quality-matrix
**Mode:** `--auto` (recommended option auto-selected for every area)
**Areas discussed:** Plan Decomposition, UAT-FU-01 Extractor Pattern, UAT-FU-02 Extension UX, UAT-FU-03 Mode Cleanup, UAT-FU-05 Per-Type Data Sourcing, Matrix Columns, Matrix Drill-Down, Test Strategy, Commit Cadence

---

## Plan Decomposition

| Option | Description | Selected |
|--------|-------------|----------|
| 4 plans, 3 parallel + 1 serial (35-04 last) | Mirrors UAT-FU items 1-to-1; 35-01/02/03 parallel-safe | ✓ |
| 1 monolithic plan | Loses parallel-safe property; harder to review | |
| 6 plans (split 35-04 into context-extension + matrix-card) | Over-decomposed; matrix is the only byType consumer | |

**Auto-selected:** 4 plans (recommended default — parallel-safe + reviewer-friendly).

---

## UAT-FU-01 Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| TDD baseline-drift commit pair (RED → GREEN+flips) | ROADMAP success criterion #1 mandates | ✓ |
| Extractor first, tests after | Loses deliberate baseline-drift signal | |
| Test-after-implementation | Anti-pattern for behavior-change with baseline assertions | |

**Auto-selected:** TDD baseline-drift (ROADMAP-locked).

---

## UAT-FU-02 Extension UX

| Option | Description | Selected |
|--------|-------------|----------|
| Tooltip for system URL + Modal for JSON | Mantine-native, no new components | ✓ |
| Inline collapsible <details> | Less polished; doesn't match Phase 30 design system |  |
| Sidebar/drawer for all extensions | Heavy; matches Phase 33 Drawer but UX-wise overkill |  |

**Auto-selected:** Tooltip + Modal (matches Phase 30 design tokens).

---

## UAT-FU-03 Mode Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Remove Clinical+raw, rename Developer→JSON, delete file | ROADMAP-locked; mechanical | ✓ |
| Hide Clinical+raw behind feature flag | Keeps dead code; ROADMAP says delete | |
| Keep Developer label | Loses ROADMAP rename | |

**Auto-selected:** Full cleanup per ROADMAP (recommended default).

---

## UAT-FU-05 Per-Type Data Sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Extend per-metric contexts with `byType` slot + producer migration | Cleanest; matches Phase 32 architecture | ✓ |
| Compute per-type metrics inline in the matrix card | Duplicates rollup math; couples matrix to raw data |  |
| Re-use existing per-type panel hooks | Forces panel mounting just to source data |  |

**Auto-selected:** Extend contexts (recommended — consistent with Phase 32 isolation guarantee).

---

## Matrix Columns

| Option | Description | Selected |
|--------|-------------|----------|
| 7 columns per ROADMAP (Complete/Coverage/Validation/References/Dup/Issues + chevron) | ROADMAP-locked column list | ✓ |
| Add Plausibility + LabRanges columns | Out of ROADMAP scope; defer | |
| Drop Issues column | Loses most-actionable signal | |

**Auto-selected:** ROADMAP 7 columns.

---

## Matrix Drill-Down

| Option | Description | Selected |
|--------|-------------|----------|
| chevron → /quality?tab=<metric>&type=<resourceType> deep-link | Reuses existing per-metric panels | ✓ |
| Expandable rows with per-metric detail in-place | More complex; defer | |
| Modal with per-type metric drill | Heavyweight; doesn't reuse existing panels |  |

**Auto-selected:** Deep-link to existing panels (recommended).

---

## Test Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Per-plan unit + 1 matrix integration test | Matches Phase 32 pattern; ≥998 baseline | ✓ |
| Full E2E coverage of every cell | Test bloat; matrix is a read-projection | |
| Snapshot tests of matrix render | Brittle to threshold-color changes | |

**Auto-selected:** Per-plan unit + 1 integration (recommended).

---

## Commit Cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Each plan ends green; per-plan TDD commits where applicable | Phase 32 + 33 + 34 precedent | ✓ |
| Big-bang plan-end commits | Unreviewable | |

**Auto-selected:** Per-plan green ending.

---

## Claude's Discretion

- Final URL fragment trimming heuristic for bottom-Extensions section header (D-08)
- Default sort order if reviewer prefers `Resource type ASC` over `Issues DESC, Resource type ASC` (D-20)
- Whether plan 35-04 splits the byType extension and matrix card (D-01 keeps together — only consumer is the matrix)

## Deferred Ideas

- CSV export of matrix (v1.6+)
- Heat-column gradient on matrix (v1.6+)
- German status localization (v1.6+)
- Plausibility + LabRanges columns in matrix (out of scope)
- Per-type expandable rows in matrix card (chevron-to-panel is the v1 path)
