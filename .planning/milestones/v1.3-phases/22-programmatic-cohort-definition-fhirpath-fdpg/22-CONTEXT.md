# Phase 22: Programmatic Cohort Definition (FHIRPath + FDPG) — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the Phase 21 cohort system with three programmatic capabilities:

1. **FHIRPath cohort criterion (CHRT-05)** — users author cohort criteria via FHIRPath expressions of the form `Resource.where(field op literal)`, validated server-side before save.
2. **MII FDPG JSON import/export (CHRT-06)** — saved cohorts (interactive criterion types only) round-trip through the FDPG Codex Structured Query format for interop with the FDPG Central Search and other MII tooling.
3. **Cohort management view (CHRT-07)** — users edit, duplicate, and delete saved cohorts directly from the existing `/quality/cohorts` page; changes propagate via Phase 21's existing resolver-cache invalidation.

**Explicitly NOT in this phase:**
- Federated query execution (still deferred per REQUIREMENTS.md Out-of-Scope)
- Phenotype builder / value-set authoring tools
- Cross-user cohort sharing or versioning history
- FHIRPath subset beyond `Resource.where(field op literal)` — extending to and/or composition or chained-search modifiers is a future phase
- Server-side FHIRPath/CQL evaluation (Blaze `$evaluate-measure`) — translator path only
- Client-side FHIRPath evaluation engine (e.g. `fhirpath` npm) — explicitly rejected; if a translator can't handle the expression, the user gets a save-blocking error
- FDPG export of FHIRPath cohorts — FHIRPath ↔ FDPG SQ does not map 1:1; exporting a cohort that contains a FHIRPath criterion is rejected with a clear message

**Requirements covered:** CHRT-05, CHRT-06, CHRT-07.

</domain>

<decisions>
## Implementation Decisions

### D-01 — FHIRPath evaluation surface: translator → FHIR search

A FHIRPath expression is **parsed in the browser**, **translated to a native FHIR search query**, and **issued against Blaze**. The translator subset is locked to `Resource.where(field op literal)` (see D-02). Untranslatable expressions are rejected at validate time with a precise error pointing to the unsupported clause.

**Why:** The Phase 21 cohort resolver already executes FHIR searches and post-processes them into a Patient ID set. The translator path reuses that infrastructure exactly — including the 10K-per-criterion cap and the GET/POST `_search` cutover at 40 IDs. Client-side FHIRPath evaluation would require streaming bundles to the browser and would not respect the existing caps or POST cutover; server-side `$evaluate-measure` couples us to a Blaze-specific extension that is not portable to other R4 servers we may target later.

**Trade-off accepted:** Only the translatable subset works. Untranslatable expressions are a feature of the validator, not a runtime fallback.

### D-02 — Translator subset: single Resource.where(field op literal)

The initial translator supports exactly one shape:

```fhirpath
<ResourceType>.where(<top-level-field> <op> <literal>)
```

**Supported:**
- ResourceType ∈ any FHIR R4 resource (the same set Phase 21's cohortResolver accepts)
- top-level-field: any field directly serializable to a FHIR search parameter (e.g. `birthDate`, `gender`, `code.coding.code`, `subject.reference`)
- op ∈ `=`, `!=`, `<`, `<=`, `>`, `>=`
- literal ∈ FHIRPath date literal (`@YYYY-MM-DD`), string literal, integer/decimal literal, boolean

**Examples that work:**
- `Patient.where(birthDate < @1960-01-01)` → `Patient?birthdate=lt1960-01-01&_elements=id&_count=10000`
- `Condition.where(code.coding.code = '44054006')` → `Condition?code=44054006&_elements=subject&_count=10000`
- `Patient.where(gender = 'female')` → `Patient?gender=female&_elements=id&_count=10000`

**Examples that DO NOT work (rejected at validate time):**
- `and`/`or` composition — use multiple criteria for AND, defer OR to a future phase
- Nested `where()` calls
- Function calls beyond `where()` (e.g. `exists()`, `first()`, `count()`)
- Chained navigation across reference (`Encounter.where(subject.resolve().birthDate < @1960-01-01)`)
- FHIR search modifiers expressed in FHIRPath (e.g. `:contains`, `:exact`)

The translator is a Phase 22 contract — extending the subset is its own future phase. The validator's error messages MUST point at the unsupported syntax (e.g. "Operator `and` is not supported. Add a separate criterion to compose with AND-intersection.").

### D-03 — Validation UX: parse + translate + dry-run count

The "Validate" button on the FHIRPath input runs three steps in sequence:

1. **Parse** the expression with the chosen FHIRPath parser (see D-04). On parse error, show the parser's location-aware error.
2. **Translate** the parsed expression into a FHIR search URL via the D-02 translator. On unsupported syntax, show the translator's "this clause isn't supported because…" error.
3. **Dry-run count**: issue the translated query with `_count=0&_summary=count` (and the `_elements` projection from D-02). Show the resulting `total` as **"Matches N patients"**. If `N === 0`, show a yellow note ("Cohort would be empty"). If `N > 10000`, show the same Phase-21 truncation Alert ("Cohort truncated to 10,000 patients — add more criteria…").

**Save is gated by a green validate.** The Save button on the form is disabled until the most-recent validate returned green for the FHIRPath input. If the user edits the expression after validate, the validate state resets to "needs validate".

**Why:** Phase 21's interactive criteria are validated structurally (date inputs are dates, code is non-empty). FHIRPath needs a roundtrip to be useful — the user should know whether their expression is syntactically valid, translatable, AND non-empty before they save.

### D-04 — FHIRPath parser library (research handoff)

**Decision deferred to gsd-phase-researcher.** Candidates to evaluate (NOT to install yet):

- **`fhirpath` npm package** (HL7-maintained, BSD-3) — full FHIRPath engine. Heavy for our needs (we only use the AST), but battle-tested.
- **`@medplum/fhirpath` if it exists in 5.1.7** — would align with the rest of our Medplum stack.
- **Hand-rolled parser using `nearley` or `chevrotain`** — only if the above two are unviable for the locked subset.

The researcher MUST verify Medplum's FHIRPath surface first (their `@medplum/core` may already export FHIRPath helpers). Whatever is picked must:
- Run in the browser (no Node-only deps)
- Produce an AST or token stream we can walk for translation
- Be MIT-compatible (project license is MIT per CLAUDE.md)

If the only viable option is the `fhirpath` package, accept the bundle-size cost and document it.

### D-05 — FDPG format target: Codex Structured Query

The export/import target is the **FDPG Codex Structured Query (SQ)** JSON format — the format actually used by the FDPG Central Search portal. This is what makes CHRT-06 real interop instead of just a JSON dump.

**Why:** "Custom JSON envelope" defeats the entire CHRT-06 motivation; "MII KDS-aligned subset" round-trips only with our own tool. The Codex SQ format is published, has a JSON Schema, and is consumed by real FDPG infrastructure researchers actually use.

**Researcher must surface:**
- Current Codex SQ schema URL/version (the format has evolved)
- Validation library (e.g. `ajv` against the published JSON Schema) or hand-rolled validator
- Mapping table: Phase-21 criterion types → Codex SQ inclusion-criteria entries
  - `date-range` (Encounter.period) → time-restriction on Encounter
  - `condition-code` → terminology-criterion on Condition with SNOMED CT/ICD-10 system
  - `reference-list` → patient-id criterion (verify FDPG SQ supports explicit patient lists; if not, document as an export limitation)

### D-06 — FDPG round-trip scope: interactive criteria only

**Export**: A cohort whose criteria are all in the Phase-21 interactive set (`date-range`, `condition-code`, `reference-list`) exports cleanly to FDPG SQ. A cohort containing any `fhirpath` criterion is rejected at export time with: **"Cannot export to FDPG: this cohort contains a FHIRPath criterion. FDPG Structured Query and FHIRPath are not equivalent formats."** The Export button is hidden/disabled with a tooltip on FHIRPath-containing cohorts.

**Import**: An FDPG SQ JSON file imports into a fresh `CohortDefinition` whose criteria are reconstructed from the SQ inclusion-criteria entries. Unsupported SQ features (exclusion criteria, OR groups, time-windows the translator doesn't recognize) cause the import to fail with a red Alert: "This FDPG cohort uses features not yet supported. Unsupported: [list]." Partial import is NOT offered.

**Why:** Both directions are required for "interop". Export-only would let researchers send to FDPG but not receive; import-only is the reverse problem. Restricting to interactive-criterion cohorts means each direction has a precise, testable mapping.

### D-07 — FHIRPath cohort definition shape: new criterion type, hybrid composable

The `CohortCriterion` discriminated union from Phase 21 gains a fourth variant:

```ts
export interface FhirpathCriterion {
  type: 'fhirpath';
  expression: string;       // raw FHIRPath as the user typed it
  translatedQuery?: string; // cached translator output, e.g. 'Patient?birthdate=lt1960-01-01'
  // translatedQuery is set on Validate; cleared on edit; consulted by the resolver
}
export type CohortCriterion = DateRangeCriterion | ConditionCodeCriterion | ReferenceListCriterion | FhirpathCriterion;
```

Hybrid composition means a single cohort can mix FHIRPath criteria with the existing three types. They AND-intersect through the same Phase-21 cohortResolver — the new resolver case for `fhirpath` issues the cached `translatedQuery` (or re-translates on cache miss / edit), then dedupes the result to a Patient ID set with the same 10K cap.

**Why:** Hybrid is the natural Phase 21 extension — one resolver path, one storage shape, one builder form. The FDPG-export limitation (D-06) is a hard rule applied at export time, not a structural separation. Forking the data model into "interactive cohorts" vs "FHIRPath cohorts" would double the saved-cohorts list shape, the management view, and the FDPG export logic for no UX gain.

### D-08 — FHIRPath input position on the builder form

The FHIRPath input is **the fourth criterion section** on `/quality/cohorts`, rendered as a `<Paper>` card stacked below the existing "Patient references" Textarea. Card layout:

```
┌─ FHIRPath query (advanced) ─────────────┐
│ Textarea (autosize, monospace, ~6 rows) │
│ [Validate]      Matches N patients      │
└─────────────────────────────────────────┘
```

- Input: Mantine Textarea with `style={{ fontFamily: 'monospace' }}`, `autosize minRows={4} maxRows={12}`, `maxLength={4096}`
- Validate button (primary outline) and the result row are inline below the Textarea
- Result row shows one of: nothing (pristine), spinner ("Validating…"), green "Matches N patients", yellow "Cohort would be empty", red error
- An accessory `<Anchor>` reads "Translator support" and links to a section in the help panel (or in-page Collapse) listing the supported subset (D-02)

**Why:** Same `<Paper withBorder radius="sm" p="md">` pattern as the other three criterion cards — single-page authoring of a hybrid cohort matches D-07. Tabs would mask hybrid composition; a modal would break the single-page edit flow.

### D-09 — Management view: inline ActionIcon menu per row

Each saved-cohort row on `/quality/cohorts` gets a Mantine `ActionIcon` (kebab `IconDots`) on the right side, opening a `<Menu>` with three items:

- **Edit** → opens a modal (or repurposes the inline form, researcher's call) pre-filled with the cohort's criteria; Save updates the existing cohort and bumps `updatedAt`
- **Duplicate** → inserts a new cohort with `name: '<original> (copy)'`, fresh UUID, fresh timestamps, same criteria
- **Delete** → opens a confirm modal "Delete cohort '<name>'?"; on confirm, removes from `cohorts[]` and clears `activeCohortId` if the deleted cohort was active (zero-state on the dashboard then renders the existing "No cohort — all patients" path)

**No new routes.** Management lives entirely on `/quality/cohorts` to preserve the Phase-21 page shape and minimize router/navigation churn for three actions.

### D-10 — Edit + active cohort: bump updatedAt, let cache invalidate

Editing the currently-active cohort is allowed without restriction. On Save:

1. The cohort's `updatedAt` is bumped to `new Date().toISOString()`
2. Phase 21's `cohortResolver` cache (keyed on `cohortId + updatedAt`) automatically invalidates the entry
3. The next dashboard recompute (or the user navigating back to `/quality`) re-resolves the cohort from scratch
4. The editor surfaces a one-line note: **"This cohort is currently active. Saving will trigger recompute on the dashboard."**

No "draft" slot, no edit-while-active block. The Phase-21 cache mechanism already provides the right invalidation contract; layering a draft concept on top would be a Phase 22 invention with no analogue elsewhere.

### D-11 — Duplicate does not auto-activate

Duplicating a cohort creates the new copy but does NOT auto-activate it. `activeCohortId` is left untouched. The user sees the new row in the saved-cohorts list and can activate it explicitly via the existing activate UI if desired.

**Why:** Matches the implicit contract of duplicate actions across Mantine-style management UIs (new row appears but focus stays where the user is). Prevents surprising dashboard recomputes triggered by a duplicate click. Consistent with Phase 21's explicit-activation model (activation is always a deliberate user action, never a side-effect of another write).

### Folded Todos

None — all v1.3 cohort-related backlog items were absorbed into CHRT-01..07 during milestone planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before producing artifacts.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — v1.3 requirements; CHRT-05/06/07 (Phase 22). Out-of-Scope table is authoritative for what stays deferred.
- `.planning/ROADMAP.md` §"Phase 22" — phase goal, depends-on (Phase 21), success criteria, UI hint.
- `.planning/PROJECT.md` §"Current Milestone: v1.3" + §"Key Decisions" — localStorage key convention, dual-source validation lineage.

### Phase 21 Outputs (Phase 22 builds on these)
- `.planning/phases/21-interactive-cohort-builder-rename/21-CONTEXT.md` — Phase 21 implementation decisions; D-05/D-06 (Encounter.period, 10K cap), Claude-discretion entries on storage shape, scoping mechanism.
- `.planning/phases/21-interactive-cohort-builder-rename/21-RESEARCH.md` — Phase 21 research findings; pitfalls (URL length, Patient `_id`, hydration gate, PHI logging).
- `.planning/phases/21-interactive-cohort-builder-rename/21-VALIDATION.md` — CHRT-01..04 validation map; mirror its structure for CHRT-05..07.

### Code — Direct Extension Targets
- `src/quality/cohorts.ts` — `CohortDefinition`, `CohortCriterion` discriminated union, `parsePatientRefs`. **Phase 22 adds `FhirpathCriterion` to the union.**
- `src/quality/cohortResolver.ts` — `resolveCohort(client, cohort): Promise<string[]>`, AND-intersection, module-scoped cache keyed on `cohortId + updatedAt`. **Phase 22 adds the `fhirpath` resolver branch.**
- `src/hooks/useCohorts.ts` — `useCohorts()` hook with `addCohort`, `updateCohort`, `deleteCohort`, `activateCohort`, hydration gate. **Phase 22 wires `updateCohort` and `deleteCohort` (currently future-use stubs from Plan 21-02).**
- `src/components/quality/CohortsPage.tsx` — saved-cohorts card + new-cohort card. **Phase 22 adds the row-level ActionIcon menu and Import/Export buttons.**
- `src/components/quality/CohortBuilderForm.tsx` — three-criterion form, Save modal, truncation Alert. **Phase 22 adds the FHIRPath card (D-08) and switches the form to handle Edit mode in addition to Create mode.**

### Code — Patterns to Reuse
- `src/components/quality/ThresholdsPage.tsx` — `<Paper withBorder radius="sm" p="md">` card pattern; mirror for the FHIRPath card.
- `src/quality/sampling.ts` — Plan 21-03 `sampleResources` GET/POST cutover at 40 IDs and `URLSearchParams` URL-encoding pattern; reuse for the FHIRPath translator's dry-run count fetch when the criterion-set is large.
- `src/quality/__tests__/pdfExport.test.ts` — MedplumClient mocking shape (`{ searchResources: vi.fn(), post: vi.fn(), fhirUrl: vi.fn() }`); reuse for FHIRPath translator + Codex SQ tests.

### External Specs (researcher will pin exact URLs)
- **FHIRPath spec (HL7)** — http://hl7.org/fhirpath/ — only the subset in D-02 is in scope.
- **FHIR R4 Search Parameter spec** — https://hl7.org/fhir/R4/search.html — for translator output.
- **MII FDPG Codex Structured Query** — researcher to surface the current schema URL + JSON Schema location. Look for the `medizininformatik-initiative/feasibility-backend` and `medizininformatik-initiative/sq-frontend` repos for canonical examples.
- **MII Kerndatensatz module names** — researcher to pin which SNOMED CT and ICD-10-GM systems Phase 22 needs to handle for the condition-code → Codex SQ mapping.

### Library Candidates (research handoff per D-04)
- `fhirpath` (npm, HL7-maintained) — primary candidate for FHIRPath parsing
- `@medplum/core` — verify whether it exports FHIRPath helpers (Medplum 5.1.7)
- `ajv` — JSON Schema validator for Codex SQ import

</canonical_refs>

<code_context>
## Existing Code Insights

The Phase 21 surface Phase 22 builds on (read these to plan):

- **`useCohorts` hook** already has `addCohort`, `updateCohort`, `deleteCohort`, `activateCohort` — but per Plan 21-02 SUMMARY the latter two are "stubbed as future-use exports for Phase 22 consumers". Phase 22 implements their behavior + the Edit/Duplicate/Delete UI bindings.
- **`cohortResolver` cache** keys on `cohort.id + cohort.updatedAt`. Phase 22's `updateCohort` MUST bump `updatedAt` so cache invalidation Just Works (D-10).
- **`parsePatientRefs`** caps at 10K and reuses across criterion types. Phase 22's FHIRPath resolver branch must apply the same 10K cap to its translator-issued query results before returning them to the AND-intersector.
- **Save modal pattern** (in-body heading, Discard / Save cohort buttons, no native Modal title) — Phase 22's Edit modal MUST follow the same shape to preserve UI-SPEC §Typography 4-font-size budget.
- **`@mantine/dates` + `dayjs`** are already pinned (added in Plan 21-05). Phase 22 doesn't need new date libraries.
- **`ResourceTypeSelector` (renamed from CohortSelector in Plan 21-04)** is unrelated to programmatic cohorts — it controls resource-type inclusion. Confusion potential is high; Phase 22 docs/copy MUST always say "cohort" for the new feature, never "resource selector".
- **22 pre-existing test failures** flagged in Plan 21-05/06 SUMMARYs are unrelated to cohort code; Phase 22 baseline-compares against the same 22-failed count.

</code_context>

<deferred_ideas>
## Deferred Ideas (Not in Phase 22)

- **FHIRPath subset expansion** (and/or composition, nested where, chained references, `:contains`/`:exact` modifiers) — future phase if the locked subset proves insufficient.
- **FHIRPath ↔ FDPG SQ best-effort mapping** — explicitly rejected per D-06; future phase if real-world demand surfaces.
- **Cross-user cohort sharing** — REQUIREMENTS.md Out-of-Scope; future milestone.
- **Cohort versioning / audit history** — REQUIREMENTS.md Out-of-Scope; future milestone.
- **Server-side FHIRPath/CQL evaluation** (Blaze `$evaluate-measure`) — rejected per D-01 portability concern.
- **Client-side FHIRPath engine** (`fhirpath` npm runtime evaluator) — rejected per D-01 cap-and-scaling concern.
- **Cohort detail route** (`/quality/cohorts/[id]`) — rejected per D-09 single-page management decision; revisit if cohort surfaces grow (audit history, sharing).

</deferred_ideas>
