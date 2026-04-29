import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { AppSettings } from '../config/types';
import { TerminologyContext } from '../contexts/TerminologyContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { ConnectionProvider } from '../contexts/ConnectionContext';
import { TerminologyResolver } from '../terminology/TerminologyResolver';
import { LOCAL_STORAGE_PREFIX, makeTerminologyKey } from '../terminology/terminologyKey';
import { mockMedplumClientForTerminology } from './fixtures/terminology';
import {
  getQualityMetricsCache,
  clearAllQualityMetrics,
} from '../quality/metricsCache';
import * as ResourceCountsModule from '../hooks/useResourceCounts';
const { clearAllQualityCountCache } = ResourceCountsModule;

// Polyfill ResizeObserver for jsdom (required by Mantine components)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom (required by Mantine)
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

// Stub useTerminologyHealth so SettingsPage doesn't actually probe the network
vi.mock('../hooks/useTerminologyHealth', () => ({
  useTerminologyHealth: () => 'ok',
}));

// useSettings is called by useTerminologyHealth inside Settings tests; even though we
// mock the hook itself, import resolution still pulls in the module graph. No direct
// stub needed because the hook is fully mocked above.

import { SettingsPage } from '../components/settings/SettingsPage';

const TX_URL = 'https://tx.example/fhir';

const SETTINGS: AppSettings = {
  fhir: {
    serverUrl: 'https://fhir.example/fhir',
    auth: { mode: 'open' },
  },
  terminology: {
    serverUrl: TX_URL,
  },
};

function renderPage(resolver: TerminologyResolver) {
  return render(
    <MantineProvider>
      <Notifications />
      <SettingsProvider>
        <ConnectionProvider>
          <TerminologyContext.Provider value={resolver}>
            <SettingsPage settings={SETTINGS} usingDefaults={false} />
          </TerminologyContext.Provider>
        </ConnectionProvider>
      </SettingsProvider>
    </MantineProvider>,
  );
}

function makeResolver() {
  const client = mockMedplumClientForTerminology({});
  return new TerminologyResolver(client, {
    serverUrl: TX_URL,
    persistToLocalStorage: true,
  });
}

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  // Phase 24 FOUND-02 / W-24-03-03: wipe both quality caches between
  // tests now that three cache types (terminology, metrics, count) share
  // this file. Without these calls, registry state leaks across tests.
  clearAllQualityMetrics();
  clearAllQualityCountCache();
});

describe('SettingsPage — Clear terminology cache (V-09)', () => {
  it('Clear terminology cache removes entries and shows notification', async () => {
    const resolver = makeResolver();
    // Pre-populate cache with two entries
    resolver.cache.set(
      makeTerminologyKey(TX_URL, 'http://snomed.info/sct', '73211009'),
      { display: 'Diabetes mellitus', resolvedAt: Date.now(), ttlMs: Infinity },
    );
    resolver.cache.set(
      makeTerminologyKey(TX_URL, 'http://hl7.org/fhir/sid/icd-10', 'E11.9'),
      { display: 'Type 2 diabetes', resolvedAt: Date.now(), ttlMs: Infinity },
    );
    expect(resolver.cache.size()).toBe(2);

    renderPage(resolver);

    const button = screen.getByRole('button', { name: /Clear terminology cache/i });
    fireEvent.click(button);

    expect(resolver.cache.size()).toBe(0);

    // localStorage has no tx-cache:v1: keys
    const leaked: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_STORAGE_PREFIX)) leaked.push(k);
    }
    expect(leaked).toEqual([]);

    // Toast message appears
    await waitFor(() => {
      expect(screen.getByText(/Cache cleared/)).toBeTruthy();
    });
    expect(screen.getByText(/2 cached terms removed from memory and local storage\./)).toBeTruthy();
  });

  it('Clear with empty cache shows no-op message', async () => {
    const resolver = makeResolver();
    expect(resolver.cache.size()).toBe(0);

    renderPage(resolver);

    const button = screen.getByRole('button', { name: /Clear terminology cache/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/No cached terms to clear\./)).toBeTruthy();
    });
  });
});

describe('SettingsPage — Clear metrics cache (FOUND-02)', () => {
  it('Clear metrics cache button clears BOTH quality metrics registry AND count cache', async () => {
    const FHIR_URL = 'https://fhir.example/fhir';
    // Pre-populate the registry instance so we have an entry to drop.
    const cacheBefore = getQualityMetricsCache(FHIR_URL);
    cacheBefore.set(`${FHIR_URL}|completeness|Patient|100`, {
      value: 'v1',
      computedAt: Date.now(),
      serverUrl: FHIR_URL,
      resourceType: 'Patient',
      sampleSize: 100,
    });
    expect(cacheBefore.size()).toBe(1);

    // Spy on the count-cache wipe to prove SettingsPage calls it as well.
    const countSpy = vi.spyOn(ResourceCountsModule, 'clearAllQualityCountCache');

    const resolver = makeResolver();
    renderPage(resolver);

    const button = screen.getByRole('button', { name: /Clear metrics cache/i });
    fireEvent.click(button);

    // 1. clearAllQualityCountCache invoked — count cache cleared.
    expect(countSpy).toHaveBeenCalledTimes(1);

    // 2. Cross-server clearAllQualityMetrics dropped the registry entry —
    // getQualityMetricsCache(FHIR_URL) returns a fresh, empty instance.
    const cacheAfter = getQualityMetricsCache(FHIR_URL);
    expect(cacheAfter).not.toBe(cacheBefore);
    expect(cacheAfter.size()).toBe(0);

    // 3. Toast still appears with the existing copy. Mantine notifications
    // accumulate in the portal across tests; use getAllByText so a stale
    // toast from a sibling test does not collide with the assertion.
    await waitFor(() => {
      expect(screen.getAllByText(/Cache cleared/).length).toBeGreaterThan(0);
    });

    countSpy.mockRestore();
  });
});
