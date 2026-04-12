import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULTS, loadSettings } from '../config/settings';

describe('loadSettings', () => {
  it.todo('loads and parses settings.yaml from /settings.yaml');
  it.todo('returns DEFAULTS with usingDefaults=true when settings.yaml is 404');
  it.todo('returns DEFAULTS with usingDefaults=true when YAML is malformed');
  it.todo('deep-merges partial settings with DEFAULTS');
});

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
