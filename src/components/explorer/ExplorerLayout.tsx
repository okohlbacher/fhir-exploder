import { Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';
import { ConnectionGatedOutlet } from '../layout/ConnectionGatedOutlet';

export type ExplorerOutletContext = { capability: CapabilityStatement; client: MedplumClient };

/** Explorer route layout. Delegates the disconnected-state alert to
 *  `<ConnectionGatedOutlet>` (Phase 26 / SHELL-01); owns only the
 *  connected-branch MedplumProvider + Outlet context. */
export function ExplorerLayout() {
  const { state } = useConnection();
  return (
    <ConnectionGatedOutlet>
      {state.status === 'connected' && (
        <MedplumProvider medplum={state.client}>
          <Outlet
            context={
              { capability: state.capability, client: state.client } satisfies ExplorerOutletContext
            }
          />
        </MedplumProvider>
      )}
    </ConnectionGatedOutlet>
  );
}
