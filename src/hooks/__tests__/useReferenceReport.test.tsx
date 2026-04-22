/**
 * useReferenceReport — Phase 23 Plan 05 (CLOSE-06 Bug B) regression test.
 *
 * Asserts that patientIds changes re-fire the runner (via autoStart:true +
 * memoized patientIdsKey). See 23-HUMAN-UAT.md root_cause Bug B.
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
import { useReferenceReport } from '../useReferenceReport';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockClient = {
  getBaseUrl: () => 'http://test.example/fhir',
} as unknown as MedplumClient;

describe('useReferenceReport — Bug B re-run on patientIds change', () => {
  it('autoStart fires on mount and re-fires on patientIds change (delta-based)', async () => {
    const { result, rerender } = renderHook(
      ({ patientIds }: { patientIds: string[] | undefined }) =>
        useReferenceReport({
          client: mockClient,
          resourceType: 'Observation',
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

    const calls = (sampleResources as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    const latest = calls[calls.length - 1];
    expect(latest[3]).toEqual(['p1']);
  });
});
