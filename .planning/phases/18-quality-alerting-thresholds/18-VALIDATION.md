---
phase: 18
slug: quality-alerting-thresholds
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
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
| 18-XX-XX | TBD  | 0    | DQ-11 | — | Stub `thresholds.test.ts` compiles | unit | `npm test -- thresholds` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 0    | DQ-11 | — | Stub `thresholds-page.test.tsx` compiles | integration | `npm test -- thresholds-page` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 0    | DQ-12 | — | Stub `summary-card.test.tsx` compiles | integration | `npm test -- summary-card` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 0    | DQ-12 | — | Stub `lab-ranges-panel.test.tsx` compiles | integration | `npm test -- lab-ranges-panel` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 0    | DQ-12 | — | Stub `references-panel.test.tsx` compiles | integration | `npm test -- references-panel` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 1    | DQ-11 | — | `DEFAULT_THRESHOLDS` constant exists with 7 keys | unit | `npm test -- thresholds` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 1    | DQ-11 | — | `useThresholds` merges overrides over defaults | unit | `npm test -- thresholds` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 1    | DQ-11 | — | `useThresholds` persists to `quality.thresholds.v1` | unit | `npm test -- thresholds` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 1    | DQ-12 | — | `isBreached` handles `undefined` / `null` correctly | unit | `npm test -- thresholds` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 1    | DQ-12 | — | `SummaryCard breached={true}` renders red ring + annotation | integration | `npm test -- summary-card` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `OverviewStrip` renders 9 tiles (2 info + 7 metric) | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `OverviewStrip` tile turns red on threshold breach | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `OverviewStrip` tile renders em-dash when value undefined (D-17/D-18) | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | Metric tile click navigates to `/quality?tab=<metric>` | integration | `npm test -- quality-overview` | ✅ (extend) | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `ValidationPanel` pushes `overallValidation` on complete | integration | `npm test -- validation-panel` | ✅ (extend) | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `PlausibilityPanel` pushes `overallPlausibility` on complete | integration | `npm test -- plausibility-panel` | ⚠ verify | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `LabRangesPanel` pushes `overallLabRanges` (undefined when noRange===checked) | integration | `npm test -- lab-ranges-panel` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `DuplicatesPanel` pushes `overallDuplicates` | integration | `npm test -- duplicates-panel` | ✅ (extend) | ⬜ pending |
| 18-XX-XX | TBD  | 2    | DQ-12 | — | `ReferencesPanel` pushes `overallReferences` | integration | `npm test -- references-panel` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 3    | DQ-11 | — | `ThresholdsPage` renders 7 rows with current values | integration | `npm test -- thresholds-page` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 3    | DQ-11 | — | NumberInput blur commits value to storage | integration | `npm test -- thresholds-page` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 3    | DQ-11 | — | Clear ActionIcon sets key to null | integration | `npm test -- thresholds-page` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 3    | DQ-11 | — | Reset modal clears all overrides on confirm | integration | `npm test -- thresholds-page` | ❌ W0 | ⬜ pending |
| 18-XX-XX | TBD  | 3    | DQ-11 | — | Config persists across remount (localStorage round-trip) | integration | `npm test -- thresholds-page` | ❌ W0 | ⬜ pending |

*Task IDs will be resolved to concrete `18-NN-MM` values by the planner. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/thresholds.test.ts` — stubs for `useThresholds`, `DEFAULT_THRESHOLDS`, `resolveThreshold`, `isBreached` (DQ-11, DQ-12)
- [ ] `src/__tests__/thresholds-page.test.tsx` — stubs for `ThresholdsPage` table / inputs / reset modal (DQ-11)
- [ ] `src/__tests__/summary-card.test.tsx` — stubs for `SummaryCard` breach props + click + ariaLabel (DQ-12)
- [ ] `src/__tests__/lab-ranges-panel.test.tsx` — stubs for rollup push (DQ-12) — new file
- [ ] `src/__tests__/references-panel.test.tsx` — stubs for rollup push (DQ-12) — new file
- [ ] `src/__tests__/plausibility-panel.test.tsx` — stubs for rollup push (DQ-12) — confirm or create

*Framework install NOT needed — vitest 4.1.4 + testing-library/react 16.3.2 already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Red ring shade visually matches design system (`red.6`) | DQ-12 | Visual judgment | Load `/quality`, breach completeness, confirm ring matches Mantine `red.6` per UI-SPEC. |
| Responsive grid at 9 tiles wraps cleanly at mobile/tablet/desktop | DQ-12 | Responsive layout | Resize viewport through xs/sm/md/lg; verify no overflow, no empty trailing columns. |
| Keyboard navigation (Tab into tile → Enter → navigates to tab) | DQ-12 | Manual a11y check | Tab through OverviewStrip tiles; verify focus ring visible; Enter navigates to correct tab. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 new test files + 1 confirm)
- [ ] No watch-mode flags (use `vitest run`, not `vitest`)
- [ ] Feedback latency < 30 s
- [ ] `nyquist_compliant: true` set in frontmatter (flip after planner finalizes task IDs)

**Approval:** pending
