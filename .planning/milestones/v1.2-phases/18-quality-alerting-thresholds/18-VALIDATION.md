---
phase: 18
slug: quality-alerting-thresholds
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-14
updated: 2026-04-14
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + @testing-library/react 16.3.2 (jsdom env, globals enabled) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- <pattern>` (e.g. `npm test -- thresholds`) |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~10–30 seconds (full suite on this codebase) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <the-file-just-touched>` (1–2 s)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite green AND `npm run build` clean
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01   | 0    | DQ-11 | T-18-01 | Stub `thresholds.test.ts` compiles | unit | `npm test -- thresholds` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03   | 0    | DQ-11 / DQ-12 | — | Stubs `thresholds-page.test.tsx` + `summary-card.test.tsx` compile | integration | `npm test -- thresholds-page summary-card` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02   | 0    | DQ-12 | — | Stubs `lab-ranges-panel.test.tsx` + `references-panel.test.tsx` + `plausibility-panel.test.tsx` compile | integration | `npm test -- lab-ranges-panel references-panel plausibility-panel` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01   | 1    | DQ-11 | T-18-01 | `DEFAULT_THRESHOLDS` constant exists with 7 keys; `useThresholds` merges overrides over defaults and persists to `quality.thresholds.v1`; `isBreached` + `resolveThreshold` handle null/undefined correctly | unit | `npm test -- thresholds` | ✅ (Task 18-01-01) | ⬜ pending |
| 18-01-03 | 01   | 1    | DQ-11 / DQ-12 | — | 12 `thresholds.test.ts` assertions all pass (constants, resolveThreshold, isBreached, useThresholds round-trip) | unit | `npm test -- thresholds` | ✅ (Task 18-01-01) | ⬜ pending |
| 18-03-02 | 03   | 2    | DQ-12 | — | `SummaryCard` accepts breached/threshold/onClick/ariaLabel; breached={true} renders red ring + annotation | integration | `npm test -- summary-card` | ✅ (Task 18-03-01) | ⬜ pending |
| 18-03-03 | 03   | 2    | DQ-12 | — | `SummaryCard` tests filled with real assertions (click, breached color, annotation text) | integration | `npm test -- summary-card` | ✅ (Task 18-03-01) | ⬜ pending |
| 18-02-02 | 02   | 2    | DQ-12 | — | `QualityMetricsContext` exposes 7 `overall*` + `duplicatesBreakdown` + 6 explicit `setOverall*` setters + `setDuplicatesContribution` (NO `setOverallDuplicates`); `overallDuplicates` is DERIVED from breakdown | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |
| 18-02-03 | 02   | 2    | DQ-12 | — | `ValidationPanel` pushes `overallValidation = round((1 - unique(allNormalizedIssues)/total)*100)` on terminal; `PlausibilityPanel` pushes `overallPlausibility` same shape | integration | `npm test -- validation-panel plausibility-panel` | ✅ / ✅ (Task 18-02-01) | ⬜ pending |
| 18-02-04 | 02   | 2    | DQ-12 | T-18-06 | `LabRangesPanel` pushes `overallLabRanges` (undefined when `summary.noRange === summary.checked`); `ReferencesPanel` pushes `overallReferences` using `sampleSize` (NOT batch total) | integration | `npm test -- lab-ranges-panel references-panel` | ✅ (Task 18-02-01) | ⬜ pending |
| 18-02-05 | 02   | 2    | DQ-12 | T-18-07 | `DuplicatesPanel` pushes `{ patient, hashType: { resourceType, percentClean } }` via `setDuplicatesContribution`; `resourceType` in dep array so re-runs widen breakdown; NO `setOverallDuplicates` reference | integration | `npm test -- duplicates-panel` | ✅ (extend) | ⬜ pending |
| 18-02-06 | 02   | 2    | DQ-12 | — | Rollup-push test assertions filled (LabRanges/References/Plausibility) + NEW DuplicatesPanel per-type averaging describe block (4 it blocks) | integration | `npm test -- lab-ranges-panel references-panel plausibility-panel duplicates-panel` | ✅ | ⬜ pending |
| 18-03-04 | 03   | 2    | DQ-11 | — | `ThresholdsPage` renders 7 rows with current values; NumberInput blur commits; Clear ActionIcon sets null; Reset modal writes `{}`; route wired at `/quality/thresholds`; toolbar button navigates | integration | `npm test -- thresholds-page` | ✅ (Task 18-03-01) | ⬜ pending |
| 18-03-05 | 03   | 2    | DQ-11 | — | `thresholds-page.test.tsx` assertions filled: table rows, NumberInput blur, Clear, Reset modal, localStorage round-trip | integration | `npm test -- thresholds-page` | ✅ (Task 18-03-01) | ⬜ pending |
| 18-04-01 | 04   | 3    | DQ-12 | T-18-04-01 / T-18-04-03 | `OverviewStrip` renders 9 tiles (2 info + 7 metric), metric tiles read context + `useThresholds`; breached→red; em-dash for undefined; 9-Skeleton loading state; metric tile onClick navigates `/quality?tab=<route>` | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |
| 18-04-02 | 04   | 3    | DQ-12 | T-18-04-01 | `QualityOverviewPage` Tabs controlled by `?tab=` search param; `VALID_TABS` guard; `replace: true` on switch; invalid tab falls back to Counts | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |
| 18-04-03 | 04   | 3    | DQ-12 | T-18-04-05 | `quality-overview.test.tsx` extended with 7-test describe block: 9 tiles, em-dash, breached Completeness (72 < 80 → threshold annotation), click→navigate, `?tab=duplicates` activates tab, invalid tab falls back to Counts | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Wave structure (after Plan 03 wave correction 2026-04-14):**
- Wave 0 (3 parallel tasks): test-stub creation — Plans 01, 02, 03 each create their own stubs
- Wave 1: Plan 01 only (thresholds helpers + useThresholds + unit tests)
- Wave 2 (parallel, both depend only on 18-01): Plan 02 (panel rollups + context) AND Plan 03 (SummaryCard + ThresholdsPage + route)
- Wave 3: Plan 04 (OverviewStrip 9-tile + controlled Tabs) — depends on 18-01, 18-02, 18-03

---

## Wave 0 Requirements

- [ ] `src/__tests__/thresholds.test.ts` — 12 `it.todo` stubs for `useThresholds`, `DEFAULT_THRESHOLDS`, `resolveThreshold`, `isBreached` (DQ-11, DQ-12) — Plan 01 Task 1 (18-01-01)
- [ ] `src/__tests__/thresholds-page.test.tsx` — stubs for `ThresholdsPage` table / inputs / reset modal (DQ-11) — Plan 03 Task 1 (18-03-01)
- [ ] `src/__tests__/summary-card.test.tsx` — stubs for `SummaryCard` breach props + click + ariaLabel (DQ-12) — Plan 03 Task 1 (18-03-01)
- [ ] `src/__tests__/lab-ranges-panel.test.tsx` — stubs for rollup push (DQ-12) — Plan 02 Task 1 (18-02-01)
- [ ] `src/__tests__/references-panel.test.tsx` — stubs for rollup push (DQ-12) — Plan 02 Task 1 (18-02-01)
- [ ] `src/__tests__/plausibility-panel.test.tsx` — stubs for rollup push (DQ-12) — Plan 02 Task 1 (18-02-01) (append if file exists)

*Framework install NOT needed — vitest 4.1.4 + testing-library/react 16.3.2 already installed.*

*The executor flips `wave_0_complete: true` after all six stub files exist and `npm test` passes with the `it.todo` entries listed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Red ring shade visually matches design system (`red.6`) | DQ-12 | Visual judgment | Load `/quality`, breach completeness, confirm ring matches Mantine `red.6` per UI-SPEC. |
| Responsive grid at 9 tiles wraps cleanly at mobile/tablet/desktop | DQ-12 | Responsive layout | Resize viewport through xs/sm/md/lg; verify no overflow, no empty trailing columns. |
| Keyboard navigation (Tab into tile → Enter → navigates to tab) | DQ-12 | Manual a11y check | Tab through OverviewStrip tiles; verify focus ring visible; Enter navigates to correct tab. |
| Duplicates tile widens as user runs more types | DQ-12 | End-to-end with real Blaze | In Duplicates tab: run Patient only → note tile score. Switch to Observation → run → note tile score updates to mean of patient+Observation. Switch to Encounter → run → tile updates to mean of all three. Verifies per-type averaging behavior (RESOLVED 2026-04-14 RESEARCH Q1). |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (5 new test files + 1 confirm in Plan 02 Task 1, plus Plans 01 and 03 Task 1 stubs)
- [x] No watch-mode flags (use `vitest run`, not `vitest`)
- [x] Feedback latency < 30 s
- [x] `nyquist_compliant: true` set in frontmatter (task IDs finalized 2026-04-14)

**Approval:** pending executor-side run of Wave 0 stubs.
