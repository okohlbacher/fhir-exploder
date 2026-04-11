import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { ConnectionState } from '../fhir/types';
import type { AppSettings } from '../config/types';
import { createFhirClient } from '../fhir/client';
import { classifyError } from '../utils/errors';

type ConnectionContextValue = {
  state: ConnectionState;
  connect: (settings: AppSettings) => Promise<void>;
  disconnect: () => void;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>({ status: 'idle' });

  const connect = useCallback(async (settings: AppSettings) => {
    setState({ status: 'connecting' });
    try {
      const client = createFhirClient(settings);
      // Fetch CapabilityStatement to verify connection
      const capability = await client.get('metadata') as CapabilityStatement;
      if (!capability || capability.resourceType !== 'CapabilityStatement') {
        throw { status: 0, message: 'Invalid CapabilityStatement response' };
      }
      setState({ status: 'connected', client, capability });
    } catch (err) {
      const error = classifyError(err, settings.fhir.serverUrl, settings.fhir.auth.mode);
      setState({ status: 'error', error });
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const value = useMemo(
    () => ({ state, connect, disconnect }),
    [state, connect, disconnect],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnectionContext(): ConnectionContextValue {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnectionContext must be used within a ConnectionProvider');
  }
  return context;
}
