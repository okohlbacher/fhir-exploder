/**
 * EditCohortModal — Plan 22-03 Task 2 (CHRT-07 Edit flow).
 *
 * Size-lg modal wrapping `CohortBuilderForm` in Edit mode. Renders an
 * in-body heading (`<Text fw={600} size="sm" id="edit-cohort-modal-heading">
 * Edit cohort</Text>`) referenced by `aria-labelledby` on the `<Modal>` so
 * the 4-size typography budget (xs/sm/md/lg) is preserved per Phase-21
 * UI-SPEC and Phase-22 UI-SPEC §S5.
 *
 * Active-cohort Alert (D-10): when `cohort.id === activeCohortId` we surface
 * a blue informational Alert explaining that saving will trigger dashboard
 * recompute. This is INFORMATIONAL only — it does NOT block Save.
 *
 * Pitfall 5 (stale form state): `key={cohort.id}` on the inner form forces
 * remount whenever the user opens the modal for a different cohort, so
 * state from the previous Edit session can't leak across.
 *
 * DatesProvider wrap: the modal renders in a portal outside the app-root
 * DatesProvider, so we re-wrap the form to ensure `DatePickerInput` still
 * sees the `'en'` locale (UI-SPEC §S5).
 *
 * Threat mitigations (22-PLAN.md §threat_model):
 *   - T-22-16 (XSS via cohort name): React interpolation escapes HTML.
 *   - T-22-17 (confused deputy / stale modal): key={cohort.id} remount.
 */
import { Modal, Stack, Text, Alert } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { JSX } from 'react';
import { CohortBuilderForm } from './CohortBuilderForm';
import type { CohortCriterion, CohortDefinition } from '../../quality/cohorts';
import { useCohorts } from '../../hooks/useCohorts';

export interface EditCohortModalProps {
  /** When null, modal is closed. */
  cohort: CohortDefinition | null;
  onClose: () => void;
}

export function EditCohortModal({
  cohort,
  onClose,
}: EditCohortModalProps): JSX.Element {
  const { cohorts, activeCohortId, updateCohort } = useCohorts();
  const open = cohort !== null;
  const otherNames = cohorts
    .filter((c) => c.id !== cohort?.id)
    .map((c) => c.name);

  const handleSave = (input: {
    name: string;
    criteria: CohortCriterion[];
  }): void => {
    if (!cohort) return;
    try {
      const updated = updateCohort(cohort.id, input);
      notifications.show({
        color: 'blue',
        title: 'Cohort updated',
        message: `"${updated.name}" updated. Dashboard scope refreshed.`,
        autoClose: 2500,
      });
      onClose();
    } catch (err) {
      // `useCohorts.updateCohort` already surfaces the red toast on
      // QuotaExceededError via its internal probe; non-quota errors we
      // surface generically so the user sees SOMETHING rather than a
      // silent no-op.
      if (!(err instanceof DOMException && err.name === 'QuotaExceededError')) {
        notifications.show({
          color: 'red',
          title: 'Update failed',
          message:
            'Could not save changes to browser storage. Your browser may be in private mode or out of space.',
          autoClose: 6000,
        });
      }
      // Modal stays open — user can retry without losing form state.
    }
  };

  return (
    <Modal
      opened={open}
      onClose={onClose}
      centered
      size="lg"
      radius="sm"
      aria-labelledby="edit-cohort-modal-heading"
    >
      {cohort && (
        <Stack gap="md">
          <Text fw={600} size="sm" id="edit-cohort-modal-heading">
            Edit cohort
          </Text>
          <Text size="sm" c="dimmed">
            Editing &quot;{cohort.name}&quot;. Saved changes are immediately
            reflected in any active dashboard scope.
          </Text>
          {cohort.id === activeCohortId && (
            <Alert
              color="blue"
              variant="light"
              icon={<IconInfoCircle size={16} />}
            >
              This cohort is currently active. Saving will trigger recompute
              on the dashboard.
            </Alert>
          )}
          <DatesProvider settings={{ locale: 'en' }}>
            <CohortBuilderForm
              key={cohort.id}
              mode="edit"
              initialCohort={cohort}
              existingNames={otherNames}
              onSaved={() => {}}
              onSave={handleSave}
              onDiscard={onClose}
            />
          </DatesProvider>
        </Stack>
      )}
    </Modal>
  );
}
