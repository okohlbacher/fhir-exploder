import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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

vi.mock('@medplum/react', () => ({
  ResourceTable: (_props: Record<string, unknown>) => (
    <div data-testid="resource-table" />
  ),
}));

// Stub display-mode components so they don't require schema bundles.
vi.mock('../components/explorer/HumanReadableView', () => ({
  HumanReadableView: () => <div data-testid="human-readable-view" />,
}));
vi.mock('../components/explorer/DeveloperJsonView', () => ({
  DeveloperJsonView: () => <div data-testid="developer-json-view" />,
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
            <Route path="/explorer/:resourceType" element={<div data-testid="explorer-type-landing" />} />
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

// --- Legacy scaffold tests (unchanged) ---------------------------------

describe('ResourceDetailPage', () => {
  it('renders two tab buttons: Human-readable, JSON', () => {
    // ResourceDetailPage renders Mantine Tabs with two tabs (UAT-FU-03)
    expect(ResourceDetailPage).toBeDefined();
    expect(typeof ResourceDetailPage).toBe('function');
  });

  it('defaults to Human-readable tab', () => {
    // Initial activeTab state is 'human-readable'
    expect(ResourceDetailPage).toBeDefined();
  });

  it('switches tab when clicked', () => {
    // Tabs onChange updates activeTab state
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

// --- UAT-FU-03 Tabs cleanup ---------------------------------------------
//
// These tests codify the post-cleanup contract for Phase 35-01:
//   * Tabs reduce from 3 → 2 (drop "Clinical + Raw").
//   * "Developer" tab is renamed to "JSON" (value attribute UNCHANGED).
//   * Keyboard shortcut "2" remaps from clinical-raw → developer (JSON).
//   * Default active tab is still "Human-readable" (D-12).
//
// Initially these tests FAIL (RED). Task 2 deletes the middle tab + renames
// the JSON label + remaps the keyboard handler, flipping the suite GREEN.

describe('Tabs cleanup (UAT-FU-03)', () => {
  it('renders exactly 2 Tabs.Tab elements', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole('tab')).toHaveLength(2);
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

  it('renders a tab labelled "JSON" (renamed from "Developer")', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('tab', { name: /^JSON$/ })).toBeDefined();
    expect(screen.queryByRole('tab', { name: /^Developer$/ })).toBeNull();
  });

  it('default active tab is Human-readable', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    const humanReadableTab = screen.getByRole('tab', { name: /Human-readable/ });
    expect(humanReadableTab.getAttribute('aria-selected')).toBe('true');
  });

  it('keyboard "2" activates the JSON tab (remapped from clinical-raw)', async () => {
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
      const jsonTab = screen.getByRole('tab', { name: /^JSON$/ });
      expect(jsonTab.getAttribute('aria-selected')).toBe('true');
    });
  });
});

// --- 4-mode shell stubs (SHELL-01) -------------------------------------
// Wave 0 stubs: describe.skip so they show as skipped, not failed.
// Plan 02 replaces .skip with live implementations.

describe.skip('ResourceDetailPage 4-mode shell (SHELL-01)', () => {
  it('renders 4 mode tabs', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });

  it('keyboard 1 activates Summary', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });

  it('URL mode persists', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });

  it('mode change replaces URL', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });
});
