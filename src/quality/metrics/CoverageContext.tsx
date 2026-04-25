/**
 * CoverageContext — per-metric rollup slot for Coverage.
 *
 * Rollup rule (from QualityMetricsContext.tsx:10-11, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallCoverage = arithmetic mean of per-type systemCode/totalCodedFields*100
 * (useCodingCoverage — unchanged from v1.0).
 *
 * Producer: useCodingCoverage.ts:41 (migrated in Plan 32-03 from
 * useQualityMetrics().setCoverage to useCoverageRollup().set).
 *
 * Plan 35-04 (UAT-FU-05): byType slot added for the per-type quality matrix
 * card. Producer (useCodingCoverage) derives a Record<string, number> from
 * the per-type reports and pushes it via setByType.
 */
import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export interface CoverageRollup {
  value: number | undefined;
  /** Plan 35-04: per-type systemCode/totalCodedFields*100 map. */
  byType: Record<string, number>;
  set: (value: number | undefined) => void;
  /** Plan 35-04: functional-setter form mandated (Pitfall P-04). */
  setByType: Dispatch<SetStateAction<Record<string, number>>>;
}

const CoverageCtx = createContext<CoverageRollup | null>(null);

export function CoverageProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const [byType, setByType] = useState<Record<string, number>>({});
  const memoed = useMemo<CoverageRollup>(
    () => ({ value, byType, set, setByType }),
    [value, byType],
  );
  return <CoverageCtx.Provider value={memoed}>{children}</CoverageCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useCoverageRollup(): CoverageRollup {
  const ctx = useContext(CoverageCtx);
  if (!ctx) return { value: undefined, byType: {}, set: () => {}, setByType: () => {} };
  return ctx;
}
