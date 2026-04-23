/**
 * PlausibilityDrillDown — /quality/plausibility/:type sub-page.
 *
 * Runs temporal plausibility checks for a single resource type and
 * displays results via DrillDownShell (QDDEP-02 / Plan 25-03).
 */
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

  // usePlausibilityReport uses useAsyncRun with autoStart:true, so the hook
  // auto-fires on mount and whenever its internal deps change (including
  // resourceType). No imperative start() needed here.
  const run = usePlausibilityReport({
    client,
    resourceType: type,
    sampleSize,
    settings: settings ?? null,
  });

  return (
    <DrillDownShell
      title={`${type} — Plausibility drill-down`}
      backHref="/quality"
      run={run}
      issues={run.issues}
      errorMessage={run.errorMessage ? `Failed to run plausibility checks on ${type}: ${run.errorMessage}` : undefined}
      emptyMessage={`All sampled ${type} resources passed temporal plausibility checks.`}
      progressLabel={`Checking ${type}`}
    />
  );
}
