import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Group,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconPlugConnected,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { AppSettings } from '../../config/types';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import { useSettings } from '../../hooks/useSettings';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { createFhirClient } from '../../fhir/client';
import { useTerminology } from '../../hooks/useTerminology';
import { useTerminologyHealth } from '../../hooks/useTerminologyHealth';
import { TERMINOLOGY_STATUS_CONFIG } from '../../terminology/statusConfig';
import { clearAllQualityMetrics } from '../../quality/metricsCache';
import { clearAllQualityCountCache } from '../../hooks/useResourceCounts';

interface SettingsPageProps {
  settings: AppSettings | null;
  usingDefaults: boolean;
}

type AuthMode = 'open' | 'basic' | 'bearer';
type TestStatus =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; software?: string; version?: string }
  | { kind: 'error'; message: string };

export function SettingsPage({ settings, usingDefaults }: SettingsPageProps) {
  const { setSettings } = useSettings();
  const connection = useConnectionContext();
  const resolver = useTerminology();
  const termHealth = useTerminologyHealth();
  const termStatus = TERMINOLOGY_STATUS_CONFIG[termHealth];

  // Local form state for the FHIR section. Synced from `settings` whenever the
  // upstream settings change (e.g. modal save, hydration on mount).
  const [serverUrl, setServerUrl] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('open');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>({ kind: 'idle' });

  useEffect(() => {
    if (settings) {
      setServerUrl(settings.fhir.serverUrl);
      setAuthMode(settings.fhir.auth.mode);
      setUsername(settings.fhir.auth.username ?? '');
      setPassword(settings.fhir.auth.password ?? '');
      setToken(settings.fhir.auth.token ?? '');
      // Reset test feedback whenever settings change — the previous result
      // referred to the old URL.
      setTestStatus({ kind: 'idle' });
    }
  }, [settings]);

  function buildCandidateSettings(): AppSettings | null {
    if (!settings) return null;
    return {
      ...settings,
      fhir: {
        serverUrl,
        auth: {
          mode: authMode,
          ...(authMode === 'basic' ? { username, password } : {}),
          ...(authMode === 'bearer' ? { token } : {}),
        },
      },
    };
  }

  async function handleTestConnection() {
    const candidate = buildCandidateSettings();
    if (!candidate) return;
    setTestStatus({ kind: 'testing' });
    try {
      const client = createFhirClient(candidate);
      const raw = await client.get(client.fhirUrl('metadata').toString());
      const capability =
        typeof raw === 'string' ? (JSON.parse(raw) as CapabilityStatement) : (raw as CapabilityStatement);
      if (!capability || capability.resourceType !== 'CapabilityStatement') {
        throw new Error('Endpoint did not return a CapabilityStatement');
      }
      setTestStatus({
        kind: 'ok',
        software: capability.software?.name,
        version: capability.software?.version,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Connection failed';
      setTestStatus({ kind: 'error', message });
    }
  }

  function handleSaveAndConnect() {
    const candidate = buildCandidateSettings();
    if (!candidate) return;
    setSettings(candidate);
    connection.connect(candidate);
    notifications.show({
      color: 'green',
      title: 'Settings saved',
      message: 'Reconnecting to ' + candidate.fhir.serverUrl,
    });
  }

  function handleResetForm() {
    if (!settings) return;
    setServerUrl(settings.fhir.serverUrl);
    setAuthMode(settings.fhir.auth.mode);
    setUsername(settings.fhir.auth.username ?? '');
    setPassword(settings.fhir.auth.password ?? '');
    setToken(settings.fhir.auth.token ?? '');
    setTestStatus({ kind: 'idle' });
  }

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
    clearAllQualityCountCache();
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

  const formIsDirty =
    !!settings &&
    (serverUrl !== settings.fhir.serverUrl ||
      authMode !== settings.fhir.auth.mode ||
      (authMode === 'basic' &&
        (username !== (settings.fhir.auth.username ?? '') ||
          password !== (settings.fhir.auth.password ?? ''))) ||
      (authMode === 'bearer' && token !== (settings.fhir.auth.token ?? '')));

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
          Using default settings (localhost:8080, open auth). Edit the FHIR fields below or
          create a settings.yaml file to customize. Changes you make here are persisted to
          local storage and survive reload.
        </Alert>
      )}

      <Paper p="lg" shadow="xs">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={3}>FHIR Server</Title>
            {formIsDirty && (
              <Badge color="yellow" variant="light">Unsaved changes</Badge>
            )}
          </Group>

          <TextInput
            label="Server URL"
            description="Full URL including the FHIR base path, e.g. http://localhost:8080/fhir"
            placeholder="http://localhost:8080/fhir"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.currentTarget.value)}
          />

          <Select
            label="Auth Mode"
            data={[
              { value: 'open', label: 'Open (no auth)' },
              { value: 'basic', label: 'Basic Auth' },
              { value: 'bearer', label: 'Bearer Token' },
            ]}
            value={authMode}
            onChange={(v) => setAuthMode(((v ?? 'open') as AuthMode))}
            allowDeselect={false}
          />

          {authMode === 'basic' && (
            <Group grow>
              <TextInput
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
            </Group>
          )}

          {authMode === 'bearer' && (
            <PasswordInput
              label="Bearer Token"
              value={token}
              onChange={(e) => setToken(e.currentTarget.value)}
            />
          )}

          {testStatus.kind === 'ok' && (
            <Alert
              color="green"
              variant="light"
              icon={<IconCheck size={18} />}
              title="Connection succeeded"
            >
              CapabilityStatement returned successfully
              {testStatus.software ? ` from ${testStatus.software}` : ''}
              {testStatus.version ? ` (${testStatus.version})` : ''}.
            </Alert>
          )}

          {testStatus.kind === 'error' && (
            <Alert
              color="red"
              variant="light"
              icon={<IconX size={18} />}
              title="Connection failed"
            >
              <Code block>{testStatus.message}</Code>
            </Alert>
          )}

          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconPlugConnected size={16} />}
              onClick={handleTestConnection}
              loading={testStatus.kind === 'testing'}
              disabled={!serverUrl.trim()}
              aria-label="Test FHIR server connection without saving"
            >
              Test connection
            </Button>
            <Button
              onClick={handleSaveAndConnect}
              disabled={!formIsDirty || !serverUrl.trim()}
              aria-label="Save FHIR settings and reconnect"
            >
              Save & Connect
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={handleResetForm}
              disabled={!formIsDirty}
              aria-label="Discard unsaved changes"
            >
              Reset
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            Settings persist in local storage (<Code>fhirExplorer.settings.v1</Code>) and survive
            browser reload. To revert to the on-disk defaults, clear that key in DevTools →
            Application → Local Storage and reload.
          </Text>
        </Stack>
      </Paper>

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
        FHIR server settings above are editable and persist in local storage. Other sections
        (Terminology, Validation) read from public/settings.yaml — restart the app after editing
        that file.
      </Text>
    </Stack>
  );
}
