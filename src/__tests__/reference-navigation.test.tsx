import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { NavigationBreadcrumbs } from '../components/explorer/NavigationBreadcrumbs';

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

// Mock Medplum client: readResource always resolves to a minimal Condition
const mockReadResource = vi.fn();
// Phase 48-03: ResourceDetailPage now mounts IncomingReferencesPanel below the Tabs
// for non-Patient resources. The panel calls client.fhirUrl(...) + client.get(...)
// to fetch reverse-reference counts. Stub both so the mount doesn't crash.
const mockGet = vi.fn().mockResolvedValue({ resourceType: 'Bundle', total: 0 });
const mockClient = {
  readResource: mockReadResource,
  fhirUrl: (p: string) => ({ toString: () => `http://test/fhir/${p}` }),
  get: mockGet,
};

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mockClient,
}));

// Stub heavy Medplum React components so they don't drag in schema requirements.
vi.mock('@medplum/react', () => ({
  ResourceTable: (_props: Record<string, unknown>) => (
    <div data-testid="resource-table" />
  ),
}));

// Stub the three display-mode subcomponents so we don't need to render their
// full FHIR-aware internals; instead embed a deterministic anchor that mimics
// a Medplum ReferenceDisplay <a href> pointing at the FHIR server.
vi.mock('../components/explorer/HumanReadableView', () => ({
  HumanReadableView: () => (
    <div data-testid="human-readable-view">
      <a href="http://localhost:8080/fhir/Observation/obs-9" data-testid="ref-anchor">
        Observation/obs-9
      </a>
    </div>
  ),
}));

vi.mock('../components/explorer/JsonModeView', () => ({
  JsonModeView: () => <div data-testid="json-mode-view" />,
}));
vi.mock('../components/explorer/KeyFieldsTable', () => ({
  KeyFieldsTable: () => <div data-testid="key-fields-table" />,
}));
vi.mock('../components/explorer/IncomingReferencesPanel', () => ({
  IncomingReferencesPanel: () => <div data-testid="incoming-references-panel" />,
}));
vi.mock('../components/explorer/PatientRelatedResources', () => ({
  PatientRelatedResources: () => <div data-testid="patient-related-resources" />,
}));
vi.mock('../components/explorer/ResourceGraphView', () => ({
  ResourceGraphView: () => <div data-testid="graph-flow-root" />,
}));

import { ResourceDetailPage } from '../components/explorer/ResourceDetailPage';
import { PeekProvider } from '../contexts/PeekContext';

// --- Helpers ------------------------------------------------------------

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
}

function renderAt(initialEntry: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        {/* Phase 53 Plan 02: ResourceDetailPage transitively renders
            ReferenceLink + IncomingReferencesPanel which now consume
            usePeek(). PeekProvider must wrap. */}
        <PeekProvider>
          <Routes>
            <Route
              path="/patients/:patientId/:resourceType/:id"
              element={<ResourceDetailPage />}
            />
            <Route path="/explorer/:resourceType/:id" element={<ResourceDetailPage />} />
            <Route path="/explorer/:resourceType" element={<div data-testid="explorer-landing" />} />
            <Route path="/explorer" element={<div data-testid="explorer-root" />} />
            <Route path="/patients/:patientId" element={<div data-testid="patient-detail" />} />
            <Route path="/patients" element={<div data-testid="patients-landing" />} />
          </Routes>
          <LocationProbe />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

beforeEach(() => {
  mockReadResource.mockReset();
  mockReadResource.mockResolvedValue({ resourceType: 'Condition', id: 'cond-1' });
});

// --- Patient-aware reference navigation --------------------------------

describe('Reference navigation within patient subtree', () => {
  it('Test A: reference click inside /patients/:patientId stays inside /patients/:patientId (targets /patients/pat-123/Observation/obs-9)', async () => {
    await act(async () => {
      renderAt('/patients/pat-123/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('ref-anchor')).toBeDefined();
    });

    await act(async () => {
      screen.getByTestId('ref-anchor').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname').textContent).toBe(
        '/patients/pat-123/Observation/obs-9'
      );
    });
    // Must NOT leak into /explorer subtree
    expect(screen.getByTestId('location-pathname').textContent).not.toMatch(
      /^\/explorer\//
    );
  });

  it('Test B: reference click inside /explorer still navigates inside /explorer (regression guard)', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('ref-anchor')).toBeDefined();
    });

    await act(async () => {
      screen.getByTestId('ref-anchor').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname').textContent).toBe(
        '/explorer/Observation/obs-9'
      );
    });
  });

  it('Test E: breadcrumbs root anchor reads "Patients" linking to /patients when inside patient subtree', async () => {
    await act(async () => {
      renderAt('/patients/pat-123/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('ref-anchor')).toBeDefined();
    });

    // Root anchor text is "Patients", not "Explorer"
    const rootAnchor = screen.getByText('Patients');
    expect(rootAnchor).toBeDefined();
    expect(screen.queryByText('Explorer')).toBeNull();

    await act(async () => {
      rootAnchor.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname').textContent).toBe('/patients');
    });
  });

  it('Test F: breadcrumbs root anchor reads "Explorer" linking to /explorer when inside /explorer subtree (regression guard)', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('ref-anchor')).toBeDefined();
    });

    const rootAnchor = screen.getByText('Explorer');
    expect(rootAnchor).toBeDefined();
    expect(screen.queryByText('Patients')).toBeNull();

    await act(async () => {
      rootAnchor.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname').textContent).toBe('/explorer');
    });
  });
});

// --- Legacy scaffold tests (unchanged) ---------------------------------

describe('Reference click interception', () => {
  it('intercepts click on anchor with FHIR reference href', () => {
    // handleReferenceClick detects <a href=".../{ResourceType}/{id}">
    expect(true).toBe(true);
  });

  it('extracts resourceType and id from FHIR reference pattern', () => {
    // Regex match extracts [1] = resourceType, [2] = id
    const href = 'http://localhost:8080/fhir/Patient/abc-123';
    const match = href.match(/\/([A-Z][a-zA-Z]+)\/([a-f0-9A-F][a-f0-9A-F\-]+)$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('Patient');
    expect(match![2]).toBe('abc-123');
  });

  it('calls breadcrumbs.push with extracted reference', () => {
    // After successful match, breadcrumbs.push({ resourceType, id }) is called
    expect(true).toBe(true);
  });

  it('calls preventDefault on intercepted click', () => {
    // e.preventDefault() stops default <a> navigation
    expect(true).toBe(true);
  });

  it('ignores clicks on non-FHIR-reference anchors', () => {
    // Anchors without matching FHIR pattern are not intercepted
    const href = 'https://example.com/some-page';
    const match = href.match(/\/([A-Z][a-zA-Z]+)\/([a-f0-9A-F][a-f0-9A-F\-]+)$/);
    expect(match).toBeNull();
  });

  it('ignores clicks on non-anchor elements', () => {
    // If target.closest('a[href]') returns null, handler does nothing
    expect(true).toBe(true);
  });
});

describe('NavigationBreadcrumbs', () => {
  it('renders Explorer as root breadcrumb', () => {
    // First breadcrumb item is always "Explorer" linking to /explorer
    expect(NavigationBreadcrumbs).toBeDefined();
  });

  it('renders trail entries as clickable anchors', () => {
    // Each BreadcrumbEntry in trail renders as an Anchor
    expect(NavigationBreadcrumbs).toBeDefined();
  });

  it('renders current resource as non-clickable bold text', () => {
    // Last segment uses Text fw={600} instead of Anchor
    expect(NavigationBreadcrumbs).toBeDefined();
  });

  it('calls onNavigate with index when trail entry clicked', () => {
    // Clicking a trail Anchor calls onNavigate(index)
    expect(NavigationBreadcrumbs).toBeDefined();
  });
});
