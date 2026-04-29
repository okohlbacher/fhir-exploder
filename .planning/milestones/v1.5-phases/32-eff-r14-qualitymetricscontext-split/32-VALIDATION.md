---
phase: 32
slug: eff-r14-qualitymetricscontext-split
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-24
re_audited: 2026-04-29
re_audited_by: phase-39
notes: |
  Retroactively flipped from `nyquist_compliant: false` on 2026-04-29 under
  Phase 39 NYQ-01. Phase 32 shipped 871 passing / 0 failing (baseline 836
  → 871, +29 over baseline; per 32-04-SUMMARY.md). Per-REQ coverage:
  - EFF-R14-01..02 + EFF-R14-06 → src/quality/metrics/__tests__/providers-smoke.test.tsx
    (7-provider smoke + shared-symbol-regression rejection)
  - EFF-R14-04 → src/__tests__/metrics-isolation.test.tsx (Profiler
    per-tile isolation: setCompleteness(42) re-renders only the
    Completeness tile, 1 update vs 0 for the other 6 tiles)
  - EFF-R14-03 + EFF-R14-05 → existing src/__tests__/quality-overview.test.tsx
    + per-panel test files (completeness-hook, plausibility-panel,
    lab-ranges-panel, references-panel, duplicates-panel)
  Wave-0 + per-task table in this file are unchanged from the at-execution
  contract; nyquist sampling threshold met retroactively. status flipped
  draft → complete (Phase 32 shipped 2026-04-24).
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Config file** | `vitest.config.ts` — `test: { globals: true, environment: 'jsdom', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] }` |
| **Quick run command** | `npx vitest run <pattern>` — e.g., `npx vitest run src/quality/metrics/__tests__/` |
| **Full suite command** | `npm test` (resolves to `vitest run`) |
| **Estimated runtime** | ~28 seconds (baseline 868 tests post-Phase 31) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <files-touched-by-this-task>` for quick feedback (<2s for targeted per-metric test).
- **After every plan wave:** Run `npm test` full suite — must be green per D-12 (no broken intermediate states). Also `npx tsc -b --noEmit`.
- **Before `/gsd-verify-work`:** Full suite must be green (≥ 868 passing / 0 failing — Phase 31 baseline preserved).
- **Max feedback latency:** 60 seconds (covers full-suite on CI-class hardware).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | EFF-R14-01 | — | 7 per-metric modules export correct hook names | unit | `npx vitest run src/quality/metrics/__tests__/providers-smoke.test.tsx` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 1 | EFF-R14-02 | — | Shared-symbol regression rejected; 7 providers populate independently | unit | `npx vitest run src/quality/metrics/__tests__/providers-smoke.test.tsx` | ❌ W0 | ⬜ pending |
| 32-02-01 | 02 | 2 | EFF-R14-03 | — | `useQualityMetrics()` facade returns pre-split shape | regression | `npx vitest run src/__tests__/quality-overview.test.tsx` | ✅ | ⬜ pending |
| 32-02-02 | 02 | 2 | EFF-R14-06 | — | 7 test wrappers + 1 `vi.mock` migrated to composite | aggregate | `npm test` | ✅ | ⬜ pending |
| 32-03-01 | 03 | 3 | EFF-R14-05 | — | 7 producer sites push via per-metric hooks | regression | `npx vitest run src/__tests__/completeness-hook.test.tsx src/__tests__/plausibility-panel.test.tsx src/__tests__/lab-ranges-panel.test.tsx src/__tests__/references-panel.test.tsx src/__tests__/duplicates-panel.test.tsx` | ✅ | ⬜ pending |
| 32-03-02 | 03 | 3 | EFF-R14-04 | — | `<MetricTile>` decomposition; per-metric consumer sites migrated | regression | `npx vitest run src/__tests__/quality-overview.test.tsx` | ✅ | ⬜ pending |
| 32-04-01 | 04 | 4 | EFF-R14-04 | — | Per-tile Profiler isolation: `setCompleteness(42)` re-renders only Completeness tile | unit | `npx vitest run src/__tests__/metrics-isolation.test.tsx` | ❌ W0 | ⬜ pending |
| 32-04-02 | 04 | 4 | all | — | Full regression: 868+ passing / 0 failing + tsc clean | aggregate | `npm test && npx tsc -b --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs, plan decomposition, and exact commit boundaries are the planner's call — the above is a sampling-rate reference, not a locked task list.*

---

## Wave 0 Requirements

New test files (do NOT exist — Plan 32-04 creates them):

- [ ] `src/quality/metrics/__tests__/providers-smoke.test.tsx` — 7-provider smoke test for EFF-R14-02
  - Mounts `<QualityMetricsProviders>` around a harness that calls all 7 `use<Metric>Rollup()` hooks
  - Asserts each hook returns a non-no-op context
  - Rejects shared-symbol regression (if two contexts alias, one hook would return another's value — fails the assertion)
- [ ] `src/__tests__/metrics-isolation.test.tsx` (or `src/components/quality/__tests__/OverviewStrip.isolation.test.tsx` — planner's choice) — Profiler per-tile isolation for EFF-R14-04
  - Wraps the decomposed `<MetricTile key={k}>` children in per-tile `<Profiler id={k}>` wrappers
  - Triggers `setCompleteness(42)` via a test harness (acts as a producer)
  - Asserts Completeness Profiler's `onRender({ phase: 'update' })` fired exactly once; the other 6 tile Profilers fired zero `phase: 'update'` callbacks
  - MUST filter on `phase === 'update'` (mount phase would mask the signal)
  - MUST NOT wrap in `<StrictMode>` (would double every count)

No framework installs needed — Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 already installed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual parity — OverviewStrip tiles render identically pre/post refactor | EFF-R14-04 (partial) | Profiler asserts render counts, not pixel output; visual regression would need Playwright (out of scope) | Manual smoke: run dev server, navigate to `/quality`, confirm all 7 metric tiles render with values when a sample run completes; PDF export still generates with correct overall percentages |
| React DevTools profiler confirms per-tile isolation in real browser | EFF-R14-04 (supplemental) | Vitest Profiler test proves the contract; browser profiler is useful diagnostic but not a gate | Open React DevTools Profiler tab, record a sample run, confirm only the metric-under-update's tile shows re-render |

*Manual verifications are supplemental — all 6 acceptance criteria have automated coverage.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (2 new test files)
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 60s (full suite ~28s)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
