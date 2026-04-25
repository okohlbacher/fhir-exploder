/**
 * byType.test.tsx — Plan 35-04 Task 1 contract test for the per-type quality
 * matrix data plumbing (UAT-FU-05).
 *
 * Asserts:
 *   - Each of the 4 byType-extended contexts (Completeness, Coverage,
 *     References + Validation) starts empty, accepts both replacement and
 *     functional setter forms, and surfaces a reference-stable setter
 *     (Pitfall P-14 mitigation).
 *   - ValidationContext exposes the additional NEW Q-01 slot
 *     `validationIssuesByType` with the same setter contract.
 *   - DuplicatesContext.byType is a derived getter — identity-stable with
 *     `breakdown.hashByType` (Plan 35-04 passthrough invariant).
 *   - Phase 32 facade preservation invariant: `useQualityMetrics()` does
 *     NOT expose a `byType` field. Matrix consumes per-metric hooks only.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import { QualityMetricsProviders } from '../index';
import { useCompletenessRollup } from '../CompletenessContext';
import { useCoverageRollup } from '../CoverageContext';
import { useValidationRollup } from '../ValidationContext';
import { useReferencesRollup } from '../ReferencesContext';
import { useDuplicatesRollup } from '../DuplicatesContext';
import { useQualityMetrics } from '../../QualityMetricsContext';

function Wrapper({ children }: { children: ReactNode }) {
  return <QualityMetricsProviders>{children}</QualityMetricsProviders>;
}

describe.each([
  { name: 'Completeness', useHook: useCompletenessRollup },
  { name: 'Coverage', useHook: useCoverageRollup },
  { name: 'References', useHook: useReferencesRollup },
])('UAT-FU-05: $name byType slot', ({ useHook }) => {
  it('starts empty', () => {
    const { result } = renderHook(useHook, { wrapper: Wrapper });
    expect(result.current.byType).toEqual({});
  });

  it('accepts setByType(map)', () => {
    const { result } = renderHook(useHook, { wrapper: Wrapper });
    act(() => result.current.setByType({ Patient: 80 }));
    expect(result.current.byType).toEqual({ Patient: 80 });
  });

  it('accepts functional setByType((prev) => ...)', () => {
    const { result } = renderHook(useHook, { wrapper: Wrapper });
    act(() => result.current.setByType({ Patient: 80 }));
    act(() => result.current.setByType((prev) => ({ ...prev, Condition: 90 })));
    expect(result.current.byType).toEqual({ Patient: 80, Condition: 90 });
  });

  it('setByType reference is stable across re-renders (P-14)', () => {
    const { result, rerender } = renderHook(useHook, { wrapper: Wrapper });
    const setterA = result.current.setByType;
    rerender();
    const setterB = result.current.setByType;
    expect(setterA).toBe(setterB);
  });
});

describe('UAT-FU-05: Validation byType + validationIssuesByType slots', () => {
  it('byType + validationIssuesByType both start empty', () => {
    const { result } = renderHook(useValidationRollup, { wrapper: Wrapper });
    expect(result.current.byType).toEqual({});
    expect(result.current.validationIssuesByType).toEqual({});
  });

  it('functional setValidationIssuesByType merges entries', () => {
    const { result } = renderHook(useValidationRollup, { wrapper: Wrapper });
    act(() => result.current.setValidationIssuesByType({ Condition: 12 }));
    act(() =>
      result.current.setValidationIssuesByType((prev) => ({ ...prev, Observation: 0 })),
    );
    expect(result.current.validationIssuesByType).toEqual({ Condition: 12, Observation: 0 });
  });

  it('setValidationIssuesByType reference is stable across re-renders (P-14)', () => {
    const { result, rerender } = renderHook(useValidationRollup, { wrapper: Wrapper });
    const setterA = result.current.setValidationIssuesByType;
    rerender();
    const setterB = result.current.setValidationIssuesByType;
    expect(setterA).toBe(setterB);
  });
});

describe('UAT-FU-05: Duplicates byType derived getter', () => {
  it('byType reflects breakdown.hashByType passthrough', () => {
    const { result } = renderHook(useDuplicatesRollup, { wrapper: Wrapper });
    expect(result.current.byType).toEqual({});
    act(() =>
      result.current.contribute({ hashType: { resourceType: 'Patient', percentClean: 95 } }),
    );
    expect(result.current.byType).toEqual({ Patient: 95 });
    // Identity stability — byType is the same reference as breakdown.hashByType.
    expect(result.current.byType).toBe(result.current.breakdown.hashByType);
  });
});

describe('UAT-FU-05: Phase 32 facade NOT extended with byType', () => {
  it('useQualityMetrics() return shape does NOT include byType', () => {
    const { result } = renderHook(useQualityMetrics, { wrapper: Wrapper });
    expect((result.current as unknown as Record<string, unknown>).byType).toBeUndefined();
  });
});
