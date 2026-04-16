/**
 * DeleteCohortModal — Plan 22-03 Task 2 (CHRT-07 Delete flow).
 *
 * Size-sm confirm modal with:
 *   - in-body heading `<Text fw={600} size="sm" id="delete-cohort-modal-heading">
 *     Delete cohort</Text>` referenced by `aria-labelledby`
 *   - body paragraph: `Delete the cohort "{cohort.name}"? This cannot be undone.`
 *   - optional dimmed sub-line when `cohort.id === activeCohortId`:
 *     `This cohort is currently active. Panels will revert to analyzing all patients.`
 *   - Discard + red Delete cohort buttons
 *   - during submit: `closeOnClickOutside=false`, `closeOnEscape=false`,
 *     Discard disabled, Delete button in loading state
 *
 * Toast copy is locked in UI-SPEC §Notifications Contract:
 *   - success (inactive): `'"{name}" was removed.'`
 *   - success (active):   `'"{name}" was removed. Panels now analyze all patients.'`
 *   - failure (non-quota): `'Could not delete cohort from browser storage. Try again or reload the page.'`
 *
 * Threat mitigations:
 *   - T-22-15 (ghost active cohort): `deleteCohort` clears `activeCohortId`
 *     atomically; toast reflects the active state at delete time.
 *   - T-22-16 (XSS via cohort name): React interpolation escapes HTML.
 */
import { Modal, Stack, Text, Group, Button } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import type { JSX } from 'react';
import type { CohortDefinition } from '../../quality/cohorts';
import { useCohorts } from '../../hooks/useCohorts';

export interface DeleteCohortModalProps {
  /** When null, modal is closed. */
  cohort: CohortDefinition | null;
  onClose: () => void;
}

export function DeleteCohortModal({
  cohort,
  onClose,
}: DeleteCohortModalProps): JSX.Element {
  const { activeCohortId, deleteCohort } = useCohorts();
  const [submitting, setSubmitting] = useState(false);
  const open = cohort !== null;

  const handleConfirm = (): void => {
    if (!cohort) return;
    setSubmitting(true);
    try {
      const wasActive = cohort.id === activeCohortId;
      deleteCohort(cohort.id);
      notifications.show({
        color: 'blue',
        title: 'Cohort deleted',
        message: wasActive
          ? `"${cohort.name}" was removed. Panels now analyze all patients.`
          : `"${cohort.name}" was removed.`,
        autoClose: 2500,
      });
      onClose();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'QuotaExceededError')) {
        notifications.show({
          color: 'red',
          title: 'Delete failed',
          message:
            'Could not delete cohort from browser storage. Try again or reload the page.',
          autoClose: 6000,
        });
      }
      // Modal stays open on failure so user can retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={open}
      onClose={submitting ? () => undefined : onClose}
      centered
      size="sm"
      radius="sm"
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
      aria-labelledby="delete-cohort-modal-heading"
    >
      {cohort && (
        <Stack gap="md">
          <Text fw={600} size="sm" id="delete-cohort-modal-heading">
            Delete cohort
          </Text>
          <Text size="sm">
            Delete the cohort &quot;{cohort.name}&quot;? This cannot be undone.
          </Text>
          {cohort.id === activeCohortId && (
            <Text size="sm" c="dimmed">
              This cohort is currently active. Panels will revert to analyzing
              all patients.
            </Text>
          )}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={onClose}
              disabled={submitting}
            >
              Discard
            </Button>
            <Button
              variant="filled"
              color="red"
              leftSection={<IconTrash size={16} />}
              loading={submitting}
              onClick={handleConfirm}
            >
              Delete cohort
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
