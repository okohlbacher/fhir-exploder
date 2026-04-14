/**
 * PlausibilityPanel -- Plausibility tab for /quality (Phase 16, DQ-05).
 *
 * Runs temporal plausibility checks (future dates, period consistency,
 * age plausibility, clinical duration) against sampled resources of a
 * selected type. Results are shown as check-type breakdown badges and
 * drilled down via ResourceIssueTable.
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import type { MedplumClient } from '@medplum/core';
import { useSettings } from '../../hooks/useSettings';
import { usePlausibilityReport } from '../../hooks/usePlausibilityReport';
import { ResourceIssueTable } from './ResourceIssueTable';
import type { NormalizedIssue } from '../../quality/types';

export interface PlausibilityPanelProps {
  types: string[];
  client: MedplumClient;
  sampleSize: number;
}

const CHECK_TYPE_COLORS: Record<string, string> = {
  'future-date': 'orange',
  'inverted-period': 'red',
  'implausible-age': 'red',
  'clinical-duration': 'yellow',
};

const CHECK_TYPE_LABELS: Record<string, string> = {
  'future-date': 'Future dates',
  'inverted-period': 'Period consistency',
  'implausible-age': 'Age plausibility',
  'clinical-duration': 'Clinical duration',
};

const CHECK_TYPE_OPTIONS = [
  { value: 'all', label: 'All checks' },
  { value: 'future-date', label: 'Future dates' },
  { value: 'inverted-period', label: 'Period consistency' },
  { value: 'implausible-age', label: 'Age plausibility' },
  { value: 'clinical-duration', label: 'Clinical duration' },
];

export function PlausibilityPanel({ types, client, sampleSize }: PlausibilityPanelProps) {
  const { settings } = useSettings();

  const [resourceType, setResourceType] = useState<string>(
    () => types[0] ?? 'Patient',
  );
  const [checkTypeFilter, setCheckTypeFilter] = useState<string>('all');

  const run = usePlausibilityReport({
    client,
    resourceType,
    sampleSize,
    settings: settings ?? null,
  });

  const pct =
    run.progress.total > 0
      ? Math.round((run.progress.current / run.progress.total) * 100)
      : 0;

  // Filter issues by check type
  const filteredIssues = useMemo((): NormalizedIssue[] => {
    if (checkTypeFilter === 'all') return run.issues;
    return run.issues.filter((issue) =>
      issue.description.startsWith(`[${checkTypeFilter}]`),
    );
  }, [run.issues, checkTypeFilter]);

  // Count issues per check type for badges
  const checkTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const issue of run.issues) {
      const match = issue.description.match(/^\[([^\]]+)\]/);
      if (match) {
        const ct = match[1];
        counts[ct] = (counts[ct] ?? 0) + 1;
      }
    }
    return counts;
  }, [run.issues]);

  // Count unique resources with issues
  const resourcesWithIssues = useMemo(() => {
    const ids = new Set(run.issues.map((i) => i.resourceId));
    return ids.size;
  }, [run.issues]);

  const typeOptions = useMemo(
    () => types.map((t) => ({ value: t, label: t })),
    [types],
  );

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="sm">
        <Stack gap="sm">
          <Group align="flex-end" gap="md">
            <Select
              label="Resource type"
              data={typeOptions}
              value={resourceType}
              onChange={(v) => v && setResourceType(v)}
              searchable
              style={{ minWidth: 240 }}
            />
            <Select
              label="Check type"
              data={CHECK_TYPE_OPTIONS}
              value={checkTypeFilter}
              onChange={(v) => v && setCheckTypeFilter(v)}
              style={{ minWidth: 200 }}
            />
            <Button
              variant="filled"
              onClick={run.start}
              disabled={run.status === 'running'}
            >
              Run checks
            </Button>
            {run.status === 'running' && (
              <Button
                variant="subtle"
                color="red"
                onClick={run.cancel}
                leftSection={<IconX size={14} />}
              >
                Stop plausibility check
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>

      {run.status === 'running' && (
        <Paper withBorder p="sm" radius="sm">
          <Stack gap="xs" aria-live="polite">
            <Text size="sm">
              Checking {resourceType} ({run.progress.current}/{run.progress.total})...
            </Text>
            <Progress value={pct} animated />
          </Stack>
        </Paper>
      )}

      {run.status === 'cancelled' && (
        <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={20} />}>
          Plausibility check cancelled at {run.progress.current}/{run.progress.total}.
          Results below reflect completed resources only.
        </Alert>
      )}

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Plausibility check failed: {run.errorMessage ?? 'unknown error'}
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length === 0 && (
        <Alert variant="light" color="green" icon={<IconCheck size={20} />} title="No plausibility issues found">
          All sampled resources passed temporal plausibility checks.
          Increase the sample size to check more resources.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        run.issues.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              {run.issues.length} issues across {resourcesWithIssues} resources
            </Text>
            <Group gap="xs">
              {Object.entries(checkTypeCounts).map(([ct, count]) => (
                <Badge
                  key={ct}
                  color={CHECK_TYPE_COLORS[ct] ?? 'gray'}
                  variant="light"
                  size="sm"
                >
                  {CHECK_TYPE_LABELS[ct] ?? ct}: {count}
                </Badge>
              ))}
            </Group>
            <ResourceIssueTable issues={filteredIssues} />
          </Stack>
        )}
    </Stack>
  );
}
