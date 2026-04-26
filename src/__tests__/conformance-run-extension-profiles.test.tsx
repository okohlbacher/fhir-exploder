/**
 * Phase 36 / MII-EXT-12 — Wave 0 stub for the consumer-wiring contract.
 *
 * INTENT: Wave 0 commits this file with `it.skip` so the test collector
 * sees it but doesn't fail the suite. Plan 03 (Wave 2) replaces `it.skip`
 * with `it` after wiring the consumer at useConformanceRun.ts:173.
 *
 * Contract under test (post-Plan-03):
 *   - useConformanceRun reads `meta.profile[]` from sampled resources
 *   - For each canonical URL in BUNDLED_EXTENSION_PROFILE_URLS,
 *     getExtensionProfileForUrl is invoked exactly once
 *   - The resolved StructureDefinition is passed to validateConformance
 *
 * Pattern reference: RESEARCH.md §Architecture Patterns Pattern 3.
 */
import { describe, it, expect } from 'vitest';

describe('useConformanceRun extension-profile consumer (Phase 36 / MII-EXT-12)', () => {
  it.skip('reads meta.profile[*] from sampled resources and lazy-loads each bundled extension SD', async () => {
    // Plan 03 (Wave 2) replaces this skip with a real test:
    //   1. Mock '../quality/profiles' to return:
    //        BUNDLED_EXTENSION_PROFILE_URLS = ['https://example/ext/foo']
    //        getExtensionProfileForUrl = vi.fn().mockResolvedValue(<SD>)
    //   2. Mock '../quality/sampling' (sampleResources) to return one
    //      Resource whose meta.profile = ['https://example/ext/foo'].
    //   3. Mock '../quality/profileConformanceChecker' (validateConformance)
    //      to capture the SD argument.
    //   4. renderHook(useConformanceRun({ ... })) inside QualityMetricsProviders.
    //   5. Trigger run.start(); await flush.
    //   6. expect(getExtensionProfileForUrl).toHaveBeenCalledWith('https://example/ext/foo')
    //   7. expect(getExtensionProfileForUrl).toHaveBeenCalledTimes(1)
    //   8. expect(validateConformance).toHaveBeenCalled() with at least one
    //      invocation whose 2nd arg.url === 'https://example/ext/foo'.
    expect(true).toBe(true);
  });
});
