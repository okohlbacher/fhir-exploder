import { Alert, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import type { ConnectionState } from '../../fhir/types';
import type { AppSettings } from '../../config/types';
import { parseResourceTypes } from '../../fhir/capability';
import { useResourceCounts } from '../../hooks/useResourceCounts';
import { ServerInfoCard } from './ServerInfoCard';
import { ResourceTypeList } from './ResourceTypeList';
import { MedplumCompatGate } from './MedplumCompatGate';
import { useMemo } from 'react';

interface DashboardPageProps {
  settings: AppSettings | null;
  usingDefaults: boolean;
  connectionState: ConnectionState;
  onConnect: () => void;
}

const ERROR_TITLES: Record<string, string> = {
  network: 'Cannot reach FHIR server',
  auth: 'Authentication failed',
  invalid_response: 'Unexpected server response',
  unknown: 'Connection failed',
};

export function DashboardPage({
  settings,
  usingDefaults,
  connectionState,
  onConnect,
}: DashboardPageProps) {
  const resourceTypes = useMemo(() => {
    if (connectionState.status === 'connected') {
      return parseResourceTypes(connectionState.capability);
    }
    return [];
  }, [connectionState]);

  const resourceTypeNames = useMemo(
    () => resourceTypes.map(rt => rt.type),
    [resourceTypes]
  );

  const client = connectionState.status === 'connected' ? connectionState.client : null;
  const counts = useResourceCounts(client, resourceTypeNames);

  return (
    <Stack gap="lg">
      <Title order={2}>Server Connection</Title>

      {usingDefaults && (
        <Alert
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={20} />}
          title="Using default settings"
        >
          Using default settings (localhost:8080, open auth). Create a settings.yaml file to
          customize.
        </Alert>
      )}

      {settings && (
        <ServerInfoCard
          settings={settings}
          connectionState={connectionState}
          onConnect={onConnect}
        />
      )}

      {connectionState.status === 'error' && (
        <Alert
          variant="light"
          color="red"
          icon={<IconAlertCircle size={20} />}
          title={ERROR_TITLES[connectionState.error.type] ?? 'Connection failed'}
        >
          {connectionState.error.message}
          {'\n'}
          {connectionState.error.suggestion}
        </Alert>
      )}

      {connectionState.status === 'connected' && (
        <Alert
          variant="light"
          color="green"
          icon={<IconCircleCheck size={20} />}
          title="Connected"
        >
          Connected to{' '}
          {connectionState.capability.software?.name ?? 'FHIR Server'}
          {connectionState.capability.software?.version
            ? ` (${connectionState.capability.software.version})`
            : ''}
        </Alert>
      )}

      {connectionState.status === 'connected' && (
        <>
          <ResourceTypeList resourceTypes={resourceTypes} counts={counts} />
          <MedplumCompatGate
            client={connectionState.client}
            resourceTypes={resourceTypeNames}
          />
        </>
      )}

      {connectionState.status !== 'connected' && connectionState.status !== 'connecting' && (
        <Stack align="center" py="xl">
          <Title order={3}>Not Connected</Title>
          <Text c="dimmed">
            Configure your FHIR server in settings.yaml and click Connect to begin exploring.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
