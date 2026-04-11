import { Alert, Stack, Title } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import type { ConnectionState } from '../../fhir/types';
import type { AppSettings } from '../../config/types';
import { ServerInfoCard } from './ServerInfoCard';

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

      {/* Resource types list will be added in Plan 03 */}
      <div />
    </Stack>
  );
}
