import { describe, it, expect } from 'vitest';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import { parseResourceTypes } from '../fhir/capability';

/** Minimal valid CapabilityStatement shell — extend per test. */
function makeCapabilityStatement(
  resources: CapabilityStatement['rest'][0]['resource'],
): CapabilityStatement {
  return {
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: '2024-01-01',
    kind: 'instance',
    software: { name: 'Test FHIR Server' },
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [{ mode: 'server', resource: resources }],
  };
}

describe('parseResourceTypes', () => {
  it('parses CapabilityStatement rest resources into ParsedResourceType[]', () => {
    const cs = makeCapabilityStatement([{ type: 'Patient' }, { type: 'Observation' }]);
    const result = parseResourceTypes(cs);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('Patient');
    expect(result[1].type).toBe('Observation');
  });

  it('extracts search parameters from each resource', () => {
    const cs = makeCapabilityStatement([
      {
        type: 'Patient',
        searchParam: [
          { name: '_id', type: 'token' },
          { name: 'name', type: 'string' },
        ],
      },
    ]);
    const result = parseResourceTypes(cs);
    expect(result[0].searchParams).toEqual(['_id', 'name']);
  });

  it('extracts operations from each resource', () => {
    const cs = makeCapabilityStatement([
      {
        type: 'Patient',
        operation: [{ name: 'everything', definition: 'OperationDefinition/everything' }],
      },
    ]);
    const result = parseResourceTypes(cs);
    expect(result[0].operations).toEqual(['everything']);
  });

  it('assigns FHIR category to each resource type', () => {
    const cs = makeCapabilityStatement([
      { type: 'Patient' },
      { type: 'Observation' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'UnknownType' as any },
    ]);
    const result = parseResourceTypes(cs);
    expect(result.find((r) => r.type === 'Patient')?.category).toBe('Individuals');
    expect(result.find((r) => r.type === 'Observation')?.category).toBe('Diagnostics');
    expect(result.find((r) => r.type === 'UnknownType')?.category).toBe('Other');
  });

  it('handles empty CapabilityStatement gracefully', () => {
    const cs: CapabilityStatement = {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: '2024-01-01',
      kind: 'instance',
      software: { name: 'Test' },
      fhirVersion: '4.0.1',
      format: ['json'],
    };
    const result = parseResourceTypes(cs);
    expect(result).toEqual([]);
  });
});
