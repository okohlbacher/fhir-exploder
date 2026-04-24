/**
 * QualityMetricsProviders — composer that mounts all 7 per-metric providers
 * in spec order (D-03 lock): Completeness → Coverage → Validation →
 * Plausibility → LabRanges → References → Duplicates (Completeness outermost,
 * Duplicates innermost). This is the single mount point for the split; the
 * facade useQualityMetrics() at ../QualityMetricsContext composes the 7 hooks
 * to preserve the pre-split API (Plan 32-02).
 */
import type { ReactNode } from 'react';
import { CompletenessProvider } from './CompletenessContext';
import { CoverageProvider } from './CoverageContext';
import { ValidationProvider } from './ValidationContext';
import { PlausibilityProvider } from './PlausibilityContext';
import { LabRangesProvider } from './LabRangesContext';
import { ReferencesProvider } from './ReferencesContext';
import { DuplicatesProvider } from './DuplicatesContext';

export function QualityMetricsProviders({ children }: { children: ReactNode }) {
  return (
    <CompletenessProvider>
      <CoverageProvider>
        <ValidationProvider>
          <PlausibilityProvider>
            <LabRangesProvider>
              <ReferencesProvider>
                <DuplicatesProvider>{children}</DuplicatesProvider>
              </ReferencesProvider>
            </LabRangesProvider>
          </PlausibilityProvider>
        </ValidationProvider>
      </CoverageProvider>
    </CompletenessProvider>
  );
}

// Re-export each per-metric hook so consumers have a single import path.
export { useCompletenessRollup, type CompletenessRollup } from './CompletenessContext';
export { useCoverageRollup, type CoverageRollup } from './CoverageContext';
export { useValidationRollup, type ValidationRollup } from './ValidationContext';
export { usePlausibilityRollup, type PlausibilityRollup } from './PlausibilityContext';
export { useLabRangesRollup, type LabRangesRollup } from './LabRangesContext';
export { useReferencesRollup, type ReferencesRollup } from './ReferencesContext';
export {
  useDuplicatesRollup,
  DuplicatesProvider,
  EMPTY_DUPLICATES_BREAKDOWN,
  deriveOverallDuplicates,
  type DuplicatesRollup,
  type DuplicatesBreakdown,
  type DuplicatesContribution,
} from './DuplicatesContext';
