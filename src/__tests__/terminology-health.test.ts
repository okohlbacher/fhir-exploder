import { describe, it, expect } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import { probeTerminologyHealth } from '../terminology/probe';
import { mockMedplumClientForTerminology } from './fixtures/terminology';

describe('probeTerminologyHealth', () => {
  it("returns 'not-configured' when client is null", async () => {
    const result = await probeTerminologyHealth(null);
    expect(result).toBe('not-configured');
  });

  it("returns 'ok' when the metadata endpoint resolves", async () => {
    const client = mockMedplumClientForTerminology({ metadataReachable: true });
    const result = await probeTerminologyHealth(client);
    expect(result).toBe('ok');
  });

  it("returns 'unreachable' when the metadata endpoint rejects (V-15 probe-layer assertion)", async () => {
    const client = mockMedplumClientForTerminology({ metadataReachable: false });
    const result = await probeTerminologyHealth(client);
    expect(result).toBe('unreachable');
  });

  it("returns 'unreachable' when the request exceeds the probe timeout", async () => {
    // Pending Promise that never resolves — probe must short-circuit via timeout.
    const neverResolving: MedplumClient = {
      get: () =>
        new Promise((_resolve, reject) => {
          // Attach a listener so AbortSignal.timeout(50) aborts the promise.
          // If caller provides a signal, reject when it aborts.
          // Consumers call probe.get('metadata', { signal }).
        }),
    } as unknown as MedplumClient;

    // Patch: the probe passes an AbortSignal; emulate a client that honours it.
    const abortAwareClient: MedplumClient = {
      get: (_path: string, opts?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          const signal = opts?.signal;
          if (signal) {
            if (signal.aborted) {
              reject(signal.reason ?? new Error('Aborted'));
              return;
            }
            signal.addEventListener('abort', () => {
              reject(signal.reason ?? new Error('Aborted'));
            });
          }
          // Otherwise — never resolves.
        }),
    } as unknown as MedplumClient;

    const start = Date.now();
    const result = await probeTerminologyHealth(abortAwareClient, 50);
    const elapsed = Date.now() - start;

    expect(result).toBe('unreachable');
    expect(elapsed).toBeLessThan(200);
    // Silence unused-variable lint: the first stub is intentional illustrative leftover.
    void neverResolving;
  });
});
