/**
 * ReferencesDrillDown -- /quality/references/:type sub-page.
 *
 * Runs broken reference detection and orphan detection for a single
 * resource type and displays the resulting issues via DrillDownShell
 * (QDDEP-02 / Plan 25-03).
 */
import { useOutletContext, useParams } from 'react-router-dom';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useReferenceReport } from '../../hooks/useReferenceReport';
import { DrillDownShell } from './DrillDownShell';

export function ReferencesDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();

  // useReferenceReport uses useAsyncRun with autoStart:true, so the hook
  // auto-fires on mount and whenever its internal deps change (including
  // resourceType). No imperative start() needed here.
  const run = useReferenceReport({
    client,
    resourceType: type,
    sampleSize,
  });

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
