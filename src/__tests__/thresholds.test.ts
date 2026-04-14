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
  it.todo('DEFAULT_THRESHOLDS has 7 keys with expected values');
  it.todo('STORAGE_KEY equals quality.thresholds.v1');
});

describe('resolveThreshold', () => {
  it.todo('returns default when key is absent');
  it.todo('returns null when stored[key] is null');
  it.todo('returns the number when stored[key] is a number');
});

describe('isBreached', () => {
  it.todo('returns false when value is undefined');
  it.todo('returns false when threshold is null');
  it.todo('returns false when value >= threshold');
  it.todo('returns true when value < threshold');
});

describe('useThresholds', () => {
  it.todo('setThreshold persists to localStorage');
  it.todo('clearThreshold stores null (distinct from resetThreshold)');
  it.todo('resetAll clears overrides object');
});
