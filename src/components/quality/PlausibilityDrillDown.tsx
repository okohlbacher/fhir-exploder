/**
 * PlausibilityDrillDown -- /quality/plausibility/:type sub-page.
 *
 * Runs temporal plausibility checks for a single resource type and
 * displays results via ResourceIssueTable.
 */
import { useEffect, useRef } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useSettings } from '../../hooks/useSettings';
import { usePlausibilityReport } from '../../hooks/usePlausibilityReport';
import { ResourceIssueTable } from './ResourceIssueTable';

export function PlausibilityDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const { settings } = useSettings();
  const backRef = useRef<HTMLAnchorElement | null>(null);

  const run = usePlausibilityReport({
    client,
    resourceType: type,
    sampleSize,
    settings: settings ?? null,
  });

  const pct =
    run.progress.total > 0
      ? Math.round((run.progress.current / run.progress.total) * 100)
      : 0;

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  // Auto-start on mount
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
        Back to Plausibility
      </Button>

      <Title order={2}>
        {type} -- Plausibility drill-down
      </Title>

      {run.status === 'running' && (
        <Stack gap="xs" aria-live="polite">
          <Text size="sm">
            Checking {type} ({run.progress.current}/{run.progress.total})...
          </Text>
          <Progress value={pct} animated />
        </Stack>
      )}

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Failed to run plausibility checks on {type}: {run.errorMessage ?? 'unknown error'}
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length === 0 && (
        <Alert variant="light" color="green" icon={<IconCheck size={20} />} title="No plausibility issues found">
          All sampled {type} resources passed temporal plausibility checks.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') && run.issues.length > 0 && (
        <ResourceIssueTable issues={run.issues} />
      )}
    </Stack>
  );
}
