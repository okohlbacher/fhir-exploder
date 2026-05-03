import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULTS, loadSettings } from '../config/settings';

// ---------------------------------------------------------------------------
// loadSettings — fetch-path tests
// ---------------------------------------------------------------------------
// loadSettings checks localStorage first; we clear it before each test so the
// function falls through to the fetch() path that the mocks control.
// ---------------------------------------------------------------------------

describe('loadSettings', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as typeof fetch;
    // Ensure localStorage is clear so the fetch path is exercised.
    window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads and parses settings.yaml from /settings.yaml', async () => {
    const yaml = `fhir:\n  serverUrl: "http://my-server:8080/fhir"\n  auth:\n    mode: open\n`;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => yaml,
    } as Response);
    const result = await loadSettings();
    expect(result.usingDefaults).toBe(false);
    expect(result.settings.fhir.serverUrl).toBe('http://my-server:8080/fhir');
  });

  it('returns DEFAULTS with usingDefaults=true when settings.yaml is 404', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    } as Response);
    const result = await loadSettings();
    expect(result.usingDefaults).toBe(true);
    expect(result.settings).toEqual(DEFAULTS);
  });

  it('returns DEFAULTS with usingDefaults=true when YAML is malformed', async () => {
    // js-yaml.load of a bare number returns a number (not an object), so
    // the `typeof parsed !== 'object'` guard kicks in → DEFAULTS fallback.
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => '42',
    } as Response);
    const result = await loadSettings();
    expect(result.usingDefaults).toBe(true);
    expect(result.settings).toEqual(DEFAULTS);
  });

  it('deep-merges partial settings with DEFAULTS', async () => {
    const yaml = `fhir:\n  serverUrl: "http://custom-server:9090/fhir"\n`;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => yaml,
    } as Response);
    const result = await loadSettings();
    expect(result.settings.fhir.serverUrl).toBe('http://custom-server:9090/fhir');
    // Unspecified defaults are preserved
    expect(result.settings.fhir.auth.mode).toBe('open');
    expect(result.settings.terminology?.serverUrl).toBe(DEFAULTS.terminology?.serverUrl);
  });
});

// ---------------------------------------------------------------------------
// terminology defaults
// ---------------------------------------------------------------------------

describe('terminology defaults', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('DEFAULTS.terminology.serverUrl points at the public CSIRO Ontoserver R4 sandbox', () => {
    expect(DEFAULTS.terminology?.serverUrl).toBe('https://r4.ontoserver.csiro.au/fhir');
  });

  it('preserves terminology.serverUrl from settings.yaml when supplied', async () => {
    const yaml = `fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
terminology:
  serverUrl: "https://example.org/fhir"
`;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => yaml,
    } as Response);

    const result = await loadSettings();
    expect(result.settings.terminology?.serverUrl).toBe('https://example.org/fhir');
  });

  it('falls back to the Ontoserver default when the YAML omits the terminology block', async () => {
    const yaml = `fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
`;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => yaml,
    } as Response);

    const result = await loadSettings();
    expect(result.settings.terminology?.serverUrl).toBe('https://r4.ontoserver.csiro.au/fhir');
  });

  it('falls back to the Ontoserver default when terminology.serverUrl has the wrong type', async () => {
    const yaml = `fhir:
  serverUrl: "http://localhost:8080/fhir"
  auth:
    mode: open
terminology:
  serverUrl: 42
`;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => yaml,
    } as Response);

    const result = await loadSettings();
    expect(result.settings.terminology?.serverUrl).toBe('https://r4.ontoserver.csiro.au/fhir');
  });
});
