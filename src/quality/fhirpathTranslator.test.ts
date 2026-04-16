/**
 * Unit tests for src/quality/fhirpathTranslator.ts — Plan 22-01 Task 1 (TDD RED).
 *
 * Every `describe`/`it` name below matches a VALIDATION.md `-t "…"` filter so
 * plan automation commands resolve to a concrete spec. The filters are:
 *   - `-t "rejects unsupported syntax"`
 *   - `-t "uses URLSearchParams"`
 *   - `-t "translates operator prefixes"`
 *   - `-t "dry-run count"`
 *   - `-t "rejects exists()"`
 *   - `-t "rejects unmapped field"`
 *   - `-t "rejects and composition"`
 *   - `-t "parses Patient birthDate"`
 *
 * MedplumClient mock shape follows `src/quality/cohortResolver.test.ts`.
 */
import { describe, it, expect, vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import {
  translateFhirpath,
  translatedQueryToFhirSearchUrl,
  dryRunCount,
  TranslationError,
  PREFIX_FOR_OPERATOR,
  SEARCH_PARAM_MAP,
  type TranslatedQuery,
} from './fhirpathTranslator';

// -----------------------------------------------------------------------------
// translateFhirpath — parses supported expressions
// -----------------------------------------------------------------------------

describe('fhirpathTranslator', () => {
  describe('translateFhirpath — parses supported expressions', () => {
    it('parses Patient birthDate less-than date literal', () => {
      const q = translateFhirpath('Patient.where(birthDate < @1960-01-01)');
      expect(q).toEqual({
        resourceType: 'Patient',
        fieldPath: 'birthDate',
        operator: '<',
        literal: { kind: 'date', value: '1960-01-01' },
      });
    });

    it('parses Patient gender equality with string literal', () => {
      const q = translateFhirpath("Patient.where(gender = 'female')");
      expect(q).toEqual({
        resourceType: 'Patient',
        fieldPath: 'gender',
        operator: '=',
        literal: { kind: 'string', value: 'female' },
      });
    });

    it('parses Condition code.coding.code equality with dotted path', () => {
      const q = translateFhirpath(
        "Condition.where(code.coding.code = '44054006')",
      );
      expect(q).toEqual({
        resourceType: 'Condition',
        fieldPath: 'code.coding.code',
        operator: '=',
        literal: { kind: 'string', value: '44054006' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // translateFhirpath — rejects unsupported syntax (12 locked strings)
  // ---------------------------------------------------------------------------

  describe('translateFhirpath — rejects unsupported syntax', () => {
    it('rejects and composition', () => {
      expect(() =>
        translateFhirpath(
          "Patient.where(birthDate < @1960-01-01 and gender = 'female')",
        ),
      ).toThrow(
        new TranslationError(
          'Expression must be a single Resource.where(...) call. Composition (and / or) is not supported.',
        ),
      );
    });

    it('rejects exists() inside where()', () => {
      // exists() is a FunctionAtom, not an Equals/NotEquals/ArithemticOperator
      // atom, so it hits the "Unsupported clause type" branch.
      expect(() => translateFhirpath('Patient.where(name.exists())')).toThrow(
        /^Unsupported clause type:/,
      );
    });

    it('rejects function other than where()', () => {
      expect(() => translateFhirpath('Patient.first()')).toThrow(
        /^Only \.where\(\.\.\.\) is supported\. Got: /,
      );
    });

    it('rejects where() with zero arguments', () => {
      expect(() => translateFhirpath('Patient.where()')).toThrow(
        new TranslationError('where() takes exactly one argument.'),
      );
    });

    it('rejects unsupported operator (+)', () => {
      expect(() => translateFhirpath('Patient.where(birthDate + 1)')).toThrow(
        new TranslationError(
          'Operator + is not supported. Use =, !=, <, <=, >, >=.',
        ),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // translatedQueryToFhirSearchUrl — operator-prefix correctness
  // ---------------------------------------------------------------------------

  describe('translatedQueryToFhirSearchUrl — uses URLSearchParams', () => {
    it('encodes prefix+literal via encodeURIComponent for birthDate less-than', () => {
      const q: TranslatedQuery = {
        resourceType: 'Patient',
        fieldPath: 'birthDate',
        operator: '<',
        literal: { kind: 'date', value: '1960-01-01' },
      };
      expect(translatedQueryToFhirSearchUrl(q)).toBe(
        'Patient?birthdate=lt1960-01-01&_elements=id&_count=10000',
      );
    });

    it('encodes Condition code equality with _elements=subject', () => {
      const q: TranslatedQuery = {
        resourceType: 'Condition',
        fieldPath: 'code.coding.code',
        operator: '=',
        literal: { kind: 'string', value: '44054006' },
      };
      expect(translatedQueryToFhirSearchUrl(q)).toBe(
        'Condition?code=44054006&_elements=subject&_count=10000',
      );
    });

    it('rejects unmapped field on Patient with supported-fields list', () => {
      const q: TranslatedQuery = {
        resourceType: 'Patient',
        fieldPath: 'iris.pattern',
        operator: '=',
        literal: { kind: 'string', value: 'blue' },
      };
      expect(() => translatedQueryToFhirSearchUrl(q)).toThrow(
        /^Field "iris\.pattern" on Patient has no FHIR search parameter mapping\. Supported fields:/,
      );
    });

    it('rejects unsupported resource type with supported-list', () => {
      const q: TranslatedQuery = {
        resourceType: 'ImagingStudy',
        fieldPath: 'id',
        operator: '=',
        literal: { kind: 'string', value: 'abc' },
      };
      expect(() => translatedQueryToFhirSearchUrl(q)).toThrow(
        /^Resource type "ImagingStudy" is not in the supported translator map\. Supported:/,
      );
    });

    it('rejects range operator on token field', () => {
      const q: TranslatedQuery = {
        resourceType: 'Patient',
        fieldPath: 'gender',
        operator: '<',
        literal: { kind: 'string', value: 'female' },
      };
      expect(() => translatedQueryToFhirSearchUrl(q)).toThrow(
        new TranslationError(
          'Operator < is not valid for token fields. Use = or !=.',
        ),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // translates operator prefixes — full table coverage
  // ---------------------------------------------------------------------------

  describe('translatedQueryToFhirSearchUrl — translates operator prefixes', () => {
    const cases: Array<{
      op: TranslatedQuery['operator'];
      prefix: string;
    }> = [
      { op: '=', prefix: '' },
      { op: '!=', prefix: 'ne' },
      { op: '<', prefix: 'lt' },
      { op: '<=', prefix: 'le' },
      { op: '>', prefix: 'gt' },
      { op: '>=', prefix: 'ge' },
    ];

    for (const { op, prefix } of cases) {
      it(`maps ${op} to prefix "${prefix}" on Patient.birthDate`, () => {
        const q: TranslatedQuery = {
          resourceType: 'Patient',
          fieldPath: 'birthDate',
          operator: op,
          literal: { kind: 'date', value: '1960-01-01' },
        };
        const url = translatedQueryToFhirSearchUrl(q);
        expect(url).toBe(
          `Patient?birthdate=${prefix}1960-01-01&_elements=id&_count=10000`,
        );
        expect(PREFIX_FOR_OPERATOR[op]).toBe(prefix);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // dryRunCount — invokes client.search with _count=0 and _summary=count
  // ---------------------------------------------------------------------------

  describe('dryRunCount — invokes client.search with _count=0 and _summary=count', () => {
    it('calls client.search with params object and returns bundle.total', async () => {
      const search = vi.fn().mockResolvedValue({ total: 142 });
      const mockClient = { search } as unknown as MedplumClient;
      const q: TranslatedQuery = {
        resourceType: 'Patient',
        fieldPath: 'birthDate',
        operator: '<',
        literal: { kind: 'date', value: '1960-01-01' },
      };
      const count = await dryRunCount(mockClient, q);
      expect(count).toBe(142);
      expect(search).toHaveBeenCalledTimes(1);
      const [resourceType, params] = search.mock.calls[0]!;
      expect(resourceType).toBe('Patient');
      expect(params).toEqual({
        birthdate: 'lt1960-01-01',
        _count: 0,
        _summary: 'count',
      });
    });

    it('returns 0 when bundle.total is undefined', async () => {
      const search = vi.fn().mockResolvedValue({});
      const mockClient = { search } as unknown as MedplumClient;
      const q: TranslatedQuery = {
        resourceType: 'Patient',
        fieldPath: 'gender',
        operator: '=',
        literal: { kind: 'string', value: 'female' },
      };
      const count = await dryRunCount(mockClient, q);
      expect(count).toBe(0);
    });

    it('dry-run count — throws TranslationError for unmapped field', async () => {
      const search = vi.fn();
      const mockClient = { search } as unknown as MedplumClient;
      const q: TranslatedQuery = {
        resourceType: 'Patient',
        fieldPath: 'iris.pattern',
        operator: '=',
        literal: { kind: 'string', value: 'blue' },
      };
      await expect(dryRunCount(mockClient, q)).rejects.toBeInstanceOf(
        TranslationError,
      );
      expect(search).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // SEARCH_PARAM_MAP coverage sanity checks
  // ---------------------------------------------------------------------------

  describe('SEARCH_PARAM_MAP — supports the 4 core resource types', () => {
    it('covers Patient, Condition, Observation, Encounter', () => {
      expect(Object.keys(SEARCH_PARAM_MAP).sort()).toEqual(
        ['Condition', 'Encounter', 'Observation', 'Patient'].sort(),
      );
    });

    it('maps Patient.birthDate → birthdate (date, id)', () => {
      expect(SEARCH_PARAM_MAP.Patient!.birthDate).toEqual({
        searchParam: 'birthdate',
        paramType: 'date',
        elements: 'id',
      });
    });

    it('maps Condition.code.coding.code → code (token, subject)', () => {
      expect(SEARCH_PARAM_MAP.Condition!['code.coding.code']).toEqual({
        searchParam: 'code',
        paramType: 'token',
        elements: 'subject',
      });
    });
  });
});
