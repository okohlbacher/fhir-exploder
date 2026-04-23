import { vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';

export interface MockTerminologyOptions {
  /** Map `CodeSystem/$lookup?system=X&code=Y` substring → canned Parameters response */
  lookupResponses?: Record<string, unknown>;
  /** Map path substring → Error to throw */
  errors?: Record<string, Error>;
  /** Trigger metadata reachability (true → CapabilityStatement, false → throws) */
  metadataReachable?: boolean;
}

export function mockMedplumClientForTerminology(
  options: MockTerminologyOptions = {},
): MedplumClient {
  const get = vi.fn(async (path: string) => {
    if (path === 'metadata' || path.endsWith('/metadata')) {
      if (options.metadataReachable === false) throw new Error('ECONNREFUSED');
      return { resourceType: 'CapabilityStatement' };
    }
    for (const [match, err] of Object.entries(options.errors ?? {})) {
      if (path.includes(match)) throw err;
    }
    for (const [match, response] of Object.entries(options.lookupResponses ?? {})) {
      if (path.includes(match)) return response;
    }
    throw new Error(`No mock registered for path: ${path}`);
  });
  const fhirUrl = (path: string) => ({ toString: () => path });
  return { get, fhirUrl } as unknown as MedplumClient;
}
