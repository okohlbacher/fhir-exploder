---
phase: 46
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/utils/summarizeResource.ts
  - src/utils/__tests__/summarizeResource.test.ts
autonomous: true
requirements: [NAV-01]
must_haves:
  truths:
    - "Pure-function summarizeResource exists, exported from a single module, deterministic for every R4 type (8 typed + generic)"
    - "Unit tests cover all 8 typed + generic (>=1 test per entry, asserting both primary AND secondary shape where applicable)"
    - "npm run build clean; tsc -b --noEmit exit 0; full suite passes (no regression vs 1240 baseline)"
  artifacts:
    - path: "src/utils/summarizeResource.ts"
      provides: "Pure function summarizeResource(r, now?) -> { primary, secondary? } with typed switch over 8 R4 types + generic walker + djb2 hash"
      exports: ["summarizeResource", "Summary"]
      contains: "switch (r.resourceType)"
    - path: "src/utils/__tests__/summarizeResource.test.ts"
      provides: "~30 vitest tests covering 8 typed entries + generic + Patient fallbacks + age boundary + lab classification"
      contains: "describe('summarizeResource"
  key_links:
    - from: "src/utils/summarizeResource.ts"
      to: "src/utils/fhir-helpers.ts"
      via: "import { getCodeDisplay, toRecord } from './fhir-helpers'"
      pattern: "from './fhir-helpers'"
    - from: "src/utils/__tests__/summarizeResource.test.ts"
      to: "src/utils/summarizeResource.ts"
      via: "import { summarizeResource } from '../summarizeResource'"
      pattern: "from '../summarizeResource'"
---

<objective>
Build the pure-function `summarizeResource(r, now?) -> { primary, secondary? }` util plus its full vitest suite. Single new module `src/utils/summarizeResource.ts` (~250 LOC) with a typed switch over 8 R4 resource types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance), a `summarizeGeneric` walker for the long tail, and an inline djb2 base36-6 hash for the Patient name-missing fallback (D-03). Sibling test file `src/utils/__tests__/summarizeResource.test.ts` (~30 tests) follows the `colorVision.test.ts` convention and pins sub-decisions A1 (`gender='other' -> 'O'`), A2 (partial birthDate -> omit parenthetical), A3 (HumanName legacy comma-join `family, given1, given2`).

Purpose: This is the foundation of v1.7. Phases 47/48/49 all consume `summarizeResource` for reference rendering, incoming-references panel, and graph node labels. Locking the API + behavior here removes 3 inline duplicate implementations in PLAN 02.

Output: New module + new test file. Test baseline jumps 1240 -> ~1270. No call sites migrated yet (that's PLAN 02).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/46-theme-a-foundation-summary-util/46-CONTEXT.md
@.planning/phases/46-theme-a-foundation-summary-util/46-RESEARCH.md
@.planning/phases/46-theme-a-foundation-summary-util/46-VALIDATION.md
@CLAUDE.md
@src/utils/fhir-helpers.ts
@src/components/explorer/SearchResultsPage.tsx
@src/utils/__tests__/colorVision.test.ts
@src/utils/__tests__/searchByIdentifierPrefix.test.ts
@tsconfig.app.json

<interfaces>
<!-- Helpers reused (do NOT re-implement) - from src/utils/fhir-helpers.ts -->
```typescript
export function toRecord(resource: Resource): Record<string, unknown>;
export function toRecord<T extends object>(value: T): Record<string, unknown>;

export function getCodeDisplay(concept: CodeableConcept | undefined): string;
// Returns: text -> coding[0].display -> coding[0].code -> ''
```

<!-- Pattern to mirror (typed switch with cast inside each case) - SearchResultsPage.tsx:108-167 -->
```typescript
export function getResourceDateByType(resource: Resource): string {
  switch (resource.resourceType) {
    case 'Patient':
      return (resource as Patient).birthDate ?? '';
    case 'Encounter':
      return (resource as Encounter).period?.start?.slice(0, 10) ?? '';
    // ...
    default:
      return getResourceDate(resource);
  }
}
```

<!-- Public contract this plan creates (consumed by PLAN 02 + Phases 47/48/49) -->
```typescript
// src/utils/summarizeResource.ts
export interface Summary {
  primary: string;
  secondary?: string;
}

export function summarizeResource(r: Resource, now?: Date): Summary;
```

<!-- Test convention to mirror - src/utils/__tests__/colorVision.test.ts -->
```typescript
import { describe, it, expect } from 'vitest';
import type { Patient } from '@medplum/fhirtypes';
import { summarizeResource } from '../summarizeResource';

describe('summarizeResource - <area>', () => {
  it('does X', () => {
    const p: Patient = { resourceType: 'Patient', id: 'p1', /* ... */ };
    expect(summarizeResource(p, new Date('2026-05-01'))).toEqual({ primary: '...', secondary: '...' });
  });
});
```

<!-- TS strict mode - tsconfig.app.json -->
- `noFallthroughCasesInSwitch: true` -> every case MUST `return`
- `verbatimModuleSyntax: true` -> use `import type { Patient } from '@medplum/fhirtypes'`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Skeleton + interface + djb2 + helpers + summarizePatient (D-02 + D-03 + A1 + A2 + A3) with tests</name>
  <files>
    src/utils/summarizeResource.ts
    src/utils/__tests__/summarizeResource.test.ts
  </files>
  <read_first>
    - src/utils/fhir-helpers.ts (to import getCodeDisplay + toRecord verbatim; do NOT re-implement)
    - src/components/explorer/SearchResultsPage.tsx lines 1-167 (typed-switch pattern + import-type convention + HumanName format `[family, ...given].filter(Boolean).join(', ')` at line 39-40)
    - src/utils/__tests__/colorVision.test.ts (vitest convention: named imports, describe/it/expect, inline TS literal fixtures, relative-path imports `from '../colorVision'`)
    - src/utils/__tests__/searchByIdentifierPrefix.test.ts (typed FHIR fixtures using `@medplum/fhirtypes` literals)
    - tsconfig.app.json lines 1-30 (verify `noFallthroughCasesInSwitch: true` + `verbatimModuleSyntax: true`)
    - .planning/phases/46-theme-a-foundation-summary-util/46-RESEARCH.md sections "Pattern 1", "Hash Function", "Sub-Decision A1", "Sub-Decision A2", "Age Computation", "HumanName Formatting", "Testing Conventions"
  </read_first>
  <behavior>
    - Patient with full name + birthDate '1958-03-15' + gender 'female' + now '2026-05-01' -> `{ primary: 'Mueller, Anna (68/F)', secondary: '1958-03-15' }` (using `family: 'Mueller', given: ['Anna']`).
    - Patient HumanName with multiple givens (`family: 'Mueller', given: ['Anna', 'Maria']`) -> name part = 'Mueller, Anna, Maria' (legacy comma-join per A3; pin exact byte string).
    - Patient with `name[0].text: 'Dr. Max Mustermann'` -> uses text verbatim (text wins over family/given).
    - Patient gender mapping: `'male' -> 'M'`, `'female' -> 'F'`, `'other' -> 'O'` (per A1; assert `(45/O)`), `'unknown' -> 'U'`, undefined -> 'U'.
    - Patient age boundary: birthDate '1958-04-15' + now '2026-04-14' -> age 67 (birthday not yet); now '2026-04-15' -> age 68; now '2026-04-16' -> age 68.
    - Patient with undefined birthDate -> primary omits parenthetical (just name); secondary undefined.
    - Patient with partial birthDate '2026' (length < 10) -> primary omits parenthetical (per A2); secondary = '2026'.
    - Patient with partial birthDate '2026-05' (length < 10) -> primary omits parenthetical (per A2); secondary = '2026-05'.
    - Patient name-missing + identifier value 'P1234' (<= 6 alphanumeric) -> primary = 'P1234' (passthrough; no parenthetical if no birthDate).
    - Patient name-missing + identifier value 'urn:oid:1.2.3.4.5.6.7.8.9' -> primary is djb2 base36 6-char hash; same input twice -> same output (determinism).
    - Patient name-missing + no identifier + id 'pat-xyz-001' -> primary = 'pat-xyz-001'.
    - Purity: call `summarizeResource(p, new Date('2026-05-01'))` twice on the same patient -> identical output (no Date.now, no Math.random).
  </behavior>
  <action>
    Create TWO files in this order. Write the test file FIRST with all behaviors above (RED), then implement the source to make them pass (GREEN).

    **File 1: `src/utils/__tests__/summarizeResource.test.ts`** (NEW). Use this header verbatim:

    ```typescript
    import { describe, it, expect } from 'vitest';
    import type { Patient } from '@medplum/fhirtypes';
    import { summarizeResource } from '../summarizeResource';
    ```

    Add three describe blocks: `'summarizeResource - Patient'`, `'summarizeResource - Patient name-missing fallback'`, `'summarizeResource - Patient determinism'`. Cover all behaviors listed above with inline TS literal fixtures. The djb2 determinism test MUST call `summarizeResource(p, fixedNow)` twice on the same input and assert `.toEqual` between the two results. The "other -> O" test MUST assert `primary` ends with `(45/O)` for a Patient born '1981-01-15' + now '2026-05-01' + gender 'other'.

    **File 2: `src/utils/summarizeResource.ts`** (NEW). Use this exact skeleton (verbatim per RESEARCH.md Pattern 1; cast inside each case is required by TS strict mode):

    ```typescript
    import type {
      Resource,
      Patient,
      Observation,
      Condition,
      Encounter,
      MedicationStatement,
      Procedure,
      DiagnosticReport,
      AllergyIntolerance,
      HumanName,
      CodeableConcept,
    } from '@medplum/fhirtypes';
    import { getCodeDisplay, toRecord } from './fhir-helpers';

    export interface Summary {
      primary: string;
      secondary?: string;
    }

    export function summarizeResource(r: Resource, now: Date = new Date()): Summary {
      switch (r.resourceType) {
        case 'Patient':              return summarizePatient(r as Patient, now);
        case 'Observation':          return summarizeObservation(r as Observation);
        case 'Condition':            return summarizeCondition(r as Condition);
        case 'Encounter':            return summarizeEncounter(r as Encounter);
        case 'MedicationStatement':  return summarizeMedicationStatement(r as MedicationStatement);
        case 'Procedure':            return summarizeProcedure(r as Procedure);
        case 'DiagnosticReport':     return summarizeDiagnosticReport(r as DiagnosticReport);
        case 'AllergyIntolerance':   return summarizeAllergyIntolerance(r as AllergyIntolerance);
        default:                     return summarizeGeneric(r);
      }
    }
    ```

    Then add stub implementations for the 7 non-Patient typed helpers (`return { primary: '' }` each — Task 2 fills them). Implement `summarizeGeneric` as a one-line stub `function summarizeGeneric(r: Resource): Summary { return { primary: r.id ?? '' }; }` (Task 3 fills it). Implement these helpers FULLY in this task:

    `formatHumanName` (HumanName -> string, mirrors legacy `SearchResultsPage.tsx:39-40` exactly per A3):
    ```typescript
    function formatHumanName(n: HumanName): string {
      if (typeof n.text === 'string' && n.text) return n.text;
      const parts = [n.family, ...(Array.isArray(n.given) ? n.given : [])].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '';
    }
    ```

    `isShortAlphanumeric`:
    ```typescript
    function isShortAlphanumeric(v: string): boolean {
      return v.length <= 6 && /^[A-Za-z0-9]+$/.test(v);
    }
    ```

    `genderToChar` (per A1 — `'other' -> 'O'`, NOT 'U'):
    ```typescript
    function genderToChar(g: 'male' | 'female' | 'other' | 'unknown'): 'M' | 'F' | 'O' | 'U' {
      if (g === 'male') return 'M';
      if (g === 'female') return 'F';
      if (g === 'other') return 'O';
      return 'U';
    }
    ```

    `fullYearsBetween` (per A2 — partial dates return undefined):
    ```typescript
    function fullYearsBetween(birthDateIso: string, now: Date): number | undefined {
      if (birthDateIso.length < 10) return undefined;
      const b = new Date(birthDateIso.slice(0, 10));
      if (Number.isNaN(b.getTime())) return undefined;
      let years = now.getFullYear() - b.getFullYear();
      const m = now.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years -= 1;
      return years >= 0 ? years : undefined;
    }
    ```

    `djb2Base36Six` (per RESEARCH § Hash Function — pure, no module state):
    ```typescript
    /**
     * djb2 hash -> 6-character base36 string. PURE (no I/O, no clock, no RNG).
     * NOT cryptographic — display label only. Never use for auth or integrity.
     * Math: hash is unsigned 32-bit; 36^6 = 2,176,782,336 < Number.MAX_SAFE_INTEGER.
     */
    function djb2Base36Six(input: string): string {
      let hash = 5381;
      for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
      }
      return (hash % 2_176_782_336).toString(36).padStart(6, '0');
    }
    ```

    `summarizePatient` (per RESEARCH § Patient Helper):
    ```typescript
    function summarizePatient(p: Patient, now: Date): Summary {
      const formatted = (p.name?.[0] && formatHumanName(p.name[0])) || '';

      let primary: string;
      if (formatted) {
        primary = formatted;
      } else {
        const idv = p.identifier?.[0]?.value;
        if (idv) {
          primary = isShortAlphanumeric(idv) ? idv : djb2Base36Six(idv);
        } else {
          primary = p.id ?? '';
        }
      }

      const age = p.birthDate ? fullYearsBetween(p.birthDate, now) : undefined;
      const sex = p.gender ? genderToChar(p.gender) : 'U';
      if (age !== undefined) {
        primary = `${primary} (${age}/${sex})`;
      }

      return { primary, secondary: p.birthDate };
    }
    ```

    Note: `secondary: p.birthDate` — store the raw birthDate string (NOT sliced; partial dates pass through verbatim). The test for partial birthDate `'2026'` asserts `secondary: '2026'`.

    Run the tests after writing both files: `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Patient"`. Patient tests must pass; the other typed-helper tests (Tasks 2/3) don't exist yet so this is fine.
  </action>
  <verify>
    <automated>npx tsc -b --noEmit && npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Patient"</automated>
  </verify>
  <acceptance_criteria>
    - File `src/utils/summarizeResource.ts` exists.
    - File `src/utils/__tests__/summarizeResource.test.ts` exists.
    - `grep -n "export function summarizeResource" src/utils/summarizeResource.ts` matches one line.
    - `grep -n "export interface Summary" src/utils/summarizeResource.ts` matches one line.
    - `grep -n "import type" src/utils/summarizeResource.ts` is present (verbatimModuleSyntax compliance).
    - `grep -n "import { getCodeDisplay, toRecord } from './fhir-helpers'" src/utils/summarizeResource.ts` matches (helpers reused).
    - `grep -n "switch (r.resourceType)" src/utils/summarizeResource.ts` matches one line.
    - All 9 cases present: `grep -cE "case '(Patient|Observation|Condition|Encounter|MedicationStatement|Procedure|DiagnosticReport|AllergyIntolerance)':" src/utils/summarizeResource.ts` returns 8.
    - djb2 implementation present: `grep -n "5381" src/utils/summarizeResource.ts` matches one line; `grep -n "2_176_782_336" src/utils/summarizeResource.ts` matches one line.
    - djb2 has security JSDoc: `grep -n "NOT cryptographic" src/utils/summarizeResource.ts` matches one line.
    - genderToChar maps 'other' -> 'O': `grep -n "'other'" src/utils/summarizeResource.ts | grep "'O'"` matches.
    - HumanName format mirrors legacy: `grep -n "filter(Boolean)" src/utils/summarizeResource.ts` matches and `grep -n "join(', ')" src/utils/summarizeResource.ts` matches.
    - `npx tsc -b --noEmit` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Patient"` exits 0 (all Patient tests pass).
    - Test file asserts `family: 'Mueller', given: ['Anna', 'Maria']` -> primary contains `'Mueller, Anna, Maria'` (A3 byte-string pin).
    - Test file has a test asserting gender='other' produces sex char 'O' (A1 pin).
    - Test file has a test with `birthDate: '2026'` asserting parenthetical is absent (A2 pin).
    - Test file has a test with `birthDate: '2026-05'` asserting parenthetical is absent (A2 pin).
    - Test file has a determinism test calling `summarizeResource(p, fixedNow)` twice with `.toEqual` between results.
  </acceptance_criteria>
  <done>
    Source file with skeleton + helpers + Patient implementation exists. Test file exists with full Patient + name-fallback + determinism + sub-decision-pin coverage. `tsc -b --noEmit` exits 0 (stubs return `{ primary: '' }` to satisfy types). All Patient-name-tagged tests pass.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement 7 remaining typed helpers (Observation D-04, Condition D-05, Encounter D-06, MedicationStatement D-07, Procedure D-08, DiagnosticReport D-09, AllergyIntolerance D-10) with tests</name>
  <files>
    src/utils/summarizeResource.ts
    src/utils/__tests__/summarizeResource.test.ts
  </files>
  <read_first>
    - src/utils/summarizeResource.ts (current state from Task 1; replace stubs in place)
    - src/utils/__tests__/summarizeResource.test.ts (current state from Task 1; append new describe blocks)
    - src/utils/fhir-helpers.ts (getCodeDisplay signature for the CC -> display reduction)
    - src/components/explorer/SearchResultsPage.tsx lines 108-167 (verified field paths: Encounter `period.start`, Condition `clinicalStatus.coding[0].code`, MedicationStatement flat `effectiveDateTime`, Procedure `performedDateTime`)
    - .planning/phases/46-theme-a-foundation-summary-util/46-RESEARCH.md sections "FHIR R4 Field Path Verification", "Lab-Observation Classification (D-04)", "Pitfall 4: Encounter.class is Coding not CodeableConcept", "Pitfall 5: MedicationStatement.medicationReference.display is the literal"
    - .planning/phases/46-theme-a-foundation-summary-util/46-CONTEXT.md sections D-04 through D-10
  </read_first>
  <behavior>
    - Observation lab (`category[0].coding[0].code === 'laboratory'`) + valueQuantity `{ value: 5.4, unit: 'mmol/L' }` + code Glucose + effectiveDateTime '2026-04-30T08:15:00Z' -> `{ primary: '5.4 mmol/L · Glucose', secondary: '2026-04-30' }`. Note: separator is the middot character `·` (U+00B7).
    - Observation lab + valueQuantity with no `unit` but `code: 'mg'` -> uses code, primary contains `'mg'`.
    - Observation lab + valueString 'positive' (no Quantity) + code Influenza -> primary renders the string without unit, e.g. `'positive · Influenza'`.
    - Observation lab + valueCodeableConcept.text 'Detected' + code SARS-CoV-2 (no Quantity) -> primary renders `'Detected · SARS-CoV-2'`.
    - Observation non-lab (no category or category not 'laboratory') with valueQuantity -> `primary = code display`, `secondary = '<value> <unit>'`.
    - Observation non-lab with no valueQuantity but effectiveDateTime '2026-04-30' -> `primary = code display`, `secondary = '2026-04-30'`.
    - Condition with code Hypertension + onsetDateTime '2024-01-15' -> `{ primary: 'Hypertension', secondary: '2024-01-15' }`.
    - Encounter with `class: { code: 'AMB', display: 'ambulatory' }` + `period.start: '2025-06-10T14:00:00Z'` -> `{ primary: 'ambulatory', secondary: '2025-06-10' }`.
    - Encounter with `class: { code: 'AMB' }` (no display) + `type: [{ coding: [{ display: 'Routine visit' }] }]` -> `primary = 'Routine visit'`. (class.display absent -> fall through to getCodeDisplay(type[0]).)
    - Encounter with `class` undefined (defensive — Blaze schema violation) + type[0] present -> primary uses getCodeDisplay(type[0]).
    - MedicationStatement with `medicationCodeableConcept: { coding: [{ display: 'Aspirin' }] }` + effectiveDateTime '2025-09-01' -> `{ primary: 'Aspirin', secondary: '2025-09-01' }`.
    - MedicationStatement with `medicationReference: { display: 'Aspirin 100mg' }` (no medicationCodeableConcept) -> primary = 'Aspirin 100mg' (literal, no resolution).
    - MedicationStatement with neither medicationCodeableConcept nor medicationReference + id 'med-001' -> primary = 'med-001'.
    - Procedure with code Appendectomy + performedDateTime '2024-03-12' -> `{ primary: 'Appendectomy', secondary: '2024-03-12' }`.
    - DiagnosticReport with code 'Lab Report' + issued '2026-04-30T10:00:00Z' + effectiveDateTime '2026-04-29' -> `{ primary: 'Lab Report', secondary: '2026-04-30' }` (issued wins).
    - DiagnosticReport with code 'Lab Report' + no issued + effectiveDateTime '2026-04-29' -> secondary = '2026-04-29' (effectiveDateTime fallback).
    - AllergyIntolerance with code Penicillin + category ['medication'] + type 'allergy' -> `{ primary: 'Penicillin', secondary: 'medication' }` (category[0] wins).
    - AllergyIntolerance with code Latex + no category + type 'intolerance' -> `{ primary: 'Latex', secondary: 'intolerance' }` (type fallback).
  </behavior>
  <action>
    Replace the 7 stub helpers in `src/utils/summarizeResource.ts` with full implementations and append corresponding describe blocks to the test file.

    **In `src/utils/summarizeResource.ts`**, replace each stub with the implementation below. Add a module-private `isLabObservation` helper (NOT exported per RESEARCH § isLabObservation Extraction recommendation):

    ```typescript
    function isLabObservation(o: Observation): boolean {
      const cats = o.category ?? [];
      for (const cat of cats) {
        const codings = cat.coding ?? [];
        for (const c of codings) {
          if (c.code === 'laboratory') return true;
        }
      }
      return false;
    }

    function summarizeObservation(o: Observation): Summary {
      const codeDisplay = getCodeDisplay(o.code);
      const effective = o.effectiveDateTime?.slice(0, 10);

      // Build value+unit fragment from valueQuantity / valueString / valueCodeableConcept
      let valueFragment = '';
      if (o.valueQuantity) {
        const value = o.valueQuantity.value;
        const unit = o.valueQuantity.unit ?? o.valueQuantity.code ?? '';
        if (value !== undefined && unit) {
          valueFragment = `${value} ${unit}`;
        } else if (value !== undefined) {
          valueFragment = String(value);
        }
      } else if (o.valueString) {
        valueFragment = o.valueString;
      } else if (o.valueCodeableConcept) {
        valueFragment = getCodeDisplay(o.valueCodeableConcept);
      }

      if (isLabObservation(o)) {
        // Lab: "<value> <unit> · <code display>" (middot U+00B7)
        const primary = valueFragment && codeDisplay
          ? `${valueFragment} · ${codeDisplay}`
          : (valueFragment || codeDisplay || '');
        return { primary, secondary: effective };
      }

      // Non-lab: primary = code display, secondary = value+unit if present else effectiveDateTime
      return {
        primary: codeDisplay,
        secondary: valueFragment || effective,
      };
    }

    function summarizeCondition(c: Condition): Summary {
      return {
        primary: getCodeDisplay(c.code),
        secondary: c.onsetDateTime?.slice(0, 10),
      };
    }

    function summarizeEncounter(e: Encounter): Summary {
      // Defensive `?.` on class — schema says required Coding, but Blaze data may violate.
      const primary = e.class?.display ?? getCodeDisplay(e.type?.[0]);
      return {
        primary,
        secondary: e.period?.start?.slice(0, 10),
      };
    }

    function summarizeMedicationStatement(m: MedicationStatement): Summary {
      let primary = getCodeDisplay(m.medicationCodeableConcept);
      if (!primary && m.medicationReference?.display) {
        primary = m.medicationReference.display;
      }
      if (!primary) {
        primary = m.id ?? '';
      }
      return {
        primary,
        secondary: m.effectiveDateTime?.slice(0, 10),
      };
    }

    function summarizeProcedure(p: Procedure): Summary {
      return {
        primary: getCodeDisplay(p.code),
        secondary: p.performedDateTime?.slice(0, 10),
      };
    }

    function summarizeDiagnosticReport(d: DiagnosticReport): Summary {
      const dateSrc = d.issued ?? d.effectiveDateTime;
      return {
        primary: getCodeDisplay(d.code),
        secondary: dateSrc?.slice(0, 10),
      };
    }

    function summarizeAllergyIntolerance(a: AllergyIntolerance): Summary {
      const secondary = a.category?.[0] ?? a.type;
      return {
        primary: getCodeDisplay(a.code),
        secondary,
      };
    }
    ```

    **In `src/utils/__tests__/summarizeResource.test.ts`**, append seven describe blocks covering each behavior above. Use inline TS literal fixtures with proper `@medplum/fhirtypes` types (`import type { Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance } from '@medplum/fhirtypes';`). The Observation lab test for Glucose MUST assert the literal byte string `'5.4 mmol/L · Glucose'` (using middot U+00B7, NOT ASCII bullet `•`).

    Run focused tests after writing: `npx vitest run src/utils/__tests__/summarizeResource.test.ts`. All typed-entry tests must pass.
  </action>
  <verify>
    <automated>npx tsc -b --noEmit && npx vitest run src/utils/__tests__/summarizeResource.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - All 7 stubs replaced: `! grep -nE "function summarize(Observation|Condition|Encounter|MedicationStatement|Procedure|DiagnosticReport|AllergyIntolerance)\(.*\): Summary \{ return \{ primary: '' \}; \}" src/utils/summarizeResource.ts` (zero stub matches).
    - `grep -n "function isLabObservation" src/utils/summarizeResource.ts` matches one line (module-private).
    - `! grep -n "export function isLabObservation" src/utils/summarizeResource.ts` (NOT exported, per researcher recommendation).
    - Lab Observation test asserts middot byte string: `grep -n "5.4 mmol/L · Glucose" src/utils/__tests__/summarizeResource.test.ts` matches (the · is U+00B7, NOT • U+2022).
    - Encounter helper uses defensive `?.` on class: `grep -n "e.class?.display" src/utils/summarizeResource.ts` matches.
    - MedicationStatement reads `.display` literal (NOT resolves): `grep -n "medicationReference?.display" src/utils/summarizeResource.ts` matches; `! grep -n "client.readResource" src/utils/summarizeResource.ts` (no resolution).
    - DiagnosticReport prefers issued over effectiveDateTime: `grep -nE "d.issued \?\? d.effectiveDateTime" src/utils/summarizeResource.ts` matches.
    - AllergyIntolerance prefers category[0] over type: `grep -nE "a.category\?\.\[0\] \?\? a.type" src/utils/summarizeResource.ts` matches.
    - `npx tsc -b --noEmit` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Observation"` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Condition"` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Encounter"` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "MedicationStatement"` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Procedure"` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "DiagnosticReport"` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "AllergyIntolerance"` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "lab"` exits 0 (lab classification tests).
  </acceptance_criteria>
  <done>
    All 7 typed helpers fully implemented in `summarizeResource.ts` (no stubs remaining for the 8 typed types; only `summarizeGeneric` is still a stub). Test file has describe blocks for all 7 typed entries plus lab/non-lab classification tests. All typed-helper tests pass; tsc -b --noEmit exits 0.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Implement summarizeGeneric walker (D-11 + D-12) with per-precedence-step tests + final full-suite gate</name>
  <files>
    src/utils/summarizeResource.ts
    src/utils/__tests__/summarizeResource.test.ts
  </files>
  <read_first>
    - src/utils/summarizeResource.ts (current state — only summarizeGeneric is still a stub)
    - src/utils/__tests__/summarizeResource.test.ts (current state — append the generic describe block)
    - src/utils/fhir-helpers.ts (toRecord signature — used by walker for non-typed access)
    - .planning/phases/46-theme-a-foundation-summary-util/46-RESEARCH.md section "Code Examples > Generic Walker (D-11)" (verbatim implementation reference)
    - .planning/phases/46-theme-a-foundation-summary-util/46-CONTEXT.md sections D-11 and D-12
  </read_first>
  <behavior>
    Generic walker per D-11 walks fields in this order, returning the first non-empty hit:
    1. `code` (CodeableConcept -> getCodeDisplay)
    2. `type` (CodeableConcept or string)
    3. `category` (CodeableConcept; first if array)
    4. `name` (HumanName[] -> first formatted, OR string literal)
    5. `description` (string)
    6. `identifier[0].value` (string)
    7. `id` (last resort)
    Generic `secondary` is ALWAYS undefined (D-12).

    Test cases (one per precedence step using a Resource type NOT in the registry — e.g. Specimen, Device, Practitioner, Location):
    - Specimen with only `code: { coding: [{ display: 'Blood' }] }` -> `{ primary: 'Blood' }` (step 1).
    - Specimen with only `type: 'Tube'` (string) -> `{ primary: 'Tube' }` (step 2).
    - Specimen with only `type: { text: 'EDTA Tube' }` (CC) -> `{ primary: 'EDTA Tube' }` (step 2 CC variant).
    - Specimen with only `category: [{ coding: [{ display: 'Specimen Cat' }] }]` -> `{ primary: 'Specimen Cat' }` (step 3, array first element).
    - Practitioner with only `name: [{ family: 'Doe', given: ['John'] }]` -> `{ primary: 'Doe, John' }` (step 4 array).
    - Practitioner with only `name: 'Dr. Smith'` (string literal) -> `{ primary: 'Dr. Smith' }` (step 4 string).
    - Device with only `description: 'Pacemaker XYZ'` -> `{ primary: 'Pacemaker XYZ' }` (step 5).
    - Location with only `identifier: [{ value: 'LOC-001' }]` -> `{ primary: 'LOC-001' }` (step 6).
    - Specimen with only `id: 'spec-fallback'` (none of the above) -> `{ primary: 'spec-fallback' }` (step 7).
    - Generic always returns `secondary: undefined` (D-12) — assert with `.toEqual({ primary: '...' })` (no secondary key).
  </behavior>
  <action>
    **In `src/utils/summarizeResource.ts`**, replace the `summarizeGeneric` stub with the full walker (verbatim from RESEARCH § Code Examples > Generic Walker, with `HumanName` import added):

    ```typescript
    function summarizeGeneric(r: Resource): Summary {
      const obj = toRecord(r);

      // 1. code (CodeableConcept)
      const code = obj.code as CodeableConcept | undefined;
      if (code && typeof code === 'object') {
        const display = getCodeDisplay(code);
        if (display) return { primary: display };
      }

      // 2. type (CodeableConcept | string)
      const type = obj.type;
      if (typeof type === 'string') return { primary: type };
      if (type && typeof type === 'object') {
        const cc = (Array.isArray(type) ? type[0] : type) as CodeableConcept | undefined;
        const display = getCodeDisplay(cc);
        if (display) return { primary: display };
      }

      // 3. category (CodeableConcept; first if array)
      const category = obj.category;
      if (category && typeof category === 'object') {
        const cc = (Array.isArray(category) ? category[0] : category) as CodeableConcept | undefined;
        const display = getCodeDisplay(cc);
        if (display) return { primary: display };
      }

      // 4. name (HumanName[] formatted OR string literal)
      if (Array.isArray(obj.name) && obj.name.length > 0) {
        const formatted = formatHumanName(obj.name[0] as HumanName);
        if (formatted) return { primary: formatted };
      }
      if (typeof obj.name === 'string' && obj.name) return { primary: obj.name };

      // 5. description (string)
      if (typeof obj.description === 'string' && obj.description) {
        return { primary: obj.description };
      }

      // 6. identifier[0].value (string)
      if (Array.isArray(obj.identifier) && obj.identifier.length > 0) {
        const idv = (obj.identifier[0] as { value?: string }).value;
        if (idv) return { primary: idv };
      }

      // 7. id (last resort)
      return { primary: r.id ?? '' };
    }
    ```

    **In `src/utils/__tests__/summarizeResource.test.ts`**, append a `describe('summarizeResource - generic fallback', () => { ... })` block with one test per precedence step (cases listed in <behavior>). Use `Specimen`, `Practitioner`, `Device`, `Location` for fixtures (none of these are in the typed registry). For each test, construct a fixture that has ONLY the field being tested (and `resourceType` + `id`) so the test verifies the walk reaches that step. Add a final test asserting `secondary` is undefined for generic — use `expect(result).toEqual({ primary: 'X' })` (no `secondary` key) to enforce D-12.

    After both files are updated, run the FULL test file: `npx vitest run src/utils/__tests__/summarizeResource.test.ts`. All ~30 tests must pass. Then run the FULL suite: `npm test` — must pass with no regression vs the 1240 baseline (expect ~1270). Finally `npm run build` must exit clean.
  </action>
  <verify>
    <automated>npx tsc -b --noEmit && npx vitest run src/utils/__tests__/summarizeResource.test.ts && npm test && npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `summarizeGeneric` stub replaced: `! grep -n "function summarizeGeneric(r: Resource): Summary { return { primary: r.id ?? '' }; }" src/utils/summarizeResource.ts` (no single-line stub).
    - Walker has all 7 precedence steps: `grep -cE "// [0-9]\." src/utils/summarizeResource.ts` returns >= 7.
    - Walker uses toRecord: `grep -n "const obj = toRecord(r)" src/utils/summarizeResource.ts` matches.
    - Walker does NOT spread or Object.assign (prototype-pollution defense): `! grep -nE "\\.\\.\\.(obj|r)\\b" src/utils/summarizeResource.ts` and `! grep -n "Object.assign" src/utils/summarizeResource.ts`.
    - Generic test block exists: `grep -n "describe('summarizeResource - generic" src/utils/__tests__/summarizeResource.test.ts` matches.
    - Generic test asserts D-12 (no secondary key): grep finds at least one `expect(result).toEqual({ primary:` without a `secondary` key in the generic block (manual review acceptable; `grep -A1 "describe('summarizeResource - generic" src/utils/__tests__/summarizeResource.test.ts` shows the block).
    - Total test count in file: `grep -c "  it(" src/utils/__tests__/summarizeResource.test.ts` returns >= 25 (target ~30).
    - `npx tsc -b --noEmit` exits 0.
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts` exits 0 (all ~30 tests pass).
    - `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "generic"` exits 0.
    - `npm test` exits 0 with passing count >= 1265 (1240 baseline + ~25 new tests; allow margin).
    - `npm run build` exits 0.
    - Module size <= 350 LOC: `wc -l src/utils/summarizeResource.ts` returns <= 350 (estimate ~250 per RESEARCH).
  </acceptance_criteria>
  <done>
    `summarizeGeneric` fully implemented; all 8 typed helpers + generic + djb2 + helpers complete. Test file at ~30 tests covers every typed entry, every generic precedence step, Patient name-fallback (3 cases), age boundary, partial birthDate (A2), gender 'other' -> 'O' (A1), HumanName comma-join (A3), djb2 determinism, lab vs non-lab classification, generic-no-secondary (D-12). Full suite passes (>= 1265 tests); `npm run build` clean; `tsc -b --noEmit` exit 0. Plan 02 can now safely consume `summarizeResource(r).primary` at the 3 migration sites.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Blaze server -> client app | FHIR Resource payloads received over HTTP; field shape may violate R4 schema (e.g. missing required Encounter.class, malformed Patient.gender) |
| Client app -> DOM | summarizeResource returns plain strings rendered inside Mantine `<Anchor>` / `<Text>` (React text-node escaping applies) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-46-01 | T (Tampering) | summarizeResource handling missing/undefined fields from Blaze | mitigate | Every typed helper uses `?.` chaining + `??` fallbacks; helpers never throw on undefined input. `formatHumanName` filters falsy with `.filter(Boolean)`. Verified by tests covering undefined birthDate, undefined gender, undefined identifier, undefined class. |
| T-46-02 | I (Information Disclosure) | djb2 hash misused as a security primitive | mitigate | JSDoc on `djb2Base36Six` declares "NOT cryptographic — display label only. Never use for auth or integrity." Acceptance criterion verifies the JSDoc string is present in source. Used only for short-PSN display fallback (D-03) where collisions are explicitly acceptable. |
| T-46-03 | D (DoS) | ReDoS via crafted Patient.identifier value in isShortAlphanumeric regex | mitigate | Regex `/^[A-Za-z0-9]+$/` is linear (no backreferences, no nested quantifiers, no alternation). Safe by construction. |
| T-46-04 | T (Tampering) | Prototype pollution via toRecord(r) walker in summarizeGeneric | mitigate | Walker reads keys with bracket access only (`obj.code`, `obj.type`); never spreads (`...obj`) or `Object.assign`s. Acceptance criterion grep-verifies absence of `...obj` and `Object.assign`. Inherits the Phase 22 CHRT-06 sanctioned `toRecord` pattern reviewed during cohort import. |
| T-46-05 | I (Information Disclosure) | PHI in test fixtures committed to repo | mitigate | All fixtures use synthetic names ('Mueller', 'Anna', 'Doe', 'Smith'), synthetic OIDs ('urn:oid:1.2.3.4.5.6.7.8.9'), and synthetic IDs ('p1', 'pat-xyz-001'). No real patient data. |
| T-46-06 | T (XSS via FHIR field tampering) | Render of summary strings via Mantine `<Anchor>` / `<Text>` (PLAN 02) | accept | summarizeResource returns plain strings, never JSX. React text-node escaping prevents script injection. The Mantine components wrap children as text nodes by default. No `dangerouslySetInnerHTML` anywhere in this phase. (Validated in PLAN 02 acceptance criteria.) |

Severity: low across the board. No high-severity threats. ASVS L1 block-on-high threshold is met (zero high-severity threats present).
</threat_model>

<verification>
- `src/utils/summarizeResource.ts` exists with all 8 typed helpers + generic walker + djb2 + helpers + Summary type + summarizeResource public export.
- `src/utils/__tests__/summarizeResource.test.ts` exists with ~30 tests.
- `npx tsc -b --noEmit` exits 0.
- `npx vitest run src/utils/__tests__/summarizeResource.test.ts` exits 0 (all new tests pass).
- `npm test` exits 0 with >= 1265 tests passing (no regression vs 1240 baseline).
- `npm run build` exits 0.
- Sub-decisions A1, A2, A3 are pinned by tests in the suite.
- djb2 has the "NOT cryptographic" JSDoc comment.
</verification>

<success_criteria>
NAV-01 satisfied:
- Pure-function `summarizeResource(r, now?)` exists in single module.
- Returns `{ primary: string; secondary?: string }`.
- Per-type registry covers all 8 named R4 types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance).
- Generic fallback handles all other resource types.
- NO status field — primary + optional secondary only (verified by Summary interface).
- Pure (no I/O), unit-testable, deterministic (verified by determinism test).
- Unit tests cover all 8 typed + generic with both primary AND secondary asserted where applicable.
- `npm run build` clean; `tsc -b --noEmit` exit 0; full suite passes (no regression vs 1240 baseline).

Sub-decisions captured in tests:
- A1: `gender='other' -> 'O'` (asserts `(45/O)`).
- A2: partial `birthDate` (length < 10) omits parenthetical (asserts for '2026' and '2026-05').
- A3: HumanName comma-join `family, given1, given2` (asserts byte string `'Mueller, Anna, Maria'`).
</success_criteria>

<output>
After completion, create `.planning/phases/46-theme-a-foundation-summary-util/46-01-SUMMARY.md` documenting:
- Final LOC of `summarizeResource.ts`
- Total test count added (target ~30; actual)
- Final full-suite pass count (baseline 1240 -> actual)
- Sub-decision A1/A2/A3 confirmation (tests asserted exact behavior)
- Any deviation from RESEARCH.md (none expected)
- Verification commands run + outputs
</output>
