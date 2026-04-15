/**
 * QUAL-02 — completeness walker unit tests.
 *
 * Plan 05-03 delivers `src/quality/completenessWalker.ts` exporting:
 *   - requiredElementPaths(sd: StructureDefinition): string[]
 *   - isPathPopulated(resource: unknown, path: string): boolean
 *   - computeCompleteness(sample: Resource[], requiredPaths: string[]):
 *       { populated: number; total: number; perPath: Record<string, number> }
 *
 * Critical behaviors tested here:
 * - Pitfall 3: value[x] choice-type handling (Observation.value[x] must
 *   match valueQuantity / valueString)
 * - Pitfall 4 limitation: sliced paths (coding[snomed]) are OUT OF SCOPE
 *   for completeness; tests assert the walker does not crash on them
 *   and simply treats the parent as present.
 */
import { describe, it, expect } from 'vitest';
import type { Resource, StructureDefinition } from '@medplum/fhirtypes';
import {
  requiredElementPaths,
  isPathPopulated,
  computeCompleteness,
} from '../quality/completenessWalker';
import { miniProfiles } from './fixtures/mii-profiles';
import { codingSamples, sampleResourcesByType } from './fixtures/fhir-samples';

describe('requiredElementPaths (QUAL-02)', () => {
  it('returns every mustSupport=true path', () => {
    const paths = requiredElementPaths(miniProfiles.condition);
    expect(paths).toContain('Condition.code');
    expect(paths).toContain('Condition.subject');
  });

  it('returns every min>=1 path when mustSupport is absent', () => {
    const paths = requiredElementPaths(miniProfiles.condition);
    // Condition.clinicalStatus in the fixture has min=1 but no mustSupport —
    // it must still surface from requiredElementPaths.
    expect(paths).toContain('Condition.clinicalStatus');
  });

  it('deduplicates paths present under both filters', () => {
    // Condition.code has BOTH min=1 AND mustSupport=true in the fixture.
    const paths = requiredElementPaths(miniProfiles.condition);
    const occurrences = paths.filter((p) => p === 'Condition.code').length;
    expect(occurrences).toBe(1);
  });

  it('falls back to differential.element when snapshot is missing', () => {
    const differentialOnly: StructureDefinition = {
      resourceType: 'StructureDefinition',
      url: 'http://example.org/fhir/StructureDefinition/DiffOnly',
      name: 'DiffOnly',
      type: 'Condition',
      kind: 'resource',
      abstract: false,
      status: 'active',
      differential: {
        element: [
          { path: 'Condition.code', min: 1, mustSupport: true },
          { path: 'Condition.subject', min: 1 },
        ],
      },
    };
    const paths = requiredElementPaths(differentialOnly);
    expect(paths).toEqual(expect.arrayContaining(['Condition.code', 'Condition.subject']));
  });

  it('drops elements without a path and drops elements where neither filter matches', () => {
    const sd: StructureDefinition = {
      resourceType: 'StructureDefinition',
      url: 'http://example.org/SD/Noise',
      name: 'Noise',
      type: 'Condition',
      kind: 'resource',
      abstract: false,
      status: 'active',
      snapshot: {
        element: [
          // no path
          { path: '', min: 1 } as unknown as { path: string; min: number },
          // neither mustSupport nor min>=1
          { path: 'Condition.note', min: 0 },
          // mustSupport
          { path: 'Condition.code', mustSupport: true },
        ],
      },
    };
    const paths = requiredElementPaths(sd);
    expect(paths).toEqual(['Condition.code']);
  });

  it('exposes the mustSupport + min>=1 paths from the Observation MII fixture', () => {
    const paths = requiredElementPaths(miniProfiles.observation);
    expect(paths).toContain('Observation.status');
    expect(paths).toContain('Observation.code');
    expect(paths).toContain('Observation.subject');
    expect(paths).toContain('Observation.value[x]');
  });
});

describe('isPathPopulated (QUAL-02)', () => {
  it('returns true when a scalar field is present and non-empty', () => {
    expect(isPathPopulated(codingSamples.conditionSystemCode, 'Condition.subject')).toBe(true);
    expect(isPathPopulated(codingSamples.observationMultipleCodings, 'Observation.status')).toBe(
      true,
    );
  });

  it('returns false when the final segment is missing on the resource', () => {
    expect(isPathPopulated({ resourceType: 'Condition' }, 'Condition.subject')).toBe(false);
    expect(
      isPathPopulated(codingSamples.conditionEmpty, 'Condition.code.coding'),
    ).toBe(false);
  });

  it('returns false for empty strings and empty arrays', () => {
    expect(isPathPopulated({ resourceType: 'Patient', name: [] }, 'Patient.name')).toBe(false);
    expect(isPathPopulated({ resourceType: 'Patient', gender: '' }, 'Patient.gender')).toBe(false);
  });

  it('returns true for populated array fields (takes first element)', () => {
    expect(isPathPopulated(codingSamples.patientWithIdentifiers, 'Patient.identifier')).toBe(true);
  });

  // --- Pitfall 3 regression ---
  it('handles value[x] true when valueQuantity is set', () => {
    expect(
      isPathPopulated(codingSamples.observationMultipleCodings, 'Observation.value[x]'),
    ).toBe(true);
  });

  it('handles value[x] true when valueString is set', () => {
    expect(
      isPathPopulated(codingSamples.observationValueString, 'Observation.value[x]'),
    ).toBe(true);
  });

  it('handles value[x] false when no value* key exists', () => {
    const obsNoValue = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'x' },
    };
    expect(isPathPopulated(obsNoValue, 'Observation.value[x]')).toBe(false);
  });

  it('does not crash on sliced/odd paths (Pitfall 4 — v1 limitation)', () => {
    // Sliced path syntax is out of scope for completeness walker v1.
    // We assert it does not throw and returns a sensible boolean.
    expect(() =>
      isPathPopulated(codingSamples.conditionSystemCode, 'Condition.code.coding'),
    ).not.toThrow();
    expect(
      isPathPopulated(codingSamples.conditionSystemCode, 'Condition.code.coding'),
    ).toBe(true);
  });
});

describe('computeCompleteness (QUAL-02)', () => {
  it('returns zero-populated, zero-total for empty sample', () => {
    expect(
      computeCompleteness([], ['Condition.code']),
    ).toEqual({ populated: 0, total: 0, perPath: {}, perResource: [] });
  });

  it('returns zero-populated, zero-total for empty requiredPaths', () => {
    expect(
      computeCompleteness(sampleResourcesByType.Condition, []),
    ).toEqual({ populated: 0, total: 0, perPath: {}, perResource: [] });
  });

  it('total equals sample.length * requiredPaths.length', () => {
    const result = computeCompleteness(sampleResourcesByType.Condition, [
      'Condition.code',
      'Condition.subject',
    ]);
    expect(result.total).toBe(sampleResourcesByType.Condition.length * 2);
  });

  it('per-path counts never exceed sample length', () => {
    const result = computeCompleteness(sampleResourcesByType.Condition, [
      'Condition.code',
      'Condition.subject',
    ]);
    for (const count of Object.values(result.perPath)) {
      expect(count).toBeLessThanOrEqual(sampleResourcesByType.Condition.length);
    }
  });

  it('counts Observation.status and .code on the fixtures', () => {
    const result = computeCompleteness(sampleResourcesByType.Observation, [
      'Observation.status',
      'Observation.code',
    ]);
    expect(result.total).toBe(sampleResourcesByType.Observation.length * 2);
    expect(result.perPath['Observation.status']).toBe(
      sampleResourcesByType.Observation.length,
    );
    expect(result.perPath['Observation.code']).toBe(
      sampleResourcesByType.Observation.length,
    );
    expect(result.populated).toBeGreaterThanOrEqual(result.perPath['Observation.code']);
  });

  it('populated equals the sum of perPath values', () => {
    const result = computeCompleteness(sampleResourcesByType.Condition, [
      'Condition.code',
      'Condition.subject',
    ]);
    const sum = Object.values(result.perPath).reduce((a, b) => a + b, 0);
    expect(result.populated).toBe(sum);
  });

  it('returns perResource with missing paths for resources that have gaps', () => {
    const sample = [
      { resourceType: 'Patient', id: 'p1', name: [{ family: 'Smith' }] } as Resource,
    ];
    const result = computeCompleteness(sample, ['Patient.name', 'Patient.birthDate']);
    expect(result.perResource).toBeDefined();
    expect(result.perResource).toHaveLength(1);
    expect(result.perResource[0]).toEqual({
      resourceId: 'Patient/p1',
      resourceType: 'Patient',
      missingPaths: ['Patient.birthDate'],
    });
  });

  it('returns empty perResource when all paths are populated', () => {
    const sample = [
      { resourceType: 'Patient', id: 'p2', name: [{ family: 'Doe' }], birthDate: '1990-01-01' } as Resource,
    ];
    const result = computeCompleteness(sample, ['Patient.name', 'Patient.birthDate']);
    expect(result.perResource).toEqual([]);
  });

  it('returns empty perResource for empty sample', () => {
    const result = computeCompleteness([], ['Patient.name']);
    expect(result.perResource).toEqual([]);
  });

  it('resource without id uses unknown in resourceId', () => {
    const sample = [
      { resourceType: 'Patient' } as Resource,
    ];
    const result = computeCompleteness(sample, ['Patient.name']);
    expect(result.perResource).toHaveLength(1);
    expect(result.perResource[0].resourceId).toBe('Patient/unknown');
  });
});
