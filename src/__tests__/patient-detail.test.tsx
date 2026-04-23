import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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

// --- Mocks --------------------------------------------------------------

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();
const mockCapability = {
  resourceType: 'CapabilityStatement',
  rest: [
    {
      mode: 'server',
      resource: [
        {
          type: 'Condition',
          interaction: [{ code: 'search-type' }],
          searchParam: [{ name: 'patient' }],
        },
        {
          type: 'Observation',
          interaction: [{ code: 'search-type' }],
          searchParam: [{ name: 'patient' }, { name: 'subject' }],
        },
      ],
    },
  ],
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  useOutletContext: () => ({ capability: mockCapability, client: {} }),
}));

// readResource mock for the patient fetch. The client object is stable across
// renders so PatientDetailPage's useEffect does not re-run on every render.
const mockReadResource = vi.fn();
const mockGet = vi.fn(async () => ({ resourceType: 'Bundle', total: 0 }));
const mockClient = {
  readResource: mockReadResource,
  get: mockGet,
  fhirUrl: (url: string) => ({ toString: () => url }),
};

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mockClient,
}));

// Stub heavy Medplum React components so jsdom doesn't choke on them.
vi.mock('@medplum/react', () => ({
  PatientHeader: (props: { patient: { id?: string } }) => (
    <div data-testid="patient-header">PatientHeader:{props.patient?.id}</div>
  ),
  SearchControl: (props: Record<string, unknown>) => (
    <div data-testid="search-control" data-search={JSON.stringify(props.search)} />
  ),
}));

import { PatientDetailPage } from '../components/patients/PatientDetailPage';

// --- Helpers ------------------------------------------------------------

function renderPage() {
  return render(
    <MantineProvider>
      <PatientDetailPage />
    </MantineProvider>
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockReadResource.mockReset();
  mockUseParams.mockReset();
  mockUseParams.mockReturnValue({ patientId: 'abc-123' });
});

// --- Tests --------------------------------------------------------------

describe('PatientDetailPage', () => {
  it('exports PatientDetailPage component', () => {
    expect(PatientDetailPage).toBeDefined();
    expect(typeof PatientDetailPage).toBe('function');
  });

  it('renders loading skeleton while patient resource is loading', () => {
    // readResource returns a never-resolving promise to keep the loading state
    mockReadResource.mockReturnValue(new Promise(() => {}));

    const { container } = renderPage();

    // Skeleton placeholders have role="presentation" or just show as rendered
    // divs; we assert the PatientHeader is NOT rendered yet.
    expect(screen.queryByTestId('patient-header')).toBeNull();
    // And the SegmentedControl is NOT rendered yet either.
    expect(screen.queryByText('MII Modules')).toBeNull();
    // Breadcrumbs fallback uses Patient/{id} when name is unknown.
    expect(container.textContent).toContain('Patient/abc-123');
  });

  it('renders PatientHeader, SegmentedControl, and MII tabs after loading succeeds', async () => {
    mockReadResource.mockResolvedValue({
      resourceType: 'Patient',
      id: 'abc-123',
      name: [{ given: ['Anna'], family: 'Mueller' }],
    });

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('MII Modules')).toBeDefined();
    });

    // SegmentedControl rendered with both options
    expect(screen.getByText('MII Modules')).toBeDefined();
    expect(screen.getByText('FHIR Resources')).toBeDefined();

    // MII module tab labels visible (default view is MII per D-10)
    expect(screen.getByText('Diagnose')).toBeDefined();
    expect(screen.getByText('Prozedur')).toBeDefined();
    expect(screen.getByText('Laborbefund')).toBeDefined();
    expect(screen.getByText('Medikation')).toBeDefined();
    expect(screen.getByText('Fall')).toBeDefined();
    // Patient name shows in breadcrumb trailing text AND PatientHeaderCard title
    // (two instances after the redesign — use getAllByText).
    expect(screen.getAllByText('Anna Mueller').length).toBeGreaterThan(0);
  });

  it('defaults to MII Modules view (D-10) -- MII tab labels visible, FHIR view text not', async () => {
    mockReadResource.mockResolvedValue({
      resourceType: 'Patient',
      id: 'abc-123',
    });

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('MII Modules')).toBeDefined();
    });

    // MII tabs rendered
    expect(screen.getByText('Diagnose')).toBeDefined();
    // FhirResourcesView placeholder copy should NOT be on screen by default.
    expect(screen.queryByText('FHIR Resources view (Task 2)')).toBeNull();
  });

  it('shows "Patient not found" alert when readResource returns a not-found error', async () => {
    mockReadResource.mockRejectedValue(new Error('Not found'));

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          /Patient not found: Patient\/abc-123 does not exist on this server\./
        )
      ).toBeDefined();
    });
  });

  it('shows generic load-failure alert for other errors', async () => {
    mockReadResource.mockRejectedValue(new Error('Network down'));

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          /Failed to load patient: Could not retrieve Patient\/abc-123\. Check your connection and try again\./
        )
      ).toBeDefined();
    });
  });
});
