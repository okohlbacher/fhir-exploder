import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import { AppSpotlight } from '../components/layout/Spotlight';
import * as ConnectionContextModule from '../contexts/ConnectionContext';
import { openSpotlight } from '@mantine/spotlight';

// ----- jsdom polyfills required by Mantine 8 -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

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

// Mantine Spotlight calls scrollIntoView on selected action elements during
// keyboard navigation. jsdom doesn't implement it, so polyfill to silence
// unhandled-rejection noise without affecting test assertions.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const fakeCapability: CapabilityStatement = {
  resourceType: 'CapabilityStatement',
  status: 'active',
  date: '2026-05-04',
  kind: 'capability',
  fhirVersion: '4.0.1',
  format: ['json'],
  rest: [
    {
      mode: 'server',
      resource: [
        { type: 'Patient' },
        { type: 'Observation' },
        { type: 'Condition' },
      ],
    },
  ],
};

function renderConnected() {
  vi.spyOn(ConnectionContextModule, 'useConnectionContext').mockReturnValue({
    state: {
      status: 'connected',
      client: {} as never,
      capability: fakeCapability,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AppSpotlight />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('AppSpotlight (⌘K palette)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders without crash and exposes mod+K shortcut via openSpotlight()', async () => {
    renderConnected();
    act(() => openSpotlight());
    // Spotlight uses an animated modal portal — wait for input to appear
    const input = await screen.findByPlaceholderText('Go to resource type…');
    expect(input).toBeInTheDocument();
  });

  it('shows no resource-type actions when query is shorter than 2 characters', async () => {
    renderConnected();
    act(() => openSpotlight());
    const search = await screen.findByPlaceholderText('Go to resource type…') as HTMLInputElement;
    await userEvent.type(search, 'P');
    // highlightQuery splits text; actions should not be present at all
    expect(screen.queryByRole('button', { name: /Patient/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Observation/i })).not.toBeInTheDocument();
  });

  it('renders matching resource types when query is at least 2 characters', async () => {
    renderConnected();
    act(() => openSpotlight());
    const search = await screen.findByPlaceholderText('Go to resource type…') as HTMLInputElement;
    await userEvent.type(search, 'Pa');
    // Spotlight action buttons have the resource type name (possibly split by mark tags)
    // Use waitFor + queryByRole to handle async rendering
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Patient/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^Observation$/i })).not.toBeInTheDocument();
  });

  it('navigates to /explorer/{type} when an action is clicked', async () => {
    renderConnected();
    act(() => openSpotlight());
    const search = await screen.findByPlaceholderText('Go to resource type…') as HTMLInputElement;
    await userEvent.type(search, 'Pa');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Patient/i })).toBeInTheDocument();
    });
    const action = screen.getByRole('button', { name: /Patient/i });
    await userEvent.click(action);
    expect(mockNavigate).toHaveBeenCalledWith('/explorer/Patient');
  });

  it('shows the not-connected nothing-found label when ConnectionContext is idle', async () => {
    vi.spyOn(ConnectionContextModule, 'useConnectionContext').mockReturnValue({
      state: { status: 'idle' },
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    render(
      <MantineProvider>
        <MemoryRouter>
          <AppSpotlight />
        </MemoryRouter>
      </MantineProvider>,
    );
    act(() => openSpotlight());
    await waitFor(() => {
      expect(
        screen.getByText('Connect to a FHIR server to enable resource navigation'),
      ).toBeInTheDocument();
    });
  });
});
