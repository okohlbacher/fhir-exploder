/**
 * MiiModuleTab per-type fan out tests — Plan 33-04 Task 2 (MII-EXT-03 / D-06 / D-07).
 *
 * Locks the Phase 33 multi-type contract:
 *   1. Single-type module triggers exactly 1 FHIR GET (URL + extraQuery).
 *   2. Multi-type module (['ImagingStudy', 'DiagnosticReport']) triggers
 *      exactly 2 concurrent GETs and renders results from both types.
 *   3. One-type-fails isolation — first-type reject + second-type resolve
 *      still renders the second type; no "No data found" empty state.
 *   4. patientSearchParamOverrides routes per-type URLs (D-04).
 *   5. extraQueryByType overrides module-wide extraQuery per type (D-04/D-05).
 *
 * Pattern mirrors src/__tests__/patient-detail.test.tsx — jsdom polyfills
 * for Mantine, vi.mock on react-router-dom + @medplum/react-hooks, then a
 * per-test `makeClient(responder)` stub whose `get()` is a vi.fn.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

// Polyfill ResizeObserver for jsdom (required by Mantine components).
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom (required by Mantine).
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

// --- Mocks --------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Hoisted container that each test writes its per-test client into before
// render. `useMedplum` is mocked once to return whatever is current.
const mocks = vi.hoisted(() => ({
  client: null as null | {
    get: ReturnType<typeof vi.fn>;
    fhirUrl: (s: string) => { toString: () => string };
  },
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mocks.client,
}));

import { MiiModuleTab } from '../MiiModuleTab';
import type { MiiModule } from '../../../utils/mii-modules';

// --- Helpers ------------------------------------------------------------

type BundleResponder = (url: string) => Promise<unknown>;

function makeClient(responder: BundleResponder) {
  return {
    get: vi.fn((url: string) => responder(url)),
    fhirUrl: (s: string) => ({ toString: () => s }),
  };
}

function renderTab(module: MiiModule, patientId = 'p1') {
  return render(
    <MantineProvider>
      <MiiModuleTab module={module} patientId={patientId} />
    </MantineProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mocks.client = null;
});

afterEach(() => {
  mocks.client = null;
});

// --- Tests --------------------------------------------------------------

describe('MiiModuleTab fan-out (MII-EXT-03)', () => {
  it('single-type module triggers exactly 1 FHIR GET with extraQuery appended', async () => {
    const client = makeClient(() =>
      Promise.resolve({
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Observation',
              id: 'obs-1',
              effectiveDateTime: '2024-01-01',
            },
          },
        ],
      }),
    );
    mocks.client = client;

    const labor: MiiModule = {
      key: 'laborbefund',
      germanLabel: 'Laborbefund',
      fhirResourceType: 'Observation',
      category: 'base',
      badgeColor: 'cyan',
      patientSearchParam: 'patient',
      extraQuery: 'category=laboratory',
    };

    await act(async () => {
      renderTab(labor);
    });

    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(1));
    const url = client.get.mock.calls[0][0] as string;
    expect(url).toContain('Observation?patient=Patient/p1');
    expect(url).toContain('category=laboratory');
  });

  it('multi-type module triggers N concurrent FHIR GETs (D-06)', async () => {
    const client = makeClient((url: string) => {
      if (url.includes('ImagingStudy')) {
        return Promise.resolve({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'ImagingStudy',
                id: 'img-1',
                started: '2024-06-01',
              },
            },
          ],
        });
      }
      if (url.includes('DiagnosticReport')) {
        return Promise.resolve({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'DiagnosticReport',
                id: 'dr-1',
                issued: '2024-07-01',
              },
            },
          ],
        });
      }
      return Promise.resolve({ resourceType: 'Bundle', entry: [] });
    });
    mocks.client = client;

    const bildgebung: MiiModule = {
      key: 'bildgebung',
      germanLabel: 'Bildgebung',
      fhirResourceType: ['ImagingStudy', 'DiagnosticReport'],
      category: 'extension',
      badgeColor: 'cyan',
      patientSearchParam: 'patient',
    };

    await act(async () => {
      renderTab(bildgebung);
    });

    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
    // Each resource id appears in two cells (Anchor summary + mono ID column),
    // so use findAllByText and assert at least one match per type.
    expect((await screen.findAllByText(/img-1/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/dr-1/i)).length).toBeGreaterThan(0);
  });

  it('one-type-fails other-type-succeeds preserves module render (D-06)', async () => {
    const client = makeClient((url: string) =>
      url.includes('ImagingStudy')
        ? Promise.reject(new Error('network'))
        : Promise.resolve({
            resourceType: 'Bundle',
            entry: [
              {
                resource: {
                  resourceType: 'DiagnosticReport',
                  id: 'dr-ok',
                  issued: '2024-08-01',
                },
              },
            ],
          }),
    );
    mocks.client = client;

    const bildgebung: MiiModule = {
      key: 'bildgebung',
      germanLabel: 'Bildgebung',
      fhirResourceType: ['ImagingStudy', 'DiagnosticReport'],
      category: 'extension',
      badgeColor: 'cyan',
      patientSearchParam: 'patient',
    };

    await act(async () => {
      renderTab(bildgebung);
    });

    // dr-ok appears in two cells; findAllByText avoids the "multiple elements"
    // error while still proving the surviving type rendered.
    expect((await screen.findAllByText(/dr-ok/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No Bildgebung data found/)).toBeNull();
  });

  it('patientSearchParamOverrides routes per-type URLs correctly', async () => {
    const client = makeClient(() =>
      Promise.resolve({ resourceType: 'Bundle', entry: [] }),
    );
    mocks.client = client;

    const stub: MiiModule = {
      key: 'x',
      germanLabel: 'X',
      fhirResourceType: ['TypeA', 'TypeB'],
      category: 'extension',
      badgeColor: 'gray',
      patientSearchParam: 'patient',
      patientSearchParamOverrides: { TypeA: 'subject' },
    };

    await act(async () => {
      renderTab(stub);
    });

    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
    const urls = client.get.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(urls.some((u) => u.includes('TypeA?subject=Patient/p1'))).toBe(true);
    expect(urls.some((u) => u.includes('TypeB?patient=Patient/p1'))).toBe(true);
  });

  it('extraQueryByType overrides module-wide extraQuery per type', async () => {
    const client = makeClient(() =>
      Promise.resolve({ resourceType: 'Bundle', entry: [] }),
    );
    mocks.client = client;

    const stub: MiiModule = {
      key: 'x',
      germanLabel: 'X',
      fhirResourceType: ['TypeA', 'TypeB'],
      category: 'extension',
      badgeColor: 'gray',
      patientSearchParam: 'patient',
      extraQuery: 'category=fallback',
      extraQueryByType: { TypeA: 'category=foo' },
    };

    await act(async () => {
      renderTab(stub);
    });

    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
    const urls = client.get.mock.calls.map((c: unknown[]) => c[0] as string);
    const typeAUrl = urls.find((u) => u.includes('TypeA'));
    const typeBUrl = urls.find((u) => u.includes('TypeB'));
    expect(typeAUrl).toContain('category=foo');
    expect(typeBUrl).toContain('category=fallback');
  });
});
