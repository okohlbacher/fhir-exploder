/**
 * PlausibilityDrillDown -- /quality/plausibility/:type sub-page.
 *
 * Runs temporal plausibility checks for a single resource type and
 * displays results via DrillDownShell (QDDEP-02 / Plan 25-03).
 */
import { useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useSettings } from '../../hooks/useSettings';
import { usePlausibilityReport } from '../../hooks/usePlausibilityReport';
import { DrillDownShell } from './DrillDownShell';

export function PlausibilityDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const { settings } = useSettings();

  const run = usePlausibilityReport({
    client,
    resourceType: type,
    sampleSize,
    settings: settings ?? null,
  });

  // Auto-start on mount
  useEffect(() => {
    if (type && run.status === 'idle') {
      run.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <DrillDownShell
      title={`${type} -- Plausibility drill-down`}
      backHref="/quality"
      run={run}
      issues={run.issues}
      errorMessage={run.errorMessage ? `Failed to run plausibility checks on ${type}: ${run.errorMessage}` : undefined}
      emptyMessage={`All sampled ${type} resources passed temporal plausibility checks.`}
      progressLabel={`Checking ${type}`}
    />
  );
}
