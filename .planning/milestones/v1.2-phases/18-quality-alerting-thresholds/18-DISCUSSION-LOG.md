# Phase 18: Quality Alerting & Thresholds - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 18-quality-alerting-thresholds
**Areas discussed:** Score model, Config UI, Breach visual, Tile strategy, Defaults, Storage scope, Enable toggle, Notification scope

---

## Score Model

| Option | Description | Selected |
|--------|-------------|----------|
| Derive % clean (Recommended) | For each issue-based metric, compute `(sampledResources - affectedResources) / sampledResources × 100`. Uniform 0-100 scale so thresholds are consistent. | ✓ |
| Raw issue count | Threshold as absolute integer. Simpler compute but thresholds don't transfer across sample sizes. | |
| Mixed per metric | Each metric uses its most natural unit (% or count). Claude picks per metric. | |

**User's choice:** Derive % clean (Recommended)
**Notes:** Uniform score model shapes everything downstream — single threshold input, single breach check for all 7 metrics.

---

## Config UI

| Option | Description | Selected |
|--------|-------------|----------|
| Inline edit on summary tile (Recommended) | Edit icon on each dashboard tile opens a popover. Tight coupling to metric. | |
| Dedicated /quality/thresholds page | New route with a table of all metrics. Central review. | ✓ |
| Modal from global 'Configure' button | Toolbar button opens modal. No route change. | |

**User's choice:** Dedicated /quality/thresholds page
**Notes:** Centralized config page reviewed in one place; fits the "local audit tool" mental model.

---

## Breach Visual (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Color RingProgress/value red (Recommended) | RingProgress arc turns red when breached. | ✓ |
| AlertTriangle ThemeIcon overlay | Icon in tile corner. | |
| Highlighted tab header badge | Red dot/count on tab header. | |
| Breach-summary banner on /quality | Top-of-page alert listing breaches. | |

**User's choice:** Color RingProgress/value red only
**Notes:** Single, consistent visual treatment — no additional badges, icons, or banners in this phase.

---

## Tile Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Expand OverviewStrip to all 7 (Recommended) | Add 5 new metric tiles to summary strip. | ✓ |
| Keep 2 tiles + 'Alerts' tile | Single 'Quality Alerts' tile with breach count. | |
| No new tiles — tab-header badges only | Breach indicators only on tab headers. | |

**User's choice:** Expand OverviewStrip to all 7
**Notes:** Dashboard tiles are the primary breach surface; each metric gets its own visual anchor.

---

## Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Ship sensible defaults (Recommended) | Each metric ships with a reasonable default. | ✓ |
| Start empty, user opts in | No defaults; no breach until configured. | |
| Ship defaults only for completeness/coding | Only existing aggregates get defaults; %-clean metrics start blank. | |

**User's choice:** Ship sensible defaults
**Notes:** First-load value — breach indicators meaningful without setup.

---

## Storage Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Global (Recommended) | One set of thresholds, applied regardless of server URL. | ✓ |
| Per-server | Thresholds keyed by server URL (matches QualityMetricsCache). | |

**User's choice:** Global
**Notes:** Thresholds as user preference, not server-specific state.

---

## Enable Toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Unset = disabled (Recommended) | Clear value = no alerting for that metric. Single-field UI. | ✓ |
| Explicit enable toggle per metric | Separate toggle + value input per row. | |

**User's choice:** Unset = disabled
**Notes:** Simpler UI; matches how user thinks about "turn off this alert."

---

## Notification Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Visual only (Recommended) | No toasts, no sounds, no emails. Per DQ-12. | ✓ |
| Also show toast on breach | Mantine notification when new breach detected. | |

**User's choice:** Visual only
**Notes:** Keeps phase focused; notifications deferrable.

---

## Claude's Discretion

- Exact layout/components for `/quality/thresholds` page
- Location of `DEFAULT_THRESHOLDS` constant
- Whether to extract `useThresholds()` hook or extend `QualityMetricsContext`
- Exact Mantine red shade / severity gradient
- Lazy vs eager % clean computation

## Deferred Ideas

- Toast/sound/email notifications (D-19)
- Historical trending of breaches (Phase 19)
- Per-cohort / per-resource-type thresholds
- Severity-graded color gradient
- Cohort-selection todos (stale or unrelated to thresholds)
