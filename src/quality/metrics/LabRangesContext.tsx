/**
 * LabRangesContext — per-metric rollup slot for Lab Ranges.
 *
 * Rollup rule (from QualityMetricsContext.tsx:15-16, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallLabRanges: LabRangesPanel pushes round using summary.outOfRange / summary.checked;
 *   undefined when no ranges are configured (summary.noRange === summary.checked).
 *
 * Producer: LabRangesPanel.tsx:51 (migrated in Plan 32-03 from
 * useQualityMetrics().setOverallLabRanges to useLabRangesRollup().set).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface LabRangesRollup {
  value: number | undefined;
  set: (value: number | undefined) => void;
}

const LabRangesCtx = createContext<LabRangesRollup | null>(null);

export function LabRangesProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const memoed = useMemo<LabRangesRollup>(() => ({ value, set }), [value]);
  return <LabRangesCtx.Provider value={memoed}>{children}</LabRangesCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useLabRangesRollup(): LabRangesRollup {
  const ctx = useContext(LabRangesCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
