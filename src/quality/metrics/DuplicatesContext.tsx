/**
 * DuplicatesContext — per-metric rollup slot for Duplicates (special shape).
 *
 * Rollup rule (from QualityMetricsContext.tsx:17-23, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallDuplicates is DERIVED from duplicatesBreakdown — DuplicatesPanel pushes per-type "% clean"
 * contributions via contribute(); this context accumulates them and computes
 *   overallDuplicates = round(mean(definedComponents))
 * where definedComponents = [breakdown.patient, ...Object.values(breakdown.hashByType)]
 * filtered to defined values. Types not yet run are EXCLUDED, NOT scored as 0.
 * (RESOLVED 2026-04-14 — 18-RESEARCH Q1: true per-type averaging; single-type
 * conservative rollup REJECTED.)
 *
 * Producer: DuplicatesPanel.tsx:102 (migrated in Plan 32-03 from
 * useQualityMetrics().setDuplicatesContribution to useDuplicatesRollup().contribute).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Ported VERBATIM from QualityMetricsContext.tsx:46-49
export interface DuplicatesBreakdown {
  patient?: number;
  hashByType: Record<string, number>;
}

// Ported VERBATIM from QualityMetricsContext.tsx:56-59
export interface DuplicatesContribution {
  patient?: number;
  hashType?: { resourceType: string; percentClean: number };
}

export interface DuplicatesRollup {
  overall: number | undefined;
  breakdown: DuplicatesBreakdown;
  /**
   * Plan 35-04 (UAT-FU-05): DERIVED getter exposing breakdown.hashByType
   * directly so the per-type quality matrix can read Duplicates per-type %
   * without a parallel useState. Identity stable (`byType === breakdown.hashByType`).
   * NOT settable — DuplicatesPanel.contribute() remains the sole producer.
   */
  byType: Record<string, number>;
  contribute: (contribution: DuplicatesContribution | 'reset') => void;
}

// Ported VERBATIM from QualityMetricsContext.tsx:94
export const EMPTY_DUPLICATES_BREAKDOWN: DuplicatesBreakdown = { hashByType: {} };

// Ported VERBATIM from QualityMetricsContext.tsx:96-105
export function deriveOverallDuplicates(b: DuplicatesBreakdown): number | undefined {
  const components: number[] = [];
  if (b.patient !== undefined) components.push(b.patient);
  for (const v of Object.values(b.hashByType)) {
    if (v !== undefined) components.push(v);
  }
  if (components.length === 0) return undefined;
  const sum = components.reduce((a, b) => a + b, 0);
  return Math.round(sum / components.length);
}

const DuplicatesCtx = createContext<DuplicatesRollup | null>(null);

export function DuplicatesProvider({ children }: { children: ReactNode }) {
  const [breakdown, setBreakdown] = useState<DuplicatesBreakdown>(EMPTY_DUPLICATES_BREAKDOWN);

  // useCallback wrapping the functional updater — ported VERBATIM from :117-135 (Pitfall 7 guard)
  const contribute = useCallback(
    (contribution: DuplicatesContribution | 'reset') => {
      if (contribution === 'reset') {
        setBreakdown(EMPTY_DUPLICATES_BREAKDOWN);
        return;
      }
      setBreakdown((prev) => {
        const nextHash = { ...prev.hashByType };
        if (contribution.hashType) {
          nextHash[contribution.hashType.resourceType] = contribution.hashType.percentClean;
        }
        return {
          patient: contribution.patient !== undefined ? contribution.patient : prev.patient,
          hashByType: nextHash,
        };
      });
    },
    [],
  );

  const overall = useMemo(() => deriveOverallDuplicates(breakdown), [breakdown]);
  const value = useMemo<DuplicatesRollup>(
    // Plan 35-04: byType is a passthrough of breakdown.hashByType — same
    // reference identity, so consumers comparing identity see the same
    // object as breakdown.hashByType.
    () => ({ overall, breakdown, byType: breakdown.hashByType, contribute }),
    [overall, breakdown, contribute],
  );

  return <DuplicatesCtx.Provider value={value}>{children}</DuplicatesCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useDuplicatesRollup(): DuplicatesRollup {
  const ctx = useContext(DuplicatesCtx);
  if (!ctx) {
    return {
      overall: undefined,
      breakdown: EMPTY_DUPLICATES_BREAKDOWN,
      byType: EMPTY_DUPLICATES_BREAKDOWN.hashByType,
      contribute: () => {},
    };
  }
  return ctx;
}
