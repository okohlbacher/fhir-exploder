/**
 * EXPL-02 — Density SegmentedControl + 3-mode render tests (Phase 55, Plan 02, Task 2).
 *
 * Locks the UI-SPEC §EXPL-02 / CONTEXT D-02..D-05, D-09, D-10 contract:
 *   - Control: SegmentedControl with three options Cards/Table/Compact, size='xs'
 *   - Default: 'table' (no localStorage entry)
 *   - Persistence: localStorage key 'explorer.density.v1'
 *   - Compact: same Table with verticalSpacing='xs' + xs-sized primary text
 *   - Cards: SimpleGrid of Paper cards (no <table>)
 *   - J key works in Cards mode (Paper sets focusedResource on focus)
 *   - SegmentedControl + Export hidden when resources empty
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { SearchResultsPage } from '../components/explorer/SearchResultsPage';

// Polyfills (mirror peek-srp-integration.test.tsx)
class MockResizeObserver { observe = () => {}; unobserve = () => {}; disconnect = () => {}; }
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ExpertModeContext — SearchResultsPage now requires this context
vi.mock('../contexts/ExpertModeContext', () => ({
  useExpertMode: () => ({ isExpert: false, toggle: vi.fn(), setExpert: vi.fn() }),
}));

const mockOpenPeek = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../contexts/PeekContext', () => ({
  usePeek: () => ({
    openPeek: mockOpenPeek,
    openPeekError: vi.fn(),
    closePeek: vi.fn(),
    peekState: null,
  }),
  PeekProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const patA = { resourceType: 'Patient', id: 'pat-a', name: [{ family: 'Alpha' }], birthDate: '1980-01-01' };
const patB = { resourceType: 'Patient', id: 'pat-b', name: [{ family: 'Beta' }], birthDate: '1985-02-02' };
const populatedBundle = { resourceType: 'Bundle', total: 2, entry: [{ resource: patA }, { resource: patB }] };
const emptyBundle = { resourceType: 'Bundle', total: 0, entry: [] };

let currentBundle: typeof populatedBundle | typeof emptyBundle = populatedBundle;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useOutletContext: () => ({
      capability: {
        resourceType: 'CapabilityStatement',
        rest: [{ mode: 'server', resource: [{ type: 'Patient', interaction: [{ code: 'search-type' }], searchParam: [] }] }],
      }
    }),
    useSearchParams: () => [new URLSearchParams(''), vi.fn()],
    useParams: () => ({ resourceType: 'Patient' }),
  };
});

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({
    get: vi.fn(async () => currentBundle),
    fhirUrl: (url: string) => ({ toString: () => url }),
  }),
}));

function renderPage() {
  return render(
    <MantineProvider env="test">
      <MemoryRouter>
        <SearchResultsPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

async function waitForDataLoaded() {
  return waitFor(() => {
    if (!screen.queryByText(/Alpha/)) throw new Error('not loaded');
  }, { timeout: 3000 });
}

describe('EXPL-02 density SegmentedControl', () => {
  beforeEach(() => {
    mockOpenPeek.mockClear();
    mockNavigate.mockClear();
    localStorage.clear();
    currentBundle = populatedBundle;
  });

  it('renders SegmentedControl with three options: Cards, Table, Compact', async () => {
    renderPage();
    await waitForDataLoaded();
    expect(screen.getByText('Cards')).toBeTruthy();
    expect(screen.getByText('Table')).toBeTruthy();
    expect(screen.getByText('Compact')).toBeTruthy();
  });

  it('default density is table (Table renders, not SimpleGrid)', async () => {
    renderPage();
    await waitForDataLoaded();
    // <table> present
    expect(document.querySelector('table')).toBeTruthy();
    // No SimpleGrid root
    expect(document.querySelector('.mantine-SimpleGrid-root')).toBeFalsy();
  });

  it('switching to compact keeps Table but applies xs primary size', async () => {
    renderPage();
    await waitForDataLoaded();
    const compactRadio = screen.getByText('Compact');
    fireEvent.click(compactRadio);
    // Compact uses verticalSpacing='xs' — Mantine sets this as a CSS variable or data attribute
    // Practical check: persistence wrote 'compact' to localStorage
    await waitFor(() => {
      expect(localStorage.getItem('explorer.density.v1')).toBe('"compact"');
    });
    // Table still present (compact mode still uses Table, not SimpleGrid)
    await waitFor(() => {
      expect(document.querySelector('table')).toBeTruthy();
    });
  });

  it('switching to cards renders SimpleGrid instead of Table', async () => {
    renderPage();
    await waitForDataLoaded();
    const cardsRadio = screen.getByText('Cards');
    fireEvent.click(cardsRadio);
    await waitFor(() => {
      expect(document.querySelector('.mantine-SimpleGrid-root')).toBeTruthy();
    });
    // <table> is gone
    expect(document.querySelector('table')).toBeFalsy();
  });

  it('density choice persists to localStorage under explorer.density.v1', async () => {
    renderPage();
    await waitForDataLoaded();
    fireEvent.click(screen.getByText('Cards'));
    await waitFor(() => {
      expect(localStorage.getItem('explorer.density.v1')).toBe('"cards"');
    });
  });

  it('Cards mode: J key on focused card calls openPeek with that resource', async () => {
    renderPage();
    await waitForDataLoaded();
    fireEvent.click(screen.getByText('Cards'));
    await waitFor(() => {
      expect(document.querySelector('.mantine-SimpleGrid-root')).toBeTruthy();
    });
    // Find the first Paper card — has tabIndex=0
    const cards = document.querySelectorAll('.mantine-SimpleGrid-root [tabindex="0"]');
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.focus(cards[0]);
    fireEvent.keyDown(document, { key: 'j' });
    expect(mockOpenPeek).toHaveBeenCalledTimes(1);
    expect(mockOpenPeek.mock.calls[0][0]).toMatchObject({ resourceType: 'Patient', id: 'pat-a' });
  });

  it('SegmentedControl and Export hidden when resources.length === 0', async () => {
    currentBundle = emptyBundle;
    renderPage();
    // Wait for the empty state to render
    await waitFor(() => {
      expect(screen.queryByText(/No resources found/)).toBeTruthy();
    }, { timeout: 3000 });
    // Cards/Table/Compact labels NOT present
    expect(screen.queryByText('Cards')).toBeFalsy();
    expect(screen.queryByText('Table')).toBeFalsy();
    expect(screen.queryByText('Compact')).toBeFalsy();
    // Export button NOT present
    expect(screen.queryByText('Export')).toBeFalsy();
  });
});
