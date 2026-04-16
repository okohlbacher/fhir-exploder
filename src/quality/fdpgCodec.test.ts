/**
 * Unit tests for the MII FDPG Codex SQ v3 codec (Plan 22-02, CHRT-06).
 *
 * Every `it(...)` name below matches a `-t "…"` filter cited by 22-VALIDATION.md
 * so per-task automation resolves to a concrete spec.
 *
 * Threats covered:
 *   - T-22-06 (prototype pollution): `'no prototype pollution'`
 *   - T-22-07 (DoS via huge file):    `'enforces 1MB import cap'`
 *   - T-22-08 (version confusion):    `'rejects non-v3 version'`
 *
 * Fixtures never contain real patient IDs (T-22-09 PHI-in-error-strings
 * defence). The prototype-pollution payload uses the standard OWASP-style
 * sentinel (`__proto__: {polluted:'yes'}`).
 */
import { describe, it, expect } from 'vitest';
import type { CohortDefinition } from './cohorts';
import {
  cohortToFdpgSq,
  fdpgSqToCohort,
  FdpgCodecError,
  MAX_FDPG_FILE_BYTES,
} from './fdpgCodec';
import {
  FDPG_SQ_VERSION,
  FDPG_CONTEXT_FALL,
  FDPG_CONTEXT_DIAGNOSE,
} from './fdpgTypes';

const FIXED_TS = '2026-04-16T10:00:00.000Z';

function makeCohort(over: Partial<CohortDefinition> = {}): CohortDefinition {
  return {
    id: 'fixed-id',
    name: 'test',
    criteria: [],
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
    ...over,
  };
}

// -----------------------------------------------------------------------------
// EXPORT: cohortToFdpgSq
// -----------------------------------------------------------------------------

describe('cohortToFdpgSq — export', () => {
  it('emits v3 schema URL', () => {
    const { sq } = cohortToFdpgSq(makeCohort({ name: 'x' }));
    expect(sq.version).toBe(FDPG_SQ_VERSION);
  });

  it('sets display to the cohort name', () => {
    const { sq } = cohortToFdpgSq(makeCohort({ name: 'Diabetes 2024' }));
    expect(sq.display).toBe('Diabetes 2024');
  });

  it('encodes a date-range criterion as a Fall context with timeRestriction', () => {
    const { sq } = cohortToFdpgSq(
      makeCohort({
        criteria: [{ type: 'date-range', start: '2024-01-01', end: '2024-12-31' }],
      }),
    );
    expect(sq.inclusionCriteria).toHaveLength(1);
    expect(sq.inclusionCriteria[0]).toHaveLength(1);
    const crit = sq.inclusionCriteria[0][0];
    expect(crit.context).toEqual(FDPG_CONTEXT_FALL);
    expect(crit.termCodes).toEqual([]);
    expect(crit.timeRestriction).toEqual({
      afterDate: '2024-01-01',
      beforeDate: '2024-12-31',
    });
  });

  it('encodes a condition-code criterion as a Diagnose context with termCodes', () => {
    const { sq } = cohortToFdpgSq(
      makeCohort({
        criteria: [
          {
            type: 'condition-code',
            system: 'http://snomed.info/sct',
            code: '44054006',
          },
        ],
      }),
    );
    expect(sq.inclusionCriteria).toHaveLength(1);
    const crit = sq.inclusionCriteria[0][0];
    expect(crit.context).toEqual(FDPG_CONTEXT_DIAGNOSE);
    expect(crit.termCodes).toEqual([
      { system: 'http://snomed.info/sct', code: '44054006' },
    ]);
    expect(crit.valueFilter).toBeUndefined();
    expect(crit.timeRestriction).toBeUndefined();
  });

  it('AND-composes date-range + condition-code as two outer groups', () => {
    const { sq } = cohortToFdpgSq(
      makeCohort({
        criteria: [
          { type: 'date-range', start: '2024-01-01', end: '2024-12-31' },
          {
            type: 'condition-code',
            system: 'http://snomed.info/sct',
            code: '44054006',
          },
        ],
      }),
    );
    expect(sq.inclusionCriteria).toHaveLength(2);
    expect(sq.inclusionCriteria[0]).toHaveLength(1);
    expect(sq.inclusionCriteria[1]).toHaveLength(1);
    expect(sq.inclusionCriteria[0][0].context.code).toBe('Fall');
    expect(sq.inclusionCriteria[1][0].context.code).toBe('Diagnose');
  });

  it('rejects export of fhirpath with locked D-06 error string', () => {
    const cohort = makeCohort({
      // Cast because Plan 22-01 (parallel Wave-1) adds FhirpathCriterion to
      // the canonical union. The codec accepts the string tag regardless.
      criteria: [
        { type: 'fhirpath', expression: 'Patient.where(gender=\'female\')' },
      ] as unknown as CohortDefinition['criteria'],
    });
    expect(() => cohortToFdpgSq(cohort)).toThrow(FdpgCodecError);
    expect(() => cohortToFdpgSq(cohort)).toThrow(
      'This cohort contains a FHIRPath criterion. FDPG Structured Query and FHIRPath are not equivalent formats.',
    );
  });

  it('warns on reference-list export and skips the criterion', () => {
    const { sq, warnings } = cohortToFdpgSq(
      makeCohort({
        criteria: [
          { type: 'reference-list', patientIds: ['p-001', 'p-002'] },
        ],
      }),
    );
    expect(sq.inclusionCriteria).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('reference-list criterion was skipped');
  });

  it('omits date-range bounds when null', () => {
    const { sq } = cohortToFdpgSq(
      makeCohort({
        criteria: [{ type: 'date-range', start: null, end: '2024-12-31' }],
      }),
    );
    const tr = sq.inclusionCriteria[0][0].timeRestriction!;
    expect(tr.afterDate).toBeUndefined();
    expect(tr.beforeDate).toBe('2024-12-31');
  });
});

// -----------------------------------------------------------------------------
// IMPORT: fdpgSqToCohort
// -----------------------------------------------------------------------------

describe('fdpgSqToCohort — import', () => {
  function validFallCrit() {
    return {
      termCodes: [],
      context: { system: 'fdpg.mii.cds', code: 'Fall' },
      timeRestriction: { afterDate: '2024-01-01', beforeDate: '2024-12-31' },
    };
  }

  function validDiagCrit() {
    return {
      termCodes: [
        { system: 'http://snomed.info/sct', code: '44054006' },
      ],
      context: { system: 'fdpg.mii.cds', code: 'Diagnose' },
    };
  }

  function wrap(inclusion: unknown[][], extras: Record<string, unknown> = {}) {
    return JSON.stringify({
      version: FDPG_SQ_VERSION,
      display: 'Test import',
      inclusionCriteria: inclusion,
      ...extras,
    });
  }

  it('reconstructs a date-range criterion from Fall+timeRestriction', () => {
    const { cohort, warnings } = fdpgSqToCohort(wrap([[validFallCrit()]]));
    expect(warnings).toEqual([]);
    expect(cohort.criteria).toHaveLength(1);
    expect(cohort.criteria[0]).toEqual({
      type: 'date-range',
      start: '2024-01-01',
      end: '2024-12-31',
    });
    expect(cohort.name).toBe('Test import');
  });

  it('reconstructs a condition-code criterion from Diagnose+termCodes', () => {
    const { cohort } = fdpgSqToCohort(wrap([[validDiagCrit()]]));
    expect(cohort.criteria[0]).toEqual({
      type: 'condition-code',
      system: 'http://snomed.info/sct',
      code: '44054006',
    });
  });

  it('assigns a fresh UUID, createdAt and updatedAt on import', () => {
    const before = Date.now();
    const { cohort } = fdpgSqToCohort(wrap([[validDiagCrit()]]));
    expect(cohort.id).toMatch(/^[0-9a-f]{8}-/i);
    const parsed = Date.parse(cohort.createdAt);
    expect(parsed).toBeGreaterThanOrEqual(before - 1000);
    expect(cohort.createdAt).toBe(cohort.updatedAt);
  });

  it('falls back to "Imported cohort" when display is missing', () => {
    const raw = JSON.stringify({
      version: FDPG_SQ_VERSION,
      inclusionCriteria: [[validDiagCrit()]],
    });
    const { cohort } = fdpgSqToCohort(raw);
    expect(cohort.name).toBe('Imported cohort');
  });

  it('round-trips date-range + condition-code', () => {
    const original: CohortDefinition = {
      id: 'fixed-id',
      name: 'Diabetes 2024',
      criteria: [
        { type: 'date-range', start: '2024-01-01', end: '2024-12-31' },
        { type: 'condition-code', system: 'http://snomed.info/sct', code: '44054006' },
      ],
      createdAt: '2026-04-16T10:00:00.000Z',
      updatedAt: '2026-04-16T10:00:00.000Z',
    };
    const { sq, warnings } = cohortToFdpgSq(original);
    expect(warnings).toEqual([]);
    expect(sq.version).toBe(FDPG_SQ_VERSION);
    expect(sq.display).toBe('Diabetes 2024');
    const jsonText = JSON.stringify(sq);
    const { cohort: decoded, warnings: decWarnings } = fdpgSqToCohort(jsonText);
    expect(decWarnings).toEqual([]);
    expect(decoded.name).toBe('Diabetes 2024');
    expect(decoded.criteria).toEqual(original.criteria);
  });

  it('warns when a Diagnose criterion has multiple termCodes — imports only the first', () => {
    const crit = {
      termCodes: [
        { system: 'http://snomed.info/sct', code: '44054006' },
        { system: 'http://snomed.info/sct', code: '73211009' },
      ],
      context: { system: 'fdpg.mii.cds', code: 'Diagnose' },
    };
    const { cohort, warnings } = fdpgSqToCohort(wrap([[crit]]));
    expect(cohort.criteria[0]).toEqual({
      type: 'condition-code',
      system: 'http://snomed.info/sct',
      code: '44054006',
    });
    expect(warnings.some((w) => w.includes('2 term codes'))).toBe(true);
  });

  it('rejects unsupported SQ features — exclusionCriteria', () => {
    const raw = JSON.stringify({
      version: FDPG_SQ_VERSION,
      inclusionCriteria: [[validDiagCrit()]],
      exclusionCriteria: [[validDiagCrit()]],
    });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'Exclusion criteria are not yet supported.',
    );
  });

  it('rejects unsupported SQ features — OR groups', () => {
    const raw = wrap([[validFallCrit(), validDiagCrit()]]);
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'OR-composition within criterion groups is not yet supported.',
    );
  });

  it('rejects unsupported SQ features — attributeFilters', () => {
    const critWithAttr = {
      ...validDiagCrit(),
      attributeFilters: [{ type: 'concept' }],
    };
    expect(() => fdpgSqToCohort(wrap([[critWithAttr]]))).toThrow(
      'Attribute filters are not yet supported.',
    );
  });

  it('rejects unsupported SQ features — unknown context', () => {
    const crit = {
      termCodes: [{ system: 's', code: 'c' }],
      context: { system: 'fdpg.mii.cds', code: 'Laborbefund' },
    };
    expect(() => fdpgSqToCohort(wrap([[crit]]))).toThrow(
      'Criterion with context "Laborbefund" is not supported. Supported contexts: Fall, Diagnose.',
    );
  });

  it('rejects unsupported SQ features — unknown valueFilter type', () => {
    const crit = {
      ...validDiagCrit(),
      valueFilter: { type: 'quantity-range' },
    };
    expect(() => fdpgSqToCohort(wrap([[crit]]))).toThrow(
      'Value filter type "quantity-range" is not yet supported.',
    );
  });

  it('enforces 1MB import cap', () => {
    // Build a >1MB JSON string with a valid v3 envelope prefix so parse would
    // otherwise succeed. Padding goes inside `display`.
    const padding = 'A'.repeat(MAX_FDPG_FILE_BYTES + 100);
    const raw = JSON.stringify({
      version: FDPG_SQ_VERSION,
      display: padding,
      inclusionCriteria: [[validDiagCrit()]],
    });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'File exceeds 1 MB cap. FDPG cohort exports are typically under 50 KB; this file may not be a valid FDPG export.',
    );
  });

  it('rejects invalid JSON', () => {
    expect(() => fdpgSqToCohort('{not valid')).toThrow(
      'Selected file is not valid JSON.',
    );
  });

  it('rejects JSON arrays or primitives at the top level', () => {
    expect(() => fdpgSqToCohort('[]')).toThrow('Selected file is not valid JSON.');
    expect(() => fdpgSqToCohort('42')).toThrow('Selected file is not valid JSON.');
  });

  it('rejects missing version', () => {
    const raw = JSON.stringify({
      inclusionCriteria: [[validDiagCrit()]],
    });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'FDPG file is missing the required "version" field.',
    );
  });

  it('rejects non-v3 version', () => {
    const raw = JSON.stringify({
      version: 'https://example.com/foo/v1',
      inclusionCriteria: [[validDiagCrit()]],
    });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'FDPG file uses schema version "https://example.com/foo/v1".',
    );
  });

  it('rejects missing inclusionCriteria', () => {
    const raw = JSON.stringify({ version: FDPG_SQ_VERSION });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'FDPG file is missing the required "inclusionCriteria" field.',
    );
  });

  it('rejects inclusionCriteria that is not a 2D array', () => {
    const raw = JSON.stringify({
      version: FDPG_SQ_VERSION,
      inclusionCriteria: [1, 2],
    });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      '"inclusionCriteria" must be a 2D array of criterion groups.',
    );
  });

  it('rejects empty inclusionCriteria', () => {
    const raw = JSON.stringify({
      version: FDPG_SQ_VERSION,
      inclusionCriteria: [],
    });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'FDPG file contains no inclusion criteria.',
    );
  });

  it('rejects inclusionCriteria containing only empty inner groups', () => {
    const raw = JSON.stringify({
      version: FDPG_SQ_VERSION,
      inclusionCriteria: [[]],
    });
    expect(() => fdpgSqToCohort(raw)).toThrow(
      'FDPG file contains no inclusion criteria.',
    );
  });
});

// -----------------------------------------------------------------------------
// Security — prototype pollution
// -----------------------------------------------------------------------------

describe('fdpgSqToCohort — prototype pollution defence', () => {
  it('no prototype pollution', () => {
    const malicious = JSON.stringify({
      version: FDPG_SQ_VERSION,
      display: 'attack',
      inclusionCriteria: [
        [
          {
            termCodes: [{ system: 'http://snomed.info/sct', code: '44054006' }],
            context: { system: 'fdpg.mii.cds', code: 'Diagnose' },
          },
        ],
      ],
      __proto__: { polluted: 'yes' },
      constructor: { prototype: { polluted: 'yes' } },
    });
    fdpgSqToCohort(malicious);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(([] as Array<unknown> & { polluted?: string }).polluted).toBeUndefined();
  });
});
