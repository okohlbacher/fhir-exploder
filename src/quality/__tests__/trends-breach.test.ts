import { describe, it, expect } from 'vitest';
import { computeBreachedFlag } from '../trendsHistory';

/**
 * computeBreachedFlag mirrors Phase 18's isBreached(value, threshold)
 * contract: equality is NOT a breach (value < threshold, strict),
 * missing score or missing threshold means no breach.
 */
describe('computeBreachedFlag', () => {
  it('returns true when score is strictly below threshold', () => {
    expect(computeBreachedFlag(72, 80)).toBe(true);
  });

  it('returns false on equality (80 === 80 is NOT a breach)', () => {
    expect(computeBreachedFlag(80, 80)).toBe(false);
  });

  it('returns false when score is above threshold', () => {
    expect(computeBreachedFlag(85, 80)).toBe(false);
  });

  it('returns false when score is null (no data → no breach)', () => {
    expect(computeBreachedFlag(null, 80)).toBe(false);
  });

  it('returns false when threshold is null (disabled → no breach)', () => {
    expect(computeBreachedFlag(72, null)).toBe(false);
  });

  it('returns false when both score and threshold are null', () => {
    expect(computeBreachedFlag(null, null)).toBe(false);
  });

  it('returns false when score is undefined', () => {
    expect(computeBreachedFlag(undefined, 80)).toBe(false);
  });

  it('handles edge case: score 0 below threshold 1', () => {
    expect(computeBreachedFlag(0, 1)).toBe(true);
  });

  it('handles edge case: score 99.99 vs threshold 100', () => {
    expect(computeBreachedFlag(99.99, 100)).toBe(true);
  });
});
