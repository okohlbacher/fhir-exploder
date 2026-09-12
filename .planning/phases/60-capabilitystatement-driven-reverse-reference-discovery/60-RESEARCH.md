# Phase 60 Research: CapabilityStatement-Driven Reverse-Reference Discovery

**Status:** RESEARCH COMPLETE
**Researcher:** Orchestrator (direct codebase analysis — subagent timed out twice)
**Date:** 2026-05-27

---

## Executive Summary

Phase 60 is a well-scoped extension of existing infrastructure. The `ConnectionContext.tsx` already fetches and stores a `CapabilityStatement` — this phase adds a pure-function parser that converts that already-available capability into a dynamic `ReverseReferenceCatalog`, stores it in connected state, and threads it into `IncomingReferencesPanel` with per-type curated fallback. The key design risk (target-type inference from search param names) is resolved by a convention-based approach with a FHIR R4 ResourceType allowlist — conservative but correct for Phase 60 given REVR-DYN-EXT is deferred.

---

## Finding 1 — CapabilityStatement Structure and Parse Path

### What `rest[0].resource[*].searchParam` contains

Each entry in `capability.rest[0].resource` describes one FHIR resource type and its search capabilities:

```
{
  type: "Encounter",           // source resource type
  searchParam: [
    { name: "patient", type: "reference" },   // ← Encounter references Patient
    { name: "subject", type: "reference" },   // ← polymorphic, target unclear
    { name: "date",    type: "date"      },   // ← not a reference, skip
  ]
}
```

The **reverse** interpretation: if `Encounter.searchParam` has `{ name: "patient", type: "reference" }`, then `Encounter` can reference `Patient` → contribute `{ type: 'Encounter', param: 'patient' }` to `dynamicCatalog['Patient']`.

### Existing parse precedent

`src/fhir/capability.ts` already accesses this structure:

```typescript
const restResources = capabilityStatement.rest?.[0]?.resource ?? [];
return restResources.map((resource: CapabilityStatementRestResource) => ({
  type: resource.type ?? 'Unknown',
  searchParams: (resource.searchParam ?? []).map(sp => sp.name ?? '').filter(Boolean),
  // ...
}));
```

`buildDynamicCatalog` follows the same defensive access pattern (`rest?.[0]?.resource ?? []`). The type import is `CapabilityStatementRestResource` from `@medplum/fhirtypes` (already used in `capability.ts`).

---

## Finding 2 — Target ResourceType Inference (D-06 Resolution)

**The problem**: Given a search param `{ name: "patient", type: "reference" }` on `Encounter`, we need to know the target is `Patient`. The CapabilityStatement's `searchParam.type === 'reference'` tells us it's a reference but not *to what* (that's in a `SearchParameter` resource, which requires a follow-up fetch — REVR-DYN-EXT, explicitly deferred).

**Chosen approach: Convention + FHIR R4 ResourceType allowlist**

The vast majority of standard FHIR R4 reference search params are named after their target resource type in lowercase (e.g., `patient` → `Patient`, `encounter` → `Encounter`, `practitioner` → `Practitioner`). A small set of params are polymorphic (`subject`, `focus`, `based-on`) or non-obvious (`context`, `reason-reference`, `result`). These are already covered by the curated catalog.

**Algorithm for `buildDynamicCatalog`:**

```
for each resource in capability.rest[0].resource:
  sourceType = resource.type
  for each sp in resource.searchParam where sp.type === 'reference':
    paramName = sp.name
    candidate = capitalize(paramName)  // "patient" → "Patient"
    if candidate is in FHIR_R4_RESOURCE_TYPE_SET:
      dynamicCatalog[candidate] ??= []
      dynamicCatalog[candidate].push({ type: sourceType, param: paramName })
```

**Scope of coverage**: This handles `patient`, `encounter`, `practitioner`, `organization`, `location`, `medication`, `device`, `observation`, `condition`, `procedure`, `immunization`, `allergyintolerance`, `diagnosticreport`, `imagingstudy`, `servicerequest`, `careteam`, `careplan`, `goal`, `consent`, and ~30 more standard resource-type-named params.

**What it skips** (correctly): `subject`, `performer`, `reason-reference`, `context`, `based-on`, `result`, `has-member`, `derived-from`, `target` — all polymorphic or non-obvious. The curated catalog handles these via per-type fallback (D-09).

**FHIR_R4_RESOURCE_TYPE_SET**: A `Set<string>` of all 145 FHIR R4 resource type names. This can be derived from `@medplum/fhirtypes` by importing the `ResourceType` union and extracting its values, or maintained as a static `Set` inline in `capabilityStatementCatalog.ts`. The simpler approach: use a hardcoded `Set` of the ~50 most common types plus any type that appears in the curated catalog. Full 145-type coverage is achievable with a one-liner using `@medplum/fhirtypes`'s ResourceType, but static Set is simpler and sufficient.

**Alternative considered (rejected)**: Using curated catalog entries as anchors only — would produce an identical result to the curated catalog for all existing entries, defeating the purpose of dynamic discovery for novel entries. Rejected.

---

## Finding 3 — `ConnectionState` Type Extension

**File**: `src/fhir/types.ts`

**Current** (line 8-9):
```typescript
| { status: 'connected'; client: MedplumClient; capability: CapabilityStatement }
```

**Required**:
```typescript
| { status: 'connected'; client: MedplumClient; capability: CapabilityStatement; dynamicCatalog: ReverseReferenceCatalog }
```

Import needed: `ReverseReferenceCatalog` from `../utils/reverseReferenceCatalog` (or re-export it from the new `capabilityStatementCatalog.ts` — but importing from `reverseReferenceCatalog.ts` directly avoids circular import risk).

---

## Finding 4 — `ConnectionContext.tsx` Insertion Point

**File**: `src/contexts/ConnectionContext.tsx`

**Current** (line 35):
```typescript
setState({ status: 'connected', client, capability });
```

**Required**:
```typescript
const dynamicCatalog = buildDynamicCatalog(capability);
setState({ status: 'connected', client, capability, dynamicCatalog });
```

Import needed:
```typescript
import { buildDynamicCatalog } from '../utils/capabilityStatementCatalog';
```

**Placement**: After line 34 (`if (!capability || capability.resourceType !== 'CapabilityStatement')`) and before line 35 (`setState`). `buildDynamicCatalog` must return `{}` (empty catalog) on any unexpected input so that the existing try/catch in `connect()` is not triggered — graceful degradation is the contract.

**Error handling**: `buildDynamicCatalog` itself must not throw on well-formed but sparse/empty CapabilityStatements. The try/catch at line 36-39 would convert any throw into `ConnectionError` with `status: 'error'` — which is the wrong behavior for "no searchParams advertised." Return `{}` instead.

---

## Finding 5 — `IncomingReferencesPanel` Integration

**File**: `src/components/explorer/IncomingReferencesPanel.tsx`

**Current** (line 2, 17):
```typescript
import { reverseReferenceCatalog } from '../../utils/reverseReferenceCatalog';
// ...
const entries = reverseReferenceCatalog[resource.resourceType] ?? [];
```

**Required change**:
```typescript
import { reverseReferenceCatalog } from '../../utils/reverseReferenceCatalog';
import { useConnectionContext } from '../../contexts/ConnectionContext';
// ...
const { state } = useConnectionContext();
const dynamicCatalog = state.status === 'connected' ? state.dynamicCatalog : {};
// Per-type merge (D-07): union of dynamic + curated, deduplicated by entryKey
const dynamicEntries = dynamicCatalog[resource.resourceType] ?? [];
const curatedEntries = reverseReferenceCatalog[resource.resourceType] ?? [];
// Merge: start with dynamic, add curated entries not already in dynamic
const seen = new Set(dynamicEntries.map(e => `${e.type}:${e.param}`));
const entries = [
  ...dynamicEntries,
  ...curatedEntries.filter(e => !seen.has(`${e.type}:${e.param}`)),
];
```

**Why not add hook to a class component**: `IncomingReferencesPanel` is already a function component. `useConnectionContext` is safe to call here.

**Fallback path (D-08, D-09)**: When `state.status !== 'connected'` (impossible in practice — `IncomingReferencesPanel` is only rendered on a connected resource detail page, but correct for type safety), `dynamicCatalog` is `{}`, so `entries` falls back entirely to `curatedEntries`. When `dynamicCatalog[resourceType]` is empty for a specific type (D-09 per-type fallback), `curatedEntries` fills in transparently.

**No toast/banner on fallback**: The merge logic is transparent — no UI indication of which catalog source was used. This satisfies success criterion 3.

---

## Finding 6 — New File: `src/utils/capabilityStatementCatalog.ts`

```typescript
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { ReverseReferenceCatalog, ReverseReferenceEntry } from './reverseReferenceCatalog';

// Conservative set of FHIR R4 resource types that appear as reference param names.
// Extend this set if new types emerge from servers.
const COMMON_REFERENCE_TARGETS = new Set([
  'Patient', 'Encounter', 'Practitioner', 'Organization', 'Location',
  'Medication', 'Device', 'Observation', 'Condition', 'Procedure',
  'Immunization', 'AllergyIntolerance', 'DiagnosticReport', 'ImagingStudy',
  'ServiceRequest', 'CarePlan', 'CareTeam', 'Goal', 'Consent',
  'MedicationRequest', 'MedicationStatement', 'MedicationDispense',
  'Coverage', 'Claim', 'ClaimResponse', 'Provenance', 'RelatedPerson',
  'Specimen', 'BodyStructure', 'DocumentReference', 'Composition',
  'Communication', 'Task', 'Appointment', 'Schedule', 'Slot',
  'PractitionerRole', 'HealthcareService', 'Endpoint', 'Group', 'List',
]);

/** Capitalize first letter of a string (e.g. "patient" → "Patient"). */
function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Build a reverse-reference catalog from the connected server's CapabilityStatement.
 *
 * Parses `rest[0].resource[*].searchParam`, filters to `type: 'reference'` entries,
 * infers target resource type by capitalizing the param name (convention-based),
 * and returns a `ReverseReferenceCatalog` keyed by target resource type.
 *
 * Returns `{}` (empty catalog) when:
 * - `capability.rest` is absent or empty
 * - No reference-typed search params are found
 * - No param names map to known resource types
 *
 * Never throws — callers rely on graceful degradation.
 */
export function buildDynamicCatalog(capability: CapabilityStatement): ReverseReferenceCatalog {
  const catalog: Record<string, ReverseReferenceEntry[]> = {};
  const resources = capability.rest?.[0]?.resource ?? [];

  for (const resource of resources) {
    const sourceType = resource.type;
    if (!sourceType) continue;
    for (const sp of resource.searchParam ?? []) {
      if (sp.type !== 'reference' || !sp.name) continue;
      const targetType = capitalize(sp.name);
      if (!COMMON_REFERENCE_TARGETS.has(targetType)) continue;
      catalog[targetType] ??= [];
      catalog[targetType].push({ type: sourceType as ReverseReferenceEntry['type'], param: sp.name });
    }
  }

  return catalog as ReverseReferenceCatalog;
}
```

**Pitfalls**:
- `resource.type` may be undefined on malformed entries — `if (!sourceType) continue` guards this.
- `sp.name` may be undefined — `!sp.name` guard.
- Return type cast `as ReverseReferenceCatalog` is needed because `Record<string, ReverseReferenceEntry[]>` is stricter than `Partial<Record<ResourceType, readonly ReverseReferenceEntry[]>>` — the cast is safe given the allowlist filter.

---

## Finding 7 — Test Strategy (Success Criterion 4)

All 4 required tests fit the existing vitest + jsdom + `@testing-library/react` infrastructure.

### Test a: Parser fixture test (`capabilityStatementCatalog.test.ts`)

Location: `src/__tests__/capabilityStatementCatalog.test.ts` (parallel to `capability.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { buildDynamicCatalog } from '../utils/capabilityStatementCatalog';

const fixtureCapability = {
  resourceType: 'CapabilityStatement',
  // ...minimal valid shell...
  rest: [{
    mode: 'server',
    resource: [
      { type: 'Encounter', searchParam: [
        { name: 'patient', type: 'reference' },  // → dynamicCatalog.Patient gets Encounter
        { name: 'subject', type: 'reference' },  // → skipped (not in allowlist)
        { name: 'date',    type: 'date'      },  // → skipped (not reference)
      ]},
    ]
  }]
};

// Tests: correct shape, filtered entries, empty-input graceful return
```

### Test b: Panel renders dynamic catalog entries

Location: extend `IncomingReferencesPanel.test.tsx` or a parallel `60-IncomingReferencesPanel-dynamic.test.tsx`

Mock `useConnectionContext` to return a `connected` state with a `dynamicCatalog` that has an entry for `Observation` that differs from the curated catalog. Assert the panel shows the dynamic entry.

### Test c: Panel falls back to curated entries on failed dynamic

Mock `useConnectionContext` to return `{ state: { status: 'idle' } }` (simulates pre-connection fallback path). Assert the panel still renders curated catalog entries for `Observation`.

### Test d: Per-server cache invalidates on server-URL change

This is a `ConnectionContext` integration test. The existing `connection-context.test.tsx` pattern works: render `ConnectionProvider`, call `connect()` with server A, assert `dynamicCatalog` populated; call `disconnect()` and `connect()` with server B, assert `dynamicCatalog` reflects server B. The cache is inherently per-connection because `setState` replaces state on each `connect()` — no explicit cache object needed.

**Existing test file to extend**: `src/__tests__/connection-context.test.tsx` — already mocks `createFhirClient` and `classifyError` with `vi.spyOn`.

---

## Finding 8 — Deduplication Logic

Per D-07, the merge uses the `entryKey` pattern from `RelatedResourcesPanel.tsx`:

```typescript
const entryKey = (e: ReverseReferenceEntry) => `${e.type}:${e.param}`;
```

The merge in `IncomingReferencesPanel` builds a `Set<string>` of keys from dynamic entries, then appends curated entries whose key is not in the set. This avoids duplicates when both catalogs know about the same (type, param) pair (e.g., both know `Encounter` references `Patient` via `patient` param).

The dedup logic does NOT need to be extracted to a shared utility — it's 3 lines and is only needed in `IncomingReferencesPanel`. Over-abstracting this would violate the principle of minimal surface area.

---

## Finding 9 — TypeScript Considerations

### `ReverseReferenceEntry['type']` cast

`ReverseReferenceEntry.type` is typed as `ResourceType` from `@medplum/fhirtypes`. The `sourceType` string from `resource.type` is a plain `string` at runtime. The cast `sourceType as ReverseReferenceEntry['type']` (or `as ResourceType`) is required. This is safe because only resources returned by the server's CapabilityStatement are included, and FHIR servers only advertise valid resource types.

### `readonly` arrays

`ReverseReferenceCatalog` values are `readonly ReverseReferenceEntry[]`. The dynamic catalog builder uses a mutable `ReverseReferenceEntry[]` internally and casts to `ReverseReferenceCatalog` at return — this is consistent with how `reverseReferenceCatalog.ts` uses `as const satisfies ReverseReferenceCatalog`.

### `tsc -b --noEmit` clean

The `types.ts` change adds an import from `reverseReferenceCatalog.ts` — verify there is no circular import. Current import graph: `ConnectionContext.tsx` → `types.ts` → (new) `reverseReferenceCatalog.ts`. `reverseReferenceCatalog.ts` has no imports from `types.ts` or `ConnectionContext.tsx`. No circular dependency.

---

## Finding 10 — What NOT to Do (Pitfalls)

1. **Do not add a second `/metadata` fetch**. The capability is already in `connected.capability`. `buildDynamicCatalog` receives the already-parsed `CapabilityStatement` object — no network call needed.

2. **Do not throw in `buildDynamicCatalog`**. The function is called inside `connect()`'s try block. A throw would surface as a `ConnectionError`, preventing the connection from completing. Return `{}` on any edge case.

3. **Do not delete `reverseReferenceCatalog.ts`**. It remains the fallback and is still imported by `IncomingReferencesPanel` for the per-type fallback logic.

4. **Do not attempt `searchParam.definition` URL follow**. REVR-DYN-EXT is deferred. Ignore `sp.definition` field entirely.

5. **Do not break existing `IncomingReferencesPanel` tests**. The existing tests mock `reverseReferenceCatalog` directly. After Phase 60, the panel also reads from `useConnectionContext`. Tests need to mock both. The existing tests that don't mock `useConnectionContext` will need a mock added.

6. **Do not hardcode `rest[0]`** as an array index without null-checking. Use `rest?.[0]?.resource ?? []` (same pattern as `capability.ts`).

---

## Validation Architecture

### Test Infrastructure

- **Framework**: vitest 3.x + jsdom
- **Config**: `vitest.config.ts` (root)
- **Quick run**: `npx vitest run src/__tests__/capabilityStatementCatalog.test.ts`
- **Full suite**: `npm test`
- **Build check**: `tsc -b --noEmit && npm run build`

### Required Test Files

| File | Status | Tests Covered |
|------|--------|---------------|
| `src/__tests__/capabilityStatementCatalog.test.ts` | NEW | Criteria 4a (parser fixture) |
| `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | EXTEND | Criteria 4b (dynamic render), 4c (curated fallback) |
| `src/__tests__/connection-context.test.tsx` | EXTEND | Criteria 4d (per-server cache invalidation) |

### Per-Task Automation

| Plan | Task | Automated Check | File |
|------|------|-----------------|------|
| 60-01 | buildDynamicCatalog | `npx vitest run src/__tests__/capabilityStatementCatalog.test.ts` | NEW |
| 60-01 | ConnectionState type | `tsc -b --noEmit` | `types.ts` |
| 60-01 | connect() integration | `npx vitest run src/__tests__/connection-context.test.tsx` | EXTEND |
| 60-02 | Panel dynamic render | `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | EXTEND |
| 60-02 | Panel curated fallback | same | EXTEND |
| 60-02 | Full build | `npm run build` | — |

### Manual-Only Verification

| Behavior | Criterion | Why Manual |
|----------|-----------|------------|
| Dynamic catalog produces non-empty result on real Blaze | Success criterion 2 | Requires live Blaze server with Synthea data |
| Encounter detail page shows additional reference types | Success criterion 2 | Requires server advertising >9 Encounter reference params |

---

## Summary of Files to Touch

| File | Change |
|------|--------|
| `src/utils/capabilityStatementCatalog.ts` | CREATE — `buildDynamicCatalog` pure function |
| `src/fhir/types.ts` | EXTEND — add `dynamicCatalog: ReverseReferenceCatalog` to connected state |
| `src/contexts/ConnectionContext.tsx` | EXTEND — call `buildDynamicCatalog`, store in state |
| `src/components/explorer/IncomingReferencesPanel.tsx` | REFACTOR — read from context, merge with curated per-type fallback |
| `src/__tests__/capabilityStatementCatalog.test.ts` | CREATE — 4a parser test |
| `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | EXTEND — 4b+4c tests |
| `src/__tests__/connection-context.test.tsx` | EXTEND — 4d cache invalidation test |

**Files NOT to touch**: `src/utils/reverseReferenceCatalog.ts` (curated catalog stays as-is), any other component.

---

## RESEARCH COMPLETE

Phase 60 is well-understood. Two plans as pre-decided in ROADMAP/CONTEXT:
- **60-01**: `buildDynamicCatalog` + `capabilityStatementCatalog.ts` + `types.ts` extension + `ConnectionContext.tsx` update + connection-context test (4d)
- **60-02**: `IncomingReferencesPanel` integration + curated fallback merge + tests 4a, 4b, 4c + full build verification
