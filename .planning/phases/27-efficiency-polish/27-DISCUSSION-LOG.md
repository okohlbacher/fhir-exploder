# Phase 27: Efficiency Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-23
**Mode:** `--auto` (recommended defaults auto-selected)
**Areas discussed:** pagination memo shape, lazy route scope, Suspense fallback placement, retry utility, analyzer gate, plan batching

---

## EFF-01 pagination memo shape

| Option | Description | Selected |
|--------|-------------|----------|
| Fold slice + totalPages into existing useMemo; return aggregate object | Minimizes memo calls; single dep array | ✓ (recommended) |
| Add a sibling useMemo for slice | More memo calls, deps duplication |  |
| Inline `useMemo` per derived value (5 separate memos) | Overkill |  |

**Auto-selection:** recommended — deps `[issues, severityFilter, fieldFilter, page]`.

---

## EFF-02 lazy route scope

| Option | Description | Selected |
|--------|-------------|----------|
| 7 routes (6 drill-downs + thresholds) | Matches ROADMAP acceptance exactly | ✓ (locked) |
| All quality routes incl. overview + cohorts | Adds spinner on common first-nav targets |  |
| Just the 6 drill-downs (no thresholds) | Acceptance says 7; drops one |  |

**Auto-selection:** locked by ROADMAP — 7 routes.

---

## Suspense fallback placement

| Option | Description | Selected |
|--------|-------------|----------|
| Single global Suspense at AppLayout Outlet level | No cascading fallbacks, simple | ✓ (recommended) |
| Per-route Suspense (7 fallbacks) | More granular but adds UI jitter |  |
| Nested Suspense (QualityLayout + AppLayout) | Double-fallback risk |  |

**Auto-selection:** recommended — single fallback with `data-testid="route-loading"`.

---

## Retry utility

| Option | Description | Selected |
|--------|-------------|----------|
| `src/utils/lazyRetry.ts` — `retry(fn, 3, 100)` exponential backoff | Reusable, testable | ✓ (recommended) |
| Inline in App.tsx | Simpler if <20 LOC but harder to test |  |
| Import from a library (e.g., p-retry) | New dep, not worth for 20-LOC function |  |

**Auto-selection:** recommended — separate utility for testability.
**Notes:** exponential backoff 100ms/300ms/900ms; 3 attempts total.

---

## EFF-03 analyzer gate

| Option | Description | Selected |
|--------|-------------|----------|
| `ANALYZE=1` env gate, explicit string match | Prevents accidental enablement | ✓ (recommended) |
| `ANALYZE` truthy check | Accepts many values, fragile |  |
| Always-on via separate `vite.analyze.config.ts` | Splits config, more to maintain |  |

**Auto-selection:** recommended — `process.env.ANALYZE === '1'` explicit match.

---

## Plan batching

| Option | Description | Selected |
|--------|-------------|----------|
| 2 plans: 27-01 (EFF-01 isolated), 27-02 (EFF-02 + EFF-03 bundled) | Disjoint files, parallel-safe | ✓ (Claude's Discretion) |
| 3 plans (one per EFF) | EFF-02 + EFF-03 share vite.config touch |  |
| 1 plan (all 3 EFF) | Too coarse |  |

**Auto-selection:** 2 plans — 27-01 and 27-02 can run in parallel.

---

## Claude's Discretion

- Retry utility naming
- Exact `bundle-stats.html` output location
- Test strategy for EFF-02 fallback rendering (snapshot vs findByTestId)
- Whether to add `bundle-stats.html` to .gitignore (yes, don't commit)

## Deferred Ideas

- QualityMetricsContext re-render split — v1.5 (EFF-R14)
- Per-route Suspense fallbacks
- Bundle-size budget / CI gate
- Lazy-loading of overview/landing pages
- Preload hints for lazy chunks
