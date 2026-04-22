# Phase 25: Quality Module Dedup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 25-quality-module-dedup
**Mode:** `--auto` (recommended defaults auto-selected; no interactive prompts)
**Areas discussed:** perPathExamples population, DrillDownShell API, useSampleWalker scope, keepMounted handling, SortableTh location, RunProgress shape, migration sequence, plan batching

---

## perPathExamples population (QDDEP-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Populate inside `codingCoverageWalker` (single traversal) | Reuses existing walker visits; no second pass | ✓ (recommended) |
| Separate post-walker sweep | Simpler diff but doubles traversal cost |  |
| Lazy on drill-down open | Keeps report shape smaller but re-introduces the double-fetch problem |  |

**Auto-selection:** recommended — reused walker aligns with roadmap success criterion "coding drill-down issues a single sample fetch".
**Notes:** one representative example per path; deterministic first-non-null selection; delete `useExamplesByPath` wholesale (no deprecation stub).

---

## DrillDownShell API (QDDEP-02)

| Option | Description | Selected |
|--------|-------------|----------|
| 6 props: `{title, backHref, status, progress, issues, errorMessage?}` | Matches roadmap "≤6 props" cap; no escape hatch | ✓ (recommended) |
| 7+ props with `children` render prop | More flexible but exceeds roadmap cap |  |
| 3 props with render-prop body | Flexible but every drill-down re-specifies body |  |

**Auto-selection:** recommended — roadmap explicitly says ≤6 fields; children escape hatch breaks the dedup goal.
**Notes:** `CodingDrillDown` wraps the shell (partial migration); 5 simple drill-downs fully replaced.

---

## useSampleWalker scope (QDDEP-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Generic `<T>`, Quality-only consumers for now | Flexible if future phases need it; simple for current consumers | ✓ (recommended) |
| Quality-specific (non-generic) | Slightly less code; harder to reuse later |  |
| Generic + pre-register Quality callers | Over-engineering; no current second consumer |  |

**Auto-selection:** recommended — matches current scope without over-engineering.
**Notes:** wrapper hooks keep rollup/post-processing; useSampleWalker wraps useAsyncRun internally (Phase 24 primitive).

---

## keepMounted handling (QDDEP-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Drop `keepMounted` entirely | Smallest diff; tabs remount on re-entry (warm-cache hit is fast) | ✓ (recommended) |
| Gate hooks on `isActive` | Preserves mounted state but adds conditional logic |  |

**Auto-selection:** recommended — per QDDEP-04 "drop `keepMounted` (or gated on `isActive`)"; drop is the simpler of the two sanctioned options.
**Notes:** Network-tab smoke test required post-change — zero background Completeness/Coding requests on `/quality?tab=counts`.

---

## SortableTh location (QDDEP-05)

| Option | Description | Selected |
|--------|-------------|----------|
| `src/components/quality/SortableTh.tsx` | REQUIREMENTS.md mandates exactly this path | ✓ (locked) |

**Auto-selection:** locked by REQUIREMENTS.md acceptance text; no alternatives.
**Notes:** pure move of duplicate definitions in `CompletenessPanel`:76 and `CodingCoveragePanel`:91; no behavior change.

---

## RunProgress component shape (QDDEP-06)

| Option | Description | Selected |
|--------|-------------|----------|
| 2 props `{run, label}` at `src/components/quality/RunProgress.tsx` | Matches inline-site prop surface (run obj + label string) | ✓ (recommended) |
| 4 props `{total, processed, label, variant}` | Flat props but re-derives `run` shape at every call site |  |
| Fold into `<DrillDownShell>` | Used in panels/overview page too, not just drill-downs — can't fold |  |

**Auto-selection:** recommended — 9 inline sites use a `run` obj already; flat-props path would churn the callers unnecessarily.
**Notes:** separate file from DrillDownShell (used in more places than drill-downs).

---

## Migration sequence / plan batching

| Option | Description | Selected |
|--------|-------------|----------|
| Planner's call: bundle QDDEP-01/03 (both touch walkers); QDDEP-02 own plan; 05/06 bundled; 04 small own-plan or bundled | Matches roadmap's locked order (01 before 02); planner decides fine detail | ✓ (Claude's Discretion) |
| One plan per QDDEP (6 plans) | Too granular for 4 mostly-mechanical refactors |  |
| Single plan for all 6 | Too coarse; 5 files × 5 drill-downs = big blast radius |  |

**Auto-selection:** defer to planner within the locked ordering constraint (01 → 02).
**Notes:** gsd-planner should justify batching in PLAN.md frontmatter.

---

## Claude's Discretion

- Plan batching granularity (within 01-before-02 constraint)
- Test strategy per QDDEP (TDD mandatory for QDDEP-01; pre/post render-hash for QDDEP-02; standard unit for others)
- Commit granularity (atomic, one-per-QDDEP preferred)
- Whether to write a migration guide doc for future Quality additions (discretion: yes if ≤50 LOC, no otherwise)

## Deferred Ideas

- `useSampleWalker` reuse outside Quality module — future phase if needed
- `<DrillDownShell>` render-prop escape hatch — no; wrap the shell instead
- R11 cast cleanup — Phase 28
- R14 QualityMetricsContext re-render split — v1.5
