/**
 * Unified profile conformance checker for Phase 16.
 *
 * Validates resources against MII StructureDefinition profiles in a single
 * pass, checking:
 *   1. Min cardinality (required fields)
 *   2. Max cardinality (array length vs max="1")
 *   3. Type constraints (FHIR JSON type matching)
 *   4. Value set bindings (coded value membership)
 *
 * Replaces the single-purpose structuralValidator for conformance checks.
 * The structural validator remains as a deprecated fallback for
 * OperationOutcomeIssue-shaped output.
 */
import type { Resource, StructureDefinition } from '@medplum/fhirtypes';
import type { NormalizedIssue, IssueSeverity } from './types';
import { isPathPopulated } from './completenessWalker';
import { toRecord } from '../utils/fhir-helpers';

export interface ConformanceIssue {
  path: string;
  code: 'required' | 'max-cardinality' | 'type-mismatch' | 'value-set';
  severity: IssueSeverity;
  diagnostics: string;
}

/** Map of FHIR primitive type codes to expected JS typeof values. */
const PRIMITIVE_TYPEOF: Record<string, string> = {
  boolean: 'boolean',
  integer: 'number',
  positiveInt: 'number',
  unsignedInt: 'number',
  decimal: 'number',
  string: 'string',
  uri: 'string',
  url: 'string',
  canonical: 'string',
  code: 'string',
  id: 'string',
  oid: 'string',
  uuid: 'string',
  markdown: 'string',
  base64Binary: 'string',
  date: 'string',
  dateTime: 'string',
  instant: 'string',
  time: 'string',
  xhtml: 'string',
};

/**
 * Resolve a FHIR path on a resource, returning the concrete value.
 * Handles choice-type `[x]` expansion by probing keys with the prefix.
 * Drops the resource type prefix from the path.
 */
function resolvePathValue(
  resource: unknown,
  path: string,
): { value: unknown; concreteKey?: string } | null {
  if (typeof path !== 'string' || path.length === 0) return null;
  const segments = path.split('.').slice(1); // drop ResourceType prefix
  if (segments.length === 0) return { value: resource };

  let node: unknown = resource;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (node == null || typeof node !== 'object') return null;

    // Choice-type segment: strip `[x]` and probe every key
    if (seg.endsWith('[x]')) {
      const prefix = seg.slice(0, -3);
      const parent = node as Record<string, unknown>;
      for (const k of Object.keys(parent)) {
        if (k.startsWith(prefix) && k.length > prefix.length) {
          const suffix = k.slice(prefix.length);
          // FHIR choice keys are prefix + PascalCase type, so suffix starts uppercase
          if (suffix[0] === suffix[0].toUpperCase()) {
            return { value: parent[k], concreteKey: k };
          }
        }
      }
      return null;
    }

    // Handle sub-path within a parent (e.g., Condition.code.coding)
    const rec = node as Record<string, unknown>;
    node = rec[seg];
    if (node == null) return null;
    // If array, use the first element for path descent (arrays checked separately for max)
    if (Array.isArray(node) && i < segments.length - 1) {
      if (node.length === 0) return null;
      node = node[0];
    }
  }
  return { value: node };
}

/**
 * Determine the suffix type name from a concrete choice-type key.
 * E.g., "onsetDateTime" with prefix "onset" -> "dateTime" (lowercase first char).
 */
function choiceTypeSuffix(concreteKey: string, prefix: string): string {
  const suffix = concreteKey.slice(prefix.length);
  // FHIR convention: the suffix is the type name with first char uppercase
  // We need to lowercase-first to match type codes like "dateTime", "string"
  return suffix.charAt(0).toLowerCase() + suffix.slice(1);
}

/**
 * Check if a JS value matches an expected FHIR type code.
 */
function matchesFhirType(value: unknown, typeCode: string): boolean {
  const expectedPrimitive = PRIMITIVE_TYPEOF[typeCode];
  if (expectedPrimitive) {
    return typeof value === expectedPrimitive;
  }
  // Complex types (CodeableConcept, Reference, Period, etc.) are objects
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate a resource against a profile's snapshot elements.
 *
 * @param resource - The FHIR resource to validate
 * @param profile - The StructureDefinition to validate against, or null
 * @param expandedValueSets - Map of valueSet URL to Set of valid "system|code" strings
 * @returns Array of conformance issues found
 */
export function validateConformance(
  resource: Resource,
  profile: StructureDefinition | null,
  expandedValueSets: Map<string, Set<string>>,
): ConformanceIssue[] {
  if (!profile) return [];

  const elements = profile.snapshot?.element ?? [];
  const issues: ConformanceIssue[] = [];

  for (const el of elements) {
    const path = toRecord(el).path as string | undefined;
    if (!path || !path.includes('.')) continue; // skip root element

    const min = toRecord(el).min as number | undefined;
    const max = toRecord(el).max as string | undefined;
    const elTypes = toRecord(el).type as
      | Array<{ code: string }>
      | undefined;
    const binding = toRecord(el).binding as
      | { strength: string; valueSet: string }
      | undefined;

    // 1. Min cardinality check
    if ((min ?? 0) >= 1 && !isPathPopulated(resource, path)) {
      issues.push({
        path,
        code: 'required',
        severity: 'error',
        diagnostics: `${path} is required but not populated`,
      });
      continue; // No point checking type/max/binding on missing field
    }

    // Resolve the value at this path
    const resolved = resolvePathValue(resource, path);
    if (!resolved || resolved.value === undefined || resolved.value === null) continue;
    const { value, concreteKey } = resolved;

    // 2. Max cardinality check
    if (max === '1' && Array.isArray(value)) {
      if (value.length > 1) {
        issues.push({
          path,
          code: 'max-cardinality',
          severity: 'error',
          diagnostics: `${path} has max cardinality 1 but found array of ${value.length} items`,
        });
      } else if (value.length === 1) {
        issues.push({
          path,
          code: 'max-cardinality',
          severity: 'warning',
          diagnostics: `${path} has max cardinality 1 but value is serialized as single-element array`,
        });
      }
    }

    // 3. Type constraint check
    if (elTypes && elTypes.length > 0) {
      const isChoiceType = path.endsWith('[x]');

      if (isChoiceType && concreteKey) {
        // For choice types, check that the suffix matches one of the declared types
        const prefix = path.split('.').pop()!.slice(0, -3);
        const actualTypeName = choiceTypeSuffix(concreteKey, prefix);
        const validTypes = elTypes.map((t) => t.code);
        if (!validTypes.includes(actualTypeName)) {
          issues.push({
            path,
            code: 'type-mismatch',
            severity: 'error',
            diagnostics: `${concreteKey} has type "${actualTypeName}" but ${path} allows only [${validTypes.join(', ')}]`,
          });
        }
      } else if (!isChoiceType) {
        // For fixed-type elements, check JS typeof against expected FHIR types
        // Unwrap single-element arrays for type checking
        const checkValue = Array.isArray(value) ? value[0] : value;
        if (checkValue !== undefined && checkValue !== null) {
          const matchesAny = elTypes.some((t) => matchesFhirType(checkValue, t.code));
          if (!matchesAny) {
            issues.push({
              path,
              code: 'type-mismatch',
              severity: 'error',
              diagnostics: `${path} expected type [${elTypes.map((t) => t.code).join(', ')}] but found ${typeof checkValue}`,
            });
          }
        }
      }
    }

    // 4. Value set binding check
    if (binding?.valueSet && binding.strength !== 'example') {
      const validCodes = expandedValueSets.get(binding.valueSet);
      if (validCodes) {
        // Extract coded value - could be CodeableConcept, Coding, or code
        const checkValue = Array.isArray(value) ? value[0] : value;
        const codings = extractCodings(checkValue);
        if (codings.length > 0) {
          const hasValidCode = codings.some((c) =>
            validCodes.has(`${c.system}|${c.code}`),
          );
          if (!hasValidCode) {
            const severity = bindingSeverity(binding.strength);
            issues.push({
              path,
              code: 'value-set',
              severity,
              diagnostics: `${path} coded value not found in ${binding.valueSet} (strength: ${binding.strength})`,
            });
          }
        }
      }
    }
  }

  return issues;
}

/** Map binding strength to issue severity per D-03 / UI-SPEC. */
function bindingSeverity(strength: string): IssueSeverity {
  switch (strength) {
    case 'required':
      return 'error';
    case 'extensible':
      return 'warning';
    case 'preferred':
    default:
      return 'info';
  }
}

/** Extract system|code pairs from a value that might be CodeableConcept, Coding, or code string. */
function extractCodings(
  value: unknown,
): Array<{ system: string; code: string }> {
  if (value == null || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;

  // CodeableConcept: has .coding array
  if (Array.isArray(obj.coding)) {
    return obj.coding
      .filter(
        (c: unknown): c is { system: string; code: string } =>
          typeof (c as Record<string, unknown>)?.system === 'string' &&
          typeof (c as Record<string, unknown>)?.code === 'string',
      )
      .map((c) => ({ system: c.system, code: c.code }));
  }

  // Coding: has system + code directly
  if (typeof obj.system === 'string' && typeof obj.code === 'string') {
    return [{ system: obj.system as string, code: obj.code as string }];
  }

  return [];
}

/**
 * Convert ConformanceIssue[] to NormalizedIssue[] for ResourceIssueTable consumption.
 */
export function normalizeConformanceIssues(
  issues: ConformanceIssue[],
  resource: Resource,
): NormalizedIssue[] {
  return issues.map((issue) => ({
    resourceId: `${resource.resourceType}/${toRecord(resource).id ?? 'unknown'}`,
    resourceType: resource.resourceType,
    field: issue.path,
    description: `[${issue.code}] ${issue.diagnostics}`,
    severity: issue.severity,
  }));
}
