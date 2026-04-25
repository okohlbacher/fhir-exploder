/**
 * ValidationContext — per-metric rollup slot for Validation.
 *
 * Rollup rule (from QualityMetricsContext.tsx:12-14, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallValidation: ValidationPanel pushes
 *   round((1 - unique(allNormalizedIssues.resourceId) / progress.total) * 100).
 *
 * Producer: ValidationPanel.tsx:229 (migrated in Plan 32-03 from
 * useQualityMetrics().setOverallValidation to useValidationRollup().set).
 *
 * Plan 35-04 (UAT-FU-05): TWO new slots added for the per-type quality matrix:
 *   - byType: per-type validation % clean map (matrix Validation column)
 *   - validationIssuesByType: per-type integer issue count (matrix Issues column)
 *     RESEARCH Q-01 — no existing per-type aggregate exists in ValidationPanel,
 *     so this is genuinely new state. ValidationPanel (single-type producer)
 *     must use the FUNCTIONAL setter form (setValidationIssuesByType((prev) => ...))
 *     so each per-type run merges into the prior map without clobbering it
 *     (Pitfall P-04 mitigation).
 */
import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export interface ValidationRollup {
  value: number | undefined;
  /** Plan 35-04: per-type % clean map (matrix Validation column). */
  byType: Record<string, number>;
  set: (value: number | undefined) => void;
  /** Plan 35-04: functional-setter form mandated (Pitfall P-04). */
  setByType: Dispatch<SetStateAction<Record<string, number>>>;
  /** Plan 35-04 (RESEARCH Q-01): per-type integer issue count for matrix Issues column. NEW slot. */
  validationIssuesByType: Record<string, number>;
  /** Plan 35-04: functional-setter form mandated for per-type single-shot runs (Pitfall P-04). */
  setValidationIssuesByType: Dispatch<SetStateAction<Record<string, number>>>;
}

const ValidationCtx = createContext<ValidationRollup | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [validationIssuesByType, setValidationIssuesByType] = useState<Record<string, number>>({});
  const memoed = useMemo<ValidationRollup>(
    () => ({ value, byType, set, setByType, validationIssuesByType, setValidationIssuesByType }),
    [value, byType, validationIssuesByType],
  );
  return <ValidationCtx.Provider value={memoed}>{children}</ValidationCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useValidationRollup(): ValidationRollup {
  const ctx = useContext(ValidationCtx);
  if (!ctx) {
    return {
      value: undefined,
      byType: {},
      set: () => {},
      setByType: () => {},
      validationIssuesByType: {},
      setValidationIssuesByType: () => {},
    };
  }
  return ctx;
}
