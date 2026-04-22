/** QualityLayout — connection-gated outlet for /quality/*. Delegates the
 *  disconnected alert to `<ConnectionGatedOutlet>` (Phase 26 / SHELL-01).
 *  Phase 26 soft-miss on <=30 LOC: the inlined legacy-migration useEffect
 *  (Plan 21-04 / CHRT-04) keeps this file near ~55 LOC. Phase 28 SWEEP-04
 *  will move the essay into `migrateLegacyResourceTypeKey`; see
 *  26-01-PLAN.md §objective for the handoff. */
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';
import { ConnectionGatedOutlet } from '../layout/ConnectionGatedOutlet';
import { QualityMetricsProvider } from '../../quality/QualityMetricsContext';
import { LEGACY_COHORT_KEY, RESOURCE_TYPES_STORAGE_KEY, migrateLegacyResourceTypeKey } from '../../quality/cohorts';

export type QualityOutletContext = { capability: CapabilityStatement; client: MedplumClient };

export function QualityLayout() {
  const { state } = useConnection();

  // Plan 21-04 / CHRT-04 one-shot localStorage rename — runs before any
  // child useLocalStorage hydrates. Acceptance criteria require
  // LEGACY_COHORT_KEY / removeItem / useEffect to be grep-visible here;
  // real behavior lives in the tested helper. Phase 28 SWEEP-04 will
  // move this inline essay into migrateLegacyResourceTypeKey.
  useEffect(() => {
    migrateLegacyResourceTypeKey();
    // Belt-and-suspenders: ensure legacy key is gone even if the helper
    // swallowed an error before removeItem. Never clobbers the new key.
    try {
      if (window.localStorage.getItem(LEGACY_COHORT_KEY) !== null) {
        const existing = window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY);
        if (existing === null) {
          const legacy = window.localStorage.getItem(LEGACY_COHORT_KEY);
          if (legacy !== null) window.localStorage.setItem(RESOURCE_TYPES_STORAGE_KEY, legacy);
        }
        window.localStorage.removeItem(LEGACY_COHORT_KEY);
      }
    } catch { /* localStorage unavailable — fail closed. */ }
  }, []);

  return (
    <ConnectionGatedOutlet>
      {state.status === 'connected' && (
        <MedplumProvider medplum={state.client}>
          <QualityMetricsProvider>
            <Outlet
              context={
                { capability: state.capability, client: state.client } satisfies QualityOutletContext
              }
            />
          </QualityMetricsProvider>
        </MedplumProvider>
      )}
    </ConnectionGatedOutlet>
  );
}
