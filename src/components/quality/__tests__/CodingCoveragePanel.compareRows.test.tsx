/**
 * CodingCoveragePanel.compareRows — QUAL-01 regression suite (Phase 41-02).
 *
 * Locks the N/A-to-bottom invariant for the compareRows function:
 *   - Rows with all pcts === null (types where totalCodedFields === 0)
 *     ALWAYS sort to the end, regardless of sort direction (ASC and DESC).
 *   - Pre-fix the panel relied on a literal +1 return that was correct
 *     under ASC by coincidence. This suite locks BOTH directions so future
 *     refactors cannot regress DESC.
 *
 * Test 1+2 share an `it()` block per CONTEXT D-11.
 */
import { describe, it, expect } from 'vitest';

import { compareRows, toRow } from '../CodingCoveragePanel';
import type { PerTypeCoverageReport } from '../../../quality/types';

function ccReport(
  systemCode: number,
  textOnly: number,
  empty: number,
  totalCodedFields: number,
): PerTypeCoverageReport {
  return {
    systemCode,
    textOnly,
    empty,
    totalCodedFields,
    perPath: {},
    sampleSize: 100,
    perPathExamples: {},
  };
}

describe('CodingCoveragePanel — compareRows N/A handling (QUAL-01)', () => {
  const fixture = [
    toRow('Patient', ccReport(50, 30, 20, 100)), // sys=50%, text=30%, empty=20%
    toRow('Observation', ccReport(80, 10, 10, 100)), // sys=80%, text=10%, empty=10%
    toRow('Consent', ccReport(0, 0, 0, 0)), // all pcts null (NA)
  ];

  it('Test 1+2 — systemCode ASC+DESC both push N/A to the bottom', () => {
    const asc = [...fixture].sort((a, b) => compareRows(a, b, 'systemCode', 'asc'));
    expect(asc.map((r) => r.type)).toEqual(['Patient', 'Observation', 'Consent']);

    const desc = [...fixture].sort((a, b) => compareRows(a, b, 'systemCode', 'desc'));
    expect(desc.map((r) => r.type)).toEqual(['Observation', 'Patient', 'Consent']);
  });

  it('Test 3 — textOnly ASC+DESC keeps N/A at end', () => {
    // Patient text=30%, Observation text=10%
    const asc = [...fixture].sort((a, b) => compareRows(a, b, 'textOnly', 'asc'));
    expect(asc.map((r) => r.type)).toEqual(['Observation', 'Patient', 'Consent']);

    const desc = [...fixture].sort((a, b) => compareRows(a, b, 'textOnly', 'desc'));
    expect(desc.map((r) => r.type)).toEqual(['Patient', 'Observation', 'Consent']);
  });
});
