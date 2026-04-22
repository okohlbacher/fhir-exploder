/**
 * DuplicatesDrillDown -- /quality/duplicates sub-page.
 *
 * Runs patient duplicate detection (defaults to Patient-only; content hash
 * scope belongs on the panel where the user can pick the resource type)
 * and renders the resulting issues via ResourceIssueTable.
 */
import { useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Alert, Button, Stack, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useDuplicateReport } from '../../hooks/useDuplicateReport';
import { ResourceIssueTable } from './ResourceIssueTable';
import { RunProgress } from './RunProgress';

export function DuplicatesDrillDown() {
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const backRef = useRef<HTMLAnchorElement | null>(null);

  const run = useDuplicateReport({
    client,
    types: ['Patient'],
    sampleSize,
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
        Back to Duplicates
      </Button>

      <Title order={2}>Duplicate Detection -- Drill-down</Title>

      <RunProgress run={run} label="Matching patients" />

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Failed to run duplicate checks: {run.errorMessage ?? 'unknown error'}
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
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        run.issues.length > 0 && <ResourceIssueTable issues={run.issues} />}
    </Stack>
  );
}
