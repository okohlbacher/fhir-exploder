---
phase: 22-programmatic-cohort-definition-fhirpath-fdpg
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - src/components/quality/CohortBuilderForm.test.tsx
  - src/components/quality/CohortBuilderForm.tsx
  - src/components/quality/CohortsPage.test.tsx
  - src/components/quality/CohortsPage.tsx
  - src/components/quality/DeleteCohortModal.test.tsx
  - src/components/quality/DeleteCohortModal.tsx
  - src/components/quality/EditCohortModal.test.tsx
  - src/components/quality/EditCohortModal.tsx
  - src/components/quality/FhirpathCriterionCard.test.tsx
  - src/components/quality/FhirpathCriterionCard.tsx
  - src/hooks/useCohorts.test.tsx
  - src/hooks/useCohorts.ts
  - src/quality/cohortResolver.test.ts
  - src/quality/cohortResolver.ts
  - src/quality/cohorts.test.ts
  - src/quality/cohorts.ts
  - src/quality/fdpgCodec.test.ts
  - src/quality/fdpgCodec.ts
  - src/quality/fdpgTypes.test.ts
  - src/quality/fdpgTypes.ts
  - src/quality/fhirpathTranslator.test.ts
  - src/quality/fhirpathTranslator.ts
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-04-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 22 adds the FHIRPath programmatic cohort criterion (CHRT-05), FDPG
Structured Query v3 codec + import/export flow (CHRT-06), and the per-row
Edit / Duplicate / Delete actions for saved cohorts (CHRT-07). Code is
well-structured, heavily commented with threat-model references, and test
coverage is thorough (~110 tests across 11 spec files). Security posture
is strong: the FHIRPath translator rejects anything outside the D-02
subset before a server call is issued, the FDPG codec enforces a 1 MB cap
and reads parsed JSON field-by-field to defeat prototype pollution, and
user-controlled cohort names are slugified before use as filenames.

No Critical issues were found. Three Warning-level issues merit attention,
most notably a duplicate-toast bug in `CohortsPage.handleExport` where
multiple FDPG export warnings each emit the same hardcoded copy, and an
inconsistency in `useCohorts.activateCohort` which does not probe
localStorage for `QuotaExceededError` the way sibling mutators do.

## Warnings

### WR-01: `handleExport` iterates warnings but ignores each warning's content

**File:** `src/components/quality/CohortsPage.tsx:310-318`
**Issue:** The warnings loop binds `_w` (unused) and emits the same
hardcoded message for every iteration. Today `cohortToFdpgSq` only ever
emits the reference-list-skipped warning, so no user will notice, but the
loop body is wrong in two ways:
1. If the codec ever emits a second warning type (e.g. "date-range has
   null bounds"), it will be displayed with the reference-list copy —
   misleading and potentially user-confusing.
2. If a cohort has N reference-list criteria (today impossible because
   builder caps at one, but structurally allowed), the same toast fires
   N times identically, which looks like a duplicate-notification bug to
   the user.

Safer to render `w` directly (the codec's warnings are already
user-readable strings).

**Fix:**
```tsx
for (const w of warnings) {
  notifications.show({
    color: 'yellow',
    title: 'Export limitation',
    message: w,
    autoClose: 6000,
  });
}
```

### WR-02: `useCohorts.activateCohort` bypasses quota probe, diverging from sibling mutators

**File:** `src/hooks/useCohorts.ts:154-159`
**Issue:** `addCohort`, `updateCohort`, `deleteCohort`, and
`duplicateCohort` all route through the `persist` helper (or inline probe
in `addCohort`) that calls `window.localStorage.setItem` directly so a
`QuotaExceededError` can surface a red toast before Mantine's
`useLocalStorage` silently swallows it. `activateCohort` uses only
`setStored({...stored, activeCohortId: id})`, so a `QuotaExceededError`
raised when toggling activation will be swallowed with only a
console.error and no user-visible feedback. The user will see the same
"Active" badge in the list but observe that the dashboard ignores the
change on reload — a classic ghost-state bug.

While the JSON delta for an activeCohortId flip is trivial (~40 bytes),
it can still throw on a near-full quota when the serialized cohorts array
is already close to 5 MB. Given the hook already has the `persist`
helper, routing `activateCohort` through it (or at least probing) costs
almost nothing.

**Fix:**
```ts
const activateCohort = useCallback(
  (id: string | null) => {
    const next: CohortsStorage = { ...stored, activeCohortId: id };
    try {
      window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        notifications.show({
          color: 'red',
          title: 'Activation failed',
          message:
            'Browser storage is full. Delete unused cohorts to make room.',
          autoClose: 6000,
        });
      }
      throw err;
    }
    setStored(next);
  },
  [stored, setStored],
);
```

### WR-03: Truncation banner mis-fires on exactly-10,000 unique patient IDs

**File:** `src/components/quality/CohortBuilderForm.tsx:184, 311-320`
**Issue:** `truncated` is defined as `parsedRefs.length === PATIENT_REF_CAP`,
which means any input that parses to exactly 10,000 unique IDs —
legitimate boundary case — will show the yellow "Cohort truncated to
10,000 patients" Alert and the "(cap reached — additional IDs ignored)"
helper text, even though nothing was truncated. `parsePatientRefs` caps
at 10,000 unconditionally via `.slice(0, 10_000)`, so the length of the
return value cannot distinguish "exactly 10k" from "more than 10k." The
parser would need to signal whether truncation actually occurred.

This is a UX bug: users legitimately assembling a 10k-patient cohort will
be told their data is being discarded when it isn't.

**Fix:** Have `parsePatientRefs` return truncation info, or do the dedupe
inline in the form so the pre-cap count is known:
```ts
// In parsePatientRefs:
export interface ParsedRefs { ids: string[]; truncated: boolean }
export function parsePatientRefs(raw: string): ParsedRefs {
  const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const stripped = tokens.map((t) => t.replace(/^Patient\//, ''));
  const deduped = Array.from(new Set(stripped));
  return {
    ids: deduped.slice(0, 10_000),
    truncated: deduped.length > 10_000,
  };
}

// In CohortBuilderForm:
const parsed = useMemo(() => parsePatientRefs(debouncedRef), [debouncedRef]);
const parsedRefs = parsed.ids;
const truncated = parsed.truncated;
```

This is a breaking change to `parsePatientRefs`; callers in tests also
need updating.

## Info

### IN-01: `useCohorts` mutators write to localStorage twice

**File:** `src/hooks/useCohorts.ts:113-152, 171-189`
**Issue:** The probe pattern both writes the serialized payload directly
via `window.localStorage.setItem(...)` AND calls Mantine's
`setStored(next)`, which itself serializes + writes to the same key. Two
JSON.stringify calls and two localStorage writes per mutation. For
typical cohort sizes the overhead is negligible (<1ms), but it is
wasteful and the comment ("probe") is misleading — it's actually writing
the real payload, not a probe value. Not a correctness bug since both
writes serialize identical bytes from the same `next` object.

**Fix:** Either rename "probe" to "pre-write" in the comment, or have
`persist` write via `setStored` alone and wrap that call in try/catch:
```ts
const persist = useCallback(
  (next: CohortsStorage, failureTitle: string, failureMessage: string) => {
    try {
      // Probe first so we catch QuotaExceededError before Mantine does.
      window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
      // Mantine will no-op / idempotent write on next render.
      setStored(next);
    } catch (err) {
      ...
    }
  },
  [setStored],
);
```
Accepted as-is if the Mantine internal is known to never skip writes on
equality — but document the invariant.

### IN-02: `duplicateCohort` shares the criteria array reference with the original

**File:** `src/hooks/useCohorts.ts:241-267`
**Issue:** `criteria: original.criteria` aliases the array. If any future
code path mutates a cohort's criteria in place (which current callers
never do — `updateCohort` always replaces the array — but defense-in-depth
matters), both the original and the copy would reflect the mutation. The
storage round-trip on the next write would restore independence, but
in-memory state would drift until then.

**Fix:**
```ts
criteria: original.criteria.slice(),
```
Or, if a deeper safety net is desired, `JSON.parse(JSON.stringify(original.criteria))`.

### IN-03: `CohortBuilderForm` initial date range is typed as `Date | string | null` but receives ISO string from `initialCohort`

**File:** `src/components/quality/CohortBuilderForm.tsx:155-171`
**Issue:** `initialDateRange?.start` is an ISO date string, assigned
into `useState<[Date | string | null, Date | string | null]>`. Mantine 8
`DatePickerInput` accepts string values at runtime but the preferred API
is `Date | null`. `toIsoDate` handles both shapes when serializing back
out, so this is defensible — but it widens the state type "just in case,"
which makes reasoning about the form's state harder and defers a proper
parse to every render.

**Fix:** Parse to Date at init time:
```ts
const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
  initialDateRange?.start ? new Date(initialDateRange.start) : null,
  initialDateRange?.end ? new Date(initialDateRange.end) : null,
]);
```

### IN-04: `FhirpathCriterionCard` `abortRef` can be nulled by an aborted in-flight call

**File:** `src/components/quality/FhirpathCriterionCard.tsx:124-163`
**Issue:** Sequence: user clicks Validate (call A). A's `abortRef.current`
is set. User clicks Validate again before A resolves (call B); B aborts
A, then sets `abortRef.current = B.controller`. A's pending
`dryRunCount` eventually throws/resolves and reaches A's `finally`
block, where it runs `abortRef.current = null`, inadvertently nulling B's
controller while B is still in-flight. A subsequent user-initiated
validate C will not abort B (abortRef was null), so both B and C can
race.

Impact is low because both B and C would set state after a successful
call, but the "last write wins" assumption fails. The fix is to only
clear `abortRef` if it still points to this call's controller.

**Fix:**
```ts
} finally {
  window.clearTimeout(timeoutId);
  if (abortRef.current === controller) {
    abortRef.current = null;
  }
}
```

### IN-05: `fhirpathTranslator.ArithemticOperatorAtom` propagates an upstream Medplum typo

**File:** `src/quality/fhirpathTranslator.ts:41`
**Issue:** The imported class name `ArithemticOperatorAtom` (should be
"Arithmetic") is a typo in `@medplum/core`. This file uses the typoed
name correctly, which is fine, but a lint/spellcheck pass might flag it
and tempt a maintainer to "fix" it into a compilation error. Consider
aliasing the import so the typo does not appear in reviewed code:

**Fix:**
```ts
import {
  ArithemticOperatorAtom as ArithmeticOperatorAtom,
  ...
} from '@medplum/core';
```
Then reference `ArithmeticOperatorAtom` throughout this module. Purely
cosmetic.

### IN-06: `cohortResolver.resolveCriterion` re-translates FHIRPath on every resolve

**File:** `src/quality/cohortResolver.ts:152-188`
**Issue:** The inline comment notes "the translator is pure and cheap
(~1ms per call)" and explicitly chooses to re-translate rather than read
the criterion's cached `translatedQuery`. This is a deliberate design
choice, and the comment documents the rationale well. Flagging only so
future maintainers do not "optimize" by trusting the cached field — the
current behavior is intentional and matches the pre/post-Validate
equivalence property the UI relies on. No change needed.

---

_Reviewed: 2026-04-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
