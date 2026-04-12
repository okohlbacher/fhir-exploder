/**
 * QUAL-04 — structural (offline) validator tests.
 *
 * Wave 2 Plan 05 creates `src/quality/structuralValidator.ts` exporting:
 *   - createStructuralBackend(profile: StructureDefinition): ValidationBackend
 *   - validateStructural(resource, profile): OperationOutcomeIssue[]
 *
 * Structural validator emits one `error` issue per missing mustSupport /
 * min>=1 element. Must handle value[x] (Pitfall 3) identically to the
 * completeness walker.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — Wave 2 Plan 05 creates this module.
import { validateStructural } from '../quality/structuralValidator';
import { miniProfiles } from './fixtures/mii-profiles';
import { codingSamples } from './fixtures/fhir-samples';

describe('validateStructural (QUAL-04)', () => {
  it.todo('emits no issues when every mustSupport element is populated');
  it.todo('emits one issue per missing mustSupport element');
  it.todo('emits one issue per missing min>=1 element');
  it.todo('populates OperationOutcomeIssue.expression with the path');
  it.todo('sets OperationOutcomeIssue.severity to error for missing mustSupport');
  it.todo('treats value[x] Pitfall 3 identically to completeness walker');

  it('returns issues shaped as OperationOutcomeIssue[]', () => {
    const issues = validateStructural(
      // conditionEmpty is missing subject.reference? no, has subject — so
      // expect zero issues on required-only paths it satisfies. Assertion
      // is loose here — full coverage lives in the it.todo list above.
      codingSamples.conditionEmpty,
      miniProfiles.condition,
    );
    expect(Array.isArray(issues)).toBe(true);
  });
});
