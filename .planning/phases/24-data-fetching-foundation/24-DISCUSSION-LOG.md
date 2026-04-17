# Phase 24: Data-Fetching Foundation — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 24-data-fetching-foundation
**Areas discussed:** None (all Claude's Discretion — user selected "none")

---

## Gray Areas Presented

| Area | Options Presented | Selected |
|------|-------------------|----------|
| Count cache staleness | (a) Session-scoped no TTL, (b) TTL + background refresh, (c) Manual refresh only | Claude's Discretion |
| Settings invalidation scope | (a) Any settings save, (b) Only serverUrl change, (c) Version counter watcher | Claude's Discretion |
| autoStart scope (Phase 24 vs 25) | (a) Include in Phase 24, (b) Defer to Phase 25 | Claude's Discretion |

**User's choice:** "none" — no areas selected for discussion; all deferred to Claude's discretion.

---

## Claude's Discretion

All three gray areas resolved by Claude:

1. **Count cache staleness** → Session-scoped, no TTL. Cleared alongside quality metrics on settings save and via Settings "Clear cache" button. Rationale: local tool with infrequent mid-session server changes; existing Recompute button covers intentional refresh.

2. **Settings invalidation** → Direct call at save time (not a version counter). `SettingsPage.handleSave` calls `clearQualityCountCache(serverUrl)` + `clearQualityMetricsCache(serverUrl)` alongside `setSettings()`. Conservative (any save wipes cache) and simple.

3. **autoStart scope** → Included in Phase 24 when `useAsyncRun` is authored (`autoStart?: boolean`). Avoids a second patch to the hook file in Phase 25 when drill-downs adopt it.

## Deferred Ideas

None — discussion stayed within phase scope.
