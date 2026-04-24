/**
 * ValidationContext — per-metric rollup slot for Validation.
 *
 * Rollup rule (from QualityMetricsContext.tsx:12-14, ported verbatim per D-02 + CONTEXT.md <specifics>):
 * overallValidation: ValidationPanel pushes
 *   round((1 - unique(allNormalizedIssues.resourceId) / progress.total) * 100).
 *
 * Producer: ValidationPanel.tsx:229 (migrated in Plan 32-03 from
 * useQualityMetrics().setOverallValidation to useValidationRollup().set).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface ValidationRollup {
  value: number | undefined;
  set: (value: number | undefined) => void;
}

const ValidationCtx = createContext<ValidationRollup | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<number | undefined>(undefined);
  const memoed = useMemo<ValidationRollup>(() => ({ value, set }), [value]);
  return <ValidationCtx.Provider value={memoed}>{children}</ValidationCtx.Provider>;
}

/** Outside provider returns a no-op — matches existing fallback at QualityMetricsContext.tsx:179-200. */
export function useValidationRollup(): ValidationRollup {
  const ctx = useContext(ValidationCtx);
  if (!ctx) return { value: undefined, set: () => {} };
  return ctx;
}
