/**
 * Phase 31-02 Gap Closure: UI-cascade PHI key agreement integration test.
 *
 * Locks the CR-01 fix (from 31-REVIEW.md): ValidationPanel writes the PHI
 * acknowledgement under a key derived from `externalValidator.url` when
 * the external tier is configured, matching the key
 * `cascadingValidator.tryExternal` reads via
 * `isPhiAcknowledged(serverUrl, ext.url)`.
 *
 * Without this test, unit-level tests at cascadingValidator.test.ts:77 seed
 * localStorage directly at the correct key, bypassing ValidationPanel. The
 * UI<->cascade key mismatch was invisible to the unit suite — VERIFICATION.md
 * Truth #1 and Truth #4 called this out.
 *
 * Test cases:
 *   - Test A: external-only — banner renders with EXT_URL, ack lands at
 *     phiAckKey(SERVER_URL, EXT_URL), cascade fires fetch against EXT_URL.
 *   - Test B: both tiers, differing URLs — banner displays EXTERNAL URL,
 *     ack lands at external-tier key, cascade fires external fetch (server
 *     tier not silently preferred).
 *   - Test C: server-only — banner renders with SERVER_VAL_URL, ack lands at
 *     server-tier key (fallback path regression lock).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { Notifications } from '@mantine/notifications';
import type { CapabilityStatement, Resource } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../../../config/types';

// ----- jsdom polyfills (mirror src/__tests__/validation-panel.test.tsx) -----
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

// ----- Mutable mock settings ref (vi.hoisted so each test reassigns) -----
const mocks = vi.hoisted(() => ({
  settings: null as AppSettings | null,
}));

vi.mock('../../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: mocks.settings,
    usingDefaults: false,
    loading: false,
  }),
}));

// ----- FHIR client + capability mocks -----
const SERVER_URL = 'http://localhost:8080/fhir';

function makeConditionSample(id: string): Resource {
  return {
    resourceType: 'Condition',
    id,
    code: { coding: [{ system: 'http://snomed.info/sct', code: '44054006' }] },
    subject: { reference: 'Patient/pat-1' },
  };
}

const mockSearchResources = vi.fn();
const mockPost = vi.fn();
const mockClient = {
  getBaseUrl: () => SERVER_URL,
  searchResources: mockSearchResources,
  post: mockPost,
} as unknown as MedplumClient;

const mockCapability: CapabilityStatement = {
  resourceType: 'CapabilityStatement',
  status: 'active',
  date: '2026-04-23',
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

vi.mock('../SampleSizeControl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../SampleSizeControl')>();
  return {
    ...actual,
    useSampleSize: () => [2, () => {}],
  };
});

import { ValidationPanel } from '../ValidationPanel';
import { phiAckKey } from '../../../quality/phiGate';

const EXT_URL = 'https://hapi.example.org/baseR4';
const SERVER_VAL_URL = 'http://server.example.org/fhir';

function renderPanel() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <Notifications />
        <ValidationPanel client={mockClient} sampleSize={2} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Clear localStorage so each test starts with no prior ack
  window.localStorage.clear();
  mockSearchResources
    .mockReset()
    .mockResolvedValue([makeConditionSample('c1'), makeConditionSample('c2')]);
  mockPost
    .mockReset()
    .mockResolvedValue({ resourceType: 'OperationOutcome', issue: [] });
  fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }),
      { status: 200, headers: { 'Content-Type': 'application/fhir+json' } },
    ),
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.restoreAllMocks();
});

describe('Phase 31-02: UI-cascade PHI key agreement (CR-01 fix)', () => {
  it('Test A: external-only config — banner renders, ack satisfies external gate, fetch hits EXT_URL', async () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: {
        batchSize: 25,
        externalValidator: { url: EXT_URL, enabled: true, timeoutMs: 15000 },
      },
    } as AppSettings;

    renderPanel();

    // Banner renders with EXT_URL
    await screen.findByText(/PHI will be sent to an external validator/i);
    expect(screen.getByText(EXT_URL)).toBeDefined();

    // Acknowledge
    const ackButton = screen.getByRole('button', { name: /acknowledge/i });
    fireEvent.click(ackButton);

    // ack key MUST equal the key the cascade reads
    const ackKey = phiAckKey(SERVER_URL, EXT_URL);
    await waitFor(() => {
      expect(window.localStorage.getItem(ackKey)).toBe('true');
    });

    // Trigger a run
    const runButton = await screen.findByRole('button', {
      name: /validate sample/i,
    });
    fireEvent.click(runButton);

    // External tier fired — fetch called with EXT_URL prefix
    await waitFor(
      () => {
        const calledWithExt = fetchSpy.mock.calls.some(
          ([url]) => typeof url === 'string' && url.startsWith(EXT_URL),
        );
        expect(calledWithExt).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  it('Test B: both tiers differing URLs — external-tier URL receives the ack; external fetch fires (server tier not silently preferred)', async () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: {
        validatorUrl: SERVER_VAL_URL,
        batchSize: 25,
        externalValidator: { url: EXT_URL, enabled: true, timeoutMs: 15000 },
      },
    } as AppSettings;

    renderPanel();

    await screen.findByText(/PHI will be sent to an external validator/i);
    // Banner displays EXTERNAL URL (not server URL) — the URL that receives PHI first
    expect(screen.getByText(EXT_URL)).toBeDefined();
    expect(screen.queryByText(SERVER_VAL_URL)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));

    // ack lands at EXTERNAL-tier key, NOT server-tier key
    await waitFor(() => {
      expect(window.localStorage.getItem(phiAckKey(SERVER_URL, EXT_URL))).toBe(
        'true',
      );
      expect(
        window.localStorage.getItem(phiAckKey(SERVER_URL, SERVER_VAL_URL)),
      ).toBeNull();
    });

    fireEvent.click(
      await screen.findByRole('button', { name: /validate sample/i }),
    );

    await waitFor(
      () => {
        const calledWithExt = fetchSpy.mock.calls.some(
          ([url]) => typeof url === 'string' && url.startsWith(EXT_URL),
        );
        expect(calledWithExt).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  it('Test C: server-only config — banner renders, ack writes to server-tier key (fallback path regression lock)', async () => {
    mocks.settings = {
      fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } },
      validation: { validatorUrl: SERVER_VAL_URL, batchSize: 25 },
    } as AppSettings;

    renderPanel();

    await screen.findByText(/PHI will be sent to an external validator/i);
    expect(screen.getByText(SERVER_VAL_URL)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));

    // Fallback: ack is keyed against server-tier URL
    await waitFor(() => {
      expect(
        window.localStorage.getItem(phiAckKey(SERVER_URL, SERVER_VAL_URL)),
      ).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 43 VAL-06 (Plan 43-01 Task 4) — auth-without-PHI bypass guards.
  //
  // T-43-05 invariant: when PHI is NOT acknowledged, the cascade MUST NOT
  // build any Authorization header AND MUST NOT read the bearer token from
  // localStorage. The PHI gate runs FIRST in tryExternal and short-circuits
  // before the header-build block. These tests lock that ordering at the
  // integration layer (ValidationPanel render → useConformanceRun → cascade).
  // Mirrors 43-RESEARCH.md Pitfall 1.
  // ---------------------------------------------------------------------------

  it('Test D (T-43-05 auth-without-PHI basic): basic auth configured + PHI not acknowledged → no Authorization header, no external fetch', async () => {
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

    // PHI ack key NOT set — gate fails. (window.localStorage was cleared in beforeEach.)

    renderPanel();
    await screen.findByText(/PHI will be sent to an external validator/i);

    // Trigger run WITHOUT acknowledging
    fireEvent.click(
      await screen.findByRole('button', { name: /validate sample/i }),
    );

    // Give the run a tick to attempt fetches
    await new Promise((r) => setTimeout(r, 50));

    // External tier never fetched — cascade demoted at the PHI gate before
    // the header-build block was even reached.
    const calledWithExt = fetchSpy.mock.calls.some(
      ([url]) => typeof url === 'string' && url.startsWith(EXT_URL),
    );
    expect(calledWithExt).toBe(false);

    // No Authorization header on any outbound fetch (defense in depth — the
    // PHI gate makes the build block unreachable, so this assertion is vacuous
    // when the prior assertion passes; it documents the contract regardless).
    for (const [, init] of fetchSpy.mock.calls) {
      const headers = ((init as RequestInit | undefined)?.headers ?? {}) as Record<
        string,
        string
      >;
      expect(headers.Authorization).toBeUndefined();
    }
  });

  it('Test E (T-43-05 auth-without-PHI bearer): bearer + token in localStorage + PHI not acknowledged → bearer key NEVER read', async () => {
    // Seed a token that MUST NEVER be read (any read would be a contract bug).
    window.localStorage.setItem('validator.bearerToken.v1', 'tok-MUST-NOT-LEAK');

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

    // PHI ack key NOT set — gate fails.

    // Spy on Storage.prototype.getItem AFTER seeding the token so the seed
    // does not get counted. Other localStorage reads (PHI gate, banner
    // dismissal, etc.) are fine; we filter to ONLY the bearer key.
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    getItemSpy.mockClear();

    renderPanel();
    await screen.findByText(/PHI will be sent to an external validator/i);

    fireEvent.click(
      await screen.findByRole('button', { name: /validate sample/i }),
    );

    // Allow the run to attempt fetches (it will demote at the PHI gate).
    await new Promise((r) => setTimeout(r, 50));

    const bearerReads = getItemSpy.mock.calls.filter(
      ([key]) => key === 'validator.bearerToken.v1',
    );
    expect(bearerReads).toHaveLength(0);
    // Belt-and-braces: external fetch must also have been skipped.
    const calledWithExt = fetchSpy.mock.calls.some(
      ([url]) => typeof url === 'string' && url.startsWith(EXT_URL),
    );
    expect(calledWithExt).toBe(false);
  });
});
