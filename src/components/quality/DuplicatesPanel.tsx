/**
 * DuplicatesPanel -- Duplicates tab for /quality (Phase 17, DQ-07 + DQ-08).
 *
 * Runs patient duplicate detection (exact family|given|birthDate match)
 * and content hash deduplication (SHA-256 over canonicalized content)
 * against sampled resources. Results are shown as check-category summary
 * lines with badges and drilled down via ResourceIssueTable.
 *
 * Patient duplicate detection always runs against Patient resources; the
 * resource type selector scopes content hash checks only.
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
import { useDuplicatesRollup } from '../../quality/metrics';
import { percentClean } from '../../quality/percent';
import { useDuplicateReport } from '../../hooks/useDuplicateReport';
import { ResourceIssueTable } from './ResourceIssueTable';
import { RunProgress } from './RunProgress';
import type { NormalizedIssue } from '../../quality/types';

export interface DuplicatesPanelProps {
  types: string[];
  client: MedplumClient;
  sampleSize: number;
  patientIds?: string[];
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All checks' },
  { value: 'patient-duplicate', label: 'Patient duplicates' },
  { value: 'content-hash', label: 'Content hash duplicates' },
];

export function DuplicatesPanel({ types, client, sampleSize, patientIds }: DuplicatesPanelProps) {
  const [resourceType, setResourceType] = useState<string>(
    () => types[0] ?? 'Patient',
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const run = useDuplicateReport({
    client,
    types: [resourceType],
    sampleSize,
    patientIds,
  });

  // Filter issues by category prefix
  const filteredIssues = useMemo((): NormalizedIssue[] => {
    if (categoryFilter === 'all') return run.issues;
    return run.issues.filter((issue) =>
      issue.description.startsWith(`[${categoryFilter}]`),
    );
  }, [run.issues, categoryFilter]);

  // Count patients involved in patient duplicate clusters
  const patientsInvolved = useMemo(
    () => run.duplicateClusters.reduce((sum, c) => sum + c.patients.length, 0),
    [run.duplicateClusters],
  );

  // Count resources involved in content hash clusters for the current type
  const hashResourcesInvolved = useMemo(
    () =>
      run.contentHashClusters
        .filter((c) => c.resourceType === resourceType)
        .reduce((sum, c) => sum + c.resources.length, 0),
    [run.contentHashClusters, resourceType],
  );

  const hashClustersForType = useMemo(
    () =>
      run.contentHashClusters.filter((c) => c.resourceType === resourceType).length,
    [run.contentHashClusters, resourceType],
  );

  // Phase 18 / Plan 18-02: push per-type "% clean" contribution to QualityMetricsContext
  // on terminal status. RESOLVED 2026-04-14 (RESEARCH Q1) — true per-type averaging:
  //   - patient: round((1 - patientsInvolved/sampleSize) * 100)  (patient pass always runs)
  //   - hashType: { resourceType: currentType, percentClean: ... }  (current selected type)
  // Single setDuplicatesContribution call merges both into duplicatesBreakdown.
  // Switching the Select and re-running adds a new entry to hashByType keyed by
  // the new type — prior entries are preserved (widens the average). When
  // sampleSize <= 0, skip push entirely (tile stays em-dash; do NOT push 0).
  // Mid-run is gated out (pitfall 2 — no flicker). NO direct setter for
  // overallDuplicates exists; the value is DERIVED in QualityMetricsContext
  // via deriveOverallDuplicates(duplicatesBreakdown).
  const { contribute: setDuplicatesContribution } = useDuplicatesRollup();
  useEffect(() => {
    if (run.status !== 'complete' && run.status !== 'cancelled') return;
    if (!sampleSize || sampleSize <= 0) return;
    const patientPercentClean = percentClean(patientsInvolved, sampleSize);
    const hashPercentClean = percentClean(hashResourcesInvolved, sampleSize);
    setDuplicatesContribution({
      patient: patientPercentClean,
      hashType:
        hashPercentClean !== undefined
          ? { resourceType, percentClean: hashPercentClean }
          : undefined,
    });
  }, [
    run.status,
    patientsInvolved,
    hashResourcesInvolved,
    resourceType,
    sampleSize,
    setDuplicatesContribution,
  ]);

  const typeOptions = useMemo(
    () => types.map((t) => ({ value: t, label: t })),
    [types],
  );

  // Phase-aware progress label — RunProgress appends the (current/total)... suffix.
  // Heuristic: if we have patient clusters known, we're past the patient pass.
  // Show "Matching patients" until the patient pass is done (duplicateClusters
  // updated) or until skippedPatients is set.
  const progressLabel =
    run.duplicateClusters.length === 0 && run.skippedPatients === 0
      ? 'Matching patients'
      : `Hashing ${resourceType} resources`;

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
            Run duplicate checks
          </Button>
          {run.status === 'running' && (
            <Button
              variant="subtle"
              color="red"
              onClick={run.cancel}
              leftSection={<IconX size={14} />}
            >
              Stop duplicate check
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
          Duplicate check cancelled at {run.progress.current}/{run.progress.total}.
          Results below reflect completed resources only.
        </Alert>
      )}

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Failed to run duplicate checks. Check your FHIR server connection and try again.
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length === 0 && (
        <Alert
          variant="light"
          color="green"
          icon={<IconCheck size={20} />}
          title="No duplicates detected"
        >
          No duplicate patients or resources found in the sample.
          Increase the sample size to check more resources.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        run.issues.length > 0 && (
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Text size="sm">
                {run.duplicateClusters.length} patient duplicate clusters (
                {patientsInvolved} patients involved)
              </Text>
              <Badge color="orange" variant="light" size="sm">
                patient: {run.duplicateClusters.length}
              </Badge>
            </Group>
            <Group gap="xs" align="center">
              <Text size="sm">
                {hashClustersForType} content hash clusters in {resourceType} (
                {hashResourcesInvolved} resources involved)
              </Text>
              <Badge color="violet" variant="light" size="sm">
                hash: {hashClustersForType}
              </Badge>
            </Group>
            {run.skippedPatients > 0 && (
              <Text size="sm" c="dimmed">
                ({run.skippedPatients} patients skipped -- missing name or birthDate)
              </Text>
            )}
            <Text size="sm" c="dimmed">
              Checked {sampleSize} of total patients. Increase sample size for more
              thorough detection.
            </Text>
            <ResourceIssueTable issues={filteredIssues} />
          </Stack>
        )}
    </Stack>
  );
}
