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
    // Client that honours the AbortSignal the probe threads through via options.
    // Without a signal, the Promise would never resolve — so we assert the probe
    // both passes a signal AND converts the abort into an 'unreachable' result.
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
  });
});
