import { Button, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import type { ConnectionState } from '../../fhir/types';
import type { AppSettings } from '../../config/types';

interface ServerInfoCardProps {
  settings: AppSettings;
  connectionState: ConnectionState;
  onConnect: () => void;
}

function formatAuthMode(mode: string): string {
  switch (mode) {
    case 'open':
      return 'Open';
    case 'basic':
      return 'Basic Auth';
    case 'bearer':
      return 'Bearer Token';
    default:
      return mode;
  }
}

export function ServerInfoCard({ settings, connectionState, onConnect }: ServerInfoCardProps) {
  const { status } = connectionState;

  const serverName =
    status === 'connected' ? connectionState.capability.software?.name : undefined;
  const serverVersion =
    status === 'connected' ? connectionState.capability.software?.version : undefined;

  return (
    <Paper p="lg" shadow="xs">
      <Stack gap="sm">
        <Group gap="xs">
          <Text fw={600}>Server URL:</Text>
          <Text>{settings.fhir.serverUrl}</Text>
        </Group>

        <Group gap="xs">
          <Text fw={600}>Auth Mode:</Text>
          <Text>{formatAuthMode(settings.fhir.auth.mode)}</Text>
        </Group>

        {status === 'connected' && serverName && (
          <Group gap="xs">
            <Text fw={600}>Server:</Text>
            <Text>
              {serverName}
              {serverVersion ? ` (${serverVersion})` : ''}
            </Text>
          </Group>
        )}

        {status === 'idle' && (
          <Button variant="filled" color="blue" size="md" onClick={onConnect}>
            Connect to Server
          </Button>
        )}

        {status === 'connecting' && (
          <Button variant="filled" color="blue" size="md" disabled>
            <Group gap="xs">
              <Loader size="xs" color="white" />
              <span>Connecting...</span>
            </Group>
          </Button>
        )}

        {status === 'connected' && (
          <Button variant="outline" color="green" size="md" disabled>
            Connected
          </Button>
        )}

        {status === 'error' && (
          <Button variant="filled" color="blue" size="md" onClick={onConnect}>
            Retry Connection
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
