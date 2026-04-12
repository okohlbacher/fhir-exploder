/**
 * QUAL-04 — remote (online) validator tests.
 *
 * `src/quality/remoteValidator.ts` exports:
 *   - createValidatorClient(validatorUrl) → MedplumClient
 *   - createRemoteBackend(validatorUrl, profileCanonical?) → ValidationBackend
 *
 * Wire format: POST {resourceType}/$validate?profile={canonical} with
 * resource body; response is an OperationOutcome — return .issue ?? [].
 *
 * CRITICAL safety invariant (T-05-05-02): the POST URL must never resolve
 * to the Blaze base URL. A regression test below asserts the fetch URL
 * derives purely from validatorUrl.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Condition, OperationOutcome } from '@medplum/fhirtypes';
import {
  createRemoteBackend,
  createValidatorClient,
} from '../quality/remoteValidator';

const sampleCondition: Condition = {
  resourceType: 'Condition',
  id: 'c-1',
  code: { coding: [{ system: 'http://snomed.info/sct', code: '44054006' }] },
  subject: { reference: 'Patient/1' },
};

const PROFILE = 'https://www.medizininformatik-initiative.de/fhir/core/modul-diagnose/StructureDefinition/Diagnose';

function buildOkOutcome(issues: OperationOutcome['issue']): Response {
  const body: OperationOutcome = {
    resourceType: 'OperationOutcome',
    issue: issues ?? [],
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/fhir+json' },
  });
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  (globalThis as unknown as { fetch: typeof fetch }).fetch =
    fetchSpy as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createValidatorClient', () => {
  it('returns a MedplumClient whose base URL reflects the configured validator URL', () => {
    const client = createValidatorClient('https://validator.example.org/fhir/');
    const baseUrl = client.getBaseUrl();
    expect(baseUrl).toContain('validator.example.org');
  });
});

describe('createRemoteBackend', () => {
  it('POSTs to {validatorUrl}/{resourceType}/$validate?profile={encoded} with the resource body', async () => {
    fetchSpy.mockResolvedValueOnce(buildOkOutcome([]));
    const backend = createRemoteBackend('https://validator.example.org/fhir/', PROFILE);
    await backend.validate(sampleCondition);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('validator.example.org');
    expect(url).toContain('/Condition/$validate');
    expect(url).toContain(encodeURIComponent(PROFILE));
    expect(init?.method).toBe('POST');
    const body = init?.body as string;
    expect(typeof body).toBe('string');
    expect(JSON.parse(body)).toMatchObject({ resourceType: 'Condition', id: 'c-1' });
  });

  it('returns OperationOutcome.issue verbatim when server responds 200/OK', async () => {
    const canned = [
      { severity: 'error' as const, code: 'required' as const, diagnostics: 'missing x' },
      { severity: 'warning' as const, code: 'informational' as const, diagnostics: 'look here' },
    ];
    fetchSpy.mockResolvedValueOnce(buildOkOutcome(canned));
    const backend = createRemoteBackend('https://validator.example.org/fhir/', PROFILE);
    const issues = await backend.validate(sampleCondition);
    expect(issues).toHaveLength(2);
    expect(issues[0].severity).toBe('error');
    expect(issues[1].severity).toBe('warning');
  });

  it('returns a single error/exception issue when fetch throws (graceful degrade)', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const backend = createRemoteBackend('https://validator.example.org/fhir/', PROFILE);
    const issues = await backend.validate(sampleCondition);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].code).toBe('exception');
    expect(issues[0].diagnostics).toContain('validator.example.org');
  });

  it('omits the ?profile= query when no profileCanonical is provided', async () => {
    fetchSpy.mockResolvedValueOnce(buildOkOutcome([]));
    const backend = createRemoteBackend('https://validator.example.org/fhir/');
    await backend.validate(sampleCondition);
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/Condition/$validate');
    expect(url).not.toContain('?profile=');
  });

  it('REGRESSION (T-05-05-02): never POSTs to the Blaze base URL', async () => {
    // Simulate the exact scenario the threat model guards against:
    // validatorUrl is correctly set, Blaze sits at localhost:8080. The
    // fetch URL MUST be derived from validatorUrl alone.
    fetchSpy.mockResolvedValue(buildOkOutcome([]));
    const backend = createRemoteBackend('https://validator.example.org/fhir/', PROFILE);
    await backend.validate(sampleCondition);
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('localhost:8080');
    expect(url).not.toContain('localhost');
    expect(url.startsWith('https://validator.example.org')).toBe(true);
  });

  it('backend kind is "remote"', () => {
    const backend = createRemoteBackend('https://validator.example.org/fhir/');
    expect(backend.kind).toBe('remote');
  });
});
