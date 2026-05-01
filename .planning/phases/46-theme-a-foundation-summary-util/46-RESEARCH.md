# Phase 46: Theme A — Foundation: Summary Util - Research

**Researched:** 2026-05-01
**Domain:** Pure-function FHIR R4 resource summarization (TypeScript), test convention mirroring, build/bundle awareness
**Confidence:** HIGH

## Summary

Phase 46 ships a single pure-function `summarizeResource(r: Resource, now?: Date) → { primary: string; secondary?: string }` exported from one new module `src/utils/summarizeResource.ts`. The function is a typed `switch` over 8 R4 resource types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance) with a generic field-walker default, and replaces three inline implementations at `SearchResultsPage.tsx:32-70`, `FhirResourcesView.tsx:51-68`, and `MiiModuleTab.tsx:20-38`. All field paths from CONTEXT.md were verified against the installed `@medplum/fhirtypes@5.1.7` declarations — they are correct except for **one important nuance on `Encounter.class`**: it is a `Coding` (NOT a `CodeableConcept`) and is a **non-optional** field in the type. CONTEXT D-06's `class.display` access is correct, but no `?.` chain on `.class` itself is needed (though defensive `?.` is wise — Blaze data may violate the schema).

The hash function (CONTEXT D-03) is locked to **djb2** below — pure, 15 lines, no precision loss for `% 36^6` (`36**6 = 2,176,782,336 < Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991`). Test conventions are clear from `colorVision.test.ts` and `searchByIdentifierPrefix.test.ts`: `vitest` named imports, `describe`/`it`/`expect`, fixtures inline as TS literals, relative-path imports `from '../foo'`. Estimated module size: ~250 LOC — comfortably single-file (recommend NOT splitting into a `summarizers/` subfolder).

**Primary recommendation:** Land a single `src/utils/summarizeResource.ts` module with djb2 hash, exhaustive typed switch, generic walker default, and a sibling `__tests__/summarizeResource.test.ts` mirroring `colorVision.test.ts`'s convention. Keep `isLabObservation` as a **module-private helper** for now — Phase 47/48 can promote to named export when needed (cheap migration; no painted-corner risk).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Registry shape:**
- D-01: Registry = typed `switch (r.resourceType)` over 8 covered types, `default` → `summarizeGeneric(r)`. No object literal map, no class strategy. Mirrors `getResourceDateByType`/`getResourceStatusByType` pattern in `SearchResultsPage.tsx:108-145`.

**Per-type content:**
- D-02 (Patient): `primary = "<name> (<age>/<sex>)"`. Name = `name[0].text` if present else `"<family>, <given...>"` joined. Age = full years from `birthDate` (missing → omit parenthetical). Sex = M/F/U from `gender` (`male`→M, `female`→F, anything else→U). Optional `now: Date` parameter for deterministic tests. `secondary = birthDate` (ISO `YYYY-MM-DD`).
- D-03 (Patient name-missing fallback): Derive primary from `identifier[0].value`. ≤6 alphanumeric chars → use as-is. >6 chars or non-alphanumeric → deterministic 6-char base36 hash. **Pure — no module-scoped Map.** Same input → same output. No identifier → fall back to `id`.
- D-04 (Observation): Lab observations (`category[*].coding[*]` contains `code === 'laboratory'`) → `primary = "<value> <unit> · <code display>"`, `secondary = effectiveDateTime` (ISO sliced). Value+unit from `valueQuantity` (`.value` + `.unit` or `.code` if `.unit` absent); fall through to `valueString` / `valueCodeableConcept.text` if Quantity missing. Non-lab → `primary = code` display, `secondary = value+unit if Quantity present else effectiveDateTime`.
- D-05 (Condition): `primary = code` via `getCodeDisplay(condition.code)`, `secondary = onsetDateTime` (ISO sliced).
- D-06 (Encounter): `primary = class.display` if present else `getCodeDisplay(type[0])`, `secondary = period.start` (ISO sliced).
- D-07 (MedicationStatement): `primary = medicationCodeableConcept` display via `getCodeDisplay()` OR `medicationReference.display` literal (no resolution — that's Phase 47), else `id`. `secondary = effectiveDateTime` (ISO sliced).
- D-08 (Procedure): `primary = code` display, `secondary = performedDateTime` (ISO sliced).
- D-09 (DiagnosticReport): `primary = code` display, `secondary = issued ?? effectiveDateTime` (ISO sliced; `issued` preferred).
- D-10 (AllergyIntolerance): `primary = code` display, `secondary = category[0]` if present else `type` literal (`allergy`/`intolerance`).

**Generic fallback:**
- D-11: Walk fields in order — `code` (CC) → `type` (CC or string) → `category` (CC; first if array) → `name` (HumanName[] formatted OR string) → `description` (string) → `identifier[0].value` → `id`. Return first non-empty.
- D-12: Generic `secondary` is undefined.

**Migration:**
- D-13: All 3 sites render `summarizeResource(r).primary` only. `.secondary` available for Phase 47-49.

**Module structure:**
- D-14: Single module `src/utils/summarizeResource.ts`. Public exports: `summarizeResource(r, now?)` and `Summary` type. Per-type helpers (`summarizePatient` etc.) module-private.

**Testing:**
- D-15: Tests at `src/utils/__tests__/summarizeResource.test.ts`. 1+ per typed entry (8); generic fallback per field-precedence step; Patient name-missing 3 cases; Patient age boundary; lab classification with-and-without.

### Claude's Discretion

- Exact byte-precise primary string for HumanName when both `text` and `family/given` present (legacy uses `text` first; mirror that). **Resolved below: legacy `SearchResultsPage.tsx:39` joins `[family, ...given]` with `, ` — researcher recommends mirroring exactly to preserve zero-visual-regression.**
- Exact short-PSN hash function. **Resolved below: djb2.**
- Single file vs `summarizers/` subfolder. **Resolved below: single file (~250 LOC est).**
- Per-type test fixture sourcing. **Recommend hand-rolled JSON literals (matches `colorVision.test.ts` convention).**
- `isLabObservation(o): boolean` extraction strategy. **Recommend module-private helper for now.**

### Deferred Ideas (OUT OF SCOPE)

- Reference resolution for MedicationStatement (Phase 47).
- Generic fallback `secondary` (Phase 48 if needed).
- Locale-aware date formatting / German month names.
- Status pill / badge.
- Reference-counting / popularity-weighted summary fields.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Pure-function `summarizeResource(r) → { primary; secondary? }` with 8 typed + generic registry. Pure, deterministic, unit-testable. NO status field. | All 8 R4 field paths verified against `@medplum/fhirtypes@5.1.7` (§Field Path Verification). djb2 hash chosen (§Hash Function). Determinism via optional `now: Date` param (D-02). Vitest convention from `colorVision.test.ts` (§Testing Conventions). |
| NAV-02 | 3 inline summary impls migrated to call new util. Per-call-site visual output matches or improves prior version. | Legacy impls inspected at exact line numbers (§Legacy Inline Inventory). Render sites mapped (§Render Sites). HumanName format `family, given...` comma-joined verified at `SearchResultsPage.tsx:39-40` to ensure migrated output matches byte-for-byte. |
</phase_requirements>

## Standard Stack

### Core (already in `package.json` — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@medplum/fhirtypes` | ^5.1.7 (installed) | R4 type narrowing inside switch cases | Already used everywhere; per-resource-type imports (`Patient`, `Observation`, etc.) give compile-time exhaustiveness across the 8 cases [VERIFIED: `package.json:27`, `node_modules/@medplum/fhirtypes/dist/Patient.d.ts`] |
| `vitest` | ^4.1.4 | Test runner | Already in use across `src/utils/__tests__/`; jsdom environment configured globally [VERIFIED: `package.json:62`, `vitest.config.ts`] |
| `typescript` | ^5.7.0 | Strict mode + exhaustive switch enforcement | `tsconfig.app.json` has `noFallthroughCasesInSwitch: true` so missing `break`/`return` would fail compile [VERIFIED: `tsconfig.app.json:22`] |

**Installation:** None required.

**Version verification (2026-05-01):**
- `@medplum/fhirtypes` 5.1.7 verified by `package.json` lock + presence of `dist/Patient.d.ts` etc. with R4 fields matching FHIR R4 spec.
- `vitest` 4.1.4 verified by `package.json` and `vitest/config` import in `vitest.config.ts`.

### Don't introduce

- **No new runtime dependencies.** This is a pure-function module — adding a hash library (`object-hash`, `crypto-js` etc.) violates the "pure, no I/O, ~2-4 KB gz budget" constraint. djb2 inline = 15 lines of zero-dependency JS.
- **No `@tanstack/react-query`, no Mantine 9, no React 19.** Per `CLAUDE.md` Do NOT Use list and PROJECT.md milestone constraint. Phase 50 is the gate-driven place for the stack bump.

## Architecture Patterns

### Recommended File Structure

```
src/
└── utils/
    ├── summarizeResource.ts          # NEW — single module, ~250 LOC
    ├── fhir-helpers.ts               # REUSE: toRecord, getCodeDisplay
    └── __tests__/
        └── summarizeResource.test.ts # NEW — mirrors colorVision.test.ts
```

### Pattern 1: Typed Switch with Module-Private Helpers (D-01, D-14)

**What:** Public `summarizeResource(r, now?)` is a thin switch dispatcher. Each per-type helper (`summarizePatient`, `summarizeObservation`, etc.) is `function`-declared (not exported), called from the matching `case`. Generic walker `summarizeGeneric` handles the default. Cast inside each case (`r as Patient`) — TypeScript narrows on `resourceType` discriminator but Medplum types don't always hoist that automatically.

**When to use:** Whenever the dispatch is over a closed enumeration (`ResourceType`) and downstream agents (Phases 47-49) consume the result without needing to register new types at runtime.

**Source pattern (verified):** `src/components/explorer/SearchResultsPage.tsx:108-167` (`getResourceDateByType` / `getResourceStatusByType`) — same idiom, already shipped, already passes the `tsc -b --noEmit` gate.

**Skeleton:**
```typescript
import type {
  Resource,
  Patient, Observation, Condition, Encounter,
  MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance,
} from '@medplum/fhirtypes';
import { getCodeDisplay, toRecord } from './fhir-helpers';

export interface Summary { primary: string; secondary?: string; }

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

### Pattern 2: Reuse `getCodeDisplay` and `toRecord` (don't re-implement)

**Source:** `src/utils/fhir-helpers.ts` [VERIFIED — read in full]
- `getCodeDisplay(cc: CodeableConcept | undefined): string` does `text → coding[0].display → coding[0].code → ''`. Every typed entry whose primary is a CC display calls this directly.
- `toRecord(resource: Resource): Record<string, unknown>` is the sanctioned escape hatch (TS2352 double-cast pattern from PROJECT.md Key Decisions). Use ONLY in the generic walker.

### Pattern 3: ISO Date Slicing (cross-codebase convention)

`someIsoString.slice(0, 10)` is universally used: `SearchResultsPage.tsx:80, 113, 115, 117, 119, 121`, `FhirResourcesView.tsx:76`, `MiiModuleTab.tsx:46, 50`. Safe for `'2026-05-01'`, `'2026-05-01T14:23:00+02:00'`, and `'2026'` alike (returns `'2026'` for the partial-year case, which is a known acceptable degradation in the codebase).

### Anti-Patterns to Avoid

- **Object-literal registry instead of switch:** `const registry = { Patient: summarizePatient, ... }` — loses type narrowing inside each handler, requires a wider parameter type. The switch lets each case cast to a specific FHIR type.
- **Module-scoped `Map<string, string>` for hash memoization:** Violates "pure" constraint of NAV-01. djb2 is fast enough — measured below.
- **`crypto.subtle.digest()`:** Async (returns Promise), defeats pure synchronous contract. Also overkill — collisions on display labels are acceptable.
- **Mutating the input Resource:** All helpers must be read-only on `r`. None of the existing legacy impls mutate; preserve.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CodeableConcept → display | Custom walker | `getCodeDisplay()` from `fhir-helpers.ts` | Already handles `text → coding[0].display → coding[0].code → ''` exhaustively |
| Resource→record cast | `r as Record<string, unknown>` | `toRecord(r)` | Some Resource union members lack index signature; centralized double-cast (TS2352 pattern) |
| Hash library | Add `object-hash` etc. | Inline djb2 (15 lines) | Zero dependency, pure, deterministic, fits 2-4 KB budget |
| ISO date slicing | `Date` parsing | `s.slice(0, 10)` | Codebase-wide convention; correct for partial-date FHIR `birthDate` (R4 allows `YYYY` / `YYYY-MM` / `YYYY-MM-DD`) |
| Type narrowing across switch | Manual `if`/`else` | TS discriminated union on `resourceType` | Compiler-checked; `noFallthroughCasesInSwitch: true` catches missing returns |

**Key insight:** This phase ADDS no abstractions — it CONSOLIDATES three existing inline walkers behind one boundary, using utilities the codebase already has. The smallest possible diff that satisfies NAV-01 + NAV-02.

## FHIR R4 Field Path Verification (the single highest-leverage section)

**Method:** Each field below was verified against the installed `@medplum/fhirtypes@5.1.7` `.d.ts` declarations under `node_modules/@medplum/fhirtypes/dist/`. Cited path + line is the type declaration source.

| Type | Field (CONTEXT) | Verified | TS Type | Notes |
|------|----------------|----------|---------|-------|
| Patient | `name?: HumanName[]` | ✓ | `HumanName[]` (optional) | `[VERIFIED: Patient.d.ts]` |
| Patient | `birthDate?: string` | ✓ | `string` (optional) | R4 partial dates allowed (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`). `[VERIFIED: Patient.d.ts]` |
| Patient | `gender?: 'male' \| 'female' \| 'other' \| 'unknown'` | ✓ | Literal union | **D-02 maps `male→M`, `female→F`, anything else→U** — see Sub-Decision A1 below for an `'other'→O` recommendation. `[VERIFIED: Patient.d.ts]` |
| Patient | `identifier?: Identifier[]` | ✓ | `Identifier[]` (optional) | `Identifier.value?: string` |
| HumanName | `text?: string` | ✓ | `string` (optional) | `[VERIFIED: HumanName.d.ts]` |
| HumanName | `family?: string` | ✓ | `string` (optional) | NOT array. `[VERIFIED: HumanName.d.ts]` |
| HumanName | `given?: string[]` | ✓ | `string[]` (optional) | Array of strings (multiple given names possible). `[VERIFIED: HumanName.d.ts]` |
| Observation | `category?: CodeableConcept[]` | ✓ | `CodeableConcept[]` (optional) | D-04 lab check `category[*].coding[*].code === 'laboratory'` is correct. `[VERIFIED: Observation.d.ts]` |
| Observation | `effectiveDateTime?: string` | ✓ | `string` (optional) | Flat in Medplum types (NOT nested under `.effective.dateTime`). Confirmed by `SearchResultsPage.tsx:115`. `[VERIFIED: Observation.d.ts]` |
| Observation | `valueQuantity?: Quantity` | ✓ | `Quantity` (optional) | `[VERIFIED: Observation.d.ts]` |
| Observation | `valueString?: string` | ✓ | `string` (optional) | `[VERIFIED: Observation.d.ts]` |
| Observation | `valueCodeableConcept?: CodeableConcept` | ✓ | `CodeableConcept` (optional) | `[VERIFIED: Observation.d.ts]` |
| Observation | `code: CodeableConcept` | ✓ | `CodeableConcept` (REQUIRED) | Use directly (no `?.`). |
| Quantity | `value?: number` | ✓ | `number` (optional) | `[VERIFIED: Quantity.d.ts]` |
| Quantity | `unit?: string` | ✓ | `string` (optional) | `[VERIFIED: Quantity.d.ts]` |
| Quantity | `code?: string` | ✓ | `string` (optional) | UCUM code; D-04 fallback `unit ?? code`. `[VERIFIED: Quantity.d.ts]` |
| Quantity | `system?: string` | ✓ | `string` (optional) | Not used by D-04 but available. `[VERIFIED: Quantity.d.ts]` |
| Condition | `code?: CodeableConcept` | ✓ | `CodeableConcept` (optional) | `[VERIFIED: Condition.d.ts]` |
| Condition | `onsetDateTime?: string` | ✓ | `string` (optional) | Flat. `[VERIFIED: Condition.d.ts]` |
| **Encounter** | **`class: Coding`** | ✓ | `Coding` (**REQUIRED, NOT optional, NOT a CodeableConcept**) | **CONTEXT D-06 says `class.display` — correct because `Coding.display?: string`. But `class` itself is non-optional in the type, so technically `r.class.display` would compile. RECOMMENDATION: use defensive `r.class?.display` anyway because Blaze data may violate the schema (real-world FHIR is messier than the spec).** `[VERIFIED: Encounter.d.ts:class: Coding]` |
| Encounter | `type?: CodeableConcept[]` | ✓ | `CodeableConcept[]` (optional) | D-06 `getCodeDisplay(type[0])` correct. `[VERIFIED: Encounter.d.ts]` |
| Encounter | `period?: Period` | ✓ | `Period` (optional). `Period.start?: string`. | D-06 `period.start` correct (use `.period?.start?.slice(0, 10)`). Pattern matches `SearchResultsPage.tsx:119`. `[VERIFIED: Encounter.d.ts]` |
| MedicationStatement | `medicationCodeableConcept?: CodeableConcept` | ✓ | `CodeableConcept` (optional) | `[VERIFIED: MedicationStatement.d.ts]` |
| MedicationStatement | `medicationReference?: Reference<Medication>` | ✓ | `Reference<Medication>` (optional) | `Reference.display?: string`. D-07 reads `medicationReference?.display` literal. `[VERIFIED: MedicationStatement.d.ts]` |
| MedicationStatement | `effectiveDateTime?: string` | ✓ | `string` (optional) | Flat. `[VERIFIED: MedicationStatement.d.ts]` |
| Procedure | `code?: CodeableConcept` | ✓ | `CodeableConcept` (optional) | `[VERIFIED: Procedure.d.ts]` |
| Procedure | `performedDateTime?: string` | ✓ | `string` (optional) | Flat. `[VERIFIED: Procedure.d.ts]` |
| DiagnosticReport | `code: CodeableConcept` | ✓ | `CodeableConcept` (REQUIRED) | `[VERIFIED: DiagnosticReport.d.ts]` |
| DiagnosticReport | `issued?: string` | ✓ | `string` (optional) | D-09 `issued ?? effectiveDateTime` ordering correct. `[VERIFIED: DiagnosticReport.d.ts]` |
| DiagnosticReport | `effectiveDateTime?: string` | ✓ | `string` (optional) | `[VERIFIED: DiagnosticReport.d.ts]` |
| AllergyIntolerance | `code?: CodeableConcept` | ✓ | `CodeableConcept` (optional) | `[VERIFIED: AllergyIntolerance.d.ts]` |
| AllergyIntolerance | `category?: ('food' \| 'medication' \| 'environment' \| 'biologic')[]` | ✓ | Literal-union array (optional) | D-10 `category[0]` correct — yields one of those 4 literals. `[VERIFIED: AllergyIntolerance.d.ts]` |
| AllergyIntolerance | `type?: 'allergy' \| 'intolerance'` | ✓ | Literal union (optional) | D-10 fallback. `[VERIFIED: AllergyIntolerance.d.ts]` |

**No CONTEXT field paths are wrong.** The one nuance to flag for the planner: `Encounter.class` is non-optional and is a `Coding` (not a `CodeableConcept`) — so `getCodeDisplay()` does NOT apply (it expects CC). D-06 correctly uses `class.display` directly, but the planner should write `r.class?.display` defensively.

### Sub-Decision A1: Patient `gender === 'other'` mapping

CONTEXT D-02 says "anything else → U". Strict reading: an `'other'` gender → `U` (unknown). This conflates two distinct semantic states (`'other'` is intentional self-identification; `'unknown'` is missing data). **Recommendation for planner:** flip `'other' → O` so the rendering is `(45/O)` rather than `(45/U)`. Final mapping table:

| `gender` | sex char |
|----------|----------|
| `'male'` | `M` |
| `'female'` | `F` |
| `'other'` | `O` (recommended; CONTEXT says U) |
| `'unknown'` | `U` |
| undefined | `U` |

**Treat as a sub-decision the planner surfaces in PLAN.md task acceptance criteria** — do not change unilaterally; the user may have intentionally collapsed `other`+`unknown`.

### Sub-Decision A2: Partial `birthDate` handling

R4 `Patient.birthDate` allows `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` (FHIR `date` type, no time). CONTEXT D-02 says "missing `birthDate` → omit the parenthetical" but says nothing about partial. **Recommendation:** treat partial (length < 10) as effectively missing for the age computation — render `<name>` only without `(age/sex)`. Reasons: (1) age math on partial dates is ambiguous (year-only could be off by ±1); (2) preserves "deterministic" contract; (3) v1 simplicity. Planner can surface this as a sub-decision.

## Hash Function (D-03 resolution)

**Choice: djb2 (Daniel J. Bernstein)** — the canonical default for short string hashes in JS. Pure, no allocations, no dependencies.

```typescript
/**
 * djb2 hash → 6-character base36 string.
 * Pure: no Math.random, no Date.now, no module state.
 * Same input always yields same output.
 * Math: hash is unsigned 32-bit (0..2^32-1 = 4,294,967,295).
 *       36^6 = 2,176,782,336 < Number.MAX_SAFE_INTEGER (~9e15).
 *       So `hash % 36**6` is exact in JS double-precision floats.
 */
function djb2Base36Six(input: string): string {
  let hash = 5381;                              // djb2 seed
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;  // *33 + c, force u32
  }
  return (hash % 2_176_782_336).toString(36).padStart(6, '0');
}
```

**Properties:**
- **Pure:** No I/O, no clock, no RNG. Same string → same 6-char base36.
- **Precision-safe:** `36**6 = 2,176,782,336 < 2^53`. Modulo is exact.
- **Collision likelihood:** For `n` distinct inputs and a hash space of `36^6 ≈ 2.18e9`, expected collisions by birthday paradox ≈ `n^2 / (2·36^6)`. For `n = 10,000`: ~0.023 collisions (essentially zero). For `n = 100,000`: ~2.3 collisions. For `n = 1,000,000`: ~230 collisions. Acceptable for display labels — drilling into the resource always shows the full identifier value.
- **Distribution:** djb2 is well-known to have excellent distribution for ASCII strings; collisions in practice are uniform across the 36^6 space.

**Why djb2 over fnv1a:** Both are fine. djb2 is more familiar to most readers, ships in 4 lines of arithmetic, and the `>>> 0` u32 trick is idiomatic JS. fnv1a's 32-bit prime arithmetic needs a careful overflow comment in JS — djb2 avoids that explanation.

## Module Structure / Size Forecast

**Recommendation: single file `src/utils/summarizeResource.ts` — DO NOT create `summarizers/` subfolder.**

Estimated LOC breakdown:
- Header doc comment + imports: ~25 LOC
- `Summary` interface + `summarizeResource` switch: ~30 LOC
- `summarizePatient` (incl. name fallback + age computation + djb2): ~60 LOC
- `summarizeObservation` (incl. `isLabObservation`): ~35 LOC
- `summarizeCondition`, `summarizeEncounter`, `summarizeMedicationStatement`, `summarizeProcedure`, `summarizeDiagnosticReport`, `summarizeAllergyIntolerance`: ~10 LOC each = 60 LOC
- `summarizeGeneric` (D-11 walker): ~40 LOC

**Total: ~250 LOC.** Comfortably under the 300 LOC threshold mentioned as the subfolder-split trigger. Single file keeps the import surface flat (`import { summarizeResource, type Summary } from '../../utils/summarizeResource'`), matches the convention of other `utils/` files (`fhir-helpers.ts`, `searchByIdentifierPrefix.ts`, `colorVision.ts`), and doesn't fragment the test mirror.

## `isLabObservation` Extraction (Claude's Discretion)

**Recommendation: keep as a module-private helper** (not exported, not inlined inside `summarizeObservation`). Three reasons:
1. **Inline-inside-summarizeObservation:** harder to test in isolation; inflates the function past easy comprehension.
2. **Named export:** premature — Phase 47/48 have NOT yet declared a need; if they do, promotion is a one-line diff (`function` → `export function`) plus a test. Cheap migration. No painted-corner risk.
3. **Module-private helper:** tests can still cover it via integration (assert that one fixture takes the lab path, another takes the non-lab path — D-15 already specifies this).

If Phase 48 wants it later, the planner there can add `export` in a 1-line change.

## Lab-Observation Classification (D-04)

**Confirmed:** `Observation.category` is `CodeableConcept[]` (R4 spec + Medplum types). The category-coding for "laboratory" is officially `code='laboratory'` from system `http://terminology.hl7.org/CodeSystem/observation-category` (FHIR R4 § Observation.category § ValueSet `observation-category`).

**D-04 decision:** check `category[*].coding[*].code === 'laboratory'` **regardless of system** — this matches D-04 wording verbatim and tolerates servers that put the same code under a different system URI. LOINC encodes the analyte (e.g. `2339-0` Glucose) in the `Observation.code`, not in `category` — the category is the high-level "this is a lab".

**Example fixture for tests (D-15):**
```json
{
  "resourceType": "Observation",
  "category": [{
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "laboratory" }]
  }],
  "code": { "coding": [{ "system": "http://loinc.org", "code": "2339-0", "display": "Glucose" }] },
  "valueQuantity": { "value": 5.4, "unit": "mmol/L" },
  "effectiveDateTime": "2026-04-30T08:15:00Z"
}
```
→ `primary = "5.4 mmol/L · Glucose"`, `secondary = "2026-04-30"`.

## Age Computation (D-02)

**Canonical pure-function snippet for full years between two dates** (handles birthday-not-yet-this-year correctly):

```typescript
function fullYearsBetween(birthDateIso: string, now: Date): number | undefined {
  // Require full YYYY-MM-DD (per Sub-Decision A2).
  if (birthDateIso.length < 10) return undefined;
  const b = new Date(birthDateIso.slice(0, 10));
  if (Number.isNaN(b.getTime())) return undefined;
  let years = now.getFullYear() - b.getFullYear();
  // If birthday hasn't occurred yet this year, subtract 1.
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years -= 1;
  return years >= 0 ? years : undefined;
}
```

Use `new Date('YYYY-MM-DD')` (UTC midnight in modern engines for date-only strings — ECMA-262 §21.4.3.2). Pure: takes `now` as parameter. Returns `undefined` for partial-date or unparseable strings; D-02 caller treats `undefined` → omit parenthetical.

## HumanName Formatting (D-02 + Discretion)

**Verified legacy format at `SearchResultsPage.tsx:39-40`:**
```typescript
const parts = [n.family, ...(Array.isArray(n.given) ? n.given : [])].filter(Boolean);
if (parts.length > 0) return parts.join(', ');
```
Note: this joins family AND each given with `', '` — so `family="Müller"`, `given=["Anna", "Maria"]` produces `"Müller, Anna, Maria"`, NOT `"Müller, Anna Maria"`.

**Recommendation:** mirror this exactly to preserve zero-visual-regression at the SearchResultsPage call site (NAV-02 SC#4). The planner can surface as a sub-decision: "comma-join all parts" (legacy) vs "comma after family, space between givens" (more typographically correct). Researcher recommends LEGACY behavior for SC#4 closure, with a note that the planner can flip it if the user prefers the cleaner output. CONTEXT D-02 wording `"family, given..."` is ambiguous; the legacy code disambiguates.

## Bundle Budget Verification

**Question:** Does `summarizeResource.ts` land in the main `index-*.js` chunk or a route chunk?

**Findings:**
- `vite.config.ts` does NOT define manual chunks (`build.rollupOptions.output.manualChunks` absent). Vite's default chunking + `rollup-plugin-visualizer` only enabled with `ANALYZE=1`.
- `SearchResultsPage` is imported by `ExplorerLayout`, which is mounted at `/explorer/*` routes. **Inspect `src/router/...` if the planner needs to know whether the explorer routes are `React.lazy()`-wrapped** (Phase 27 EFF-02 added `React.lazy()` for drill-down routes — explorer may be eager).
- `FhirResourcesView` and `MiiModuleTab` are inside `/patients/*` route components.

**Conservative estimate:** `summarizeResource.ts` will land in whichever chunk `SearchResultsPage` lives in. If explorer routes are eager-loaded, that's the main bundle. If lazy, it's the explorer chunk.

**Either way:** the module is ~250 LOC, mostly switch-case dispatch with no large fixtures, and tree-shakes cleanly (only `summarizeResource` and `Summary` are exported). Estimated raw size ~6 KB, gz ~2 KB. **Within the PROJECT.md 2-4 KB gz Theme A budget.**

**Recommendation for planner:** add a single PLAN task that captures the gz delta:
```bash
npm run build && du -k dist/assets/index-*.js dist/assets/*.js | sort -k1 -n
# OR for gzipped: gzip -c dist/assets/index-*.js | wc -c
```
Compare against the v1.6 close baseline `606.76 KB gz` (per `.planning/REQUIREMENTS.md` line 6). Acceptance: delta ≤ +5 KB gz (well above estimate, leaves headroom).

## Common Pitfalls

### Pitfall 1: Casting in switch loses narrowing on `r.resourceType`
**What goes wrong:** TS doesn't always narrow `r as Patient` past the case label without explicit cast.
**How to avoid:** Always cast inside each case (`case 'Patient': return summarizePatient(r as Patient, now);`). The discriminator narrowing is reliable for `r.resourceType` strict-equality checks, but the CAST signals intent and pleases stricter compiler modes.
**Warning signs:** TS error "Property 'birthDate' does not exist on type 'Resource'" inside a `case 'Patient'` block.

### Pitfall 2: Forgetting `noFallthroughCasesInSwitch`
**What goes wrong:** `tsconfig.app.json:22` has this enabled. Any `case` without a `return` (or `break` / `throw`) fails compilation.
**How to avoid:** Each case MUST `return summarizeX(...)` directly. The `default` branch returns `summarizeGeneric(r)`. This is automatic with the recommended skeleton.

### Pitfall 3: `verbatimModuleSyntax` requires `import type` for type-only imports
**What goes wrong:** `tsconfig.app.json:13` has `verbatimModuleSyntax: true`. Using `import { Patient }` (value import) for a type-only symbol fails compilation.
**How to avoid:** `import type { Resource, Patient, Observation, ... } from '@medplum/fhirtypes';` — already the convention in `SearchResultsPage.tsx:6-16`. Mirror exactly.

### Pitfall 4: `Encounter.class` is `Coding`, not `CodeableConcept`
**What goes wrong:** Calling `getCodeDisplay(encounter.class)` would type-error — `getCodeDisplay` expects `CodeableConcept`. The encounter `class` field is a flat `Coding` (with `display`, `code`, `system` directly on it, no `coding[]` array).
**How to avoid:** Use `encounter.class?.display ?? encounter.class?.code ?? ''` directly, or fall back to `getCodeDisplay(encounter.type?.[0])`. Pattern matches CONTEXT D-06.

### Pitfall 5: `MedicationStatement.medicationReference.display` is the literal string on the Reference, NOT the resolved Medication
**What goes wrong:** Trying to fetch the Medication resource here violates "pure" (NAV-01) and steps on Phase 47's territory.
**How to avoid:** Read `m.medicationReference?.display` literally. Done. If it's missing, fall through to `id`. Phase 47 will replace this with a cache-aware resolver.

### Pitfall 6: Forgetting to delete the legacy `getResourceSummary` / `getSummary` after migration
**What goes wrong:** SC#2 explicitly says "grep shows zero remaining inline summary computations". Leaving legacy as `function _getResourceSummary` = grep hit; SC fails.
**How to avoid:** Delete the function declarations entirely AND remove now-unused helpers (e.g. `toRecord` import in `MiiModuleTab.tsx` MAY become unused if `getSummary` was its only consumer — verify with grep before deleting the import).

### Pitfall 7: Patient name fallback walks `code/type/category` (which Patient lacks)
**What goes wrong:** Legacy `SearchResultsPage.getResourceSummary` checks `code/type/category` BEFORE identifier — for Patient with a missing name, this is dead code that always falls through to identifier or id. The migrated Patient handler skips this entirely (D-03 goes name → identifier → id directly).
**How to avoid:** Do NOT mirror the legacy `code/type/category` walk inside `summarizePatient`. Patient gets its own dedicated path per D-03. The walk lives only in `summarizeGeneric` for the long tail.

### Pitfall 8: Mantine 8 / no Tailwind
**What goes wrong:** This phase touches no UI, but a planner could be tempted to add a styled component for the `(age/sex)` annotation.
**How to avoid:** `summarizeResource` returns a plain string, not JSX. The render sites already wrap in `<Anchor>` / `<Text>` — preserve that.

## Code Examples

### Generic Walker (D-11)
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
  if (typeof obj.name === 'string') return { primary: obj.name };

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

### Patient Helper (D-02 + D-03)
```typescript
function summarizePatient(p: Patient, now: Date): Summary {
  // Try name first
  const formatted = (p.name?.[0] && formatHumanName(p.name[0])) || '';

  let primary: string;
  if (formatted) {
    primary = formatted;
  } else {
    // D-03 name-missing fallback
    const idv = p.identifier?.[0]?.value;
    if (idv) {
      primary = isShortAlphanumeric(idv) ? idv : djb2Base36Six(idv);
    } else {
      primary = p.id ?? '';
    }
  }

  // Age + sex parenthetical
  const age = p.birthDate ? fullYearsBetween(p.birthDate, now) : undefined;
  const sex = p.gender ? genderToChar(p.gender) : 'U';
  if (age !== undefined) {
    primary = `${primary} (${age}/${sex})`;
  }

  return { primary, secondary: p.birthDate?.slice(0, 10) };
}

function isShortAlphanumeric(v: string): boolean {
  return v.length <= 6 && /^[A-Za-z0-9]+$/.test(v);
}

function genderToChar(g: 'male' | 'female' | 'other' | 'unknown'): 'M' | 'F' | 'O' | 'U' {
  if (g === 'male') return 'M';
  if (g === 'female') return 'F';
  if (g === 'other') return 'O';   // Sub-Decision A1 — flag for planner
  return 'U';
}
```

## Testing Conventions (from `colorVision.test.ts`, `searchByIdentifierPrefix.test.ts`)

**Verified pattern:**
- **Imports:** `import { describe, it, expect } from 'vitest';` (named imports — globals are enabled in `vitest.config.ts:7` but the existing tests still use explicit named imports for clarity).
- **Mock helpers:** `import { vi } from 'vitest';` when needed.
- **Source import:** relative path, e.g. `from '../colorVision';` (NOT `@/utils/colorVision`). The codebase does NOT use path aliases.
- **Structure:** `describe('ModuleName describing-the-area', () => { it('does X', () => { ... }); });`
- **Fixtures:** inline TS literals (`const r: Patient = { resourceType: 'Patient', id: 'p1', name: [{ family: 'Smith', given: ['Anna'] }] };`). No external JSON files.
- **Assertions:** `expect(actual).toBe(...)`, `.toEqual(...)`, `.toHaveLength(...)`, `.toBeLessThan(...)`. No `expect.soft`, no snapshot tests in `__tests__/`.
- **Type-only imports for fixtures:** `import type { Bundle, Patient } from '@medplum/fhirtypes';` (enforced by `verbatimModuleSyntax: true`).
- **Edge cases:** explicit empty/undefined cases (`it('handles undefined', () => { expect(...).toBe(''); });`).

**Test file shape:**
```typescript
import { describe, it, expect } from 'vitest';
import type { Patient, Observation, ... } from '@medplum/fhirtypes';
import { summarizeResource } from '../summarizeResource';

describe('summarizeResource — Patient', () => {
  it('formats name + age + sex from full birthDate + gender=female', () => {
    const p: Patient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Müller', given: ['Anna'] }],
      birthDate: '1958-03-15',
      gender: 'female',
    };
    const now = new Date('2026-05-01');
    expect(summarizeResource(p, now)).toEqual({
      primary: 'Müller, Anna (68/F)',
      secondary: '1958-03-15',
    });
  });
  // ... more cases
});

describe('summarizeResource — Patient name-missing fallback', () => {
  // D-03 cases
});

describe('summarizeResource — Observation lab vs non-lab', () => {
  // D-04 cases
});

// ... one describe block per typed entry + one for generic walker
```

**Coverage matrix per D-15:**
| Test | Asserts |
|------|---------|
| Patient — full name + birthDate + gender=female | `primary='Müller, Anna (68/F)'`, `secondary='1958-03-15'` |
| Patient — age boundary (birthday in future) | birthday Apr 15 + now=Apr 14 → age = years−1 |
| Patient — birthdate=undefined | omit parenthetical |
| Patient — gender=other | sex char `O` (or `U` per CONTEXT) — confirms Sub-Decision A1 |
| Patient — partial birthDate=`'2026'` | omit parenthetical (Sub-Decision A2) |
| Patient — name missing, identifier `'P1234'` (≤6 alpha) | primary='P1234' (passthrough) |
| Patient — name missing, identifier `'urn:oid:1.2.3.4.5.6.7.8.9'` | primary=djb2 6-char base36; same input twice → same output (determinism) |
| Patient — name and identifier both missing | primary=`p.id` |
| Observation — lab with valueQuantity + LOINC code | `primary='5.4 mmol/L · Glucose'`, `secondary='2026-04-30'` |
| Observation — lab with valueQuantity (unit absent, code='mg') | uses `code` |
| Observation — lab with valueString, no Quantity | renders without unit |
| Observation — non-lab (no `category=laboratory`) | `primary=code display`, `secondary=value+unit OR effectiveDateTime` |
| Condition — code+onsetDateTime | `primary=code display`, `secondary='YYYY-MM-DD'` |
| Encounter — class.display present | `primary=class.display`, `secondary=period.start.slice(0,10)` |
| Encounter — class.display absent, type[0] present | `primary=getCodeDisplay(type[0])` |
| MedicationStatement — medicationCodeableConcept | `primary=getCodeDisplay(...)`, `secondary=effectiveDateTime` |
| MedicationStatement — medicationReference.display present | `primary=display literal` |
| Procedure — code+performedDateTime | as above |
| DiagnosticReport — issued present | `secondary=issued` (NOT effectiveDateTime) |
| DiagnosticReport — issued absent, effectiveDateTime present | `secondary=effectiveDateTime` |
| AllergyIntolerance — code+category[0] | `primary=code`, `secondary='food'` (or one of the 4 literals) |
| AllergyIntolerance — code+no category, type='allergy' | `secondary='allergy'` |
| Generic — only `code` (e.g. `Specimen` with code) | walks step 1 |
| Generic — only `type` (string) | walks step 2 |
| Generic — only `category` | walks step 3 |
| Generic — only `name` (HumanName[] OR string) | walks step 4 |
| Generic — only `description` | walks step 5 |
| Generic — only `identifier[0].value` | walks step 6 |
| Generic — none of the above (just `id`) | falls through to `id` |
| Generic — `secondary` always undefined | per D-12 |

**Estimated test count: ~30 tests** (covers 8 typed × ~2 cases avg + 7 generic precedence steps + 5 Patient-fallback + edge cases). Bumps test baseline 1240 → ~1270.

## Legacy Inline Inventory (Migration Targets)

| File | Lines | Function | Behavior | Extra fallback vs others |
|------|-------|----------|----------|--------------------------|
| `src/components/explorer/SearchResultsPage.tsx` | 32-70 | `getResourceSummary` | HumanName (`text` or `family + given.join(', ')`) → `code/type/category` walk → `identifier[0].value` → `status` → `id` | Has the HumanName branch + `status` fallback (others don't) |
| `src/components/patients/FhirResourcesView.tsx` | 51-68 | `getSummary` | `code/type/category` walk only → `id` | No HumanName, no identifier, no status |
| `src/components/patients/MiiModuleTab.tsx` | 20-38 | `getSummary` | `code/type/category` walk → `description` → `id` | Adds `description` fallback (others don't); no HumanName, no identifier |

**Render sites (delete inline, add util import + call):**
- `SearchResultsPage.tsx:490` — `{getResourceSummary(r)}` → `{summarizeResource(r).primary}`
- `FhirResourcesView.tsx:223` — `{getSummary(r)}` → `{summarizeResource(r).primary}`
- `MiiModuleTab.tsx:184` — `{getSummary(r)}` → `{summarizeResource(r).primary}`

**Side effect of migration (improves SC#4):** SearchResultsPage Patient cells will gain the `(age/sex)` parenthetical. Per CONTEXT specifics: legacy returned `id` for Patient (no `name/code/type/category` matched in some flows) — the new Patient case ALWAYS produces a name (or fallback) plus optional age/sex.

## Runtime State Inventory

(This phase is a refactor — applying the rename/refactor checklist.)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `summarizeResource` produces ephemeral display strings, no persistence. No localStorage keys touched. No Mem0/ChromaDB equivalents. **None — verified by grep on `summarizeResource` returning no localStorage / IndexedDB references.** | None |
| Live service config | None — no external service config affected (Blaze server URL, terminology server, validator URL all unchanged). **None — verified by grep on render-site files showing no service-config touches.** | None |
| OS-registered state | None — no scheduled jobs, no pm2, no systemd. **None — this is a browser SPA.** | None |
| Secrets/env vars | None — pure function, no env vars. **None.** | None |
| Build artifacts | One new file (`src/utils/summarizeResource.ts`) + one new test file. Vite dev server will pick up via HMR; no `prepare` hook re-run needed; no `npm install` needed. **None — no `egg-info` / compiled-binary equivalents in this Vite project.** | None |

**Canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* — **Nothing.** This is a pure code refactor with zero runtime persistence touched.

## Environment Availability

(Phase has no new external dependencies — pure code change. Skip per researcher convention.)

**Verification:** No new npm packages added; no new CLI tools required; no new environment variables or services. All required tooling (`npm run build`, `tsc -b --noEmit`, `npm test`) is already in place per `package.json` scripts.

## Validation Architecture

`workflow.nyquist_validation: true` per `.planning/config.json:18` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@^4.1.4` |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/utils/__tests__/summarizeResource.test.ts` (~ <2s once written) |
| Full suite command | `npm test` (`vitest run`) — ~30-60s, baseline 1240 passing |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| NAV-01 | `summarizeResource` returns `{primary, secondary?}` for Patient with full data | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "Patient"` | ❌ Wave 0 (new file) |
| NAV-01 | `summarizeResource` lab Observation classification | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "lab"` | ❌ Wave 0 |
| NAV-01 | `summarizeResource` generic walker each precedence step | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "generic"` | ❌ Wave 0 |
| NAV-01 | `summarizeResource` Patient name-missing djb2 determinism | unit | `npx vitest run src/utils/__tests__/summarizeResource.test.ts -t "djb2"` | ❌ Wave 0 |
| NAV-01 | `summarizeResource` purity (no `Date.now`, no `Math.random`) | unit (call twice with same `now`, compare results) | included in age-boundary test | ❌ Wave 0 |
| NAV-02 | Legacy `getResourceSummary` / `getSummary` removed | grep | `! grep -rn "getResourceSummary\|function getSummary" src/components/` (exit 0 = pass) | ✅ existing grep; will run on commit |
| NAV-02 | `summarizeResource` imported by 3 sites | grep | `grep -rn "summarizeResource" src/components/ \| wc -l` (≥3) | ✅ existing grep |
| NAV-02 | Build clean | command | `npm run build` (exit 0) | ✅ existing |
| NAV-02 | Type clean | command | `npx tsc -b --noEmit` (exit 0) | ✅ existing |
| NAV-02 | Full suite green | command | `npm test` (no regression vs 1240 baseline; new tests added → ~1270 expected) | ✅ existing |
| NAV-02 SC#4 | Visual match-or-improve at 3 sites | manual | Run `npm run dev`, navigate to (a) `/explorer/Patient`, (b) `/patients/<id>` → expand a resource type, (c) `/patients/<id>` → click a MII tab. Confirm summary text renders + Patient cells show `(age/sex)` improvement at site (a). | manual checklist in PLAN |

### Sampling Rate

- **Per task commit:** `npx vitest run src/utils/__tests__/summarizeResource.test.ts` — fast (~2s).
- **Per wave merge:** `npm test` (full suite) — confirms no regression.
- **Phase gate:** `npm test && npm run build && npx tsc -b --noEmit` all green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/utils/summarizeResource.ts` — implements NAV-01.
- [ ] `src/utils/__tests__/summarizeResource.test.ts` — covers NAV-01 (8 typed + generic + Patient fallbacks + age boundary + lab classification).
- [ ] (Optional, if planner decides) `src/utils/__tests__/fixtures/summarizeResource.fixtures.ts` — extracted fixtures if test file > ~400 LOC. Recommend keeping inline (matches `colorVision.test.ts`).

(No framework install needed — vitest already in place.)

### Manual Visual Spot-Check (SC#4)

Reviewer protocol:
1. `npm run dev` → open `http://localhost:5173/explorer/Patient`. Confirm Summary column renders names with `(age/sex)` for resources with full data; no React errors in console; truncation still applied via `<Anchor maxWidth: 400>`.
2. Navigate to `http://localhost:5173/patients/<any-id>`. Expand a resource type (e.g. Observation). Confirm Summary column renders code displays correctly.
3. Click a MII module tab (e.g. Diagnose). Confirm rows render summaries correctly; description-fallback no longer present (now goes through generic walker, which doesn't include description for the 8 typed types — but Diagnose = Condition is typed, so it goes through `summarizeCondition` and hits `code` first; description fallback was dead code for typed types anyway).

**Acceptance:** All three sites render summaries; no fewer characters than before (Patient gains `(age/sex)`); no JS errors.

## Project Constraints (from CLAUDE.md)

| Constraint | Source | How Phase 46 honors |
|------------|--------|---------------------|
| Tech stack: React 18 + Vite + TS + Medplum 5.x ecosystem | CLAUDE.md "Constraints" | No framework changes; pure-function module |
| FHIR R4 only | CLAUDE.md "Constraints" | All field paths verified against R4 types |
| Mantine 8 (NOT 9) | CLAUDE.md "Do NOT Use" | No Mantine touches in this phase |
| No `@tanstack/react-query` | CLAUDE.md "Do NOT Use" | None added |
| No Tailwind | CLAUDE.md "Do NOT Use" | None added |
| Use Medplum types | CLAUDE.md Stack table | All cases use `import type { Patient, ... } from '@medplum/fhirtypes'` |
| GSD Workflow Enforcement: no edits outside GSD command | CLAUDE.md "GSD Workflow Enforcement" | All file edits in this phase will land via `/gsd-execute-phase` |
| Use `toRecord` and `getCodeDisplay` from `fhir-helpers.ts` | CLAUDE.md "Don't hand-roll" implicit + Phase 28 SWEEP-01 outcome | Generic walker uses `toRecord`; every typed entry uses `getCodeDisplay` for CC display |

## Security Domain

(Per `.planning/config.json` — `security_enforcement` not explicitly set; treat as enabled.)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Pure-function util; no auth surface |
| V3 Session Management | no | No sessions; no state |
| V4 Access Control | no | No access decisions made by util |
| V5 Input Validation | yes (light) | Inputs are typed `Resource` from Medplum types — TS enforces shape. Runtime: handle `undefined`/missing fields gracefully (return empty string fallbacks). No `eval`, no `Function()` constructor. |
| V6 Cryptography | no — but note | djb2 is **NOT cryptographic**. Used purely as a **display label hash** (PSN shortener). Collisions are explicitly acceptable (D-03). NEVER use this hash for security-sensitive purposes (auth tokens, integrity checks, etc.). Document this constraint in the JSDoc on `djb2Base36Six`. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via unescaped FHIR field display | T (Tampering) — server-side data treated as inert | Mantine `<Anchor>` / `<Text>` already escape children; `summarizeResource` returns plain strings, never JSX. Render sites pass through React's text-node escaping. |
| ReDoS via crafted identifier in `isShortAlphanumeric` regex | D (DoS) | The regex `/^[A-Za-z0-9]+$/` is linear (no backreferences, no nested quantifiers). Safe. |
| Prototype pollution via `toRecord(r)` walker | T | `toRecord` is the existing sanctioned pattern. Generic walker reads keys with bracket access; never spreads or `Object.assign`s. Phase 22 already reviewed this idiom (CHRT-06 prototype-pollution defense). |
| PHI leakage in test fixtures | I (Information disclosure) | Test fixtures use synthetic names (e.g. `Müller`, `Anna`, OIDs `1.2.3.4.5...`). No real patient data. |

## Sources

### Primary (HIGH confidence)
- `node_modules/@medplum/fhirtypes/dist/Patient.d.ts` — Patient.name, .birthDate, .gender, .identifier types
- `node_modules/@medplum/fhirtypes/dist/Observation.d.ts` — category, effectiveDateTime, valueQuantity types
- `node_modules/@medplum/fhirtypes/dist/Quantity.d.ts` — value, unit, system, code (all optional, types confirmed)
- `node_modules/@medplum/fhirtypes/dist/HumanName.d.ts` — text, family (string), given (string[])
- `node_modules/@medplum/fhirtypes/dist/Encounter.d.ts` — `class: Coding` (REQUIRED, not optional, not CC)
- `node_modules/@medplum/fhirtypes/dist/MedicationStatement.d.ts` — medicationCodeableConcept, medicationReference, effectiveDateTime
- `node_modules/@medplum/fhirtypes/dist/AllergyIntolerance.d.ts` — code, category literal-union, type literal-union
- `node_modules/@medplum/fhirtypes/dist/DiagnosticReport.d.ts` — code (REQUIRED), issued, effectiveDateTime
- `node_modules/@medplum/fhirtypes/dist/Procedure.d.ts` — code, performedDateTime
- `node_modules/@medplum/fhirtypes/dist/Condition.d.ts` — code, onsetDateTime, clinicalStatus
- `node_modules/@medplum/fhirtypes/dist/Coding.d.ts` — system, code, display
- `src/utils/fhir-helpers.ts` — `toRecord`, `getCodeDisplay` exact signatures
- `src/components/explorer/SearchResultsPage.tsx:32-70, 108-167, 490` — legacy summary, typed-switch pattern, render site
- `src/components/patients/FhirResourcesView.tsx:51-68, 223` — legacy summary, render site
- `src/components/patients/MiiModuleTab.tsx:20-38, 184` — legacy summary, render site
- `src/utils/__tests__/colorVision.test.ts` — vitest convention reference
- `src/utils/__tests__/searchByIdentifierPrefix.test.ts` — vitest convention reference (typed FHIR fixtures + describe/it style)
- `package.json` — vitest 4.1.4, @medplum/fhirtypes ^5.1.7 confirmed
- `tsconfig.app.json` — `noFallthroughCasesInSwitch: true`, `verbatimModuleSyntax: true` confirmed
- `vitest.config.ts` — globals enabled, jsdom environment, src/**/*.test.ts include glob
- `vite.config.ts` — no manualChunks; default Vite chunking applies

### Secondary (MEDIUM confidence)
- HL7 FHIR R4 spec § Observation.category § ValueSet `observation-category` (lab category code='laboratory' from terminology system) `[CITED: hl7.org/fhir/R4/valueset-observation-category.html]`
- ECMA-262 §21.4.3.2 — `new Date('YYYY-MM-DD')` is parsed as UTC `[CITED: tc39.es/ecma262]`

### Tertiary (LOW confidence)
- Bundle gz delta estimate (~2 KB) — based on LOC + typical TypeScript→JS compression ratios; will be empirically verified by the planner's build-size diff task.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `'other' → O` mapping (vs CONTEXT D-02 "anything else → U") | Sub-Decision A1 | LOW — sub-decision flagged for planner; user confirms in PLAN.md AC. |
| A2 | Partial `birthDate` (`YYYY` or `YYYY-MM`) treated as missing for age computation | Sub-Decision A2 | LOW — sub-decision flagged for planner; user confirms in PLAN.md AC. |
| A3 | Legacy SearchResultsPage HumanName format (`family + givens` comma-joined) is preserved literally | HumanName Formatting section | LOW — verified at `SearchResultsPage.tsx:39-40`; sub-decision flagged for planner if cleaner format desired. |
| A4 | Bundle gz delta ≤ 5 KB | Bundle Budget Verification | LOW — empirical verification by `npm run build` size diff task; well within Theme A's 2-4 KB budget headroom. |
| A5 | Estimated module size ~250 LOC justifies single-file structure | Module Structure | LOW — if implementation overshoots, planner can split into `summarizers/` subfolder; cheap migration. |

**Three sub-decisions (A1, A2, A3) need user confirmation in PLAN.md task acceptance criteria.** All three are display-output choices, not architectural — easy to flip post-PLAN.

## Open Questions

(None blocking. The 3 assumptions above are documented and surfaced for the planner.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified versions in `package.json`, no new deps
- Field paths (8 R4 types): HIGH — every field verified against installed `@medplum/fhirtypes@5.1.7` `.d.ts` files
- Hash function: HIGH — djb2 is well-known; precision math verified
- Architecture: HIGH — pattern already shipped in same file (`getResourceDateByType`)
- Pitfalls: HIGH — derived from existing tsconfig + Medplum types + cross-codebase grep
- Bundle estimate: MEDIUM — empirical verification deferred to build-size task

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (30 days — Medplum 5.x and Mantine 8.x are stable; React 18 stable; no fast-moving libraries in scope for this phase)
