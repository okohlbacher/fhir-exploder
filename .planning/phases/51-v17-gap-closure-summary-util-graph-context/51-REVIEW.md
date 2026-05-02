---
phase: 51-v17-gap-closure-summary-util-graph-context
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/components/patients/PatientTimeline.tsx
  - src/components/patients/ClinicalTimeline.tsx
  - src/utils/timeline-utils.ts
  - src/__tests__/clinical-timeline.test.tsx
  - src/components/explorer/ResourceGraphNode.tsx
  - src/components/explorer/__tests__/ResourceGraphNode.test.tsx
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-05-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 51 introduces the `ClinicalTimeline` component (GAP-1), the `timeline-utils.ts` utility module, and the `ResourceGraphNode` patient-context navigation fix (GAP-2). The code is well-structured overall. The `ClinicalTimeline` correctly handles cancellation of in-flight async work, the `extractDate` function uses typed switch/cast in place of the older `toRecord` property-bag approach, and the `ResourceGraphNode` validation pattern is appropriately defensive.

Three warnings are raised: a duplicate `extractDate` implementation that diverges in behavior from the canonical one in `timeline-utils.ts`; a silent empty-string fallback for a missing resource `id` that could produce a non-navigable graph node; and missing cleanup of the `setEntries([])` reset in `ClinicalTimeline.useEffect` on re-runs. Four info items cover an unused import, a magic-number constant, a stale comment referencing a misleading non-usage, and a missing test coverage gap.

---

## Warnings

### WR-01: Duplicate `extractDate` in PatientTimeline.tsx diverges from canonical timeline-utils.ts version

**File:** `src/components/patients/PatientTimeline.tsx:59-73`

**Issue:** `PatientTimeline.tsx` defines its own local `extractDate` function using a generic `toRecord`-based property-bag walk. The canonical implementation lives in `src/utils/timeline-utils.ts` and uses a typed `switch` with resource-type-specific fallback chains that differ in coverage. For example, `PatientTimeline`'s version checks `'authoredOn'` and `'issued'` generically, while the canonical version's `Observation` branch returns `o.issued` only as a last resort after `effectiveDateTime` and `effectivePeriod.start`. The two implementations will disagree on date extraction for any resource where the generic walk finds a field earlier in its list than the typed branch would. This creates silent behavioral divergence between the horizontal `PatientTimeline` ribbon and the `ClinicalTimeline` list — the same patient could show different dates for the same resource depending on which component renders it.

**Fix:** Remove the local `extractDate` from `PatientTimeline.tsx` and import the shared one from `timeline-utils.ts`:

```typescript
// PatientTimeline.tsx — remove lines 59-73 (local extractDate)
// and add to imports at the top of the file:
import { extractDate } from '../../utils/timeline-utils';
```

Note: `timeline-utils.ts`'s `extractDate` returns `string | undefined` where the local version returns `string | null`. The call site at line 105 (`if (!date) continue;`) handles both falsy values, so no other changes are needed.

---

### WR-02: Silent empty-string fallback for missing `resource.id` produces unroutable graph node

**File:** `src/components/explorer/ResourceGraphNode.tsx:41`

**Issue:** `const id = resource.id ?? '';` silently falls through to an empty string when the resource has no server-assigned `id`. The `FHIR_ID_PATTERN` regex at line 26 requires at least one character (`^[A-Za-z0-9]`), so `FHIR_ID_PATTERN.test('')` returns `false` and `safeNavigate` silently returns without navigating. The result is a card the user can click but which does nothing — no error, no feedback. This is not a crash, but it is a latent usability bug if a transient or contained resource (e.g. one created inline without a server id) appears in the graph.

**Fix:** Guard explicitly and either omit the click handler or render the card non-interactive:

```typescript
const id = resource.id ?? '';

const safeNavigate = () => {
  if (!id) {
    // Resource has no server-assigned id — cannot navigate.
    return;
  }
  if (!FHIR_REFERENCE_PATTERN.test(type) || !FHIR_ID_PATTERN.test(id)) {
    return;
  }
  // ... existing navigation logic
};
```

Optionally, set `style={{ cursor: id ? 'pointer' : 'default' }}` in the Card so the click target is visually inert for id-less nodes.

---

### WR-03: `ClinicalTimeline.useEffect` does not reset `entries` state on re-run

**File:** `src/components/patients/ClinicalTimeline.tsx:60-125`

**Issue:** When `patientId` changes (navigating between patients), `useEffect` sets `loading: true` and clears `error`, but does not call `setEntries([])`. This means the previous patient's timeline entries remain visible during the loading skeleton phase of the next patient. `PatientTimeline.tsx` (the sibling component) correctly calls `setEvents([])` at line 91 before fetching. The inconsistency results in a flash of stale data between the loading skeleton and the new data arriving.

**Fix:** Add `setEntries([])` alongside the existing reset calls at the start of the effect:

```typescript
useEffect(() => {
  let cancelled = false;
  setLoading(true);
  setError(undefined);
  setEntries([]);          // <-- add this line

  const fetchAll = async () => {
    // ...
  };
  // ...
}, [client, patientId]);
```

---

## Info

### IN-01: Dead comment referencing non-usage of `resolveMiiIcon`

**File:** `src/components/patients/ClinicalTimeline.tsx:8-15`

**Issue:** Lines 8-15 contain a multi-line block comment explaining why `resolveMiiIcon` is "not imported" here. However, neither the import nor the function appear anywhere in the file — the comment describes something that was considered and rejected. This type of explanatory comment about code that does not exist is confusing to future readers who will search for `resolveMiiIcon` in vain.

**Fix:** Remove the comment block entirely (lines 7-15). The `extractDate` and `TimelineData` imports at line 15 stand on their own without justification.

---

### IN-02: Magic number `_count=100` in ClinicalTimeline search query

**File:** `src/components/patients/ClinicalTimeline.tsx:72`

**Issue:** The query string `'patient=Patient/${patientId}&_count=100&_sort=-_lastUpdated'` embeds `100` as a bare magic number. `PatientTimeline.tsx` uses `200` for the same pattern at line 99. The two components will silently disagree on how many resources they fetch for the same patient.

**Fix:** Extract a named constant and align between the two components:

```typescript
const TIMELINE_PAGE_SIZE = 200; // match PatientTimeline.tsx

// in the query:
`patient=Patient/${patientId}&_count=${TIMELINE_PAGE_SIZE}&_sort=-_lastUpdated`
```

Or, if the difference is intentional (narrower type set in `ClinicalTimeline` vs. broader in `PatientTimeline`), document it with an explicit comment.

---

### IN-03: `formatTimelineDate` is exported but has no call sites in reviewed files

**File:** `src/utils/timeline-utils.ts:88-90`

**Issue:** `formatTimelineDate` is exported but no call site appears in any of the reviewed files (the actual date truncation in `PatientTimeline.tsx` is done inline via `.slice(0, 10)`). If it is consumed elsewhere in the codebase this is a non-issue; if not, it is dead export surface.

**Fix:** Verify callers with `grep -r "formatTimelineDate" src/`. If no callers exist outside the test file, consider removing the export or keeping it only if a future phase is expected to consume it (add a comment to that effect).

---

### IN-04: Test for patient-context navigation does not assert the exact `navigate` argument path — relies on module-level `useNavigate` mock shared across all tests

**File:** `src/components/explorer/__tests__/ResourceGraphNode.test.tsx:205-219`

**Issue:** The GAP-2 test at line 205 renders the node inside a real `MemoryRouter`+`Routes` subtree, but `useNavigate` is mocked at the module level (line 48) so `navigateMock` captures all calls across all tests. The `beforeEach` reset at line 56 prevents cross-test contamination, but if the test at line 205 is run in isolation and the `Routes` component does not match the `initialEntry` (e.g., due to a URL encoding mismatch with `bad%20id$$$` in IN-04's sibling test), the component may not render at all and the assertion at line 218 would silently pass vacuously because `navigateMock` is never called.

**Fix:** Add a `toHaveBeenCalledTimes(1)` assertion before the `toHaveBeenCalledWith` assertion to catch vacuous passes:

```typescript
fireEvent.click(card);
expect(navigateMock).toHaveBeenCalledTimes(1);
expect(navigateMock).toHaveBeenCalledWith('/patients/p1/Observation/obs-42');
```

Apply the same pattern to the `FHIR_ID_PATTERN` fallback test at line 221-238.

---

_Reviewed: 2026-05-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
