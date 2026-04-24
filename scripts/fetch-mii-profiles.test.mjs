import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock fhir-package-loader at the module level per RESEARCH K-10. We inject
// controlled fixtures so the test never touches the network.
const mockLoader = {
  loadPackage: vi.fn(),
  findResourceJSONs: vi.fn(),
};

vi.mock('fhir-package-loader', () => ({
  defaultPackageLoader: vi.fn(async () => mockLoader),
  LoadStatus: {
    LOADED: 'LOADED',
    NOT_LOADED: 'NOT_LOADED',
    FAILED: 'FAILED',
  },
}));

// Mock fs.writeFile to capture what would be written without touching disk.
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual('node:fs/promises');
  return {
    ...actual,
    default: {
      ...actual.default,
      writeFile: vi.fn(async () => undefined),
      mkdir: vi.fn(async () => undefined),
    },
    writeFile: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
  };
});

describe('scripts/fetch-mii-profiles.mjs — trim + filename + pre-GA + failure contract', () => {
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockLoader.loadPackage.mockReset();
    mockLoader.findResourceJSONs.mockReset();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.resetModules();
  });

  // To allow re-importing the script with fresh mock state each test, we
  // must use a dynamic import inside each it() after wiring mock returns.

  it('trim() preserves only { url, name, type, snapshot.element[{path, min, max, mustSupport, sliceName, type, required-binding}] }', async () => {
    const fatSD = {
      resourceType: 'StructureDefinition',
      url: 'http://example.com/StructureDefinition/foo',
      name: 'Foo',
      type: 'Observation',
      description: 'SHOULD BE DROPPED',
      purpose: 'SHOULD BE DROPPED',
      snapshot: {
        element: [
          {
            path: 'Observation.code',
            min: 1,
            max: '1',
            mustSupport: true,
            sliceName: 'code-slice',
            type: [{ code: 'CodeableConcept' }],
            definition: 'SHOULD BE DROPPED',
            short: 'SHOULD BE DROPPED',
            example: [{ label: 'ex', valueString: 'SHOULD BE DROPPED' }],
            mapping: [{ identity: 'SHOULD BE DROPPED' }],
            binding: { strength: 'required', valueSet: 'http://vs' },
          },
          {
            path: 'Observation.category',
            min: 0,
            max: '*',
            mustSupport: false,
            binding: { strength: 'extensible', valueSet: 'http://vs-drop' },
          },
        ],
      },
    };

    // Mock: returns ONE synthetic SD for one package, then empty for others.
    mockLoader.loadPackage.mockResolvedValue('LOADED');
    mockLoader.findResourceJSONs.mockReturnValue([fatSD]);

    // Dynamic import + run the script.
    await import('./fetch-mii-profiles.mjs');

    // Wait a tick for async main() to resolve.
    await new Promise((r) => setTimeout(r, 50));

    // Assert fs.writeFile was called with trimmed content.
    const fsMod = await import('node:fs/promises');
    const writeCalls = fsMod.writeFile.mock.calls;
    expect(writeCalls.length).toBeGreaterThanOrEqual(1);

    // First StructureDefinition write should contain trimmed shape only.
    const firstWrite = writeCalls.find((c) => c[0].toString().endsWith('.json'));
    expect(firstWrite).toBeDefined();
    const written = JSON.parse(firstWrite[1]);

    expect(written.url).toBe('http://example.com/StructureDefinition/foo');
    expect(written.name).toBe('Foo');
    expect(written.type).toBe('Observation');
    expect(written.description).toBeUndefined(); // dropped
    expect(written.purpose).toBeUndefined(); // dropped

    const el = written.snapshot.element;
    expect(el).toHaveLength(2);
    expect(el[0].definition).toBeUndefined(); // dropped
    expect(el[0].short).toBeUndefined(); // dropped
    expect(el[0].example).toBeUndefined(); // dropped
    expect(el[0].mapping).toBeUndefined(); // dropped
    expect(el[0].binding).toEqual({ strength: 'required', valueSet: 'http://vs' }); // preserved (required)
    expect(el[0].sliceName).toBe('code-slice'); // preserved
    expect(el[0].type).toEqual([{ code: 'CodeableConcept' }]); // preserved
    expect(el[1].binding).toBeUndefined(); // dropped (extensible, not required)
  });

  it('filename convention is `<type>-<slug>.json` (slug = lowercase-kebab of sd.name)', async () => {
    mockLoader.loadPackage.mockResolvedValue('LOADED');
    mockLoader.findResourceJSONs.mockReturnValue([
      {
        resourceType: 'StructureDefinition',
        url: 'http://ex/Foo',
        name: 'MIIPROnkoDiagnose',
        type: 'Condition',
        snapshot: { element: [] },
      },
    ]);

    await import('./fetch-mii-profiles.mjs');
    await new Promise((r) => setTimeout(r, 50));

    const fsMod = await import('node:fs/promises');
    const firstWrite = fsMod.writeFile.mock.calls.find((c) =>
      String(c[0]).endsWith('.json'),
    );
    expect(firstWrite).toBeDefined();
    const writtenPath = String(firstWrite[0]);
    expect(writtenPath).toMatch(/Condition-miipronkodiagnose\.json$/);
  });

  it('pre-GA version strings emit console.info("bundling pre-GA version ...")', async () => {
    // Kardiologie (alpha) and Symptom (ballot) are the pre-GA packages.
    mockLoader.loadPackage.mockResolvedValue('LOADED');
    mockLoader.findResourceJSONs.mockReturnValue([]);

    await import('./fetch-mii-profiles.mjs');
    await new Promise((r) => setTimeout(r, 50));

    const infoMessages = consoleInfoSpy.mock.calls.flat().join(' ');
    expect(infoMessages).toMatch(/bundling pre-GA version.*kardiologie.*alpha/);
    expect(infoMessages).toMatch(/bundling pre-GA version.*symptom.*ballot/);
  });

  it('loader.loadPackage FAILED → console.warn + continue (does NOT throw)', async () => {
    mockLoader.loadPackage.mockResolvedValue('FAILED');
    mockLoader.findResourceJSONs.mockReturnValue([]);

    let thrown = null;
    try {
      await import('./fetch-mii-profiles.mjs');
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeNull();
    const warnMessages = consoleWarnSpy.mock.calls.flat().join(' ');
    expect(warnMessages).toMatch(/fetch failed|status FAILED/);
  });

  it('script exits 0 on unexpected global throw (D-14 warn-and-continue belt-and-braces)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    mockLoader.loadPackage.mockRejectedValue(new Error('Catastrophic network failure'));
    mockLoader.findResourceJSONs.mockReturnValue([]);

    try {
      await import('./fetch-mii-profiles.mjs');
      await new Promise((r) => setTimeout(r, 50));
    } catch (_) { /* ignore — we want the mocked exit path */ }

    // Script uses .catch(err => { console.warn(...); process.exit(0); })
    // on top-level main(). On mocked exit, the test should see exit code 0
    // was called or no non-zero was thrown.
    const exitCodes = exitSpy.mock.calls.map((c) => c[0]);
    for (const code of exitCodes) {
      expect(code).toBe(0);
    }
    exitSpy.mockRestore();
  });
});
