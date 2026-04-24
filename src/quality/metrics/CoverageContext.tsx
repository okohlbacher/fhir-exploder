/**
 * CoverageContext — per-metric rollup slot for Coverage.
 *
 * Rollup rule (from QualityMetricsContext.tsx:10-11, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallCoverage = arithmetic mean of per-type systemCode/totalCodedFields*100
 * (useCodingCoverage — unchanged from v1.0).
 *
 * Producer: useCodingCoverage.ts:41 (migrated in Plan 32-03 from
 * useQualityMetrics().setCoverage to useCoverageRollup().set).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface CoverageRollup {
  value: number | undefined;
  set: (value: number | undefined) => void;
}

const CoverageCtx = createContext<CoverageRollup | null>(null);

export function CoverageProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const memoed = useMemo<CoverageRollup>(() => ({ value, set }), [value]);
  return <CoverageCtx.Provider value={memoed}>{children}</CoverageCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useCoverageRollup(): CoverageRollup {
  const ctx = useContext(CoverageCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
