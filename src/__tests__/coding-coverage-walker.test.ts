/**
 * QUAL-03 — classifyCodedFields walker unit tests.
 *
 * Wave 2 Plan 04 creates `src/quality/codingCoverageWalker.ts` exporting:
 *   - classifyCodedFields(resource: unknown, path?, out?): ClassifiedCodedField[]
 *
 * Critical behaviors:
 *   - systemCode: CodeableConcept with >=1 Coding that has BOTH system and code
 *   - textOnly:   CodeableConcept with only `text` (no coding or empty coding[])
 *   - empty:      CodeableConcept with neither text nor coding
 *   - Pitfall 5:  Identifier objects MUST NOT be classified (they have
 *     system+value, fail the CC every-keys filter)
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — Wave 2 Plan 04 creates this module.
import { classifyCodedFields } from '../quality/codingCoverageWalker';
import { codingSamples } from './fixtures/fhir-samples';

describe('classifyCodedFields (QUAL-03)', () => {
  it.todo('classifies a CodeableConcept with both system+code as systemCode');
  it.todo('classifies a CodeableConcept with only text as textOnly');
  it.todo('classifies a CodeableConcept with neither coding nor text as empty');
  it.todo('recurses into arrays with bracketed path segments');
  it.todo('yields disjoint results for each distinct CC path');

  it('classifies Condition.code systemCode for the fully-coded fixture', () => {
    const results = classifyCodedFields(codingSamples.conditionSystemCode);
    const conditionCode = results.find((r) => r.path.endsWith('code'));
    expect(conditionCode?.classification).toBe('systemCode');
  });

  it('classifies Condition.code textOnly when only text is present', () => {
    const results = classifyCodedFields(codingSamples.conditionTextOnly);
    const conditionCode = results.find((r) => r.path.endsWith('code'));
    expect(conditionCode?.classification).toBe('textOnly');
  });

  it('classifies Condition.code empty when neither text nor coding is present', () => {
    const results = classifyCodedFields(codingSamples.conditionEmpty);
    const conditionCode = results.find((r) => r.path.endsWith('code'));
    expect(conditionCode?.classification).toBe('empty');
  });

  it('excludes Patient.identifier[*] from classification (Pitfall 5)', () => {
    const results = classifyCodedFields(codingSamples.patientWithIdentifiers);
    // identifier is NOT a CodeableConcept (has `value`, `use`, fails the
    // every-keys filter). The walker must walk into identifier children
    // but MUST NOT emit a ClassifiedCodedField with `path` equal to the
    // Identifier root itself.
    const identifierRoot = results.find(
      (r) => r.path === 'identifier' || r.path === 'identifier[0]',
    );
    expect(identifierRoot).toBeUndefined();
  });
});
