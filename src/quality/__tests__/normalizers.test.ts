import { describe, it, expect } from 'vitest';
import type { OperationOutcomeIssue } from '@medplum/fhirtypes';
import { normalizeOperationOutcomeIssue } from '../normalizers';
import hapiFixture from './fixtures/normalizers/hapi-required-binding.json';
import firelyFixture from './fixtures/normalizers/firely-preferred-binding.json';
import igPublisherFixture from './fixtures/normalizers/ig-publisher-slice-fail.json';

describe('normalizeOperationOutcomeIssue', () => {
  it('Test 1: severity fatal maps to error', () => {
    const result = normalizeOperationOutcomeIssue(
      { severity: 'fatal', code: 'invariant' },
      'Condition/abc',
    );
    expect(result.severity).toBe('error');
  });

  it('Test 2: expression wins over location for field', () => {
    const result = normalizeOperationOutcomeIssue({
      severity: 'error',
      code: 'invariant',
      expression: ['Patient.name'],
      location: ['ignored'],
    });
    expect(result.field).toBe('Patient.name');
  });

  it('Test 3: location is fallback when expression missing', () => {
    const result = normalizeOperationOutcomeIssue({
      severity: 'error',
      code: 'invariant',
      location: ['Patient.contact[0].name'],
    });
    expect(result.field).toBe('Patient.contact[0].name');
  });

  it('Test 4: description composes code and diagnostics with " -- " separator', () => {
    const result = normalizeOperationOutcomeIssue({
      severity: 'warning',
      code: 'value',
      diagnostics: 'bad coding',
    });
    expect(result.description).toBe('value -- bad coding');
  });

  it('Test 5: details.text falls back when diagnostics missing', () => {
    const result = normalizeOperationOutcomeIssue({
      severity: 'warning',
      code: 'structure',
      details: { text: 'fallback' },
    });
    expect(result.description).toBe('structure -- fallback');
  });

  it('Test 6: empty-issue fallback matches ValidationPanel legacy shape', () => {
    const result = normalizeOperationOutcomeIssue({} as OperationOutcomeIssue);
    expect(result).toEqual({
      resourceId: 'unknown/unknown',
      resourceType: 'unknown',
      field: '',
      description: ' -- ',
      severity: 'info',
    });
  });

  it('Test 7: resourceRef is parsed into resourceId + resourceType', () => {
    const result = normalizeOperationOutcomeIssue(
      { severity: 'error', code: 'invariant' },
      'Observation/obs-1',
    );
    expect(result.resourceId).toBe('Observation/obs-1');
    expect(result.resourceType).toBe('Observation');
  });

  it('Test 8: severity matrix maps correctly', () => {
    const build = (sev: OperationOutcomeIssue['severity']) =>
      normalizeOperationOutcomeIssue({ severity: sev, code: 'informational' }).severity;
    expect(build('information')).toBe('info');
    expect(build('warning')).toBe('warning');
    expect(build('error')).toBe('error');
    expect(build('fatal')).toBe('error');
    expect(build(undefined as unknown as OperationOutcomeIssue['severity'])).toBe('info');
  });

  it('Test 9 (HAPI fixture — required-binding violation): expression populated', () => {
    const issues = (hapiFixture as { issue: OperationOutcomeIssue[] }).issue;
    const mapped = issues.map((i) => normalizeOperationOutcomeIssue(i, 'Patient/hapi-1'));
    expect(mapped.some((m) => m.severity === 'error')).toBe(true);
    // HAPI always populates expression
    expect(mapped[0].field.length).toBeGreaterThan(0);
    expect(mapped[0].resourceId).toBe('Patient/hapi-1');
  });

  it('Test 10 (Firely fixture — preferred-binding warning): warning severity + code prefix', () => {
    const issues = (firelyFixture as { issue: OperationOutcomeIssue[] }).issue;
    const mapped = issues.map((i) => normalizeOperationOutcomeIssue(i, 'Observation/f-1'));
    const warning = mapped.find((m) => m.severity === 'warning');
    expect(warning).toBeDefined();
    expect(warning!.description.startsWith('code-invalid -- ')).toBe(true);
  });

  it('Test 11 (IG-Publisher fixture — slice-fail): location-only fallback works', () => {
    const issues = (igPublisherFixture as { issue: OperationOutcomeIssue[] }).issue;
    const mapped = issues.map((i) => normalizeOperationOutcomeIssue(i, 'Observation/ig-1'));
    const err = mapped.find((m) => m.severity === 'error');
    expect(err).toBeDefined();
    // IG-Publisher populates location, not expression — normalizer falls back
    expect(err!.field).toBe('Observation.component[0]');
  });
});
