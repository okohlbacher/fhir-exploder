---
phase: 18-quality-alerting-thresholds
plan: 01
subsystem: quality
tags: [localStorage, thresholds, pure-helpers, hooks, mantine-hooks, vitest]

# Dependency graph
requires:
  - phase: 16-17 (data quality checks)
    provides: per-metric scores in QualityMetricsContext that thresholds gate against
provides:
  - MetricKey union + METRIC_LABELS + METRIC_ROUTES constants (single source of truth)
  - DEFAULT_THRESHOLDS (D-08 shipped defaults: completeness 80, coverage 70, validation 95, plausibility 99, labRanges 95, duplicates 99, references 98)
  - STORAGE_KEY constant ('quality.thresholds.v1', D-09)
  - Thresholds type (Partial<Record<MetricKey, number | null>>, three-state override)
  - resolveThreshold pure helper (absent=default, null=disabled, number=custom)
  - isBreached pure helper (value < threshold, null-safe both ways)
  - useThresholds React hook binding overrides to localStorage via Mantine useLocalStorage
affects: [18-02-context-extension, 18-03-thresholds-page-summary-card, 18-04-overview-strip]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useLocalStorage wrapper hook returning curried helpers (mirrors useSampleSize)"
    - "Three-state override precedence via `in` operator + nullish coalescing (NOT spread merge, per Pitfall 1 in 18-RESEARCH)"
    - "Wave 0 it.todo stub -> Wave 1 real assertions pattern for TDD within a single plan"

key-files:
  created:
    - src/quality/thresholds.ts
    - src/hooks/useThresholds.ts
    - src/__tests__/thresholds.test.ts
  modified: []

key-decisions:
  - "DEFAULT_THRESHOLDS values encoded exactly per D-08 — breaches show on first load without user setup"
  - "STORAGE_KEY is global (not keyed by server URL) per D-09 — single thresholds profile across all Blaze connections"
  - "resolveThreshold uses `in` operator + `??` to preserve null-as-disabled semantics; spread merge would collapse null onto default"
  - "useThresholds returns 8-member object (stored, defaults, setThreshold, clearThreshold, resetThreshold, resetAll, isBreached, getActiveThreshold) with curried helpers"
  - "resetThreshold (removes key, falls back to default) is distinct from clearThreshold (stores null, explicitly disables)"

patterns-established:
  - "Pure-helper first + hook second: domain constants/functions live in src/quality/<module>.ts with zero React imports; hook in src/hooks/use<Module>.ts wraps localStorage"
  - "Three-state override: undefined=default, null=disabled, number=custom — documented in JSDoc header of thresholds.ts"
  - "Stub file with it.todo ships in the same plan as the implementation — avoids cross-plan test-infrastructure dependencies"

requirements-completed:
  - DQ-11

# Metrics
duration: ~15 min
completed: 2026-04-14
---

# Phase 18 Plan 01: Thresholds Foundation Summary

**Storage-and-helpers foundation for Phase 18 quality alerting: MetricKey types, D-08 default thresholds, three-state override precedence helpers, and a `useThresholds` hook backed by Mantine `useLocalStorage` under key `quality.thresholds.v1`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-14T13:55:00Z (approx, worktree agent af1a1723)
- **Completed:** 2026-04-14T13:02:10Z
- **Tasks:** 3/3
- **Files created:** 3

## Accomplishments
- Shipped `src/quality/thresholds.ts` with all 8 required exports (MetricKey, METRIC_LABELS, METRIC_ROUTES, DEFAULT_THRESHOLDS, STORAGE_KEY, Thresholds, resolveThreshold, isBreached) and JSDoc documenting D-10 three-state semantics.
- Shipped `src/hooks/useThresholds.ts` exposing the 8-member curried API required by Plans 02/03/04 (stored, defaults, setThreshold, clearThreshold, resetThreshold, resetAll, isBreached, getActiveThreshold).
- 12 passing vitest assertions covering constants, resolveThreshold precedence, isBreached edge cases, and useThresholds round-trip through localStorage.
- Zero new TypeScript errors introduced — plan files compile cleanly on their own.

## Task Commits

Each task was committed atomically (`--no-verify` per parallel executor convention):

1. **Task 1: Wave 0 stub for thresholds helpers + useThresholds hook** - `c18a968` (test)
2. **Task 2: Implement thresholds.ts and useThresholds.ts** - `2bd149d` (feat)
3. **Task 3: Fill in real assertions and confirm green** - `540bab5` (test)

_TDD flow followed for each task; test commits sandwich the feat commit._

## Files Created/Modified
- `src/quality/thresholds.ts` — **NEW.** Pure domain module. MetricKey union (7 keys), METRIC_LABELS (human labels), METRIC_ROUTES (Tabs.Tab values), DEFAULT_THRESHOLDS (D-08), STORAGE_KEY ('quality.thresholds.v1'), Thresholds type, resolveThreshold + isBreached helpers. ~66 lines incl. JSDoc.
- `src/hooks/useThresholds.ts` — **NEW.** React hook wrapping `@mantine/hooks` useLocalStorage. Returns `UseThresholdsReturn` with 8 stable callbacks. Mirrors useSampleSize pattern from SampleSizeControl.tsx.
- `src/__tests__/thresholds.test.ts` — **NEW.** Vitest suite, 12 `it(...)` blocks, beforeEach clears localStorage. Uses `@testing-library/react`'s renderHook+act for the hook tests.
- `.planning/phases/18-quality-alerting-thresholds/deferred-items.md` — **NEW.** Logs pre-existing TypeScript strict-mode errors in unrelated files (completenessWalker, profileConformanceChecker, temporalPlausibilityWalker) as out-of-scope tech debt for a future DEBT-03 ticket. Not blocking this plan.

## Decisions Made
- **Typed the hook return value explicitly** (`UseThresholdsReturn` interface) rather than relying on inference — gives downstream Plans 02/03/04 a nominal type they can import if needed.
- **Kept helpers pure** — no console logs, no feature flags, no debug paths. The hook is the only state-holding surface.
- **Added a small type-level compile check (`const _metricKeyTypeCheck: MetricKey = 'completeness'`)** at the bottom of the test file — catches any accidental union narrowing at TS compile time without costing a runtime assertion. Not strictly required by the plan but very low cost.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scope Boundary logged (not fixed)**
- **Found during:** Task 2 verification (`npx tsc -b --noEmit`)
- **Issue:** Pre-existing TS2352 errors in `src/quality/completenessWalker.ts`, `src/quality/profileConformanceChecker.ts`, and `src/quality/temporalPlausibilityWalker.ts` (unsafe Resource -> Record<string, unknown> casts). Confirmed pre-existing via `git stash` roundtrip — they exist on the base commit before any Plan 18-01 changes.
- **Fix:** None applied. Per Scope Boundary rule, only auto-fix issues directly caused by current task. Logged to `.planning/phases/18-quality-alerting-thresholds/deferred-items.md` for future DEBT-03 ticket.
- **Files modified:** `.planning/phases/18-quality-alerting-thresholds/deferred-items.md` (new)
- **Verification:** `git stash && tsc && git stash pop` showed identical errors before Plan 18-01 files existed.
- **Committed in:** Not committed separately — deferred-items.md will be picked up by the final phase verification commit.

---

**Total deviations:** 1 logged (no code changes)
**Impact on plan:** Zero — all 3 Plan 18-01 files compile cleanly in isolation. Pre-existing errors belong to a future tech-debt ticket.

## Issues Encountered
None. TDD flow ran clean: Wave 0 stub compiled (with expected unused-import warning on `it.todo` file), Task 2 implementation satisfied the stub's imports, Task 3 activated the real assertions and all 12 passed on first run.

## Known Stubs
None. `grep -E "(TODO|FIXME|placeholder|coming soon)"` returns zero matches across the three new files.

## Notes for Plan 02/03/04 Executors

- **Import from `src/quality/thresholds`** for all constants + types. Do NOT re-declare `MetricKey` or `STORAGE_KEY` — they are single-sourced here.
- **Import `useThresholds` from `src/hooks/useThresholds`**. Returns a stable object; destructure what you need.
- **METRIC_ROUTES semantics:** keys map to Tabs.Tab `value` strings — `labRanges` -> `'lab-ranges'` (hyphenated), all others identity-mapped. Keep in sync with `QualityOverviewPage.tsx` Tab values when editing either.
- **Three-state override:** when writing UI (Plan 03), the NumberInput must represent `undefined` (fall-back) and `null` (disabled) distinctly from a numeric value. The plan spec in 18-UI-SPEC lines for the Thresholds page describes the visual encoding.
- **`isBreached(key, value | undefined)` is the only signature downstream consumers should use.** The pure `isBreached(value, threshold)` is an implementation detail exported only for unit testing.
- **Hook returns `defaults` by reference** (it IS DEFAULT_THRESHOLDS, not a copy) — treat as read-only.
- **setStored in useLocalStorage accepts functional updates** (`(prev) => next`); all mutators in useThresholds use this form to avoid stale-closure bugs when multiple calls happen inside a single React commit.

## User Setup Required
None — no external services. localStorage is browser-native.

## Next Phase Readiness
- Plan 02 (context extension) can import `MetricKey` + `Thresholds` and wire useThresholds into QualityMetricsContext without further infrastructure work.
- Plan 03 (ThresholdsPage + SummaryCard) can use the 8-member API for the NumberInput / Reset / Disable controls directly.
- Plan 04 (OverviewStrip) can use `isBreached(key, value)` to decide on the red badge + pulse animation described in UI-SPEC.
- Zero blockers for Wave 2+ plans.

## Self-Check: PASSED

- `src/quality/thresholds.ts` — FOUND
- `src/hooks/useThresholds.ts` — FOUND
- `src/__tests__/thresholds.test.ts` — FOUND
- `.planning/phases/18-quality-alerting-thresholds/deferred-items.md` — FOUND
- Commit `c18a968` (Task 1) — FOUND
- Commit `2bd149d` (Task 2) — FOUND
- Commit `540bab5` (Task 3) — FOUND
- `npx vitest run src/__tests__/thresholds.test.ts` — 12/12 PASS
- `grep "quality.thresholds.v1" src/quality/thresholds.ts` — 1 match (line 57)
- `grep -c "it.todo" src/__tests__/thresholds.test.ts` — 0
- `grep -cE "^\s*it\('" src/__tests__/thresholds.test.ts` — 12

---
*Phase: 18-quality-alerting-thresholds*
*Plan: 01*
*Completed: 2026-04-14*
