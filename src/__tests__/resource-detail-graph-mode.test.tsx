import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
  ResourceTable: () => <div data-testid="resource-table" />,
}));
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
// Mock ResourceGraphView so React Flow doesn't try to render SVG in jsdom
vi.mock('../components/explorer/ResourceGraphView', () => ({
  ResourceGraphView: () => <div data-testid="graph-flow-root" />,
}));

import { ResourceDetailPage } from '../components/explorer/ResourceDetailPage';

// --- Helpers ------------------------------------------------------------

function renderAt(initialEntry: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <PeekProvider>
          <Routes>
            <Route path="/explorer/:resourceType/:id" element={<ResourceDetailPage />} />
          </Routes>
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

beforeEach(() => {
  mockReadResource.mockReset();
  mockReadResource.mockResolvedValue({ resourceType: 'Condition', id: 'cond-1' });
});

// --- Graph mode live tests (SHELL-03) ----------------------------------

describe('Graph mode (SHELL-03)', () => {
  it('graph mode lazy', async () => {
    await act(async () => {
      renderAt('/explorer/Condition/cond-1?mode=graph');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(4);
    });

    // Graph tab should be active
    const graphTab = screen.getByRole('tab', { name: 'Graph' });
    expect(graphTab.getAttribute('aria-selected')).toBe('true');

    // The ResourceGraphView mock renders data-testid="graph-flow-root"
    // Since keepMounted defaults to true, all panels are mounted
    await waitFor(() => {
      expect(screen.getByTestId('graph-flow-root')).toBeDefined();
    });
  });
});
