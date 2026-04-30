/**
 * Phase 43-01 Task 2 — settings.yaml parser narrowing for the
 * `validation.externalValidator.auth` + `validation.externalValidator.semanticNearMisses`
 * fields.
 *
 * Decisions enforced (43-CONTEXT.md):
 *   D-01 — Basic-auth credentials are accepted as plaintext in YAML (intentional;
 *          same trust boundary as the FHIR server URL).
 *   D-02 — Bearer tokens NEVER persist to YAML on disk. The parser MUST silently
 *          drop `password` / `token` / `credentials` fields when `auth.type === 'bearer'`.
 *   D-08 — `semanticNearMisses` is a boolean; default false.
 *   T-43-06 — `validator.bearerToken.v1` MUST NOT appear in types.ts / settings.ts /
 *             public/settings.yaml; the parser is the gate that enforces it.
 *
 * The tests use `js-yaml.load` against inline YAML strings (mirrors the
 * existing terminology-default tests in src/__tests__/settings.test.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadSettings } from '../settings';

describe('Phase 43 — externalValidator.auth schema narrowing', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Each test starts with a clean localStorage so the YAML branch is exercised
    // (loadSettings prefers fhirExplorer.settings.v1 from localStorage when present).
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    globalThis.fetch = vi.fn() as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockYaml(yaml: string) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => yaml,
    } as Response);
  }

  it('Test 1 — accepts auth: { type: basic, username, password }', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
    auth:
      type: basic
      username: alice
      password: secret
`);
    const result = await loadSettings();
    expect(result.settings.validation?.externalValidator?.auth).toEqual({
      type: 'basic',
      username: 'alice',
      password: 'secret',
    });
  });

  it('Test 2 — accepts auth: { type: bearer } with NO password/token field', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
    auth:
      type: bearer
`);
    const result = await loadSettings();
    expect(result.settings.validation?.externalValidator?.auth).toEqual({
      type: 'bearer',
    });
    // Belt-and-braces: no leaked field
    expect(
      (result.settings.validation?.externalValidator?.auth as unknown as Record<string, unknown>)
        ?.password,
    ).toBeUndefined();
  });

  it('Test 3 — REJECTS auth: { type: bearer, token: leaked } — token field silently dropped', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
    auth:
      type: bearer
      token: "leaked-token-MUST-NOT-PERSIST"
      credentials: "also-leaked"
      password: "also-also-leaked"
`);
    const result = await loadSettings();
    const auth = result.settings.validation?.externalValidator?.auth as unknown as
      | Record<string, unknown>
      | undefined;
    expect(auth).toBeDefined();
    expect(auth?.type).toBe('bearer');
    // Critical T-43-06 check: NONE of the credential fields survive narrowing.
    expect(auth?.token).toBeUndefined();
    expect(auth?.credentials).toBeUndefined();
    expect(auth?.password).toBeUndefined();
    // And the loaded JSON shape MUST NOT contain the literal leaked token anywhere.
    expect(JSON.stringify(result.settings)).not.toContain('leaked-token-MUST-NOT-PERSIST');
  });

  it('Test 4 — REJECTS auth: { type: basic } with no username/password — auth undefined', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
    auth:
      type: basic
`);
    const result = await loadSettings();
    expect(result.settings.validation?.externalValidator?.auth).toBeUndefined();
  });

  it('Test 5 — REJECTS unknown auth.type (e.g. oauth2) — auth undefined', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
    auth:
      type: oauth2
      client_id: foo
`);
    const result = await loadSettings();
    expect(result.settings.validation?.externalValidator?.auth).toBeUndefined();
  });

  it('Test 6a — semanticNearMisses: true parses to boolean true', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
    semanticNearMisses: true
`);
    const result = await loadSettings();
    expect(result.settings.validation?.externalValidator?.semanticNearMisses).toBe(true);
  });

  it('Test 6b — semanticNearMisses absent parses to false (default-off per D-11)', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
`);
    const result = await loadSettings();
    // Field is omitted from the runtime object when false (mirrors how the
    // narrowing only attaches `semanticNearMisses: true` when YAML opts in).
    expect(result.settings.validation?.externalValidator?.semanticNearMisses).toBeFalsy();
  });

  it('Test 6c — semanticNearMisses: false parses falsy', async () => {
    mockYaml(`fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
validation:
  externalValidator:
    url: "https://hapi.example.org/baseR4"
    enabled: true
    semanticNearMisses: false
`);
    const result = await loadSettings();
    expect(result.settings.validation?.externalValidator?.semanticNearMisses).toBeFalsy();
  });
});
