import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  DEFAULT_THRESHOLDS,
  STORAGE_KEY,
  isBreached,
  resolveThreshold,
  type MetricKey,
  type Thresholds,
} from '../quality/thresholds';
import { useThresholds } from '../hooks/useThresholds';

beforeEach(() => {
  window.localStorage.clear();
});

describe('thresholds constants', () => {
  it('DEFAULT_THRESHOLDS has 7 keys with expected values', () => {
    expect(DEFAULT_THRESHOLDS).toEqual({
      completeness: 80,
      coverage: 70,
      validation: 95,
      plausibility: 99,
      labRanges: 95,
      duplicates: 99,
      references: 98,
    });
  });
  it('STORAGE_KEY equals quality.thresholds.v1', () => {
    expect(STORAGE_KEY).toBe('quality.thresholds.v1');
  });
});

describe('resolveThreshold', () => {
  it('returns default when key is absent', () => {
    const stored: Thresholds = {};
    expect(resolveThreshold('completeness', stored)).toBe(80);
  });
  it('returns null when stored[key] is null', () => {
    const stored: Thresholds = { validation: null };
    expect(resolveThreshold('validation', stored)).toBeNull();
  });
  it('returns the number when stored[key] is a number', () => {
    const stored: Thresholds = { coverage: 42 };
    expect(resolveThreshold('coverage', stored)).toBe(42);
  });
});

describe('isBreached', () => {
  it('returns false when value is undefined', () => {
    expect(isBreached(undefined, 80)).toBe(false);
  });
  it('returns false when threshold is null', () => {
    expect(isBreached(50, null)).toBe(false);
  });
  it('returns false when value >= threshold', () => {
    expect(isBreached(80, 80)).toBe(false);
    expect(isBreached(81, 80)).toBe(false);
  });
  it('returns true when value < threshold', () => {
    expect(isBreached(79, 80)).toBe(true);
    expect(isBreached(0, 1)).toBe(true);
  });
});

describe('useThresholds', () => {
  it('setThreshold persists to localStorage', () => {
    const { result } = renderHook(() => useThresholds());
    act(() => result.current.setThreshold('completeness', 75));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({ completeness: 75 });
  });
  it('clearThreshold stores null (distinct from resetThreshold)', () => {
    const { result } = renderHook(() => useThresholds());
    act(() => result.current.setThreshold('validation', 90));
    act(() => result.current.clearThreshold('validation'));
    expect(result.current.stored).toEqual({ validation: null });
    // resetThreshold removes the key entirely (falls back to default).
    act(() => result.current.resetThreshold('validation'));
    expect(result.current.stored).toEqual({});
  });
  it('resetAll clears overrides object', () => {
    const { result } = renderHook(() => useThresholds());
    act(() => {
      result.current.setThreshold('completeness', 90);
      result.current.setThreshold('coverage', 60);
    });
    act(() => result.current.resetAll());
    expect(result.current.stored).toEqual({});
  });
});

// Type-level assertion: MetricKey union remains usable at compile time.
const _metricKeyTypeCheck: MetricKey = 'completeness';
void _metricKeyTypeCheck;
