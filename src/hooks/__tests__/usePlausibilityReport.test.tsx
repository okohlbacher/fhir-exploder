/**
 * usePlausibilityReport — Phase 23 Plan 05 (CLOSE-06 Bug B) regression test.
 *
 * Bug B root cause (23-HUMAN-UAT.md): usePlausibilityReport calls useAsyncRun
 * without `autoStart: true`, so a patientIds prop change does not re-fire
 * the runner. Stale unscoped results persist when a cohort is activated.
 *
 * This test asserts the FIX state:
 *   - On mount (patientIds=undefined), autoStart:true fires the runner once.
 *   - On rerender with patientIds=['p1'], the runner re-fires (delta-based
 *     assertion: callsAfter - callsBefore >= 1). Threat T-23-05-05 mitigated
 *     by the patientIdsKey memoization in the hook (PITFALLS §7).
 *
 * Delta-based assertion rationale: StrictMode or initial-mount call-count
 * differences cannot mask a missing re-run because we only require a NEW
 * call attributable to the rerender.
 *
 * Synthetic IDs only — no real PHI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../../config/types';

// Mock sampleResources so the runner can settle without a real Blaze.
vi.mock('../../quality/sampling', () => ({
  SHORT_QUERY_THRESHOLD: 40,
  sampleResources: vi.fn(async () => []),
}));

import { sampleResources } from '../../quality/sampling';
import { usePlausibilityReport } from '../usePlausibilityReport';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockClient = {
  getBaseUrl: () => 'http://test.example/fhir',
} as unknown as MedplumClient;

const minimalSettings: AppSettings = {
  fhir: { serverUrl: 'http://test.example/fhir', auth: { mode: 'open' } },
} as AppSettings;

describe('usePlausibilityReport — Bug B re-run on patientIds change', () => {
  it('autoStart fires on mount and re-fires on patientIds change (delta-based)', async () => {
    const { result, rerender } = renderHook(
      ({ patientIds }: { patientIds: string[] | undefined }) =>
        usePlausibilityReport({
          client: mockClient,
          resourceType: 'Observation',
          sampleSize: 10,
          settings: minimalSettings,
          patientIds,
        }),
      { initialProps: { patientIds: undefined as string[] | undefined } },
    );

    // Initial autoStart must transition idle → running → complete.
    await waitFor(() => expect(result.current.status).toBe('complete'));

    const callsBefore = (sampleResources as unknown as { mock: { calls: unknown[] } })
      .mock.calls.length;
    expect(callsBefore).toBeGreaterThanOrEqual(1);

    // Activate a cohort — this must re-fire the runner.
    rerender({ patientIds: ['p1'] });

    await waitFor(() => {
      const callsAfter = (sampleResources as unknown as { mock: { calls: unknown[] } })
        .mock.calls.length;
      expect(callsAfter - callsBefore).toBeGreaterThanOrEqual(1);
    });

    // Assert the latest call carried patientIds=['p1'] as its 4th positional arg.
    const calls = (sampleResources as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    const latest = calls[calls.length - 1];
    expect(latest[3]).toEqual(['p1']);
  });
});
