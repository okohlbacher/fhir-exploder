/**
 * LabRangesDrillDown -- /quality/lab-ranges sub-page.
 *
 * Runs lab reference range checks for Observations and displays
 * results via DrillDownShell (QDDEP-02 / Plan 25-03).
 */
import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useSettings } from '../../hooks/useSettings';
import { useLabRangesReport } from '../../hooks/useLabRangesReport';
import { DrillDownShell } from './DrillDownShell';

export function LabRangesDrillDown() {
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const { settings } = useSettings();

  const run = useLabRangesReport({
    client,
    sampleSize,
    settings: settings ?? null,
  });

  // Auto-start on mount
  useEffect(() => {
    if (run.status === 'idle') {
      run.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DrillDownShell
      title="Observation -- Lab Range drill-down"
      backHref="/quality"
      run={run}
      issues={run.issues}
      errorMessage={run.errorMessage ? `Failed to run lab range checks: ${run.errorMessage}` : undefined}
      emptyMessage="All sampled observations are within reference ranges."
      progressLabel="Checking Observations"
    />
  );
}
