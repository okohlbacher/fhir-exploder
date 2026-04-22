/**
 * useDuplicateReport — Phase 23 Plan 05 (CLOSE-06 Bug B) regression test.
 *
 * Asserts that patientIds changes re-fire the runner (via autoStart:true +
 * memoized patientIdsKey + typesKey). See 23-HUMAN-UAT.md root_cause Bug B.
 *
 * Synthetic IDs only — no real PHI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { MedplumClient } from '@medplum/core';

vi.mock('../../quality/sampling', () => ({
  SHORT_QUERY_THRESHOLD: 40,
  sampleResources: vi.fn(async () => []),
}));

import { sampleResources } from '../../quality/sampling';
import { useDuplicateReport } from '../useDuplicateReport';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockClient = {
  getBaseUrl: () => 'http://test.example/fhir',
} as unknown as MedplumClient;

describe('useDuplicateReport — Bug B re-run on patientIds change', () => {
  it('autoStart fires on mount and re-fires on patientIds change (delta-based)', async () => {
    const { result, rerender } = renderHook(
      ({ patientIds }: { patientIds: string[] | undefined }) =>
        useDuplicateReport({
          client: mockClient,
          types: ['Patient'],
          sampleSize: 10,
          patientIds,
        }),
      { initialProps: { patientIds: undefined as string[] | undefined } },
    );

    await waitFor(() => expect(result.current.status).toBe('complete'));

    const callsBefore = (sampleResources as unknown as { mock: { calls: unknown[] } })
      .mock.calls.length;
    expect(callsBefore).toBeGreaterThanOrEqual(1);

    rerender({ patientIds: ['p1'] });

    await waitFor(() => {
      const callsAfter = (sampleResources as unknown as { mock: { calls: unknown[] } })
        .mock.calls.length;
      expect(callsAfter - callsBefore).toBeGreaterThanOrEqual(1);
    });

    // Find the latest call that carried patientIds=['p1'] (some calls are
    // per-type samples that forward the same patientIds).
    const calls = (sampleResources as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    const scopedCalls = calls.filter(
      (c) => Array.isArray(c[3]) && (c[3] as string[])[0] === 'p1',
    );
    expect(scopedCalls.length).toBeGreaterThanOrEqual(1);
  });
});
