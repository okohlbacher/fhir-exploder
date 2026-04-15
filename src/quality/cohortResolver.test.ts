/**
 * Wave 0 stub test file for Plan 21-02 (`src/quality/cohortResolver.ts`).
 *
 * Every `it()` name below MUST match a VALIDATION.md `-t "…"` filter so the
 * downstream Plan 21-02 automation commands resolve to a concrete spec:
 *   - `-t "intersects"`       (CHRT-01)
 *   - `-t "date range"`       (CHRT-01)
 *   - `-t "condition code"`   (CHRT-01)
 *
 * All tests are `it.skip` — Plan 21-02 un-skips and implements against the
 * real resolver. The MedplumClient mock shape mirrors the pattern used in
 * src/quality/__tests__/pdfExport.test.ts (vi.fn()-backed method surface).
 *
 * Threat T-21-03 (PHI in fixtures): every test ID is synthetic (`p-001` etc).
 */
import { describe, it, expect, vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';

// Shared synthetic mock — Plan 21-02 will flesh these out. No PHI.
function makeMockClient() {
  return {
    searchResources: vi.fn(),
    searchResourcePages: vi.fn(),
  } as unknown as MedplumClient;
}

describe('resolveCohort', () => {
  it.skip('intersects three criterion sets (pending Plan 21-02)', () => {
    // TODO(Plan 21-02): import { resolveCohort } from './cohortResolver'
    // and assert the returned patient array is the AND-intersection of:
    //   - date-range → Encounter.subject patient IDs
    //   - condition-code → Condition.subject patient IDs
    //   - reference-list → explicit patientIds
    // Use synthetic IDs p-001..p-010.
    const _client = makeMockClient();
    expect(_client).toBeDefined();
  });

  it.skip('date range queries Encounter?date=geX&date=leY (pending Plan 21-02)', () => {
    // TODO(Plan 21-02): assert the resolver calls searchResourcePages with
    // resourceType='Encounter' and params.date=['geYYYY-MM-DD','leYYYY-MM-DD']
    // plus params._elements='subject'. Decision D-05.
    const _client = makeMockClient();
    expect(_client).toBeDefined();
  });

  it.skip('condition code queries Condition?code=sys|code (pending Plan 21-02)', () => {
    // TODO(Plan 21-02): assert the resolver calls searchResourcePages with
    // resourceType='Condition' and params.code='${system}|${code}' plus
    // params._elements='subject'.
    const _client = makeMockClient();
    expect(_client).toBeDefined();
  });
});
