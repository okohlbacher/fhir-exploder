/**
 * PEEK-05 surfaces 3+4 RelatedResourcesPanel Cmd+click integration tests
 * (Plan 02 Task 2).
 *
 * Covers three end-to-end behaviors:
 *   1. Cmd+click on populated Card → searchResources(type, {param: refValue,
 *      _count: '1'}) → openPeek(first, ...) → drawer shows '<Type>/<id>'.
 *   2. Cmd+click when fetch rejects/empty → openPeekError → drawer shows
 *      'Reference unresolvable' body + raw reference title; NO toast.
 *   3. Plain click → existing navigate(onCardNavigate(e)) regression preserved;
 *      no drawer, no peek fetch.
 *
 * Mock harness mirrors src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx
 * (Phase 48) for the count-fetch shape + adds searchResources mock for the
 * one-shot peek fetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { Bundle } from '@medplum/fhirtypes';
import { PeekProvider } from '../contexts/PeekContext';
import { JsonPeekDrawer } from '../components/json/JsonPeekDrawer';
import { RelatedResourcesPanel } from '../components/explorer/RelatedResourcesPanel';
import type { ReverseReferenceEntry } from '../utils/reverseReferenceCatalog';

// ---------------------------------------------------------------------------
// Polyfills
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
const mockGet = vi.fn();
const mockSearchResources = vi.fn();

// Stable client reference (Phase 48 idiom — new object per useMedplum() call
// would cause infinite useEffect re-fire in RelatedResourcesPanel).
const stableClient = {
  get: mockGet,
  fhirUrl: (p: string) => ({ toString: () => `http://test/fhir/${p}` }),
  searchResources: mockSearchResources,
};

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => stableClient,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

// Module-scoped stable entries (Phase 48 Pitfall 2 — never inline arrays in JSX).
const SAMPLE_ENTRIES: readonly ReverseReferenceEntry[] = [
  { type: 'Observation', param: 'subject' },
];

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function renderPanel() {
  return render(
    <MantineProvider env="test">
      <MemoryRouter>
        <PeekProvider>
          <RelatedResourcesPanel
            title="Test"
            entries={SAMPLE_ENTRIES}
            refValue="Patient/p1"
            onCardNavigate={(e) =>
              `/explorer/${e.type}?${e.param}=Patient/p1`
            }
          />
          <JsonPeekDrawer />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** Wait until the populated Card has rendered (count fetch resolved > 0). */
async function waitForPopulatedCard(): Promise<HTMLElement> {
  return waitFor(
    () => {
      // Once populated, the Card renders <Text>Observation</Text> + the
      // count Badge. The loading-skeleton Card path renders <Loader>
      // instead of the Badge, so the badge presence disambiguates.
      const badges = document.querySelectorAll('[class*="Badge"]');
      if (badges.length === 0) throw new Error('badge not yet ready');
      const populated = screen.getByText('Observation');
      return populated;
    },
    { timeout: 3000 },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RelatedResourcesPanel Cmd+click peek (PEEK-05)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSearchResources.mockReset();
    mockGet.mockReset();
    // Default: count fetch returns total=5 so the populated Card renders.
    mockGet.mockResolvedValue({
      resourceType: 'Bundle',
      total: 5,
    } as Bundle);
  });

  it('Cmd+click on Card opens drawer with first matching resource', async () => {
    mockSearchResources.mockResolvedValue([
      { resourceType: 'Observation', id: 'obs-1' },
    ]);

    renderPanel();

    const cardText = await waitForPopulatedCard();
    const card = (cardText.closest('[class*="Card"]') ?? cardText) as HTMLElement;

    await act(async () => {
      fireEvent.click(card, { metaKey: true });
    });

    await waitFor(() => {
      expect(screen.getByText('Observation/obs-1')).toBeTruthy();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSearchResources).toHaveBeenCalledWith('Observation', {
      subject: 'Patient/p1',
      _count: '1',
    });
  });

  it('Cmd+click on Card with empty/rejected fetch opens error drawer (no toast)', async () => {
    mockSearchResources.mockRejectedValueOnce(new Error('boom'));

    renderPanel();

    const cardText = await waitForPopulatedCard();
    const card = (cardText.closest('[class*="Card"]') ?? cardText) as HTMLElement;

    await act(async () => {
      fireEvent.click(card, { metaKey: true });
    });

    await waitFor(() => {
      expect(screen.getByText('Reference unresolvable')).toBeTruthy();
    });

    // Drawer title shows raw reference text per D-04.
    expect(
      screen.getByText('Observation?subject=Patient/p1'),
    ).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('plain click (no modifier) navigates to filtered explorer view (regression)', async () => {
    mockSearchResources.mockResolvedValue([
      { resourceType: 'Observation', id: 'obs-1' },
    ]);

    renderPanel();

    const cardText = await waitForPopulatedCard();
    const card = (cardText.closest('[class*="Card"]') ?? cardText) as HTMLElement;

    fireEvent.click(card); // no modifier

    expect(mockNavigate).toHaveBeenCalledWith(
      '/explorer/Observation?subject=Patient/p1',
    );
    expect(mockSearchResources).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /Open full →/ }),
    ).toBeNull();
  });
});
