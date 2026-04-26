/**
 * Phase 36 / MII-EXT-12 — consumer wiring contract for useConformanceRun.
 *
 * Asserts that Step 2b inside useConformanceRun:
 *   1. Reads meta.profile[*] from sampled resources
 *   2. Calls getExtensionProfileForUrl exactly once per unique bundled URL
 *   3. Passes the resolved StructureDefinition into validateConformance
 *
 * Pattern reference: 36-RESEARCH.md §Architecture Patterns Pattern 3.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { Resource, StructureDefinition } from '@medplum/fhirtypes';

// vi.hoisted lifts these declarations above all vi.mock factory hoisting so
// the factories can safely close over them. Without this, the const init
// runs AFTER the mock factories and we'd see "Cannot access 'FAKE_SD'
// before initialization" at module-evaluation time.
const { FAKE_URL, FAKE_SD, fakeResource } = vi.hoisted(() => {
  const FAKE_URL = 'https://example/ext/foo';
  const FAKE_SD = {
    resourceType: 'StructureDefinition',
    url: FAKE_URL,
    name: 'fake-ext',
    type: 'Condition',
    snapshot: { element: [{ path: 'Condition' }] },
  } as unknown as StructureDefinition;
  const fakeResource = {
    resourceType: 'Condition',
    id: 'cond-1',
    meta: { profile: [FAKE_URL] },
  } as unknown as Resource;
  return { FAKE_URL, FAKE_SD, fakeResource };
});

// ---- Mocks (must precede the under-test import) ----
vi.mock('../quality/profiles', () => ({
  getProfileForType: () => null,
  getExtensionProfileForUrl: vi.fn().mockResolvedValue(FAKE_SD),
  BUNDLED_EXTENSION_PROFILE_URLS: [FAKE_URL] as readonly string[],
  BUNDLED_PROFILE_TYPES: ['Condition'] as readonly string[],
}));

vi.mock('../quality/sampling', () => ({
  sampleResources: vi.fn(async () => [fakeResource]),
}));

vi.mock('../quality/profileConformanceChecker', () => ({
  validateConformance: vi.fn(() => []),
  normalizeConformanceIssues: vi.fn(() => []),
}));

vi.mock('../quality/cascadingValidator', () => ({
  validateWithCascade: vi.fn(async () => []),
  probeKey: vi.fn(() => 'pk'),
  clearProbeCache: vi.fn(),
  resetProbeForType: vi.fn(),
  detectValidatorVariant: vi.fn(() => null),
}));

vi.mock('../quality/valueSetCache', () => ({
  ValueSetCache: class {
    expand = vi.fn(async () => null);
    isAvailable = () => true;
  },
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

// jsdom polyfill (Mantine wrappers don't render here, but render-hook
// pulls in tree-shake-resistant Mantine deps that touch matchMedia).
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Import AFTER mocks
import { useConformanceRun } from '../hooks/useConformanceRun';
import { QualityMetricsProviders } from '../quality/metrics';
import * as profilesMod from '../quality/profiles';
import * as checkerMod from '../quality/profileConformanceChecker';

function wrapper({ children }: { children: ReactNode }) {
  return <QualityMetricsProviders>{children}</QualityMetricsProviders>;
}

function makeClient(): MedplumClient {
  return {
    getBaseUrl: () => 'http://localhost:8080',
    searchResources: vi.fn(async () => []),
  } as unknown as MedplumClient;
}

describe('useConformanceRun extension-profile consumer (Phase 36 / MII-EXT-12)', () => {
  it('reads meta.profile[*] from sampled resources and lazy-loads each bundled extension SD', async () => {
    const client = makeClient();
    const { result } = renderHook(
      () =>
        useConformanceRun({
          client,
          terminologyClient: null,
          resourceType: 'Condition',
          sampleSize: 1,
          batchSize: 1,
          settings: {} as never,
        }),
      { wrapper },
    );

    await act(async () => {
      result.current.start();
    });

    await waitFor(
      () => {
        expect(result.current.status === 'complete' || result.current.status === 'error').toBe(
          true,
        );
      },
      { timeout: 2000 },
    );

    // Assertion 1: getExtensionProfileForUrl invoked exactly once with the
    // canonical URL pulled from meta.profile[].
    expect(profilesMod.getExtensionProfileForUrl).toHaveBeenCalledWith(FAKE_URL);
    expect(profilesMod.getExtensionProfileForUrl).toHaveBeenCalledTimes(1);

    // Assertion 2: validateConformance saw the resolved extension SD as
    // its 2nd argument (proves the SD reached the validator path).
    const calls = (
      checkerMod.validateConformance as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls;
    const sawExtensionSd = calls.some(
      (args) =>
        args[1] != null &&
        (args[1] as { url?: string }).url === FAKE_URL &&
        (args[1] as { resourceType?: string }).resourceType === 'StructureDefinition',
    );
    expect(sawExtensionSd).toBe(true);

    // Assertion 3: the run completed (not errored).
    expect(result.current.status).toBe('complete');
  });
});
