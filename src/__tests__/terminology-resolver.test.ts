import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import type { Coding, Condition, Parameters } from '@medplum/fhirtypes';
import {
  TerminologyResolver,
  extractDisplay,
} from '../terminology/TerminologyResolver';
import { collectCodings } from '../terminology/walker';
import { mockMedplumClientForTerminology } from './fixtures/terminology';

const SERVER = 'https://tx.example/fhir';
const SNOMED = 'http://snomed.info/sct';

function paramsWithDisplay(display: string): Parameters {
  return {
    resourceType: 'Parameters',
    parameter: [{ name: 'display', valueString: display }],
  };
}

function paramsWithDisplayAndDeDesignation(
  topDisplay: string,
  deValue: string,
): Parameters {
  return {
    resourceType: 'Parameters',
    parameter: [
      { name: 'display', valueString: topDisplay },
      {
        name: 'designation',
        part: [
          { name: 'language', valueCode: 'de' },
          { name: 'value', valueString: deValue },
        ],
      },
    ],
  };
}

// Non-persistent resolver options so localStorage noise never masks an assertion.
const baseOpts = {
  displayLanguage: 'de',
  serverUrl: SERVER,
  persistToLocalStorage: false,
  negativeTtlMs: 60_000,
} as const;

// Clean localStorage between tests to guarantee no cross-test contamination
// (even though persist:false is default here, belt-and-braces for V-06 / V-11).
beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('extractDisplay', () => {
  it('extractDisplay returns display valueString', () => {
    // V-02
    const p = paramsWithDisplay('Diabetes Type 2');
    expect(extractDisplay(p)).toBe('Diabetes Type 2');
  });

  it('prefers de designation over top-level display', () => {
    // V-03
    const p = paramsWithDisplayAndDeDesignation('Diabetes Type 2', 'Diabetes Typ 2');
    expect(extractDisplay(p, 'de')).toBe('Diabetes Typ 2');
  });

  it('falls back to top-level display when no matching designation', () => {
    const p = paramsWithDisplayAndDeDesignation('Diabetes Type 2', 'Diabetes Typ 2');
    expect(extractDisplay(p, 'fr')).toBe('Diabetes Type 2');
  });

  it('returns null on non-Parameters resource', () => {
    expect(extractDisplay({ resourceType: 'OperationOutcome' } as unknown as Parameters)).toBe(null);
  });
});

describe('TerminologyResolver', () => {
  it('issues lookup with displayLanguage=de and correct path shape', async () => {
    // V-01
    const client = mockMedplumClientForTerminology({
      lookupResponses: {
        'E11.9': paramsWithDisplay('Diabetes Type 2'),
      },
    });
    const resolver = new TerminologyResolver(client, baseOpts);
    const out = await resolver.resolveCoding({ system: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9' });
    expect(out.display).toBe('Diabetes Type 2');
    const get = client.get as unknown as ReturnType<typeof vi.fn>;
    expect(get).toHaveBeenCalledTimes(1);
    const calledPath = get.mock.calls[0][0] as string;
    expect(calledPath.startsWith('CodeSystem/$lookup?')).toBe(true);
    expect(calledPath).toContain('system=');
    expect(calledPath).toContain('code=');
    expect(calledPath).toContain('displayLanguage=de');
  });

  it('dedups inflight — 3 parallel resolveCoding trigger exactly one client.get', async () => {
    // V-07
    let resolve: (v: unknown) => void = () => {};
    const pending = new Promise<unknown>((r) => {
      resolve = r;
    });
    const get = vi.fn(async (path: string) => {
      if (path === 'metadata') return { resourceType: 'CapabilityStatement' };
      return pending;
    });
    const client = { get } as unknown as MedplumClient;
    const resolver = new TerminologyResolver(client, baseOpts);
    const coding: Coding = { system: SNOMED, code: '73211009' };
    const all = Promise.all([
      resolver.resolveCoding(coding),
      resolver.resolveCoding(coding),
      resolver.resolveCoding(coding),
    ]);
    // give microtasks a chance to run
    await Promise.resolve();
    await Promise.resolve();
    resolve(paramsWithDisplay('Diabetes mellitus'));
    const [a, b, c] = await all;
    expect(get).toHaveBeenCalledTimes(1);
    expect(a.display).toBe('Diabetes mellitus');
    expect(b.display).toBe('Diabetes mellitus');
    expect(c.display).toBe('Diabetes mellitus');
  });

  it('cached hit skips network — 2 sequential resolveCoding calls → one client.get', async () => {
    // V-06 foundation
    const client = mockMedplumClientForTerminology({
      lookupResponses: { '73211009': paramsWithDisplay('Diabetes mellitus') },
    });
    const resolver = new TerminologyResolver(client, baseOpts);
    const coding: Coding = { system: SNOMED, code: '73211009' };
    await resolver.resolveCoding(coding);
    await resolver.resolveCoding(coding);
    const get = client.get as unknown as ReturnType<typeof vi.fn>;
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('skips incomplete Coding — no client.get when system missing', async () => {
    // V-13
    const client = mockMedplumClientForTerminology({});
    const resolver = new TerminologyResolver(client, baseOpts);
    const out = await resolver.resolveCoding({ code: '73211009' } as Coding);
    expect(out).toEqual({ code: '73211009' });
    const get = client.get as unknown as ReturnType<typeof vi.fn>;
    expect(get).not.toHaveBeenCalled();
  });

  it('skips incomplete Coding — no client.get when code missing', async () => {
    const client = mockMedplumClientForTerminology({});
    const resolver = new TerminologyResolver(client, baseOpts);
    const out = await resolver.resolveCoding({ system: SNOMED } as Coding);
    expect(out).toEqual({ system: SNOMED });
    const get = client.get as unknown as ReturnType<typeof vi.fn>;
    expect(get).not.toHaveBeenCalled();
  });

  it('preserves existing display — no network call when display already set', async () => {
    // D-03
    const client = mockMedplumClientForTerminology({});
    const resolver = new TerminologyResolver(client, baseOpts);
    const input: Coding = { system: SNOMED, code: '73211009', display: 'already set' };
    const out = await resolver.resolveCoding(input);
    expect(out).toBe(input);
    const get = client.get as unknown as ReturnType<typeof vi.fn>;
    expect(get).not.toHaveBeenCalled();
  });

  it('silent on 404 — OperationOutcome throw → coding unchanged, negative entry cached, no throw', async () => {
    // V-11
    const notFound = Object.assign(new Error('Not Found'), { status: 404 });
    const client = mockMedplumClientForTerminology({
      errors: { 'not-there': notFound },
    });
    const resolver = new TerminologyResolver(client, baseOpts);
    const coding: Coding = { system: SNOMED, code: 'not-there' };
    const out = await resolver.resolveCoding(coding);
    expect(out.display).toBeUndefined();
    // second call should hit the negative cache, not network
    const get = client.get as unknown as ReturnType<typeof vi.fn>;
    const before = get.mock.calls.length;
    await resolver.resolveCoding(coding);
    expect(get.mock.calls.length).toBe(before);
  });

  it('silent on network error — returns coding unchanged, negative entry cached', async () => {
    // V-12
    const client = mockMedplumClientForTerminology({
      errors: { 'offline-code': new Error('ECONNREFUSED') },
    });
    const resolver = new TerminologyResolver(client, baseOpts);
    const coding: Coding = { system: SNOMED, code: 'offline-code' };
    const out = await resolver.resolveCoding(coding);
    expect(out.display).toBeUndefined();
    // cache should have a negative entry
    // (indirectly verified by second call not hitting network)
    const get = client.get as unknown as ReturnType<typeof vi.fn>;
    const before = get.mock.calls.length;
    await resolver.resolveCoding(coding);
    expect(get.mock.calls.length).toBe(before);
  });

  it('resolveCodeableConcept resolves each coding and returns new CodeableConcept', async () => {
    const client = mockMedplumClientForTerminology({
      lookupResponses: {
        'E11.9': paramsWithDisplay('Diabetes Type 2'),
        '73211009': paramsWithDisplay('Diabetes mellitus'),
      },
    });
    const resolver = new TerminologyResolver(client, baseOpts);
    const cc = await resolver.resolveCodeableConcept({
      coding: [
        { system: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9' },
        { system: SNOMED, code: '73211009' },
      ],
    });
    expect(cc.coding?.[0].display).toBe('Diabetes Type 2');
    expect(cc.coding?.[1].display).toBe('Diabetes mellitus');
  });

  it('enriches resource end-to-end via resolveResource', async () => {
    const client = mockMedplumClientForTerminology({
      lookupResponses: {
        'E11.9': paramsWithDisplay('Diabetes Type 2'),
      },
    });
    const resolver = new TerminologyResolver(client, baseOpts);
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/123' },
      code: {
        coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9' }],
      },
    };
    const out = await resolver.resolveResource(condition);
    expect(out.code?.coding?.[0].display).toBe('Diabetes Type 2');
    // Original untouched
    expect(condition.code?.coding?.[0].display).toBeUndefined();
  });
});

describe('collectCodings', () => {
  it('returns [] for non-object values', () => {
    expect(collectCodings(undefined)).toEqual([]);
    expect(collectCodings(null)).toEqual([]);
    expect(collectCodings(42)).toEqual([]);
    expect(collectCodings('str')).toEqual([]);
  });

  it('returns a single coding when given a Coding-shaped object', () => {
    const c = { system: 'X', code: 'Y' };
    expect(collectCodings(c)).toEqual([c]);
  });

  it('walks nested resources and yields every Coding', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/1' },
      code: {
        coding: [
          { system: 'http://snomed.info/sct', code: '73211009' },
          { system: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9' },
        ],
      },
      category: [
        {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }],
        },
      ],
    };
    const codings = collectCodings(condition);
    expect(codings).toHaveLength(3);
    expect(codings.map((c) => c.code).sort()).toEqual(['73211009', 'E11.9', 'problem-list-item'].sort());
  });

  it('does not double-count a Coding whose parent is also a shallow Coding-shape', () => {
    // If a wrapper object happens to have system+code but also holds nested codings
    // via other keys, the walker should yield the wrapper once (not its own children
    // under system/code/display/version, which are scalar anyway).
    const wrapper = { system: 'X', code: 'Y', note: [{ system: 'A', code: 'B' }] };
    const got = collectCodings(wrapper);
    expect(got.length).toBe(2);
  });
});
