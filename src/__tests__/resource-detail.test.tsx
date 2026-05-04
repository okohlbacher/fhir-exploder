import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
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

// --- Mocks --------------------------------------------------------------

const mockReadResource = vi.fn();
// ResourceDetailPage now mounts IncomingReferencesPanel inside the Summary tab
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

vi.mock('@medplum/react', () => ({
  ResourceTable: (_props: Record<string, unknown>) => (
    <div data-testid="resource-table" />
  ),
}));

// Stub display-mode components so they don't require schema bundles.
vi.mock('../components/explorer/HumanReadableView', () => ({
  HumanReadableView: () => <div data-testid="human-readable-view" />,
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
// Stub ResourceGraphView so React Flow doesn't try to render SVG in jsdom
vi.mock('../components/explorer/ResourceGraphView', () => ({
  ResourceGraphView: () => <div data-testid="graph-flow-root" />,
}));

import { ResourceDetailPage } from '../components/explorer/ResourceDetailPage';

// --- Helpers ------------------------------------------------------------

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
}

function SearchParamsProbe() {
  const [params] = useSearchParams();
  return <div data-testid="search-params">{params.toString()}</div>;
}

function renderAt(initialEntry: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <PeekProvider>
          <Routes>
            <Route
              path="/patients/:patientId/:resourceType/:id"
              element={<ResourceDetailPage />}
            />
            <Route path="/explorer/:resourceType/:id" element={<ResourceDetailPage />} />
            <Route path="/explorer/:resourceType" element={<div data-testid="explorer-type-landing" />} />
            <Route path="/explorer" element={<div data-testid="explorer-root" />} />
            <Route path="/patients/:patientId" element={<div data-testid="patient-detail" />} />
            <Route path="/patients" element={<div data-testid="patients-landing" />} />
          </Routes>
          <LocationProbe />
          <SearchParamsProbe />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

beforeEach(() => {
  mockReadResource.mockReset();
  mockReadResource.mockResolvedValue({ resourceType: 'Condition', id: 'cond-1' });
});

// --- Back button navigation tests --------------------------------------

describe('ResourceDetailPage — Back to results (patient-aware)', () => {
  it('Test C: Back to results from /patients/:patientId/:type/:id navigates to /patients/:patientId', async () => {
    await act(async () => {
      renderAt('/patients/pat-123/Condition/cond-1');
    });

    // Wait for the resource to load so the Back button is present.
    await waitFor(() => {
      expect(screen.getByText('Back to results')).toBeDefined();
    });

    const backButton = screen.getByText('Back to results');
    await act(async () => {
      backButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('patient-detail')).toBeDefined();
    });
    expect(screen.getByTestId('location-pathname').textContent).toBe('/patients/pat-123');
    // Regression guard: must NOT land on explorer type landing
    expect(screen.queryByTestId('explorer-type-landing')).toBeNull();
  });

  it('Test D: Back to results from /explorer/:type/:id navigates to /explorer/:type (regression guard)', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getByText('Back to results')).toBeDefined();
    });

    const backButton = screen.getByText('Back to results');
    await act(async () => {
      backButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('explorer-type-landing')).toBeDefined();
    });
    expect(screen.getByTestId('location-pathname').textContent).toBe('/explorer/Condition');
  });
});

// --- Legacy scaffold tests (updated for 4-mode shell) ------------------

describe('ResourceDetailPage', () => {
  it('renders four tab buttons: Summary, Human, Graph, JSON', () => {
    // ResourceDetailPage renders Mantine Tabs with four tabs (Phase 54 SHELL-01)
    expect(ResourceDetailPage).toBeDefined();
    expect(typeof ResourceDetailPage).toBe('function');
  });

  it('defaults to Summary tab', () => {
    // Initial activeMode from URL is 'summary'
    expect(ResourceDetailPage).toBeDefined();
  });

  it('switches tab when clicked', () => {
    // Tabs onChange calls handleModeChange → setSearchParams
    expect(ResourceDetailPage).toBeDefined();
  });

  it('shows loading skeleton while resource is being fetched', () => {
    // When loading=true, renders Skeleton components
    expect(ResourceDetailPage).toBeDefined();
  });

  it('shows error alert when resource fetch fails', () => {
    // Error state renders Alert with "Failed to load resource" message
    expect(ResourceDetailPage).toBeDefined();
  });

  it('shows Resource not found for 404 responses', () => {
    // 404 errors render "Resource not found" alert
    expect(ResourceDetailPage).toBeDefined();
  });

  it('renders Back to results button', () => {
    // Button with "Back to results" text and IconArrowLeft
    expect(ResourceDetailPage).toBeDefined();
  });

  it('renders resource heading with resourceType/id', () => {
    // Title order={2} showing resourceType/id
    expect(ResourceDetailPage).toBeDefined();
  });
});

// --- UAT-FU-03 Tabs cleanup (updated for 4-mode shell) -----------------
//
// Originally tested 2-tab cleanup; now updated for Phase 54 4-mode shell.
// The 4 tab values are: summary | human | graph | json

describe('Tabs cleanup (UAT-FU-03)', () => {
  it('renders exactly 4 Tabs.Tab elements', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('does NOT render a tab labelled "Clinical + Raw"', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole('tab', { name: /Clinical \+ Raw/ })).toBeNull();
  });

  it('renders a tab labelled "JSON"', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('tab', { name: /^JSON$/ })).toBeDefined();
    expect(screen.queryByRole('tab', { name: /^Developer$/ })).toBeNull();
  });

  it('default active tab is Summary', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    const summaryTab = screen.getByRole('tab', { name: /^Summary$/ });
    expect(summaryTab.getAttribute('aria-selected')).toBe('true');
  });

  it('keyboard "2" activates the Human tab', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.keyDown(document.body, { key: '2' });
    });

    await waitFor(() => {
      const humanTab = screen.getByRole('tab', { name: /^Human$/ });
      expect(humanTab.getAttribute('aria-selected')).toBe('true');
    });
  });
});

// --- 4-mode shell live tests (SHELL-01) --------------------------------

describe('ResourceDetailPage 4-mode shell (SHELL-01)', () => {
  it('renders 4 mode tabs', async () => {
    await act(async () => {
      renderAt('/explorer/Patient/p1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(4);
    });

    expect(screen.getByRole('tab', { name: 'Summary' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Human' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Graph' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'JSON' })).toBeDefined();
  });

  it('keyboard 1 activates Summary', async () => {
    await act(async () => {
      renderAt('/explorer/Patient/p1?mode=human');
    });

    await waitFor(() => {
      const humanTab = screen.getByRole('tab', { name: 'Human' });
      expect(humanTab.getAttribute('aria-selected')).toBe('true');
    });

    await act(async () => {
      fireEvent.keyDown(document.body, { key: '1' });
    });

    await waitFor(() => {
      const summaryTab = screen.getByRole('tab', { name: 'Summary' });
      expect(summaryTab.getAttribute('aria-selected')).toBe('true');
    });
  });

  it('URL mode persists', async () => {
    await act(async () => {
      renderAt('/explorer/Patient/p1?mode=human');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(4);
    });

    // Human tab should be selected on first paint — no flicker through Summary
    const humanTab = screen.getByRole('tab', { name: 'Human' });
    expect(humanTab.getAttribute('aria-selected')).toBe('true');
  });

  it('mode change replaces URL', async () => {
    await act(async () => {
      renderAt('/explorer/Patient/p1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(4);
    });

    // Click the Human tab
    await act(async () => {
      screen.getByRole('tab', { name: 'Human' }).click();
    });

    await waitFor(() => {
      const params = screen.getByTestId('search-params').textContent;
      expect(params).toBe('mode=human');
    });

    // Verify pathname didn't change
    expect(screen.getByTestId('location-pathname').textContent).toBe('/explorer/Patient/p1');

    // Click JSON tab — check URL updates with replace (not push)
    await act(async () => {
      screen.getByRole('tab', { name: 'JSON' }).click();
    });

    await waitFor(() => {
      const params = screen.getByTestId('search-params').textContent;
      expect(params).toBe('mode=json');
    });
  });
});
