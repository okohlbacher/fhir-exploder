/**
 * cohortResolver — Plan 21-02 Task 2.2 tests.
 *
 * Every `it()` name below matches a VALIDATION.md `-t "…"` filter so plan
 * automation commands resolve to a concrete spec:
 *   - `-t "intersects"`       (CHRT-01)
 *   - `-t "date range"`       (CHRT-01)
 *   - `-t "condition code"`   (CHRT-01)
 *   - `-t "caches"`            (Plan 21-02 T-2.2 cache semantics)
 *
 * MedplumClient mock shape mirrors the pattern used in
 * src/quality/__tests__/pdfExport.test.ts (vi.fn()-backed method surface).
 *
 * Threat T-21-03 (PHI in fixtures): every test ID is synthetic (`p-001` etc).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import {
  resolveCohort,
  clearCohortResolutionCache,
} from './cohortResolver';
import type { CohortDefinition } from './cohorts';

// Build a minimal subject-only Condition/Encounter shape the resolver reads.
function mkSubjectResource(
  resourceType: 'Encounter' | 'Condition',
  patientId: string,
): Resource {
  return {
    resourceType,
    subject: { reference: `Patient/${patientId}` },
  } as unknown as Resource;
}

// Build an async-generator-returning searchResourcePages mock that yields
// ONE page per call with the supplied resources. The real Medplum client
// yields one entry array per page; we emit a single page per call, keyed by
// a lookup map on (resourceType, paramsFingerprint).
type PageMap = Map<string, Resource[]>;

function fingerprintParams(params: Record<string, unknown>): string {
  // Stable key on (resourceType already encoded by caller) + sorted keys.
  // Arrays serialized with JSON to keep `['geX','leY']` distinct from `['leY','geX']`.
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join('&');
}

function makeMockClient(pages: PageMap) {
  const searchResourcePages = vi.fn(
    async function* (
      resourceType: string,
      params: Record<string, unknown>,
    ): AsyncGenerator<Resource[]> {
      const key = `${resourceType}|${fingerprintParams(params)}`;
      yield pages.get(key) ?? [];
    },
  );
  return {
    searchResources: vi.fn(),
    searchResourcePages,
  } as unknown as MedplumClient & {
    searchResourcePages: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  clearCohortResolutionCache();
});

describe('resolveCohort', () => {
  it('intersects three criterion sets', async () => {
    // Synthetic scenario:
    //   date-range     → {p-001, p-002, p-003}
    //   condition-code → {p-002, p-003, p-004}
    //   reference-list → {p-002, p-005}
    // AND intersection → {p-002}
    const pages: PageMap = new Map();
    const dateKey = `Encounter|${fingerprintParams({
      _count: '1000',
      _elements: 'subject',
      date: ['ge2024-01-01', 'le2024-12-31'],
    })}`;
    pages.set(dateKey, [
      mkSubjectResource('Encounter', 'p-001'),
      mkSubjectResource('Encounter', 'p-002'),
      mkSubjectResource('Encounter', 'p-003'),
    ]);
    const codeKey = `Condition|${fingerprintParams({
      _count: '1000',
      _elements: 'subject',
      code: 'http://snomed.info/sct|44054006',
    })}`;
    pages.set(codeKey, [
      mkSubjectResource('Condition', 'p-002'),
      mkSubjectResource('Condition', 'p-003'),
      mkSubjectResource('Condition', 'p-004'),
    ]);

    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-intersect',
      name: 'test',
      criteria: [
        { type: 'date-range', start: '2024-01-01', end: '2024-12-31' },
        {
          type: 'condition-code',
          system: 'http://snomed.info/sct',
          code: '44054006',
        },
        { type: 'reference-list', patientIds: ['p-002', 'p-005'] },
      ],
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z',
    };
    const ids = await resolveCohort(client, cohort);
    expect(ids).toEqual(['p-002']);
  });

  it('date range queries Encounter?date=geX&date=leY', async () => {
    const pages: PageMap = new Map();
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-date',
      name: 'd',
      criteria: [
        { type: 'date-range', start: '2024-01-01', end: '2024-12-31' },
      ],
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z',
    };
    await resolveCohort(client, cohort);
    const calls = (client as unknown as {
      searchResourcePages: { mock: { calls: unknown[][] } };
    }).searchResourcePages.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBe('Encounter');
    expect(calls[0]![1]).toEqual(
      expect.objectContaining({
        date: ['ge2024-01-01', 'le2024-12-31'],
        _elements: 'subject',
      }),
    );
  });

  it('condition code queries Condition?code=sys|code', async () => {
    const pages: PageMap = new Map();
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-code',
      name: 'c',
      criteria: [
        {
          type: 'condition-code',
          system: 'http://snomed.info/sct',
          code: '44054006',
        },
      ],
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z',
    };
    await resolveCohort(client, cohort);
    const calls = (client as unknown as {
      searchResourcePages: { mock: { calls: unknown[][] } };
    }).searchResourcePages.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBe('Condition');
    expect(calls[0]![1]).toEqual(
      expect.objectContaining({
        code: 'http://snomed.info/sct|44054006',
        _elements: 'subject',
      }),
    );
  });

  it('reference-list alone returns deduped IDs without server query', async () => {
    const pages: PageMap = new Map();
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-ref',
      name: 'r',
      criteria: [
        {
          type: 'reference-list',
          patientIds: ['p-001', 'p-002', 'p-001'],
        },
      ],
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z',
    };
    const ids = await resolveCohort(client, cohort);
    expect(new Set(ids)).toEqual(new Set(['p-001', 'p-002']));
    const calls = (client as unknown as {
      searchResourcePages: { mock: { calls: unknown[][] } };
    }).searchResourcePages.mock.calls;
    expect(calls).toHaveLength(0);
  });

  it('caches results by cohort.updatedAt', async () => {
    const pages: PageMap = new Map();
    const codeKey = `Condition|${fingerprintParams({
      _count: '1000',
      _elements: 'subject',
      code: 'http://snomed.info/sct|44054006',
    })}`;
    pages.set(codeKey, [
      mkSubjectResource('Condition', 'p-100'),
      mkSubjectResource('Condition', 'p-101'),
    ]);
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-cache',
      name: 'cache',
      criteria: [
        {
          type: 'condition-code',
          system: 'http://snomed.info/sct',
          code: '44054006',
        },
      ],
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z',
    };
    const first = await resolveCohort(client, cohort);
    const second = await resolveCohort(client, cohort);
    expect(first).toEqual(second);
    const mockCalls = (client as unknown as {
      searchResourcePages: { mock: { calls: unknown[][] } };
    }).searchResourcePages.mock.calls;
    expect(mockCalls).toHaveLength(1);

    // Invalidation: bump updatedAt, expect a fresh server call.
    const bumped: CohortDefinition = {
      ...cohort,
      updatedAt: '2026-04-16T00:00:00.000Z',
    };
    await resolveCohort(client, bumped);
    expect(mockCalls).toHaveLength(2);
  });

  it('skips malformed subject references without throwing', async () => {
    const pages: PageMap = new Map();
    const codeKey = `Condition|${fingerprintParams({
      _count: '1000',
      _elements: 'subject',
      code: 'http://snomed.info/sct|44054006',
    })}`;
    // Malformed: missing subject entirely, non-Patient type, bare string, etc.
    pages.set(codeKey, [
      { resourceType: 'Condition' } as unknown as Resource, // no subject
      {
        resourceType: 'Condition',
        subject: { reference: 'Group/g-1' },
      } as unknown as Resource, // non-Patient
      {
        resourceType: 'Condition',
        subject: { reference: 'Patient/p-good' },
      } as unknown as Resource,
    ]);
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-malformed',
      name: 'm',
      criteria: [
        {
          type: 'condition-code',
          system: 'http://snomed.info/sct',
          code: '44054006',
        },
      ],
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z',
    };
    const ids = await resolveCohort(client, cohort);
    expect(ids).toEqual(['p-good']);
  });
});

// -----------------------------------------------------------------------------
// Plan 22-01 Task 3 — fhirpath criterion branch + 10K-ID cap + cache
// invalidation regression. Matches VALIDATION.md `-t` filters:
//   - `-t "resolves fhirpath criterion"`
//   - `-t "cache invalidates on updatedAt"`
//   - `-t "applies 10K-ID cap"`
//   - `-t "propagates TranslationError"`
// -----------------------------------------------------------------------------

describe('fhirpath criterion', () => {
  it('resolves fhirpath criterion — Patient gender equality via collectIdField', async () => {
    // Patient search returns Patient resources directly; collectIdField
    // pulls `id` (not subject.reference).
    const pages: PageMap = new Map();
    const genderKey = `Patient|${fingerprintParams({
      _count: '1000',
      _elements: 'id',
      gender: 'female',
    })}`;
    pages.set(genderKey, [
      { resourceType: 'Patient', id: 'p1' } as unknown as Resource,
      { resourceType: 'Patient', id: 'p2' } as unknown as Resource,
    ]);
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-fp-patient',
      name: 'gender-female',
      criteria: [
        {
          type: 'fhirpath',
          expression: "Patient.where(gender = 'female')",
        },
      ],
      createdAt: '2026-04-16T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
    };
    const ids = await resolveCohort(client, cohort);
    expect(new Set(ids)).toEqual(new Set(['p1', 'p2']));

    const calls = (
      client as unknown as {
        searchResourcePages: { mock: { calls: unknown[][] } };
      }
    ).searchResourcePages.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBe('Patient');
    expect(calls[0]![1]).toEqual(
      expect.objectContaining({
        gender: 'female',
        _elements: 'id',
        _count: '1000',
      }),
    );
  });

  it('resolves fhirpath criterion — Condition code via collectSubjectPatientIds', async () => {
    const pages: PageMap = new Map();
    const codeKey = `Condition|${fingerprintParams({
      _count: '1000',
      _elements: 'subject',
      code: '44054006',
    })}`;
    pages.set(codeKey, [
      mkSubjectResource('Condition', 'p1'),
      mkSubjectResource('Condition', 'p2'),
    ]);
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-fp-condition',
      name: 'diabetes',
      criteria: [
        {
          type: 'fhirpath',
          expression: "Condition.where(code.coding.code = '44054006')",
        },
      ],
      createdAt: '2026-04-16T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
    };
    const ids = await resolveCohort(client, cohort);
    expect(new Set(ids)).toEqual(new Set(['p1', 'p2']));

    const calls = (
      client as unknown as {
        searchResourcePages: { mock: { calls: unknown[][] } };
      }
    ).searchResourcePages.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBe('Condition');
    expect(calls[0]![1]).toEqual(
      expect.objectContaining({
        code: '44054006',
        _elements: 'subject',
        _count: '1000',
      }),
    );
  });

  it('applies 10K-ID cap to fhirpath results', async () => {
    // Custom mock that yields 10_001 Patient resources in a single page.
    // Builds directly rather than via PageMap so we don't have to worry
    // about the fingerprint matching the exact params.
    const searchResourcePages = vi.fn(
      async function* (): AsyncGenerator<Resource[]> {
        const page: Resource[] = [];
        for (let i = 0; i < 10_001; i++) {
          page.push({
            resourceType: 'Patient',
            id: `p-${i}`,
          } as unknown as Resource);
        }
        yield page;
      },
    );
    const client = {
      searchResources: vi.fn(),
      searchResourcePages,
    } as unknown as MedplumClient;

    const cohort: CohortDefinition = {
      id: 'c-fp-cap',
      name: 'cap-test',
      criteria: [
        {
          type: 'fhirpath',
          expression: "Patient.where(gender = 'female')",
        },
      ],
      createdAt: '2026-04-16T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
    };
    const ids = await resolveCohort(client, cohort);
    expect(ids).toHaveLength(10_000);
  });

  it('propagates TranslationError from an unsupported fhirpath expression', async () => {
    const client = makeMockClient(new Map());
    const cohort: CohortDefinition = {
      id: 'c-fp-bad',
      name: 'bad',
      criteria: [
        {
          type: 'fhirpath',
          expression:
            "Patient.where(birthDate < @1960-01-01 and gender = 'female')",
        },
      ],
      createdAt: '2026-04-16T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
    };
    await expect(resolveCohort(client, cohort)).rejects.toThrow(
      /Composition \(and \/ or\) is not supported/,
    );
  });
});

describe('cache invalidates on updatedAt change', () => {
  it('cache invalidates on updatedAt change — fhirpath criterion', async () => {
    const pages: PageMap = new Map();
    const genderKey = `Patient|${fingerprintParams({
      _count: '1000',
      _elements: 'id',
      gender: 'female',
    })}`;
    pages.set(genderKey, [
      { resourceType: 'Patient', id: 'p1' } as unknown as Resource,
    ]);
    const client = makeMockClient(pages);
    const cohort: CohortDefinition = {
      id: 'c-fp-cache',
      name: 'cache',
      criteria: [
        {
          type: 'fhirpath',
          expression: "Patient.where(gender = 'female')",
        },
      ],
      createdAt: '2026-04-16T10:00:00.000Z',
      updatedAt: '2026-04-16T10:00:00.000Z',
    };
    // First resolve — populates cache.
    await resolveCohort(client, cohort);
    // Second resolve, same updatedAt — must hit cache (no second call).
    await resolveCohort(client, cohort);
    const calls = (
      client as unknown as {
        searchResourcePages: { mock: { calls: unknown[][] } };
      }
    ).searchResourcePages.mock.calls;
    expect(calls).toHaveLength(1);

    // Bump updatedAt — must re-resolve (fresh server call).
    const bumped: CohortDefinition = {
      ...cohort,
      updatedAt: '2026-04-16T11:00:00.000Z',
    };
    await resolveCohort(client, bumped);
    expect(calls).toHaveLength(2);
  });
});
