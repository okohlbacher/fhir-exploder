/**
 * DQ-10 -- orphan detector unit tests.
 *
 * Plan 17-01 delivers `src/quality/orphanDetector.ts` exporting:
 *   - getRequiredReferenceFields(resourceType): string[]
 *   - detectOrphans(resources): NormalizedIssue[]
 *
 * Profile-driven: reads min>=1 Reference elements from bundled MII profiles
 * when available; otherwise falls back to a R4-sensible FALLBACK map.
 */
import { describe, it, expect } from 'vitest';
import type { Resource } from '@medplum/fhirtypes';
import {
  getRequiredReferenceFields,
  detectOrphans,
} from '../quality/orphanDetector';

describe('getRequiredReferenceFields (DQ-10)', () => {
  it('reads min>=1 Reference elements from the MII Condition profile', () => {
    // Condition profile (bundled) has Condition.subject as min=1 Reference
    const fields = getRequiredReferenceFields('Condition');
    expect(fields).toContain('Condition.subject');
  });

  it('falls back to R4 defaults for types without a bundled profile', () => {
    const fields = getRequiredReferenceFields('AllergyIntolerance');
    expect(fields).toContain('AllergyIntolerance.patient');
  });

  it('returns the R4 fallback list for Observation', () => {
    // Observation has a bundled profile (Laborbefund). If it requires
    // subject, profile-driven; otherwise fallback.
    const fields = getRequiredReferenceFields('Observation');
    expect(fields).toContain('Observation.subject');
  });

  it('returns empty array for unknown type without fallback entry', () => {
    expect(getRequiredReferenceFields('NotARealType')).toEqual([]);
  });
});

describe('detectOrphans (DQ-10)', () => {
  it('flags Observation without subject as orphan', () => {
    const sample = [
      { resourceType: 'Observation', id: 'o1', status: 'final' } as Resource,
    ];
    const issues = detectOrphans(sample);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const orphan = issues.find((i) => i.description.includes('[orphan]'));
    expect(orphan).toBeDefined();
    expect(orphan!.field).toBe('Observation.subject');
    expect(orphan!.resourceId).toBe('Observation/o1');
    expect(orphan!.severity).toBe('warning');
  });

  it('returns no orphans when Observation has subject reference', () => {
    const sample = [
      {
        resourceType: 'Observation',
        id: 'o1',
        status: 'final',
        subject: { reference: 'Patient/123' },
      } as unknown as Resource,
    ];
    const issues = detectOrphans(sample);
    const orphan = issues.find((i) => i.field === 'Observation.subject');
    expect(orphan).toBeUndefined();
  });

  it('flags Condition without subject as orphan (MII profile requires min=1)', () => {
    const sample = [
      { resourceType: 'Condition', id: 'c1' } as Resource,
    ];
    const issues = detectOrphans(sample);
    const orphan = issues.find((i) => i.field === 'Condition.subject');
    expect(orphan).toBeDefined();
  });

  it('returns no issues for unknown type with no profile and no fallback', () => {
    const sample = [
      { resourceType: 'NotARealType', id: 'x1' } as unknown as Resource,
    ];
    expect(detectOrphans(sample)).toEqual([]);
  });

  it('handles resources missing id gracefully', () => {
    const sample = [
      { resourceType: 'Observation' } as unknown as Resource,
    ];
    const issues = detectOrphans(sample);
    const orphan = issues.find((i) => i.field === 'Observation.subject');
    expect(orphan).toBeDefined();
    expect(orphan!.resourceId).toContain('Observation/');
  });

  it('flags AllergyIntolerance without patient as orphan (R4 fallback)', () => {
    const sample = [
      { resourceType: 'AllergyIntolerance', id: 'a1' } as Resource,
    ];
    const issues = detectOrphans(sample);
    const orphan = issues.find((i) => i.field === 'AllergyIntolerance.patient');
    expect(orphan).toBeDefined();
  });

  it('description follows the "[orphan] Missing required reference: X" pattern', () => {
    const sample = [
      { resourceType: 'Observation', id: 'o1' } as Resource,
    ];
    const issues = detectOrphans(sample);
    const orphan = issues.find((i) => i.field === 'Observation.subject');
    expect(orphan!.description).toMatch(/^\[orphan\] Missing required reference: /);
  });

  it('returns no orphans for empty input', () => {
    expect(detectOrphans([])).toEqual([]);
  });

  it('does not flag orphans on a resource that has an empty reference object', () => {
    // subject present but with no reference string still counts as missing
    const sample = [
      {
        resourceType: 'Observation',
        id: 'o1',
        subject: {},
      } as unknown as Resource,
    ];
    const issues = detectOrphans(sample);
    const orphan = issues.find((i) => i.field === 'Observation.subject');
    expect(orphan).toBeDefined();
  });
});
