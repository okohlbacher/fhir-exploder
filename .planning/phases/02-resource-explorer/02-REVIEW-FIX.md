---
phase: 02-resource-explorer
fixed_at: 2026-04-11T00:00:00Z
review_path: .planning/phases/02-resource-explorer/02-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-04-11
**Source review:** .planning/phases/02-resource-explorer/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 5
- Skipped: 1

## Fixed Issues

### CR-01: FHIR ID validation regex rejects valid resource IDs

**Files modified:** `src/components/explorer/ResourceDetailPage.tsx`
**Commit:** 9e6bec8
**Applied fix:** Updated `FHIR_ID_PATTERN` from hex-only `/^[a-f0-9A-F][a-f0-9A-F\-]+$/` to spec-compliant `/^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/` matching FHIR R4 id format `[A-Za-z0-9\-\.]{1,64}`. Also updated the matching regex in `handleReferenceClick` to use the same corrected pattern. Reference navigation now works for all valid FHIR resource IDs.

### WR-01: Side effect inside setState updater function

**Files modified:** `src/hooks/useBreadcrumbTrail.ts`
**Commit:** 449433c
**Applied fix:** Moved `navigate()` call out of the `setTrail` updater callback. The function now reads the entry from `trail[index]` directly, calls `setTrail` with a pure updater (slice only), and then calls `navigate()` as a separate side effect. Added `trail` to the dependency array.

### WR-02: Filter state not reset when resource type changes

**Files modified:** `src/components/explorer/SearchFilterPanel.tsx`
**Commit:** 5003887
**Applied fix:** Added `useEffect` that resets `filterValues`, `includeValues`, and `revincludeValues` to their initial empty state whenever `resourceType` changes. Prevents stale filter values from being carried over when switching resource types.

### WR-03: _revinclude options identical to _include options

**Files modified:** `src/components/explorer/SearchFilterPanel.tsx`
**Commit:** c0451c5
**Applied fix:** Replaced the incorrect `revincludeOptions` computation (which duplicated `includeOptions` from the current resource type's own params) with an empty array and a comment explaining that proper _revinclude requires cross-type CapabilityStatement analysis. The _revinclude MultiSelect remains in the UI but has no options until proper reverse-include discovery is implemented.

### WR-05: Multiple `as unknown as` casts suppress type safety

**Files modified:** `src/components/explorer/SearchResultsPage.tsx`
**Commit:** 19624b6
**Applied fix:** Imported proper Medplum event types (`SearchClickEvent`, `SearchLoadEvent`, `SearchChangeEvent`) from `@medplum/react` and typed the event handlers accordingly. Removed all three `as unknown as` double casts. Updated `handleSearchLoad` to use `e.response` (the actual `SearchLoadEvent` property) instead of `e.bundle`. Removed unused `Resource` import.

## Skipped Issues

### WR-04: All search filters hardcoded to 'eq' operator

**File:** `src/components/explorer/SearchResultsPage.tsx:50-54`
**Reason:** Medplum's `Filter` interface requires `operator: Operator` as a mandatory field (not optional). The review's suggestion to omit the operator field entirely would cause a TypeScript compilation error. The alternative suggestion of adding per-filter operator selection in the UI is a feature enhancement requiring UI design work, not a code fix. The current `'eq'` default is functionally correct for token and reference params; date params may need range operators but this requires UI support for operator selection.
**Original issue:** Every filter is assigned `operator: 'eq'` which is incorrect for date params that typically need range operators (ge, le, gt, lt) and unnecessary for string params that use substring matching by default.

---

_Fixed: 2026-04-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
