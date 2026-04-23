import { Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';
import { ConnectionGatedOutlet } from '../layout/ConnectionGatedOutlet';
import { ResourceTypeRail } from './ResourceTypeRail';

export type ExplorerOutletContext = { capability: CapabilityStatement; client: MedplumClient };

/** Explorer route layout. Delegates the disconnected-state alert to
 *  `<ConnectionGatedOutlet>` (Phase 26 / SHELL-01); owns only the
 *  connected-branch MedplumProvider + Outlet context.
 *
 *  Phase 30 Step 5 adds a 240-px `<ResourceTypeRail>` to the left of the
 *  main pane so every /explorer/* child route keeps the full type list
 *  within one click. The rail reuses the same `useResourceCounts` hook as
 *  the landing page's cards, so counts are shared across mounts. */
export function ExplorerLayout() {
  const { state } = useConnection();
  return (
    <ConnectionGatedOutlet>
      {state.status === 'connected' && (
        <MedplumProvider medplum={state.client}>
          <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
            <ResourceTypeRail
              capability={state.capability}
              client={state.client}
            />
            <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
              <Outlet
                context={
                  {
                    capability: state.capability,
                    client: state.client,
                  } satisfies ExplorerOutletContext
                }
              />
            </div>
          </div>
        </MedplumProvider>
      )}
    </ConnectionGatedOutlet>
  );
}
