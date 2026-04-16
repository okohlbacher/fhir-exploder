/**
 * FHIRPath translator — Plan 22-01 Task 1 (CHRT-05).
 *
 * Pure-logic module that parses the D-02 locked FHIRPath subset
 * (`<Resource>.where(<fieldPath> <op> <literal>)`) via Medplum's
 * `parseFhirPath` AST, translates it to a structured `TranslatedQuery`,
 * and emits a FHIR R4 search URL via a hand-curated `SEARCH_PARAM_MAP`.
 *
 * Design constraints (from 22-CONTEXT.md + 22-RESEARCH.md §Pattern 1/2/3):
 *   - D-02 subset only: composition (`and`/`or`), nested `where()`,
 *     `exists()`, and non-literal RHS are all hard errors.
 *   - `SEARCH_PARAM_MAP` is hand-curated rather than derived from FHIR R4
 *     SearchParameter bundle (multi-MB, not shipped with @medplum/core).
 *     Extending the map is a code change, not a data change.
 *   - `dryRunCount` MUST call `client.search(resourceType, params)` — never
 *     hand-build a URL — so Medplum's URLSearchParams serializer handles
 *     encoding. This is the T-22-02 mitigation (matches Phase 21's T-21-05
 *     object-param pattern).
 *
 * Threat mitigations (see 22-PLAN.md §threat_model):
 *   - T-22-01 (Tampering / Input Validation): strict AST shape whitelist.
 *     12 locked error strings (see 22-UI-SPEC.md §S7 Translator error
 *     catalog) cover every reject branch.
 *   - T-22-02 (Injection): never string-concatenate search URLs in
 *     `dryRunCount`; always pass params object to `client.search(...)`.
 *
 * Pitfalls mitigated:
 *   - Pitfall 1 (instanceof across module boundaries): single
 *     `@medplum/core` import at the top of this file means Vite/vitest's
 *     resolver uses one module identity for every atom class. No cross-
 *     bundle instanceof failures.
 *   - Pitfall 7 (silent accept): every AST branch that isn't an explicit
 *     whitelist match throws `TranslationError` with a precise message.
 *
 * NOT in this module:
 *   - React/Mantine UI (lives in Plan 22-03 `FhirpathCriterionCard`).
 *   - Cohort resolver integration (lives in Task 3 of this plan).
 */
import {
  AndAtom,
  ArithemticOperatorAtom,
  DotAtom,
  EqualsAtom,
  FunctionAtom,
  LiteralAtom,
  NotEqualsAtom,
  OrAtom,
  SymbolAtom,
  parseFhirPath,
  type MedplumClient,
} from '@medplum/core';

// -----------------------------------------------------------------------------
// Public types + error class
// -----------------------------------------------------------------------------

/**
 * Thrown for every parse / translate / map failure. Subclass of `Error` so
 * callers can `catch (e) { if (e instanceof TranslationError) ... }` and
 * surface `e.message` verbatim to the UI result row (see 22-UI-SPEC.md §S7).
 */
export class TranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationError';
  }
}

/**
 * Structured output of `translateFhirpath`. Intentionally flat so the UI
 * can render "you matched on <fieldPath> <operator> <literal.value>" and
 * the resolver can look up a SEARCH_PARAM_MAP entry without re-parsing.
 */
export interface TranslatedQuery {
  resourceType: string;
  fieldPath: string;
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=';
  literal: {
    kind: 'date' | 'string' | 'integer' | 'decimal' | 'boolean';
    value: string | number | boolean;
  };
}

/**
 * FHIRPath-operator → FHIR-search-prefix table. Derived from
 * HL7 FHIR R4 §3.1.1.5.1 "Prefixes". Note: `=` is the *absence* of a
 * prefix — the value is compared by equality/substring depending on the
 * search-param type.
 */
export const PREFIX_FOR_OPERATOR: Record<TranslatedQuery['operator'], string> =
  {
    '=': '',
    '!=': 'ne',
    '<': 'lt',
    '<=': 'le',
    '>': 'gt',
    '>=': 'ge',
  };

/**
 * Curated lookup from `(resourceType, fieldPath)` → FHIR search parameter
 * metadata. `elements` controls the `_elements` projection in the
 * resolver: `id` for Patient-rooted searches (the result IS the Patient);
 * `subject` for Encounter/Condition/Observation (we extract
 * `subject.reference`).
 */
export interface SearchParamEntry {
  searchParam: string;
  paramType: 'date' | 'token' | 'string' | 'reference' | 'number' | 'quantity';
  elements: 'id' | 'subject';
}

export const SEARCH_PARAM_MAP: Record<string, Record<string, SearchParamEntry>> =
  {
    Patient: {
      birthDate: {
        searchParam: 'birthdate',
        paramType: 'date',
        elements: 'id',
      },
      gender: { searchParam: 'gender', paramType: 'token', elements: 'id' },
      'name.family': {
        searchParam: 'family',
        paramType: 'string',
        elements: 'id',
      },
      'name.given': {
        searchParam: 'given',
        paramType: 'string',
        elements: 'id',
      },
      deceased: { searchParam: 'deceased', paramType: 'token', elements: 'id' },
      active: { searchParam: 'active', paramType: 'token', elements: 'id' },
    },
    Condition: {
      'code.coding.code': {
        searchParam: 'code',
        paramType: 'token',
        elements: 'subject',
      },
      code: {
        searchParam: 'code',
        paramType: 'token',
        elements: 'subject',
      },
      'subject.reference': {
        searchParam: 'patient',
        paramType: 'reference',
        elements: 'subject',
      },
      recordedDate: {
        searchParam: 'recorded-date',
        paramType: 'date',
        elements: 'subject',
      },
      'clinicalStatus.coding.code': {
        searchParam: 'clinical-status',
        paramType: 'token',
        elements: 'subject',
      },
    },
    Observation: {
      'code.coding.code': {
        searchParam: 'code',
        paramType: 'token',
        elements: 'subject',
      },
      code: {
        searchParam: 'code',
        paramType: 'token',
        elements: 'subject',
      },
      effectiveDateTime: {
        searchParam: 'date',
        paramType: 'date',
        elements: 'subject',
      },
      'subject.reference': {
        searchParam: 'patient',
        paramType: 'reference',
        elements: 'subject',
      },
      'valueQuantity.value': {
        searchParam: 'value-quantity',
        paramType: 'quantity',
        elements: 'subject',
      },
    },
    Encounter: {
      'period.start': {
        searchParam: 'date',
        paramType: 'date',
        elements: 'subject',
      },
      'period.end': {
        searchParam: 'date',
        paramType: 'date',
        elements: 'subject',
      },
      'subject.reference': {
        searchParam: 'patient',
        paramType: 'reference',
        elements: 'subject',
      },
      'class.code': {
        searchParam: 'class',
        paramType: 'token',
        elements: 'subject',
      },
      status: { searchParam: 'status', paramType: 'token', elements: 'subject' },
    },
  };

// -----------------------------------------------------------------------------
// AST traversal helpers
// -----------------------------------------------------------------------------

/**
 * Flatten a `DotAtom` / `SymbolAtom` chain into a dotted field path.
 *
 * - `SymbolAtom('birthDate')` → `"birthDate"`
 * - `DotAtom(DotAtom(SymbolAtom('code'), SymbolAtom('coding')), SymbolAtom('code'))`
 *   → `"code.coding.code"`
 *
 * Any other atom class (`FunctionAtom`, `LiteralAtom`, `IndexerAtom` …)
 * throws `TranslationError` — the D-02 subset does not permit nested
 * function calls or computed paths on the LHS of a comparison.
 */
function atomToPath(atom: unknown): string {
  if (atom instanceof SymbolAtom) return atom.name;
  if (atom instanceof DotAtom) {
    return `${atomToPath(atom.left)}.${atomToPath(atom.right)}`;
  }
  const className = (atom as { constructor?: { name?: string } } | null)
    ?.constructor?.name ?? 'unknown';
  throw new TranslationError(
    `Unsupported left-hand side: ${className}. Use a top-level field or dotted path (e.g. code.coding.code).`,
  );
}

/**
 * Map a `LiteralAtom`'s `TypedValue` to the flat `TranslatedQuery['literal']`
 * shape. FHIRPath's string-typed `type` field lists `dateTime`, `date`,
 * `string`, `integer`, `decimal`, `boolean` as the supported primitives for
 * the D-02 subset.
 */
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
      throw new TranslationError(`Unsupported literal type: ${tv.type}.`);
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Parse + validate a FHIRPath expression against the D-02 locked subset.
 *
 * Shape accepted: `<Resource>.where(<fieldPath> <op> <literal>)`.
 *
 * Shapes rejected (each throws a `TranslationError` with a verbatim string
 * from 22-UI-SPEC.md §S7 Translator error catalog):
 *   - Composition: `...where(a = b and c = d)` or `or`
 *   - Non-`where` function: `.first()`, `.skip(1)`, `.exists()`
 *   - `where()` with zero or multiple args
 *   - Unsupported operator inside `where(...)`: `+`, `-`, `*`, `/`, `~`
 *   - Non-literal RHS: `.where(a = b.c)` or `.where(a = otherField)`
 *   - Non-symbol/dot LHS: `.where(a.first() = 'x')`
 *   - Unknown literal type from the parser
 */
export function translateFhirpath(expression: string): TranslatedQuery {
  let root;
  try {
    root = parseFhirPath(expression);
  } catch (e) {
    throw new TranslationError(`Parse error: ${(e as Error).message}`);
  }

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

  if (
    !(child.right instanceof FunctionAtom) ||
    child.right.name !== 'where'
  ) {
    const fname =
      child.right instanceof FunctionAtom
        ? child.right.name
        : (child.right as { constructor?: { name?: string } }).constructor
            ?.name ?? 'unknown';
    throw new TranslationError(`Only .where(...) is supported. Got: ${fname}.`);
  }
  if (child.right.args.length !== 1) {
    throw new TranslationError('where() takes exactly one argument.');
  }

  const op = child.right.args[0];
  // Composition (`and` / `or`) inside `where(...)` is the form users most
  // commonly try to write. Reject with the verbatim string from
  // 22-UI-SPEC.md §S7 so the UI result row reads correctly. Checked BEFORE
  // the generic "Unsupported clause type" branch so the error message is
  // precise about WHY the expression is unsupported.
  if (op instanceof AndAtom || op instanceof OrAtom) {
    throw new TranslationError(
      'Expression must be a single Resource.where(...) call. Composition (and / or) is not supported.',
    );
  }
  let operator: TranslatedQuery['operator'];
  if (op instanceof EqualsAtom) {
    operator = '=';
  } else if (op instanceof NotEqualsAtom) {
    operator = '!=';
  } else if (op instanceof ArithemticOperatorAtom) {
    const o = op.operator;
    if (o === '<' || o === '<=' || o === '>' || o === '>=') {
      operator = o;
    } else {
      throw new TranslationError(
        `Operator ${o} is not supported. Use =, !=, <, <=, >, >=.`,
      );
    }
  } else {
    const className = (op as { constructor?: { name?: string } } | undefined)
      ?.constructor?.name ?? 'unknown';
    throw new TranslationError(
      `Unsupported clause type: ${className}. Use field op literal.`,
    );
  }

  // After narrowing, op has a `.left` + `.right` via the InfixOperatorAtom
  // base class. TypeScript can't see this through the union, so we type the
  // access defensively.
  const infix = op as { left: unknown; right: unknown };
  const fieldPath = atomToPath(infix.left);
  if (!(infix.right instanceof LiteralAtom)) {
    throw new TranslationError('Right-hand side must be a literal value.');
  }
  const literal = literalAtomToLiteral(infix.right);

  return { resourceType, fieldPath, operator, literal };
}

/**
 * Translate a structured `TranslatedQuery` to a FHIR R4 search URL path +
 * query string. The URL is intended for display/logging only — the
 * resolver and dry-run callers use Medplum's `client.search` /
 * `client.searchResourcePages` with a params object (T-22-02 mitigation).
 *
 * Rejects:
 *   - Resource type not in `SEARCH_PARAM_MAP` (D-02 keeps us to 4 types).
 *   - `fieldPath` without a mapped FHIR search parameter.
 *   - Range operator (`<`, `<=`, `>`, `>=`) on a `token`/`string`/`reference`
 *     field — FHIR R4 §3.1.1.5.1 only defines prefixes for `date`,
 *     `number`, and `quantity`.
 */
export function translatedQueryToFhirSearchUrl(q: TranslatedQuery): string {
  const resourceMap = SEARCH_PARAM_MAP[q.resourceType];
  if (!resourceMap) {
    throw new TranslationError(
      `Resource type "${q.resourceType}" is not in the supported translator map. Supported: ${Object.keys(SEARCH_PARAM_MAP).join(', ')}.`,
    );
  }
  const sp = resourceMap[q.fieldPath];
  if (!sp) {
    throw new TranslationError(
      `Field "${q.fieldPath}" on ${q.resourceType} has no FHIR search parameter mapping. Supported fields: ${Object.keys(resourceMap).join(', ')}.`,
    );
  }

  const prefix = PREFIX_FOR_OPERATOR[q.operator];
  const allowsRangePrefix =
    sp.paramType === 'date' ||
    sp.paramType === 'number' ||
    sp.paramType === 'quantity';
  if (
    !allowsRangePrefix &&
    (prefix === 'lt' || prefix === 'le' || prefix === 'gt' || prefix === 'ge')
  ) {
    throw new TranslationError(
      `Operator ${q.operator} is not valid for ${sp.paramType} fields. Use = or !=.`,
    );
  }

  const encoded = encodeURIComponent(`${prefix}${String(q.literal.value)}`);
  return `${q.resourceType}?${sp.searchParam}=${encoded}&_elements=${sp.elements}&_count=10000`;
}

/**
 * Dry-run a translated query against Blaze via `_count=0&_summary=count`.
 * Returns `Bundle.total ?? 0`.
 *
 * T-22-02 mitigation: MUST use `client.search(resourceType, params)` with an
 * object. Never hand-build a URL string — Medplum's URLSearchParams
 * serializer is the sanctioned encoding path.
 */
export async function dryRunCount(
  client: MedplumClient,
  q: TranslatedQuery,
): Promise<number> {
  const sp = SEARCH_PARAM_MAP[q.resourceType]?.[q.fieldPath];
  if (!sp) {
    throw new TranslationError(
      `Field "${q.fieldPath}" on ${q.resourceType} has no FHIR search parameter mapping. Supported fields: ${Object.keys(SEARCH_PARAM_MAP[q.resourceType] ?? {}).join(', ')}.`,
    );
  }
  const value = `${PREFIX_FOR_OPERATOR[q.operator]}${String(q.literal.value)}`;
  const params = {
    [sp.searchParam]: value,
    _count: 0,
    _summary: 'count',
  };
  const bundle = await client.search(
    q.resourceType as never,
    params as never,
  );
  return bundle.total ?? 0;
}
