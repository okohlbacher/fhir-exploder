/**
 * CompletenessContext — per-metric rollup slot for Completeness.
 *
 * Rollup rule (from QualityMetricsContext.tsx:7-9, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallCompleteness = arithmetic mean of per-type populated/total*100
 * (useCompletenessReport — unchanged from v1.0).
 *
 * Producer: useCompletenessReport.ts:42 (migrated in Plan 32-03 from
 * useQualityMetrics().setCompleteness to useCompletenessRollup().set).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface CompletenessRollup {
  value: number | undefined;
  set: (value: number | undefined) => void;
}

const CompletenessCtx = createContext<CompletenessRollup | null>(null);

export function CompletenessProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const memoed = useMemo<CompletenessRollup>(() => ({ value, set }), [value]);
  return <CompletenessCtx.Provider value={memoed}>{children}</CompletenessCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useCompletenessRollup(): CompletenessRollup {
  const ctx = useContext(CompletenessCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
