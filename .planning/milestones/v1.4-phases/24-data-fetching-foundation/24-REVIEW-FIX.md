---
phase: 24-data-fetching-foundation
fixed_at: 2026-04-17T00:00:00Z
review_path: .planning/phases/24-data-fetching-foundation/24-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-04-17
**Source review:** `.planning/phases/24-data-fetching-foundation/24-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: Non-primitive deps cause silent run cancellation on parent re-render

**Files modified:** `src/hooks/useDuplicateReport.ts`, `src/hooks/useLabRangesReport.ts`, `src/hooks/useReferenceReport.ts`, `src/hooks/usePlausibilityReport.ts`
**Commit:** 3ae0bee
**Applied fix:** Added `useMemo` import to all four hooks and introduced stable primitive string keys (`typesKey`, `patientKey`, `settingsKey`) before each `useAsyncRun` call. The keys are computed via `types.join(',')`, `patientIds?.slice().sort().join(',') ?? ''`, and `JSON.stringify(settings ?? null)` respectively. The `deps` arrays in all four hooks now use these stable primitive keys instead of the raw array/object props, matching the pattern already established in `useCompletenessReport.ts`. The runner bodies continue to reference the original props directly (not the key strings), so runtime behavior is unchanged — only the deps stability is improved.

- `useDuplicateReport.ts`: added `typesKey` and `patientKey`; deps changed from `[client, types, sampleSize, patientIds]` to `[client, typesKey, sampleSize, patientKey]`
- `useLabRangesReport.ts`: added `patientKey` and `settingsKey`; deps changed from `[client, sampleSize, settings, patientIds]` to `[client, sampleSize, settingsKey, patientKey]`
- `useReferenceReport.ts`: added `patientKey`; deps changed from `[client, resourceType, sampleSize, patientIds]` to `[client, resourceType, sampleSize, patientKey]`
- `usePlausibilityReport.ts`: added `useMemo` import (previously had no react import), added `patientKey` and `settingsKey`, restructured from a direct `return useAsyncRun(...)` to a two-step form that computes keys then returns; deps changed from `[client, resourceType, sampleSize, settings, patientIds]` to `[client, resourceType, sampleSize, settingsKey, patientKey]`

---

### WR-02: Cancellation check missing in `useReferenceReport` progress callback window

**Files modified:** `src/hooks/useReferenceReport.ts`
**Commit:** 01d4925
**Applied fix:** Added a second `if (isCancelled()) return;` guard immediately before the `setBrokenCount` and `setOrphanCount` calls (between the synchronous computation of `brokenIssues`/`orphanIssues` and the React state writes). This closes the window between the last `onProgress` invocation inside `checkReferencesExist` and the direct `setState` calls, preventing stale accessory state from being written after a cancellation.

---

### WR-03: `useAsyncRun` cleanup cancels in-flight runs on any dep change, undocumented for `autoStart: false`

**Files modified:** `src/hooks/useAsyncRun.ts`
**Commit:** 9351f4f
**Applied fix:** Expanded the JSDoc for the `deps` field in `UseAsyncRunArgs` to explicitly document that any change in `deps` identity also cancels the currently-running async run via effect cleanup, and that this applies even when `autoStart` is false. The updated comment states that all elements MUST be primitives or stable references, making the invariant visible to callers reading only the interface.

---

_Fixed: 2026-04-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
