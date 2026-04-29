/**
 * CompletenessPanel.compareRows — QUAL-01 regression suite (Phase 41-02).
 *
 * Locks the N/A-to-bottom invariant for the compareRows function:
 *   - Rows with `pct === null` (types where state.total === 0) ALWAYS sort
 *     to the end, regardless of sort direction (ASC and DESC).
 *   - Mirrors the existing aSettled-pattern: loading/error rows sort below
 *     N/A rows.
 *
 * Test 1+2 share an `it()` block per CONTEXT D-11 — one fixture exercised
 * in both ASC and DESC to make accidental DESC regressions impossible.
 */
import { describe, it, expect } from 'vitest';

import { compareRows, toRow } from '../CompletenessPanel';
import type { PerTypeCompletenessReport, PerTypeReport } from '../../../quality/types';

function settledReport(populated: number, total: number): PerTypeCompletenessReport {
  return {
    populated,
    total,
    perPath: {},
    sampleSize: total,
    totalForType: total,
    profileUrl: null,
  };
}

describe('CompletenessPanel — compareRows N/A handling (QUAL-01)', () => {
  const fixture = [
    toRow('Patient', settledReport(80, 100)), // pct=80
    toRow('Encounter', settledReport(40, 100)), // pct=40
    toRow('Observation', settledReport(95, 100)), // pct=95
    toRow('Consent', settledReport(0, 0)), // pct=null (NA)
    toRow('AllergyIntolerance', settledReport(0, 0)), // pct=null (NA)
  ];

  it('Test 1+2 — ASC and DESC both push N/A to the bottom', () => {
    const asc = [...fixture].sort((a, b) => compareRows(a, b, 'completeness', 'asc'));
    expect(asc.map((r) => r.type)).toEqual([
      'Encounter', // 40
      'Patient', // 80
      'Observation', // 95
      'AllergyIntolerance', // NA (alpha tiebreak)
      'Consent', // NA
    ]);

    const desc = [...fixture].sort((a, b) => compareRows(a, b, 'completeness', 'desc'));
    expect(desc.map((r) => r.type)).toEqual([
      'Observation', // 95
      'Patient', // 80
      'Encounter', // 40
      'AllergyIntolerance', // NA — STILL at bottom under DESC
      'Consent', // NA
    ]);
  });

  it('Test 3 — sort by type with NA rows still at the bottom', () => {
    const byType = [...fixture].sort((a, b) => compareRows(a, b, 'type', 'asc'));
    // Settled rows (pct !== null) first in alpha order, then NA rows in alpha order.
    expect(byType.map((r) => r.type)).toEqual([
      'Encounter',
      'Observation',
      'Patient',
      'AllergyIntolerance',
      'Consent',
    ]);
  });

  it('Test 4 — loading rows sort below NA rows', () => {
    const loadingState: PerTypeReport<PerTypeCompletenessReport> = 'loading';
    const withLoading = [
      toRow('Patient', settledReport(80, 100)),
      toRow('Consent', settledReport(0, 0)),
      toRow('LoadingType', loadingState),
    ];
    const sorted = [...withLoading].sort((a, b) => compareRows(a, b, 'completeness', 'asc'));
    expect(sorted.map((r) => r.type)).toEqual(['Patient', 'Consent', 'LoadingType']);
  });
});
