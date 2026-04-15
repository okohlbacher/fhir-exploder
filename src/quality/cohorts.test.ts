/**
 * Unit tests for src/quality/cohorts.ts pure helpers (Plan 21-01, T-1.2).
 *
 * Covers every VALIDATION.md §Per-Task row for CHRT-01 pure-function
 * behavior and CHRT-02 storage-shape constants. Filter names here are
 * cited verbatim by the plan's `-t "…"` automation commands and MUST
 * stay stable so downstream plans (21-02..05) continue to resolve.
 */
import { describe, it, expect } from 'vitest';
import {
  COHORTS_STORAGE_KEY,
  DEFAULT_COHORTS_STORAGE,
  LEGACY_COHORT_KEY,
  RESOURCE_TYPES_STORAGE_KEY,
  findActiveCohort,
  parsePatientRefs,
  type CohortDefinition,
  type CohortsStorage,
} from './cohorts';

// -----------------------------------------------------------------------------
// parsePatientRefs — matches VALIDATION.md row
//   `npx vitest run src/quality/cohorts.test.ts -t "parsePatientRefs"`
// -----------------------------------------------------------------------------

describe('parsePatientRefs', () => {
  it('returns [] for empty string', () => {
    expect(parsePatientRefs('')).toEqual([]);
  });

  it('returns [] for whitespace-only input', () => {
    expect(parsePatientRefs('   \n\t  ')).toEqual([]);
  });

  it('strips a single Patient/ prefix', () => {
    expect(parsePatientRefs('Patient/abc')).toEqual(['abc']);
  });

  it('preserves bare IDs without prefix', () => {
    expect(parsePatientRefs('bare-id')).toEqual(['bare-id']);
  });

  it('splits on mixed whitespace, commas, semicolons, newlines', () => {
    const input = 'Patient/abc,Patient/xyz\nbare-id;another-id';
    expect(parsePatientRefs(input)).toEqual([
      'abc',
      'xyz',
      'bare-id',
      'another-id',
    ]);
  });

  it('dedupes preserving first-occurrence order', () => {
    const input = 'abc,xyz,abc,Patient/xyz,another';
    expect(parsePatientRefs(input)).toEqual(['abc', 'xyz', 'another']);
  });

  it('caps very long input at 10,000 IDs', () => {
    // Generate 20,000 unique tokens. Dedup is a no-op here; the cap is what
    // we're verifying. Threat T-21-02 (DoS) mitigation.
    const tokens: string[] = [];
    for (let i = 0; i < 20_000; i++) tokens.push(`p-${i}`);
    const raw = tokens.join(',');
    const out = parsePatientRefs(raw);
    expect(out).toHaveLength(10_000);
    expect(out[0]).toBe('p-0');
    expect(out[9_999]).toBe('p-9999');
  });

  it('only strips ONE leading Patient/ (does not recursively strip)', () => {
    // Defensive: "Patient/Patient/x" should become "Patient/x", not "x".
    // Guards against an ambiguous input where a user literally has a
    // legacy double-prefixed ID.
    expect(parsePatientRefs('Patient/Patient/x')).toEqual(['Patient/x']);
  });
});

// -----------------------------------------------------------------------------
// findActiveCohort
// -----------------------------------------------------------------------------

describe('findActiveCohort', () => {
  const makeCohort = (over: Partial<CohortDefinition> = {}): CohortDefinition => ({
    id: 'x',
    name: 'n',
    criteria: [],
    createdAt: '',
    updatedAt: '',
    ...over,
  });

  it('returns null for empty storage', () => {
    expect(findActiveCohort(DEFAULT_COHORTS_STORAGE)).toBeNull();
  });

  it('returns null when activeCohortId is null', () => {
    expect(
      findActiveCohort({ cohorts: [makeCohort()], activeCohortId: null }),
    ).toBeNull();
  });

  it('returns the matching cohort when activeCohortId points to one', () => {
    const c = makeCohort({ id: 'x' });
    expect(
      findActiveCohort({ cohorts: [c], activeCohortId: 'x' }),
    ).toBe(c);
  });

  it('returns null when activeCohortId has no matching cohort (e.g. deleted)', () => {
    const c = makeCohort({ id: 'x' });
    expect(
      findActiveCohort({ cohorts: [c], activeCohortId: 'stale-id' }),
    ).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// CohortsStorage shape + storage-key constants (CHRT-02)
// -----------------------------------------------------------------------------

describe('CohortsStorage shape', () => {
  it('DEFAULT_COHORTS_STORAGE is { cohorts: [], activeCohortId: null }', () => {
    expect(DEFAULT_COHORTS_STORAGE).toEqual<CohortsStorage>({
      cohorts: [],
      activeCohortId: null,
    });
  });

  it('COHORTS_STORAGE_KEY equals "quality.cohorts.v1"', () => {
    expect(COHORTS_STORAGE_KEY).toBe('quality.cohorts.v1');
  });

  it('RESOURCE_TYPES_STORAGE_KEY equals "quality.resourceTypes.v1"', () => {
    expect(RESOURCE_TYPES_STORAGE_KEY).toBe('quality.resourceTypes.v1');
  });

  it('LEGACY_COHORT_KEY equals "quality.cohort.v1"', () => {
    expect(LEGACY_COHORT_KEY).toBe('quality.cohort.v1');
  });

  it('storage keys are all distinct', () => {
    const keys = [
      COHORTS_STORAGE_KEY,
      RESOURCE_TYPES_STORAGE_KEY,
      LEGACY_COHORT_KEY,
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
