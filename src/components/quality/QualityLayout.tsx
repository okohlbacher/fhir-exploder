/** QualityLayout — connection-gated outlet for /quality/*. Delegates the
 *  disconnected alert to `<ConnectionGatedOutlet>` (Phase 26 / SHELL-01) and
 *  the one-shot legacy-key migration to `migrateLegacyResourceTypeKey`
 *  (Plan 21-04 / CHRT-04, consolidated in Phase 28 SWEEP-04). */
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';
import { ConnectionGatedOutlet } from '../layout/ConnectionGatedOutlet';
import { QualityMetricsProviders } from '../../quality/metrics';
import { migrateLegacyResourceTypeKey } from '../../quality/cohorts';

export type QualityOutletContext = { capability: CapabilityStatement; client: MedplumClient };

export function QualityLayout() {
  const { state } = useConnection();

  useEffect(() => {
    migrateLegacyResourceTypeKey();
  }, []);

  return (
    <ConnectionGatedOutlet>
      {state.status === 'connected' && (
        <MedplumProvider medplum={state.client}>
          <QualityMetricsProviders>
            <Outlet context={{ capability: state.capability, client: state.client } satisfies QualityOutletContext} />
          </QualityMetricsProviders>
        </MedplumProvider>
      )}
    </ConnectionGatedOutlet>
  );
}
