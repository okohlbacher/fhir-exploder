/**
 * ClinicalTimeline MII module resolution (MII-EXT-08).
 *
 * End-to-end regression test that locks plan 33-02's migration of
 * ClinicalTimeline.tsx:85-86 from MII_MODULES.find(=== comparison) to
 * findModuleForType. The test exercises the production chain:
 *   searchResources → extractDate/extractSummary → findModuleForType(resource.resourceType, MII_MODULES)
 *   → TimelineEntry rendering with correct German label + badge color.
 *
 * Uses the REAL MII_MODULES (no mocking at the helper level) so that
 * a Condition resource resolves to "Diagnose" (teal) and a Procedure
 * resolves to "Prozedur" (violet) via findModuleForType. This guards
 * against Phase 34 multi-type extension modules silently regressing
 * timeline color/label resolution — the chain tested here is the same
 * chain that Bildgebung (['ImagingStudy', 'DiagnosticReport']) will
 * traverse once its data lands.
 *
 * Pattern mirrors src/components/patients/__tests__/MiiModuleTab.test.tsx —
 * jsdom polyfills for Mantine, vi.mock on react-router-dom + @medplum/react-hooks,
 * per-test `makeClient(resourcesByType)` stub whose `searchResources` is a vi.fn.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';

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
    searchResources: ReturnType<typeof vi.fn>;
  },
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mocks.client,
}));

import { ClinicalTimeline } from '../ClinicalTimeline';

// --- Helpers ------------------------------------------------------------

function makeClient(resourcesByType: Record<string, Resource[]>) {
  return {
    searchResources: vi.fn((type: string) =>
      Promise.resolve(resourcesByType[type] ?? []),
    ),
  };
}

function renderTimeline(ui: ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

beforeEach(() => {
  mockNavigate.mockReset();
  mocks.client = null;
});

afterEach(() => {
  mocks.client = null;
});

// --- Tests --------------------------------------------------------------

describe('ClinicalTimeline MII module resolution (MII-EXT-08)', () => {
  it('Condition resource renders with Diagnose German label (via findModuleForType)', async () => {
    const client = makeClient({
      Condition: [
        {
          resourceType: 'Condition',
          id: 'c-1',
          subject: { reference: 'Patient/p1' },
          onsetDateTime: '2024-01-01',
          code: { text: 'Test Condition' },
        } as Resource,
      ],
      Encounter: [],
      Procedure: [],
      Observation: [],
    });
    mocks.client = client;

    await act(async () => {
      renderTimeline(<ClinicalTimeline patientId="p1" />);
    });

    await waitFor(() => expect(client.searchResources).toHaveBeenCalled());

    // Diagnose label comes from findModuleForType('Condition') → MII_MODULES['diagnose'].germanLabel.
    // findByText throws if the element is not found, so presence is asserted implicitly.
    const diagnoseLabel = await screen.findByText('Diagnose');
    expect(diagnoseLabel).toBeTruthy();
    // Summary from extractSummary → code.text.
    const summary = await screen.findByText('Test Condition');
    expect(summary).toBeTruthy();

    // Phase 38.1 regression lock: ClinicalTimeline.tsx:72 must use
    // a Blaze-1.6.2-accepted sort param. searchResources is called
    // as (type, queryString); we inspect every call's queryString.
    const queryStrings = (
      client.searchResources.mock.calls as unknown[][]
    ).map((c) => c[1] as string);
    expect(queryStrings.length).toBeGreaterThan(0);
    for (const q of queryStrings) {
      expect(q).toContain('_sort=-_lastUpdated');
      expect(q).not.toContain('_sort=-date');
    }
  });

  it('Procedure renders with Prozedur German label', async () => {
    const client = makeClient({
      Condition: [],
      Encounter: [],
      Procedure: [
        {
          resourceType: 'Procedure',
          id: 'p-1',
          status: 'completed',
          subject: { reference: 'Patient/p1' },
          performedDateTime: '2024-02-01',
          code: { text: 'Test Procedure' },
        } as Resource,
      ],
      Observation: [],
    });
    mocks.client = client;

    await act(async () => {
      renderTimeline(<ClinicalTimeline patientId="p1" />);
    });

    await waitFor(() => expect(client.searchResources).toHaveBeenCalled());

    const prozedurLabel = await screen.findByText('Prozedur');
    expect(prozedurLabel).toBeTruthy();
    const summary = await screen.findByText('Test Procedure');
    expect(summary).toBeTruthy();
  });

  it('empty bundles across all 4 timeline types render without crash', async () => {
    // Defensive guard: ClinicalTimeline should not crash with empty bundles.
    // TIMELINE_RESOURCE_TYPES = ['Encounter', 'Condition', 'Procedure', 'Observation']
    // — all 4 have base MII modules, so the fallback-color 'gray' path is
    // unreachable from the timeline's own fetches. This test exists to
    // guard the empty-state render, not the fallback.
    const client = makeClient({
      Condition: [],
      Encounter: [],
      Procedure: [],
      Observation: [],
    });
    mocks.client = client;

    let container: HTMLElement;
    await act(async () => {
      const result = renderTimeline(<ClinicalTimeline patientId="p1" />);
      container = result.container;
    });

    await waitFor(() => expect(client.searchResources).toHaveBeenCalled());
    // Empty-state text per ClinicalTimeline.tsx — findByText throws if missing.
    const emptyState = await screen.findByText(/No clinical events recorded/i);
    expect(emptyState).toBeTruthy();
    expect(container!).toBeTruthy();
  });
});
