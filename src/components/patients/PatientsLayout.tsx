import { Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';
import { ConnectionGatedOutlet } from '../layout/ConnectionGatedOutlet';

export type PatientsOutletContext = { capability: CapabilityStatement; client: MedplumClient };

/** Patients route layout. Delegates the disconnected-state alert to
 *  `<ConnectionGatedOutlet>` (Phase 26 / SHELL-01); owns only the
 *  connected-branch MedplumProvider + Outlet context. All nested
 *  /patients routes (list, detail, patient-scoped resource detail)
 *  rely on this layout for connection state and context propagation. */
export function PatientsLayout() {
  const { state } = useConnection();
  return (
    <ConnectionGatedOutlet>
      {state.status === 'connected' && (
        <MedplumProvider medplum={state.client}>
          <Outlet
            context={
              { capability: state.capability, client: state.client } satisfies PatientsOutletContext
            }
          />
        </MedplumProvider>
      )}
    </ConnectionGatedOutlet>
  );
}
