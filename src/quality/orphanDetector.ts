/**
 * orphanDetector -- DQ-10 orphan resource detection.
 *
 * An "orphan" here is a resource missing a reference that the profile
 * declares as required (min >= 1, type Reference). The canonical
 * example is an Observation without a `subject`: the lab result has
 * no patient context, so it cannot be surfaced via patient-centric
 * navigation.
 *
 * Strategy (D-08, D-09):
 *   1. Try to read min>=1 Reference elements from a bundled MII profile.
 *   2. Fall back to a small R4 default map for types without a profile.
 *
 * The walk only inspects the top-level required field (e.g., `subject`)
 * -- nested sliced cardinality is out of scope for v1.
 */
import type { Resource } from '@medplum/fhirtypes';
import type { NormalizedIssue } from './types';
import { getProfileForType } from './profiles';
import { toRecord } from '../utils/fhir-helpers';

/**
 * Minimal R4 fallback map for types without a bundled MII profile.
 * Only types where a reference is *required* by R4 itself (min>=1)
 * should appear here. Entries list the top-level required reference
 * fields in FHIRPath form (e.g., `Observation.subject`).
 */
const FALLBACK: Record<string, string[]> = {
  Observation: ['Observation.subject'],
  Condition: ['Condition.subject'],
  Encounter: ['Encounter.subject'],
  Procedure: ['Procedure.subject'],
  MedicationStatement: ['MedicationStatement.subject'],
  MedicationRequest: ['MedicationRequest.subject'],
  DiagnosticReport: ['DiagnosticReport.subject'],
  AllergyIntolerance: ['AllergyIntolerance.patient'],
  Immunization: ['Immunization.patient'],
  CarePlan: ['CarePlan.subject'],
};

/**
 * Return every `Type.field` path where the (profile or R4) contract
 * requires at least one Reference. Only direct children of the
 * resource root are considered -- nested slices are out of scope.
 */
export function getRequiredReferenceFields(resourceType: string): string[] {
  const profile = getProfileForType(resourceType);
  if (profile) {
    const elements = profile.snapshot?.element ?? [];
    const paths: string[] = [];
    for (const el of elements) {
      const min = typeof el.min === 'number' ? el.min : 0;
      const hasReferenceType = Array.isArray(el.type)
        ? el.type.some((t) => t.code === 'Reference')
        : false;
      if (min >= 1 && hasReferenceType && typeof el.path === 'string') {
        // Only top-level: "Type.field" has exactly one dot.
        if (el.path.split('.').length === 2) {
          paths.push(el.path);
        }
      }
    }
    if (paths.length > 0) {
      return Array.from(new Set(paths));
    }
  }
  return FALLBACK[resourceType] ?? [];
}

function hasReference(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) {
    return value.some((v) => hasReference(v));
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return typeof obj.reference === 'string' && obj.reference.length > 0;
  }
  return false;
}

/**
 * Emit a NormalizedIssue for every resource that is missing a required
 * Reference field. Orphans are surfaced as `warning` severity because
 * they may be legitimate (e.g., a test Observation with no patient
 * context yet) -- DQ-10's purpose is to surface candidates for review,
 * not to reject the data.
 */
export function detectOrphans(resources: Resource[]): NormalizedIssue[] {
  const issues: NormalizedIssue[] = [];
  // Cache required fields per type -- resources typically arrive in
  // homogeneous batches, so the repeated profile read would be wasted
  // work otherwise.
  const fieldsCache = new Map<string, string[]>();

  for (const r of resources) {
    const type = r?.resourceType;
    if (!type) continue;
    let required = fieldsCache.get(type);
    if (!required) {
      required = getRequiredReferenceFields(type);
      fieldsCache.set(type, required);
    }
    if (required.length === 0) continue;

    for (const requiredPath of required) {
      // Extract the top-level field name from "Type.field".
      const fieldName = requiredPath.split('.').slice(1).join('.');
      if (!fieldName) continue;
      const value = toRecord(r)[fieldName];
      if (!hasReference(value)) {
        const id = toRecord(r).id ?? 'unknown';
        issues.push({
          resourceId: `${type}/${id}`,
          resourceType: type,
          field: requiredPath,
          description: `[orphan] Missing required reference: ${requiredPath}`,
          severity: 'warning',
        });
      }
    }
  }
  return issues;
}
