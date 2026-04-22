/**
 * useValidationRun — Phase 23 Plan 05 regression guard (Blocker 1).
 *
 * The 23-HUMAN-UAT.md `root_cause` claim is:
 *   "Completeness, Coding Coverage, and Validation DO re-scope correctly
 *    (evidence: useValidationRun.ts:172 includes patientIds in the start()
 *    useCallback deps)."
 *
 * This test codifies that claim so a silent regression can't land. If the
 * deps array is ever trimmed back to exclude patientIds, this guard turns
 * red and Plan 23-05's scope must expand to include Validation.
 *
 * Unlike the 4 Bug B hooks, useValidationRun does NOT auto-start — the user
 * clicks "Run" via start(). So the regression guard verifies that start()
 * re-creates with a fresh patientIds binding after a prop change.
 *
 * Synthetic IDs only — no real PHI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../../config/types';

vi.mock('../../quality/sampling', () => ({
  SHORT_QUERY_THRESHOLD: 40,
  sampleResources: vi.fn(async () => []),
}));

// Avoid importing real validator backends (they poke network/DOM). Return
// a minimal resolution so useValidationRun's `start()` reaches the sample.
vi.mock('../../quality/validationBackends', () => ({
  resolveBackends: () => ({
    backends: [],
    hasRemote: false,
    hasProfile: false,
    validatorUrl: null,
  }),
  dedupeIssues: (issues: unknown[]) => issues,
}));

import { sampleResources } from '../../quality/sampling';
import { useValidationRun } from '../useValidationRun';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockClient = {
  getBaseUrl: () => 'http://test.example/fhir',
} as unknown as MedplumClient;

const minimalSettings: AppSettings = {
  fhir: { serverUrl: 'http://test.example/fhir', auth: { mode: 'open' } },
  validation: { batchSize: 5 },
} as AppSettings;

describe('useValidationRun — regression guard: sampleResources re-invoked on patientIds change', () => {
  it('start() after patientIds prop change passes the new patientIds to sampleResources', async () => {
    const { result, rerender } = renderHook(
      ({ patientIds }: { patientIds: string[] | undefined }) =>
        useValidationRun({
          client: mockClient,
          resourceType: 'Observation',
          sampleSize: 5,
          batchSize: 5,
          settings: minimalSettings,
          patientIds,
        }),
      { initialProps: { patientIds: undefined as string[] | undefined } },
    );

    // First run: patientIds=undefined.
    act(() => {
      result.current.start();
    });
    await waitFor(() => {
      const calls = (sampleResources as unknown as { mock: { calls: unknown[][] } })
        .mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    const firstCalls = (sampleResources as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    expect(firstCalls[0][3]).toBeUndefined();
    const callsBefore = firstCalls.length;

    // Rerender with a new cohort, then trigger start() again.
    rerender({ patientIds: ['p1'] });
    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      const callsAfter = (sampleResources as unknown as { mock: { calls: unknown[][] } })
        .mock.calls.length;
      expect(callsAfter - callsBefore).toBeGreaterThanOrEqual(1);
    });

    const allCalls = (sampleResources as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    const latest = allCalls[allCalls.length - 1];
    expect(latest[3]).toEqual(['p1']);
  });
});
