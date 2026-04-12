import { Alert, Stack, Text } from '@mantine/core';
import { IconPlugConnectedX } from '@tabler/icons-react';
import { Link, Outlet } from 'react-router-dom';
import { MedplumProvider } from '@medplum/react';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { useConnection } from '../../hooks/useConnection';

export type PatientsOutletContext = {
  capability: CapabilityStatement;
  client: MedplumClient;
};

/**
 * Patients route layout that gates on connection status.
 *
 * Mirrors ExplorerLayout: when connected, wraps children in MedplumProvider
 * so all Medplum React components and hooks have access to the MedplumClient
 * configured for the current Blaze server. When not connected, shows an
 * error alert with a link back to the dashboard.
 *
 * All nested /patients routes (list, detail, patient-scoped resource detail)
 * rely on this layout for connection state and context propagation.
 */
export function PatientsLayout() {
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
      <Outlet
        context={
          {
            capability: state.capability,
            client: state.client,
          } satisfies PatientsOutletContext
        }
      />
    </MedplumProvider>
  );
}
