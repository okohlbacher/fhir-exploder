/**
 * Tests for the Phase 31 UX-01 three-tier cascading validator.
 *
 * The suite mocks remoteValidator + structuralValidator so behavior is
 * exercised deterministically without real network or profile walking.
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import type { Resource } from '@medplum/fhirtypes';
import {
  validateWithCascade,
  probeKey,
  clearProbeCache,
  resetProbeForType,
  detectValidatorVariant,
  type ActiveStrategy,
  type CascadeOptions,
  type ProbeKey,
} from '../cascadingValidator';
import { phiAckKey } from '../phiGate';

vi.mock('../remoteValidator', () => ({
  createRemoteBackend: vi.fn(),
}));
vi.mock('../structuralValidator', () => ({
  validateStructural: vi.fn().mockReturnValue([]),
}));

// Pull the mocked factories so individual tests can tune their behavior.
import { createRemoteBackend } from '../remoteValidator';
import { validateStructural } from '../structuralValidator';

const SERVER_URL = 'http://s/';
const EXT_URL = 'https://hapi.fhir.org/baseR4';

function buildResource(): Resource {
  return { resourceType: 'Patient', id: 'p1' } as Resource;
}

function buildOptions(overrides: Partial<CascadeOptions> = {}): CascadeOptions {
  return {
    serverUrl: SERVER_URL,
    resourceType: 'Patient',
    externalValidator: {
      url: EXT_URL,
      enabled: true,
      timeoutMs: 15000,
    },
    probe: new Map<ProbeKey, ActiveStrategy>(),
    abort: new AbortController(),
    profile: null,
    settings: null,
    ...overrides,
  };
}

describe('cascadingValidator', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    (createRemoteBackend as unknown as Mock).mockReset();
    (validateStructural as unknown as Mock).mockReset().mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1: external happy path — normalized issue + probe cache stores "external"', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              expression: ['Patient.name'],
              code: 'required',
              diagnostics: 'missing name',
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const opts = buildOptions();
    const result = await validateWithCascade(buildResource(), opts);
    expect(result).toEqual([
      {
        resourceId: 'Patient/p1',
        resourceType: 'Patient',
        field: 'Patient.name',
        description: 'required -- missing name',
        severity: 'error',
      },
    ]);
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('external');
  });

  it('Test 2: PHI NOT acknowledged — external skipped, server tier runs, external URL never fetched', async () => {
    // localStorage empty → gate returns false
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const opts = buildOptions({
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
    });
    await validateWithCascade(buildResource(), opts);
    // External fetch never fired — server tier mocked at the backend level.
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('hapi.fhir.org'),
      expect.anything(),
    );
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('server');
  });

  it('Test 3: external timeout demotes to server and notifies with timeout kind', async () => {
    /**
     * Vitest's `advanceTimersByTime` advances fake timers synchronously but
     * does NOT flush the microtask queue — the awaited cascade promise would
     * hang waiting on its own .then() callbacks. `advanceTimersByTimeAsync`
     * flushes microtasks after each timer tick (W-1 revision).
     */
    vi.useFakeTimers();
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_, reject) => {
          // Hook into the passed signal so the fetch rejects with AbortError
          // when the timeout controller fires — this matches native fetch.
          const signal = (init as RequestInit | undefined)?.signal;
          signal?.addEventListener('abort', () => {
            const e = new DOMException('aborted', 'AbortError');
            reject(e);
          });
        }),
    );
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const notify = vi.fn();
    const opts = buildOptions({
      externalValidator: { url: EXT_URL, enabled: true, timeoutMs: 100 },
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
      notify,
    });
    const cascadePromise = validateWithCascade(buildResource(), opts);
    await vi.advanceTimersByTimeAsync(150);
    await cascadePromise;
    expect(notify).toHaveBeenCalledWith('timeout', {
      from: 'external',
      to: 'server',
      timeoutMs: 100,
    });
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('server');
  });

  it('Test 4 (D-19): TypeError → CORS heuristic — distinct from timeout', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const notify = vi.fn();
    const opts = buildOptions({
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
      notify,
    });
    await validateWithCascade(buildResource(), opts);
    expect(opts.abort.signal.aborted).toBe(false);
    expect(notify).toHaveBeenCalledWith('cors', {
      from: 'external',
      to: 'server',
    });
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('server');
  });

  it('Test 5: probe cache hit — external skipped entirely', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const opts = buildOptions({
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
    });
    opts.probe.set(probeKey(SERVER_URL, EXT_URL, 'Patient'), 'server');
    await validateWithCascade(buildResource(), opts);
    // External fetch never attempted
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('hapi.fhir.org'),
      expect.anything(),
    );
  });

  it('Test 6: both external + server fail → local fallback, probe records "local"', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([
        { severity: 'error', code: 'exception', diagnostics: 'fail' },
      ]),
    });
    (validateStructural as unknown as Mock).mockReturnValue([
      { severity: 'error', code: 'required', expression: ['Patient.name'], diagnostics: 'missing' },
    ]);
    const opts = buildOptions({
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
    });
    const result = await validateWithCascade(buildResource(), opts);
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('local');
    expect(result.length).toBeGreaterThan(0);
  });

  it('Test 7: caller-abort mid-fetch bubbles out and marks the signal aborted', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    const opts = buildOptions();
    vi.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_, reject) => {
          const signal = (init as RequestInit | undefined)?.signal;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );
    const cascadePromise = validateWithCascade(buildResource(), opts);
    opts.abort.abort();
    await expect(cascadePromise).rejects.toThrow();
    expect(opts.abort.signal.aborted).toBe(true);
  });

  it('Test 8: external issues pass through normalizer with resourceRef', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          resourceType: 'OperationOutcome',
          issue: [
            { severity: 'error', expression: ['Patient.name'], code: 'required' },
            { severity: 'warning', expression: ['Patient.gender'], code: 'value' },
          ],
        }),
        { status: 200 },
      ),
    );
    const opts = buildOptions();
    const result = await validateWithCascade(buildResource(), opts);
    expect(result).toHaveLength(2);
    expect(result[0].resourceId).toBe('Patient/p1');
    expect(result[1].resourceId).toBe('Patient/p1');
    expect(result[0].resourceType).toBe('Patient');
  });

  it('Test 9 (D-17): clearProbeCache wipes all entries (settings-change reset contract)', () => {
    const probe = new Map<ProbeKey, ActiveStrategy>();
    probe.set(probeKey(SERVER_URL, EXT_URL, 'Patient'), 'external');
    probe.set(probeKey(SERVER_URL, EXT_URL, 'Observation'), 'server');
    clearProbeCache(probe);
    expect(probe.size).toBe(0);
  });

  it('Test 10 (D-17): resetProbeForType deletes only the matching key (per-type reset)', () => {
    const probe = new Map<ProbeKey, ActiveStrategy>();
    probe.set(probeKey(SERVER_URL, EXT_URL, 'Patient'), 'external');
    probe.set(probeKey(SERVER_URL, EXT_URL, 'Observation'), 'server');
    probe.set(probeKey(SERVER_URL, EXT_URL, 'Condition'), 'local');
    resetProbeForType(probe, SERVER_URL, EXT_URL, 'Patient');
    expect(probe.has(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe(false);
    expect(probe.has(probeKey(SERVER_URL, EXT_URL, 'Observation'))).toBe(true);
    expect(probe.has(probeKey(SERVER_URL, EXT_URL, 'Condition'))).toBe(true);
  });

  it('Test 11 (D-18): detectValidatorVariant — explicit label wins', () => {
    expect(detectValidatorVariant('https://hapi.fhir.org/baseR4', 'MyCustom')).toBe('MyCustom');
  });

  it('Test 12 (D-18): detectValidatorVariant — URL-pattern heuristic', () => {
    expect(detectValidatorVariant('https://hapi.fhir.org/baseR4')).toBe('HAPI');
    expect(detectValidatorVariant('https://foo.firely.com/fhir')).toBe('Firely');
    expect(detectValidatorVariant('https://server.example/ig-publisher/validate')).toBe(
      'IG-Publisher',
    );
    expect(detectValidatorVariant('https://unknown.example/fhir')).toBeNull();
  });

  it('Test 13 (W-3 — KNOWN LIMITATION lock): validator.fhir.org is mis-labelled HAPI', () => {
    // D-18 mis-identifies validator.fhir.org as HAPI — known limitation,
    // deferred to v1.6+ (Wrapper URL-shape). This test locks the behavior
    // so the next maintainer has an obvious single place to update when
    // Wrapper support lands.
    expect(detectValidatorVariant('https://validator.fhir.org/validator')).toBe('HAPI');
  });
});
