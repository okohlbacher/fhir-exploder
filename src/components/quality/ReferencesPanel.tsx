/**
 * ReferencesPanel -- References tab for /quality (Phase 17, DQ-09 + DQ-10).
 *
 * Runs broken reference detection (existence-check via batched _id search)
 * and orphan detection (profile-driven required Reference fields) against
 * sampled resources of a selected type. Results are shown as check-category
 * summary lines with badges and drilled down via ResourceIssueTable.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
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
import { useQualityMetrics } from '../../quality/QualityMetricsContext';
import { percentClean } from '../../quality/percent';
import { useReferenceReport } from '../../hooks/useReferenceReport';
import { ResourceIssueTable } from './ResourceIssueTable';
import { RunProgress } from './RunProgress';
import type { NormalizedIssue } from '../../quality/types';

export interface ReferencesPanelProps {
  types: string[];
  client: MedplumClient;
  sampleSize: number;
  patientIds?: string[];
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All checks' },
  { value: 'broken-ref', label: 'Broken references' },
  { value: 'orphan', label: 'Orphan resources' },
];

export function ReferencesPanel({ types, client, sampleSize, patientIds }: ReferencesPanelProps) {
  const [resourceType, setResourceType] = useState<string>(
    () => types[0] ?? 'Patient',
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const run = useReferenceReport({
    client,
    resourceType,
    sampleSize,
    patientIds,
  });

  const filteredIssues = useMemo((): NormalizedIssue[] => {
    if (categoryFilter === 'all') return run.issues;
    return run.issues.filter((issue) =>
      issue.description.startsWith(`[${categoryFilter}]`),
    );
  }, [run.issues, categoryFilter]);

  // Phase 18 / Plan 18-02: push overallReferences rollup to QualityMetricsContext
  // on terminal status. Uses `sampleSize` prop (resource count) as denominator,
  // NOT `run.progress.total` (which is batch count — see useReferenceReport.ts:117).
  const { setOverallReferences } = useQualityMetrics();
  useEffect(() => {
    if (run.status !== 'complete' && run.status !== 'cancelled') return;
    const affected = new Set(run.issues.map((i) => i.resourceId)).size;
    setOverallReferences(percentClean(affected, sampleSize));
  }, [run.status, run.issues, sampleSize, setOverallReferences]);

  const typeOptions = useMemo(
    () => types.map((t) => ({ value: t, label: t })),
    [types],
  );

  // Progress label — RunProgress appends the (current/total)... suffix. The
  // hook's batched broken-ref check updates progress as (current, total batches).
  // We show the verify-targets phase while batches are being processed (total > 0),
  // and the "checking references" phase before that (when total is still 0).
  const progressLabel =
    run.progress.total === 0
      ? `Checking references in ${resourceType}`
      : 'Verifying reference target batches';

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="sm">
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
            label="Category"
            data={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={(v) => v && setCategoryFilter(v)}
            style={{ minWidth: 200 }}
          />
          <Button
            variant="filled"
            onClick={run.start}
            disabled={run.status === 'running'}
          >
            Run reference checks
          </Button>
          {run.status === 'running' && (
            <Button
              variant="subtle"
              color="red"
              onClick={run.cancel}
              leftSection={<IconX size={14} />}
            >
              Stop reference check
            </Button>
          )}
        </Group>
      </Paper>

      {run.status === 'running' && (
        <Paper withBorder p="sm" radius="sm">
          <RunProgress run={run} label={progressLabel} />
        </Paper>
      )}

      {run.status === 'cancelled' && (
        <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={20} />}>
          Reference check cancelled at {run.progress.current}/{run.progress.total}.
          Results below reflect completed resources only.
        </Alert>
      )}

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Failed to run reference checks for {resourceType}. Check your FHIR server
          connection and try again.
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length === 0 && (
        <Alert
          variant="light"
          color="green"
          icon={<IconCheck size={20} />}
          title="No reference issues found"
        >
          All sampled references resolve correctly and no orphan resources detected.
          Increase the sample size to check more resources.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        run.issues.length > 0 && (
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Text size="sm">{run.brokenCount} broken references found</Text>
              <Badge color="red" variant="light" size="sm">
                broken: {run.brokenCount}
              </Badge>
            </Group>
            <Group gap="xs" align="center">
              <Text size="sm">{run.orphanCount} orphan resources found</Text>
              <Badge color="yellow" variant="light" size="sm">
                orphan: {run.orphanCount}
              </Badge>
            </Group>
            <ResourceIssueTable issues={filteredIssues} />
          </Stack>
        )}
    </Stack>
  );
}
