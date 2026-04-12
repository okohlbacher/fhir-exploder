/**
 * Backend composition for Phase 05 Plan 05-05 validation.
 *
 * `resolveBackends(settings, resourceType)` returns the ordered list of
 * active ValidationBackends for a given resource type:
 *   1. Structural backend — always present. Delegates to bundled MII
 *      profiles via getProfileForType (Plan 03 registry).
 *   2. Remote backend — present ONLY when settings.validation.validatorUrl
 *      is configured. Pointed at that URL. Pass the profile canonical (if
 *      any) so the remote validator constrains against the same MII profile
 *      the structural backend used.
 *
 * `dedupeIssues(issues)` collapses duplicates across the two backends so
 * the UI does not double-render the same "Condition.code is required"
 * from both structural and remote backends.
 */
import type { OperationOutcomeIssue } from '@medplum/fhirtypes';
import type { AppSettings } from '../config/types';
import type { ValidationBackend } from './types';
import { createStructuralBackend } from './structuralValidator';
import { createRemoteBackend } from './remoteValidator';
import { getProfileForType } from './profiles';

export interface BackendResolution {
  backends: ValidationBackend[];
  hasRemote: boolean;
  hasProfile: boolean;
  validatorUrl: string | null;
}

export function resolveBackends(
  settings: AppSettings | null | undefined,
  resourceType: string,
): BackendResolution {
  const profile = getProfileForType(resourceType);
  const hasProfile = profile !== null;
  const validatorUrl = settings?.validation?.validatorUrl ?? null;
  const hasRemote =
    typeof validatorUrl === 'string' && validatorUrl.trim().length > 0;

  const backends: ValidationBackend[] = [createStructuralBackend(getProfileForType)];
  if (hasRemote) {
    backends.push(createRemoteBackend(validatorUrl as string, profile?.url));
  }

  return { backends, hasRemote, hasProfile, validatorUrl };
}

/**
 * Deduplicate OperationOutcomeIssues emitted by multiple backends.
 *
 * Key = severity | code | expression/location JSON | diagnostics. A
 * structural backend emitting {severity:error, code:required,
 * expression:['Condition.code'], diagnostics:'…'} and a remote backend
 * emitting an identical shape collapse into a single row in the UI.
 *
 * Subtle differences (different diagnostics strings) keep both issues —
 * they may carry complementary information.
 */
export function dedupeIssues(
  issues: OperationOutcomeIssue[],
): OperationOutcomeIssue[] {
  const seen = new Set<string>();
  const out: OperationOutcomeIssue[] = [];
  for (const issue of issues) {
    const exprKey = JSON.stringify(
      issue.expression ?? issue.location ?? [],
    );
    const key = `${issue.severity}|${issue.code}|${exprKey}|${issue.diagnostics ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}
