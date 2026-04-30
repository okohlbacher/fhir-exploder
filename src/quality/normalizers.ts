/**
 * OperationOutcome → NormalizedIssue mapper.
 *
 * Extracted from ValidationPanel.tsx:167-178 for Phase 31 UX-01 (D-12).
 * BOTH the legacy $validate path (`ValidationPanel.legacyNormalizedIssues`)
 * AND the new external-validator tier in `cascadingValidator.ts` route
 * through this single normalizer — there is no second copy.
 *
 * Severity policy: fatal|error → 'error'; warning → 'warning'; all else → 'info'.
 * DO NOT auto-normalize severity across validators (PITFALLS #5 warns that
 * hiding vendor differences would hide real data-model differences).
 * Surface the variant via the Active-strategy status line instead.
 *
 * Wrapper envelope shape (FHIR Validator Wrapper) is deferred to v1.6+
 * per D-13. This mapper handles plain `OperationOutcome` from HAPI / Firely
 * / IG-Publisher / any HAPI-compatible endpoint only.
 */
import type { OperationOutcomeIssue } from '@medplum/fhirtypes';
import type { NormalizedIssue } from './types';

export function normalizeOperationOutcomeIssue(
  issue: OperationOutcomeIssue,
  resourceRef: string = 'unknown/unknown',
): NormalizedIssue {
  const [rt = 'unknown'] = resourceRef.split('/');
  const severity: NormalizedIssue['severity'] =
    issue.severity === 'fatal' || issue.severity === 'error'
      ? 'error'
      : issue.severity === 'warning'
        ? 'warning'
        : 'info';
  return {
    resourceId: resourceRef,
    resourceType: rt,
    field: issue.expression?.[0] ?? issue.location?.[0] ?? '',
    description: `${issue.code ?? ''} -- ${issue.diagnostics ?? issue.details?.text ?? ''}`,
    severity,
    // Phase 43 VAL-07: raw FHIR issue.code preserved verbatim for downstream
    // predicates (semanticNearMissWalker filters on `code === 'code-invalid'`).
    // Description squash above is unchanged so existing UI consumers don't break.
    code: typeof issue.code === 'string' ? issue.code : undefined,
  };
}
