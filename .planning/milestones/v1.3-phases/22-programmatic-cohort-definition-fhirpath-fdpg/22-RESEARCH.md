# Phase 22: Programmatic Cohort Definition (FHIRPath + FDPG) — Research

**Researched:** 2026-04-16
**Domain:** FHIRPath parsing + AST translation, MII FDPG Codex Structured Query interop, Mantine cohort management UI
**Confidence:** HIGH

## Summary

Phase 22 adds three programmatic capabilities on top of Phase 21's interactive cohort builder: (1) a FHIRPath cohort criterion that translates `Resource.where(field op literal)` expressions to native FHIR search URLs, (2) MII FDPG Codex Structured Query JSON import/export for interactive criteria only, and (3) inline Edit/Duplicate/Delete actions on the saved-cohorts list. All three plug into the existing `cohortResolver` cache and `useCohorts` hook without restructuring the storage shape.

The dominant research finding is that **`@medplum/core` 5.1.7 already ships a complete FHIRPath parser** (`parseFhirPath`, named AST atom classes) — eliminating the need for the heavy `fhirpath` npm package (2.4 MB unpacked, depends on antlr4 + ucum-lhc + decimal.js + date-fns). The Medplum AST surfaces exactly the shape the D-02 translator needs: `FhirPathAtom` → `DotAtom(Symbol, Function('where', [op]))` where `op` is one of `EqualsAtom` / `NotEqualsAtom` / `ArithemticOperatorAtom`. For the MII FDPG side, the canonical schema is the v3 Structured Query format hosted at `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema`, with TypeScript model classes published in the `feasibility-gui` repo and the JSON Schema in `feasibility-backend`.

**Primary recommendation:** Build the FHIRPath translator on Medplum's `parseFhirPath` AST; hand-curate a small (resourceType, fhirpath-field) → (search-param, prefix-mapping) lookup table covering the locked D-02 subset; write the FDPG SQ codec as a thin transform layer with hand-written TypeScript types matching the v3 schema (no codegen — the schema is small and stable for the criteria we support); and add `IconDots` + `<Menu>` per row using the existing `<Menu.Target>` / `<Menu.Dropdown>` / `<Menu.Item>` pattern from `SearchResultsPage.tsx`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — FHIRPath evaluation surface:** translator → native FHIR search URL → `cohortResolver`. Not client-side eval, not server-side `$evaluate-measure`. Untranslatable expressions are rejected at validate time.
- **D-02 — Translator subset:** exactly `<ResourceType>.where(<top-level-field> <op> <literal>)`. Operators ∈ `=`, `!=`, `<`, `<=`, `>`, `>=`. Literals ∈ FHIRPath date `@YYYY-MM-DD`, string, integer, decimal, boolean. NO `and`/`or`, NO nested `where()`, NO functions like `exists()`/`first()`/`count()`, NO `subject.resolve().X`, NO `:contains`/`:exact` modifiers.
- **D-03 — Validation pipeline:** parse → translate → dry-run with `_count=0&_summary=count`. Save gated on green Validate. Show match count. Yellow note on N=0; truncation Alert on N>10000.
- **D-04 — FHIRPath parser library:** RESEARCH HANDOFF — see Standard Stack section for the verified recommendation.
- **D-05 — FDPG target:** MII Codex Structured Query (the v3 format used by FDPG Central Search). RESEARCH HANDOFF for schema URL — see Standard Stack section.
- **D-06 — FDPG round-trip scope:** interactive criteria ONLY (`date-range`, `condition-code`, `reference-list`). FHIRPath cohorts CANNOT export — explicit error message. Inbound parses into Phase 21 `CohortCriterion` shapes. No partial import.
- **D-07 — `FhirpathCriterion` shape:** `{ type: 'fhirpath', expression: string, translatedQuery?: string }`. Hybrid composable; AND-intersects with the other 3 types via the same `cohortResolver`.
- **D-08 — UI position:** fourth `<Paper withBorder radius="sm" p="md">` card on `/quality/cohorts` after the existing 3 criteria. Monospace `<Textarea>` (autosize 4–12 rows, maxLength 4096), Validate button, helper text with 3 supported example expressions.
- **D-09 — Management view:** inline `IconDots` `<ActionIcon>` + `<Menu>` per row → Edit / Duplicate / Delete. NO new routes. Modal-based edit. Delete-active clears `activeCohortId`.
- **D-10 — Edit-while-active allowed:** Save bumps `updatedAt`, which auto-invalidates the `cohortResolver` cache (it keys on `cohort.id + updatedAt`). One-line note "This cohort is currently active. Saving will trigger recompute on the dashboard."

### Claude's Discretion

- Edit modal vs inline form swap for D-09 — per CONTEXT §D-09, "researcher's call". Recommendation: **modal-based edit using the existing Save modal pattern from `CohortBuilderForm`** (in-body heading, Discard / Save buttons, no native Modal title) so the UI-SPEC §Typography 4-font-size budget is preserved. The inline form is currently a "New cohort" card; converting it to dual-mode (Create + Edit) would require lifting state above the page's render conditionals and is more invasive than spawning a modal that wraps the same form in Edit mode.
- Library choice for FHIRPath parsing (D-04) — recommended below in Standard Stack.
- Library choice for FDPG SQ JSON Schema validation — recommended below in Standard Stack.

### Deferred Ideas (OUT OF SCOPE)

- **FHIRPath subset expansion** (and/or composition, nested where, chained references, `:contains`/`:exact` modifiers) — future phase if locked subset proves insufficient.
- **FHIRPath ↔ FDPG SQ best-effort mapping** — explicitly rejected per D-06.
- **Cross-user cohort sharing** — REQUIREMENTS.md Out-of-Scope.
- **Cohort versioning / audit history** — REQUIREMENTS.md Out-of-Scope.
- **Server-side FHIRPath/CQL evaluation** (Blaze `$evaluate-measure`) — rejected per D-01 portability.
- **Client-side FHIRPath engine** (`fhirpath` npm runtime evaluator) — rejected per D-01 cap-and-scaling.
- **Cohort detail route** (`/quality/cohorts/[id]`) — rejected per D-09 single-page management decision.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CHRT-05** | User can define a cohort by writing a FHIRPath query expression; expression validated before save | Medplum's `parseFhirPath` exposes the AST shape we need (verified: `Patient.where(birthDate < @1960-01-01)` → `FhirPathAtom → DotAtom → FunctionAtom('where', [ArithemticOperatorAtom('<', SymbolAtom, LiteralAtom)])`). Translation table for D-02 subset documented below. Dry-run validation uses `_count=0&_summary=count` — Blaze-supported. |
| **CHRT-06** | User can import and export cohort definitions in MII FDPG JSON format | Canonical format is v3 Structured Query at `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema`. Authoritative TypeScript models live in `medizininformatik-initiative/feasibility-gui` (`src/app/model/StructuredQuery/`). Mapping table below covers all 3 interactive criterion types. Export rejects FHIRPath-containing cohorts per D-06. |
| **CHRT-07** | User can edit, duplicate, and delete saved cohorts from a management view | `useCohorts` already has `addCohort` + `activateCohort`; need to add `updateCohort`, `deleteCohort`, `duplicateCohort` (the latter is `addCohort` with copied criteria). `cohortResolver` cache keys on `cohortId + updatedAt`, so Edit auto-invalidates. Inline `<Menu>` pattern with `Menu.Target` / `Menu.Dropdown` already exists in `SearchResultsPage.tsx:343-369`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** React 18.3.1 + Vite 8 + TypeScript 5.7 + Medplum 5.1.7 + Mantine 8.3.18 + react-router-dom 7.14 — locked. Researcher MUST NOT propose alternatives.
- **License:** MIT — any new dependency must be MIT-compatible.
- **Do NOT use:** Mantine 9.x (requires React 19), `@tanstack/react-query` (competing cache), Tailwind CSS, SMART on FHIR libs, GraphQL FHIR, Next.js / Remix.
- **GSD workflow enforcement:** All edits must go through GSD commands.
- **Local-first SPA:** runs in browser only; no server-side rendering, no Node-only deps in runtime code.

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@medplum/core` | 5.1.7 (already installed) | FHIRPath parser (`parseFhirPath`), AST classes (`FhirPathAtom`, `DotAtom`, `FunctionAtom`, `EqualsAtom`, `NotEqualsAtom`, `ArithemticOperatorAtom`, `SymbolAtom`, `LiteralAtom`), MedplumClient for dry-run search | [VERIFIED: node_modules/@medplum/core/dist/esm/index.d.ts] — exports `parseFhirPath(input: string): FhirPathAtom` and all named atom classes with stable `.left` / `.right` / `.operator` / `.name` / `.args` / `.value` fields. Browser-safe (already shipping in production builds). License: Apache-2.0. **Zero new bundle weight.** |
| `@mantine/core` | 8.3.18 (already installed) | `<Menu>`, `<Menu.Target>`, `<Menu.Dropdown>`, `<Menu.Item>`, `<ActionIcon>`, `<Modal>`, `<Textarea>`, `<Alert>`, `<Anchor>`, `<Code>` for FHIRPath card and management menu | [VERIFIED: codebase] — `<Menu>` pattern already used in `src/components/explorer/SearchResultsPage.tsx:343-369`; `<ActionIcon>` already used in `src/components/quality/ThresholdsPage.tsx:125`. |
| `@mantine/notifications` | 8.3.18 (already installed) | Toast feedback for Validate / Save / Delete / Import / Export | [VERIFIED: codebase] — established pattern in `useCohorts.addCohort` and `QualityOverviewPage.handleRecompute`. |
| `@tabler/icons-react` | 3.41.1 (already installed) | `IconDots`, `IconCopy`, `IconEdit`, `IconTrash`, `IconUpload`, `IconDownload`, `IconAlertTriangle`, `IconCheck` | [VERIFIED: `node_modules/@tabler/icons-react/dist/esm/icons/IconDots.mjs` exists]. |
| `crypto.randomUUID()` | browser native | New cohort IDs for `duplicateCohort` | [VERIFIED: already used in `useCohorts.addCohort:87`]. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ajv` | 8.18.0 | JSON Schema validation for inbound FDPG SQ files | **Optional — recommend hand-rolled validator instead** (see Don't Hand-Roll caveat below). The full ajv import is ~1 MB unpacked; given that we only support importing 3 criterion shapes, a 50-line hand-written validator covering "version + inclusionCriteria[][] with termCodes / valueFilter / timeRestriction / context" is cheaper than pulling in ajv. License: MIT. |

### Alternatives Considered (and rejected)

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| `parseFhirPath` from `@medplum/core` | `fhirpath` npm package (HL7-maintained, v4.9.3 published 2026-04-10) | [VERIFIED: `npm view fhirpath@4.9.3 dist.unpackedSize`] — ~2.4 MB unpacked; depends on `antlr4`, `@lhncbc/ucum-lhc`, `decimal.js`, `date-fns`. Full FHIRPath engine — overkill for parse-only AST extraction. License: custom (LICENSE.md, derived from BSD-3 but not standard SPDX). Medplum already ships parser — adding `fhirpath` is duplicate weight. **Documented for completeness; NOT recommended.** |
| `parseFhirPath` from `@medplum/core` | `@medplum/fhirpath` separate package | [VERIFIED: `ls node_modules/@medplum/`] — does NOT exist as a separate npm package in 5.1.7. The only @medplum subpackages installed are `core`, `fhirtypes`, `react`, `react-hooks`. FHIRPath functionality is bundled in `@medplum/core`. |
| `parseFhirPath` from `@medplum/core` | Hand-rolled regex parser scoped to D-02 subset | Possible but unnecessary now that we've verified Medplum's AST is exactly the shape we need. Hand-roll only if Medplum 6.x deprecates the parser exports (currently stable; used internally by Medplum's SearchParameter machinery). |
| Hand-written FDPG SQ validator | `ajv` with the canonical JSON schema | Ajv is robust but heavyweight for our scope. The v3 schema URL `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema` is referenced by all examples but the schema file itself is not trivially fetchable from a public URL (the `feasibility-backend` Java repo has it embedded; the GitHub raw URL we'd need is gated behind the `query-schema.json` location which moved between repo restructures). A hand-written validator that asserts the 5–6 fields we care about (`version`, `inclusionCriteria`, `termCodes`, `valueFilter.type`, `timeRestriction`, `context`) is easier to maintain than tracking a moving schema URL. **Recommend hand-rolled.** |

### Installation

**No new dependencies needed.** All required libraries are already in `package.json`. Phase 22 ships zero net new packages.

```bash
# (no install commands required)
```

### Version Verification (2026-04-16)

| Package | Pinned | npm latest | Notes |
|---------|--------|------------|-------|
| `@medplum/core` | 5.1.7 | 5.1.7 | [VERIFIED: `node_modules/@medplum/core/package.json`] |
| `@mantine/core` | 8.3.18 | 8.3.18 | [VERIFIED: package.json] |
| `@tabler/icons-react` | 3.41.1 | 3.41.1 | [VERIFIED: package.json] |
| `fhirpath` (NOT recommended) | — | 4.9.3 | [VERIFIED: `npm view fhirpath version`, published 2026-04-10] |
| `ajv` (optional) | — | 8.18.0 | [VERIFIED: `npm view ajv@latest`] |

## Architecture Patterns

### Recommended File Layout (extends Phase 21's structure)

```
src/quality/
├── cohorts.ts                   # EXTEND: add FhirpathCriterion to union
├── cohortResolver.ts            # EXTEND: add 'fhirpath' branch in resolveCriterion
├── fhirpathTranslator.ts        # NEW: parseFhirPath wrapper + AST → FHIR search URL
├── fhirpathTranslator.test.ts   # NEW
├── fdpgCodec.ts                 # NEW: CohortDefinition ↔ Codex SQ JSON
├── fdpgCodec.test.ts            # NEW
└── fdpgTypes.ts                 # NEW: TypeScript interfaces matching MII v3 SQ schema

src/hooks/
├── useCohorts.ts                # EXTEND: implement updateCohort, deleteCohort, duplicateCohort

src/components/quality/
├── CohortBuilderForm.tsx        # EXTEND: add 4th Paper card (FhirpathCriterionCard); add Edit-mode prop
├── FhirpathCriterionCard.tsx    # NEW: monospace Textarea + Validate button + match-count display
├── CohortsPage.tsx              # EXTEND: SavedCohortRow gains <Menu> + Import/Export buttons
├── EditCohortModal.tsx          # NEW: wraps CohortBuilderForm in Modal, in-body heading
└── DeleteCohortModal.tsx        # NEW: confirm modal "Delete cohort '<name>'?"
```

### Pattern 1: Medplum AST traversal for FHIRPath translation

**What:** Parse FHIRPath, walk the typed AST, reject anything outside D-02 subset, return a structured `TranslatedQuery`.

**When to use:** The `Validate` button click handler.

**Verified AST shape** for `Patient.where(birthDate < @1960-01-01)`:

```
FhirPathAtom (root, exposes .original + .child)
└── DotAtom (.left + .right)
    ├── left: SymbolAtom { name: "Patient" }
    └── right: FunctionAtom { name: "where", args: [...] }
        └── args[0]: ArithemticOperatorAtom { operator: "<", left, right }
            ├── left: SymbolAtom { name: "birthDate" }
                  // OR: DotAtom for nested paths like "code.coding.code"
            └── right: LiteralAtom { value: { type: "dateTime", value: "1960-01-01" } }
```

**Operator atom mapping** (verified by parse-test against the live Medplum runtime):

| FHIRPath operator | AST class | `.operator` field |
|-------------------|-----------|-------------------|
| `=` | `EqualsAtom` | (not used; class identity) |
| `!=` | `NotEqualsAtom` | (not used; class identity) |
| `<`, `<=`, `>`, `>=` | `ArithemticOperatorAtom` | yes — string match |

**Code sketch:**

```typescript
// src/quality/fhirpathTranslator.ts
import {
  parseFhirPath,
  ArithemticOperatorAtom,
  EqualsAtom,
  NotEqualsAtom,
  FunctionAtom,
  DotAtom,
  SymbolAtom,
  LiteralAtom,
} from '@medplum/core';

export interface TranslatedQuery {
  resourceType: string;
  fieldPath: string;       // e.g. "birthDate" or "code.coding.code"
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=';
  literal: { kind: 'date' | 'string' | 'integer' | 'decimal' | 'boolean'; value: string | number | boolean };
}

export class TranslationError extends Error {}

export function translateFhirpath(expression: string): TranslatedQuery {
  let root;
  try {
    root = parseFhirPath(expression);
  } catch (e) {
    throw new TranslationError(`Parse error: ${(e as Error).message}`);
  }

  // Expect: FhirPathAtom → DotAtom(SymbolAtom, FunctionAtom('where', [ComparisonAtom]))
  const child = root.child;
  if (!(child instanceof DotAtom)) {
    throw new TranslationError(
      'Expression must be a single Resource.where(...) call. Composition (and / or) is not supported.',
    );
  }
  if (!(child.left instanceof SymbolAtom)) {
    throw new TranslationError('Expression must start with a ResourceType.');
  }
  const resourceType = child.left.name;

  if (!(child.right instanceof FunctionAtom) || child.right.name !== 'where') {
    throw new TranslationError(
      `Only .where(...) is supported. Got: ${child.right.constructor.name}`,
    );
  }
  if (child.right.args.length !== 1) {
    throw new TranslationError('where() takes exactly one argument.');
  }

  const op = child.right.args[0];
  let operator: TranslatedQuery['operator'];
  if (op instanceof EqualsAtom) operator = '=';
  else if (op instanceof NotEqualsAtom) operator = '!=';
  else if (op instanceof ArithemticOperatorAtom) {
    const o = op.operator;
    if (o !== '<' && o !== '<=' && o !== '>' && o !== '>=') {
      throw new TranslationError(`Operator ${o} is not supported. Use =, !=, <, <=, >, >=.`);
    }
    operator = o;
  } else {
    throw new TranslationError(
      `Unsupported clause type: ${op.constructor.name}. Use field op literal.`,
    );
  }

  // Comparison atom shape: .left = path (Symbol or DotAtom chain), .right = LiteralAtom
  const fieldPath = atomToPath(op.left);
  if (!(op.right instanceof LiteralAtom)) {
    throw new TranslationError('Right-hand side must be a literal value.');
  }
  const literal = literalAtomToLiteral(op.right);

  return { resourceType, fieldPath, operator, literal };
}

function atomToPath(atom: unknown): string {
  if (atom instanceof SymbolAtom) return atom.name;
  if (atom instanceof DotAtom) {
    return `${atomToPath(atom.left)}.${atomToPath(atom.right)}`;
  }
  throw new TranslationError(
    `Unsupported left-hand side: ${(atom as { constructor: { name: string } }).constructor.name}. ` +
      'Use a top-level field or dotted path (e.g. code.coding.code).',
  );
}

function literalAtomToLiteral(lit: LiteralAtom): TranslatedQuery['literal'] {
  const tv = lit.value;
  switch (tv.type) {
    case 'dateTime':
    case 'date':
      return { kind: 'date', value: tv.value as string };
    case 'string':
      return { kind: 'string', value: tv.value as string };
    case 'integer':
      return { kind: 'integer', value: tv.value as number };
    case 'decimal':
      return { kind: 'decimal', value: tv.value as number };
    case 'boolean':
      return { kind: 'boolean', value: tv.value as boolean };
    default:
      throw new TranslationError(`Unsupported literal type: ${tv.type}`);
  }
}
```

### Pattern 2: TranslatedQuery → FHIR search URL

**What:** Map `(resourceType, fieldPath, operator, literal)` to a FHIR search URL using a hand-curated lookup table.

**Why hand-curated:** Medplum's `getSearchParameter()` lookup requires loading the FHIR R4 SearchParameter bundle (a multi-MB file not shipped with `@medplum/core`). For the locked D-02 subset, a 30-row table is more reliable, debuggable, and cheaper than dynamic lookup.

**Code sketch:**

```typescript
// src/quality/fhirpathTranslator.ts (continued)

interface SearchParamEntry {
  searchParam: string;       // FHIR search parameter name
  paramType: 'date' | 'token' | 'string' | 'reference' | 'number' | 'quantity';
  /** _elements projection so the resolver can pull subject/id efficiently */
  elements: 'id' | 'subject';
}

// Curated map: (resourceType, fhirpath-field) -> FHIR search parameter
// Source: https://hl7.org/fhir/R4/searchparameter-registry.html
const SEARCH_PARAM_MAP: Record<string, Record<string, SearchParamEntry>> = {
  Patient: {
    birthDate: { searchParam: 'birthdate', paramType: 'date', elements: 'id' },
    gender: { searchParam: 'gender', paramType: 'token', elements: 'id' },
    'name.family': { searchParam: 'family', paramType: 'string', elements: 'id' },
    'name.given': { searchParam: 'given', paramType: 'string', elements: 'id' },
    deceased: { searchParam: 'deceased', paramType: 'token', elements: 'id' },
    active: { searchParam: 'active', paramType: 'token', elements: 'id' },
  },
  Condition: {
    'code.coding.code': { searchParam: 'code', paramType: 'token', elements: 'subject' },
    code: { searchParam: 'code', paramType: 'token', elements: 'subject' },
    'subject.reference': { searchParam: 'patient', paramType: 'reference', elements: 'subject' },
    'recordedDate': { searchParam: 'recorded-date', paramType: 'date', elements: 'subject' },
    'clinicalStatus.coding.code': { searchParam: 'clinical-status', paramType: 'token', elements: 'subject' },
  },
  Observation: {
    'code.coding.code': { searchParam: 'code', paramType: 'token', elements: 'subject' },
    code: { searchParam: 'code', paramType: 'token', elements: 'subject' },
    'effectiveDateTime': { searchParam: 'date', paramType: 'date', elements: 'subject' },
    'subject.reference': { searchParam: 'patient', paramType: 'reference', elements: 'subject' },
    'valueQuantity.value': { searchParam: 'value-quantity', paramType: 'quantity', elements: 'subject' },
  },
  Encounter: {
    'period.start': { searchParam: 'date', paramType: 'date', elements: 'subject' },
    'period.end': { searchParam: 'date', paramType: 'date', elements: 'subject' },
    'subject.reference': { searchParam: 'patient', paramType: 'reference', elements: 'subject' },
    'class.code': { searchParam: 'class', paramType: 'token', elements: 'subject' },
    'status': { searchParam: 'status', paramType: 'token', elements: 'subject' },
  },
  // Extend as users surface unsupported fields.
};

const PREFIX_FOR_OPERATOR: Record<TranslatedQuery['operator'], string> = {
  '=': '',
  '!=': 'ne',
  '<': 'lt',
  '<=': 'le',
  '>': 'gt',
  '>=': 'ge',
};

export function translatedQueryToFhirSearchUrl(q: TranslatedQuery): string {
  const resourceMap = SEARCH_PARAM_MAP[q.resourceType];
  if (!resourceMap) {
    throw new TranslationError(
      `Resource type "${q.resourceType}" is not in the supported translator map. ` +
        `Supported: ${Object.keys(SEARCH_PARAM_MAP).join(', ')}.`,
    );
  }
  const sp = resourceMap[q.fieldPath];
  if (!sp) {
    throw new TranslationError(
      `Field "${q.fieldPath}" on ${q.resourceType} has no FHIR search parameter mapping. ` +
        `Supported fields: ${Object.keys(resourceMap).join(', ')}.`,
    );
  }

  // Operator validity per FHIR search type (date+number+quantity allow all prefixes; token+string allow only =/!=)
  const prefix = PREFIX_FOR_OPERATOR[q.operator];
  const allowsRangePrefix = sp.paramType === 'date' || sp.paramType === 'number' || sp.paramType === 'quantity';
  if (!allowsRangePrefix && (prefix === 'lt' || prefix === 'le' || prefix === 'gt' || prefix === 'ge')) {
    throw new TranslationError(
      `Operator ${q.operator} is not valid for ${sp.paramType} fields. Use = or !=.`,
    );
  }

  const value = String(q.literal.value);
  const encoded = encodeURIComponent(`${prefix}${value}`);
  // _elements projection + _summary=count for dry-run; resolver pass uses _count=10000 instead
  return `${q.resourceType}?${sp.searchParam}=${encoded}&_elements=${sp.elements}&_count=10000`;
}
```

**Examples (verified against D-02):**
- `Patient.where(birthDate < @1960-01-01)` → `Patient?birthdate=lt1960-01-01&_elements=id&_count=10000`
- `Patient.where(gender = 'female')` → `Patient?gender=female&_elements=id&_count=10000`
- `Condition.where(code.coding.code = '44054006')` → `Condition?code=44054006&_elements=subject&_count=10000`
- `Patient.where(birthDate >= @1960-01-01)` → `Patient?birthdate=ge1960-01-01&_elements=id&_count=10000`

### Pattern 3: Dry-run validation via `_count=0&_summary=count`

**What:** Issue the translated query with `_count=0&_summary=count` to get a `Bundle.total` without retrieving entries.

**Why:** Verifies (1) the URL is syntactically valid for the server, (2) returns at least N>0 patients, (3) confirms the search-param mapping actually exists on the connected Blaze.

**Code sketch:**

```typescript
// src/quality/fhirpathTranslator.ts (continued)
import type { MedplumClient } from '@medplum/core';
import type { Bundle } from '@medplum/fhirtypes';

export async function dryRunCount(
  client: MedplumClient,
  q: TranslatedQuery,
): Promise<number> {
  const sp = SEARCH_PARAM_MAP[q.resourceType]?.[q.fieldPath];
  if (!sp) throw new TranslationError(`No mapping for ${q.resourceType}.${q.fieldPath}`);
  const prefix = PREFIX_FOR_OPERATOR[q.operator];
  const value = String(q.literal.value);

  // searchResources / search use Medplum's URLSearchParams encoder (T-21-05 mitigation —
  // never hand-build the URL).
  const bundle: Bundle = await client.search(q.resourceType, {
    [sp.searchParam]: `${prefix}${value}`,
    _count: 0,
    _summary: 'count',
  } as never);

  return bundle.total ?? 0;
}
```

**Blaze support:** [VERIFIED: https://samply.github.io/blaze/api.html] — `_summary=count` and `_elements` are both supported. Complex `_summary=count` queries can take longer; for that case Blaze supports `Prefer: respond-async` but for D-03 dry-runs we accept the synchronous wait (these are scoped queries on indexed search params, not heavy aggregations).

### Pattern 4: Inline `<Menu>` + `<ActionIcon>` per row

**What:** Per-row kebab menu with Edit / Duplicate / Delete actions.

**Pattern source:** `src/components/explorer/SearchResultsPage.tsx:343-369` for `<Menu>` shape; `src/components/quality/ThresholdsPage.tsx:125` for `<ActionIcon>` shape.

**Code sketch:**

```typescript
// In CohortsPage.tsx, inside SavedCohortRow:
<Menu shadow="md" width={180} position="bottom-end">
  <Menu.Target>
    <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${cohort.name}`}>
      <IconDots size={16} />
    </ActionIcon>
  </Menu.Target>
  <Menu.Dropdown>
    <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(cohort)}>
      Edit
    </Menu.Item>
    <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => onDuplicate(cohort)}>
      Duplicate
    </Menu.Item>
    <Menu.Divider />
    <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(cohort)}>
      Delete…
    </Menu.Item>
  </Menu.Dropdown>
</Menu>
```

### Pattern 5: FDPG SQ codec — interactive criteria → MII Codex Structured Query

**What:** Bidirectional transform between Phase 21's `CohortCriterion[]` array and the MII v3 Structured Query JSON shape.

**Canonical format reference:** `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema` (the version string embedded in every SQ document). Authoritative TypeScript reference models: [github.com/medizininformatik-initiative/feasibility-gui/tree/main/src/app/model/StructuredQuery](https://github.com/medizininformatik-initiative/feasibility-gui/tree/main/src/app/model/StructuredQuery).

**Outer shape:**

```json
{
  "version": "https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema",
  "display": "",
  "inclusionCriteria": [ /* outer array = AND groups */
    [ /* inner array = OR group within an AND */
      { "termCodes": [...], "valueFilter": {...}, "context": {...}, "timeRestriction": {...} }
    ]
  ],
  "exclusionCriteria": [ /* same shape — typically empty for our export */ ]
}
```

**Mapping table (Phase 21 criterion → FDPG SQ criterion):**

| Phase 21 criterion | SQ inner-array shape |
|--------------------|----------------------|
| `date-range` (Encounter.period) | `{ termCodes: [{ code: 'IMP', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', display: 'inpatient encounter' }], context: { code: 'Fall', system: 'fdpg.mii.cds', version: '1.0.0', display: 'Fall' }, timeRestriction: { afterDate: <start>, beforeDate: <end> } }` — uses MII's "Fall" (Encounter) context. Note: FDPG SQ doesn't model "any encounter regardless of class" cleanly; we use `IMP` (inpatient) as the default termCode since most MII KDS Encounter data is inpatient. **Document this as an export limitation.** |
| `condition-code` | `{ termCodes: [{ code: <code>, system: <system>, display: '' }], context: { code: 'Diagnose', system: 'fdpg.mii.cds', version: '1.0.0', display: 'Diagnose' } }` — `system` field passed through verbatim from the Phase 21 form. |
| `reference-list` | **NO direct mapping in FDPG SQ.** SQ is a constraint-based query language; it has no "patient ID list" primitive. Recommendation: surface as an export warning/error: "FDPG Structured Query does not support explicit patient lists. Skipping the reference-list criterion." Alternatively, encode as a degenerate criterion using `Patient` context with no termCode — but this won't survive a round-trip on the receiving side. **Document as a hard limitation.** |

**Inverse mapping (FDPG SQ → CohortCriterion):**

| SQ criterion shape | Phase 21 criterion |
|--------------------|---------------------|
| `context.code === 'Fall'` AND `timeRestriction` present | `date-range { start: timeRestriction.afterDate, end: timeRestriction.beforeDate }` |
| `context.code === 'Diagnose'` AND `termCodes[0]` present (no valueFilter) | `condition-code { system: termCodes[0].system, code: termCodes[0].code }` |
| Any other shape | **Reject the entire import** with red Alert listing what was unsupported (per D-06 "Partial import is NOT offered"). |

**Discriminator field:** `context.code` (with `context.system === 'fdpg.mii.cds'`). The MII Codex defines a fixed set of context codes (`Fall`, `Diagnose`, `Laboruntersuchung`, `Medikation`, `Patient`, etc.); we only handle `Fall` and `Diagnose` for Phase 22.

**Hand-written types:**

```typescript
// src/quality/fdpgTypes.ts
export interface FdpgTermCode {
  code: string;
  system: string;
  version?: string;
  display: string;
}

export interface FdpgTimeRestriction {
  afterDate?: string;   // ISO date YYYY-MM-DD
  beforeDate?: string;
}

export interface FdpgValueFilter {
  type: 'concept' | 'quantity-comparator' | 'quantity-range' | 'reference';
  selectedConcepts?: FdpgTermCode[];
  comparator?: 'lt' | 'le' | 'eq' | 'ge' | 'gt';
  value?: number;
  unit?: { code: string; display: string };
}

export interface FdpgCriterion {
  termCodes: FdpgTermCode[];
  context?: FdpgTermCode;
  attributeFilters?: unknown[]; // we don't generate these on export; on import, presence triggers reject
  valueFilter?: FdpgValueFilter;
  timeRestriction?: FdpgTimeRestriction;
}

export interface FdpgStructuredQuery {
  version: string;       // MUST be "https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema"
  display?: string;
  inclusionCriteria: FdpgCriterion[][];   // outer = AND, inner = OR
  exclusionCriteria?: FdpgCriterion[][];
}

export const FDPG_SQ_VERSION = 'https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema';
export const FDPG_CONTEXT_FALL: FdpgTermCode = {
  code: 'Fall', system: 'fdpg.mii.cds', version: '1.0.0', display: 'Fall',
};
export const FDPG_CONTEXT_DIAGNOSE: FdpgTermCode = {
  code: 'Diagnose', system: 'fdpg.mii.cds', version: '1.0.0', display: 'Diagnose',
};
```

### Pattern 6: Extending `cohortResolver` for `fhirpath` criteria

**What:** Add a `c.type === 'fhirpath'` branch to `resolveCriterion` (currently lines 139-171 of `src/quality/cohortResolver.ts`).

**Why minimal:** The existing `collectSubjectPatientIds` helper (lines 188-236) already handles paginated subject extraction from any FHIR search. The `fhirpath` branch only needs to (1) issue the cached `translatedQuery`, (2) call the same collector with `Patient` projection if `_elements=id` or `subject` projection if `_elements=subject`.

**Code sketch:**

```typescript
// src/quality/cohortResolver.ts — modified resolveCriterion
import { translateFhirpath, translatedQueryToFhirSearchUrl } from './fhirpathTranslator';

async function resolveCriterion(
  client: MedplumClient,
  c: CohortCriterion,
): Promise<Set<string>> {
  if (c.type === 'reference-list') {
    return new Set(c.patientIds);
  }
  if (c.type === 'fhirpath') {
    // Use cached translatedQuery if present; otherwise translate fresh
    // (cache miss happens after Edit clears translatedQuery, before next Validate).
    const tq = translateFhirpath(c.expression);
    const sp = SEARCH_PARAM_MAP[tq.resourceType]?.[tq.fieldPath];
    if (!sp) throw new Error(`Unsupported field: ${tq.resourceType}.${tq.fieldPath}`);
    const params: Record<string, string | string[]> = {
      [sp.searchParam]: `${PREFIX_FOR_OPERATOR[tq.operator]}${tq.literal.value}`,
      _elements: sp.elements,
      _count: DEFAULT_PAGE_COUNT,
    };
    // sp.elements === 'id' means we want Patient ids; collect from .id field.
    // sp.elements === 'subject' means we want patient subjects from non-Patient resource;
    // reuse collectSubjectPatientIds with the existing collector.
    if (sp.elements === 'id' && tq.resourceType === 'Patient') {
      return await collectIdField(client, tq.resourceType, params);
    }
    return await collectSubjectPatientIds(client, tq.resourceType as 'Encounter' | 'Condition', params);
  }

  // existing date-range / condition-code branches unchanged...
}

async function collectIdField(
  client: MedplumClient,
  resourceType: string,
  params: Record<string, string | string[]>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for await (const page of client.searchResourcePages(resourceType as never, params as never)) {
    for (const r of page) {
      if (r.id) ids.add(r.id);
      if (ids.size >= MAX_IDS_PER_CRITERION) break;
    }
    if (ids.size >= MAX_IDS_PER_CRITERION) break;
  }
  return ids;
}
```

### Anti-Patterns to Avoid

- **Don't load FHIR R4 SearchParameter bundle dynamically.** Medplum's `getSearchParameter()` requires `indexDefaultSearchParameters(bundle)` to be called first with the multi-MB SearchParameter bundle; this is not shipped with `@medplum/core`. Use the curated `SEARCH_PARAM_MAP` instead.
- **Don't use `fhirpath` npm package.** It would add ~2.4 MB unpacked + 7 transitive deps (antlr4, ucum-lhc, decimal.js, date-fns, etc.). Medplum's `parseFhirPath` is sufficient.
- **Don't string-concatenate URLs.** Pass criterion values as object props to `client.search` / `client.searchResourcePages` so Medplum's URLSearchParams serializer handles encoding (T-21-05 mitigation, established Phase 21 pattern).
- **Don't try to round-trip FHIRPath cohorts through FDPG.** D-06 explicitly forbids this. Disable the Export button on FHIRPath-containing cohorts; show tooltip explaining why.
- **Don't auto-import partial FDPG cohorts.** D-06 says "Partial import is NOT offered." Reject with a red Alert listing every unsupported feature found.
- **Don't introduce a new `/quality/cohorts/[id]` route for Edit.** D-09 says inline menus + modal. Adding a route would require router changes and break the single-page management contract.
- **Don't use a native `<Modal title=>` for the Edit modal.** The Phase 21 Save modal pattern (in-body heading, Discard / Save buttons) preserves the UI-SPEC §Typography 4-font-size budget.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FHIRPath parsing | A regex parser for `Resource.where(...)` | `parseFhirPath` from `@medplum/core` | The Medplum AST gives typed, named atom classes (`EqualsAtom`, `NotEqualsAtom`, `ArithemticOperatorAtom`, `LiteralAtom`) with stable `.left` / `.right` / `.value` fields. Hand-rolling regex would re-implement FHIRPath quoting (`'…'` strings vs `@…` dates), operator precedence, and dotted paths — all already correct in Medplum's parser. Date literals `@1960-01-01` parse cleanly to `{type: 'dateTime', value: '1960-01-01'}`; we'd otherwise have to handle the `@` sigil and date validation by hand. |
| FHIR search URL building | String concatenation `${type}?${field}=${value}` | `client.search(type, { [field]: value })` | Medplum uses `URLSearchParams` internally — handles encoding, special chars, comma-joining, repeated keys. Established Phase 21 pattern (cohortResolver.ts:202 documents the cast pattern). |
| UUID generation | Random string + counter | `crypto.randomUUID()` | Browser-native since 2022; Phase 21 uses it (`useCohorts.ts:87`). |
| Modal management | Custom open/close state | `useDisclosure` from `@mantine/hooks` | Phase 21 pattern (`CohortBuilderForm.tsx:117`). |
| Toast notifications | Custom flash message div | `notifications.show` from `@mantine/notifications` | Phase 21 pattern. Auto-positioning, accessibility, queue management. |
| FHIR R4 search-parameter lookups (advanced) | Hand-typed table for every resource | (don't) — keep our curated table scoped to D-02 | The full FHIR R4 SearchParameter registry is ~1500 entries; for the locked subset we need maybe 25 of them. **Curated > codegen** until the subset expands. |

**Key insight:** This phase is mostly composition over existing tools. The only truly new logic is the FHIRPath-AST → FHIR-search-URL translator (~150 lines) and the FDPG SQ codec (~250 lines). Every other piece is wiring existing Medplum / Mantine / Phase-21 primitives together.

## Runtime State Inventory

> Phase 22 is a feature extension, NOT a rename or migration. No runtime state outside the browser is touched.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage `quality.cohorts.v1` shape extends to include `FhirpathCriterion` in the criteria array. **Schema is forward-compatible** — old cohorts (without fhirpath criteria) still parse correctly. New cohorts with `{type:'fhirpath',...}` won't deserialize on a Phase-21-only build, but Phase 21 is shipped to the same users so no version skew exists. | None — natural extension via discriminated union. |
| Live service config | None — Phase 22 doesn't touch any external service config. | None. |
| OS-registered state | None — purely browser-resident. | None. |
| Secrets/env vars | None — no new auth or config keys. | None. |
| Build artifacts | None — no published package, no installed CLI. | None. |

**Nothing found in any category requiring action.** This is a code-only feature extension.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 20+ | Vite build, vitest | ✓ (assumed; Phase 21 builds work) | — | — |
| `@medplum/core` parseFhirPath | FHIRPath translator | ✓ | 5.1.7 (installed) | — |
| `@medplum/core` MedplumClient | Dry-run search | ✓ | 5.1.7 (installed) | — |
| Blaze server `/$summary=count` support | Dry-run validation | ✓ | [VERIFIED: samply.github.io/blaze/api.html] | If a non-Blaze server doesn't support `_summary=count`, fall back to issuing the full search with `_count=0` and reading `Bundle.total` (most R4 servers populate this). |
| Blaze server `_elements` support | Resolver projection efficiency | ✓ | [VERIFIED: same source] | Without `_elements`, queries return full resources — slower but functionally identical. Already a degradation path Phase 21 silently accepts. |
| `crypto.randomUUID()` | UUID for duplicate cohort | ✓ (browser native, Chromium 92+, Firefox 95+, Safari 15.4+) | — | If somehow missing, fall back to `Math.random().toString(36)` — already established Phase 21 fallback would not be needed in target environments. |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None blocking — Blaze fallbacks are graceful degradations, not blockers.

## Common Pitfalls

### Pitfall 1: AST atom `instanceof` checks across module boundaries

**What goes wrong:** `op instanceof EqualsAtom` returns `false` even though the parser produced an EqualsAtom — because the imported class identity differs from the runtime class identity (e.g. duplicate `@medplum/core` in node_modules due to peer-dep mismatch).

**Why it happens:** ESM dual-package hazard: `@medplum/core` exports both ESM (`dist/esm/index.mjs`) and CJS (`dist/cjs/index.cjs`); if Vite bundles ESM but a test runner pulls CJS, the atom classes are duplicated and `instanceof` fails.

**How to avoid:**
- Test the translator with `vitest` using the same module-resolution rules as Vite (already configured in `vite.config.ts` / `vitest.config.ts`).
- If `instanceof` ever fails in CI but passes locally, fall back to `op.constructor.name === 'EqualsAtom'` — but the names get mangled in production builds (we observed `Mt` for EqualsAtom in the bundled .mjs), so the `instanceof` path is preferable.
- Verify by running one parse-test in the actual browser environment during Phase 22 plan validation.

**Warning signs:** Translator throws "Unsupported clause type: undefined" or "Unsupported clause type: Mt" instead of recognizing EqualsAtom.

### Pitfall 2: FHIRPath `=` is NOT FHIR search `=`

**What goes wrong:** A FHIRPath `=` on a token field naively translates to `?param=value`, but FHIR search tokens have system+code semantics. `Condition.where(code = '44054006')` → `?code=44054006` matches any system; the user might expect SNOMED-only.

**Why it happens:** FHIRPath compares against typed values; FHIR search `token` semantics use the pipe form `system|code` for system-scoped matching.

**How to avoid:** Document this in the FHIRPath card's helper text: "Field-only matching (no system). Use `code.coding.code` for the code component; system filtering is implicit via the connected server's data model. For system-scoped matching, use the Condition code criterion above."

**Warning signs:** User reports "my Condition cohort returns more patients than expected." Mitigation: the dry-run count will reflect this; user can refine via the interactive Condition code criterion.

### Pitfall 3: `_summary=count` may be slow or async on Blaze

**What goes wrong:** Validate button hangs for 30s+ on a complex query.

**Why it happens:** Blaze documents that `_summary=count` queries can exceed HTTP timeout for large indices and supports `Prefer: respond-async` for those cases.

**How to avoid:**
- Wrap the dry-run in a 10-second `AbortController` timeout. On timeout, surface "Validation timed out — your expression may be valid but the server can't count results quickly. Try Save anyway, or refine the criterion."
- Don't add `Prefer: respond-async` for D-03 — async polling would complicate the validation UX significantly. Phase 22 stays synchronous; Phase 23 can add async if needed.

**Warning signs:** Validate button shows spinner indefinitely; Network tab shows pending request.

### Pitfall 4: FDPG SQ `inclusionCriteria` is `Criterion[][]` not `Criterion[]`

**What goes wrong:** Codec serializes a flat array of criteria, breaking spec compliance.

**Why it happens:** The outer array represents AND groups; the inner array represents OR groups within an AND. Phase 21 only supports AND-composition, so each Phase-21 criterion becomes its own outer-array entry containing a single-element inner array.

**How to avoid:** Always wrap criteria as `[[criterion]]` for export — outer = AND, inner = single-OR. Verify with the canonical Flare example ([VERIFIED: github.com/medizininformatik-initiative/flare/blob/main/docs/api.md]).

**Warning signs:** Test fixture output reads `inclusionCriteria: [{...}]` instead of `[[{...}]]`; FDPG portal rejects the import.

### Pitfall 5: Edit modal stale-form state

**What goes wrong:** User opens Edit on cohort A, closes modal without saving, opens Edit on cohort B — form still shows cohort A's values.

**Why it happens:** `CohortBuilderForm` uses `useState` initializers (which only run on mount). If the modal mounts the form once and just toggles visibility, the form state doesn't reset.

**How to avoid:** Use Mantine's `<Modal opened={open} onClose={onClose}>` with `keepMounted={false}` (the default) so the form unmounts on close. OR pass the cohort as a `key` prop to force remount when switching cohorts. Established pattern: pass `key={cohort.id}` to the form.

**Warning signs:** QA report "I edited cohort B and got cohort A's name in the field."

### Pitfall 6: `quality.cohorts.v1` shape forward-compatibility

**What goes wrong:** A user on a Phase 21 build saves cohorts; we ship Phase 22, they reload — `FhirpathCriterion` discriminant `'fhirpath'` doesn't exist in the Phase 21 union, so TypeScript narrowing in the resolver fails.

**Why it happens:** Discriminated union widening only works if all consumers know about all variants.

**How to avoid:** This is moot — Phase 22 ADDS the variant, and any code that switches on `c.type` MUST handle the new branch. The Phase 21 cohortResolver fallback (line 165: `else { /* condition-code */ }`) currently treats any unknown type as condition-code, which would break for fhirpath. **Fix during Phase 22 plan:** convert the if-else chain to explicit type checks (`if (c.type === 'date-range') ... else if (c.type === 'condition-code') ... else if (c.type === 'fhirpath') ... else assertNever(c)`).

**Warning signs:** Resolver throws "system.split is undefined" on a Patient cohort because it tried to read `c.system` on a fhirpath criterion.

### Pitfall 7: `parseFhirPath` accepts unsupported expressions silently

**What goes wrong:** User types `Patient.where(birthDate < @1960-01-01 and gender = 'female')`, parser succeeds, validator never sees the `and` clause until late.

**Why it happens:** The parser is a generic FHIRPath parser; it accepts everything in the FHIRPath spec. Our translator is the gatekeeper for the D-02 subset.

**How to avoid:** The translator MUST inspect the AST shape strictly: top must be FhirPathAtom → DotAtom(Symbol, FunctionAtom('where', [singleArg])); singleArg must be one of EqualsAtom / NotEqualsAtom / ArithemticOperatorAtom; rejecting `AndAtom`, `OrAtom`, nested `FunctionAtom`, etc. with precise error messages pointing at the unsupported syntax. Code sketch in Pattern 1 above implements this.

**Warning signs:** Validate succeeds but resolver returns empty/wrong results.

## Code Examples

Verified parses against Medplum's runtime (executed via `node --experimental-vm-modules` against installed `@medplum/core@5.1.7`):

### Example 1: Patient.where(birthDate < @1960-01-01)

```
Top:    FhirPathAtom { original: "Patient.where(birthDate < @1960-01-01)" }
child:  DotAtom
  left:  SymbolAtom { name: "Patient" }
  right: FunctionAtom { name: "where", args: [...] }
    args[0]: ArithemticOperatorAtom { operator: "<" }
      left:  SymbolAtom { name: "birthDate" }
      right: LiteralAtom { value: { type: "dateTime", value: "1960-01-01" } }
```
Translates to: `Patient?birthdate=lt1960-01-01&_elements=id&_count=10000`

### Example 2: Patient.where(gender = 'female')

```
op:    EqualsAtom
left:  SymbolAtom { name: "gender" }
right: LiteralAtom { value: { type: "string", value: "female" } }
```
Translates to: `Patient?gender=female&_elements=id&_count=10000`

### Example 3: Condition.where(code.coding.code = '44054006')

```
op:    EqualsAtom
left:  DotAtom (code.coding.code)
       atomToPath() returns "code.coding.code"
right: LiteralAtom { value: { type: "string", value: "44054006" } }
```
Translates to: `Condition?code=44054006&_elements=subject&_count=10000`

### Example 4: FDPG SQ minimal valid export

```json
{
  "version": "https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema",
  "display": "Diabetic adults 2024",
  "inclusionCriteria": [
    [
      {
        "termCodes": [
          { "code": "44054006", "system": "http://snomed.info/sct", "display": "" }
        ],
        "context": {
          "code": "Diagnose",
          "system": "fdpg.mii.cds",
          "version": "1.0.0",
          "display": "Diagnose"
        }
      }
    ],
    [
      {
        "termCodes": [
          {
            "code": "IMP",
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "display": "inpatient encounter"
          }
        ],
        "context": {
          "code": "Fall",
          "system": "fdpg.mii.cds",
          "version": "1.0.0",
          "display": "Fall"
        },
        "timeRestriction": {
          "afterDate": "2024-01-01",
          "beforeDate": "2024-12-31"
        }
      }
    ]
  ],
  "exclusionCriteria": []
}
```

[CITED: github.com/medizininformatik-initiative/flare/blob/main/docs/api.md, github.com/medizininformatik-initiative/sq2cql test fixtures]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Use `fhirpath` npm package for AST parsing in the browser | Use `parseFhirPath` from `@medplum/core` (already installed) | 5.x of @medplum/core stabilized FHIRPath atom exports | Saves 2.4 MB unpacked + 7 transitive deps |
| FDPG SQ format v1 (`http://to_be_decided.com/draft-1/schema#`) | FDPG SQ format v3 (`https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema`) | v3 became the canonical format used by FDPG Central Search; v1 was a draft schema referenced in early `sq2cql` test fixtures | Use v3 in our exports; on import, accept both v1 and v3 to maximize compatibility with older test data, but warn on v1 |
| Hand-rolled `<Menu>` from divs and useDisclosure | `<Menu>` + `<Menu.Target>` + `<Menu.Dropdown>` + `<Menu.Item>` from `@mantine/core` | Mantine 7+ stabilized this API; we use 8.3.18 | Established pattern in `SearchResultsPage.tsx:343` |

**Deprecated/outdated:**
- FDPG SQ v1 schema URL (`http://to_be_decided.com/draft-1/schema#`) — still appears in older sq2cql test fixtures but not the canonical version for current FDPG infrastructure. We accept it on import (warning) and never emit it on export.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` (project root, established Phase 21) |
| Quick run command | `npm test` (runs all suites) |
| Targeted run command | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "translates Patient.where"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **CHRT-05** | `parseFhirPath` returns expected AST for the 3 D-02 example expressions | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "parses Patient birthDate"` | ❌ Wave 0 |
| CHRT-05 | Translator rejects `and`/`or` composition with precise error | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "rejects and composition"` | ❌ Wave 0 |
| CHRT-05 | Translator rejects `exists()` / unsupported functions | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "rejects exists()"` | ❌ Wave 0 |
| CHRT-05 | Translator rejects unmapped fields with helpful error | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "rejects unmapped field"` | ❌ Wave 0 |
| CHRT-05 | Operator-prefix mapping produces correct FHIR search URL | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "translates operator prefixes"` | ❌ Wave 0 |
| CHRT-05 | Dry-run count handler invokes `client.search` with `_count=0&_summary=count` | unit (mock client) | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "dry-run count"` | ❌ Wave 0 |
| CHRT-05 | `cohortResolver` resolves a fhirpath criterion via the translator | unit | `npx vitest run src/quality/cohortResolver.test.ts -t "resolves fhirpath criterion"` | partial — extend existing |
| CHRT-05 | FhirpathCriterionCard renders Validate button, shows match count on success | component (RTL) | `npx vitest run src/components/quality/FhirpathCriterionCard.test.tsx` | ❌ Wave 0 |
| **CHRT-06** | Codec round-trip: CohortDefinition with date-range + condition-code → SQ JSON → CohortDefinition | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "round-trips date-range + condition-code"` | ❌ Wave 0 |
| CHRT-06 | Export rejects FHIRPath-containing cohort with clear error | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "rejects export of fhirpath"` | ❌ Wave 0 |
| CHRT-06 | Import rejects SQ with `attributeFilters` / `exclusionCriteria` | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "rejects unsupported SQ features"` | ❌ Wave 0 |
| CHRT-06 | Import rejects SQ with reference-list (no SQ equivalent) | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "warns on reference-list export"` | ❌ Wave 0 |
| CHRT-06 | Codec emits version `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema` | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "emits v3 schema URL"` | ❌ Wave 0 |
| CHRT-06 | CohortsPage Import button reads file via `<input type=file>` and calls codec | component (RTL) | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "imports FDPG file"` | ❌ Wave 0 |
| **CHRT-07** | `useCohorts.updateCohort(id, patch)` bumps `updatedAt`, persists | unit | `npx vitest run src/hooks/useCohorts.test.tsx -t "updateCohort bumps updatedAt"` | ❌ Wave 0 |
| CHRT-07 | `useCohorts.deleteCohort(id)` removes from cohorts; clears activeCohortId if matching | unit | `npx vitest run src/hooks/useCohorts.test.tsx -t "deleteCohort clears active"` | ❌ Wave 0 |
| CHRT-07 | `useCohorts.duplicateCohort(id)` creates copy with new UUID + name "(copy)" | unit | `npx vitest run src/hooks/useCohorts.test.tsx -t "duplicateCohort"` | ❌ Wave 0 |
| CHRT-07 | SavedCohortRow renders ActionIcon + Menu with Edit/Duplicate/Delete | component (RTL) | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "row menu"` | ❌ Wave 0 |
| CHRT-07 | Edit modal pre-fills form with cohort criteria; Save bumps updatedAt | component (RTL) | `npx vitest run src/components/quality/EditCohortModal.test.tsx` | ❌ Wave 0 |
| CHRT-07 | Delete modal confirms before deletion | component (RTL) | `npx vitest run src/components/quality/DeleteCohortModal.test.tsx` | ❌ Wave 0 |
| CHRT-07 | Resolver cache invalidates after Edit (cache key changes) | unit | `npx vitest run src/quality/cohortResolver.test.ts -t "cache invalidates on updatedAt change"` | partial — extend existing |
| CHRT-07 manual UAT | Active cohort edit → dashboard recompute reflects new criteria | manual | (live Blaze server required) | manual-only |
| CHRT-06 manual UAT | Round-trip with FDPG portal: export → import to Central Search → verify match count | manual | (FDPG portal access required) | manual-only |

### Sampling Rate

- **Per task commit:** `npx vitest run src/quality/<changed-file>.test.ts` (specific file under change)
- **Per wave merge:** `npm test` (full suite — current baseline 22 failures; Phase 22 adds new tests but should not regress baseline)
- **Phase gate:** Full suite green (modulo the 22 baseline failures unrelated to cohort code) before `/gsd-verify-work`. Baseline tracking: see Phase 21 SUMMARY commits — `Tests 22 failed | 582 passed | 22 todo`.

### Wave 0 Gaps

- [ ] `src/quality/fhirpathTranslator.test.ts` — covers CHRT-05 (parse, translate, dry-run)
- [ ] `src/quality/fhirpathTranslator.ts` — implementation
- [ ] `src/quality/fdpgCodec.test.ts` — covers CHRT-06 round-trip + reject paths
- [ ] `src/quality/fdpgCodec.ts` — implementation
- [ ] `src/quality/fdpgTypes.ts` — TypeScript interfaces for v3 SQ
- [ ] `src/components/quality/FhirpathCriterionCard.tsx` + test
- [ ] `src/components/quality/EditCohortModal.tsx` + test
- [ ] `src/components/quality/DeleteCohortModal.tsx` + test
- [ ] Extend `src/hooks/useCohorts.test.tsx` for `updateCohort`, `deleteCohort`, `duplicateCohort`
- [ ] Extend `src/quality/cohortResolver.test.ts` for `fhirpath` branch + cache invalidation on updatedAt change
- [ ] Extend `src/components/quality/CohortBuilderForm.tsx` test for Edit-mode prop
- [ ] Extend `src/components/quality/CohortsPage.tsx` test for row menu + Import/Export buttons
- [ ] Framework install: not needed — vitest 4.1.4 already present

## Cohort Resolver Integration (per the requested confirmation)

**Confirmed by reading `src/quality/cohortResolver.ts`:**

- The `resolveCriterion` function (lines 139-171) is currently an `if/else if` chain on `c.type === 'reference-list'` (line 143), `c.type === 'date-range'` (line 153), with an implicit else for `'condition-code'` (line 165). **Adding a `'fhirpath'` branch requires inserting after line 145** (or refactoring to an explicit `if/else if/else if/else if` cascade for type-narrowing safety).
- The resolver cache (line 62) keys on `cohort.id` and stores `{ updatedAt, ids }` — `resolveCohort` (line 87) compares `cached.updatedAt === cohort.updatedAt` before returning cached IDs. **D-10's edit-while-active behavior already works without code changes** as long as `useCohorts.updateCohort` bumps `updatedAt`.
- The existing `collectSubjectPatientIds` helper (lines 188-236) handles paginated subject extraction with the 10K cap (T-21-02). The `fhirpath` branch can reuse this for non-Patient resource types; for Patient resources it needs a sibling `collectIdField` helper that reads `r.id` instead of `r.subject.reference`.
- `clearCohortResolutionCache` (line 65) is called from `QualityOverviewPage.tsx` on `client` change (Plan 21-06 wiring). Phase 22 doesn't touch this.

**Line ranges that need editing:**
- `src/quality/cohortResolver.ts:139-171` — extend `resolveCriterion` switch
- `src/quality/cohortResolver.ts:188-236` — add sibling `collectIdField` (or refactor `collectSubjectPatientIds` to be projection-aware)
- `src/quality/cohorts.ts:56-59` — extend `CohortCriterion` union with `FhirpathCriterion`
- `src/hooks/useCohorts.ts:50-67` — extend `UseCohortsApi` interface; add `updateCohort`, `deleteCohort`, `duplicateCohort` methods (the api previously only exposed `addCohort` + `activateCohort`)

## Security Domain

> `security_enforcement` is not explicitly disabled; treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local SPA, no user accounts. |
| V3 Session Management | no | Browser session = localStorage; no server session. |
| V4 Access Control | no | Single-user local tool. |
| V5 Input Validation | **yes** | FHIRPath input (Textarea) — translator MUST reject unsupported syntax with precise errors. FDPG SQ JSON import — codec MUST validate shape before processing. Both are user-provided strings being parsed; both have hard rejection contracts. |
| V6 Cryptography | no | No new crypto operations; reuses `crypto.randomUUID()`. |

### Known Threat Patterns for FHIRPath + FDPG codec

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **FHIRPath injection in URL** (user types `'); DROP --` style payload) | Tampering | Pass criterion values as object props to `client.search(type, params)` — Medplum URL-encodes via `URLSearchParams`. **Never string-concatenate the URL.** Verified Phase 21 pattern. |
| **JSON deserialization of malicious FDPG file** (prototype pollution via `__proto__`) | Tampering | `JSON.parse` is safe by default in modern V8; do not use `Object.assign(target, parsed)` — assign field-by-field after type-narrowing. Hand-written validator should explicitly check each known field and ignore unknown ones. |
| **Quota exhaustion via huge FDPG file import** | DoS | Hard cap inbound file at 1 MB (`<input type=file>` + `file.size` check). Reject files larger than cap with red Alert before parsing. |
| **Quota exhaustion via large FHIRPath expression** | DoS | Textarea `maxLength={4096}` per D-08. Translator returns error if expression length exceeds cap. |
| **PHI leak via PDF/snapshot of FHIRPath cohort name** | Information Disclosure | FHIRPath cohorts are stored exactly like other cohorts; the existing T-21-03 mitigations (cohort names are user-provided plain text; resolver returns ID counts only, no IDs in toasts/snapshots) apply unchanged. |
| **Stale cache after Edit** | Tampering / data-integrity | `updatedAt` bump invalidates cache (D-10). Verified working in Phase 21 cohortResolver:88. |
| **FHIRPath that resolves to ALL patients** (e.g. `Patient.where(active = true)` in a system where everyone is active) | DoS (downstream) | The 10K cap (`MAX_IDS_PER_CRITERION`) in cohortResolver.ts:47 already bounds the result set. Truncation Alert pattern from Phase 21 reused. |
| **CSV-injection-style payload in cohort name during PDF export** | Tampering | Phase 21 already renders cohort names through React text nodes (Mantine auto-escapes); Phase 22 adds no new render paths for cohort names. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Medplum's FHIRPath atom class names (`EqualsAtom`, `NotEqualsAtom`, `ArithemticOperatorAtom`) remain stable across 5.x patch versions | Pattern 1 | Low — the names are public API per the .d.ts exports; a rename in 5.x would be a breaking change. If 6.x renames them, the translator code needs a small refactor. **VERIFIED** at 5.1.7 against installed module; mitigation: pin `@medplum/core` to `^5.1.7` (already done). |
| A2 | Blaze populates `Bundle.total` reliably for `_summary=count` queries | Pattern 3, Validation Architecture | Medium — confirmed in [VERIFIED: samply.github.io/blaze/api.html] for normal queries. Risk: complex queries fall through to async response (HTTP 202 + `Content-Location` header instead of inline Bundle). Mitigation: timeout the validation request after 10s and surface a "validation timed out" message. |
| A3 | The MII Codex SQ v3 schema is stable; `inclusionCriteria` is `Criterion[][]` and not changing | Pattern 5 | Low — the v3 format has been canonical since at least 2024 per flare's docs and feasibility-gui's models. Schema URL is hardcoded in current FDPG production. |
| A4 | Encounter date-range cohorts should map to FDPG SQ `Fall` context with `IMP` (inpatient) termCode | Pattern 5 | **Medium — needs user confirmation** — D-05 of Phase 21 chose `Encounter.period` semantics for date-range, but doesn't specify Encounter class. Most MII KDS Encounter data IS inpatient (the `Fall` module is primarily inpatient encounters), so `IMP` is the safer default. Alternative: emit no termCode and rely on `context.code === 'Fall'` alone — but this may not pass FDPG SQ validation. **Recommend asking user during plan check whether to default to IMP or omit termCode.** |
| A5 | The `feasibility-gui` TypeScript model classes are an accurate reflection of the JSON schema (i.e. the schema doesn't have additional required fields not in the model) | Pattern 5, fdpgTypes.ts | Low — the models are used by FDPG portal frontend in production; if they were wrong, FDPG queries would not validate. But the model uses Java-style getters/setters; we read the field names off the private members. |
| A6 | `vitest`'s module resolution matches Vite's, so `instanceof EqualsAtom` works in tests | Pitfall 1 | Low — vitest uses Vite's resolver by default per vitest 4.x. **VERIFIED** — Phase 21's resolver tests pass without `instanceof` issues. |
| A7 | A 1MB inbound FDPG file size cap is sufficient for real-world cohort exports | Security Domain | Low — typical FDPG SQ exports are < 50 KB. A 1MB cap leaves wide margin while preventing trivial DoS. |

**Items needing user confirmation in plan-check:** A4 (Encounter→Fall mapping default).

## Open Questions (RESOLVED)

1. **Should the FHIRPath card surface the curated `SEARCH_PARAM_MAP` to the user as supported-fields documentation?**
   - What we know: The map is hand-curated; users will hit "Field X has no FHIR search parameter mapping" errors when they try unsupported fields.
   - What's unclear: Whether to render a `<Collapse>`-d helper section listing every supported (resourceType, field) pair, or just rely on the error message.
   - Recommendation: Helper section listing the 4 primary resource types (Patient, Condition, Observation, Encounter) and 3-5 example expressions per. Avoids re-querying the map at error time.
   - **RESOLVED:** Helper `<Collapse>` section listing 4 primary resource types (Patient, Condition, Observation, Encounter) with 2-3 `<Code>`-rendered example expressions each — per the UI-SPEC §S1 Copywriting Contract (12 examples total). The user does not see the raw `SEARCH_PARAM_MAP`; unsupported-field errors rely on the translator's verbatim `'Field "{field}" on {resourceType} has no FHIR search parameter mapping. Supported fields: {list}.'` message (UI-SPEC §S7 translator error catalog).

2. **For inbound FDPG SQ files, what behavior on mixed inclusion + exclusion criteria?**
   - What we know: D-06 says "Unsupported SQ features (exclusion criteria, OR groups, time-windows the translator doesn't recognize) cause the import to fail with a red Alert."
   - What's unclear: Whether "exclusion criteria" means non-empty `exclusionCriteria` (array length > 0) — and whether an empty `exclusionCriteria: []` should pass through silently.
   - Recommendation: Reject when `exclusionCriteria.some(group => group.length > 0)`; allow empty array (Flare emits `exclusionCriteria: []` for inclusion-only queries).
   - **RESOLVED:** Reject import when `exclusionCriteria.some(group => group.length > 0)`; allow empty array (`exclusionCriteria: []` or omitted field entirely) to pass through silently. Rationale: Flare emits `exclusionCriteria: []` for inclusion-only queries, so treating the empty-array case as rejection would block round-tripping the most common FDPG export shape. Codec error message when non-empty: `'Exclusion criteria are not yet supported.'` (UI-SPEC §S6 codec error catalog, already locked verbatim).

3. **Should `duplicateCohort` deactivate the original cohort if it was active?**
   - What we know: D-09 says Duplicate "inserts a new cohort with `name: '<original> (copy)'`, fresh UUID, fresh timestamps, same criteria."
   - What's unclear: Whether the duplicated cohort should auto-activate (probably not — user just wants a copy to edit).
   - Recommendation: No auto-activation; original cohort stays active. User can switch via the dashboard `ActiveCohortSelect` if desired.
   - **RESOLVED:** Duplicating a cohort creates the new copy but does NOT auto-activate it. `activeCohortId` is left untouched. The user sees the new row in the saved-cohorts list and can activate it explicitly via the existing activate UI if desired. **Why:** Matches the implicit contract of duplicate actions across Mantine-style management UIs (new row appears but focus stays where the user is). Prevents surprising dashboard recomputes triggered by a duplicate click. Consistent with Phase 21's explicit-activation model (activation is always a deliberate user action, never a side-effect of another write). Recorded as D-11 in 22-CONTEXT.md.

## Sources

### Primary (HIGH confidence)
- **`@medplum/core` 5.1.7 typings** — `node_modules/@medplum/core/dist/esm/index.d.ts` for `parseFhirPath`, atom class signatures, `getSearchParameter`. [VERIFIED: file inspection]
- **Live runtime AST verification** — `node --experimental-vm-modules` against installed `@medplum/core@5.1.7` confirmed AST shape for the 3 D-02 example expressions and rejection paths.
- **Phase 21 source code** — `src/quality/cohortResolver.ts`, `src/quality/cohorts.ts`, `src/components/quality/CohortBuilderForm.tsx`, `src/components/quality/CohortsPage.tsx`, `src/hooks/useCohorts.ts` [VERIFIED: file inspection].
- **MII Flare API docs** — [github.com/medizininformatik-initiative/flare/blob/main/docs/api.md](https://github.com/medizininformatik-initiative/flare/blob/main/docs/api.md) — canonical FDPG SQ v3 examples (inclusion + exclusion criteria, time restriction, value filter, context).
- **MII feasibility-gui TypeScript models** — [github.com/medizininformatik-initiative/feasibility-gui/tree/main/src/app/model/StructuredQuery](https://github.com/medizininformatik-initiative/feasibility-gui/tree/main/src/app/model/StructuredQuery) — authoritative TypeScript reference for SQ shape (StructuredQuery.ts, StructuredQueryCriterion.ts, BetweenFilter.ts).
- **MII sq2cql test fixtures** — [github.com/medizininformatik-initiative/sq2cql/tree/main/src/test/resources/de/numcodex/sq2cql](https://github.com/medizininformatik-initiative/sq2cql/tree/main/src/test/resources/de/numcodex/sq2cql) — full SQ JSON examples (`example-all-crits-time.json`, `EncounterInpatientEinrichtungTimeRestriction.json`).
- **Blaze API docs** — [samply.github.io/blaze/api.html](https://samply.github.io/blaze/api.html) — `_summary=count` and `_elements` support confirmation, async response pattern.
- **FHIR R4 Search spec** — [hl7.org/fhir/R4/search.html](https://hl7.org/fhir/R4/search.html), [hl7.org/fhir/R4/searchparameter-registry.html](https://hl7.org/fhir/R4/searchparameter-registry.html) — operator-prefix semantics (`lt`/`le`/`gt`/`ge`/`ne`/no-prefix), search parameter types (token/date/string/reference/quantity).

### Secondary (MEDIUM confidence)
- **npm registry: `fhirpath@4.9.3`** — published 2026-04-10, license "SEE LICENSE in LICENSE.md" (custom; HL7 docs say BSD-3 derivative), 2.4 MB unpacked. [VERIFIED: `npm view fhirpath`]
- **npm registry: `ajv@8.18.0`** — MIT, 1 MB unpacked. [VERIFIED: `npm view ajv@latest`]
- **Mantine 8 Menu docs** — [mantine.dev/core/menu/](https://mantine.dev/core/menu/) — pattern for `Menu.Target` / `Menu.Dropdown` / `Menu.Item` (cross-verified by codebase usage in `SearchResultsPage.tsx:343-369`).

### Tertiary (LOW confidence — flagged for verification during planning)
- The exact set of MII Codex `context.code` values (we know `Fall`, `Diagnose`, `Patient`, `Specimen`; full list lives in MII KDS modules). For Phase 22 we only handle `Fall` and `Diagnose`; if a user imports an SQ file with `Laboruntersuchung` or `Medikation` context, our codec rejects (per D-06). **Plan should confirm we only need to map our 3 export criteria types, not every possible MII context.**

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every package is verified-installed; no new deps; AST shape verified by live runtime parse.
- Architecture (translator + codec): **HIGH** — code sketches compile against the verified AST; mapping table cross-referenced with FHIR R4 spec.
- Pitfalls: **MEDIUM** — Pitfall 1 (instanceof across module boundaries) is theoretical; needs to be tested in actual phase execution. Others are concrete.
- FDPG SQ format: **HIGH** for v3 schema URL and basic shape (verified across Flare docs + feasibility-gui models + sq2cql fixtures); **MEDIUM** for the exact `context.code` value to use for Encounter date-range cohorts (assumption A4).
- Security: **HIGH** — known patterns reused from Phase 21 mitigations; no new attack surfaces beyond input validation.

**Research date:** 2026-04-16
**Valid until:** 2026-07-16 (~3 months) — Medplum 5.x and MII SQ v3 are both stable. Re-verify if `@medplum/core` ships 6.x or FDPG publishes SQ v4.
