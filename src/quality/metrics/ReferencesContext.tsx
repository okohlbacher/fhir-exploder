/**
 * ReferencesContext — per-metric rollup slot for References.
 *
 * Rollup rule (from QualityMetricsContext.tsx:24-25, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallReferences: ReferencesPanel pushes round using unique resourceId / sampleSize.
 *
 * Producer: ReferencesPanel.tsx:69 (migrated in Plan 32-03 from
 * useQualityMetrics().setOverallReferences to useReferencesRollup().set).
 *
 * Plan 35-04 (UAT-FU-05): byType slot added. ReferencesPanel (single-type
 * producer) must use the FUNCTIONAL setter form so each per-type run merges
 * without clobbering prior types (Pitfall P-04 mitigation).
 */
import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export interface ReferencesRollup {
  value: number | undefined;
  /** Plan 35-04: per-type % clean map (matrix References column). */
  byType: Record<string, number>;
  set: (value: number | undefined) => void;
  /** Plan 35-04: functional-setter form mandated (Pitfall P-04). */
  setByType: Dispatch<SetStateAction<Record<string, number>>>;
}

const ReferencesCtx = createContext<ReferencesRollup | null>(null);

export function ReferencesProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const [byType, setByType] = useState<Record<string, number>>({});
  const memoed = useMemo<ReferencesRollup>(
    () => ({ value, byType, set, setByType }),
    [value, byType],
  );
  return <ReferencesCtx.Provider value={memoed}>{children}</ReferencesCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useReferencesRollup(): ReferencesRollup {
  const ctx = useContext(ReferencesCtx);
  if (!ctx) return { value: undefined, byType: {}, set: () => {}, setByType: () => {} };
  return ctx;
}
