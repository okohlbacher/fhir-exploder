/**
 * Phase 47 / Plan 01 / Task 1 (Wave 0) — referenceUrl.ts unit tests.
 *
 * Validates the extracted normalizer + helpers shared by useReferenceResolver,
 * ReferenceLink, and the future JSON peek drawer (D-04, T-47-01).
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeReference,
  buildExplorerHref,
  isValidFhirReference,
} from '../referenceUrl';

describe('normalizeReference', () => {
  it('passes through canonical "Type/id" form', () => {
    expect(normalizeReference('Patient/abc123')).toBe('Patient/abc123');
  });

  it('strips configured base URL from absolute http URL', () => {
    expect(normalizeReference('http://blaze:8080/fhir/Patient/abc')).toBe(
      'Patient/abc',
    );
  });

  it('strips arbitrary base URL from absolute https URL', () => {
    expect(normalizeReference('https://hapi.fhir.org/baseR4/Encounter/xyz')).toBe(
      'Encounter/xyz',
    );
  });

  it('returns null for fragment refs (#contained-id)', () => {
    expect(normalizeReference('#contained-id')).toBeNull();
  });

  it('returns null for urn: bundle-internal placeholders', () => {
    expect(normalizeReference('urn:uuid:1234')).toBeNull();
  });

  it('returns null for relative refs that are not "Type/id" (segs.length !== 2)', () => {
    expect(normalizeReference('../etc/passwd')).toBeNull();
  });

  it('returns null when no slash present', () => {
    expect(normalizeReference('Patient')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeReference('')).toBeNull();
  });

  it('returns null for absolute URL with no path after host', () => {
    expect(normalizeReference('http://no-path')).toBeNull();
  });
});

describe('buildExplorerHref', () => {
  it('builds /explorer/{type}/{id} href', () => {
    expect(buildExplorerHref('Patient', 'abc')).toBe('/explorer/Patient/abc');
  });

  it('handles different resource types', () => {
    expect(buildExplorerHref('Encounter', 'enc-1')).toBe('/explorer/Encounter/enc-1');
  });
});

describe('isValidFhirReference', () => {
  it('accepts a valid PascalCase resourceType + alphanumeric id', () => {
    expect(isValidFhirReference('Patient', 'abc-123')).toBe(true);
  });

  it('rejects a path-traversal-shaped resourceType', () => {
    expect(isValidFhirReference('../etc', 'passwd')).toBe(false);
  });

  it('rejects empty id', () => {
    expect(isValidFhirReference('Patient', '')).toBe(false);
  });

  it('rejects lowercase resourceType (must start uppercase)', () => {
    expect(isValidFhirReference('lower', 'x')).toBe(false);
  });

  it('rejects id containing whitespace', () => {
    expect(isValidFhirReference('Patient', 'has spaces')).toBe(false);
  });
});
