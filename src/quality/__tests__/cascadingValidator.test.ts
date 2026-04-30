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
        // Phase 43 VAL-07 (Plan 43-02 Task 2): raw FHIR issue.code preserved.
        code: 'required',
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

  // ---------------------------------------------------------------------------
  // Phase 43 VAL-06 (Plan 43-01 Task 3) — Authorization header injection,
  // auth-missing / auth-failed notify events, PHI-gate ordering invariant.
  //
  // Decisions enforced:
  //   D-02: bearer token loaded from localStorage 'validator.bearerToken.v1'
  //         per call; absent → demote with notify('auth-missing').
  //   D-04: header build runs AFTER PHI gate, BEFORE AbortController alloc.
  //   D-05: header formats — `Basic ${btoa(u:p)}` and `Bearer ${token}`.
  //   D-13: 401/403 → demote with notify('auth-failed').
  //   D-21: notify payloads carry `{ from, to, authType?, status? }`; NO
  //         credential strings.
  //   T-43-05: bearer-token reader is NOT invoked when PHI is unacknowledged
  //            (the PHI gate runs first and short-circuits).
  // ---------------------------------------------------------------------------

  it('Test 16 (auth basic): outgoing fetch carries Authorization: Basic <b64>', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }),
        { status: 200 },
      ),
    );
    const opts = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'basic', username: 'alice', password: 'secret' },
      } as CascadeOptions['externalValidator'],
    });
    await validateWithCascade(buildResource(), opts);
    expect(fetchSpy).toHaveBeenCalled();
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${btoa('alice:secret')}`);
  });

  it('Test 17 (auth bearer): localStorage token → Authorization: Bearer <token>', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    window.localStorage.setItem('validator.bearerToken.v1', 'tok-abc-123');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }),
        { status: 200 },
      ),
    );
    const opts = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'bearer' },
      } as CascadeOptions['externalValidator'],
    });
    await validateWithCascade(buildResource(), opts);
    expect(fetchSpy).toHaveBeenCalled();
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-abc-123');
  });

  it('Test 18 (auth-missing): bearer + empty localStorage → demote with notify(auth-missing)', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    // NO token in localStorage
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const notify = vi.fn();
    const opts = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'bearer' },
      } as CascadeOptions['externalValidator'],
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
      notify,
    });
    await validateWithCascade(buildResource(), opts);
    // External fetch never fired (bearer token missing)
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('hapi.fhir.org'),
      expect.anything(),
    );
    expect(notify).toHaveBeenCalledWith(
      'auth-missing',
      expect.objectContaining({ from: 'external', to: 'server', authType: 'bearer' }),
    );
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('server');
  });

  it('Test 19 (auth-failed 401): basic auth + 401 → notify(auth-failed) + demote', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const notify = vi.fn();
    const opts = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'basic', username: 'alice', password: 'secret' },
      } as CascadeOptions['externalValidator'],
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
      notify,
    });
    await validateWithCascade(buildResource(), opts);
    expect(notify).toHaveBeenCalledWith('auth-failed', {
      from: 'external',
      to: 'server',
      authType: 'basic',
      status: 401,
    });
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('server');
  });

  it('Test 19b (auth-failed 403): same as 19 but status 403', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 403 }));
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const notify = vi.fn();
    const opts = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'basic', username: 'alice', password: 'secret' },
      } as CascadeOptions['externalValidator'],
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
      notify,
    });
    await validateWithCascade(buildResource(), opts);
    expect(notify).toHaveBeenCalledWith('auth-failed', {
      from: 'external',
      to: 'server',
      authType: 'basic',
      status: 403,
    });
    expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('server');
  });

  it('Test 20 (T-43-02 no-leak): credentials NEVER appear in any notify payload', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    window.localStorage.setItem('validator.bearerToken.v1', 'tok-abc-123');
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    const notify = vi.fn();
    const opts = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'basic', username: 'alice', password: 'secret' },
      } as CascadeOptions['externalValidator'],
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
      notify,
    });
    await validateWithCascade(buildResource(), opts);
    const dump = JSON.stringify(notify.mock.calls);
    expect(dump).not.toContain('secret');
    expect(dump).not.toContain('alice');
    expect(dump).not.toContain('tok-abc-123');
    // Also assert no base64 of the credentials (Basic header b64 of alice:secret)
    expect(dump).not.toContain(btoa('alice:secret'));
  });

  it('Test 21 (D-05 fresh encode): two consecutive validate calls re-encode basic credentials', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }),
        { status: 200 },
      ),
    );
    // Spy on btoa via the global to count invocations.
    const btoaSpy = vi.spyOn(globalThis, 'btoa');
    btoaSpy.mockClear();
    const opts1 = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'basic', username: 'alice', password: 'secret' },
      } as CascadeOptions['externalValidator'],
    });
    await validateWithCascade(buildResource(), opts1);
    const opts2 = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'basic', username: 'alice', password: 'secret' },
      } as CascadeOptions['externalValidator'],
    });
    await validateWithCascade(buildResource(), opts2);
    // The cascade may call btoa for other reasons too (URL encoding etc.) —
    // assert it was called at least twice WITH the credential string.
    const credCalls = btoaSpy.mock.calls.filter(([s]) => s === 'alice:secret');
    expect(credCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('Test 23 (T-43-04 probe-rotate): probe cache invalidates when bearer token rotates', async () => {
    window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
    window.localStorage.setItem('validator.bearerToken.v1', 'token-A');
    // Use mockImplementation so each fetch call returns a FRESH Response
    // (Response.json() consumes the body; reusing the same instance fails
    // the second call). Capture the Authorization header per call so we
    // can prove the rotated token was actually sent on the second run.
    const authHeadersSeen: string[] = [];
    vi.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      const headers = ((init as RequestInit | undefined)?.headers ?? {}) as Record<
        string,
        string
      >;
      if (headers.Authorization) authHeadersSeen.push(headers.Authorization);
      return Promise.resolve(
        new Response(
          JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }),
          { status: 200 },
        ),
      );
    });
    const probe = new Map<ProbeKey, ActiveStrategy>();
    const opts1 = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'bearer' },
      } as CascadeOptions['externalValidator'],
      probe,
    });
    await validateWithCascade(buildResource(), opts1);
    const pk = probeKey(SERVER_URL, EXT_URL, 'Patient');
    expect(probe.get(pk)).toBe('external');
    expect(authHeadersSeen[0]).toBe('Bearer token-A');

    // Rotate the token (the user opened the modal and saved a new token).
    window.localStorage.setItem('validator.bearerToken.v1', 'token-B-rotated');
    // The caller (useConformanceRun) wipes the probe cache when the bearer
    // length signature changes — simulate that contract here.
    clearProbeCache(probe);
    expect(probe.has(pk)).toBe(false);

    const opts2 = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'bearer' },
      } as CascadeOptions['externalValidator'],
      probe,
    });
    await validateWithCascade(buildResource(), opts2);
    expect(probe.get(pk)).toBe('external');
    // The rotated token reached the validator on run 2.
    expect(authHeadersSeen[1]).toBe('Bearer token-B-rotated');
  });

  it('Test 22 (T-43-05 ordering): bearer + PHI NOT acknowledged → localStorage NEVER read for bearer token', async () => {
    // PHI ack key absent → gate fails. Token reader MUST NOT run.
    const tokenReadSpy = vi.spyOn(Storage.prototype, 'getItem');
    tokenReadSpy.mockClear();
    (createRemoteBackend as unknown as Mock).mockReturnValue({
      kind: 'remote',
      validate: vi.fn().mockResolvedValue([]),
    });
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));
    const opts = buildOptions({
      externalValidator: {
        url: EXT_URL,
        enabled: true,
        timeoutMs: 15000,
        auth: { type: 'bearer' },
      } as CascadeOptions['externalValidator'],
      settings: {
        fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
        validation: { validatorUrl: 'http://server-tier/' },
      } as CascadeOptions['settings'] extends infer T ? T : never,
    });
    await validateWithCascade(buildResource(), opts);
    const bearerReads = tokenReadSpy.mock.calls.filter(
      ([key]) => key === 'validator.bearerToken.v1',
    );
    expect(bearerReads).toHaveLength(0);
  });
});
