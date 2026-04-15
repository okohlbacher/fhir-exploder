---
phase: 16-conformance-plausibility-checks
reviewed: 2026-04-14T12:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - public/settings.yaml
  - src/App.tsx
  - src/components/quality/CohortSelector.tsx
  - src/components/quality/LabRangesDrillDown.tsx
  - src/components/quality/LabRangesPanel.tsx
  - src/components/quality/PlausibilityDrillDown.tsx
  - src/components/quality/PlausibilityPanel.tsx
  - src/components/quality/QualityOverviewPage.tsx
  - src/components/quality/ValidationPanel.tsx
  - src/config/settings.ts
  - src/config/types.ts
  - src/hooks/useConformanceRun.ts
  - src/hooks/useLabRangesReport.ts
  - src/hooks/usePlausibilityReport.ts
  - src/quality/labRangeChecker.ts
  - src/quality/labRangeChecker.test.ts
  - src/quality/profileConformanceChecker.ts
  - src/quality/profileConformanceChecker.test.ts
  - src/quality/temporalPlausibilityWalker.ts
  - src/quality/temporalPlausibilityWalker.test.ts
  - src/quality/validationBackends.ts
  - src/quality/valueSetCache.ts
  - src/quality/valueSetCache.test.ts
  - src/quality/profiles/Condition-diagnose.json
  - src/quality/profiles/Consent-consent.json
  - src/quality/profiles/Encounter-fall.json
  - src/quality/profiles/MedicationStatement-medikation.json
  - src/quality/profiles/Observation-laborbefund.json
  - src/quality/profiles/Patient-person.json
  - src/quality/profiles/Procedure-prozedur.json
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-04-14T12:00:00Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Phase 16 introduces conformance validation, temporal plausibility checks, and lab range checking across a well-structured set of quality modules. The code is generally well-organized with good separation of concerns: pure checker functions (profileConformanceChecker, temporalPlausibilityWalker, labRangeChecker) are cleanly separated from React hooks (useConformanceRun, usePlausibilityReport, useLabRangesReport) and UI components.

Threat mitigations (depth limits, cache caps, threshold sanitization, cancellation) are consistently implemented. Test coverage is solid with good boundary and edge case testing.

The main concerns are: (1) a race condition in async hooks where React state setters may be called after unmount despite cancellation, (2) redundant function calls in the temporal plausibility walker, and (3) a potential false-negative in the clinical duration check condition. No critical security issues were found.

## Warnings

### WR-01: Race condition -- state updates after unmount in async hooks

**File:** `src/hooks/useConformanceRun.ts:114-220`
**Issue:** The `start` callback launches an async IIFE that calls React state setters (`setStatus`, `setIssues`, etc.) throughout its execution. While `cancelledRef` is set to `true` on unmount (line 230), the async function only checks `cancelledRef.current` at specific yield points (between batches). Between those checks, state setters like `setProgress` on line 202 or `setIssues` on line 199 can fire after the component has unmounted, causing React warnings ("Can't perform a React state update on an unmounted component"). The same pattern exists in `useLabRangesReport.ts` and `usePlausibilityReport.ts`.
**Fix:** Wrap each state setter call behind a `cancelledRef.current` guard, or use a mounted ref pattern:
```typescript
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);

// Then in the async function:
if (mountedRef.current) setProgress({ current: ..., total: ... });
```

### WR-02: discoverTemporalPaths called twice on the hot path

**File:** `src/quality/temporalPlausibilityWalker.ts:367-369`
**Issue:** `discoverTemporalPaths(profile)` is called once in the condition check (line 368) and again to assign the result (line 369) when the profile has temporal paths. This executes the full element iteration twice per resource.
**Fix:**
```typescript
let temporalPaths: TemporalPath[];
if (profile) {
  const profilePaths = discoverTemporalPaths(profile);
  temporalPaths = profilePaths.length > 0
    ? profilePaths
    : discoverTemporalPathsByShape(
        resource as unknown as Record<string, unknown>,
        resource.resourceType ?? '',
      );
} else {
  temporalPaths = discoverTemporalPathsByShape(
    resource as unknown as Record<string, unknown>,
    resource.resourceType ?? '',
  );
}
```

### WR-03: Overly broad clinical duration check condition may produce false positives

**File:** `src/quality/temporalPlausibilityWalker.ts:328-329`
**Issue:** The condition `path.includes('effective') || path.includes('Observation.')` is too broad. `path.includes('Observation.')` matches every single field on an Observation resource (e.g., `Observation.status`, `Observation.code`), not just effective dates. While the temporal type filter limits this somewhat, any date/dateTime field on an Observation would trigger the "before patient birth" check even if semantically inappropriate (e.g., `Observation.issued` is the date the result was made available, which could legitimately differ from the effective date but should not be checked against birth date the same way).
**Fix:** Tighten the condition to only match effective-related paths:
```typescript
if (
  patientBirthDate &&
  (path.includes('effective') || path.endsWith('.issued'))
) {
```

### WR-04: resolveValue does not unwrap arrays for terminal segments

**File:** `src/quality/temporalPlausibilityWalker.ts:150-182`
**Issue:** The `resolveValue` function has a comment on line 176 saying it does not unwrap arrays if "the path resolution is complete." For a path like `Encounter.period` where `period` is a single Period object, this works fine. But if a resource has a field that is an array of Periods (e.g., extensions or repeated elements), the caller receives the raw array rather than individual Period values. The checks (`checkPeriodConsistency`, `checkFutureDate`) then receive an array and silently skip it because the type guards fail (`typeof value !== 'object'` is false for arrays, but `period.start` would be undefined). This means temporal issues inside array-valued temporal fields are silently missed.
**Fix:** After the loop in `resolveValue`, if the result is an array and the caller expects scalar resolution, consider returning the first element or having the caller iterate array results.

### WR-05: ValueSetCache MAX_CACHE_ENTRIES caps per-expansion rather than total cache size

**File:** `src/quality/valueSetCache.ts:14`
**Issue:** `MAX_CACHE_ENTRIES = 50000` limits the number of codes in a single expansion, but there is no limit on the number of different value set URLs that can be cached in the `cache` Map. If many value sets are expanded (e.g., 100 value sets each with 50,000 entries), total memory usage grows to 5 million entries with no upper bound. The T-16-02 mitigation comment says "cap to prevent memory exhaustion" but the cap only applies within a single `_fetchExpand` call.
**Fix:** Add a total-entries-across-all-value-sets cap, or limit the number of cached value set URLs (e.g., an LRU with max 200 entries).

### WR-06: useLabRangesReport runs checkLabRanges synchronously on the full sample

**File:** `src/hooks/useLabRangesReport.ts:81`
**Issue:** Unlike `useConformanceRun` and `usePlausibilityReport` which process resources in batches with cancellation checks between batches, `useLabRangesReport` calls `checkLabRanges(observations, configRanges)` synchronously on the entire sample at once (line 81). The cancellation check on line 85 only runs after the entire check completes. For large samples (e.g., 10,000 observations), this blocks the main thread with no opportunity to cancel mid-processing, making the cancel button unresponsive during the actual check phase.
**Fix:** Refactor `checkLabRanges` to process in batches (similar to the plausibility hook pattern), yielding control back to the event loop between batches and checking `cancelledRef` between them.

## Info

### IN-01: Unused import in ValidationPanel

**File:** `src/components/quality/ValidationPanel.tsx:39`
**Issue:** `Tabs` is imported from `@mantine/core` on line 39 and used within the component, but `ValidationIssueList` is imported on line 59 alongside `ResourceIssueTable`. Verify that `ValidationIssueList` is actually needed -- it is used on line 410, so this is fine. However, `_props` parameter naming convention (line 76) is unusual; the component destructures `client` from outlet context instead of using the prop.
**Fix:** Consider renaming `_props` to `props` since `sampleSize` is accessed from it on line 135, or destructure directly: `{ sampleSize }: ValidationPanelProps`.

### IN-02: Redundant resource type casting pattern

**File:** `src/hooks/useConformanceRun.ts:173`
**Issue:** The pattern `(r as unknown as Record<string, unknown>).id` appears multiple times across the codebase (useConformanceRun:173, useConformanceRun:194, profileConformanceChecker:296, temporalPlausibilityWalker:439). Since `Resource` in FHIR types includes an optional `id` field, a simpler cast `(r as { id?: string }).id` or accessing `r.id` directly (if the type allows it) would be cleaner.
**Fix:** Use `r.id` directly since `Resource` from `@medplum/fhirtypes` includes `id?: string`, or create a helper: `const resourceId = (r: Resource) => \`${r.resourceType}/${r.id ?? 'unknown'}\``.

### IN-03: Magic number in ValueSetCache $expand query

**File:** `src/quality/valueSetCache.ts:53`
**Issue:** The `count=10000` in the `$expand` URL is a hardcoded magic number with no accompanying comment explaining why 10,000 was chosen or how it relates to `MAX_CACHE_ENTRIES` (50,000).
**Fix:** Extract as a named constant (e.g., `EXPAND_PAGE_SIZE = 10000`) with a comment explaining the rationale. Note that if a value set has more than 10,000 codes, only the first 10,000 are fetched, which could lead to false-positive "value not in value set" issues for codes beyond the first page.

### IN-04: eslint-disable comments in drill-down components

**File:** `src/components/quality/LabRangesDrillDown.tsx:50`
**Issue:** Both `LabRangesDrillDown.tsx:50` and `PlausibilityDrillDown.tsx:52` use `// eslint-disable-next-line react-hooks/exhaustive-deps` to suppress the dependency warning on auto-start effects. This is a known React pattern for mount-only effects, but the comment could include a brief justification for future readers.
**Fix:** Add a brief explanation: `// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only auto-start`

---

_Reviewed: 2026-04-14T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
