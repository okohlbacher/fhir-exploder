---
phase: 46-theme-a-foundation-summary-util
reviewed: 2026-05-01T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/utils/summarizeResource.ts
  - src/utils/__tests__/summarizeResource.test.ts
  - src/components/explorer/SearchResultsPage.tsx
  - src/components/patients/FhirResourcesView.tsx
  - src/components/patients/MiiModuleTab.tsx
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 46: Code Review Report

**Reviewed:** 2026-05-01
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 46 introduces `summarizeResource` — a pure-function FHIR resource summary
registry — and migrates three legacy inline `getResourceSummary` / `getSummary`
functions in the explorer + patient views to consume it. The implementation is
clean, well-documented, and the test suite (44 cases across 12 describe blocks)
gives strong coverage of the registry's typed switches, sub-decision pins
(A1/A2/A3, D-12), and the djb2 hash-determinism contract.

Correctness: typed switches use the safe Medplum cast pattern, defensive `?.`
chains are applied to every choice-type / required-but-Blaze-may-violate field
(`Encounter.class`, `Observation.valueQuantity.unit`, etc.), and the generic
walker uses bracket-only access via the sanctioned `toRecord` helper — no
prototype-pollution surface. The djb2 hash is mathematically sound: `>>> 0`
yields an unsigned 32-bit value, and `% 36^6` cleanly bounds the result to a
6-digit base36 string. FHIR field paths match @medplum/fhirtypes (R4) for all
8 typed resource types, including the Pitfall P-03 fix in `Encounter.period.start`.

Migration: legacy summary functions are fully deleted (verified via
`git diff` — no residual logic), and React text-node escaping is preserved
in all three call sites (no `dangerouslySetInnerHTML` usage anywhere in the
diff). All three sites render `{summarizeResource(r).primary}` as a child of
`<Anchor>`, which is React-safe.

The single warning is a small **behavior regression in the generic walker
fallback chain**: the legacy `getResourceSummary` in `SearchResultsPage.tsx`
included a `status` step before falling back to `id`, but `summarizeGeneric`
does not. For resource types outside the typed registry that lack code / type
/ category / name / description / identifier but have a `status` (e.g. `Task`,
`ServiceRequest` without a code), the user will now see a raw FHIR ID where
they previously saw a status string like "completed" or "in-progress". Worth
explicitly deciding whether to (a) preserve old behavior by adding a step 6.5
before identifier, or (b) accept the regression and document it in the phase
summary.

The other findings are minor: an unused `toRecord` import survives in
`SearchResultsPage.tsx`, the `now: Date = new Date()` default parameter
weakens the "pure function" claim at every migrated render site (age fields
will tick over at midnight in long-lived sessions), and two small
documentation polish items.

## Warnings

### WR-01: Generic-walker regression — `status` no longer included in fallback chain

**File:** `src/utils/summarizeResource.ts:281-328`
**Issue:** The legacy `getResourceSummary` in `SearchResultsPage.tsx` (deleted
in commit `7f35b47`) used the precedence chain `name → code/type/category →
identifier → status → id`. The replacement `summarizeGeneric` walker (D-11)
uses `code → type → category → name → description → identifier → id`, dropping
the `status` step entirely.

For any resource type **not** in the typed 8-resource registry whose only
identifying field is `status` (e.g. a `Task` resource with no code or
description, or a stub `ServiceRequest`), the table cell will now show the
raw FHIR ID where it previously showed a human-readable status. This is a
silent behavior change for callers that render via the generic path.

The phase plan acknowledges D-12 (`secondary` always undefined for generic) and
the new precedence list, but does not call out the dropped `status` step as an
intentional break. Given that one of the three migration sites (MiiModuleTab)
already renders `status` in its own column, the omission may be deliberate, but
SearchResultsPage and FhirResourcesView do not — and the legacy fallback was
load-bearing there.

**Fix:** Pick one and document the decision in `46-SUMMARY.md`:

Option A — preserve legacy behavior, insert a step 6.5:
```ts
// 6.5. status (string) — matches legacy SearchResultsPage fallback
if (typeof obj.status === 'string' && obj.status) {
  return { primary: obj.status };
}

// 7. id (last resort)
return { primary: r.id ?? '' };
```

Option B — accept the regression, add an explicit note to the registry
header comment:
```ts
/**
 * ...
 * NOTE: Phase 46 intentionally drops the legacy `status` fallback step.
 * For resources that exposed status as their only identifying field
 * (rare; mostly Task/ServiceRequest stubs), the fallback is now `id`.
 * Verified acceptable: typed registry covers 8 resource types; remaining
 * patient-linked types in scope have at least one of code/category/name.
 */
```

If you go with Option B, add a regression test asserting the new behavior so
it cannot silently change again.

## Info

### IN-01: Unused `toRecord` import in SearchResultsPage.tsx

**File:** `src/components/explorer/SearchResultsPage.tsx:25`
**Issue:** After the migration, `toRecord` is still imported but is only used
inside `getResourceDate` (line 30). That function is exported and consumed
elsewhere in the file (`getResourceDateByType`'s default branch at line 80),
so the import IS still necessary — false alarm on first read. **No change
needed**, but worth confirming with `npx tsc --noEmit` and `npx eslint
--no-eslintrc --rule "no-unused-vars: error" src/components/explorer/SearchResultsPage.tsx`
that no other previously-load-bearing helper became dead.

(Filing this as Info rather than removing because the import IS still used
via `getResourceDate` — please verify and close.)

### IN-02: `now: Date = new Date()` default weakens purity claim at call sites

**File:** `src/utils/summarizeResource.ts:52`
**Issue:** The function signature is
`summarizeResource(r: Resource, now: Date = new Date()): Summary`. All three
migration sites call it as `summarizeResource(r).primary` without supplying
`now`, which means every render evaluates `new Date()` at component-render
time. This is technically a clock dependency in callers (age in the table can
flip from "67" to "68" between two renders crossing midnight) and weakens
the purity claim in the file's header comment ("no clock — pass `now` for
determinism").

This is a documentation / API-shape concern, not a correctness bug. Two
options:

```ts
// Option A — require explicit now (forces every site to think about it):
export function summarizeResource(r: Resource, now: Date): Summary { ... }

// Option B — keep the default, but tighten the header note:
// "Pure when `now` is supplied. Defaults to `new Date()` at call time;
//  callers that need cross-render determinism must pass an explicit clock."
```

Recommend Option B for v1 (least disruption to migration sites). If Phase 47/48
needs determinism for graph snapshots, switch to Option A then.

### IN-03: Test suite missing one Observation edge case — valueQuantity with `value: 0`

**File:** `src/utils/__tests__/summarizeResource.test.ts:300-385`
**Issue:** The Observation suite covers value/unit, value-only,
valueString, and valueCodeableConcept paths, but does not pin behavior when
`o.valueQuantity.value === 0`. Because `summarizeObservation` checks
`value !== undefined` (line 184/186 in the impl), `0` IS rendered correctly
— but a regression to `if (value)` would silently drop legitimate zero
readings (common in diagnostic data: WBC differential, residual volumes).

**Fix:**
```ts
it('lab observation with valueQuantity.value === 0 → renders zero (not omitted)', () => {
  const o: Observation = {
    resourceType: 'Observation',
    id: 'o-zero',
    status: 'final',
    category: [{ coding: [{ code: 'laboratory' }] }],
    code: { coding: [{ display: 'WBC band %' }] },
    valueQuantity: { value: 0, unit: '%' },
  };
  expect(summarizeResource(o, fixedNow).primary).toBe('0 % · WBC band %');
});
```

### IN-04: `getDate` helper duplicated across FhirResourcesView and MiiModuleTab

**File:** `src/components/patients/FhirResourcesView.tsx:52-61`,
`src/components/patients/MiiModuleTab.tsx:21-34`
**Issue:** Both files define a local `getDate(r: Resource): string` that
walks `effectiveDateTime → performedDateTime → recordedDate → onsetDateTime →
authoredOn → date → issued`. MiiModuleTab adds a second loop for
`effectivePeriod / period / performedPeriod`. SearchResultsPage has yet a
third version (`getResourceDate` at line 29) with a slightly different field
order and a Period-handling branch.

This is pre-existing (not introduced by Phase 46), but the migration is the
right moment to flag it: three near-identical date extractors will drift
unless consolidated. Recommend a follow-up phase pulls them into a single
`getResourceDate(r, fields?)` utility next to `summarizeResource`.

No fix required for this phase; track as tech debt.

---

_Reviewed: 2026-05-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
