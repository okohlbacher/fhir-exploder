/**
 * PEEK-05 surface 2 PatientListPage J shortcut integration tests
 * (Plan 02 Task 3).
 *
 * Mirrors src/__tests__/peek-srp-integration.test.tsx (Phase 52) byte-for-byte
 * where possible; only the page component (PatientListPage) and router param
 * mocks differ.
 *
 * Covers three behaviors:
 *   1. J on focused patient row → openPeek(patient, ...) → drawer opens
 *   2. J without focused row → silent no-op (UI-SPEC empty state)
 *   3. J while INPUT in filter card focused → silent no-op (useShortcuts guard)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider } from '../contexts/PeekContext';
import { JsonPeekDrawer } from '../components/json/JsonPeekDrawer';
import { PatientListPage } from '../components/patients/PatientListPage';

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
const mockSetUrlParams = vi.fn();

const patA = { resourceType: 'Patient', id: 'pat-a', name: [{ family: 'Aaa' }] };
const patB = { resourceType: 'Patient', id: 'pat-b', name: [{ family: 'Bbb' }] };
const mockBundle = {
  resourceType: 'Bundle',
  total: 2,
  entry: [{ resource: patA }, { resource: patB }],
};

const mockClient = {
  // Patient list bundle on the initial Patient?_count=20 request and
  // an empty $everything response for each PatientRow's per-patient summary.
  get: vi.fn(async (url: string) => {
    if (url.includes('$everything')) {
      return { resourceType: 'Bundle', total: 0, entry: [] };
    }
    return mockBundle;
  }),
  fhirUrl: (url: string) => ({ toString: () => url }),
  searchResources: vi.fn(),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useOutletContext: () => ({ client: mockClient }),
    useSearchParams: () => [new URLSearchParams(''), mockSetUrlParams],
  };
});

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mockClient,
}));

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <MantineProvider env="test">
      <MemoryRouter>
        <PeekProvider>
          <PatientListPage />
          <JsonPeekDrawer />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

async function waitForRows(): Promise<HTMLElement[]> {
  return waitFor(
    () => {
      const rows = screen.getAllByRole('row');
      // header + at least 2 data rows
      if (rows.length < 3) {
        throw new Error('rows not ready: ' + rows.length);
      }
      return rows;
    },
    { timeout: 3000 },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PatientListPage J shortcut (PEEK-05)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetUrlParams.mockClear();
    mockClient.searchResources.mockReset();
  });

  it('J on focused patient row opens the drawer', async () => {
    renderPage();

    const rows = await waitForRows();
    // Focus the first data row (pat-a). onFocus → setFocusedPatient(p).
    fireEvent.focus(rows[1]);

    // Press J — useShortcuts handler should now fire with focusedPatient=patA.
    fireEvent.keyDown(document, { key: 'j' });

    // Drawer title is `Patient/pat-a` (in the success branch of JsonPeekDrawer).
    expect(screen.getByText('Patient/pat-a')).toBeTruthy();
  });

  it('J without a focused row does nothing (silent no-op)', async () => {
    renderPage();

    await waitForRows();

    // Ensure no row is focused
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }

    fireEvent.keyDown(document, { key: 'j' });

    expect(screen.queryByText('Patient/pat-a')).toBeNull();
    expect(screen.queryByText('Patient/pat-b')).toBeNull();
  });

  it('J does NOT open drawer when an INPUT in filter card is focused (input-focus guard)', async () => {
    renderPage();

    await waitForRows();

    const inputs = document.querySelectorAll('input');
    if (inputs.length > 0) {
      await act(async () => {
        (inputs[0] as HTMLInputElement).focus();
      });
    }

    fireEvent.keyDown(document, { key: 'j' });

    expect(screen.queryByText('Patient/pat-a')).toBeNull();
    expect(screen.queryByText('Patient/pat-b')).toBeNull();
  });
});
