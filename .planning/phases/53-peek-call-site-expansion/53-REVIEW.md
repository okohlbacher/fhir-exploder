---
phase: 53-peek-call-site-expansion
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/contexts/PeekContext.tsx
  - src/components/json/JsonPeekDrawer.tsx
  - src/components/explorer/ReferenceLink.tsx
  - src/components/explorer/RelatedResourcesPanel.tsx
  - src/components/patients/PatientListPage.tsx
  - src/__tests__/peek-drawer.test.tsx
  - src/__tests__/peek-patients-integration.test.tsx
  - src/__tests__/peek-reference-link.test.tsx
  - src/__tests__/peek-related-resources.test.tsx
  - src/__tests__/patient-list.test.tsx
  - src/__tests__/reference-navigation.test.tsx
  - src/__tests__/resource-detail.test.tsx
  - src/components/explorer/__tests__/ReferenceLink.test.tsx
  - src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx
  - src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx
  - src/components/explorer/__tests__/PatientRelatedResources.test.tsx
  - src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx
  - src/components/explorer/__tests__/ResourceGraphView.test.tsx
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 53: Code Review Report

**Reviewed:** 2026-05-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 53 wires the peek drawer to three new call sites: `ReferenceLink` (Cmd+click), `RelatedResourcesPanel` (Cmd+click on card), and `PatientListPage` (J shortcut). The implementation is clean overall — atomic state transitions in `openPeekError`, the Rules-of-Hooks compliance comment in `ReferenceLink`, and the `focusedPatient` blur guard all show careful design. Test coverage is thorough and well-structured.

Two warnings: a malformed URL possible when `patientId` is undefined, and a missing `evt.preventDefault()` that leaves a subtle divergence between the two Cmd+click call sites. Four info items: incorrect return type cast in a test harness, scaffold-only tests that assert nothing, an untyped `any` parameter in a test helper, and a FHIR URL encoding gap.

## Warnings

### WR-01: Empty patientId produces a malformed $everything URL

**File:** `src/components/patients/PatientListPage.tsx:78`
**Issue:** `usePatientResourceSummary` is called with `patient.id ?? ''`. When `patient.id` is `undefined`, the hook constructs the URL `Patient//$everything?_count=200` (double slash). While Blaze may reject this with a 4xx (which the `.catch` handles gracefully), the malformed URL could also match an unexpected route depending on server routing rules. FHIR R4 specifies that a resource always has an `id` after a successful read, but the `PatientListPage` populates `patients` from a bundle whose entries may not enforce this invariant client-side.

**Fix:** Guard against empty id before calling the hook, or assert the id is present before rendering `PatientRow`:

```tsx
// Option A — guard in PatientRow render (preferred, most explicit)
function PatientRow({ patient, ... }) {
  const patientId = patient.id;
  if (!patientId) return null; // skip rows with no server-assigned id
  const summary = usePatientResourceSummary(patientId, client);
  // ...
}

// Option B — keep ?? '' but build the URL defensively in the hook
const url = patientId
  ? `Patient/${patientId}/$everything?_count=${SAMPLE_SIZE}`
  : null;
if (!url) { /* skip fetch, return initial state */ }
```

Note: Option A requires moving the hook call after the guard, which violates Rules of Hooks if the guard is a conditional return. Use an `id`-required prop instead:

```tsx
function PatientRow({ patient, ... }: { patient: Patient & { id: string }; ... }) {
  // TypeScript enforces that callers filter out id-less patients
}
```

---

### WR-02: Cmd+click in RelatedResourcesPanel does not call evt.preventDefault()

**File:** `src/components/explorer/RelatedResourcesPanel.tsx:59-79`
**Issue:** The `handleCardClick` Cmd+click path calls `evt.stopPropagation()` but not `evt.preventDefault()`. For a `<Card>` (`div`), there is no intrinsic browser default to cancel, so no visible bug exists today. However, the divergence from the `ReferenceLink` Cmd+click handler (which calls both `e.preventDefault()` and `e.stopPropagation()`) creates an inconsistency that can silently break if `Card` gains an `href` or the component is ever wrapped in an anchor. The missing call is a latent trap.

**Fix:** Add `evt.preventDefault()` next to the existing `evt.stopPropagation()` for symmetry with `ReferenceLink`:

```tsx
if (evt.metaKey || evt.ctrlKey) {
  evt.preventDefault();      // ← add this
  evt.stopPropagation();
  // ...
}
```

---

## Info

### IN-01: Incorrect return type cast on renderHarness in peek-reference-link test

**File:** `src/__tests__/peek-reference-link.test.tsx:83-94`
**Issue:** `renderHarness` casts the return of `render(...)` to `unknown as React.ReactElement`. RTL's `render` returns `RenderResult`, not `ReactElement`. The cast is harmless at runtime because the return value is never used by callers, but it is a misleading type annotation that could confuse future readers or cause a type error if a caller ever tries to use the returned value.

**Fix:** Change the return type annotation (or remove it since the return value is unused):

```tsx
// Option A — declare return as void (since callers ignore the result)
function renderHarness(reference = 'Patient/pat-x'): void {
  render(/* ... */);
}

// Option B — use the correct RTL type
import type { RenderResult } from '@testing-library/react';
function renderHarness(reference = 'Patient/pat-x'): RenderResult {
  return render(/* ... */);
}
```

---

### IN-02: Large number of scaffold-only tests assert nothing meaningful

**File:** `src/__tests__/resource-detail.test.tsx:151-192`, `src/__tests__/reference-navigation.test.tsx:210-267`
**Issue:** Nineteen test cases reduce to `expect(ResourceDetailPage).toBeDefined()` or `expect(true).toBe(true)`. These pass trivially but provide zero coverage of the named behavior (e.g., "shows loading skeleton while resource is being fetched", "calls preventDefault on intercepted click"). When a regression occurs in these paths, the test suite will not catch it.

**Fix:** Either implement the tests or mark them explicitly as placeholders with `it.todo(...)` so they appear as skipped (not passing) in the CI report and signal that coverage is missing:

```tsx
// Before (false confidence — always green)
it('shows loading skeleton while resource is being fetched', () => {
  expect(ResourceDetailPage).toBeDefined();
});

// After (honest placeholder — shows as "todo" in vitest output)
it.todo('shows loading skeleton while resource is being fetched');
```

---

### IN-03: Untyped `any` in test helper parameter

**File:** `src/__tests__/peek-drawer.test.tsx:77`
**Issue:** The `Opener` helper component accepts `resource: any`. This bypasses TypeScript checking for the resource object passed to `openPeek`, meaning a test could pass a structurally invalid resource and the type system would not catch it. The `usePeek().openPeek` signature accepts `Resource`, so the parameter type should match.

**Fix:**

```tsx
import type { Resource } from '@medplum/fhirtypes';

function Opener({ resource }: { resource: Resource }) {
  const { openPeek } = usePeek();
  return (
    <button onClick={() => openPeek(resource, document.activeElement as HTMLElement)}>
      open
    </button>
  );
}
```

The existing test fixture `{ resourceType: 'Patient', id: 'pat-1' }` already satisfies the `Resource` shape, so no test changes are needed beyond the type annotation.

---

### IN-04: refUrl in RelatedResourcesPanel error path uses unencoded refValue

**File:** `src/components/explorer/RelatedResourcesPanel.tsx:64`
**Issue:** `const refUrl = \`${e.type}?${e.param}=${refValue}\`` constructs a URL string for use as the drawer title in the error state. If `refValue` contains characters that would need URL encoding (e.g., a reference like `Patient/p1%2F2` or a reference with a pipe separator from an identifier search), the refUrl will contain unencoded characters. In the current codebase, `refValue` is always a plain `ResourceType/id` string (no special characters), so this is not a present bug. However, it should be noted as a gap if `refValue` is ever widened.

**Fix:** For correctness, encode the value component if `refValue` may ever contain special characters:

```tsx
const refUrl = `${e.type}?${e.param}=${encodeURIComponent(refValue)}`;
```

Since `refUrl` is only used as a display string (drawer title), not as an actual URL for navigation, the encoding is not strictly required today — but would keep the string round-trip safe.

---

_Reviewed: 2026-05-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
