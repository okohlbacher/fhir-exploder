import { describe, it, expect } from 'vitest';
import { classifyError } from '../utils/errors';

describe('classifyError', () => {
  it('classifies TypeError with fetch as network error', () => {
    const err = new TypeError('Failed to fetch');
    const result = classifyError(err, 'http://localhost:8080/fhir', 'open');
    expect(result.type).toBe('network');
  });

  it('classifies HTTP 401 as auth error', () => {
    const err = { status: 401, message: 'Unauthorized' };
    const result = classifyError(err, 'http://localhost:8080/fhir', 'basic');
    expect(result.type).toBe('auth');
  });

  it('classifies HTTP 403 as auth error', () => {
    const err = { status: 403, message: 'Forbidden' };
    const result = classifyError(err, 'http://localhost:8080/fhir', 'bearer');
    expect(result.type).toBe('auth');
  });

  it('classifies HTTP 500 as invalid_response error', () => {
    const err = { status: 500, message: 'Internal Server Error' };
    const result = classifyError(err, 'http://localhost:8080/fhir', 'open');
    expect(result.type).toBe('invalid_response');
  });

  it('classifies unknown errors as unknown type', () => {
    const result = classifyError('something went wrong', 'http://localhost:8080/fhir', 'open');
    expect(result.type).toBe('unknown');
  });

  it('includes serverUrl in error messages', () => {
    const url = 'http://my-fhir-server:8080/fhir';
    const result = classifyError(new TypeError('Failed to fetch'), url, 'open');
    expect(result.message).toContain(url);
  });

  it('includes authMode in auth error messages', () => {
    const err = { status: 401, message: 'Unauthorized' };
    const result = classifyError(err, 'http://localhost:8080/fhir', 'basic');
    expect(result.message).toContain('basic');
  });

  it('includes actionable suggestion in every error', () => {
    const testCases: unknown[] = [
      new TypeError('Failed to fetch'),
      { status: 401, message: 'Unauthorized' },
      { status: 500, message: 'Internal Server Error' },
      'mystery error',
    ];
    for (const err of testCases) {
      const result = classifyError(err, 'http://localhost:8080/fhir', 'open');
      expect(
        result.suggestion,
        `expected non-empty suggestion for input: ${JSON.stringify(err)}`,
      ).toBeTruthy();
    }
  });
});
