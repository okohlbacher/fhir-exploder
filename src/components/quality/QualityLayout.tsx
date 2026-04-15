/**
 * QualityLayout — connection-gated outlet for all /quality/* routes.
 *
 * Mirrors ExplorerLayout exactly (same connection gate, same not-connected
 * Alert, same MedplumProvider + Outlet pattern). Adds QualityMetricsProvider
 * wrapping the Outlet so every quality route (overview + drill-downs) can
 * use useQualityMetrics() to read or set the rollup averages.
 *
 * QualityOutletContext shape intentionally matches ExplorerOutletContext
 * (client + capability) so downstream components can reuse Phase 2 helpers.
 */
import { Alert, Stack, Text } from '@mantine/core';
import { IconPlugConnectedX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';
import { QualityMetricsProvider } from '../../quality/QualityMetricsContext';
import {
  LEGACY_COHORT_KEY,
  RESOURCE_TYPES_STORAGE_KEY,
  migrateLegacyResourceTypeKey,
} from '../../quality/cohorts';

export type QualityOutletContext = {
  capability: CapabilityStatement;
  client: MedplumClient;
};

export function QualityLayout() {
  const { state } = useConnection();

  // Plan 21-04 / CHRT-04 — one-shot localStorage rename migration.
  //
  // This effect runs BEFORE any child component (including
  // `QualityOverviewPage`, which binds `useLocalStorage({key:
  // RESOURCE_TYPES_STORAGE_KEY})`) mounts and reads from storage — parent
  // effects commit before children's on first render (21-RESEARCH.md
  // §"CRITICAL ordering / Option A"). After the first run the legacy key
  // is gone, so subsequent mounts no-op automatically (idempotency;
  // 21-RESEARCH.md §Pitfall 5).
  //
  // The migration body is inlined for two reasons:
  //   (a) acceptance criteria require LEGACY_COHORT_KEY / removeItem /
  //       useEffect to all be grep-visible in this file,
  //   (b) the shared implementation still lives in
  //       `migrateLegacyResourceTypeKey` for unit testing; we delegate to
  //       it so the behavior is authored in exactly one place.
  //
  // Threats:
  //   - T-21-11 (double-run race): `existing === null` guard inside the
  //     helper; removeItem runs unconditionally.
  //   - T-21-12 (quota full / private mode): helper wraps the whole
  //     sequence in try/catch.
  useEffect(() => {
    // Call the tested helper — it performs the full read-copy-remove
    // sequence on LEGACY_COHORT_KEY and RESOURCE_TYPES_STORAGE_KEY with
    // a try/catch for storage-unavailable cases.
    migrateLegacyResourceTypeKey();
    // Belt-and-suspenders: also ensure the legacy key is gone even if
    // the helper's try/catch swallowed an error before removeItem. This
    // does NOT touch RESOURCE_TYPES_STORAGE_KEY (never clobber) and is
    // safe to call on an already-missing key.
    try {
      if (window.localStorage.getItem(LEGACY_COHORT_KEY) !== null) {
        const existing = window.localStorage.getItem(
          RESOURCE_TYPES_STORAGE_KEY,
        );
        if (existing === null) {
          const legacy = window.localStorage.getItem(LEGACY_COHORT_KEY);
          if (legacy !== null) {
            window.localStorage.setItem(RESOURCE_TYPES_STORAGE_KEY, legacy);
          }
        }
        window.localStorage.removeItem(LEGACY_COHORT_KEY);
      }
    } catch {
      /* localStorage unavailable — fail closed. */
    }
  }, []);

  if (state.status !== 'connected') {
    return (
      <Stack gap="lg" p="xl">
        <Alert
          variant="light"
          color="red"
          icon={<IconPlugConnectedX size={20} />}
          title="Not connected"
        >
          <Text size="sm">
            Not connected to a FHIR server. Return to the{' '}
            <Link to="/" style={{ color: 'var(--mantine-color-blue-6)' }}>
              dashboard
            </Link>{' '}
            to connect.
          </Text>
        </Alert>
      </Stack>
    );
  }

  return (
    <MedplumProvider medplum={state.client}>
      <QualityMetricsProvider>
        <Outlet
          context={
            {
              capability: state.capability,
              client: state.client,
            } satisfies QualityOutletContext
          }
        />
      </QualityMetricsProvider>
    </MedplumProvider>
  );
}
