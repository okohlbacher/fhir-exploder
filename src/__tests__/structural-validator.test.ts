/**
 * QUAL-04 — structural (offline) validator tests.
 *
 * `src/quality/structuralValidator.ts` exports:
 *   - validateStructural(resource, profile | null) → OperationOutcomeIssue[]
 *   - createStructuralBackend(getProfile) → ValidationBackend
 *
 * Structural validator emits one `error` issue per missing mustSupport /
 * min>=1 element. Must handle value[x] (Pitfall 3) identically to the
 * completeness walker (shared path walker under the hood).
 */
import { describe, it, expect } from 'vitest';
import {
  validateStructural,
  createStructuralBackend,
} from '../quality/structuralValidator';
import { miniProfiles } from './fixtures/mii-profiles';
import { codingSamples } from './fixtures/fhir-samples';
import type { Condition, Observation, StructureDefinition } from '@medplum/fhirtypes';

describe('validateStructural (QUAL-04)', () => {
  it('returns [] when profile is null (unbundled type)', () => {
    const issues = validateStructural(codingSamples.patientWithIdentifiers, null);
    expect(issues).toEqual([]);
  });

  it('returns [] when every required path is populated', () => {
    // conditionSystemCode has code + subject, but miniProfiles.condition
    // ALSO requires clinicalStatus (min=1). The fixture does not carry
    // clinicalStatus, so build a locally fully-populated one for this case.
    const fullyPopulated: Condition = {
      resourceType: 'Condition',
      id: 'full',
      code: { coding: [{ system: 's', code: 'c' }] },
      subject: { reference: 'Patient/1' },
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
      },
    };
    expect(validateStructural(fullyPopulated, miniProfiles.condition)).toEqual([]);
  });

  it('emits one severity=error, code=required issue per missing required path', () => {
    // conditionEmpty: has code (but {} — walker treats {} as non-populated)
    // and subject populated. Missing clinicalStatus (required by profile).
    // code {} counts as non-populated under isPathPopulated (empty object).
    const issues = validateStructural(codingSamples.conditionEmpty, miniProfiles.condition);
    const paths = issues.map((i) => i.expression?.[0]);
    expect(paths).toContain('Condition.code');
    expect(paths).toContain('Condition.clinicalStatus');
    for (const issue of issues) {
      expect(issue.severity).toBe('error');
      expect(issue.code).toBe('required');
      expect(Array.isArray(issue.expression)).toBe(true);
      expect(issue.expression?.length).toBe(1);
      expect(typeof issue.diagnostics).toBe('string');
    }
  });

  it('diagnostics mentions the profile name', () => {
    const issues = validateStructural(codingSamples.conditionEmpty, miniProfiles.condition);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].diagnostics).toContain('Diagnose');
  });

  it('handles value[x] Pitfall 3 identically to completenessWalker', () => {
    // observationMultipleCodings has valueQuantity — should satisfy value[x]
    // observationValueString has valueString — should satisfy value[x]
    // A resource with NO value* key should NOT satisfy (but value[x] in
    // mini-profile has min=0, so it is NOT in requiredElementPaths anyway).
    // To test Pitfall 3 directly, craft a profile where value[x] is min=1.
    const valueXRequiredProfile: StructureDefinition = {
      ...miniProfiles.observation,
      snapshot: {
        element: [
          { path: 'Observation', min: 0 },
          { path: 'Observation.status', min: 1, mustSupport: true },
          { path: 'Observation.code', min: 1, mustSupport: true },
          { path: 'Observation.subject', min: 1, mustSupport: true },
          { path: 'Observation.value[x]', min: 1, mustSupport: true },
        ],
      },
    };
    const withValueQty = codingSamples.observationMultipleCodings;
    const withValueStr = codingSamples.observationValueString;
    const withoutValue: Observation = {
      resourceType: 'Observation',
      id: 'no-value',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: 'x' }] },
      subject: { reference: 'Patient/1' },
    };
    expect(validateStructural(withValueQty, valueXRequiredProfile)).toEqual([]);
    expect(validateStructural(withValueStr, valueXRequiredProfile)).toEqual([]);
    const missingIssues = validateStructural(withoutValue, valueXRequiredProfile);
    expect(missingIssues.map((i) => i.expression?.[0])).toContain(
      'Observation.value[x]',
    );
  });
});

describe('createStructuralBackend', () => {
  it('returns a ValidationBackend of kind "structural"', () => {
    const backend = createStructuralBackend(() => null);
    expect(backend.kind).toBe('structural');
    expect(typeof backend.validate).toBe('function');
  });

  it('returns [] when getProfile returns null for the resource type', async () => {
    const backend = createStructuralBackend(() => null);
    const issues = await backend.validate(codingSamples.patientWithIdentifiers);
    expect(issues).toEqual([]);
  });

  it('delegates profile lookup to the injected getProfile function', async () => {
    const backend = createStructuralBackend((rt) =>
      rt === 'Condition' ? miniProfiles.condition : null,
    );
    const issues = await backend.validate(codingSamples.conditionEmpty);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.severity === 'error')).toBe(true);
  });
});

describe('createStructuralBackend — FIX-05 AbortSignal early-exit', () => {
  it('returns [] when invoked with an already-aborted signal (no walker work)', async () => {
    const profile = miniProfiles.condition;
    const backend = createStructuralBackend((type) =>
      type === 'Condition' ? profile : null,
    );
    const controller = new AbortController();
    controller.abort();
    // The fixture below would normally produce missing-required-path issues
    // because clinicalStatus is min=1 in miniProfiles.condition.
    const resource: Condition = {
      resourceType: 'Condition',
      id: 'c1',
      code: { coding: [{ system: 's', code: 'c' }] },
      subject: { reference: 'Patient/1' },
    };
    const issues = await backend.validate(resource, { signal: controller.signal });
    expect(issues).toEqual([]);
  });

  it('returns issues normally when no signal is provided', async () => {
    const profile = miniProfiles.condition;
    const backend = createStructuralBackend((type) =>
      type === 'Condition' ? profile : null,
    );
    const resource: Condition = {
      resourceType: 'Condition',
      id: 'c1',
      code: { coding: [{ system: 's', code: 'c' }] },
      subject: { reference: 'Patient/1' },
    };
    const issues = await backend.validate(resource);
    expect(issues.length).toBeGreaterThan(0); // clinicalStatus missing
  });

  it('returns issues normally when signal is provided but not aborted', async () => {
    const profile = miniProfiles.condition;
    const backend = createStructuralBackend((type) =>
      type === 'Condition' ? profile : null,
    );
    const controller = new AbortController();
    const resource: Condition = {
      resourceType: 'Condition',
      id: 'c1',
      code: { coding: [{ system: 's', code: 'c' }] },
      subject: { reference: 'Patient/1' },
    };
    const issues = await backend.validate(resource, { signal: controller.signal });
    expect(issues.length).toBeGreaterThan(0);
  });
});
