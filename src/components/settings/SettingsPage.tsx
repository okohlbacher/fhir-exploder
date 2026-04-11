import { Alert, Code, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { AppSettings } from '../../config/types';

interface SettingsPageProps {
  settings: AppSettings | null;
  usingDefaults: boolean;
}

function maskToken(token: string): string {
  if (token.length <= 20) return '****';
  return token.slice(0, 20) + '...';
}

export function SettingsPage({ settings, usingDefaults }: SettingsPageProps) {
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

            {settings.terminology?.serverUrl && (
              <div>
                <Text fw={600} mb={4}>
                  Terminology Server:
                </Text>
                <Code>{settings.terminology.serverUrl}</Code>
              </div>
            )}
          </Stack>
        </Paper>
      )}

      <Text c="dimmed" size="sm">
        Edit public/settings.yaml to change configuration. Restart the app to apply changes.
      </Text>
    </Stack>
  );
}
