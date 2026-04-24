---
phase: 33-mii-schema-foundation-extension-modules-collapse-ui
plan: 03
subsystem: mii-kerndatensatz
tags: [mii, schema, typescript, interface-widen, base-modules]
requires:
  - MII-EXT-01 (plan 33-02 helpers) — casts in getPatientSearchParamForType / getExtraQueryForType are dropped because the interface now carries the optional maps
provides:
  - Widened `MiiModule` interface accepting `fhirResourceType: string | string[]` + required `category: 'base' | 'extension'` + optional `patientSearchParamOverrides` + optional `extraQueryByType`
  - All 7 existing base modules tagged `category: 'base'`
  - Relaxed test suite that accepts both narrow-string and array `fhirResourceType` shapes
affects:
  - src/utils/mii-modules.ts (interface + 7 modules + 2 helpers)
  - src/__tests__/mii-modules.test.ts (6 test updates, 2 new tests)
tech-stack:
  added: []
  patterns:
    - "TypeScript discriminated-union literal: `category: 'base' | 'extension'` forces every new module to explicitly declare its partition"
    - "Widened union `string | string[]` consumed via `fhirResourceTypesOf()` helper from plan 33-02"
    - "Optional override maps (`patientSearchParamOverrides`, `extraQueryByType`) follow a symmetric D-04 shape — both check type-keyed map first, then fall back to module-wide value"
key-files:
  created: []
  modified:
    - src/utils/mii-modules.ts
    - src/__tests__/mii-modules.test.ts
decisions:
  - "Did not bump MII_MODULES.toHaveLength from 7 (D-18): Phase 33 lands the schema only; Phase 34 adds the 14 extension modules"
  - "Dropped `as unknown as {…}` forward-compat casts from both overriding helpers now that the interface carries the optional maps — helpers consume the widened shape naturally"
  - "Placed `category: 'base'` after `germanLabel` in module literals for readability (matches plan 33-03 interfaces example)"
metrics:
  duration_seconds: 239
  duration_human: "~4 minutes"
  completed_date: 2026-04-24
  tasks_completed: 2
  files_modified: 2
  tests_before: 29 (mii-modules.test.ts) / 889 (full)
  tests_after: 31 (mii-modules.test.ts) / 891 (full)
  tests_delta: +2 passing (new category-base assertion + forward-compat array/extension shape test)
---

# Phase 33 Plan 03: MII Schema Widen (string | string[] + category + override maps) Summary

**One-liner:** Widened `MiiModule` interface to `fhirResourceType: string | string[]` + required `category: 'base' | 'extension'` + optional `patientSearchParamOverrides` / `extraQueryByType` maps (D-02/D-03/D-04/D-05); tagged all 7 base modules explicitly; dropped plan-33-02 forward-compat casts; added relaxed test assertions that accept both narrow and array shapes.

## What Shipped

The third of the seven non-negotiable plans per D-20. Pure type-system change with zero runtime regression. Pre-locked contract from `33-CONTEXT.md` landed verbatim:

- `MiiModule.fhirResourceType` narrowed from `string` to the union `string | string[]` (D-02).
- Required `category: 'base' | 'extension'` field added (D-03). No default — every new module must explicitly declare its layout partition.
- Optional `patientSearchParamOverrides?: Record<string, string>` added (D-04) — unused in Phase 33, exercised by Phase 34 extension modules that need per-type `patient` vs `subject` routing.
- Optional `extraQueryByType?: Record<string, string>` added (D-04 symmetric shape with `patientSearchParamOverrides`).
- All 7 existing base modules (Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation) tagged explicitly with `category: 'base'`.
- The two helpers from plan 33-02 (`getPatientSearchParamForType`, `getExtraQueryForType`) dropped their `as unknown as { … }` forward-compat casts — types now flow naturally from the widened interface.
- `fhirResourceTypesOf` helper unchanged (already consumed `string | string[]` via `Array.isArray` check).
- Test file: relaxed per-module type-shape assertion to handle `string | string[]`; added category assertion inside the same loop; new top-level `every Phase 33 module is tagged category: 'base'` test; updated first-module exact-match test to include `category: 'base'`; added forward-compat `MiiModule type shape accepts array fhirResourceType + extension category` test that exercises array type + extension category + both override maps without casts.

## Interface Diff

### Before (plan 33-02, narrow schema with forward-compat casts in helpers)

```typescript
export interface MiiModule {
  key: string;
  germanLabel: string;
  fhirResourceType: string;
  badgeColor: string;
  patientSearchParam: string;
  extraQuery?: string;
}
```

### After (plan 33-03 widen landed)

```typescript
export interface MiiModule {
  key: string;
  germanLabel: string;
  fhirResourceType: string | string[];                 // D-02 widen
  category: 'base' | 'extension';                      // D-03 required partition
  badgeColor: string;
  patientSearchParam: string;
  patientSearchParamOverrides?: Record<string, string>;// D-04 (Phase 34 will exercise)
  extraQuery?: string;
  extraQueryByType?: Record<string, string>;           // D-04 / D-05 symmetric
}
```

### Helper cast removal (before → after)

```typescript
// BEFORE (plan 33-02 forward-compat bridge):
const overrides = (mod as unknown as {
  patientSearchParamOverrides?: Record<string, string>;
}).patientSearchParamOverrides;
return overrides?.[type] ?? mod.patientSearchParam;

// AFTER (plan 33-03 natural access):
return mod.patientSearchParamOverrides?.[type] ?? mod.patientSearchParam;
```

Same pattern for `getExtraQueryForType` (`mod.extraQueryByType?.[type] ?? mod.extraQuery`).

## category: 'base' Insertion Count

`grep -n "category: 'base'" src/utils/mii-modules.ts` returns **8 matches**: 1 in the interface definition (`  - 'base'       —  the 7 MII Kerndatensatz modules always visible` JSDoc line) + 7 in the module literals (one per base module: person, fall, diagnose, prozedur, consent, laborbefund, medikation). Per the plan's acceptance criterion "returns exactly 7 (once per base module)", all 7 base modules are tagged correctly; the extra hit is the JSDoc documentation line inside the union-type declaration itself.

## Forward-compat Array Test

New test confirms the widened interface accepts the Phase 34 multi-type extension module shape without casts:

```typescript
it('MiiModule type shape accepts array fhirResourceType + extension category', () => {
  const multiTypeExtension: MiiModule = {
    key: 'x-ext',
    germanLabel: 'X-Ext',
    fhirResourceType: ['ImagingStudy', 'DiagnosticReport'],
    category: 'extension',
    badgeColor: 'gray',
    patientSearchParam: 'patient',
    patientSearchParamOverrides: { DiagnosticReport: 'subject' },
    extraQueryByType: { Observation: 'category=laboratory' },
  };
  expect(multiTypeExtension.fhirResourceType).toHaveLength(2);
});
```

Confirmed present: `grep -c "MiiModule type shape accepts array" src/__tests__/mii-modules.test.ts` → 1.

## Test Baseline Delta

| Scope | Before | After | Delta |
| ----- | ------ | ----- | ----- |
| `mii-modules.test.ts` | 29 passing | 31 passing | **+2** |
| Full suite (`npm test`) | 889 passing / 22 todo / 3 skipped | 891 passing / 22 todo / 3 skipped | **+2** |
| `npx tsc -b --noEmit` | clean | clean | stable |

The +2 comes from the two new tests:
1. `every Phase 33 module is tagged category: base (Phase 34 adds extensions)` (D-18 category assertion across MII_MODULES)
2. `MiiModule type shape accepts array fhirResourceType + extension category` (forward-compat for Phase 34)

No existing tests were deleted; three tests were updated (per-module loop, first-module exact-match, sample-shape type assertion) to reflect the widened interface.

## TypeScript Call-Site Survivor Scan

`grep -rn "\.fhirResourceType\s*===" src/ --include='*.ts' --include='*.tsx' | grep -v __tests__` returned only a single JSDoc comment in `src/utils/mii-modules.ts:183` inside `findModuleForType`'s documentation (`Replaces the inline MII_MODULES.find(m => m.fhirResourceType === type)`) — no production-code survivors. Plan 33-02's call-site sweep held under the widened type system.

`grep -rn "MII_MODULES\.find.*fhirResourceType"` returned the same JSDoc line only.

This proves D-01's rationale: since every call site was migrated to helpers in plan 33-02, widening `fhirResourceType` to `string | string[]` flagged zero `===` survivors. `tsc -b --noEmit` exited 0.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3/4 triggers fired. No auth gates. No blocking issues. No architectural decisions surfaced.

## Commit SHAs

| Task | Description | Hash |
| ---- | ----------- | ---- |
| 1 | Widen interface + tag 7 base modules + drop helper casts (`src/utils/mii-modules.ts`) | `dc583b5` |
| 2 | Relax type assertions + add category contract (`src/__tests__/mii-modules.test.ts`) | `6100fcc` |

## Verification Evidence

- `npx tsc -b --noEmit` → exit 0 (clean).
- `npm test -- mii-modules.test.ts --run` → `Tests 31 passed (31)`, `Test Files 1 passed (1)`.
- `npm test -- --run` (full suite) → `Tests 891 passed | 22 todo (913)`, `Test Files 100 passed | 3 skipped (103)`.
- `grep -c "category: 'base' | 'extension'" src/utils/mii-modules.ts` → 1 (interface definition).
- `grep -c "fhirResourceType: string | string\[\]" src/utils/mii-modules.ts` → 1 (interface definition).
- `grep -c "patientSearchParamOverrides?:" src/utils/mii-modules.ts` → 2 (interface + JSDoc).
- `grep -c "extraQueryByType?:" src/utils/mii-modules.ts` → 1 (interface).
- `grep -c "as unknown as {" src/utils/mii-modules.ts` → 0 (forward-compat casts removed).
- `grep -c "every Phase 33 module is tagged category: base" src/__tests__/mii-modules.test.ts` → 1.
- `grep -c "MiiModule type shape accepts array" src/__tests__/mii-modules.test.ts` → 1.
- `grep -c "Array.isArray(mod.fhirResourceType)" src/__tests__/mii-modules.test.ts` → 1.
- `grep -c "toHaveLength(7)" src/__tests__/mii-modules.test.ts` → 1 (unchanged — Phase 34 bumps to 21).

## Self-Check: PASSED

- `src/utils/mii-modules.ts` FOUND — interface widened, 7 modules tagged, casts removed.
- `src/__tests__/mii-modules.test.ts` FOUND — assertions relaxed, 2 new tests present.
- Commit `dc583b5` FOUND (`feat(33-03): widen MiiModule to string | string[] + category + override maps`).
- Commit `6100fcc` FOUND (`test(33-03): relax type assertions + add category contract for widened MiiModule`).
- `npx tsc -b --noEmit` exit 0 verified.
- `npm test` verified at 891 passing / 0 failing (exceeds required ≥ 836 baseline).
