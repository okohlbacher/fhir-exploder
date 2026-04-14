/**
 * QUAL-01 — counts aggregation logic (Wave 2 Plan 02).
 *
 * Tests the pure aggregation/sort helpers in `src/quality/counts.ts`
 * plus a sanity check on `useResourceCountsMetrics` exporting from its
 * hook file (renamed from `useQualityMetrics` in Phase 18 REVIEW-FIX
 * WR-02 to avoid collision with the rollup context hook).
 */
import { describe, it, expect } from 'vitest';
import { summarizeCounts, sortCounts } from '../quality/counts';
import { useResourceCountsMetrics } from '../hooks/useResourceCountsMetrics';
import type { CountValue } from '../quality/types';

describe('summarizeCounts (QUAL-01)', () => {
  it('returns total=0, typeCount=0, loadingCount=0, errorCount=0 when counts is empty', () => {
    expect(summarizeCounts({})).toEqual({
      total: 0,
      typeCount: 0,
      loadingCount: 0,
      errorCount: 0,
    });
  });

  it('sums numeric counts into total and increments typeCount for count > 0', () => {
    const counts: Record<string, CountValue> = { Patient: 120, Condition: 250 };
    expect(summarizeCounts(counts)).toEqual({
      total: 370,
      typeCount: 2,
      loadingCount: 0,
      errorCount: 0,
    });
  });

  it('counts "loading" entries separately in loadingCount', () => {
    const counts: Record<string, CountValue> = {
      Patient: 120,
      Observation: 'loading',
      Encounter: 'loading',
    };
    expect(summarizeCounts(counts)).toMatchObject({
      total: 120,
      typeCount: 1,
      loadingCount: 2,
      errorCount: 0,
    });
  });

  it('counts "error" entries separately in errorCount', () => {
    const counts: Record<string, CountValue> = {
      Patient: 120,
      Encounter: 'error',
    };
    expect(summarizeCounts(counts)).toMatchObject({
      total: 120,
      typeCount: 1,
      loadingCount: 0,
      errorCount: 1,
    });
  });

  it('excludes loading and error values from total; numeric zero does not increment typeCount', () => {
    const counts: Record<string, CountValue> = {
      Patient: 120,
      Condition: 250,
      Observation: 'loading',
      Encounter: 'error',
      AllergyIntolerance: 0,
    };
    expect(summarizeCounts(counts)).toEqual({
      total: 370, // numeric 0 adds nothing; loading/error excluded
      typeCount: 2, // Patient + Condition (zero excluded from typeCount > 0 rule)
      loadingCount: 1,
      errorCount: 1,
    });
  });

  it('matches the plan example exactly', () => {
    // Example from plan <behavior>:
    // { Patient: 120, Condition: 250, Observation: 'loading', Encounter: 'error' }
    // → { total: 370, typeCount: 2, loadingCount: 1, errorCount: 1 }
    const counts: Record<string, CountValue> = {
      Patient: 120,
      Condition: 250,
      Observation: 'loading',
      Encounter: 'error',
    };
    expect(summarizeCounts(counts)).toEqual({
      total: 370,
      typeCount: 2,
      loadingCount: 1,
      errorCount: 1,
    });
  });
});

describe('sortCounts (QUAL-01)', () => {
  const counts: Record<string, CountValue> = {
    Patient: 120,
    Condition: 250,
    Observation: 'loading',
    Encounter: 'error',
    AllergyIntolerance: 30,
  };

  it('orders numeric counts descending when by=count, direction=desc', () => {
    const rows = sortCounts(counts, 'count', 'desc', true);
    // Numeric first (desc), then non-numeric at end (alpha among themselves)
    const types = rows.map(r => r.type);
    // Numeric desc: Condition(250), Patient(120), AllergyIntolerance(30)
    expect(types.slice(0, 3)).toEqual(['Condition', 'Patient', 'AllergyIntolerance']);
    // Non-numeric pushed to end regardless of direction
    expect(new Set(types.slice(3))).toEqual(new Set(['Observation', 'Encounter']));
  });

  it('orders numeric counts ascending when by=count, direction=asc — non-numeric still at end', () => {
    const rows = sortCounts(counts, 'count', 'asc', true);
    const types = rows.map(r => r.type);
    // Numeric asc: AllergyIntolerance(30), Patient(120), Condition(250)
    expect(types.slice(0, 3)).toEqual(['AllergyIntolerance', 'Patient', 'Condition']);
    expect(new Set(types.slice(3))).toEqual(new Set(['Observation', 'Encounter']));
  });

  it('orders alphabetically ascending when by=name, direction=asc (ignores value state)', () => {
    const rows = sortCounts(counts, 'name', 'asc', true);
    expect(rows.map(r => r.type)).toEqual([
      'AllergyIntolerance',
      'Condition',
      'Encounter',
      'Observation',
      'Patient',
    ]);
  });

  it('orders alphabetically descending when by=name, direction=desc (ignores value state)', () => {
    const rows = sortCounts(counts, 'name', 'desc', true);
    expect(rows.map(r => r.type)).toEqual([
      'Patient',
      'Observation',
      'Encounter',
      'Condition',
      'AllergyIntolerance',
    ]);
  });

  it('hides rows with count=0 when includeEmpty=false (default)', () => {
    const withZero: Record<string, CountValue> = {
      Patient: 120,
      AllergyIntolerance: 0,
      Condition: 250,
    };
    const rows = sortCounts(withZero, 'count', 'desc');
    expect(rows.map(r => r.type)).toEqual(['Condition', 'Patient']);
  });

  it('shows rows with count=0 when includeEmpty=true', () => {
    const withZero: Record<string, CountValue> = {
      Patient: 120,
      AllergyIntolerance: 0,
      Condition: 250,
    };
    const rows = sortCounts(withZero, 'count', 'desc', true);
    expect(rows.map(r => r.type)).toEqual(['Condition', 'Patient', 'AllergyIntolerance']);
  });

  it('returns [] for empty input', () => {
    expect(sortCounts({}, 'count', 'desc')).toEqual([]);
  });
});

describe('useResourceCountsMetrics (QUAL-01)', () => {
  it('is exported as a function', () => {
    expect(typeof useResourceCountsMetrics).toBe('function');
  });
});
