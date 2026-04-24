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
 *
 * Phase 32 (EFF-R14) split: this module is now a FACADE. The 7 per-metric
 * context symbols + providers live under ./metrics/. Consumers that need
 * per-metric render isolation MUST import use<Metric>Rollup() from
 * ./metrics instead of useQualityMetrics() — facade consumers re-render
 * on any metric change (by design, for bulk-read call sites like the
 * capture/export handlers in QualityOverviewPage).
 */
import { useMemo } from 'react';
import {
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  usePlausibilityRollup,
  useLabRangesRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from './metrics';
import type { DuplicatesBreakdown, DuplicatesContribution } from './metrics/DuplicatesContext';

// Re-export for API-stability (Pitfall 4 guard — D-04).
export type { DuplicatesBreakdown, DuplicatesContribution } from './metrics/DuplicatesContext';

export interface QualityMetricsContextValue {
  /** Arithmetic mean of per-type completeness percentages (0-100). */
  overallCompleteness: number | undefined;
  /** Arithmetic mean of per-type coverage percentages (0-100). */
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

/**
 * Facade hook: composes the 7 per-metric rollup hooks into the pre-split
 * QualityMetricsContextValue shape. **For bulk-read consumers only**
 * (capture handler, PDF export handler). Per-metric consumers (7 tiles,
 * 7 tab labels, 7 producer sites) MUST call the specific use<Metric>Rollup()
 * hook from './metrics' for render isolation (Phase 32 EFF-R14 contract).
 *
 * Outside the 7-provider tree the underlying hooks return their no-op
 * fallbacks — the composed shape mirrors the pre-split no-op object, so
 * tests that render consumers without wrapping still render without
 * crashing (behavior preserved from the old :179-200 fallback).
 */
export function useQualityMetrics(): QualityMetricsContextValue {
  const completeness = useCompletenessRollup();
  const coverage = useCoverageRollup();
  const validation = useValidationRollup();
  const plausibility = usePlausibilityRollup();
  const labRanges = useLabRangesRollup();
  const references = useReferencesRollup();
  const duplicates = useDuplicatesRollup();

  return useMemo<QualityMetricsContextValue>(
    () => ({
      overallCompleteness: completeness.value,
      overallCoverage: coverage.value,
      overallValidation: validation.value,
      overallPlausibility: plausibility.value,
      overallLabRanges: labRanges.value,
      overallReferences: references.value,
      overallDuplicates: duplicates.overall,
      duplicatesBreakdown: duplicates.breakdown,
      setCompleteness: completeness.set,
      setCoverage: coverage.set,
      setOverallValidation: validation.set,
      setOverallPlausibility: plausibility.set,
      setOverallLabRanges: labRanges.set,
      setOverallReferences: references.set,
      setDuplicatesContribution: duplicates.contribute,
    }),
    [completeness, coverage, validation, plausibility, labRanges, references, duplicates],
  );
}
