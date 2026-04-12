import { useCallback, useEffect, useState } from 'react';
import { Button, Group, Modal, PasswordInput, Select, Stack, TextInput } from '@mantine/core';
import { IconServer } from '@tabler/icons-react';
import { useSettings } from '../../hooks/useSettings';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import type { AppSettings } from '../../config/types';

interface FhirSettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function FhirSettingsModal({ opened, onClose }: FhirSettingsModalProps) {
  const { settings, setSettings } = useSettings();
  const connection = useConnectionContext();

  const [serverUrl, setServerUrl] = useState('');
  const [authMode, setAuthMode] = useState<'open' | 'basic' | 'bearer'>('open');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  // Re-initialize form from live settings each time modal opens
  useEffect(() => {
    if (opened && settings) {
      setServerUrl(settings.fhir.serverUrl);
      setAuthMode(settings.fhir.auth.mode);
      setUsername(settings.fhir.auth.username ?? '');
      setPassword(settings.fhir.auth.password ?? '');
      setToken(settings.fhir.auth.token ?? '');
    }
  }, [opened, settings]);

  const handleSave = useCallback(() => {
    if (!settings) return;
    const newSettings: AppSettings = {
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
    setSettings(newSettings);
    connection.connect(newSettings);
    onClose();
  }, [settings, serverUrl, authMode, username, password, token, setSettings, connection, onClose]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconServer size={20} color="var(--mantine-color-blue-6)" />
          FHIR Server Settings
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <TextInput
          label="Server URL"
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
          onChange={(v) => setAuthMode((v as 'open' | 'basic' | 'bearer') ?? 'open')}
          allowDeselect={false}
        />

        {authMode === 'basic' && (
          <>
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
          </>
        )}

        {authMode === 'bearer' && (
          <PasswordInput
            label="Token"
            value={token}
            onChange={(e) => setToken(e.currentTarget.value)}
          />
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!serverUrl.trim()}>
            Save & Connect
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
