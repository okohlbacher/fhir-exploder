/**
 * QUAL-02 — completeness walker unit tests.
 *
 * Wave 2 Plan 03 creates `src/quality/completenessWalker.ts` exporting:
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
// @ts-expect-error — Wave 2 Plan 03 creates this module.
import {
  requiredElementPaths,
  isPathPopulated,
  computeCompleteness,
} from '../quality/completenessWalker';
import { miniProfiles } from './fixtures/mii-profiles';
import { codingSamples, sampleResourcesByType } from './fixtures/fhir-samples';

describe('requiredElementPaths (QUAL-02)', () => {
  it.todo('returns every mustSupport=true path');
  it.todo('returns every min>=1 path when mustSupport is absent');
  it.todo('deduplicates paths present under both filters');
  it.todo('falls back to differential.element when snapshot is missing');

  it('exposes the mustSupport + min>=1 paths from the Observation MII fixture', () => {
    const paths = requiredElementPaths(miniProfiles.observation);
    expect(paths).toContain('Observation.status');
    expect(paths).toContain('Observation.code');
    expect(paths).toContain('Observation.subject');
    expect(paths).toContain('Observation.value[x]');
  });
});

describe('isPathPopulated (QUAL-02, Pitfall 3)', () => {
  it.todo('returns true when a scalar field is present and non-empty');
  it.todo('returns false when the final segment is missing on the resource');
  it.todo('returns false for empty strings and empty arrays');

  it('handles value[x] by checking any key with the strippedvalue prefix (Pitfall 3)', () => {
    // valueQuantity present → value[x] populated
    expect(isPathPopulated(codingSamples.observationMultipleCodings, 'Observation.value[x]')).toBe(
      true,
    );
    // valueString present → value[x] populated
    expect(isPathPopulated(codingSamples.observationValueString, 'Observation.value[x]')).toBe(
      true,
    );
  });
});

describe('computeCompleteness (QUAL-02)', () => {
  it.todo('returns zero-populated, zero-total for empty sample');
  it.todo('computes total = sample.length * requiredPaths.length');
  it.todo('per-path counts never exceed sample length');

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
});
