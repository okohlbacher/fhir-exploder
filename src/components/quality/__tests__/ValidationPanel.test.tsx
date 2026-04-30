/**
 * Phase 43-01 Task 5 — ValidationPanel auth banner copy.
 *
 * These tests mock `useConformanceRun` so each scenario can specify the
 * auth state precisely (configured auth type, post-run banner state).
 * The component-under-test reads `settings.validation.externalValidator.auth?.type`
 * and the hook's `authBannerState` to decide what banner copy to render.
 *
 * Banner copy contract (D-02 / D-13 / D-21 / T-43-07):
 *   - basic active                 → "auth: basic"
 *   - bearer active                → "auth: bearer"
 *   - bearer + missing token       → "auth: bearer (token missing — set in Settings)"
 *   - any type + auth-failed       → "auth: <type> — failed (server fallback)"
 *   - no auth configured           → no "auth:" substring (no banner)
 *
 * The banner MUST NOT render the credential value (T-43-07 lock).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { Notifications } from '@mantine/notifications';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../../../config/types';

// ----- jsdom polyfills (mirror ValidationPanel.phi-gate.integration.test.tsx) -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
if (!(Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView) {
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
    function () {};
}
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

const SERVER_URL = 'http://localhost:8080/fhir';
const EXT_URL = 'https://hapi.example.org/baseR4';

const mocks = vi.hoisted(() => ({
  settings: null as AppSettings | null,
  authBannerState: 'none' as 'missing' | 'failed' | 'ok' | 'none',
  activeStrategy: 'external' as 'external' | 'server' | 'local' | null,
  authType: undefined as 'basic' | 'bearer' | undefined,
}));

vi.mock('../../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: mocks.settings,
    usingDefaults: false,
    loading: false,
  }),
}));

vi.mock('../../../hooks/useConformanceRun', () => ({
  useConformanceRun: () => ({
    status: 'complete',
    progress: { current: 1, total: 1 },
    issues: [
      {
        resourceId: 'Patient/p1',
        resourceType: 'Patient',
        field: 'Patient.name',
        description: 'required -- missing name',
        severity: 'error',
      },
    ],
    legacyIssues: [],
    byResource: { 'Patient/p1': { resourceId: 'p1', issues: [] } },
    terminologyAvailable: true,
    errorMessage: undefined,
    activeStrategy: mocks.activeStrategy,
    activeStrategyVariant: null,
    authBannerState: mocks.authBannerState,
    authType: mocks.authType,
    start: vi.fn(),
    cancel: vi.fn(),
  }),
}));

const mockSearchResources = vi.fn();
const mockClient = {
  getBaseUrl: () => SERVER_URL,
  searchResources: mockSearchResources,
} as unknown as MedplumClient;

const mockCapability: CapabilityStatement = {
  resourceType: 'CapabilityStatement',
  status: 'active',
  date: '2026-04-30',
  kind: 'instance',
  fhirVersion: '4.0.1',
  format: ['json'],
  rest: [
    {
      mode: 'server',
      resource: [{ type: 'Condition' }, { type: 'Patient' }],
    },
  ],
};

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useOutletContext: () => ({ capability: mockCapability, client: mockClient }),
  };
});

import { ValidationPanel } from '../ValidationPanel';
import { phiAckKey } from '../../../quality/phiGate';

function renderPanel() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <Notifications />
        <ValidationPanel client={mockClient} sampleSize={1} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  // Acknowledge PHI so the run can be considered to have happened with auth.
  window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
  mockSearchResources.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Phase 43-01 Task 5 — ValidationPanel auth banner copy', () => {
  it('auth-banner-1: basic auth active → banner contains "auth: basic"', () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: {
        batchSize: 25,
        externalValidator: {
          url: EXT_URL,
          enabled: true,
          timeoutMs: 15000,
          auth: { type: 'basic', username: 'a', password: 'b' },
        },
      },
    } as AppSettings;
    mocks.authBannerState = 'ok';
    mocks.activeStrategy = 'external';
    mocks.authType = 'basic';

    renderPanel();
    expect(screen.getByText(/auth: basic/i)).toBeDefined();
  });

  it('auth-banner-2: bearer auth active → banner contains "auth: bearer"', () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: {
        batchSize: 25,
        externalValidator: {
          url: EXT_URL,
          enabled: true,
          timeoutMs: 15000,
          auth: { type: 'bearer' },
        },
      },
    } as AppSettings;
    mocks.authBannerState = 'ok';
    mocks.activeStrategy = 'external';
    mocks.authType = 'bearer';

    renderPanel();
    expect(screen.getByText(/auth: bearer\b/i)).toBeDefined();
    // Must NOT include the missing-token suffix.
    expect(screen.queryByText(/token missing/i)).toBeNull();
  });

  it('auth-banner-3: bearer + missing token → "auth: bearer (token missing — set in Settings)"', () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: {
        batchSize: 25,
        externalValidator: {
          url: EXT_URL,
          enabled: true,
          timeoutMs: 15000,
          auth: { type: 'bearer' },
        },
      },
    } as AppSettings;
    mocks.authBannerState = 'missing';
    mocks.activeStrategy = 'server';
    mocks.authType = 'bearer';

    renderPanel();
    expect(
      screen.getByText(/auth: bearer.*token missing.*set in Settings/i),
    ).toBeDefined();
  });

  it('auth-banner-4: basic + auth-failed (401) → "auth: basic — failed (server fallback)"', () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: {
        batchSize: 25,
        externalValidator: {
          url: EXT_URL,
          enabled: true,
          timeoutMs: 15000,
          auth: { type: 'basic', username: 'a', password: 'b' },
        },
      },
    } as AppSettings;
    mocks.authBannerState = 'failed';
    mocks.activeStrategy = 'server';
    mocks.authType = 'basic';

    renderPanel();
    expect(
      screen.getByText(/auth: basic.*failed.*server fallback/i),
    ).toBeDefined();
    // T-43-07 lock: credential MUST NOT appear in the rendered DOM.
    const html = document.body.innerHTML;
    expect(html).not.toContain('password');
    expect(html).not.toContain('"a"');
  });

  it('auth-banner-5: no auth configured → no "auth:" substring rendered', () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: {
        batchSize: 25,
        externalValidator: {
          url: EXT_URL,
          enabled: true,
          timeoutMs: 15000,
        },
      },
    } as AppSettings;
    mocks.authBannerState = 'none';
    mocks.activeStrategy = 'external';
    mocks.authType = undefined;

    renderPanel();
    // No "auth:" anywhere in the rendered banner area.
    expect(screen.queryByText(/auth:/i)).toBeNull();
  });
});
