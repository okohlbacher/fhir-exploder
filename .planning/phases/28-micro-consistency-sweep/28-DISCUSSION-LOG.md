# Phase 28: Micro-Consistency Sweep - Discussion Log

> **Audit trail only.**

**Date:** 2026-04-23
**Mode:** `--auto`
**Areas discussed:** toRecord overload, dash convention, eslint-disable removal strategy, ref type change, QualityLayout essay extraction, plan batching

---

## SWEEP-01 toRecord overload

| Option | Description | Selected |
|--------|-------------|----------|
| Use helper as-is on 23 sites; if any site's input isn't `Resource`, decide per-site (overload or comment) | Minimal API surface change | ✓ (recommended — defer to planner) |
| Extend helper with generic overload `toRecord<T>(x: T)` upfront | Future-proof but more API surface |  |
| Leave helper, introduce `toAnyRecord` sibling for non-Resource sites | New helper, fragment the API |  |

---

## SWEEP-02 dash convention

| Option | Description | Selected |
|--------|-------------|----------|
| `—` (em-dash) for separators, `–` (en-dash) for numeric ranges | Idiomatic English typography | ✓ (locked by ROADMAP) |
| All `—` (em-dash) | Simpler but loses semantic |  |
| All `–` (en-dash) | Unusual for separators |  |

---

## SWEEP-03 eslint-disable removal

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all 4 disables; verify each file passes eslint; investigate any failures | Direct approach | ✓ (recommended) |
| Remove 1 at a time as proof-of-concept | Over-cautious for 0.5-day phase |  |
| Keep disables, add comment noting Phase 24 absorption | Doesn't meet acceptance |  |

---

## SWEEP-04 ref type change

| Option | Description | Selected |
|--------|-------------|----------|
| `HTMLButtonElement` (matches actual rendered element) | Most specific; matches ROADMAP #4 | ✓ (recommended) |
| `HTMLElement` (generic) | Satisfies ROADMAP fallback |  |
| Keep `HTMLAnchorElement` | Wrong; rendered element is button |  |

---

## SWEEP-04 QualityLayout essay extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Move essay body into existing `migrateLegacyResourceTypeKey()` in cohorts.ts | Zero new functions; matches acceptance | ✓ (recommended) |
| Create new helper file `src/quality/legacyMigration.ts` | Over-engineering |  |

---

## Plan batching

| Option | Description | Selected |
|--------|-------------|----------|
| 2 plans: 28-01 (SWEEP-01+02 grep sweeps), 28-02 (SWEEP-03+04 drill-down/ref/essay cleanup) | Parallel-safe, disjoint files | ✓ (recommended) |
| 1 plan (all 4 SWEEPs) | 0.5 day total; would be reasonable |  |
| 4 plans (one per SWEEP) | Over-segmented |  |

---

## Claude's Discretion

- `toRecord` overload decision (planner picks per-site)
- Whether to extend SWEEP-02 to .md files (no — src/ only)
- `npx eslint --fix` pass after SWEEP-03 (optional)
- Per-file vs per-SWEEP commit granularity

## Deferred Ideas

- Non-Resource `toRecord` overload
- Dash cleanup in .md planning documents
- Global eslint-disable audit
