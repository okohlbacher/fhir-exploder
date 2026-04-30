/**
 * ValidatorAuthSettingsModal — Phase 43 VAL-06 / D-02 / D-03 / D-19.
 *
 * Bearer-token entry/clear UI. The token is written ONLY to localStorage
 * under the versioned key VALIDATOR_BEARER_TOKEN_KEY; it NEVER roundtrips
 * through settings.yaml or the in-memory settings store (T-43-06 lock).
 *
 * Save semantics:
 *   - Non-empty input  → localStorage.setItem(KEY, token); close modal.
 *   - Empty input      → localStorage.removeItem(KEY); close modal.
 *   - Clear button     → localStorage.removeItem(KEY); reset input; modal stays open.
 *
 * Probe-cache invalidation: saving a new token dispatches a custom
 * `validator-bearer-token-changed` event. useConformanceRun's
 * `extSerialized` dep includes a length signature derived from the
 * bearer token, so a token change naturally re-builds the cascade
 * callback on the next render. The custom event is a UX nicety —
 * downstream consumers may listen for it to trigger immediate cache
 * resets without waiting for a render cycle.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Code,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
} from '@mantine/core';
import { IconShield } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

/**
 * SECURITY: NEVER serialize this key's value to disk. The token lives in
 * localStorage only — entered here, read fresh per call by the cascade,
 * cleared via the Clear button or by setting an empty value and saving.
 * See 43-CONTEXT.md D-01/D-02 + 43-RESEARCH.md Pitfall 7.
 */
const VALIDATOR_BEARER_TOKEN_KEY = 'validator.bearerToken.v1';
const TOKEN_CHANGED_EVENT = 'validator-bearer-token-changed';

interface ValidatorAuthSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  validatorUrl: string;
}

export function ValidatorAuthSettingsModal({
  opened,
  onClose,
  validatorUrl,
}: ValidatorAuthSettingsModalProps) {
  const [token, setToken] = useState('');

  // D-19 pre-fill: when the modal opens, read the current token from
  // localStorage so the user sees a masked-but-present value (rather than
  // an empty field that would silently nuke the saved token if they hit
  // Save without realizing).
  useEffect(() => {
    if (!opened) return;
    try {
      const existing = window.localStorage.getItem(VALIDATOR_BEARER_TOKEN_KEY) ?? '';
      setToken(existing);
    } catch {
      setToken('');
    }
  }, [opened]);

  const handleSave = useCallback(() => {
    try {
      const trimmed = token.trim();
      if (trimmed.length > 0) {
        window.localStorage.setItem(VALIDATOR_BEARER_TOKEN_KEY, trimmed);
        notifications.show({
          color: 'green',
          title: 'Bearer token saved',
          message: 'The token will be used on the next validation run.',
        });
      } else {
        window.localStorage.removeItem(VALIDATOR_BEARER_TOKEN_KEY);
        notifications.show({
          color: 'green',
          title: 'Bearer token cleared',
          message: 'No token will be sent on the next validation run.',
        });
      }
      // Probe-cache invalidation hint (T-43-04). Consumers may listen on
      // window for this event to wipe cached probe results immediately
      // rather than waiting for a render cycle.
      window.dispatchEvent(new CustomEvent(TOKEN_CHANGED_EVENT));
    } catch {
      // localStorage may throw on quota / private browsing; silently
      // ignore — the cascade will simply continue using the prior token
      // (or fall through to auth-missing if there was none).
    }
    onClose();
  }, [token, onClose]);

  const handleClear = useCallback(() => {
    try {
      window.localStorage.removeItem(VALIDATOR_BEARER_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent(TOKEN_CHANGED_EVENT));
    } catch {
      // best-effort
    }
    setToken('');
    notifications.show({
      color: 'green',
      title: 'Bearer token cleared',
      message: 'Enter a new token and click Save, or Cancel to dismiss.',
    });
    // Modal stays open so the user can paste a new token if desired.
  }, []);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconShield size={20} color="var(--mantine-color-blue-6)" />
          Validator Bearer Token
        </Group>
      }
      centered
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Enter a bearer token for the configured external validator. The
          token is stored locally in this browser only — it is never written
          to <Code>settings.yaml</Code> or sent anywhere besides the
          validator URL below.
        </Text>
        <div>
          <Text size="xs" fw={500} mb={4}>
            Validator URL
          </Text>
          <Code block>{validatorUrl || '(not configured)'}</Code>
        </div>

        <PasswordInput
          label="Bearer token"
          placeholder="Paste token here"
          value={token}
          onChange={(e) => setToken(e.currentTarget.value)}
          description="Saved to browser localStorage as 'validator.bearerToken.v1'. Never written to disk."
          autoComplete="off"
        />

        <Group justify="space-between">
          <Button variant="subtle" color="red" onClick={handleClear}>
            Clear token
          </Button>
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Test/consumer helper — re-export the storage key + event name so tests
 * and other modules can match what the modal writes/dispatches without
 * hard-coding the literal strings.
 */
export const VALIDATOR_BEARER_TOKEN_STORAGE_KEY = VALIDATOR_BEARER_TOKEN_KEY;
export const VALIDATOR_BEARER_TOKEN_CHANGED_EVENT = TOKEN_CHANGED_EVENT;
