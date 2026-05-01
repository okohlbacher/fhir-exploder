# Phase 46: Theme A — Foundation: Summary Util - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a single pure-function `summarizeResource(r: Resource) → { primary: string; secondary?: string }` exported from one module. Per-type registry covers 8 R4 types (Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance); all other types fall through a generic field-walker. Migrate the 3 inline implementations (`SearchResultsPage.getResourceSummary`, `FhirResourcesView.getSummary`, `MiiModuleTab.getSummary`) to the new util. Unit tests cover all 8 typed entries plus generic. Zero visual regression at the 3 migrated call sites.

NOT in this phase: reference resolution (Phase 47), reverse-reference panel (Phase 48), graph rendering (Phase 49), Mantine 9 / React 19 upgrade (Phase 50). The util is consumed by 47/48/49 but does not call into them.

</domain>

<decisions>
## Implementation Decisions

### Registry Shape

- **D-01:** Registry = typed `switch (r.resourceType)` over the 8 covered types, `default` branch calls `summarizeGeneric(r)`. Mirrors the established `getResourceDateByType` / `getResourceStatusByType` pattern in `src/components/explorer/SearchResultsPage.tsx:108-145`. Type narrowing is free inside each `case` (cast to `Patient`, `Observation`, etc. from `@medplum/fhirtypes`); exhaustiveness across the 8 covered types is enforced at compile time. No object literal map, no class strategy — runtime registration is not needed (Phases 47-49 consume the function as-is).

### Per-Type Content (the 8)

- **D-02 (Patient):** `primary = "<name> (<age>/<sex>)"` where:
  - `<name>` is `name[0].text` if present, else `"<family>, <given...>"` joined.
  - `<age>` is full years from `birthDate` (integer; missing `birthDate` → omit the parenthetical).
  - `<sex>` is `M` / `F` / `U` derived from `gender` (`male`→M, `female`→F, anything else→U).
  - Age computation accepts an optional `now: Date` parameter (default `new Date()`) so tests can pin a deterministic clock without breaking the pure-function contract for callers.
  - `secondary = birthDate` (ISO `YYYY-MM-DD`).

- **D-03 (Patient name-missing fallback):** When no usable `name[0]` is present, derive primary from `identifier[0].value`:
  - If `value` is ≤6 alphanumeric characters → use as-is.
  - If `value` is >6 chars or contains non-alphanumerics → compute a deterministic 6-character base36 hash of the full value (e.g. `djb2 % 36^6` or equivalent stable function), display that. **Pure function — no state, no I/O, no module-scoped Map.** Same input always yields the same 6-char display. Hash collision risk is acceptable for a display label (drilling into the resource still shows the full value).
  - If no `identifier[0].value` exists either → fall back to `id` (already truncated at the resource level for Blaze-issued IDs).

- **D-04 (Observation):**
  - **Lab observations** (defined as: `category[*].coding[*]` contains `code === 'laboratory'`, irrespective of system — covers both `http://terminology.hl7.org/CodeSystem/observation-category` and any LOINC-encoded equivalent): `primary = "<value> <unit> · <code display>"` (single line, middot separator), `secondary = effectiveDateTime` (ISO `YYYY-MM-DD`). Value + unit drawn from `valueQuantity` (`.value` + `.unit` or `.code` if `.unit` absent); if `valueQuantity` is missing fall through to `valueString` / `valueCodeableConcept.text` rendered without unit.
  - **Non-lab observations:** `primary = code` display, `secondary = value + unit` if Quantity present else `effectiveDateTime`. Same `getCodeDisplay()` helper as the rest of the registry.

- **D-05 (Condition):** `primary = code` display via `getCodeDisplay(condition.code)`. `secondary = onsetDateTime` (ISO sliced).

- **D-06 (Encounter):** `primary = class.display` if present, else `getCodeDisplay(type[0])`. `secondary = period.start` (ISO sliced).

- **D-07 (MedicationStatement):** `primary = medicationCodeableConcept` display via `getCodeDisplay()` (or `medicationReference.display` when reference form is used; reference *resolution* is Phase 47 territory — for now, render the `.display` literal that's on the reference itself if present, else fall through to id). `secondary = effectiveDateTime` (ISO sliced).

- **D-08 (Procedure):** `primary = code` display. `secondary = performedDateTime` (ISO sliced).

- **D-09 (DiagnosticReport):** `primary = code` display. `secondary = issued ?? effectiveDateTime` (ISO sliced; `issued` preferred since it's the "report finalization" timestamp).

- **D-10 (AllergyIntolerance):** `primary = code` display. `secondary = category[0]` if present, else `type` literal (`allergy` / `intolerance`).

### Generic Fallback (~140 non-registered types)

- **D-11:** Generic primary walks fields in this order, returning the first non-empty hit:
  1. `code` (CodeableConcept → `getCodeDisplay`)
  2. `type` (CodeableConcept or string)
  3. `category` (CodeableConcept; first element if array)
  4. `name` (HumanName array → first formatted, OR string literal)
  5. `description` (string)
  6. `identifier[0].value` (string)
  7. `id` (last resort)
- **D-12:** Generic `secondary` is undefined. Date extraction for fallback secondary is deferred — only the 8 typed registry entries return a secondary in v1.

### Call-Site Migration

- **D-13:** All 3 migrated sites render `summarizeResource(r).primary` only. `.secondary` is returned by the util but not surfaced now — it becomes available for Phase 47 (HumanReadableView reference resolution may use it for tooltips / hover content), Phase 48 (incoming-references panel card subtitle), Phase 49 (graph node hover tooltip per GRPH-03). Zero visual change at the 3 sites is the SC#4 closure target. Patient (D-02) gets the `(age/sex)` enrichment in primary itself, which IS a visible improvement on the prior inline output (the 3 legacy impls walked `code/type/category/identifier` for Patient, which always returned `id` because Patient has none of those fields).

### Module Structure

- **D-14:** Single module `src/utils/summarizeResource.ts` exports the public `summarizeResource(r, now?)` function and a `Summary` type (`{ primary: string; secondary?: string }`). Per-type helpers (`summarizePatient`, `summarizeObservation`, etc.) are module-private (not exported) — they're implementation detail of the switch. Generic walker `summarizeGeneric` is also module-private. This keeps the import surface flat: callers only ever import `{ summarizeResource }` and `{ Summary }`.

### Testing

- **D-15:** Tests live at `src/utils/__tests__/summarizeResource.test.ts` per the existing convention (`colorVision.test.ts`, `lazyRetry.test.ts`, `searchByIdentifierPrefix.test.ts`). Coverage:
  - 1+ test per typed registry entry (8) asserting both `primary` and `secondary` shape on a representative fixture.
  - Generic fallback: 1 test per field-precedence step (verifies the walk order in D-11 by constructing fixtures that have ONLY that field).
  - Patient name-missing fallback: separate cases for ≤6 alphanumeric pass-through, >6 char hashing (assert deterministic — same input twice → same output), missing identifier (id fallback).
  - Patient age computation: pass a fixed `now` to verify deterministic age math; cover birthday-not-yet-this-year boundary.
  - Lab observation classification: a Quantity-bearing Observation WITH `category[*].coding[*].code === 'laboratory'` and one WITHOUT, verify they take different paths.

### Claude's Discretion

- Exact byte-precise primary string for HumanName when both `text` and `family/given` are present (legacy uses `text` first; mirror that).
- Exact short-PSN hash function (djb2 / fnv1a / similar — pick a stable 32-bit hash, mod into base36; no crypto).
- Whether the typed `case` blocks live in the same file (D-14) or a `summarizers/` subfolder — researcher can decide based on file length once the 8 are written.
- Per-type test fixture sourcing: hand-rolled JSON literals vs reusing fixtures from elsewhere in the repo.
- Whether the Observation lab-detection helper (`isLabObservation(o): boolean`) is inlined or extracted — call sites in Phase 47/48 may want it.

### Folded Todos

(None — no pending todos matched Phase 46 from `gsd-tools todo match-phase 46`.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §"Theme A — Foundation: Summary Util" — NAV-01, NAV-02 full text (the source of "pure", "deterministic", "8 typed + generic", "no status field").
- `.planning/ROADMAP.md` Phase 46 §Success Criteria — the 5 closure conditions (registry exists, 3 call sites migrated, tests cover 8+generic, visual match-or-improve, build/tsc/test gates).
- `.planning/PROJECT.md` §"Current Milestone: v1.7 Resource Navigation" — milestone-level locked decisions (sequential A→B→C→D→E ordering, two-slot summary, no status pill, ~2-4 KB gz initial-bundle budget for Theme A).

### Existing Code (Building Blocks)
- `src/utils/fhir-helpers.ts` — `toRecord(resource)` for dynamic property access; `getCodeDisplay(cc)` for the `text → coding[0].display → coding[0].code` walk that every typed entry needs. Reuse, do not re-implement.
- `src/components/explorer/SearchResultsPage.tsx:108-145` — `getResourceDateByType` and `getResourceStatusByType` are the typed `switch` pattern this phase mirrors (D-01). FHIR R4 field paths (Encounter `period.start` not `.date`; Condition `clinicalStatus` is CodeableConcept; MedicationStatement uses flat `effectiveDateTime`) are already verified there — reuse those casts.

### Legacy Inline Implementations (Migration Targets)
- `src/components/explorer/SearchResultsPage.tsx:32-70` — `getResourceSummary(resource)`. Already includes HumanName + identifier handling; will be deleted entirely after migration.
- `src/components/patients/FhirResourcesView.tsx:51-68` — `getSummary(r)`. CodeableConcept-only walk; will be deleted entirely.
- `src/components/patients/MiiModuleTab.tsx:20-38` — `getSummary(r)`. CodeableConcept-only walk plus `description` fallback; will be deleted entirely.

### Render Sites
- `src/components/explorer/SearchResultsPage.tsx:490` — the truncated `<Anchor maxWidth: 400>` table cell that calls `getResourceSummary(r)` today. Becomes `summarizeResource(r).primary`.
- `src/components/patients/FhirResourcesView.tsx` — the expanded-resource list rendering inside the per-type cards (search around `getSummary(` for the JSX).
- `src/components/patients/MiiModuleTab.tsx` — the per-module resource list rows.

### Conventions
- `src/utils/__tests__/` — vitest test file naming and structure (`colorVision.test.ts` is a representative example).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `toRecord(resource)` in `src/utils/fhir-helpers.ts` — already used by the 3 legacy impls; keep using for the generic fallback walker (D-11) where typed FHIR access isn't possible across ~140 types.
- `getCodeDisplay(cc)` in `src/utils/fhir-helpers.ts` — already does the `text → coding[0].display → coding[0].code` reduction. Every typed registry entry whose primary is a CC display calls this.
- `@medplum/fhirtypes` exports — `Patient`, `Observation`, `Condition`, `Encounter`, `MedicationStatement`, `Procedure`, `DiagnosticReport`, `AllergyIntolerance` give us full type narrowing inside each `case`.

### Established Patterns
- **Typed switch over `resourceType`** (`getResourceDateByType` / `getResourceStatusByType` in SearchResultsPage) — D-01 mirrors this exactly. Cast inside each case, default branch for the long tail.
- **ISO date sliced to `YYYY-MM-DD`** — both legacy `getDate` impls and `getResourceDateByType` consistently `.slice(0, 10)`. D-02/D-04 through D-09 inherit this for `secondary`.
- **HumanName format** — SearchResultsPage uses `n.text ?? "family, given"` (comma-joined). D-02 inherits.

### Integration Points
- 3 call sites listed under "Render Sites" in canonical_refs above — exactly 3 `import` statements added, exactly 3 inline `function` blocks deleted.
- No router changes, no new routes, no Mantine theme changes.
- Bundle delta: Theme A util adds ~2–4 KB gz to initial chunk (per PROJECT.md milestone scope) — within budget.

</code_context>

<specifics>
## Specific Ideas

- The Patient `(age/sex)` shorthand (e.g. `"Müller, Anna (68/F)"`) is a user-driven enrichment beyond what NAV-01 strictly requires — it's the one place where the migrated SearchResultsPage cell will visibly differ from the v1.6 baseline. SC#4 closure: this counts as the "improves on prior output" half of "matches or improves" because the legacy impl returned just `id` for Patient (no `code/type/category` fields exist on Patient).
- "Short-PSN" terminology comes directly from the user — this is the German clinical convention for de-identified short patient identifiers (Pseudonym / PSN). The 6-char alphanumeric cap is a familiar form for clinical staff reading lists. Pure hash (D-03) was chosen explicitly to preserve NAV-01's "Pure (no I/O)" constraint without amending the requirement.
- The lab-Observation `value · code` middot rendering (D-04) is the ONE site in the registry where `primary` carries two semantic units — chosen because in lab list contexts users scan for the value first, but the test name ("Glucose", "Hemoglobin") is necessary disambiguation when multiple lab obs appear in the same list.

</specifics>

<deferred>
## Deferred Ideas

- **Reference `.display` literal vs resolved-summary in MedicationStatement** (D-07) — for now we render whatever `medicationReference.display` carries on the reference itself. Resolving the actual Medication resource and computing its summary is Phase 47's reference-resolution territory.
- **Generic fallback `secondary`** — D-12 leaves `secondary` undefined for the long tail. If Phase 48's incoming-references panel discovers it wants a date subtitle for non-registered types, that's its phase to add a `getResourceDate` fallback.
- **Locale-aware date formatting / German month names** — kept ISO `YYYY-MM-DD` for v1 (matches existing codebase). German localization is a larger cross-cutting concern, not this phase.
- **Status pill / badge** — explicitly excluded by NAV-01 ("NO status field — primary + optional secondary only"). Belongs in a future phase if it ever surfaces; PROJECT.md milestone-scope decision.
- **Reference-counting / popularity-weighted summary fields** — out of scope.

(No reviewed-but-not-folded todos — no todos matched Phase 46 in the cross-reference step.)

</deferred>

---

*Phase: 46-theme-a-foundation-summary-util*
*Context gathered: 2026-05-01*
