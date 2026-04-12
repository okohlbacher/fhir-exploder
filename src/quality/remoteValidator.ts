/**
 * Remote (online) validator for Phase 05 Plan 05-05.
 *
 * Instantiates a SECOND, independent MedplumClient pointed at the
 * user-configured `validation.validatorUrl`. The instance has no shared
 * state with the Blaze client — which is the T-05-05-02 threat-model
 * mitigation: the POST URL can never resolve to the Blaze base URL
 * because the validator client was never constructed with a Blaze URL.
 *
 * Mirrors the pattern used by `src/terminology/terminologyClient.ts` for
 * its second-client instantiation against the terminology server.
 *
 * Wire format:
 *   POST {validatorUrl}/{resourceType}/$validate?profile={canonical}
 *   body: <resource JSON>
 *   response: OperationOutcome — we return `outcome.issue ?? []`.
 *
 * Network failures degrade gracefully: the backend returns a single
 * `error`/`exception` issue describing the failure rather than throwing.
 * resolveBackends() in validationBackends.ts then shows structural
 * issues alongside the degraded-remote marker, so the user still sees
 * actionable output without the UI crashing on a validator outage.
 */
import { MedplumClient } from '@medplum/core';
import type {
  OperationOutcome,
  OperationOutcomeIssue,
  Resource,
} from '@medplum/fhirtypes';
import type { ValidationBackend } from './types';

export function createValidatorClient(validatorUrl: string): MedplumClient {
  // Normalize to ensure trailing slash on baseUrl so relative POST paths
  // resolve correctly (e.g., `Condition/$validate` resolves against
  // `.../fhir/Condition/$validate`, not `.../Condition/$validate`).
  const normalized = validatorUrl.endsWith('/') ? validatorUrl : `${validatorUrl}/`;
  return new MedplumClient({
    baseUrl: normalized,
    // validatorUrl is already the FHIR root — the default fhirUrlPath
    // ("fhir/") would double-prefix requests. Setting to '' mirrors
    // createTerminologyClient's baseUrl/fhirUrlPath split.
    fhirUrlPath: '',
    fetch: (input, init) => fetch(input as string, init),
  });
}

export function createRemoteBackend(
  validatorUrl: string,
  profileCanonical?: string,
): ValidationBackend {
  const client = createValidatorClient(validatorUrl);
  return {
    kind: 'remote',
    async validate(resource: Resource): Promise<OperationOutcomeIssue[]> {
      const query = profileCanonical
        ? `?profile=${encodeURIComponent(profileCanonical)}`
        : '';
      const path = `${resource.resourceType}/$validate${query}`;
      try {
        const outcome = await client.post<OperationOutcome>(path, resource);
        return outcome?.issue ?? [];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return [
          {
            severity: 'error',
            code: 'exception',
            diagnostics: `Remote validator (${validatorUrl}) failed: ${message}`,
          },
        ];
      }
    },
  };
}
