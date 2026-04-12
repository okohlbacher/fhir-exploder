import { Alert, Box, Button, Code, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { AppSettings } from '../../config/types';
import { useTerminology } from '../../hooks/useTerminology';
import { useTerminologyHealth } from '../../hooks/useTerminologyHealth';
import { TERMINOLOGY_STATUS_CONFIG } from '../../terminology/statusConfig';
import { clearAllQualityMetrics } from '../../quality/metricsCache';

interface SettingsPageProps {
  settings: AppSettings | null;
  usingDefaults: boolean;
}

function maskToken(token: string): string {
  if (token.length <= 20) return '****';
  return token.slice(0, 20) + '...';
}

export function SettingsPage({ settings, usingDefaults }: SettingsPageProps) {
  const resolver = useTerminology();
  const termHealth = useTerminologyHealth();
  const termStatus = TERMINOLOGY_STATUS_CONFIG[termHealth];

  function handleClearCache() {
    const beforeSize = resolver.cache.size();
    resolver.cache.clear();
    const message =
      beforeSize === 0
        ? 'No cached terms to clear.'
        : beforeSize === 1
          ? '1 cached term removed from memory and local storage.'
          : `${beforeSize} cached terms removed from memory and local storage.`;
    notifications.show({
      color: 'green',
      title: 'Cache cleared',
      message,
    });
  }

  function handleClearMetricsCache() {
    const removed = clearAllQualityMetrics();
    const message =
      removed === 0
        ? 'No cached metrics to clear.'
        : removed === 1
          ? '1 cached metric removed from local storage.'
          : `${removed} cached metrics removed from local storage.`;
    notifications.show({
      color: 'green',
      title: 'Cache cleared',
      message,
    });
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

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
        <Paper p="lg" shadow="xs">
          <Stack gap="sm">
            <div>
              <Text fw={600} mb={4}>
                Server URL:
              </Text>
              <Code>{settings.fhir.serverUrl}</Code>
            </div>

            <div>
              <Text fw={600} mb={4}>
                Auth Mode:
              </Text>
              <Code>{settings.fhir.auth.mode}</Code>
            </div>

            {settings.fhir.auth.mode === 'basic' && settings.fhir.auth.username && (
              <>
                <div>
                  <Text fw={600} mb={4}>
                    Username:
                  </Text>
                  <Code>{settings.fhir.auth.username}</Code>
                </div>
                <div>
                  <Text fw={600} mb={4}>
                    Password:
                  </Text>
                  <Code>****</Code>
                </div>
              </>
            )}

            {settings.fhir.auth.mode === 'bearer' && settings.fhir.auth.token && (
              <div>
                <Text fw={600} mb={4}>
                  Token:
                </Text>
                <Code>{maskToken(settings.fhir.auth.token)}</Code>
              </div>
            )}
          </Stack>
        </Paper>
      )}

      <Paper p="lg" shadow="xs">
        <Stack gap="sm">
          <Title order={3}>Terminology Server</Title>

          <div>
            <Text fw={600} size="sm" mb={4}>
              Server URL
            </Text>
            {settings?.terminology?.serverUrl ? (
              <Code>{settings.terminology.serverUrl}</Code>
            ) : (
              <Text c="dimmed" size="sm">
                Not configured — set terminology.serverUrl in settings.yaml
              </Text>
            )}
          </div>

          <div>
            <Text fw={600} size="sm" mb={4}>
              Status
            </Text>
            <Group gap="xs">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: termStatus.color,
                  animation: termStatus.pulse
                    ? 'pulse 1.5s ease-in-out infinite'
                    : undefined,
                }}
              />
              <Text size="sm">{termStatus.label.replace(/^Terminology: /, '')}</Text>
            </Group>
          </div>

          <div>
            <Button
              variant="light"
              color="red"
              size="sm"
              leftSection={<IconTrash size={16} />}
              onClick={handleClearCache}
            >
              Clear terminology cache
            </Button>
          </div>
        </Stack>
      </Paper>

      <Paper p="lg" shadow="xs">
        <Stack gap="sm">
          <Title order={3}>Validation</Title>

          <div>
            <Text fw={600} size="sm" mb={4}>
              External validator URL
            </Text>
            {settings?.validation?.validatorUrl ? (
              <Code>{settings.validation.validatorUrl}</Code>
            ) : (
              <Text c="dimmed" size="sm">
                Not configured — set validation.validatorUrl in settings.yaml to enable external
                $validate. Structural validation against bundled MII profiles runs without this.
              </Text>
            )}
          </div>

          <div>
            <Text fw={600} size="sm" mb={4}>
              Batch size
            </Text>
            <Code>{settings?.validation?.batchSize ?? 25}</Code>
          </div>

          <div>
            <Button
              variant="light"
              color="red"
              size="sm"
              leftSection={<IconTrash size={16} />}
              onClick={handleClearMetricsCache}
            >
              Clear metrics cache
            </Button>
          </div>
        </Stack>
      </Paper>

      <Text c="dimmed" size="sm">
        Edit public/settings.yaml to change configuration. Restart the app to apply changes.
      </Text>
    </Stack>
  );
}
