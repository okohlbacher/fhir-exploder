import { describe, it, expect } from 'vitest';
import { getCuratedParams, CURATED_PARAMS } from '../utils/curated-params';

describe('CURATED_PARAMS', () => {
  it('has curated params for Patient', () => {
    expect(CURATED_PARAMS['Patient']).toEqual(['name', 'family', 'given', 'birthdate', 'gender', 'identifier']);
  });

  it('has curated params for Observation', () => {
    expect(CURATED_PARAMS['Observation']).toEqual(['patient', 'code', 'date', 'status', 'category']);
  });

  it('has curated params for Condition', () => {
    expect(CURATED_PARAMS['Condition']).toEqual(['patient', 'code', 'clinical-status', 'onset-date']);
  });
});

describe('getCuratedParams', () => {
  it('returns curated params for Patient filtered by available params', () => {
    const allParams = ['name', 'family', 'given', 'birthdate', 'gender', 'identifier', 'address', 'phone'];
    const result = getCuratedParams('Patient', allParams);
    expect(result).toEqual(['name', 'family', 'given', 'birthdate', 'gender', 'identifier']);
  });

  it('filters out curated params not present in allParams', () => {
    const allParams = ['name', 'birthdate', 'phone'];
    const result = getCuratedParams('Patient', allParams);
    expect(result).toEqual(['name', 'birthdate']);
  });

  it('returns common params for unknown resource type', () => {
    const allParams = ['patient', 'code', 'date', 'status', 'foo'];
    const result = getCuratedParams('UnknownType', allParams);
    expect(result).toEqual(['patient', 'code', 'date', 'status']);
  });

  it('falls back to first 5 params when no common params match', () => {
    const allParams = ['xyz', 'abc', 'def', 'ghi', 'jkl', 'mno'];
    const result = getCuratedParams('UnknownType', allParams);
    expect(result).toEqual(['xyz', 'abc', 'def', 'ghi', 'jkl']);
  });

  it('returns empty array when allParams is empty', () => {
    const result = getCuratedParams('Patient', []);
    expect(result).toEqual([]);
  });

  it('returns empty array for unknown type with empty allParams', () => {
    const result = getCuratedParams('UnknownType', []);
    expect(result).toEqual([]);
  });
});
