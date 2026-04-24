/**
 * PlausibilityContext — per-metric rollup slot for Plausibility.
 *
 * Rollup rule (from QualityMetricsContext.tsx:14-15, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallPlausibility: PlausibilityPanel pushes round using unique issue resourceIds.
 *
 * Producer: PlausibilityPanel.tsx:109 (migrated in Plan 32-03 from
 * useQualityMetrics().setOverallPlausibility to usePlausibilityRollup().set).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface PlausibilityRollup {
  value: number | undefined;
  set: (value: number | undefined) => void;
}

const PlausibilityCtx = createContext<PlausibilityRollup | null>(null);

export function PlausibilityProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const memoed = useMemo<PlausibilityRollup>(() => ({ value, set }), [value]);
  return <PlausibilityCtx.Provider value={memoed}>{children}</PlausibilityCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function usePlausibilityRollup(): PlausibilityRollup {
  const ctx = useContext(PlausibilityCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
