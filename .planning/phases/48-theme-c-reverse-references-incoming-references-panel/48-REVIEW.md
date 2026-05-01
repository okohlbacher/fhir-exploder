---
phase: 48-theme-c-reverse-references-incoming-references-panel
reviewed: 2026-05-01T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/utils/reverseReferenceCatalog.ts
  - src/utils/__tests__/reverseReferenceCatalog.test.ts
  - src/components/explorer/RelatedResourcesPanel.tsx
  - src/components/explorer/IncomingReferencesPanel.tsx
  - src/components/explorer/PatientRelatedResources.tsx
  - src/components/explorer/ResourceDetailPage.tsx
  - src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx
  - src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx
  - src/components/explorer/__tests__/PatientRelatedResources.test.tsx
  - src/__tests__/resource-detail.test.tsx
  - src/__tests__/reference-navigation.test.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 48: Code Review Report

**Reviewed:** 2026-05-01
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 48 introduces the reverse-reference catalog (`reverseReferenceCatalog.ts`), a shared `RelatedResourcesPanel` render component, and two thin wrappers (`IncomingReferencesPanel`, refactored `PatientRelatedResources`) wired into `ResourceDetailPage`. The implementation is clean, well-typed, and well-tested:

- The catalog is `as const satisfies` typed against `ResourceType`, with both unit tests and inline justification for the FHIR R4 SearchParameter corrections from RESEARCH §1.
- `RelatedResourcesPanel` correctly handles in-flight cancellation via the `cancelled` flag, silent error fallback to count `0`, and only renders cards with `count > 0`.
- Wrappers are minimal and structurally equivalent (proven by the cross-wrapper test in `IncomingReferencesPanel.test.tsx`).
- URL construction uses the upstream-validated `resourceType` + `id` from `ResourceDetailPage`, so injection risk is bounded by the FHIR_REFERENCE_PATTERN/FHIR_ID_PATTERN regexes already in place.

No critical issues. Two warnings concern duplicate-key behavior in the count map and template-literal URL construction without explicit encoding. Three info items cover minor maintainability nits.

## Warnings

### WR-01: Duplicate `e.type` keys in `Observation` catalog collide in `counts` Record

**File:** `src/components/explorer/RelatedResourcesPanel.tsx:31-46`
**Issue:** The component keys the `counts` state map by `e.type` only (`initial[e.type] = 'loading'` at line 36, `setCounts((prev) => ({ ...prev, [e.type]: ... }))` at line 46). However, `reverseReferenceCatalog.Observation` contains three entries with `type: 'Observation'` but different `param` values (`has-member`, `derived-from`, plus a self-entry from line 49–50 of the catalog). Three parallel fetches race to write the same `Observation` key — only the last-resolving wins, the other two counts are silently lost, and the populated grid will show at most one `Observation` card even if all three searches return results.

The same pattern affects `Encounter` catalog (`Observation` appears once but other types appear once each — safe) and any future catalog edits that add multiple params for the same target type.

**Fix:** Key by `${e.type}:${e.param}` (the unique pair) and adjust the `populated` filter and card `key` accordingly:

```tsx
const key = (e: ReverseReferenceEntry) => `${e.type}:${e.param}`;
// ...
for (const e of entries) initial[key(e)] = 'loading';
// ...
.then((raw) => {
  if (cancelled) return;
  const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
  setCounts((prev) => ({ ...prev, [key(e)]: bundle.total ?? 0 }));
})
// ...
const populated = useMemo(
  () => entries.filter((e) => typeof counts[key(e)] === 'number' && (counts[key(e)] as number) > 0),
  [counts, entries],
);
// In JSX: key={key(e)} and counts[key(e)]
```

### WR-02: Reference value interpolated into URL query string without encoding

**File:** `src/components/explorer/RelatedResourcesPanel.tsx:40`
**Issue:** `const url = ${e.type}?${e.param}=${refValue}&_summary=count&_count=0;` injects `refValue` directly. While today `refValue` is always `${resourceType}/${id}` where both halves were already validated against `FHIR_REFERENCE_PATTERN`/`FHIR_ID_PATTERN` upstream in `ResourceDetailPage.tsx`, the panel itself accepts `refValue: string` with no contract that callers have validated it. A future caller passing an unvalidated value would produce a malformed search URL (the `/` in `Patient/p1` is technically a reserved character in a query value and Blaze tolerates it, but a value containing `&`, `#`, or whitespace would silently break the query).

The same untrusted-string concern applies to `e.param` (currently from a frozen `as const` catalog, so safe today), and to the `onCardNavigate` return value at line 86 which feeds straight into `navigate()`.

**Fix:** Either tighten the prop type (e.g. accept a `Reference` shape `{ resourceType, id }` and build the value internally) or encode at the boundary:

```tsx
const url = `${e.type}?${encodeURIComponent(e.param)}=${encodeURIComponent(refValue)}&_summary=count&_count=0`;
```

Add a JSDoc note on the `refValue` prop documenting the caller contract (must be a validated `ResourceType/id` string).

## Info

### IN-01: Skeleton card count `4` is a magic number

**File:** `src/components/explorer/RelatedResourcesPanel.tsx:72`
**Issue:** `entries.slice(0, 4)` hardcodes the number of skeleton cards to match the widest grid breakpoint (`md: 4`). If the `SimpleGrid` cols change, the skeleton count will drift out of sync.
**Fix:** Extract a constant `const SKELETON_COUNT = 4;` near the top of the file with a comment linking it to the `cols.md` value, or compute it from the `cols` config.

### IN-02: Test file repeats jsdom polyfill block verbatim three times

**File:** `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx:21-41`, `IncomingReferencesPanel.test.tsx:22-42`, `PatientRelatedResources.test.tsx:26-46`
**Issue:** The `MockResizeObserver` + `matchMedia` polyfill block is duplicated byte-for-byte across all three Phase 48 test files (and several existing test files). Future changes (e.g., adding `IntersectionObserver`) will need to be applied in N places.
**Fix:** Extract to `src/__tests__/setup/jsdom-mantine-polyfills.ts` and import once per test file (or wire into Vitest `setupFiles`). Out of scope for this phase but worth tracking.

### IN-03: Legacy scaffold tests in `resource-detail.test.tsx` and `reference-navigation.test.tsx` are tautologies

**File:** `src/__tests__/resource-detail.test.tsx:145-186`, `src/__tests__/reference-navigation.test.tsx:203-261`
**Issue:** The "legacy scaffold" `describe` blocks contain assertions like `expect(ResourceDetailPage).toBeDefined()` and `expect(true).toBe(true)` with comments describing what the test would assert. These are no-op tests that pass regardless of whether the documented behavior holds. They're pre-existing (not introduced by this phase) but were touched by the Phase 48 mock additions at the top of each file.
**Fix:** Either flesh these out into real assertions or delete them — they currently provide false coverage signal. Track as a separate cleanup task (out of Phase 48 scope).

---

_Reviewed: 2026-05-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
