/**
 * providers-smoke.test.tsx — 7-provider smoke test (EFF-R14-02).
 *
 * Guards against shared-context-symbol regressions in QualityMetricsProviders.
 * If CompletenessCtx and CoverageCtx accidentally pointed to the same
 * createContext() call, mounting them both would cause one to silently
 * shadow the other — all 7 hooks MUST be proved to subscribe to
 * independent contexts.
 *
 * No strict-mode wrap — per 32-RESEARCH §Pitfall 2 (strict-mode double-renders
 * would distort any future render-count assertion; this test doesn't need it).
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import {
  QualityMetricsProviders,
  useCompletenessRollup,
  useCoverageRollup,
  useValidationRollup,
  usePlausibilityRollup,
  useLabRangesRollup,
  useReferencesRollup,
  useDuplicatesRollup,
} from '../index';

function Wrapper({ children }: { children: ReactNode }) {
  return <QualityMetricsProviders>{children}</QualityMetricsProviders>;
}

describe('QualityMetricsProviders composer (EFF-R14-02)', () => {
  it('all 7 per-metric hooks return live contexts and update independently', () => {
    const { result } = renderHook(
      () => ({
        completeness: useCompletenessRollup(),
        coverage: useCoverageRollup(),
        validation: useValidationRollup(),
        plausibility: usePlausibilityRollup(),
        labRanges: useLabRangesRollup(),
        references: useReferencesRollup(),
        duplicates: useDuplicatesRollup(),
      }),
      { wrapper: Wrapper },
    );

    // Initial values — all simple metrics start undefined; duplicates start as EMPTY_DUPLICATES_BREAKDOWN.
    expect(result.current.completeness.value).toBeUndefined();
    expect(result.current.coverage.value).toBeUndefined();
    expect(result.current.validation.value).toBeUndefined();
    expect(result.current.plausibility.value).toBeUndefined();
    expect(result.current.labRanges.value).toBeUndefined();
    expect(result.current.references.value).toBeUndefined();
    expect(result.current.duplicates.overall).toBeUndefined();
    expect(result.current.duplicates.breakdown).toEqual({ hashByType: {} });

    // Set each simple metric to a unique value. If two share a symbol, we'd see
    // one value leak into another slot or stay undefined.
    act(() => {
      result.current.completeness.set(11);
      result.current.coverage.set(22);
      result.current.validation.set(33);
      result.current.plausibility.set(44);
      result.current.labRanges.set(55);
      result.current.references.set(66);
    });

    expect(result.current.completeness.value).toBe(11);
    expect(result.current.coverage.value).toBe(22);
    expect(result.current.validation.value).toBe(33);
    expect(result.current.plausibility.value).toBe(44);
    expect(result.current.labRanges.value).toBe(55);
    expect(result.current.references.value).toBe(66);

    // Duplicates has a special shape — contribute() merges into breakdown.
    act(() => {
      result.current.duplicates.contribute({ patient: 77 });
    });
    expect(result.current.duplicates.breakdown.patient).toBe(77);
    expect(result.current.duplicates.overall).toBe(77);

    act(() => {
      result.current.duplicates.contribute({ hashType: { resourceType: 'Observation', percentClean: 99 } });
    });
    expect(result.current.duplicates.breakdown.hashByType.Observation).toBe(99);
    // overall = round(mean([77, 99])) = 88
    expect(result.current.duplicates.overall).toBe(88);

    // Reset clears everything.
    act(() => {
      result.current.duplicates.contribute('reset');
    });
    expect(result.current.duplicates.breakdown).toEqual({ hashByType: {} });
    expect(result.current.duplicates.overall).toBeUndefined();

    // Simple-metric values should be UNAFFECTED by Duplicates activity — independent contexts.
    expect(result.current.completeness.value).toBe(11);
    expect(result.current.coverage.value).toBe(22);
  });
});
