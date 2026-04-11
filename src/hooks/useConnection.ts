import { useState, useCallback } from 'react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { ConnectionState } from '../fhir/types';
import { createFhirClient } from '../fhir/client';
import { classifyError } from '../utils/errors';
import type { AppSettings } from '../config/types';

export function useConnection() {
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

  return { state, connect, disconnect };
}
