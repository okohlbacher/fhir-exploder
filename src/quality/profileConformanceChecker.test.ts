import { describe, it, expect } from 'vitest';
import {
  validateConformance,
  normalizeConformanceIssues,
  type ConformanceIssue,
} from './profileConformanceChecker';
import type { Resource, StructureDefinition } from '@medplum/fhirtypes';

/** Helper to build a mini profile with specific elements. */
function miniProfile(
  type: string,
  elements: Array<{
    path: string;
    min?: number;
    max?: string;
    mustSupport?: boolean;
    type?: Array<{ code: string }>;
    binding?: { strength: string; valueSet: string };
  }>,
): StructureDefinition {
  return {
    resourceType: 'StructureDefinition',
    url: `http://test/${type}`,
    name: `Test ${type}`,
    type,
    snapshot: { element: elements },
  } as unknown as StructureDefinition;
}

describe('validateConformance', () => {
  it('produces an error with code "required" when a min>=1 field is missing', () => {
    const profile = miniProfile('Condition', [
      { path: 'Condition.code', min: 1, max: '1', type: [{ code: 'CodeableConcept' }] },
    ]);
    const resource = { resourceType: 'Condition', id: 'c1' } as Resource;
    const issues = validateConformance(resource, profile, new Map());
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const req = issues.find((i) => i.code === 'required');
    expect(req).toBeDefined();
    expect(req!.severity).toBe('error');
    expect(req!.path).toBe('Condition.code');
  });

  it('produces an error with code "max-cardinality" when an array exceeds max="1"', () => {
    const profile = miniProfile('Condition', [
      { path: 'Condition.code', min: 0, max: '1', type: [{ code: 'CodeableConcept' }] },
    ]);
    const resource = {
      resourceType: 'Condition',
      id: 'c2',
      code: [
        { coding: [{ system: 'http://icd', code: 'A00' }] },
        { coding: [{ system: 'http://icd', code: 'B00' }] },
      ],
    } as unknown as Resource;
    const issues = validateConformance(resource, profile, new Map());
    const maxIssue = issues.find((i) => i.code === 'max-cardinality');
    expect(maxIssue).toBeDefined();
    expect(maxIssue!.severity).toBe('error');
  });

  it('produces an error with code "type-mismatch" when a field has the wrong type', () => {
    const profile = miniProfile('Condition', [
      { path: 'Condition.code', min: 0, max: '1', type: [{ code: 'CodeableConcept' }] },
    ]);
    // code should be an object (CodeableConcept) but we supply a string
    const resource = {
      resourceType: 'Condition',
      id: 'c3',
      code: 'just-a-string',
    } as unknown as Resource;
    const issues = validateConformance(resource, profile, new Map());
    const typeIssue = issues.find((i) => i.code === 'type-mismatch');
    expect(typeIssue).toBeDefined();
    expect(typeIssue!.severity).toBe('error');
  });

  it('produces an error with code "value-set" for required binding violation', () => {
    const profile = miniProfile('Condition', [
      {
        path: 'Condition.code',
        min: 0,
        max: '1',
        type: [{ code: 'CodeableConcept' }],
        binding: { strength: 'required', valueSet: 'http://example.com/vs' },
      },
    ]);
    const validCodes = new Set(['http://icd|A00']);
    const expandedVS = new Map([['http://example.com/vs', validCodes]]);
    const resource = {
      resourceType: 'Condition',
      id: 'c4',
      code: { coding: [{ system: 'http://icd', code: 'ZZZ' }] },
    } as unknown as Resource;
    const issues = validateConformance(resource, profile, expandedVS);
    const vsIssue = issues.find((i) => i.code === 'value-set');
    expect(vsIssue).toBeDefined();
    expect(vsIssue!.severity).toBe('error');
  });

  it('produces a warning with code "value-set" for extensible binding violation', () => {
    const profile = miniProfile('Condition', [
      {
        path: 'Condition.code',
        min: 0,
        max: '1',
        type: [{ code: 'CodeableConcept' }],
        binding: { strength: 'extensible', valueSet: 'http://example.com/vs' },
      },
    ]);
    const validCodes = new Set(['http://icd|A00']);
    const expandedVS = new Map([['http://example.com/vs', validCodes]]);
    const resource = {
      resourceType: 'Condition',
      id: 'c5',
      code: { coding: [{ system: 'http://icd', code: 'ZZZ' }] },
    } as unknown as Resource;
    const issues = validateConformance(resource, profile, expandedVS);
    const vsIssue = issues.find((i) => i.code === 'value-set');
    expect(vsIssue).toBeDefined();
    expect(vsIssue!.severity).toBe('warning');
  });

  it('produces an info with code "value-set" for preferred binding violation', () => {
    const profile = miniProfile('Condition', [
      {
        path: 'Condition.code',
        min: 0,
        max: '1',
        type: [{ code: 'CodeableConcept' }],
        binding: { strength: 'preferred', valueSet: 'http://example.com/vs' },
      },
    ]);
    const validCodes = new Set(['http://icd|A00']);
    const expandedVS = new Map([['http://example.com/vs', validCodes]]);
    const resource = {
      resourceType: 'Condition',
      id: 'c6',
      code: { coding: [{ system: 'http://icd', code: 'ZZZ' }] },
    } as unknown as Resource;
    const issues = validateConformance(resource, profile, expandedVS);
    const vsIssue = issues.find((i) => i.code === 'value-set');
    expect(vsIssue).toBeDefined();
    expect(vsIssue!.severity).toBe('info');
  });

  it('returns empty array when profile is null', () => {
    const resource = { resourceType: 'Condition', id: 'c7' } as Resource;
    const issues = validateConformance(resource, null, new Map());
    expect(issues).toEqual([]);
  });

  it('correctly validates choice type elements like onset[x]', () => {
    const profile = miniProfile('Condition', [
      {
        path: 'Condition.onset[x]',
        min: 0,
        max: '1',
        type: [{ code: 'dateTime' }, { code: 'Period' }],
      },
    ]);
    // onsetDateTime matches dateTime type — should produce no type-mismatch
    const resource = {
      resourceType: 'Condition',
      id: 'c8',
      onsetDateTime: '2024-01-01',
    } as unknown as Resource;
    const issues = validateConformance(resource, profile, new Map());
    const typeIssue = issues.find((i) => i.code === 'type-mismatch');
    expect(typeIssue).toBeUndefined();
  });

  it('normalizeConformanceIssues produces correct NormalizedIssue shape', () => {
    const issues: ConformanceIssue[] = [
      {
        path: 'Condition.code',
        code: 'required',
        severity: 'error',
        diagnostics: 'Condition.code is required but not populated',
      },
    ];
    const resource = { resourceType: 'Condition', id: 'c9' } as Resource;
    const normalized = normalizeConformanceIssues(issues, resource);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      resourceId: 'Condition/c9',
      resourceType: 'Condition',
      field: 'Condition.code',
      description: '[required] Condition.code is required but not populated',
      severity: 'error',
    });
  });
});
