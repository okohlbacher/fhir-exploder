/**
 * Wave 0 stub test file for Plan 21-03 (`src/quality/sampling.ts` extensions).
 *
 * Every `it()` name below MUST match a VALIDATION.md `-t "…"` filter so the
 * downstream Plan 21-03 automation commands resolve to a concrete spec:
 *   - `-t "short GET"`             (CHRT-03 — ≤40 IDs → GET ?patient=…)
 *   - `-t "long POST"`             (CHRT-03 — >40 IDs → POST /_search body)
 *   - `-t "Patient uses _id"`      (CHRT-03 — Patient resource scopes via _id=)
 *   - `-t "empty array"`           (CHRT-03 — empty patientIds === no scoping)
 *
 * All tests are `it.skip` until Plan 21-03 extends sampleResources with
 * patient scoping. Mock shape mirrors src/quality/__tests__/pdfExport.test.ts.
 *
 * Threat T-21-03: every test ID is synthetic (`p-001` etc.).
 */
import { describe, it, expect, vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';

function makeMockClient() {
  return {
    searchResources: vi.fn(),
    post: vi.fn(),
    fhirUrl: vi.fn(),
  } as unknown as MedplumClient;
}

describe('sampleResources with patient scoping', () => {
  it.skip('short GET: ≤40 patient IDs uses ?patient= query param (pending Plan 21-03)', () => {
    // TODO(Plan 21-03): call sampleResources(client, 'Observation', 10, patientIds)
    // with 40 synthetic IDs; assert client.searchResources was called with
    // params.patient === 40 comma-joined IDs and NOT via POST.
    const _client = makeMockClient();
    expect(_client).toBeDefined();
  });

  it.skip('long POST: >40 patient IDs uses POST /_search form body (pending Plan 21-03)', () => {
    // TODO(Plan 21-03): call with 41 IDs; assert client.post was invoked with
    // the /_search path and a URL-encoded form body containing `patient=…`
    // for each ID. URL-length cutover per 21-RESEARCH.md §Pitfalls.
    const _client = makeMockClient();
    expect(_client).toBeDefined();
  });

  it.skip('Patient uses _id not patient param (pending Plan 21-03)', () => {
    // TODO(Plan 21-03): call sampleResources(client, 'Patient', 10, ['p-001','p-002']);
    // assert searchResources was invoked with params._id (NOT params.patient).
    const _client = makeMockClient();
    expect(_client).toBeDefined();
  });

  it.skip('empty array equivalent to no scoping (pending Plan 21-03)', () => {
    // TODO(Plan 21-03): call sampleResources(client, 'Observation', 10, []);
    // assert behaviour is identical to the undefined-patientIds overload —
    // no `patient`, no `_id`, just `_count`. Avoids sending an empty filter
    // that Blaze would interpret as "match nothing".
    const _client = makeMockClient();
    expect(_client).toBeDefined();
  });
});
