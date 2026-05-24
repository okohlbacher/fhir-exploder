/**
 * Phase 59 FIX-06 — ConnectionContext throws Error instance on invalid CapabilityStatement (ERR-01).
 *
 * Asserts that when /metadata returns a payload missing `resourceType: 'CapabilityStatement'`,
 * the connect() flow rejects with a `new Error(...)` instance, not a plain `{ status, message }`
 * object. Verified by spying on `classifyError` (which receives the caught value).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ConnectionProvider, useConnectionContext } from '../contexts/ConnectionContext';
import * as errorsModule from '../utils/errors';
import * as clientModule from '../fhir/client';
import type { AppSettings } from '../config/types';

const STUB_SETTINGS: AppSettings = {
  fhir: {
    serverUrl: 'http://localhost:8080/fhir',
    auth: { mode: 'open' },
  },
};

function HookProbe({
  onConnect,
}: {
  onConnect: (connect: (s: AppSettings) => Promise<void>) => void;
}) {
  const { connect } = useConnectionContext();
  onConnect(connect);
  return null;
}

describe('ConnectionContext — FIX-06 throws Error instance on invalid capability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws `new Error(...)` (instanceof Error) when /metadata payload is not a CapabilityStatement', async () => {
    const classifySpy = vi.spyOn(errorsModule, 'classifyError');
    // Mock createFhirClient to return a client whose get() resolves with the wrong shape.
    vi.spyOn(clientModule, 'createFhirClient').mockReturnValue({
      get: vi.fn().mockResolvedValue({ resourceType: 'NotACapabilityStatement' }),
      fhirUrl: () => ({ toString: () => 'http://localhost:8080/fhir/metadata' }),
    } as unknown as ReturnType<typeof clientModule.createFhirClient>);

    let connectFn: ((s: AppSettings) => Promise<void>) | null = null;
    render(
      <ConnectionProvider>
        <HookProbe
          onConnect={(c) => {
            connectFn = c;
          }}
        />
      </ConnectionProvider>,
    );

    await act(async () => {
      await connectFn!(STUB_SETTINGS);
    });

    expect(classifySpy).toHaveBeenCalled();
    const [caughtErr] = classifySpy.mock.calls[0];
    expect(caughtErr).toBeInstanceOf(Error);
    expect((caughtErr as Error).message).toBe('Invalid CapabilityStatement response');
  });
});
