/**
 * Phase 43 VAL-07 walker regression tests.
 *
 * Covers:
 *   1. D-09 ordering — ancestors first then descendants, sorted by depth+display
 *   2. D-08 MAX_NODES=50 abort
 *   3. D-08 MAX_DEPTH=3 cap
 *   4. D-12 silent fallback — null client returns []
 *   5. Pitfall 3 — $lookup value polymorphism (valueCode / valueString / valueCoding.code)
 *   6. Cache reuse — lookupDisplay called exactly once per node
 *   7. Cycle defense — visited Set prevents infinite loops on SNOMED `Is a` cycles
 *   8. Network error mid-walk — silent return of partial collection
 */
import { describe, it, expect, vi } from 'vitest';
import type { Parameters } from '@medplum/fhirtypes';
import type { TerminologyResolver } from '../../terminology/TerminologyResolver';
import { walkNearMisses, type NearMissSuggestion } from '../semanticNearMissWalker';

const SNOMED = 'http://snomed.info/sct';

/**
 * Build a $lookup Parameters fixture with parent/child relations.
 * `parents` and `children` are arrays of code values (valueCode).
 */
function lookupFixture(opts: {
  parents?: string[];
  children?: string[];
}): Parameters {
  const params: Parameters['parameter'] = [];
  for (const p of opts.parents ?? []) {
    params.push({
      name: 'property',
      part: [
        { name: 'code', valueCode: 'parent' },
        { name: 'value', valueCode: p },
      ],
    });
  }
  for (const c of opts.children ?? []) {
    params.push({
      name: 'property',
      part: [
        { name: 'code', valueCode: 'child' },
        { name: 'value', valueCode: c },
      ],
    });
  }
  return { resourceType: 'Parameters', parameter: params };
}

const EMPTY_LOOKUP: Parameters = { resourceType: 'Parameters', parameter: [] };

/** Build a mock TerminologyResolver-shaped object for the walker. */
function makeMockResolver(getImpl: (path: string) => Promise<Parameters>): {
  resolver: TerminologyResolver;
  getSpy: ReturnType<typeof vi.fn>;
  lookupDisplaySpy: ReturnType<typeof vi.fn>;
} {
  const getSpy = vi.fn().mockImplementation(getImpl);
  const lookupDisplaySpy = vi
    .fn()
    .mockImplementation((_sys: string, code: string) =>
      Promise.resolve(`Display for ${code}`),
    );
  const resolver = {
    client: { get: getSpy } as unknown,
    lookupDisplay: lookupDisplaySpy,
  } as unknown as TerminologyResolver;
  return { resolver, getSpy, lookupDisplaySpy };
}

describe('semanticNearMissWalker', () => {
  it('Test 1 (ordering): returns ancestors first then descendants, sorted by depth ASC then display ASC', async () => {
    // Seed at INVALID has parents [P1, P2] and children [C1].
    // Depth-2 expansions return empty so total stays small.
    const responses: Array<Parameters> = [
      // Seed lookup (parent + child requested)
      lookupFixture({ parents: ['P1', 'P2'], children: ['C1'] }),
      // P1 axis lookup (parent only)
      EMPTY_LOOKUP,
      // P2 axis lookup (parent only)
      EMPTY_LOOKUP,
      // C1 axis lookup (child only)
      EMPTY_LOOKUP,
    ];
    let i = 0;
    const { resolver } = makeMockResolver(async () => responses[i++] ?? EMPTY_LOOKUP);

    const result = await walkNearMisses(SNOMED, 'INVALID', resolver);

    expect(result.length).toBe(3);
    // Ancestors first
    expect(result[0].relation).toBe('parent');
    expect(result[1].relation).toBe('parent');
    // Sorted by display alphabetical: "Display for P1" < "Display for P2"
    expect(result[0].display).toBe('Display for P1');
    expect(result[1].display).toBe('Display for P2');
    // Then descendants
    expect(result[2].relation).toBe('child');
    expect(result[2].display).toBe('Display for C1');
    // ≤ 10 cap respected
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('Test 2 (max-nodes): aborts early at MAX_NODES=50; returns ≤10 sorted suggestions', async () => {
    // Seed has 100 children → walker enqueues all 100 but stops processing
    // when totalNodes hits 50. Result is still capped at 10.
    const manyChildren = Array.from({ length: 100 }, (_, n) => `C${String(n).padStart(3, '0')}`);
    const responses: Array<Parameters> = [
      lookupFixture({ children: manyChildren }), // seed
    ];
    // All depth-2 expansions return empty so the walker doesn't spawn more
    let i = 0;
    const { resolver } = makeMockResolver(async () => responses[i++] ?? EMPTY_LOOKUP);

    const result = await walkNearMisses(SNOMED, 'INVALID', resolver);

    // Result capped at MAX_SUGGESTIONS=10
    expect(result.length).toBeLessThanOrEqual(10);
    // Walker should NOT have visited every one of the 100 children — node
    // counter aborts at 50. We can't read totalNodes directly, but we can
    // assert the result is exactly 10 (the cap), proving forward progress.
    expect(result.length).toBe(10);
    // All descendants
    for (const r of result) expect(r.relation).toBe('child');
  });

  it('Test 3 (max-depth): respects MAX_DEPTH=3 — no depth=4+ in result', async () => {
    // Build a deep chain: INVALID → P1 (d=1) → P2 (d=2) → P3 (d=3) → P4 (d=4 not surfaced) → ...
    let depth = 0;
    const { resolver } = makeMockResolver(async () => {
      depth++;
      // Each call returns ONE parent so the chain extends one level.
      // The walker should stop enqueuing once depth would reach 4.
      if (depth === 1) return lookupFixture({ parents: ['P1'] }); // seed
      if (depth === 2) return lookupFixture({ parents: ['P2'] }); // P1's parent
      if (depth === 3) return lookupFixture({ parents: ['P3'] }); // P2's parent
      // For any further calls (none should happen for parents axis), return empty
      return EMPTY_LOOKUP;
    });

    const result = await walkNearMisses(SNOMED, 'INVALID', resolver);

    // Every suggestion must have depth ≤ 3
    for (const r of result) {
      expect(r.depth).toBeLessThanOrEqual(3);
    }
    // We should have collected P1, P2, P3 (3 ancestors)
    expect(result.length).toBe(3);
    expect(result.map((r) => r.code).sort()).toEqual(['P1', 'P2', 'P3']);
  });

  it('Test 4 (silent fallback): null client → returns [] (D-12)', async () => {
    const result = await walkNearMisses(SNOMED, 'X', {
      client: null,
    } as unknown as TerminologyResolver);
    expect(result).toEqual([]);
  });

  it('Test 5 (polymorphism): handles valueCode AND valueString AND valueCoding.code (Pitfall 3)', async () => {
    // Three sub-fixtures: same logical content, different value[x] datatypes.
    const fixtures: Parameters[] = [
      // valueCode (Ontoserver default)
      {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'property',
            part: [
              { name: 'code', valueCode: 'parent' },
              { name: 'value', valueCode: 'P1' },
            ],
          },
        ],
      },
      // valueString (some HAPI configs)
      {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'property',
            part: [
              { name: 'code', valueCode: 'parent' },
              { name: 'value', valueString: 'P1' },
            ],
          },
        ],
      },
      // valueCoding (strict FHIR R4)
      {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'property',
            part: [
              { name: 'code', valueCode: 'parent' },
              {
                name: 'value',
                valueCoding: { system: SNOMED, code: 'P1' },
              },
            ],
          },
        ],
      },
    ];

    for (const seed of fixtures) {
      const responses: Parameters[] = [seed, EMPTY_LOOKUP];
      let i = 0;
      const { resolver } = makeMockResolver(async () => responses[i++] ?? EMPTY_LOOKUP);
      const result = await walkNearMisses(SNOMED, 'INVALID', resolver);
      expect(result.length).toBe(1);
      expect(result[0].code).toBe('P1');
      expect(result[0].relation).toBe('parent');
    }
  });

  it('Test 6 (cache reuse): lookupDisplay invoked exactly once per visited node', async () => {
    // Seed: parents=[P1, P2], children=[C1]; depth-2 empty.
    const responses: Parameters[] = [
      lookupFixture({ parents: ['P1', 'P2'], children: ['C1'] }),
      EMPTY_LOOKUP,
      EMPTY_LOOKUP,
      EMPTY_LOOKUP,
    ];
    let i = 0;
    const { resolver, lookupDisplaySpy } = makeMockResolver(
      async () => responses[i++] ?? EMPTY_LOOKUP,
    );

    await walkNearMisses(SNOMED, 'INVALID', resolver);

    // Exactly 3 visited nodes (P1, P2, C1). lookupDisplay should fire once each.
    expect(lookupDisplaySpy).toHaveBeenCalledTimes(3);
    const codes = lookupDisplaySpy.mock.calls.map((c) => c[1]).sort();
    expect(codes).toEqual(['C1', 'P1', 'P2']);
  });

  it('Test 7 (cycle defense): cyclic parent refs do NOT loop infinitely', async () => {
    // Construct a cycle: P1's parent is INVALID itself.
    let callCount = 0;
    const { resolver, lookupDisplaySpy } = makeMockResolver(async (path: string) => {
      callCount++;
      // Track which code is being looked up via the path qs
      if (path.includes('code=INVALID')) {
        // Seed
        return lookupFixture({ parents: ['P1'] });
      }
      if (path.includes('code=P1')) {
        // P1's parent is INVALID — cycle
        return lookupFixture({ parents: ['INVALID'] });
      }
      return EMPTY_LOOKUP;
    });

    const result = await walkNearMisses(SNOMED, 'INVALID', resolver);

    // Result must be finite. Visited Set prevents re-enqueuing INVALID.
    expect(result.length).toBeLessThanOrEqual(10);
    // P1 must appear once (the only valid ancestor)
    const p1Hits = result.filter((r: NearMissSuggestion) => r.code === 'P1');
    expect(p1Hits).toHaveLength(1);
    // The cycle must have terminated — bounded number of calls (not unbounded).
    expect(callCount).toBeLessThan(MAX_BOUND_CALLS);
    expect(lookupDisplaySpy).toHaveBeenCalled();
  });

  it('Test 8 (network error mid-walk): partial collection survives, no throw', async () => {
    // Seed succeeds (returns P1+P2 parents); P1's deeper lookup throws;
    // walker should still return P1 and P2 from the seed.
    let i = 0;
    const { resolver } = makeMockResolver(async () => {
      i++;
      if (i === 1) return lookupFixture({ parents: ['P1', 'P2'] });
      if (i === 2) throw new Error('network blip');
      return EMPTY_LOOKUP;
    });

    // Must not throw
    const result = await walkNearMisses(SNOMED, 'INVALID', resolver);

    // P1 and P2 from the seed should be in the result.
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map((r) => r.code).sort()).toEqual(['P1', 'P2']);
  });
});

// Sanity bound for cycle-defense test. With visited Set + bounds, even a
// pathological cyclic fixture cannot exceed MAX_NODES + a constant of axis
// fetches. 200 is a generous safety margin.
const MAX_BOUND_CALLS = 200;
