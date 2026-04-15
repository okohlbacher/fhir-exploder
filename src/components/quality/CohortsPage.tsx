/**
 * CohortsPage — /quality/cohorts (Plan 21-05 T-5.3).
 *
 * User-facing surface for CHRT-01 + CHRT-02: saved-cohorts list + new-cohort
 * builder form wrapped in a `<DatesProvider>`. Chrome mirrors
 * `ThresholdsPage.tsx:156-229` verbatim (Back anchor, Title, Paper cards,
 * `<Stack gap="lg" p="xl">`).
 *
 * Hydration gate (21-RESEARCH.md §Pitfall 1): until `useCohorts.hydrated`
 * flips true we render Skeletons so the saved-list doesn't flash empty on
 * every page load when a user has persisted cohorts.
 *
 * Copy strings locked verbatim in 21-UI-SPEC.md §S1 (page chrome) + §S2
 * (saved-cohorts list) + §Copywriting Contract.
 *
 * Threat mitigations:
 *   - T-21-03 (PHI in UI): saved-row metadata never shows individual patient
 *     IDs; only criterion types + parsed-ref counts.
 *   - T-21-01 (XSS): every cohort name + metadata rendered via React text
 *     nodes (Mantine auto-escapes); no `dangerouslySetInnerHTML`.
 */
import {
  Anchor,
  Badge,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Link } from 'react-router-dom';
import type { JSX } from 'react';
import { useCohorts } from '../../hooks/useCohorts';
import type {
  CohortCriterion,
  CohortDefinition,
} from '../../quality/cohorts';
import { CohortBuilderForm } from './CohortBuilderForm';

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
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'No criteria';
}

interface SavedCohortRowProps {
  cohort: CohortDefinition;
  isActive: boolean;
}

function SavedCohortRow({ cohort, isActive }: SavedCohortRowProps): JSX.Element {
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
      {isActive && (
        <Badge color="blue" variant="light" aria-label="Active cohort">
          Active
        </Badge>
      )}
    </Group>
  );
}

export function CohortsPage(): JSX.Element {
  const { cohorts, activeCohortId, hydrated } = useCohorts();

  const existingNames = cohorts.map((c) => c.name);

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

      {/* --- Saved cohorts card (S2) --- */}
      <Paper withBorder radius="sm" p="md">
        <Stack gap="sm">
          <Title order={4}>Saved cohorts</Title>
          {!hydrated ? (
            <Skeleton height={80} />
          ) : cohorts.length === 0 ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                No cohorts yet
              </Text>
              <Text size="sm" c="dimmed">
                Create your first cohort using the form below. Saved cohorts
                appear here and can be activated from the dashboard toolbar.
              </Text>
            </Stack>
          ) : (
            <Stack gap="sm">
              {cohorts.map((c) => (
                <SavedCohortRow
                  key={c.id}
                  cohort={c}
                  isActive={c.id === activeCohortId}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* --- New cohort builder card (S3) --- */}
      <Paper withBorder radius="sm" p="md">
        <Stack gap="md">
          <Title order={4}>New cohort</Title>
          <Text size="sm" c="dimmed">
            Combine any of the three criteria below. A patient qualifies for
            the cohort only if they match ALL provided criteria (AND
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
    </Stack>
  );
}
