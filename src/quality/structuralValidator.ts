/**
 * Structural (offline) validator for Phase 05 Plan 05-05.
 *
 * The structural backend is the always-on half of the validation pair. It
 * consumes the bundled MII StructureDefinitions from Plan 03 and emits one
 * OperationOutcomeIssue per required path that is not populated on the
 * sampled resource. Reuses the walker from Plan 03 (requiredElementPaths +
 * isPathPopulated) verbatim — no re-implementation of path traversal.
 *
 * Severity is `error` because mustSupport / min>=1 gaps are blocking per
 * FHIR conformance spec; treating them as warnings would mask
 * cardinality violations.
 */
import type {
  OperationOutcomeIssue,
  Resource,
  StructureDefinition,
} from '@medplum/fhirtypes';
import type { ValidationBackend } from './types';
import { isPathPopulated, requiredElementPaths } from './completenessWalker';

export function validateStructural(
  resource: Resource,
  profile: StructureDefinition | null,
): OperationOutcomeIssue[] {
  if (!profile) return [];
  const required = requiredElementPaths(profile);
  const profileLabel = profile.name ?? profile.url ?? 'profile';
  const issues: OperationOutcomeIssue[] = [];
  for (const path of required) {
    if (!isPathPopulated(resource, path)) {
      issues.push({
        severity: 'error',
        code: 'required',
        expression: [path],
        diagnostics: `${path} is required by ${profileLabel} but was not populated`,
      });
    }
  }
  return issues;
}

export function createStructuralBackend(
  getProfile: (resourceType: string) => StructureDefinition | null,
): ValidationBackend {
  return {
    kind: 'structural',
    async validate(resource: Resource): Promise<OperationOutcomeIssue[]> {
      return validateStructural(resource, getProfile(resource.resourceType));
    },
  };
}
