/**
 * QualityMetricsContext — the rollup rendezvous between Wave 2 producers
 * (Plans 03 Completeness and 04 Coverage) and the OverviewStrip consumer
 * (Plan 02). Producers push per-type reports' rolled-up averages via
 * setCompleteness/setCoverage; the consumer reads overallCompleteness /
 * overallCoverage without prop-drilling through nested drill-down routes.
 *
 * ROLLUP RULE (LOCKED — Plans 03/04 must follow):
 * - overallCompleteness = arithmetic mean of (populated/total*100) across
 *   every type where the report is a settled PerTypeCompletenessReport
 *   AND report.total > 0. Types still loading, errored, or with no
 *   bundled profile (total === 0) are EXCLUDED from the denominator.
 * - overallCoverage = arithmetic mean of (systemCode/totalCodedFields*100)
 *   across every type where the report is a settled PerTypeCoverageReport
 *   AND totalCodedFields > 0.
 * - Why arithmetic (not count-weighted): MII Kerndatensatz frames each
 *   module as equal-weight. Count-weighting would let high-volume types
 *   (Observation) dominate and mask gaps in lower-volume but clinically
 *   critical types. Call the setter with Math.round applied.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface QualityMetricsContextValue {
  /** Arithmetic mean of per-type completeness percentages (0-100). Undefined until Plan 03 sets. */
  overallCompleteness: number | undefined;
  /** Arithmetic mean of per-type coverage percentages (0-100). Undefined until Plan 04 sets. */
  overallCoverage: number | undefined;
  setCompleteness: (value: number | undefined) => void;
  setCoverage: (value: number | undefined) => void;
}

const Ctx = createContext<QualityMetricsContextValue | null>(null);

export function QualityMetricsProvider({ children }: { children: ReactNode }) {
  const [overallCompleteness, setCompleteness] = useState<number | undefined>(undefined);
  const [overallCoverage, setCoverage] = useState<number | undefined>(undefined);
  const value = useMemo(
    () => ({ overallCompleteness, overallCoverage, setCompleteness, setCoverage }),
    [overallCompleteness, overallCoverage],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Consumer hook. Outside the provider (e.g., isolated unit tests) returns
 * a no-op fallback so OverviewStrip renders em-dashes without crashing.
 */
export function useQualityMetrics(): QualityMetricsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      overallCompleteness: undefined,
      overallCoverage: undefined,
      setCompleteness: () => {},
      setCoverage: () => {},
    };
  }
  return ctx;
}
