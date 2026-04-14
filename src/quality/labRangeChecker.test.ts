import { describe, it, expect } from 'vitest';
import type { Observation, Resource } from '@medplum/fhirtypes';
import {
  checkLabRanges,
  normalizeLabRangeIssues,
  type LabRangeIssue,
  type ReferenceRangeConfig,
} from './labRangeChecker';

function makeObs(overrides: Partial<Observation> & { id: string }): Resource {
  return {
    resourceType: 'Observation',
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '2093-3', display: 'Total Cholesterol' }] },
    ...overrides,
  } as Resource;
}

const configRanges: Record<string, ReferenceRangeConfig> = {
  '2093-3': { low: 100, high: 300, unit: 'mg/dL' },
};

describe('checkLabRanges', () => {
  it('flags value below config low', () => {
    const obs = makeObs({ id: 'obs-1', valueQuantity: { value: 50, unit: 'mg/dL' } });
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(1);
    expect(issues[0].direction).toBe('below');
    expect(issues[0].value).toBe(50);
    expect(issues[0].low).toBe(100);
    expect(issues[0].rangeSource).toBe('config');
  });

  it('flags value above config high', () => {
    const obs = makeObs({ id: 'obs-2', valueQuantity: { value: 500, unit: 'mg/dL' } });
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(1);
    expect(issues[0].direction).toBe('above');
    expect(issues[0].value).toBe(500);
    expect(issues[0].high).toBe(300);
    expect(issues[0].rangeSource).toBe('config');
  });

  it('produces no issue for value within range', () => {
    const obs = makeObs({ id: 'obs-3', valueQuantity: { value: 200, unit: 'mg/dL' } });
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(0);
  });

  it('config range takes precedence over embedded referenceRange (D-10)', () => {
    const obs = makeObs({
      id: 'obs-4',
      valueQuantity: { value: 90, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 50 }, high: { value: 120 } }],
    });
    // Value 90 is within embedded range (50-120) but below config range (100-300)
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(1);
    expect(issues[0].direction).toBe('below');
    expect(issues[0].rangeSource).toBe('config');
    expect(issues[0].low).toBe(100);
  });

  it('uses embedded referenceRange when no config range exists', () => {
    const obs = makeObs({
      id: 'obs-5',
      code: { coding: [{ system: 'http://loinc.org', code: '9999-9', display: 'Unknown Lab' }] },
      valueQuantity: { value: 200, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 50 }, high: { value: 150 } }],
    });
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(1);
    expect(issues[0].direction).toBe('above');
    expect(issues[0].rangeSource).toBe('embedded');
    expect(issues[0].high).toBe(150);
  });

  it('produces no issue when neither config nor embedded range exists', () => {
    const obs = makeObs({
      id: 'obs-6',
      code: { coding: [{ system: 'http://loinc.org', code: '9999-9', display: 'Unknown Lab' }] },
      valueQuantity: { value: 200, unit: 'mg/dL' },
    });
    const { issues, summary } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(0);
    expect(summary.noRange).toBe(1);
  });

  it('skips observation without valueQuantity.value', () => {
    const obs = makeObs({ id: 'obs-7', valueQuantity: { unit: 'mg/dL' } });
    const { issues, summary } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(0);
    expect(summary.checked).toBe(0);
  });

  it('uses embedded referenceRange for observation without LOINC coding', () => {
    const obs: Resource = {
      resourceType: 'Observation',
      id: 'obs-8',
      status: 'final',
      code: { coding: [{ system: 'http://snomed.info/sct', code: '12345' }] },
      valueQuantity: { value: 200, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 50 }, high: { value: 150 } }],
    } as Resource;
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(1);
    expect(issues[0].direction).toBe('above');
    expect(issues[0].rangeSource).toBe('embedded');
    expect(issues[0].loincCode).toBeNull();
  });

  it('handles value equal to low boundary (no issue)', () => {
    const obs = makeObs({ id: 'obs-eq-low', valueQuantity: { value: 100, unit: 'mg/dL' } });
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(0);
  });

  it('handles value equal to high boundary (no issue)', () => {
    const obs = makeObs({ id: 'obs-eq-high', valueQuantity: { value: 300, unit: 'mg/dL' } });
    const { issues } = checkLabRanges([obs], configRanges);
    expect(issues).toHaveLength(0);
  });

  it('computes correct summary stats', () => {
    const observations: Resource[] = [
      makeObs({ id: 'a', valueQuantity: { value: 50 } }),   // below range
      makeObs({ id: 'b', valueQuantity: { value: 200 } }),  // in range
      makeObs({ id: 'c', valueQuantity: { value: 500 } }),  // above range
      makeObs({
        id: 'd',
        code: { coding: [{ system: 'http://loinc.org', code: '9999-9' }] },
        valueQuantity: { value: 100 },
      }), // no range
    ];
    const { summary } = checkLabRanges(observations, configRanges);
    expect(summary.checked).toBe(4);
    expect(summary.inRange).toBe(1);
    expect(summary.outOfRange).toBe(2);
    expect(summary.noRange).toBe(1);
    expect(summary.perLoincCode['2093-3']).toBeDefined();
    expect(summary.perLoincCode['2093-3'].checked).toBe(3);
    expect(summary.perLoincCode['2093-3'].outOfRange).toBe(2);
  });
});

describe('normalizeLabRangeIssues', () => {
  it('produces correct NormalizedIssue shape for below-range', () => {
    const issue: LabRangeIssue = {
      observationId: 'obs-1',
      loincCode: '2093-3',
      displayName: 'Total Cholesterol',
      value: 50,
      low: 100,
      high: 300,
      rangeSource: 'config',
      direction: 'below',
    };
    const normalized = normalizeLabRangeIssues([issue]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      resourceId: 'Observation/obs-1',
      resourceType: 'Observation',
      field: 'valueQuantity.value',
      description: 'Value 50 is below reference range low (100)',
      severity: 'warning',
    });
  });

  it('produces correct NormalizedIssue shape for above-range', () => {
    const issue: LabRangeIssue = {
      observationId: 'obs-2',
      loincCode: '2093-3',
      displayName: 'Total Cholesterol',
      value: 500,
      low: 100,
      high: 300,
      rangeSource: 'config',
      direction: 'above',
    };
    const normalized = normalizeLabRangeIssues([issue]);
    expect(normalized[0].description).toBe('Value 500 is above reference range high (300)');
  });
});
