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
import { Link, Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';
import { QualityMetricsProvider } from '../../quality/QualityMetricsContext';

export type QualityOutletContext = {
  capability: CapabilityStatement;
  client: MedplumClient;
};

export function QualityLayout() {
  const { state } = useConnection();

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
