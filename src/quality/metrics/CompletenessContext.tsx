/**
 * CompletenessContext — per-metric rollup slot for Completeness.
 *
 * Rollup rule (from QualityMetricsContext.tsx:7-9, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallCompleteness = arithmetic mean of per-type populated/total*100
 * (useCompletenessReport — unchanged from v1.0).
 *
 * Producer: useCompletenessReport.ts:42 (migrated in Plan 32-03 from
 * useQualityMetrics().setCompleteness to useCompletenessRollup().set).
 *
 * Plan 35-04 (UAT-FU-05): byType slot added for the per-type quality matrix
 * card. Producer (useCompletenessReport) derives a Record<string, number>
 * from the per-type reports and pushes it via setByType. Matrix consumer
 * reads byType directly from this hook, NOT from the facade
 * useQualityMetrics() — facade preservation invariant (Phase 32 D-04).
 */
import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export interface CompletenessRollup {
  value: number | undefined;
  /** Plan 35-04: per-type populated/total*100 map. Keys are FHIR resource type names. */
  byType: Record<string, number>;
  set: (value: number | undefined) => void;
  /** Plan 35-04: functional-setter form mandated (Pitfall P-04 — stale closure mitigation). */
  setByType: Dispatch<SetStateAction<Record<string, number>>>;
}

const CompletenessCtx = createContext<CompletenessRollup | null>(null);

export function CompletenessProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const [byType, setByType] = useState<Record<string, number>>({});
  const memoed = useMemo<CompletenessRollup>(
    () => ({ value, byType, set, setByType }),
    // useState setters are reference-stable — omit from deps.
    [value, byType],
  );
  return <CompletenessCtx.Provider value={memoed}>{children}</CompletenessCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useCompletenessRollup(): CompletenessRollup {
  const ctx = useContext(CompletenessCtx);
  if (!ctx) return { value: undefined, byType: {}, set: () => {}, setByType: () => {} };
  return ctx;
}
