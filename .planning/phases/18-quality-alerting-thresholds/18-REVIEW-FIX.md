---
phase: 18-quality-alerting-thresholds
fixed_at: 2026-04-14T13:45:00Z
review_path: .planning/phases/18-quality-alerting-thresholds/18-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-04-14T13:45:00Z
**Source review:** `.planning/phases/18-quality-alerting-thresholds/18-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (all warnings; 7 info findings deferred)
- Fixed: 4
- Skipped: 0

All four Warning findings fixed. No Critical findings existed. Info findings (IN-01 through IN-07) are out of scope for this pass. No regressions introduced — full test suite results pre-fix (450 passed, 21 failed) vs. post-fix (451 passed, 21 failed); the +1 passed is the new regression test for WR-03. The 21 failing tests are pre-existing and unrelated to Phase 18.

## Fixed Issues

### WR-03: `resolveThreshold` collapses `undefined` value of present key to `null`

**Files modified:** `src/quality/thresholds.ts`, `src/__tests__/thresholds.test.ts`
**Commit:** 4989cf3
**Applied fix:** Replaced the `stored[key] ?? null` collapse with an explicit three-state ladder (`key in stored → check v === null / typeof v === 'number' → fall back to default`). Added a regression test that feeds `{ completeness: undefined }` and asserts the default (80) is returned. Verified via `npx vitest run src/__tests__/thresholds.test.ts` (13/13 pass) and `npx tsc --noEmit` clean.

---

### WR-01: Panel rollup percentages are not clamped to [0, 100]

**Files modified:** `src/quality/percent.ts` (new), `src/components/quality/ValidationPanel.tsx`, `src/components/quality/PlausibilityPanel.tsx`, `src/components/quality/LabRangesPanel.tsx`, `src/components/quality/DuplicatesPanel.tsx`, `src/components/quality/ReferencesPanel.tsx`
**Commit:** 51d6f2b
**Applied fix:** Added `percentClean(affected, total)` in a new `src/quality/percent.ts` module. The helper guards on `!Number.isFinite(total) || total <= 0` (returns `undefined`, not 0 — pitfall 7) and additionally guards on non-finite `affected`, then clamps the rounded percentage to `[0, 100]`. Updated all five panel rollup `useEffect`s to call `percentClean(...)` and drop their duplicated `total === 0 → undefined` guards. Extra care taken in two spots: (a) LabRangesPanel preserves its distinct `noRange === summary.checked → undefined` branch (semantically different from "no data"); (b) DuplicatesPanel's `hashType.percentClean` field requires a number — when `percentClean` returns `undefined` the whole `hashType` contribution is omitted rather than passing an invalid shape. Verified via `npx vitest run` on the four panel test files (17/17 pass) and `npx tsc --noEmit` clean.

---

### WR-02: Two distinct hooks both named `useQualityMetrics`

**Files modified:** `src/hooks/useQualityMetrics.ts` → renamed to `src/hooks/useResourceCountsMetrics.ts`, `src/components/quality/QualityOverviewPage.tsx`, `src/__tests__/quality-counts.test.ts`
**Commit:** f4ec61c
**Applied fix:** Took the "fewer call sites" option suggested in the review: renamed the per-type resource counts hook (only 2 call sites: `QualityOverviewPage.tsx` and `quality-counts.test.ts`) to `useResourceCountsMetrics`. Renamed the exported interface from `QualityMetrics` → `ResourceCountsMetrics`. Used `git mv` so the file-rename is tracked as a rename in git rather than delete+add. Added a JSDoc paragraph to the renamed hook explaining the rename and distinguishing it from the rollup-context hook in `quality/QualityMetricsContext.tsx` (which keeps its `useQualityMetrics` name, the "winner" of the naming collision). All 12 call sites of the context hook are untouched. Verified via `npx tsc --noEmit` clean and `npx vitest run src/__tests__/quality-counts.test.ts` pass.

---

### WR-04: `useThresholds.useLocalStorage` async hydration causes a one-frame breach flicker on first paint

**Files modified:** `src/hooks/useThresholds.ts`
**Commit:** 6c85217
**Applied fix:** Added a `hydrated` state flag that flips to `true` inside a mount-once `useEffect`. Wrapped the `isBreached` callback to return `false` until `hydrated` is true, preventing the one-frame red tile flash on page load when a user has `validation: null` (or any disabled metric) stored. Exposed `hydrated` on the hook's return shape for callers that want finer-grained control (and for future test assertions). `stored` and `getActiveThreshold` are intentionally NOT gated — the settings page benefits from the natural hydration progression rather than being suppressed. Added a detailed JSDoc block explaining the hydration contract. Verified via `npx tsc --noEmit` clean and `npx vitest run src/__tests__/thresholds.test.ts src/__tests__/thresholds-page.test.tsx` (24/24 pass).

## Skipped Issues

None.

---

_Fixed: 2026-04-14T13:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
