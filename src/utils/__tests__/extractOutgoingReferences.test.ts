import { describe, it, expect } from 'vitest';
import type { Resource } from '@medplum/fhirtypes';
import { extractOutgoingReferences } from '../extractOutgoingReferences';

describe('extractOutgoingReferences', () => {
  it('returns empty array for resource with no references', () => {
    const resource = { resourceType: 'Patient', id: 'p1' } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toEqual([]);
  });

  it('extracts top-level scalar reference', () => {
    const resource = {
      resourceType: 'Encounter',
      id: 'enc1',
      subject: { reference: 'Patient/p1' },
    } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('subject');
    expect(result[0].reference).toBe('Patient/p1');
    expect(result[0].display).toBeUndefined();
  });

  it('extracts nested reference inside array', () => {
    const resource = {
      resourceType: 'Encounter',
      id: 'enc1',
      participant: [
        { individual: { reference: 'Practitioner/pr1' } },
        { individual: { reference: 'Practitioner/pr2' } },
      ],
    } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('participant[0].individual');
    expect(result[0].reference).toBe('Practitioner/pr1');
    expect(result[1].path).toBe('participant[1].individual');
    expect(result[1].reference).toBe('Practitioner/pr2');
  });

  it('skips contained[] resources', () => {
    const resource = {
      resourceType: 'Encounter',
      id: 'enc1',
      contained: [
        {
          resourceType: 'Patient',
          id: 'inner',
          generalPractitioner: [{ reference: 'Practitioner/x' }],
        },
      ],
      subject: { reference: 'Patient/outer' },
    } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('subject');
    expect(result[0].reference).toBe('Patient/outer');
  });

  it('skips non-reference objects (objects without a `reference` field)', () => {
    const resource = {
      resourceType: 'Foo',
      code: { text: 'glucose' },
    } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toEqual([]);
  });

  it('rejects malformed reference strings', () => {
    const resource1 = {
      resourceType: 'Encounter',
      id: 'enc1',
      subject: { reference: 'foo/bar' },
    } as unknown as Resource;
    expect(extractOutgoingReferences(resource1)).toEqual([]);

    const resource2 = {
      resourceType: 'Encounter',
      id: 'enc1',
      subject: { reference: 'urn:uuid:abc' },
    } as unknown as Resource;
    expect(extractOutgoingReferences(resource2)).toEqual([]);
  });

  it('preserves Reference.display when present', () => {
    const resource = {
      resourceType: 'Encounter',
      id: 'enc1',
      subject: { reference: 'Patient/p1', display: 'John Doe' },
    } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('subject');
    expect(result[0].reference).toBe('Patient/p1');
    expect(result[0].display).toBe('John Doe');
  });

  it('no dedup: same target via two paths produces two rows (D-03)', () => {
    const resource = {
      resourceType: 'Condition',
      id: 'cond1',
      subject: { reference: 'Patient/p1' },
      recorder: { reference: 'Patient/p1' },
    } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.reference === 'Patient/p1')).toBe(true);
  });

  it('skips top-level resourceType/id/meta/text fields', () => {
    const resource = {
      resourceType: 'Foo',
      id: 'x',
      meta: { lastUpdated: 'now' },
      text: { div: '<div/>' },
      subject: { reference: 'Patient/p1' },
    } as unknown as Resource;
    const result = extractOutgoingReferences(resource);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('subject');
  });
});
