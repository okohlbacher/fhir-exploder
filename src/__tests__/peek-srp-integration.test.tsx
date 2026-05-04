/**
 * SearchResultsPage J shortcut integration tests (PEEK-01).
 * Separate file from peek-drawer.test.tsx to avoid mock interaction issues.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider } from '../contexts/PeekContext';
import { JsonPeekDrawer } from '../components/json/JsonPeekDrawer';
import { SearchResultsPage } from '../components/explorer/SearchResultsPage';

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
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// ExpertModeContext — SearchResultsPage now requires this context
vi.mock('../contexts/ExpertModeContext', () => ({
  useExpertMode: () => ({ isExpert: false, toggle: vi.fn(), setExpert: vi.fn() }),
}));

const mockNavigate = vi.fn();

const patA = { resourceType: 'Patient', id: 'pat-a' };
const patB = { resourceType: 'Patient', id: 'pat-b' };
const mockBundle = {
  resourceType: 'Bundle', total: 2,
  entry: [{ resource: patA }, { resource: patB }],
};

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
    get: vi.fn(async () => mockBundle),
    fhirUrl: (url: string) => ({ toString: () => url }),
  }),
}));

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function renderResults() {
  return render(
    <MantineProvider env="test">
      <MemoryRouter>
        <PeekProvider>
          <SearchResultsPage />
          <JsonPeekDrawer />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

async function waitForRows() {
  return waitFor(() => {
    const rows = screen.getAllByRole('row');
    // header + at least 2 data rows
    if (rows.length < 3) throw new Error('rows not ready: ' + rows.length);
    return rows;
  }, { timeout: 3000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchResultsPage J shortcut (PEEK-01)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('J on focused row opens the drawer with that resource', async () => {
    renderResults();

    const rows = await waitForRows();

    // Focus the first data row (pat-a). onFocus → setFocusedResource(r).
    // fireEvent.focus triggers the synthetic React onFocus and flushes
    // the state synchronously within the event handler batch.
    fireEvent.focus(rows[1]);

    // Press J — shortcutsRef.current.j should now be handleJ with focusedResource=patA
    fireEvent.keyDown(document, { key: 'j' });

    // Wait for the drawer to appear
    expect(screen.getByText('Patient/pat-a')).toBeTruthy();
  });

  it('J on a different focused row opens drawer with different resource (PEEK-02)', async () => {
    // NOTE: The "content swap without unmounting" scenario (drawer stays open
    // while resource updates) is verified in peek-drawer.test.tsx (TwoOpeners
    // test). Here we verify that J correctly tracks the focused row across
    // separate open events — close with Esc (focus returns to row 1 via
    // queueMicrotask), then Tab to row 2 and press J again.
    renderResults();

    const rows = await waitForRows();

    // Open drawer with first row (pat-a)
    fireEvent.focus(rows[1]);
    fireEvent.keyDown(document, { key: 'j' });
    expect(screen.getByText('Patient/pat-a')).toBeTruthy();

    // Close drawer with Escape (originElement=rows[1] regains focus via queueMicrotask)
    fireEvent.keyDown(document.body, { key: 'Escape' });

    // Wait for the queueMicrotask from handleClose to run (it calls rows[1].focus()
    // which triggers onFocus→setFocusedResource(patA)). We need to yield to let
    // it settle before focusing row 2.
    await act(async () => { await new Promise<void>((r) => setTimeout(r, 0)); });

    // Re-query rows fresh (they may have been re-rendered)
    const freshRows = screen.getAllByRole('row');

    // Focus row 2 and press J
    fireEvent.focus(freshRows[2]);
    fireEvent.keyDown(document, { key: 'j' });

    expect(screen.getByText('Patient/pat-b')).toBeTruthy();
  });

  it('J without a focused row does nothing (UI-SPEC empty state)', async () => {
    renderResults();

    await waitForRows();

    // Ensure no row is focused
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }

    fireEvent.keyDown(document, { key: 'j' });

    // No drawer title
    expect(screen.queryByText('Patient/pat-a')).toBeNull();
    expect(screen.queryByText('Patient/pat-b')).toBeNull();
  });

  it('J does not open drawer when an INPUT is focused (input-focus guard)', async () => {
    renderResults();

    await waitForRows();

    const inputs = document.querySelectorAll('input');
    if (inputs.length > 0) {
      await act(async () => { (inputs[0] as HTMLInputElement).focus(); });
    }

    fireEvent.keyDown(document, { key: 'j' });

    expect(screen.queryByText('Patient/pat-a')).toBeNull();
    expect(screen.queryByText('Patient/pat-b')).toBeNull();
  });
});
