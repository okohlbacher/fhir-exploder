# Phase 32: EFF-R14 QualityMetricsContext Split - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 32-eff-r14-qualitymetricscontext-split
**Mode:** `--auto` — all gray areas resolved with recommended defaults, no interactive Q&A
**Areas discussed:** Plan decomposition, Composer + facade layout, Test strategy, Legacy provider disposition, Memoization strategy, Phase 31 coordination

---

## Plan Decomposition / Commit Cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Incremental per-metric plans (4 plans: scaffold → facade → migration → tests) | ROADMAP hint: "incremental per-metric landings preferred"; each plan ends with green test + tsc — no broken intermediate states. | ✓ |
| One big-bang plan | Single plan touches ~20 files. Simpler to reason about but harder to review and higher rebase risk. | |
| Hybrid (infra + migration) | Two plans: provider infra landing (includes facade), then all migrations. | |

**Chosen:** Incremental per-metric plans — 4-plan breakdown in D-11.
**Reason:** ROADMAP line 111 explicitly recommends incremental; API-preserving facade makes each plan independently shippable.

---

## Composite + Facade File Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Composite at `src/quality/metrics/index.tsx`, facade stays at `src/quality/QualityMetricsContext.tsx` | Preserves all 17+ import paths across consumers; composer lives in its natural new home. | ✓ |
| Move facade to `src/quality/metrics/index.tsx` alongside composite | Cleaner co-location but churns imports across every consumer. | |
| Delete facade; force per-metric subscription everywhere | Rejected — breaks capture-snapshot + PDF export bulk reads; contradicts EFF-R14-03. | |

**Chosen:** Split layout — composite at `metrics/index.tsx`, facade at existing path.
**Reason:** ROADMAP success criterion #2 explicitly names `src/quality/metrics/index.tsx` for the composite; EFF-R14-03 mandates facade preservation at the existing path for API stability.

---

## Per-Tile Isolation Test Approach

| Option | Description | Selected |
|--------|-------------|----------|
| React Profiler snapshot | Mount `OverviewStrip` inside composer, trigger one setter, inspect `onRender` callbacks to assert only the target tile re-rendered. | ✓ |
| Render-count spy via `jest.spyOn` / `vi.spyOn` on tile components | Alternative if Profiler flakes with React 18 batching; considered as fallback only. | |
| Visual regression via Playwright snapshot | Overkill for this refactor; no visual change expected. | |

**Chosen:** React Profiler snapshot.
**Reason:** ROADMAP success criterion #3 explicitly specifies "React Profiler snapshot." Fallback to render-count spy noted in CONTEXT.md `<specifics>` if flaky.

---

## Legacy `QualityMetricsProvider` Disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Delete after migration | Clean cut; 8 test wrappers migrate in one sweep (D-10); lean final state. | ✓ |
| Keep as deprecated alias pointing to composer | Extra surface area; no external API consumers (this is an in-repo provider only). | |

**Chosen:** Delete.
**Reason:** EFF-R14-06 mandates all 8 test wrappers migrate; keeping an alias would invite accidental new usage. `useQualityMetrics()` facade is preserved — that's the stable API, not the provider component name.

---

## Provider Memoization Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| `useMemo` every provider value (match existing pattern) | Reproduces `QualityMetricsContext.tsx:142-171` pattern for each of 7 new providers; eliminates "Maximum update depth exceeded" regressions. | ✓ |
| `useMemo` only on providers with derived state (Duplicates) | Simpler for scalar providers but invites subtle regressions when value objects get inline-created. | |
| Skip `useMemo` entirely and rely on React 18 auto-memoization | Rejected — React 18 does not auto-memoize context values. | |

**Chosen:** `useMemo` every provider value.
**Reason:** ROADMAP success criterion #6 explicitly warns: *"no 'Maximum update depth exceeded' from missing useMemo on provider values."* No ambiguity.

---

## Phase 31 Coordination / Rebase Window

| Option | Description | Selected |
|--------|-------------|----------|
| Already clean — Phase 31 is shipped, `ValidationPanel.tsx:200` untouched by Phase 31 | Verified against `31-01-SUMMARY.md:243-247`. No merge-conflict surface remains. | ✓ |
| Explicit rebase step before execution | Would be needed if Phase 31 were still in progress — not the case. | |

**Chosen:** No rebase needed.
**Reason:** Phase 31 SUMMARY explicitly confirms `setOverallValidation` call site (the only Phase 32 edit to `ValidationPanel.tsx`) was UNCHANGED by Phase 31. The Active-strategy status line and `phiGateUrl` derivation that Phase 31 added are in different line ranges.

---

## Claude's Discretion

Left to planner/executor:
- Internal file organization within each `metrics/*.tsx` (single file per context chosen; tests co-located or in `__tests__/` is planner's call).
- `useMemo` dependency array style (per-value vs grouped).
- Test file naming (e.g., `metrics-isolation.test.tsx` vs `OverviewStrip.isolation.test.tsx`).
- Whether the 7-provider smoke test lives in `metrics/__tests__/` or co-located.

## Deferred Ideas

Tracked in CONTEXT.md `<deferred>`:
- Zustand / Jotai migration (locked REJECTED in v1.5 requirements).
- Per-metric-per-type slot structure (Phase 35 concern — UAT-FU-05).
- Selector-level memoization (`use<Metric>RollupSelector(sel)`) — speculative.
- Server-push-style context-to-store migration — speculative.

---

*Log generated under `--auto` mode. All 6 gray areas resolved with recommended defaults per ROADMAP + REQUIREMENTS pre-locked guidance.*
