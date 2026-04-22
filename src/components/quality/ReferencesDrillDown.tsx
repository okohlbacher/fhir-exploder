/**
 * ReferencesDrillDown -- /quality/references/:type sub-page.
 *
 * Runs broken reference detection and orphan detection for a single
 * resource type and displays the resulting issues via DrillDownShell
 * (QDDEP-02 / Plan 25-03).
 */
import { useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useReferenceReport } from '../../hooks/useReferenceReport';
import { DrillDownShell } from './DrillDownShell';

export function ReferencesDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();

  const run = useReferenceReport({
    client,
    resourceType: type,
    sampleSize,
  });

  // Auto-start on mount when type is set
  useEffect(() => {
    if (type && run.status === 'idle') {
      run.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <DrillDownShell
      title={`${type} -- Reference Integrity drill-down`}
      backHref="/quality"
      run={run}
      issues={run.issues}
      errorMessage={run.errorMessage ? `Failed to run reference checks for ${type}: ${run.errorMessage}` : undefined}
      emptyMessage={`All sampled ${type} references resolve correctly and no orphan resources detected.`}
      progressLabel={`Checking references in ${type}`}
    />
  );
}
