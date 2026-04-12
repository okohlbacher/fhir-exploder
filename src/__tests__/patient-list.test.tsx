import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

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
  client: { search: vi.fn() },
};
vi.mock('react-router-dom', () => ({
  useOutletContext: () => mockOutletContext,
  useNavigate: () => mockNavigate,
}));

// Mock Medplum React: SearchControl is heavy — stub it out so the page renders.
vi.mock('@medplum/react', () => ({
  SearchControl: (props: Record<string, unknown>) => (
    <div data-testid="search-control" data-search={JSON.stringify(props.search)} />
  ),
}));

// Mock Medplum React hooks
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ search: vi.fn() }),
}));

import { PatientListPage } from '../components/patients/PatientListPage';

function renderPage() {
  return render(
    <MantineProvider>
      <PatientListPage />
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

  it('renders three search fields: Name, Identifier, Birth Date', () => {
    renderPage();
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Identifier')).toBeDefined();
    expect(screen.getByLabelText('Birth Date')).toBeDefined();
  });

  it('renders placeholders matching UI-SPEC copy', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search by name...')).toBeDefined();
    expect(screen.getByPlaceholderText('Search by identifier...')).toBeDefined();
    expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeDefined();
  });

  it('renders "Search Patients" submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Search Patients' })).toBeDefined();
  });

  it('shows "Browse Patients" empty state before any search is triggered', () => {
    renderPage();
    expect(screen.getByText('Browse Patients')).toBeDefined();
    expect(
      screen.getByText(
        /Use the search fields above to find patients/
      )
    ).toBeDefined();
  });
});
