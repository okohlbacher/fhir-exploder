import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider } from '../contexts/PeekContext';
import type { Patient, Encounter } from '@medplum/fhirtypes';

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
vi.mock('../components/explorer/ResourceGraphView', () => ({
  ResourceGraphView: () => <div data-testid="graph-flow-root" />,
}));

// These are the real components being tested in Summary mode — don't mock them
// But mock their data dependencies to avoid API calls
vi.mock('../components/explorer/PatientRelatedResources', () => ({
  PatientRelatedResources: ({ patientId }: { patientId: string }) => (
    <div data-testid="patient-related-resources" data-patient-id={patientId} />
  ),
}));
vi.mock('../components/explorer/IncomingReferencesPanel', () => ({
  IncomingReferencesPanel: () => <div data-testid="incoming-references-panel" />,
}));
vi.mock('../components/explorer/KeyFieldsTable', () => ({
  KeyFieldsTable: () => <div data-testid="key-fields-table" />,
}));

import { ResourceDetailPage } from '../components/explorer/ResourceDetailPage';
import { summarizeResource } from '../utils/summarizeResource';

// --- Fixtures -----------------------------------------------------------

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'p-1',
  name: [{ family: 'Smith', given: ['John'] }],
  birthDate: '1980-01-15',
  gender: 'male',
};

const encounterFixture: Encounter = {
  resourceType: 'Encounter',
  id: 'enc-1',
  status: 'finished',
  class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
};

// --- Helpers ------------------------------------------------------------

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
          </Routes>
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

beforeEach(() => {
  mockReadResource.mockReset();
  mockReadResource.mockResolvedValue(encounterFixture);
  mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 0 });
});

// --- Summary mode live tests (SHELL-02) --------------------------------

describe('Summary mode (SHELL-02)', () => {
  it('primary heading', async () => {
    mockReadResource.mockResolvedValue(patientFixture);

    await act(async () => {
      renderAt('/explorer/Patient/p-1?mode=summary');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(4);
    });

    // The Summary tab should be active
    const summaryTab = screen.getByRole('tab', { name: 'Summary' });
    expect(summaryTab.getAttribute('aria-selected')).toBe('true');

    // The primary heading should be summarizeResource(patient).primary
    const expectedPrimary = summarizeResource(patientFixture).primary;
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe(expectedPrimary);
    });
  });

  it('incoming refs in summary', async () => {
    // For a non-Patient resource, IncomingReferencesPanel should render in Summary
    mockReadResource.mockResolvedValue(encounterFixture);

    await act(async () => {
      renderAt('/explorer/Encounter/enc-1?mode=summary');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(4);
    });

    // IncomingReferencesPanel should be inside the Summary panel
    await waitFor(() => {
      expect(screen.getByTestId('incoming-references-panel')).toBeDefined();
    });
  });

  it('patient related in summary', async () => {
    // For a Patient resource with patientId param, PatientRelatedResources renders inside Summary
    mockReadResource.mockResolvedValue(patientFixture);

    await act(async () => {
      renderAt('/patients/p-1/Patient/p-1?mode=summary');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBe(4);
    });

    // PatientRelatedResources should be inside the Summary panel
    await waitFor(() => {
      expect(screen.getByTestId('patient-related-resources')).toBeDefined();
    });
    // IncomingReferencesPanel should NOT be rendered (Patient path uses PatientRelatedResources)
    expect(screen.queryByTestId('incoming-references-panel')).toBeNull();
  });
});
