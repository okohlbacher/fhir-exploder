import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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
const mockSearch = vi.fn();
const mockClient = { search: mockSearch };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mockClient,
}));

vi.mock('@medplum/react', () => ({
  SearchControl: (props: Record<string, unknown>) => (
    <div
      data-testid="search-control"
      data-search={JSON.stringify(props.search)}
    />
  ),
}));

import { FhirResourcesView } from '../components/patients/FhirResourcesView';
import type { CapabilityStatement } from '@medplum/fhirtypes';

// Build a CapabilityStatement with a controllable set of patient-linked types.
function buildCapability(
  resources: Array<{ type: string; params: string[] }>
): CapabilityStatement {
  return {
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: '2026-04-12',
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [
      {
        mode: 'server',
        resource: resources.map((r) => ({
          type: r.type,
          interaction: [{ code: 'search-type' }],
          searchParam: r.params.map((name) => ({ name, type: 'reference' })),
        })),
      },
    ],
  } as CapabilityStatement;
}

function renderView(capability: CapabilityStatement, patientId = 'abc-123') {
  return render(
    <MantineProvider>
      <FhirResourcesView patientId={patientId} capability={capability} />
    </MantineProvider>
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockSearch.mockReset();
});

// --- Tests --------------------------------------------------------------

describe('FhirResourcesView', () => {
  it('exports FhirResourcesView component', () => {
    expect(FhirResourcesView).toBeDefined();
    expect(typeof FhirResourcesView).toBe('function');
  });

  it('renders resource type rows from capability (patient/subject params)', async () => {
    // Medication lacks patient/subject (won't appear); the other three do.
    const capability = buildCapability([
      { type: 'Condition', params: ['patient'] },
      { type: 'Observation', params: ['patient', 'subject'] },
      { type: 'Encounter', params: ['subject'] },
      { type: 'Medication', params: ['code'] },
    ]);

    mockSearch.mockImplementation((type: string) => {
      // Return positive counts so rows remain visible.
      const totals: Record<string, number> = {
        Condition: 12,
        Observation: 45,
        Encounter: 8,
      };
      return Promise.resolve({ resourceType: 'Bundle', total: totals[type] ?? 0 });
    });

    await act(async () => {
      renderView(capability);
    });

    await waitFor(() => {
      expect(screen.getByText('Condition')).toBeDefined();
      expect(screen.getByText('Observation')).toBeDefined();
      expect(screen.getByText('Encounter')).toBeDefined();
    });

    // Medication is NOT linked -> should not be rendered.
    expect(screen.queryByText('Medication')).toBeNull();

    // Count badges are visible for each.
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('45')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
  });

  it('uses patient= query when type has patient param, subject= when only subject', async () => {
    const capability = buildCapability([
      { type: 'Condition', params: ['patient'] },
      { type: 'Encounter', params: ['subject'] },
    ]);

    mockSearch.mockResolvedValue({ resourceType: 'Bundle', total: 1 });

    await act(async () => {
      renderView(capability, 'pat-7');
    });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });

    // Assert the two distinct query strings
    const calls = mockSearch.mock.calls;
    const conditionCall = calls.find((c) => c[0] === 'Condition');
    const encounterCall = calls.find((c) => c[0] === 'Encounter');
    expect(conditionCall?.[1]).toBe('patient=Patient/pat-7&_summary=count');
    expect(encounterCall?.[1]).toBe('subject=Patient/pat-7&_summary=count');
  });

  it('hides resource types with a count of 0', async () => {
    const capability = buildCapability([
      { type: 'Condition', params: ['patient'] },
      { type: 'Procedure', params: ['patient'] },
    ]);

    mockSearch.mockImplementation((type: string) => {
      const totals: Record<string, number> = { Condition: 5, Procedure: 0 };
      return Promise.resolve({ resourceType: 'Bundle', total: totals[type] ?? 0 });
    });

    await act(async () => {
      renderView(capability);
    });

    await waitFor(() => {
      expect(screen.getByText('Condition')).toBeDefined();
    });
    // Procedure had count 0 -> hidden.
    expect(screen.queryByText('Procedure')).toBeNull();
  });

  it('toggles expansion when a resource type row is clicked', async () => {
    const capability = buildCapability([
      { type: 'Condition', params: ['patient'] },
    ]);
    mockSearch.mockResolvedValue({ resourceType: 'Bundle', total: 3 });

    await act(async () => {
      renderView(capability);
    });

    await waitFor(() => {
      expect(screen.getByText('Condition')).toBeDefined();
    });

    // Collapsed state: IconChevronRight is rendered (class tabler-icon-chevron-right).
    const { container } = screen.getByText('Condition').ownerDocument
      ? { container: screen.getByText('Condition').ownerDocument!.body }
      : { container: document.body };
    expect(
      container.querySelector('.tabler-icon-chevron-right')
    ).not.toBeNull();
    expect(
      container.querySelector('.tabler-icon-chevron-down')
    ).toBeNull();

    // Click the row.
    const button = screen.getByText('Condition').closest('button');
    expect(button).toBeDefined();
    await act(async () => {
      fireEvent.click(button!);
    });

    // Expanded state: chevron flipped to down.
    expect(
      container.querySelector('.tabler-icon-chevron-down')
    ).not.toBeNull();
    expect(
      container.querySelector('.tabler-icon-chevron-right')
    ).toBeNull();
  });

  it('shows empty state when no patient-linked types exist in capability', () => {
    const capability = buildCapability([
      { type: 'Medication', params: ['code'] },
    ]);
    renderView(capability);
    expect(
      screen.getByText('No linked resources found for this patient.')
    ).toBeDefined();
  });

  it('shows empty state when all counts are zero', async () => {
    const capability = buildCapability([
      { type: 'Condition', params: ['patient'] },
      { type: 'Observation', params: ['patient'] },
    ]);
    mockSearch.mockResolvedValue({ resourceType: 'Bundle', total: 0 });

    await act(async () => {
      renderView(capability);
    });

    await waitFor(() => {
      expect(
        screen.getByText('No linked resources found for this patient.')
      ).toBeDefined();
    });
  });
});
