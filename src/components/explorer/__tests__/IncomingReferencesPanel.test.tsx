/**
 * Phase 48 / Plan 02 / Task 2 — IncomingReferencesPanel (D-15 + D-16 cross-wrapper invariant).
 *
 * Validates the wrapper component (D-06):
 *   - type-not-in-catalog → returns null silently
 *   - Observation resource → renders cards from reverseReferenceCatalog.Observation
 *   - missing resource.id → returns null silently
 *   - card click → useNavigate called with /explorer/{type}?{param}={resourceType}/{id}
 *   - structural equivalence: IncomingReferencesPanel and equivalent RelatedResourcesPanel
 *     call produce structurally equivalent DOM (D-16 cross-wrapper invariant)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { Bundle, Observation } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';
import { IncomingReferencesPanel } from '../IncomingReferencesPanel';
import { RelatedResourcesPanel } from '../RelatedResourcesPanel';
import { reverseReferenceCatalog } from '../../../utils/reverseReferenceCatalog';
import { PeekProvider } from '../../../contexts/PeekContext';

// Polyfill ResizeObserver + matchMedia for jsdom (Pitfall 5)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

const mockGet = vi.fn();
const mockNavigate = vi.fn();

// Stable client reference — required to avoid useEffect re-fire on every render.
const stableClient = {
  get: mockGet,
  fhirUrl: (p: string) => ({ toString: () => `http://test/fhir/${p}` }),
};

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => stableClient,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Phase 53 Plan 02 Task 2: RelatedResourcesPanel (rendered transitively via
// IncomingReferencesPanel) now consumes usePeek(), so PeekProvider is required.
const wrap = (ui: ReactNode) => (
  <MantineProvider>
    <MemoryRouter>
      <PeekProvider>{ui}</PeekProvider>
    </MemoryRouter>
  </MantineProvider>
);

beforeEach(() => {
  mockGet.mockReset();
  mockNavigate.mockReset();
});

describe('IncomingReferencesPanel', () => {
  it('type not in catalog: returns null silently', () => {
    // Bundle is not a key in reverseReferenceCatalog
    const { container } = render(
      wrap(<IncomingReferencesPanel resource={{ resourceType: 'Bundle', id: 'b1' } as never} />),
    );
    // Component returns null. No fetch should fire.
    expect(mockGet).not.toHaveBeenCalled();
    // No Title / Card from our component
    expect(container.querySelector('[class*=Title]')).toBeNull();
    expect(container.querySelector('[class*=Card]')).toBeNull();
    expect(screen.queryByText('Referenced By')).toBeNull();
  });

  it('Observation renders cards from catalog', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({ resourceType: 'Bundle', total: 5 } as Bundle),
    );
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'o1',
      status: 'final',
      code: { text: 'glucose' },
    };
    render(wrap(<IncomingReferencesPanel resource={obs} />));
    await waitFor(() => expect(screen.getByText('Referenced By')).toBeTruthy());
    // DiagnosticReport is the first entry in reverseReferenceCatalog.Observation
    await waitFor(() => expect(screen.getByText('DiagnosticReport')).toBeTruthy());
  });

  it('missing resource.id: returns null silently', () => {
    const { container } = render(
      wrap(
        <IncomingReferencesPanel
          resource={{ resourceType: 'Observation', status: 'final', code: { text: 'x' } } as Observation}
        />,
      ),
    );
    expect(mockGet).not.toHaveBeenCalled();
    expect(container.querySelector('[class*=Card]')).toBeNull();
    expect(screen.queryByText('Referenced By')).toBeNull();
  });

  it('card click on Observation panel navigates with Observation refValue', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('DiagnosticReport?result=')
        ? Promise.resolve({ resourceType: 'Bundle', total: 3 } as Bundle)
        : Promise.resolve({ resourceType: 'Bundle', total: 0 } as Bundle),
    );
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'o1',
      status: 'final',
      code: { text: 'glucose' },
    };
    const { container } = render(wrap(<IncomingReferencesPanel resource={obs} />));
    await waitFor(() => expect(screen.getByText('DiagnosticReport')).toBeTruthy());
    // Find the DiagnosticReport card and click it
    const cards = container.querySelectorAll('[class*=Card]');
    const drCard = Array.from(cards).find((c) => c.textContent?.includes('DiagnosticReport'));
    expect(drCard).toBeTruthy();
    fireEvent.click(drCard as Element);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/explorer/DiagnosticReport?result=Observation/o1');
  });

  it('structural equivalence: both wrappers with identical entries+refValues produce same DOM (D-16 cross-wrapper invariant)', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({ resourceType: 'Bundle', total: 5 } as Bundle),
    );
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'o1',
      status: 'final',
      code: { text: 'glucose' },
    };
    const observationEntries = reverseReferenceCatalog.Observation!;

    // Render IncomingReferencesPanel
    const { container: incomingC, unmount: unmountIncoming } = render(
      wrap(<IncomingReferencesPanel resource={obs} />),
    );
    await waitFor(() => expect(incomingC.querySelector('[class*=Card]')).toBeTruthy());
    const incomingCards = Array.from(incomingC.querySelectorAll('[class*=Card]'))
      .map((c) => c.textContent);
    unmountIncoming();
    mockGet.mockClear();

    // Render equivalent RelatedResourcesPanel directly
    const { container: sharedC } = render(
      wrap(
        <RelatedResourcesPanel
          title="Referenced By"
          entries={observationEntries}
          refValue="Observation/o1"
          onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Observation/o1`}
        />,
      ),
    );
    await waitFor(() => expect(sharedC.querySelector('[class*=Card]')).toBeTruthy());
    const sharedCards = Array.from(sharedC.querySelectorAll('[class*=Card]'))
      .map((c) => c.textContent);

    expect(incomingCards.length).toBeGreaterThan(0);
    expect(incomingCards).toEqual(sharedCards);
  });
});
