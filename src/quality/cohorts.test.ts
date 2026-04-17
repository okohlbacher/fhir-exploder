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
  type CohortCriterion,
  type CohortDefinition,
  type CohortsStorage,
  type FhirpathCriterion,
  type ParsedPatientRefs,
} from './cohorts';

// -----------------------------------------------------------------------------
// parsePatientRefs — matches VALIDATION.md row
//   `npx vitest run src/quality/cohorts.test.ts -t "parsePatientRefs"`
// -----------------------------------------------------------------------------

describe('parsePatientRefs', () => {
  it('returns [] for empty string', () => {
    expect(parsePatientRefs('').refs).toEqual([]);
  });

  it('returns [] for whitespace-only input', () => {
    expect(parsePatientRefs('   \n\t  ').refs).toEqual([]);
  });

  it('strips a single Patient/ prefix', () => {
    expect(parsePatientRefs('Patient/abc').refs).toEqual(['abc']);
  });

  it('preserves bare IDs without prefix', () => {
    expect(parsePatientRefs('bare-id').refs).toEqual(['bare-id']);
  });

  it('splits on mixed whitespace, commas, semicolons, newlines', () => {
    const input = 'Patient/abc,Patient/xyz\nbare-id;another-id';
    expect(parsePatientRefs(input).refs).toEqual([
      'abc',
      'xyz',
      'bare-id',
      'another-id',
    ]);
  });

  it('dedupes preserving first-occurrence order', () => {
    const input = 'abc,xyz,abc,Patient/xyz,another';
    expect(parsePatientRefs(input).refs).toEqual(['abc', 'xyz', 'another']);
  });

  it('caps very long input at 10,000 IDs', () => {
    // Generate 20,000 unique tokens. Dedup is a no-op here; the cap is what
    // we're verifying. Threat T-21-02 (DoS) mitigation.
    const tokens: string[] = [];
    for (let i = 0; i < 20_000; i++) tokens.push(`p-${i}`);
    const raw = tokens.join(',');
    const out = parsePatientRefs(raw);
    expect(out.refs).toHaveLength(10_000);
    expect(out.refs[0]).toBe('p-0');
    expect(out.refs[9_999]).toBe('p-9999');
  });

  it('only strips ONE leading Patient/ (does not recursively strip)', () => {
    // Defensive: "Patient/Patient/x" should become "Patient/x", not "x".
    // Guards against an ambiguous input where a user literally has a
    // legacy double-prefixed ID.
    expect(parsePatientRefs('Patient/Patient/x').refs).toEqual(['Patient/x']);
  });
});

// -----------------------------------------------------------------------------
// parsePatientRefs truncation matrix (CLOSE-03 / W3)
//
// Five-case matrix covering the full boundary space for truncation signalling.
// `originalCount` is the POST-dedupe count (deduped.length); see
// 22-REVIEW.md §WR-03 for rationale (Option A).
// -----------------------------------------------------------------------------

describe('parsePatientRefs truncation matrix (CLOSE-03)', () => {
  // Suppress unused import warning.
  const _typeCheck: ParsedPatientRefs = { refs: [], truncated: false, originalCount: 0 };
  void _typeCheck;

  it('case 1: empty input → not truncated, 0 refs, originalCount 0 (post-dedupe)', () => {
    const result = parsePatientRefs('');
    expect(result.refs).toEqual([]);
    expect(result.truncated).toBe(false);
    expect(result.originalCount).toBe(0); // post-dedupe count: 0
  });

  it('case 2: < cap no duplicates → not truncated, originalCount equals post-dedupe count', () => {
    // 100 unique IDs — well below the 10,000 cap.
    const tokens: string[] = [];
    for (let i = 0; i < 100; i++) tokens.push(`p-${i}`);
    const result = parsePatientRefs(tokens.join(','));
    expect(result.refs).toHaveLength(100);
    expect(result.truncated).toBe(false);
    expect(result.originalCount).toBe(100); // post-dedupe count: 100
  });

  it('case 3: < cap with duplicates → not truncated, originalCount is post-dedupe count', () => {
    // 150 tokens, 50 are duplicates → 100 unique after dedupe.
    const tokens: string[] = [];
    for (let i = 0; i < 100; i++) tokens.push(`p-${i}`);
    // 50 duplicates of the first 50.
    for (let i = 0; i < 50; i++) tokens.push(`p-${i}`);
    const result = parsePatientRefs(tokens.join(','));
    expect(result.refs).toHaveLength(100);
    expect(result.truncated).toBe(false);
    expect(result.originalCount).toBe(100); // post-dedupe count: 100
  });

  it('case 4: exactly cap with duplicates → NOT truncated (boundary), originalCount is post-dedupe 10_000', () => {
    // 15,000 tokens where 5,000 are duplicates → exactly 10,000 unique after dedupe.
    // This is the boundary case that the old `parsedRefs.length === cap` check
    // would mis-fire on, incorrectly showing the truncation warning.
    const tokens: string[] = [];
    for (let i = 0; i < 10_000; i++) tokens.push(`p-${i}`);
    // 5,000 duplicates of the first 5,000.
    for (let i = 0; i < 5_000; i++) tokens.push(`p-${i}`);
    const result = parsePatientRefs(tokens.join(','));
    expect(result.refs).toHaveLength(10_000);
    expect(result.truncated).toBe(false); // boundary — 10,000 unique is NOT > cap
    expect(result.originalCount).toBe(10_000); // post-dedupe count: 10,000
  });

  it('case 5: > cap with duplicates → truncated, originalCount is post-dedupe > 10000', () => {
    // 15,000 tokens where 4,000 are duplicates → 11,000 unique after dedupe.
    // 11,000 > 10,000 → truncated = true.
    const tokens: string[] = [];
    for (let i = 0; i < 11_000; i++) tokens.push(`p-${i}`);
    // 4,000 duplicates of the first 4,000.
    for (let i = 0; i < 4_000; i++) tokens.push(`p-${i}`);
    const result = parsePatientRefs(tokens.join(','));
    expect(result.refs).toHaveLength(10_000); // capped at 10,000
    expect(result.truncated).toBe(true); // dedupedCount 11,000 > cap 10,000
    expect(result.originalCount).toBe(11_000); // post-dedupe count: 11,000
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

// -----------------------------------------------------------------------------
// FhirpathCriterion — Plan 22-01 Task 2 type test
// -----------------------------------------------------------------------------

// assertNever enforces union exhaustiveness at type-check time. If a new
// CohortCriterion variant is added without a matching branch in
// `discriminator` below, `assertNever(c)` will fail type-checking with a
// "Argument of type '…' is not assignable to parameter of type 'never'"
// error. Vitest transpiles via esbuild, so a broken type crashes the run.
function assertNever(x: never): never {
  throw new Error(`Unexpected criterion type: ${JSON.stringify(x)}`);
}

function discriminator(c: CohortCriterion): string {
  switch (c.type) {
    case 'date-range':
      return 'd';
    case 'condition-code':
      return 'c';
    case 'reference-list':
      return 'r';
    case 'fhirpath':
      return 'f';
    default:
      return assertNever(c);
  }
}

describe('FhirpathCriterion type', () => {
  it('is a member of the CohortCriterion discriminated union', () => {
    const c: CohortCriterion = {
      type: 'fhirpath',
      expression: 'Patient.where(birthDate < @1960-01-01)',
    };
    expect(discriminator(c)).toBe('f');
  });

  it('accepts an optional translatedQuery cache field', () => {
    const c: FhirpathCriterion = {
      type: 'fhirpath',
      expression: "Patient.where(gender = 'female')",
      translatedQuery: 'Patient?gender=female&_elements=id&_count=10000',
    };
    expect(c.translatedQuery).toContain('Patient?gender=female');
  });

  it('discriminator function covers all 4 criterion types', () => {
    const dateRange: CohortCriterion = {
      type: 'date-range',
      start: null,
      end: null,
    };
    const code: CohortCriterion = {
      type: 'condition-code',
      system: 's',
      code: 'c',
    };
    const refs: CohortCriterion = { type: 'reference-list', patientIds: [] };
    const fp: CohortCriterion = {
      type: 'fhirpath',
      expression: 'Patient.where(active = true)',
    };
    expect([dateRange, code, refs, fp].map(discriminator)).toEqual([
      'd',
      'c',
      'r',
      'f',
    ]);
  });
});
