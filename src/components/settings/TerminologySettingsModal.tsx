import { useCallback, useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import { useSettings } from '../../hooks/useSettings';

interface TerminologySettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function TerminologySettingsModal({ opened, onClose }: TerminologySettingsModalProps) {
  const { settings, setSettings } = useSettings();
  const [serverUrl, setServerUrl] = useState('');

  // Re-initialize from live settings each time modal opens
  useEffect(() => {
    if (opened && settings) {
      setServerUrl(settings.terminology?.serverUrl ?? '');
    }
  }, [opened, settings]);

  const handleSave = useCallback(() => {
    if (!settings) return;
    setSettings({
      ...settings,
      terminology: { serverUrl: serverUrl.trim() || undefined },
    });
    onClose();
  }, [settings, serverUrl, setSettings, onClose]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconLanguage size={20} color="var(--mantine-color-blue-6)" />
          Terminology Server Settings
        </Group>
      }
      centered
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Server URL"
          placeholder="https://r4.ontoserver.csiro.au/fhir"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.currentTarget.value)}
          description="Leave empty to disable terminology resolution (raw codes will be displayed)"
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
