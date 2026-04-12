/**
 * QUAL-04 — remote (online) validator tests.
 *
 * Wave 2 Plan 05 creates `src/quality/remoteValidator.ts` exporting:
 *   - createRemoteBackend(client: MedplumClient, profileCanonical: string): ValidationBackend
 *   - validateRemote(client, resource, profileCanonical): OperationOutcomeIssue[]
 *
 * Wire format: POST {resourceType}/$validate?profile={canonical} with
 * resource body; response is an OperationOutcome — return .issue ?? [].
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — Wave 2 Plan 05 creates this module.
import { validateRemote } from '../quality/remoteValidator';

describe('validateRemote (QUAL-04)', () => {
  it.todo('POSTs to {resourceType}/$validate?profile=... with the resource body');
  it.todo('url-encodes the profile canonical');
  it.todo('returns OperationOutcome.issue array verbatim');
  it.todo('returns [] when outcome.issue is absent');
  it.todo('propagates network errors so caller can surface them');

  it('is exported from src/quality/remoteValidator', () => {
    expect(typeof validateRemote).toBe('function');
  });
});
