---
phase: 51-v17-gap-closure-summary-util-graph-context
fixed_at: 2026-05-02T00:00:00Z
review_path: .planning/phases/51-v17-gap-closure-summary-util-graph-context/51-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 51: Code Review Fix Report

**Fixed at:** 2026-05-02T00:00:00Z
**Source review:** .planning/phases/51-v17-gap-closure-summary-util-graph-context/51-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: Duplicate `extractDate` in PatientTimeline.tsx diverges from canonical timeline-utils.ts version

**Files modified:** `src/components/patients/PatientTimeline.tsx`
**Commit:** afcdc39
**Applied fix:** Removed the local `extractDate` function (lines 59-73) and the `toRecord` import. Added `import { extractDate } from '../../utils/timeline-utils'` so `PatientTimeline` uses the same typed switch-based implementation as `ClinicalTimeline`. The call site `if (!date) continue;` handles both `null` and `undefined` so no other changes were needed.

### WR-02: Silent empty-string fallback for missing `resource.id` produces unroutable graph node

**Files modified:** `src/components/explorer/ResourceGraphNode.tsx`
**Commit:** 7a1f8d8
**Applied fix:** Added an explicit `if (!id) { return; }` guard at the top of `safeNavigate` so id-less nodes fail fast with a clear comment. Also changed `cursor: 'pointer'` to `cursor: id ? 'pointer' : 'default'` so the card is visually non-interactive when no id is present.

### WR-03: `ClinicalTimeline.useEffect` does not reset `entries` state on re-run

**Files modified:** `src/components/patients/ClinicalTimeline.tsx`
**Commit:** e1ae6e9
**Applied fix:** Added `setEntries([])` alongside the existing `setLoading(true)` and `setError(undefined)` resets at the top of the `useEffect` body. This aligns `ClinicalTimeline` with `PatientTimeline`'s `setEvents([])` pattern and eliminates the flash of stale data when navigating between patients.

---

_Fixed: 2026-05-02T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
