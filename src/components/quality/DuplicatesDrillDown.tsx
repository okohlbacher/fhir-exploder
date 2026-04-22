/**
 * DuplicatesDrillDown -- /quality/duplicates sub-page.
 *
 * Runs patient duplicate detection (defaults to Patient-only; content hash
 * scope belongs on the panel where the user can pick the resource type)
 * and renders the resulting issues via DrillDownShell (QDDEP-02 / Plan 25-03).
 */
import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { QualityOutletContext } from './QualityLayout';
import { useSampleSize } from './SampleSizeControl';
import { useDuplicateReport } from '../../hooks/useDuplicateReport';
import { DrillDownShell } from './DrillDownShell';

export function DuplicatesDrillDown() {
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();

  const run = useDuplicateReport({
    client,
    types: ['Patient'],
    sampleSize,
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
      title="Duplicate Detection -- Drill-down"
      backHref="/quality"
      run={run}
      issues={run.issues}
      errorMessage={run.errorMessage ? `Failed to run duplicate checks: ${run.errorMessage}` : undefined}
      emptyMessage="No duplicate patients or resources found in the sample."
      progressLabel="Matching patients"
    />
  );
}
