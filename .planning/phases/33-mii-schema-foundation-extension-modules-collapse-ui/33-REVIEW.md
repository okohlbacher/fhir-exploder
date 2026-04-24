---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/__tests__/mii-modules.test.ts
  - src/components/dashboard/DashboardPage.tsx
  - src/components/patients/ClinicalTimeline.tsx
  - src/components/patients/MiiModuleTab.tsx
  - src/components/patients/MiiModuleTabs.tsx
  - src/components/patients/__tests__/ClinicalTimeline.test.tsx
  - src/components/patients/__tests__/MiiModuleTab.test.tsx
  - src/utils/mii-modules.ts
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 33 delivers the MII schema foundation (widened `MiiModule` interface with optional per-type override maps, `category` partition), extension-module UI plumbing (Collapse blocks in `MiiModuleTabs` and `DashboardPage`), and the per-type fan-out in `MiiModuleTab` that will carry Phase 34's 14 extension modules. Code is well-commented, references decision identifiers (D-04..D-17), and includes robust test coverage for helpers, fan-out, and forward-compat shapes.

No critical bugs or security issues found. Four warnings flag real correctness risks — primarily around unhandled promise rejections in `MiiModuleTab` (outer `Promise.all().then()` has no `.catch`, so a non-caught failure leaves `loading=true` forever), an unhandled `JSON.parse` fallback, an unsorted-result risk from using `_sort=-date` on resource types that do not support the `date` search param (e.g. Condition), and a drawer count that silently treats loading/undefined types as 0. The info items are polish suggestions around duplicated helpers, dead fallbacks, and minor cosmetic redundancy.

## Warnings

### WR-01: Outer `Promise.all(...).then(...)` has no `.catch` — error path leaves `loading=true` forever

**File:** `src/components/patients/MiiModuleTab.tsx:94-102`
**Issue:** Each `fetchOne` has an inner `.catch(() => [])` which reduces each rejection to an empty array (good, per D-06). But the outer composition is `Promise.all(types.map(fetchOne)).then((perType) => { ... setLoading(false); })` with no `.catch()`. In the nominal path `Promise.all` cannot reject because each inner promise is pre-caught, so the risk is narrow — but if the `.then` callback itself throws (e.g. a bug in `getDate` against an unexpected shape, or a future regression that removes the inner catch), the resulting rejection is unhandled, `setLoading(false)` is never reached, and the spinner renders forever with no error surfaced to the user. Unlike `ClinicalTimeline.tsx` which wraps its equivalent block in `try/catch` and sets an error state, this component has no error state at all.
**Fix:**
```tsx
Promise.all(types.map(fetchOne))
  .then((perType) => {
    if (cancelled) return;
    const all = perType.flat();
    all.sort((a, b) => getDate(b).localeCompare(getDate(a)));
    setResources(all);
    setLoading(false);
  })
  .catch(() => {
    if (cancelled) return;
    // Mirror ClinicalTimeline: surface a minimal error state rather than
    // leaving the user looking at a frozen skeleton.
    setResources([]);
    setLoading(false);
  });
```
Consider also adding an `error` state field and rendering an `Alert` on failure to match the `ClinicalTimeline` states matrix contract cited in the sibling component.

### WR-02: `_sort=-date` is not universally valid — Condition/Consent/MedicationStatement URLs risk unsorted results

**File:** `src/components/patients/MiiModuleTab.tsx:80` and `src/components/patients/ClinicalTimeline.tsx:68`
**Issue:** Both call sites append `_sort=-date` unconditionally. `date` is a valid FHIR R4 search param for `Encounter`, `Observation`, `Procedure` (as an alias), and a few others — but it is NOT defined on `Condition` (which uses `recorded-date`, `onset-date`, etc.), `Consent` (no `date` search param), or `MedicationStatement` (uses `effective`). Per FHIR R4 servers should ignore unknown sort params with `handling=strict` rejecting, `handling=lenient` silently ignoring. Blaze defaults to lenient behavior, so the server returns results in arbitrary (unsorted) order for those types. The component then relies on the `getDate` / `extractDate`-driven client-side sort (`MiiModuleTab` does sort client-side; `ClinicalTimeline` does), so the visible order is still correct — but `_count=50` / `_count=100` means the server may return the *wrong* 50/100 resources when the total exceeds the page size, because truncation happens before the client sorts. A patient with 200 Conditions could miss the most recent 100.
**Fix:** Either omit `_sort` for types that do not support `date`, or build a per-type sort hint. A per-module config field (`defaultSortParam?: string`) or a per-type table mapping is the cleanest:
```ts
// in mii-modules.ts or a small sort-params.ts
const SORT_PARAM_BY_TYPE: Record<string, string> = {
  Condition: '-recorded-date',
  Observation: '-date',
  Encounter: '-date',
  Procedure: '-date',
  MedicationStatement: '-effective',
  // Consent, Patient → no sort (omit _sort)
};

// call site
const sortParam = SORT_PARAM_BY_TYPE[type];
let url = `${type}?${param}=Patient/${patientId}&_count=50`;
if (sortParam) url += `&_sort=${sortParam}`;
if (extra) url += `&${extra}`;
```
At minimum document the limitation and bump `_count` so the truncation risk is reduced.

### WR-03: Unchecked `JSON.parse` on a non-JSON string response crashes inside the per-type catch — but the error message is opaque

**File:** `src/components/patients/MiiModuleTab.tsx:86`
**Issue:** `const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;` — if `client.get` returns a string that is not valid JSON (e.g. an HTML error page from a proxy, or a plain-text server error), `JSON.parse` throws a `SyntaxError` that is caught by the `.catch(() => [] as Resource[])` below. That is acceptable per the D-06 per-type isolation, but the current behavior silently renders "No {module} data found for this patient" for what is actually a parse/server error. Users cannot tell a real empty result from a failing server. Pair this with WR-01 (no outer error surface) and failures become invisible.
**Fix:** Add a narrow `try/catch` around the parse, log a diagnostic, and/or surface the error in the outer `.catch`:
```ts
.then((raw) => {
  let bundle: Bundle;
  try {
    bundle = typeof raw === 'string' ? JSON.parse(raw) as Bundle : raw as Bundle;
  } catch (e) {
    console.warn(`MiiModuleTab: failed to parse bundle for ${type}`, e);
    return [] as Resource[];
  }
  return (bundle.entry ?? [])
    .map((e) => e.resource)
    .filter(Boolean) as Resource[];
})
```
Consider also validating `bundle.resourceType === 'Bundle'` before iterating `entry`.

### WR-04: Drawer "Server-wide count" silently treats loading/missing types as 0 — misleading during load

**File:** `src/components/dashboard/DashboardPage.tsx:528-535`
**Issue:** The drawer body computes its displayed total as:
```ts
const sum = types.reduce((acc, t) => {
  const v = counts[t];
  return acc + (typeof v === 'number' ? v : 0);
}, 0);
return sum.toLocaleString();
```
When a count is still `'loading'` or not yet populated in the `counts` record, the drawer renders a partial sum (e.g. "150" for a two-type module where only one type has landed) as if it were the authoritative total. This contrasts with the tile rendering above (`renderMiiTile`) which correctly surfaces `'—'` when any type is still loading. Users can open the drawer before `useResourceCounts` finishes and see the wrong number with no loading indicator.
**Fix:** Mirror the tile's loading-aware reducer:
```tsx
const types = fhirResourceTypesOf(selectedModule);
const c = types.reduce<number | 'loading' | undefined>((acc, t) => {
  const v = counts[t];
  if (v === 'loading' || acc === 'loading') return 'loading';
  if (typeof v === 'number') {
    return typeof acc === 'number' ? acc + v : v;
  }
  return acc;
}, undefined);
return typeof c === 'number' ? c.toLocaleString() : '—';
```
(Extracting this to a small `sumCountsForTypes(counts, types)` helper would also deduplicate with the tile reducer.)

## Info

### IN-01: Duplicated summary/date extraction logic between `MiiModuleTab` and `timeline-utils`

**File:** `src/components/patients/MiiModuleTab.tsx:19-52` (cf. `src/utils/timeline-utils.ts:44-108`)
**Issue:** `getSummary` and `getDate` in `MiiModuleTab.tsx` duplicate the concerns of `extractSummary` / `extractDate` in `timeline-utils.ts`, with subtly different field orderings (e.g. `getDate` checks `effectiveDateTime, performedDateTime, recordedDate, onsetDateTime, authoredOn, date, issued` in a single flat list; `extractDate` uses a per-resourceType switch). Two implementations of the same FHIR extraction concern will drift — especially once Phase 34 adds extension modules with new resource types.
**Fix:** Extract a shared `extractSummaryGeneric` / `extractDateGeneric` in `src/utils/fhir-helpers.ts` (or extend `timeline-utils.ts`) and have both call sites consume it. The narrower `extractDate` switch in `timeline-utils.ts` is the better abstraction — it knows per-type fields. Extend it to cover MII module types (`Consent.dateTime`, `MedicationStatement.effectiveDateTime`, etc.) and then delete `MiiModuleTab.getDate`/`getSummary`.

### IN-02: `findModuleForType(resource.resourceType, MII_MODULES)` passes the default explicitly

**File:** `src/components/patients/ClinicalTimeline.tsx:85-88`
**Issue:** `findModuleForType` already defaults its `modules` parameter to `MII_MODULES` (`src/utils/mii-modules.ts:190-195`). Passing it explicitly is harmless but adds noise and an unnecessary import (`MII_MODULES` is imported on line 7 only for this call).
**Fix:**
```tsx
import { findModuleForType } from '../../utils/mii-modules';
// ...
const moduleConfig = findModuleForType(resource.resourceType);
```
Drop `MII_MODULES` from the import list.

### IN-03: `TIMELINE_RESOURCE_TYPES` hard-codes what could be derived from `MII_MODULES`

**File:** `src/components/patients/ClinicalTimeline.tsx:27-32`
**Issue:** The timeline's 4 types (`Encounter`, `Condition`, `Procedure`, `Observation`) are a subset of MII base modules filtered by "has a clinically-relevant date" (excluding Patient, Consent, MedicationStatement). This is hardcoded today; Phase 34's extension modules (e.g. Bildgebung with `ImagingStudy`/`DiagnosticReport`) would also be reasonable timeline sources but will not appear because the constant is frozen.
**Fix:** Either add a `timelineRelevant: boolean` flag on `MiiModule` and derive `TIMELINE_RESOURCE_TYPES` from `MII_MODULES.filter(m => m.timelineRelevant).flatMap(fhirResourceTypesOf)`, or leave a TODO referencing Phase 34 so the coupling is explicit. Low priority since the phase decision explicitly scopes timeline to these 4 types (D-07).

### IN-04: Dead fallback branch in `renderMiiTile` reducer — `v === undefined && acc === number`

**File:** `src/components/dashboard/DashboardPage.tsx:192-199`
**Issue:** The reducer's final `return acc;` covers the case where `v` is neither `'loading'` nor a number (i.e. the count for this type is missing from the record). For multi-type modules this silently drops the missing type from the sum and shows only partial types as the "combined" tile count. With Phase 34's extension modules this could mean a Bildgebung tile showing only `ImagingStudy` count if `DiagnosticReport` is not enumerated in `useResourceCounts`. Since `useResourceCounts` is seeded from `resourceTypeNames` (every type in `CapabilityStatement`), this should not happen in practice on a well-formed server — but it is a silent failure mode.
**Fix:** Either add a console warning in dev mode, or mirror WR-04 and surface `'—'` / `'loading'` on any undefined type:
```ts
if (v === undefined) return 'loading'; // treat unknown as still-loading
```
Either decision is valid — pick one and document it next to the reducer.

### IN-05: Test cast `as unknown as string` leaks a typed-array into a `string | string[]` slot

**File:** `src/__tests__/mii-modules.test.ts:221`
**Issue:** `fhirResourceType: ['ImagingStudy', 'DiagnosticReport'] as unknown as string` uses a double-cast to satisfy an older narrow schema. Now that plan 33-03 has widened `MiiModule.fhirResourceType` to `string | string[]` (confirmed in `src/utils/mii-modules.ts:32`), the cast is no longer needed — the array assigns cleanly. The cast masks the widened type and would hide a real regression if the schema narrowed again.
**Fix:**
```ts
{
  key: 'bildgebung',
  germanLabel: 'Bildgebung',
  fhirResourceType: ['ImagingStudy', 'DiagnosticReport'], // no cast
  category: 'extension',
  badgeColor: 'cyan',
  patientSearchParam: 'patient',
}
```
Also remove the `as MiiModule[]` cast on the enclosing array once this is clean.

### IN-06: `toRecord(r).status as string ?? ''` — cast-then-nullish is redundant

**File:** `src/components/patients/MiiModuleTab.tsx:154`
**Issue:** `{toRecord(r).status as string ?? ''}` asserts `string` *before* the `??` check, so when `status` is `undefined` the expression evaluates `(undefined as string) ?? ''` → `''`. This works because JS is not type-checked at runtime, but the TS assertion is lying about the type. If the compiler later tightens its view of `as` unsafe narrowing, this will warn.
**Fix:**
```tsx
{(toRecord(r).status as string | undefined) ?? ''}
```
Or use a small helper: `function getStatus(r: Resource): string { const s = toRecord(r).status; return typeof s === 'string' ? s : ''; }`.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
