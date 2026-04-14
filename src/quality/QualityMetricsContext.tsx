/**
 * QualityMetricsContext — the rollup rendezvous between panel-level
 * producers and the OverviewStrip consumer. Producers push their
 * "% clean" aggregate via the setOverall* setters; the OverviewStrip
 * reads the corresponding overall* value to render tile + breach state.
 *
 * ROLLUP RULES (locked in Phase 18 — see 18-RESEARCH.md §% Clean Derivation):
 * - overallCompleteness: arithmetic mean of per-type populated/total*100
 *   (useCompletenessReport — unchanged from v1.0).
 * - overallCoverage: arithmetic mean of per-type systemCode/totalCodedFields*100
 *   (useCodingCoverage — unchanged from v1.0).
 * - overallValidation: ValidationPanel pushes
 *   round((1 - unique(allNormalizedIssues.resourceId) / progress.total) * 100).
 * - overallPlausibility: PlausibilityPanel pushes round using unique issue resourceIds.
 * - overallLabRanges: LabRangesPanel pushes round using summary.outOfRange / summary.checked;
 *   undefined when no ranges are configured (summary.noRange === summary.checked).
 * - overallDuplicates: DERIVED from `duplicatesBreakdown` — DuplicatesPanel pushes
 *   per-type "% clean" contributions via setDuplicatesContribution; the context
 *   accumulates them and computes overallDuplicates = round(mean(definedComponents))
 *   where definedComponents = [breakdown.patient, ...Object.values(breakdown.hashByType)]
 *   filtered to defined values. Types not yet run are EXCLUDED, NOT scored as 0.
 *   (RESOLVED 2026-04-14 — RESEARCH Q1: true per-type averaging; single-type
 *   conservative rollup REJECTED.)
 * - overallReferences: ReferencesPanel pushes round using unique resourceId / sampleSize.
 *
 * Producers MUST gate the setter call on run.status terminal (complete|cancelled)
 * to avoid mid-run tile flicker (pitfall 2 in 18-RESEARCH.md).
 * Producers MUST push `undefined` (NOT 0) when the denominator is invalid — the
 * OverviewStrip renders undefined as an em-dash per D-17/D-18.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Per-metric duplicates breakdown. Components are pushed by DuplicatesPanel
 * after each terminal-status run; the context derives `overallDuplicates`
 * from this map (RESOLVED 2026-04-14 — RESEARCH Q1: true per-type averaging,
 * NOT single-type conservative rollup).
 *
 * - `patient`: % clean from the patient pass (undefined until patient pass runs)
 * - `hashByType[T]`: % clean for content-hash dedup of resource type T
 *   (undefined until the user has selected T and run the panel)
 *
 * Types not yet run are EXCLUDED from the average — they contribute
 * `undefined`, NOT 0. The average widens organically as more types run.
 */
export interface DuplicatesBreakdown {
  patient?: number;
  hashByType: Record<string, number>;
}

/**
 * Single contribution emitted by DuplicatesPanel after a terminal-status run.
 * Either component may be undefined if that pass did not produce a usable
 * cleanliness number (e.g., patient pass skipped because no patient sample).
 */
export interface DuplicatesContribution {
  patient?: number;
  hashType?: { resourceType: string; percentClean: number };
}

export interface QualityMetricsContextValue {
  /** Arithmetic mean of per-type completeness percentages (0-100). Undefined until Plan 03 sets. */
  overallCompleteness: number | undefined;
  /** Arithmetic mean of per-type coverage percentages (0-100). Undefined until Plan 04 sets. */
  overallCoverage: number | undefined;
  overallValidation: number | undefined;
  overallPlausibility: number | undefined;
  overallLabRanges: number | undefined;
  /** DERIVED from duplicatesBreakdown via deriveOverallDuplicates — NOT settable directly. */
  overallDuplicates: number | undefined;
  overallReferences: number | undefined;

  /** Accumulates per-type % clean contributions from DuplicatesPanel; re-runs overwrite a single type's prior score. */
  duplicatesBreakdown: DuplicatesBreakdown;

  setCompleteness: (value: number | undefined) => void;
  setCoverage: (value: number | undefined) => void;
  setOverallValidation: (value: number | undefined) => void;
  setOverallPlausibility: (value: number | undefined) => void;
  setOverallLabRanges: (value: number | undefined) => void;
  setOverallReferences: (value: number | undefined) => void;

  /**
   * DuplicatesPanel calls this after each terminal-status run.
   * Context merges the contribution into `duplicatesBreakdown` and
   * recomputes `overallDuplicates = round(mean(definedComponents))`.
   * Pass `'reset'` to clear all duplicates state (e.g., on disconnect).
   */
  setDuplicatesContribution: (contribution: DuplicatesContribution | 'reset') => void;
}

const Ctx = createContext<QualityMetricsContextValue | null>(null);

const EMPTY_DUPLICATES_BREAKDOWN: DuplicatesBreakdown = { hashByType: {} };

function deriveOverallDuplicates(b: DuplicatesBreakdown): number | undefined {
  const components: number[] = [];
  if (b.patient !== undefined) components.push(b.patient);
  for (const v of Object.values(b.hashByType)) {
    if (v !== undefined) components.push(v);
  }
  if (components.length === 0) return undefined;
  const sum = components.reduce((a, b) => a + b, 0);
  return Math.round(sum / components.length);
}

export function QualityMetricsProvider({ children }: { children: ReactNode }) {
  const [overallCompleteness, setCompleteness] = useState<number | undefined>(undefined);
  const [overallCoverage, setCoverage] = useState<number | undefined>(undefined);
  const [overallValidation, setOverallValidation] = useState<number | undefined>(undefined);
  const [overallPlausibility, setOverallPlausibility] = useState<number | undefined>(undefined);
  const [overallLabRanges, setOverallLabRanges] = useState<number | undefined>(undefined);
  const [overallReferences, setOverallReferences] = useState<number | undefined>(undefined);
  const [duplicatesBreakdown, setDuplicatesBreakdownState] =
    useState<DuplicatesBreakdown>(EMPTY_DUPLICATES_BREAKDOWN);

  const setDuplicatesContribution = useCallback(
    (contribution: DuplicatesContribution | 'reset') => {
      if (contribution === 'reset') {
        setDuplicatesBreakdownState(EMPTY_DUPLICATES_BREAKDOWN);
        return;
      }
      setDuplicatesBreakdownState((prev) => {
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

  const overallDuplicates = useMemo(
    () => deriveOverallDuplicates(duplicatesBreakdown),
    [duplicatesBreakdown],
  );

  const value = useMemo(
    () => ({
      overallCompleteness,
      overallCoverage,
      overallValidation,
      overallPlausibility,
      overallLabRanges,
      overallDuplicates,
      overallReferences,
      duplicatesBreakdown,
      setCompleteness,
      setCoverage,
      setOverallValidation,
      setOverallPlausibility,
      setOverallLabRanges,
      setOverallReferences,
      setDuplicatesContribution,
    }),
    [
      overallCompleteness,
      overallCoverage,
      overallValidation,
      overallPlausibility,
      overallLabRanges,
      overallDuplicates,
      overallReferences,
      duplicatesBreakdown,
      setDuplicatesContribution,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Consumer hook. Outside the provider (e.g., isolated unit tests) returns
 * a no-op fallback so consumers render without crashing.
 */
export function useQualityMetrics(): QualityMetricsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      overallCompleteness: undefined,
      overallCoverage: undefined,
      overallValidation: undefined,
      overallPlausibility: undefined,
      overallLabRanges: undefined,
      overallDuplicates: undefined,
      overallReferences: undefined,
      duplicatesBreakdown: EMPTY_DUPLICATES_BREAKDOWN,
      setCompleteness: () => {},
      setCoverage: () => {},
      setOverallValidation: () => {},
      setOverallPlausibility: () => {},
      setOverallLabRanges: () => {},
      setOverallReferences: () => {},
      setDuplicatesContribution: () => {},
    };
  }
  return ctx;
}
