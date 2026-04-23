/**
 * CohortsPage — /quality/cohorts.
 *
 * Phase 21 (Plan 21-05 T-5.3): saved-cohorts list + new-cohort builder form.
 * Phase 22 (Plan 22-03 Task 2): toolbar Import button + per-row Menu
 * (Edit / Duplicate / Export / Delete) + Import/Export handlers with
 * the 11 toast notifications locked in UI-SPEC §Notifications Contract.
 *
 * Chrome mirrors `ThresholdsPage.tsx:156-229` verbatim (Back anchor, Title,
 * Paper cards, `<Stack gap="lg" p="xl">`).
 *
 * Hydration gate (21-RESEARCH.md §Pitfall 1): until `useCohorts.hydrated`
 * flips true we render Skeletons.
 *
 * Threat mitigations:
 *   - T-21-03 (PHI in UI): saved-row metadata never shows individual
 *     patient IDs.
 *   - T-21-01 / T-22-16 (XSS via cohort name): every cohort name + metadata
 *     rendered via React text nodes (auto-escaped); no dangerouslySetInnerHTML.
 *   - T-22-12 (filename injection): `slugifyCohortName` strips anything
 *     outside `[a-z0-9]+` before handing to `downloadString`.
 *   - T-22-13 (DoS / huge file): two-layer cap — `file.size` vs
 *     MAX_FDPG_FILE_BYTES BEFORE `file.text()`, codec re-checks after.
 */
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  FileButton,
  Group,
  Menu,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconCopy,
  IconDots,
  IconDownload,
  IconEdit,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { JSX } from 'react';
import { useCohorts } from '../../hooks/useCohorts';
import type {
  CohortCriterion,
  CohortDefinition,
} from '../../quality/cohorts';
import {
  FdpgCodecError,
  MAX_FDPG_FILE_BYTES,
  cohortToFdpgSq,
  fdpgSqToCohort,
} from '../../quality/fdpgCodec';
import { downloadString } from '../../utils/export';
import { CohortBuilderForm } from './CohortBuilderForm';
import { DeleteCohortModal } from './DeleteCohortModal';
import { EditCohortModal } from './EditCohortModal';

function formatCreatedDate(iso: string): string {
  // Matches existing dashboard convention: short numeric date so the metadata
  // line stays terse. No time component because "created at second-precision"
  // is noise for this UI.
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

function summarizeCriteria(criteria: CohortCriterion[]): string {
  const parts: string[] = [];
  for (const c of criteria) {
    if (c.type === 'date-range') {
      parts.push('Date range');
    } else if (c.type === 'condition-code') {
      parts.push('Condition code');
    } else if (c.type === 'reference-list') {
      const n = c.patientIds.length;
      parts.push(`${n} patient ref${n === 1 ? '' : 's'}`);
    } else if (c.type === 'fhirpath') {
      parts.push('FHIRPath');
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'No criteria';
}

function hasFhirpathCriterion(cohort: CohortDefinition): boolean {
  return cohort.criteria.some((c) => c.type === 'fhirpath');
}

/**
 * T-22-12 mitigation: filenames built from user-controlled cohort names are
 * normalised to `[a-z0-9-]+` so path traversal / control chars / OS reserved
 * names can't sneak through. Falls back to `'cohort'` on fully-empty input.
 */
function slugifyCohortName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cohort'
  );
}

interface SavedCohortRowProps {
  cohort: CohortDefinition;
  isActive: boolean;
  onEdit: (c: CohortDefinition) => void;
  onDuplicate: (c: CohortDefinition) => void;
  onExport: (c: CohortDefinition) => void;
  onDelete: (c: CohortDefinition) => void;
}

function SavedCohortRow({
  cohort,
  isActive,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: SavedCohortRowProps): JSX.Element {
  const fhirpathPresent = hasFhirpathCriterion(cohort);

  return (
    <Group justify="space-between" align="center" wrap="wrap">
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {cohort.name}
        </Text>
        <Text size="xs" c="dimmed">
          {summarizeCriteria(cohort.criteria)} · Created{' '}
          {formatCreatedDate(cohort.createdAt)}
        </Text>
      </Stack>
      <Group gap="sm" align="center">
        {isActive && (
          <Badge color="blue" variant="light" aria-label="Active cohort">
            Active
          </Badge>
        )}
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Actions for cohort "${cohort.name}"`}
            >
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEdit size={14} />}
              onClick={() => onEdit(cohort)}
            >
              Edit
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCopy size={14} />}
              onClick={() => onDuplicate(cohort)}
            >
              Duplicate
            </Menu.Item>
            {fhirpathPresent ? (
              <Tooltip
                label="Cannot export: this cohort contains a FHIRPath criterion. FDPG Structured Query and FHIRPath are not equivalent formats."
                position="left"
                multiline
                w={220}
              >
                <Menu.Item
                  leftSection={<IconDownload size={14} />}
                  disabled
                >
                  Export to FDPG JSON
                </Menu.Item>
              </Tooltip>
            ) : (
              <Menu.Item
                leftSection={<IconDownload size={14} />}
                onClick={() => onExport(cohort)}
              >
                Export to FDPG JSON
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => onDelete(cohort)}
            >
              Delete…
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}

export function CohortsPage(): JSX.Element {
  const { cohorts, activeCohortId, hydrated, addCohort, duplicateCohort } =
    useCohorts();

  const [editingCohort, setEditingCohort] = useState<CohortDefinition | null>(
    null,
  );
  const [deletingCohort, setDeletingCohort] = useState<CohortDefinition | null>(
    null,
  );

  const existingNames = cohorts.map((c) => c.name);

  // -- Import handler -----------------------------------------------------
  const handleImportFile = async (file: File | null): Promise<void> => {
    if (!file) return;

    // T-22-13 UI-layer cap: reject BEFORE `file.text()` reads the File
    // into memory. Codec enforces the same cap on the text byte-length as
    // defence-in-depth.
    if (file.size > MAX_FDPG_FILE_BYTES) {
      notifications.show({
        color: 'red',
        title: 'Import failed',
        message:
          'File exceeds 1 MB cap. FDPG cohort exports are typically under 50 KB; this file may not be a valid FDPG export.',
        autoClose: 6000,
      });
      return;
    }

    const looksLikeJson =
      file.name.toLowerCase().endsWith('.json') ||
      file.type === 'application/json';
    if (!looksLikeJson) {
      notifications.show({
        color: 'red',
        title: 'Import failed',
        message:
          'Selected file is not a JSON file. Choose a .json file exported from a FDPG-compatible tool.',
        autoClose: 6000,
      });
      return;
    }

    try {
      const jsonText = await file.text();
      const { cohort: imported, warnings } = fdpgSqToCohort(jsonText);
      const created = addCohort({
        name: imported.name,
        criteria: imported.criteria,
      });
      notifications.show({
        color: 'blue',
        title: 'Cohort imported',
        message: `"${created.name}" imported from FDPG file. Available in the dashboard's Active cohort dropdown.`,
        autoClose: 2500,
      });
      for (const w of warnings) {
        notifications.show({
          color: 'yellow',
          title: 'Import note',
          message: w,
          autoClose: 5000,
        });
      }
    } catch (err) {
      const reason =
        err instanceof FdpgCodecError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error during import.';
      notifications.show({
        color: 'red',
        title: 'Import failed',
        message: reason,
        autoClose: 6000,
      });
    }
  };

  // -- Export handler -----------------------------------------------------
  const handleExport = (cohort: CohortDefinition): void => {
    try {
      const { sq, warnings } = cohortToFdpgSq(cohort);
      const filename = `${slugifyCohortName(cohort.name)}-fdpg.json`;
      downloadString(
        JSON.stringify(sq, null, 2),
        filename,
        'application/json',
      );
      notifications.show({
        color: 'blue',
        title: 'Cohort exported',
        message: `"${cohort.name}" downloaded as FDPG JSON.`,
        autoClose: 2500,
      });
      for (const _w of warnings) {
        notifications.show({
          color: 'yellow',
          title: 'Export limitation',
          message:
            'FDPG Structured Query does not support explicit patient lists. The reference-list criterion was skipped during export.',
          autoClose: 6000,
        });
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Cannot export',
        message:
          err instanceof FdpgCodecError
            ? err.message
            : 'Unknown error during export.',
        autoClose: 6000,
      });
    }
  };

  // -- Duplicate handler --------------------------------------------------
  const handleDuplicate = (cohort: CohortDefinition): void => {
    try {
      const copy = duplicateCohort(cohort.id);
      notifications.show({
        color: 'blue',
        title: 'Cohort duplicated',
        message: `"${copy.name}" created from "${cohort.name}".`,
        autoClose: 2500,
      });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'QuotaExceededError')) {
        notifications.show({
          color: 'red',
          title: 'Duplicate failed',
          message:
            'Could not duplicate cohort. Your browser may be in private mode or out of space.',
          autoClose: 6000,
        });
      }
    }
  };

  return (
    <Stack gap="lg" p="xl">
      <Anchor component={Link} to="/quality">
        ← Back to Data Quality
      </Anchor>
      <Title order={2}>Cohorts</Title>
      <Text size="sm" c="dimmed">
        Define reusable patient cohorts to scope quality analyses. Cohorts are
        stored in this browser under &apos;quality.cohorts.v1&apos; and persist
        across sessions.
      </Text>

      {/* Phase 30 Step 7 — 2-col layout (1fr for the saved-cohorts table,
          380 px for the new-cohort builder preview). Collapses to a single
          column below 960 px so narrow viewports still stack vertically. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'min(100%, calc(100vw - 2 * var(--mantine-spacing-xl)))',
          gap: 'var(--mantine-spacing-md)',
        }}
        className="cohorts-grid"
      >
        <style>{`
          @media (min-width: 960px) {
            .cohorts-grid {
              grid-template-columns: 1fr 380px !important;
              align-items: start;
            }
          }
        `}</style>

        {/* --- Left: Saved cohorts card (S2 + 22-S3 toolbar) --- */}
        <Paper withBorder radius="sm" p="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="wrap">
              <Title order={4}>Saved cohorts</Title>
              <FileButton
                onChange={handleImportFile}
                accept=".json,application/json"
              >
                {(fileProps) => (
                  <Button
                    {...fileProps}
                    variant="default"
                    leftSection={<IconUpload size={16} />}
                    aria-label="Import cohort from FDPG JSON file"
                  >
                    Import
                  </Button>
                )}
              </FileButton>
            </Group>
            {!hydrated ? (
              <Skeleton height={80} />
            ) : cohorts.length === 0 ? (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  No cohorts yet
                </Text>
                <Text size="sm" c="dimmed">
                  Create your first cohort using the form on the right. Saved
                  cohorts appear here and can be activated from the dashboard
                  toolbar.
                </Text>
              </Stack>
            ) : (
              <Stack gap="sm">
                {cohorts.map((c) => (
                  <SavedCohortRow
                    key={c.id}
                    cohort={c}
                    isActive={c.id === activeCohortId}
                    onEdit={setEditingCohort}
                    onDuplicate={handleDuplicate}
                    onExport={handleExport}
                    onDelete={setDeletingCohort}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* --- Right: New cohort builder preview card (S3) --- */}
        <Paper withBorder radius="sm" p="md">
          <Stack gap="md">
            <Title order={4}>New cohort</Title>
            <Text size="sm" c="dimmed">
              Combine any of the criteria below. A patient qualifies for the
              cohort only if they match ALL provided criteria (AND
              composition).
            </Text>
            {!hydrated ? (
              <Skeleton height={320} />
            ) : (
              <DatesProvider settings={{ locale: 'en' }}>
                <CohortBuilderForm
                  existingNames={existingNames}
                  onSaved={() => {
                    /* Reset is handled inside CohortBuilderForm; parent
                       just needs to know the cohorts array changed, which
                       it already observes via useCohorts. */
                  }}
                />
              </DatesProvider>
            )}
          </Stack>
        </Paper>
      </div>

      {/* --- Edit / Delete modals --- */}
      <EditCohortModal
        cohort={editingCohort}
        onClose={() => setEditingCohort(null)}
      />
      <DeleteCohortModal
        cohort={deletingCohort}
        onClose={() => setDeletingCohort(null)}
      />
    </Stack>
  );
}
