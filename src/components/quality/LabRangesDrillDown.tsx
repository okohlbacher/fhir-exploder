/**
 * LabRangesDrillDown -- /quality/lab-ranges sub-page.
 *
 * Runs lab reference range checks for Observations and displays
 * results via ResourceIssueTable.
 */
import { useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Alert, Button, Stack, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useSettings } from '../../hooks/useSettings';
import { useLabRangesReport } from '../../hooks/useLabRangesReport';
import { ResourceIssueTable } from './ResourceIssueTable';
import { RunProgress } from './RunProgress';

export function LabRangesDrillDown() {
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const { settings } = useSettings();
  const backRef = useRef<HTMLAnchorElement | null>(null);

  const run = useLabRangesReport({
    client,
    sampleSize,
    settings: settings ?? null,
  });

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (run.status === 'idle') {
      run.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack gap="md" p="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        component={Link}
        to="/quality"
        ref={backRef}
      >
        Back to Lab Ranges
      </Button>

      <Title order={2}>
        Observation -- Lab Range drill-down
      </Title>

      <RunProgress run={run} label="Checking Observations" />

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Failed to run lab range checks: {run.errorMessage ?? 'unknown error'}
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length === 0 && (
        <Alert variant="light" color="green" icon={<IconCheck size={20} />} title="No lab range issues found">
          All sampled observations are within reference ranges.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') && run.issues.length > 0 && (
        <ResourceIssueTable issues={run.issues} />
      )}
    </Stack>
  );
}
