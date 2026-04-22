/**
 * ReferencesDrillDown -- /quality/references/:type sub-page.
 *
 * Runs broken reference detection and orphan detection for a single
 * resource type and displays the resulting issues via ResourceIssueTable.
 */
import { useEffect, useRef } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Alert, Button, Stack, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useReferenceReport } from '../../hooks/useReferenceReport';
import { ResourceIssueTable } from './ResourceIssueTable';
import { RunProgress } from './RunProgress';

export function ReferencesDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const backRef = useRef<HTMLAnchorElement | null>(null);

  const run = useReferenceReport({
    client,
    resourceType: type,
    sampleSize,
  });

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  // Auto-start on mount when type is set
  useEffect(() => {
    if (type && run.status === 'idle') {
      run.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <Stack gap="md" p="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        component={Link}
        to="/quality"
        ref={backRef}
      >
        Back to References
      </Button>

      <Title order={2}>{type} -- Reference Integrity drill-down</Title>

      <RunProgress run={run} label={`Checking references in ${type}`} />

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Failed to run reference checks for {type}: {run.errorMessage ?? 'unknown error'}
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length === 0 && (
        <Alert
          variant="light"
          color="green"
          icon={<IconCheck size={20} />}
          title="No reference issues found"
        >
          All sampled {type} references resolve correctly and no orphan resources detected.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        run.issues.length > 0 && <ResourceIssueTable issues={run.issues} />}
    </Stack>
  );
}
