import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider } from '../contexts/PeekContext';

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

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockOutletContext = {
  capability: {
    resourceType: 'CapabilityStatement',
    rest: [
      {
        mode: 'server',
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }], searchParam: [] },
        ],
      },
    ],
  },
  client: {
    search: vi.fn(),
    get: vi.fn(async () => ({ resourceType: 'Bundle', total: 0 })),
    fhirUrl: (url: string) => ({ toString: () => url }),
  },
};
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useOutletContext: () => mockOutletContext,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

// Mock Medplum React: SearchControl is heavy — stub it out so the page renders.
vi.mock('@medplum/react', () => ({
  SearchControl: (props: Record<string, unknown>) => (
    <div data-testid="search-control" data-search={JSON.stringify(props.search)} />
  ),
}));

// Mock Medplum React hooks
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({
    search: vi.fn(),
    get: vi.fn(async () => ({ resourceType: 'Bundle', total: 0 })),
    fhirUrl: (url: string) => ({ toString: () => url }),
  }),
}));

import { PatientListPage } from '../components/patients/PatientListPage';

// Phase 53 Plan 02 Task 3: PatientListPage now consumes usePeek() for the
// J-shortcut PEEK-05 affordance. Wrap in PeekProvider; add MemoryRouter
// because the page also wires useNavigate via the J → openPeek path.
function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <PeekProvider>
          <PatientListPage />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('PatientListPage', () => {
  it('exports PatientListPage component', () => {
    expect(PatientListPage).toBeDefined();
    expect(typeof PatientListPage).toBe('function');
  });

  it('renders the "Patients" page heading', () => {
    renderPage();
    const headings = screen.getAllByText('Patients');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('renders filter fields: Name, Identifier, Age from, Age to, Gender', () => {
    renderPage();
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Identifier')).toBeDefined();
    expect(screen.getByLabelText('Age from')).toBeDefined();
    expect(screen.getByLabelText('Age to')).toBeDefined();
    // "Gender" also appears as a table column header; disambiguate with placeholder.
    expect(screen.getByPlaceholderText('All')).toBeDefined();
  });

  it('renders placeholders matching current copy', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search by name...')).toBeDefined();
    expect(screen.getByPlaceholderText('ID, prefix*, or system|value')).toBeDefined();
    expect(screen.getByPlaceholderText('Min')).toBeDefined();
    expect(screen.getByPlaceholderText('Max')).toBeDefined();
  });

  it('renders "Search Patients" submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Search Patients' })).toBeDefined();
  });
});
