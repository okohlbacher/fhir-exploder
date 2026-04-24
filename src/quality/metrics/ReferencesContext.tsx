/**
 * ReferencesContext — per-metric rollup slot for References.
 *
 * Rollup rule (from QualityMetricsContext.tsx:24-25, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallReferences: ReferencesPanel pushes round using unique resourceId / sampleSize.
 *
 * Producer: ReferencesPanel.tsx:69 (migrated in Plan 32-03 from
 * useQualityMetrics().setOverallReferences to useReferencesRollup().set).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface ReferencesRollup {
  value: number | undefined;
  set: (value: number | undefined) => void;
}

const ReferencesCtx = createContext<ReferencesRollup | null>(null);

export function ReferencesProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const memoed = useMemo<ReferencesRollup>(() => ({ value, set }), [value]);
  return <ReferencesCtx.Provider value={memoed}>{children}</ReferencesCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useReferencesRollup(): ReferencesRollup {
  const ctx = useContext(ReferencesCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
