/**
 * LabRangesPanel -- Lab Ranges tab for /quality (Phase 16, DQ-06).
 *
 * Runs lab reference range checks against sampled Observation resources.
 * Shows summary badges, per-LOINC breakdown table, and full issue list
 * via ResourceIssueTable.
 */
import { useEffect, useMemo } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import type { MedplumClient } from '@medplum/core';
import { useSettings } from '../../hooks/useSettings';
import { useQualityMetrics } from '../../quality/QualityMetricsContext';
import { percentClean } from '../../quality/percent';
import { useLabRangesReport } from '../../hooks/useLabRangesReport';
import { ResourceIssueTable } from './ResourceIssueTable';

export interface LabRangesPanelProps {
  client: MedplumClient;
  sampleSize: number;
}

export function LabRangesPanel({ client, sampleSize }: LabRangesPanelProps) {
  const { settings } = useSettings();

  const run = useLabRangesReport({
    client,
    sampleSize,
    settings: settings ?? null,
  });

  const pct =
    run.progress.total > 0
      ? Math.round((run.progress.current / run.progress.total) * 100)
      : 0;

  // Phase 18 / Plan 18-02: push overallLabRanges rollup to QualityMetricsContext
  // on terminal status. Special case: noRange === checked → push undefined
  // (no ranges configured → not-applicable tile, NOT "100% clean" — pitfall 7).
  const { setOverallLabRanges } = useQualityMetrics();
  useEffect(() => {
    if (run.status !== 'complete' && run.status !== 'cancelled') return;
    const summary = run.summary;
    // noRange === checked → no ranges configured; push undefined (NOT 0)
    // so the tile shows em-dash rather than falsely "100% clean" (pitfall 7).
    if (!summary || summary.noRange === summary.checked) {
      setOverallLabRanges(undefined);
      return;
    }
    setOverallLabRanges(percentClean(summary.outOfRange, summary.checked));
  }, [run.status, run.summary, setOverallLabRanges]);

  // Per-LOINC table data sorted by % OOR descending
  const loincRows = useMemo(() => {
    if (!run.summary) return [];
    return Object.entries(run.summary.perLoincCode)
      .map(([code, stats]) => ({
        code,
        displayName: stats.displayName ?? '',
        checked: stats.checked,
        outOfRange: stats.outOfRange,
        pctOor: stats.checked > 0 ? (stats.outOfRange / stats.checked) * 100 : 0,
      }))
      .sort((a, b) => b.pctOor - a.pctOor);
  }, [run.summary]);

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="sm">
        <Group align="flex-end" gap="md">
          <Button
            variant="filled"
            onClick={run.start}
            disabled={run.status === 'running'}
          >
            Run lab range checks
          </Button>
          {run.status === 'running' && (
            <Button
              variant="subtle"
              color="red"
              onClick={run.cancel}
              leftSection={<IconX size={14} />}
            >
              Stop lab range check
            </Button>
          )}
        </Group>
      </Paper>

      {run.status === 'running' && (
        <Paper withBorder p="sm" radius="sm">
          <Stack gap="xs" aria-live="polite">
            <Text size="sm">
              Checking Observations ({run.progress.current}/{run.progress.total})...
            </Text>
            <Progress value={pct} animated />
          </Stack>
        </Paper>
      )}

      {run.status === 'cancelled' && (
        <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={20} />}>
          Lab range check cancelled. Results below reflect completed observations only.
        </Alert>
      )}

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Lab range check failed: {run.errorMessage ?? 'unknown error'}
        </Alert>
      )}

      {run.status === 'complete' && run.summary && run.summary.checked === 0 && (
        <Alert variant="light" color="blue" icon={<IconInfoCircle size={20} />} title="No observations found">
          No Observation resources with numeric values were found in the sample.
          Ensure the server contains Observation resources with valueQuantity data.
        </Alert>
      )}

      {run.status === 'complete' && run.summary && run.summary.checked > 0 && run.issues.length === 0 && (
        <Alert variant="light" color="green" icon={<IconCheck size={20} />} title="No lab range issues found">
          All {run.summary.checked} sampled observations are within reference ranges
          (or no reference ranges were available). Increase the sample size or configure
          reference ranges in settings.yaml to check more observations.
        </Alert>
      )}

      {run.status === 'complete' && run.summary && run.summary.checked > 0 && run.summary.noRange === run.summary.checked && (
        <Alert variant="light" color="orange" icon={<IconAlertTriangle size={20} />} title="No reference ranges available">
          None of the sampled observations had reference ranges (embedded or configured).
          Add reference ranges to settings.yaml for specific LOINC codes to enable range checking.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') && run.summary && run.summary.checked > 0 && (
        <Stack gap="xs">
          <Group gap="xs">
            <Badge color="green" variant="light" size="sm">
              In range: {run.summary.inRange}
            </Badge>
            <Badge color="yellow" variant="light" size="sm">
              Out of range: {run.summary.outOfRange}
            </Badge>
            <Badge color="gray" variant="light" size="sm">
              No range: {run.summary.noRange}
            </Badge>
          </Group>

          {loincRows.length > 0 && (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>LOINC Code</Table.Th>
                  <Table.Th>Display Name</Table.Th>
                  <Table.Th>Checked</Table.Th>
                  <Table.Th>Out of Range</Table.Th>
                  <Table.Th>% OOR</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loincRows.map((row) => (
                  <Table.Tr key={row.code}>
                    <Table.Td>{row.code}</Table.Td>
                    <Table.Td>{row.displayName}</Table.Td>
                    <Table.Td>{row.checked}</Table.Td>
                    <Table.Td>{row.outOfRange}</Table.Td>
                    <Table.Td>{row.pctOor.toFixed(1)}%</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          {run.issues.length > 0 && (
            <ResourceIssueTable issues={run.issues} />
          )}
        </Stack>
      )}
    </Stack>
  );
}
