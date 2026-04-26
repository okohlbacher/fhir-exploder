/**
 * Phase 36 / MII-EXT-12 — Wave 0 contract test for the post-refactor
 * async API of getExtensionProfileForUrl.
 *
 * INTENT: This file is committed in MIXED state during Wave 0 —
 *   - Tests 1-4 PASS BY ACCIDENT against the current sync API (sync `await`
 *     is a no-op, sync REGISTRY returns the same object reference on
 *     repeat calls). Plan 02 makes them MEANINGFUL against real async + cache.
 *   - Test 5 is RED in Wave 0 (the sync API does not invoke `EXTENSION_REGISTRY[url]`
 *     as a thunk; the mocked `vi.fn()` is never called). Plan 02 makes it
 *     GREEN by switching `EXTENSION_REGISTRY[url]` to a thunk that
 *     `getExtensionProfileForUrl` invokes — and the `extensionProfileInFlight`
 *     Map ensures it's invoked EXACTLY ONCE across two concurrent calls.
 *
 * Pattern reference: RESEARCH.md §Code Examples Example 3 (tests 1-4);
 * canonical `vi.mock` pattern — `src/__tests__/completeness-drilldown.test.tsx:80-93`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the extension REGISTRY so test 5 can spy on the loader thunk.
// Post-Plan-02 shape: REGISTRY[url] = () => Promise<{ default: SD }>.
// We declare a single mocked URL and a vi.fn loader that resolves to a
// minimal-but-valid StructureDefinition shape.
const MOCK_EXT_URL = 'https://example.org/fhir/StructureDefinition/mock-ext';
const mockSd = {
  resourceType: 'StructureDefinition',
  url: MOCK_EXT_URL,
  name: 'MockExt',
  type: 'Extension',
  snapshot: { element: [] },
} as const;
const loaderSpy = vi.fn().mockResolvedValue({ default: mockSd });

vi.mock('../extensions/index', () => ({
  REGISTRY: { [MOCK_EXT_URL]: loaderSpy },
}));

// Import AFTER vi.mock so the module under test sees the mocked REGISTRY.
// (Vitest hoists vi.mock above imports, but importing after the mock
// declaration keeps the dependency order obvious to readers.)
const { BUNDLED_EXTENSION_PROFILE_URLS, getExtensionProfileForUrl } =
  await import('../index');

describe('getExtensionProfileForUrl (Phase 36 lazy-load)', () => {
  beforeEach(() => {
    loaderSpy.mockClear();
  });

  it('returns null for an unknown URL', async () => {
    const result = await getExtensionProfileForUrl('https://not-bundled.example/');
    expect(result).toBeNull();
  });

  it('returns a StructureDefinition with matching .url for a bundled URL', async () => {
    const url = BUNDLED_EXTENSION_PROFILE_URLS[0];
    const sd = await getExtensionProfileForUrl(url);
    expect(sd).not.toBeNull();
    expect(sd!.url).toBe(url);
    expect(sd!.resourceType).toBe('StructureDefinition');
  });

  it('memoizes — second call returns the same instance', async () => {
    const url = BUNDLED_EXTENSION_PROFILE_URLS[0];
    const a = await getExtensionProfileForUrl(url);
    const b = await getExtensionProfileForUrl(url);
    expect(a).toBe(b);  // referential equality proves cache hit
  });

  it('deduplicates concurrent calls for the same URL', async () => {
    const url = BUNDLED_EXTENSION_PROFILE_URLS[0];
    const [a, b] = await Promise.all([
      getExtensionProfileForUrl(url),
      getExtensionProfileForUrl(url),
    ]);
    expect(a).toBe(b);
  });

  it('calls the underlying loader exactly once for concurrent invocations (StrictMode safety)', async () => {
    // This is the CONTRACT for the extensionProfileInFlight Map (Plan 02 Task 3).
    // Without dedup, two concurrent calls would each invoke loaderSpy → 2 calls.
    // With dedup, the second call awaits the first's in-flight Promise → 1 call.
    // Asserting referential equality alone (tests 3 & 4) cannot catch a regression
    // here, because both callers would still receive the same resolved value
    // from EITHER (a) the in-flight Promise OR (b) two independent Promises that
    // happen to resolve to the same module record.
    //
    // Fresh-module isolation: tests 2/3/4 above warmed the module-scoped
    // extensionProfileCache for MOCK_EXT_URL (because it's also
    // BUNDLED_EXTENSION_PROFILE_URLS[0] under the mocked REGISTRY). Without
    // resetting the module, those cache hits would short-circuit the loader
    // entirely and assert "called 0 times". vi.resetModules() drops the prior
    // module record so the dedup-Map invariant is exercised against a clean
    // cache; re-importing also re-evaluates the vi.mock factory, so loaderSpy
    // continues to back the REGISTRY[MOCK_EXT_URL] entry in the fresh module.
    vi.resetModules();
    loaderSpy.mockClear();
    const fresh = await import('../index');
    const [a, b] = await Promise.all([
      fresh.getExtensionProfileForUrl(MOCK_EXT_URL),
      fresh.getExtensionProfileForUrl(MOCK_EXT_URL),
    ]);
    expect(a).toBe(b);
    expect(a!.url).toBe(MOCK_EXT_URL);
    expect(loaderSpy).toHaveBeenCalledTimes(1);
  });
});
