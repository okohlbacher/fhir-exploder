---
phase: 17-duplicate-detection-relational-integrity
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/App.tsx
  - src/__tests__/content-hasher.test.ts
  - src/__tests__/orphan-detector.test.ts
  - src/__tests__/patient-duplicate-detector.test.ts
  - src/__tests__/reference-checker.test.ts
  - src/components/quality/DuplicatesDrillDown.tsx
  - src/components/quality/DuplicatesPanel.tsx
  - src/components/quality/QualityOverviewPage.tsx
  - src/components/quality/ReferencesDrillDown.tsx
  - src/components/quality/ReferencesPanel.tsx
  - src/hooks/useDuplicateReport.ts
  - src/hooks/useReferenceReport.ts
  - src/quality/contentHasher.ts
  - src/quality/orphanDetector.ts
  - src/quality/patientDuplicateDetector.ts
  - src/quality/referenceChecker.ts
  - src/quality/referenceWalker.ts
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-04-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

This phase adds duplicate detection (patient name+DOB, content hashing) and relational integrity checks (broken references, orphan resources) to the Data Quality module. The core detection logic in `patientDuplicateDetector.ts`, `contentHasher.ts`, `referenceWalker.ts`, `referenceChecker.ts`, and `orphanDetector.ts` is well-factored, pure where possible, and thoroughly tested. The orchestrating hooks are cancellation-aware and mirror the existing `usePlausibilityReport` state machine.

The most serious issue is a field-name mismatch in `DuplicatesPanel.tsx` that will always produce `NaN` in the displayed cluster-member counts — the panel dereferences `.members` but the cluster types expose `.patients` and `.resources`. This breaks the primary summary in the Duplicates tab. A small set of secondary issues touch the progress heuristic, cancellation semantics during the inner `Promise.all` in `findContentHashDuplicates`, and a couple of brittle narrow assertions in `referenceChecker.ts`.

## Critical Issues

### CR-01: Wrong field name on cluster objects produces NaN cluster-member counts

**File:** `src/components/quality/DuplicatesPanel.tsx:73,82`
**Issue:** `DuplicatesPanel` computes `patientsInvolved` and `hashResourcesInvolved` by summing `c.members.length`, but the cluster types have no `members` property:

- `PatientDuplicateCluster` exposes `patients: Array<{...}>` (`patientDuplicateDetector.ts:19`)
- `ContentHashCluster` exposes `resources: Array<{...}>` (`contentHasher.ts:23`)

So `c.members` is `undefined`, `undefined.length` throws at runtime, and even if it didn't, `.reduce((sum, c) => sum + undefined, 0)` would return `NaN`. This renders as `"NaN patients involved"` / `"NaN resources involved"` in the summary under "patient duplicate clusters" and "content hash clusters".

This is the headline metric of the Duplicates tab and is exercised on every successful run that yields at least one cluster. It is not covered by any test in `__tests__/` because the hook's cluster data flows into the panel's JSX, not through a unit-tested surface.

**Fix:**
```ts
// Count patients involved in patient duplicate clusters
const patientsInvolved = useMemo(
  () => run.duplicateClusters.reduce((sum, c) => sum + c.patients.length, 0),
  [run.duplicateClusters],
);

// Count resources involved in content hash clusters for the current type
const hashResourcesInvolved = useMemo(
  () =>
    run.contentHashClusters
      .filter((c) => c.resourceType === resourceType)
      .reduce((sum, c) => sum + c.resources.length, 0),
  [run.contentHashClusters, resourceType],
);
```

Consider adding a test (either a unit test on the panel with a mock hook, or extending the hook test suite) that asserts `patientsInvolved` ends up finite — the TypeScript compiler did not catch this because the types reach the panel through the `useDuplicateReport` return type, but both reducers use `(sum, c) => sum + c.members.length` where `c` is inferred with the correct cluster type. The only reason tsc allowed it is the absence of `noUncheckedIndexedAccess` or similar strictness; check whether `tsc` actually passes on this file — if it does, that itself is a configuration issue worth flagging.

## Warnings

### WR-01: `findContentHashDuplicates` cannot be cancelled mid-batch

**File:** `src/quality/contentHasher.ts:100-117`
**Issue:** The outer `for` loop in `findContentHashDuplicates` does not check any cancel token, and the inner `await Promise.all(batch.map((r) => hashResource(r)))` awaits the full 25-element batch before emitting progress. On a large sample (`sampleSize=1000`), clicking "Stop duplicate check" in `DuplicatesPanel` sets `cancelledRef.current = true` in the hook, but the hook only observes it between batches (`useDuplicateReport.ts:154`). Hashing 1000 resources still runs to completion in memory; only subsequent per-type iterations are short-circuited. For a sample that includes many types, a cancellation issued during the first type's hashing phase is effectively ignored for that type.

**Fix:** Plumb the cancel token into `findContentHashDuplicates` (as an `AbortSignal` or a `shouldCancel()` callback) and check it inside the batch loop before starting each `Promise.all`:
```ts
export async function findContentHashDuplicates(
  resources: Resource[],
  resourceType: string,
  onProgress?: (current: number, total: number) => void,
  shouldCancel?: () => boolean,
): Promise<ContentHashCluster[]> {
  // ...
  for (let i = 0; i < total; i += BATCH_SIZE) {
    if (shouldCancel?.()) break;
    // ...
  }
}
```
Then pass `() => cancelledRef.current` from `useDuplicateReport`.

### WR-02: Progress heuristic in DuplicatesPanel misreports phase on empty Patient sample

**File:** `src/components/quality/DuplicatesPanel.tsx:99-110`
**Issue:** The phase-aware label uses `run.duplicateClusters.length === 0 && run.skippedPatients === 0` as a proxy for "still in patient pass". This is incorrect in three realistic scenarios:

1. Server has no Patient resources → `patientSample = []` → patient pass yields zero clusters and zero skipped → the panel reports "Matching patients (0/N)..." throughout the entire content-hash phase until the first cluster appears (which may never happen).
2. Patient sample has zero duplicates and all patients had usable name+DOB → same broken state: `duplicateClusters=[]` and `skippedPatients=0` forever.
3. User selects a non-Patient-containing cohort but Patient does exist on the server → patient pass still runs and sets `skippedPatients`, but the UX implies the current progress belongs to the selected type.

**Fix:** Track the phase explicitly in the hook state (e.g., add `phase: 'patient' | 'content-hash' | 'done'` to `DuplicateRunState`) and have the panel switch labels on that value rather than inferring it from cluster outputs:
```ts
// in useDuplicateReport
const [phase, setPhase] = useState<DuplicatePhase>('idle');
// ... setPhase('patient') before findPatientDuplicates
// ... setPhase('content-hash') before the per-type loop
```

### WR-03: `normalizeReference` accepts slashes in the id segment and rejects valid versioned refs

**File:** `src/quality/referenceWalker.ts:45-47`
**Issue:** The relative-reference branch enforces `segs.length !== 2` exactly, so:

- `"Patient/123/_history/4"` (valid FHIR versioned reference per R4 §3.2.0.2) is rejected silently as malformed.
- `"Patient/123"` passes, as expected.

Versioned references are uncommon but are emitted by some servers in bundle history / provenance fields. Treating them as malformed means they never enter the existence-check pipeline and silently disappear from DQ-09 coverage.

**Fix:** Handle `_history` explicitly, taking the first two segments as `Type/id`:
```ts
const segs = value.split('/').filter(Boolean);
if (segs.length < 2) return null;
if (!segs[0] || !segs[1]) return null;
return `${segs[0]}/${segs[1]}`;
```
Then `checkReferencesExist` can continue to query by `_id`.

### WR-04: `checkReferencesExist` treats transient network failures as broken references

**File:** `src/quality/referenceChecker.ts:112-125`
**Issue:** When both the `_elements=id` attempt and the plain `_id` retry throw, every id in the batch is added to `broken`. This conflates "server returned 5xx / timed out / rate-limited" with "target does not exist". On a flaky connection the Broken References panel lights up with dozens of false positives that vanish on a second run — confusing for the auditor persona.

**Fix:** Distinguish error types. Either bail out of the whole check with `setStatus('error')` (safer — false negatives > false positives here), or track a `serverErrors` Set separately and surface it as a yellow "N references could not be verified" alert rather than mixing them into `brokenCount`:
```ts
} catch (e) {
  for (const id of ids) unverified.add(`${type}/${id}`);
  // ... don't add to broken
}
```

### WR-05: Empty `found` result when `_elements=id` succeeds but returns zero resources masks a capability issue

**File:** `src/quality/referenceChecker.ts:107-130`
**Issue:** If the first try with `_elements=id` succeeds but the server quietly strips the `_id` parameter (some servers ignore unknown search params and return the default page of the type), `found` will be a large list of random resources, and every id in `ids` will be added to `broken` because the id intersection is empty. There is no canary for "did the server actually honor `_id`?".

**Fix:** Before the batched existence check, send a single canary request with a known non-existent id and a known existing id to confirm `_id` filtering is honored. Fail fast with a clear error if not. Alternatively, verify that the server's returned ids are a subset of the requested ids and log a warning when they are not.

### WR-06: `detectOrphans` reports `resourceId: Type/unknown` when the resource has no id

**File:** `src/quality/orphanDetector.ts:111-117`
**Issue:** When an input resource has no `id`, the orphan issue is emitted with `resourceId: "Observation/unknown"`. If two such resources collide in the same batch, they are indistinguishable in the issue table, and the user has no way to click through. This is corroborated by the test at `orphan-detector.test.ts:87-93` which only asserts the id contains `Observation/` — it does not care about collision behavior.

**Fix:** Either skip resources without an id (they cannot be navigated to anyway), or append a stable index so entries remain distinct:
```ts
for (let idx = 0; idx < resources.length; idx++) {
  const r = resources[idx];
  // ...
  const id = (r as Record<string, unknown>).id;
  if (typeof id !== 'string' || !id) continue;  // or use `unknown-${idx}`
}
```

## Info

### IN-01: `sortKeys` does not handle `Date`, `Map`, `Set`, or `BigInt`

**File:** `src/quality/contentHasher.ts:32-45`
**Issue:** `sortKeys` treats any non-array object as a plain object and iterates `Object.keys`. A FHIR resource shouldn't contain `Date`/`Map`/`Set`/`BigInt`, but if some upstream code path populates one (e.g., a Date stored as the lastUpdated metadata before stripping), the function drops it into `{}` and two resources that differ in that field hash the same. Low risk given FHIR JSON semantics, worth a guard or a comment clarifying the assumption.

**Fix:** Either document "inputs must be JSON-serializable primitives, arrays, and plain objects" at the top of `sortKeys`, or narrow the check:
```ts
if (obj !== null && typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype) { ... }
```

### IN-02: Auto-start effect swallows lint warning instead of fixing the dependency

**File:** `src/components/quality/DuplicatesDrillDown.tsx:45-50`, `src/components/quality/ReferencesDrillDown.tsx:45-50`
**Issue:** Both drill-down pages use `eslint-disable-next-line react-hooks/exhaustive-deps` to auto-start on mount. The hook's `start` is `useCallback`'d over `[client, types, sampleSize]` (duplicate) / `[client, resourceType, sampleSize]` (reference), so including it in the deps would retrigger the start on any prop change — which, on these single-shot pages, is actually the desired behavior if the cohort/sample changes mid-run. The `// eslint-disable` is papering over a real design question.

**Fix:** Either (a) restart when props change (remove the disable, let the effect run with `[run]` in deps, guard with `status === 'idle'` which is already done so subsequent changes won't duplicate) or (b) extract `startedRef = useRef(false)` and gate on that to make the single-shot intent explicit.

### IN-03: `DuplicatesDrillDown` hardcodes `types: ['Patient']` but the drill-down should respect the active cohort

**File:** `src/components/quality/DuplicatesDrillDown.tsx:29-33`
**Issue:** The drill-down runs `useDuplicateReport({ client, types: ['Patient'], sampleSize })`. The comment at the top of the file says content-hash scope "belongs on the panel where the user can pick the resource type" — which is reasonable — but it means the drill-down only ever reports patient duplicates, never content-hash clusters. That is inconsistent with the equivalent References drill-down, which does accept a `:type` param and runs both broken-ref and orphan detection against it. Consider either:

- adding a `:type` param to the duplicates drill-down URL so it can run content-hash scans too, or
- documenting in the UI ("Drill-down covers Patient duplicates only; use the Duplicates tab for content-hash scans").

**Fix:** Short-term, add a hint text below the title making the scope explicit. Long-term, align the two drill-downs.

### IN-04: Comment inside `hasReference` references `value == null` but handles only null/undefined

**File:** `src/quality/orphanDetector.ts:70-79`
**Issue:** Minor clarity: the function returns `false` for primitives (strings, numbers) which is correct, but the function name `hasReference` could be read as "does this value have a Reference property", when actually the intended semantic is "does this value or any of its array elements contain a `{reference: string}` object". A more descriptive name (`containsReferenceString`) or a short JSDoc would help maintainers.

**Fix:**
```ts
/**
 * True if `value` is (or contains, if array) an object with a non-empty
 * `reference` string. Used to detect whether a required-Reference FHIR
 * field has been populated.
 */
function hasReference(value: unknown): boolean { ... }
```

### IN-05: `patientDuplicateDetector` silently treats non-Patient resources as "skipped"

**File:** `src/quality/patientDuplicateDetector.ts:53-57`
**Issue:** In `findPatientDuplicates`, any non-Patient input increments `skippedCount`. The hook only ever passes Patient samples, so this is defensive code — but the skippedCount in the UI is labeled "missing name or birthDate" (`DuplicatesPanel.tsx:208`). If a caller accidentally passed mixed-type input, the user would see a misleading skip message. This is low risk given current call sites, but worth either strengthening the type signature (`patients: Patient[]` instead of `Resource[]`) or splitting the counter into `skippedNotPatient` vs `skippedMissingKey`.

**Fix:** Narrow the parameter type:
```ts
export function findPatientDuplicates(
  patients: Patient[],
): { clusters: PatientDuplicateCluster[]; skippedCount: number } {
```
Let the caller filter by `resourceType === 'Patient'` before calling.

---

_Reviewed: 2026-04-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
