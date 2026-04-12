---
phase: 03-patient-centric-browsing-mii-modules
reviewed: 2026-04-12T06:15:07Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/utils/mii-modules.ts
  - src/utils/timeline-utils.ts
  - src/components/patients/PatientsLayout.tsx
  - src/components/patients/PatientListPage.tsx
  - src/components/patients/PatientDetailPage.tsx
  - src/components/patients/MiiModuleTabs.tsx
  - src/components/patients/MiiModuleTab.tsx
  - src/components/patients/FhirResourcesView.tsx
  - src/components/patients/ClinicalTimeline.tsx
  - src/components/patients/TimelineEntry.tsx
  - src/hooks/useBreadcrumbTrail.ts
  - src/App.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-12T06:15:07Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 03 delivers a well-structured patient-centric browsing layer on top of the Phase 02 Explorer foundation. Architecture is sound: the connection-gate layout pattern, centralized MII module config, parameterized breadcrumb hook, and per-type error isolation in the timeline all follow the research recommendations correctly. Test coverage is solid (19 timeline utility tests, 6 patient detail tests, 7 view toggle tests).

Four warnings were found — none are blockers, but two (WR-01, WR-02) will produce visible bugs for users of the patient list and timeline on servers that emit standard FHIR 404 responses. Three info items relate to edge-case robustness and minor inconsistencies.

---

## Warnings

### WR-01: `PatientListPage` pagination splits state between manual `client.get()` and `SearchControl`'s internal bundle

**File:** `src/components/patients/PatientListPage.tsx:109-122`

**Issue:** `handlePageChange` fetches the next page via `client.get(url)` and calls `setBundle(next)`, which updates `positionText` correctly. However, `SearchControl` maintains its own internal bundle state and re-renders its rows from that. The `SearchControl` only re-fetches when its `search` prop changes; calling `client.get` outside of it cannot push a new bundle into the control. The result is that after clicking Next/Prev, the position counter updates but the displayed rows stay on the first page. This is the same pagination pattern as Phase 2's `SearchResultsPage`; if that component has the same implementation, the bug exists there too, but it is definitely present here.

**Fix:** Remove the manual pagination handler and instead update `searchRequest` (via an offset parameter) so `SearchControl` drives its own re-fetch. Mantine's `PaginationControls` passes a raw URL — extract the `_offset` or `__page-offset` parameter from it and reflect that as the `count`/offset in `searchRequest`:

```typescript
const [offset, setOffset] = useState(0);

const searchRequest = useMemo<SearchRequest>(() => ({
  resourceType: 'Patient',
  filters,
  fields: ['name', 'birthDate', 'gender', 'identifier'],
  count,
  // offset: offset   -- add when SearchRequest supports it, or encode in a filter
}), [activeSearch, count, offset]);

const handlePageChange = useCallback((url: string) => {
  try {
    const parsed = new URL(url, 'http://localhost');
    const nextOffset =
      parseInt(parsed.searchParams.get('__page-offset') ?? parsed.searchParams.get('_offset') ?? '0', 10);
    setOffset(isNaN(nextOffset) ? 0 : nextOffset);
  } catch {
    // ignore malformed URLs
  }
}, []);
```

If `SearchRequest` from `@medplum/core` does not expose an offset field directly, an alternative is to pass `start` as a FHIR `_offset` search parameter via the `filters` array.

---

### WR-02: `PatientDetailPage` "not found" detection uses fragile substring match on error message text

**File:** `src/components/patients/PatientDetailPage.tsx:84`

**Issue:** The branch `err instanceof Error && err.message.toLowerCase().includes('not found')` relies on the MedplumClient serializing a 404 HTTP response into an `Error` whose `.message` contains the literal substring "not found". This is true when Medplum wraps HTTP errors as `OperationOutcome` with a standard phrase, but a Blaze server may return a different `OperationOutcome.issue[0].details.text` (e.g. "Resource not found on server" vs "Unknown"). When the string does not match, the user sees "Failed to load patient" instead of "Patient not found" — a minor UX degradation, not a crash, but consistently wrong on standard Blaze.

**Fix:** Check the HTTP status code where possible. Medplum's `OperationOutcome` errors expose `outcome` on the error object, or the status code can be inferred from the message. A safer pattern:

```typescript
.catch((err: unknown) => {
  if (cancelled) return;
  // Medplum wraps HTTP errors; status 404 appears as "Not Found" or outcome severity/code
  const is404 =
    (err instanceof Error && /not.found|404/i.test(err.message)) ||
    (typeof (err as Record<string, unknown>).status === 'number' &&
      (err as Record<string, unknown>).status === 404);
  const message = is404
    ? `Patient not found: Patient/${patientId} does not exist on this server.`
    : `Failed to load patient: Could not retrieve Patient/${patientId}. Check your connection and try again.`;
  setError(message);
  setLoading(false);
});
```

---

### WR-03: `FhirResourcesView` `expandedType` state does not reset when `patientId` changes

**File:** `src/components/patients/FhirResourcesView.tsx:86`

**Issue:** `expandedType` is initialized to `null` once and never reset when `patientId` changes. `FhirResourcesView` is conditionally rendered (only when `viewMode === 'fhir'`) so it *unmounts* when the user switches to the MII view and back, which resets the state. However, if the user navigates from one patient directly to another while the FHIR Resources view is active — possible because `PatientDetailPage` re-renders in place when `patientId` changes via the router — the expanded row from the previous patient is still visually expanded for the new patient, even though the counts have been reset to 'loading'. This produces a confusing UI state where a stale expanded SearchControl is visible while counts re-load.

**Fix:** Add `patientId` to the state reset explicitly, or close the expansion when the patient changes:

```typescript
// Reset expansion whenever the patient changes
useEffect(() => {
  setExpandedType(null);
}, [patientId]);
```

---

### WR-04: Timeline entries with empty `resourceId` produce duplicate React keys and broken navigation

**File:** `src/components/patients/ClinicalTimeline.tsx:90, 149`

**Issue:** `resourceId: resource.id ?? ''` falls back to an empty string when a FHIR resource has no `id` field. Two such resources produce duplicate keys (`${resourceType}/`), causing React key collision warnings and non-deterministic rendering. More importantly, the `onClick` handler navigates to `/patients/${patientId}/${entry.resourceType}/` — a URL with an empty resource ID — which will be handled by the nested `:patientId/:resourceType/:id` route with `id = ''`, causing `ResourceDetailPage` to attempt `readResource(type, '')`, likely a 404 or a malformed URL request.

Resources returned by a FHIR server in a Bundle via `searchResources` should always have an `id`, but the FHIR spec allows transient/contained resources without one. Filtering them out is safer than allowing a broken navigation path.

**Fix:** In the `.map` step, return `null` when `resource.id` is absent (same pattern as the date filter):

```typescript
.map((resource): TimelineData | null => {
  const date = extractDate(resource);
  if (!date) return null;
  if (!resource.id) return null;   // skip transient/contained resources
  // ...
  return {
    resourceType: resource.resourceType,
    resourceId: resource.id,       // now guaranteed non-empty
    // ...
  };
})
```

---

## Info

### IN-01: `formatTimelineDate` silently returns a partial string for inputs shorter than 10 characters

**File:** `src/utils/timeline-utils.ts:117`

**Issue:** `isoDate.substring(0, 10)` returns whatever is there when the string is shorter than 10 characters (e.g. `'2024'` returns `'2024'`, `''` returns `''`). In practice `extractDate` only returns values already present in FHIR R4 typed fields, so the inputs are well-formed. However, the function is exported as a general utility and carries no validation or documented contract about minimum input length. Future callers could inadvertently pass truncated strings.

**Fix:** Document the precondition explicitly in the JSDoc:

```typescript
/**
 * ...
 * @param isoDate A well-formed FHIR date or dateTime string with at least 10
 *                characters. Shorter inputs return a partial/malformed date.
 */
export function formatTimelineDate(isoDate: string): string {
```

---

### IN-02: `ClinicalTimeline` error `Alert` is missing a `title` prop

**File:** `src/components/patients/ClinicalTimeline.tsx:131`

**Issue:** The error Alert renders as `<Alert color="red">Failed to load timeline data.</Alert>` without a `title`. All other error alerts in the phase (`PatientDetailPage`, `PatientListPage`, `PatientsLayout`) include a `title` prop. The omission is a minor inconsistency that slightly degrades the visual hierarchy in the error state.

**Fix:**
```tsx
<Alert color="red" title="Failed to load timeline" mt="md">
  Failed to load timeline data.
</Alert>
```

---

### IN-03: `MiiModuleTab` imports `SearchChangeEvent` but handler is a no-op that could be removed

**File:** `src/components/patients/MiiModuleTab.tsx:7, 75-81`

**Issue:** `SearchChangeEvent` is imported from `@medplum/react` and used only to type the parameter of `handleChange`, which is a no-op callback (`// SearchControl may emit definition changes; we ignore them here`). The no-op handler is then passed as the `onChange` prop to `SearchControl`. Whether `onChange` is required by `SearchControl`'s props or optional determines if this can be removed entirely. If optional, passing an empty function is unnecessary coupling.

**Fix:** Check if `onChange` is required on `SearchControl`. If it is optional, remove both the import and the handler to reduce surface area:

```tsx
// Before (remove):
import type { SearchChangeEvent, SearchClickEvent, SearchLoadEvent } from '@medplum/react';
const handleChange = useCallback((_e: SearchChangeEvent) => {}, []);
// ...
onChange={handleChange}

// After (if onChange is optional on SearchControl):
import type { SearchClickEvent, SearchLoadEvent } from '@medplum/react';
// Remove handleChange and onChange prop entirely
```

---

_Reviewed: 2026-04-12T06:15:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
