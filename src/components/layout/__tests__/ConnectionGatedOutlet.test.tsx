/**
 * ConnectionGatedOutlet tests — Plan 26-01 Task 2 (SHELL-01).
 *
 * Structural assertions on the four contract branches of the render-prop
 * primitive:
 *   1. Default + disconnected → renders the canonical "Not connected" alert
 *      + link to "/" (no Outlet).
 *   2. Default + connected → renders the Outlet (no alert).
 *   3. `render` override + connected → caller's connected node; default
 *      alert is NOT rendered.
 *   4. `render` override + disconnected → caller's disconnected node;
 *      default alert is NOT rendered.
 *
 * Mirrors DrillDownShell.test.tsx setup (MantineProvider + MemoryRouter,
 * jsdom polyfills for Mantine 8). Uses vi.mock on
 * ../../../hooks/useConnection to toggle connection state.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

// Hoisted so vi.mock factory can reach it.
const mocks = vi.hoisted(() => ({
  connectionState: { status: 'idle' } as
    | { status: 'idle' }
    | { status: 'connected'; client: object; capability: object }
    | { status: 'error'; error: { type: string; message: string; suggestion: string } },
}));

vi.mock('../../../hooks/useConnection', () => ({
  useConnection: () => ({
    state: mocks.connectionState,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

import { ConnectionGatedOutlet } from '../ConnectionGatedOutlet';

// ----- jsdom polyfills required by Mantine 8 -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
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
});

beforeEach(() => {
  mocks.connectionState = { status: 'idle' };
});

function renderWithRoutes(element: React.ReactElement) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/foo']}>
        <Routes>
          <Route path="/foo" element={element}>
            <Route index element={<div data-testid="outlet-child">child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('ConnectionGatedOutlet', () => {
  it('default form + disconnected state renders the canonical alert with dashboard link', () => {
    mocks.connectionState = { status: 'idle' };

    renderWithRoutes(<ConnectionGatedOutlet />);

    // Alert role present.
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    // Canonical copy.
    expect(screen.getByText(/Not connected to a FHIR server/i)).toBeTruthy();
    // Link back to dashboard ("/").
    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link.getAttribute('href')).toBe('/');
    // No Outlet content.
    expect(screen.queryByTestId('outlet-child')).toBeNull();
  });

  it('default form + connected state renders the Outlet (no alert)', () => {
    mocks.connectionState = {
      status: 'connected',
      client: {},
      capability: { resourceType: 'CapabilityStatement' },
    };

    renderWithRoutes(<ConnectionGatedOutlet />);

    // Outlet child from the index route is mounted.
    expect(screen.getByTestId('outlet-child')).toBeTruthy();
    // No "Not connected" alert copy.
    expect(screen.queryByText(/Not connected to a FHIR server/i)).toBeNull();
  });

  it('render-prop override + connected renders the caller node and NOT the default alert', () => {
    mocks.connectionState = {
      status: 'connected',
      client: {},
      capability: { resourceType: 'CapabilityStatement' },
    };

    renderWithRoutes(
      <ConnectionGatedOutlet
        render={(connected) =>
          connected ? (
            <div data-testid="custom-connected">c</div>
          ) : (
            <div data-testid="custom-disconnected">d</div>
          )
        }
      />,
    );

    expect(screen.getByTestId('custom-connected')).toBeTruthy();
    expect(screen.queryByTestId('custom-disconnected')).toBeNull();
    // Default alert copy MUST be absent when override is in use.
    expect(screen.queryByText(/Not connected to a FHIR server/i)).toBeNull();
    // Default Outlet not mounted either (override took over).
    expect(screen.queryByTestId('outlet-child')).toBeNull();
  });

  it('render-prop override + disconnected renders the caller node and NOT the default alert', () => {
    mocks.connectionState = { status: 'idle' };

    renderWithRoutes(
      <ConnectionGatedOutlet
        render={(connected) =>
          connected ? (
            <div data-testid="custom-connected">c</div>
          ) : (
            <div data-testid="custom-disconnected">d</div>
          )
        }
      />,
    );

    expect(screen.getByTestId('custom-disconnected')).toBeTruthy();
    expect(screen.queryByTestId('custom-connected')).toBeNull();
    // Default alert copy MUST be absent when override is in use.
    expect(screen.queryByText(/Not connected to a FHIR server/i)).toBeNull();
  });

  it('children slot + connected renders the provided children (no default Outlet)', () => {
    mocks.connectionState = {
      status: 'connected',
      client: {},
      capability: { resourceType: 'CapabilityStatement' },
    };

    renderWithRoutes(
      <ConnectionGatedOutlet>
        <div data-testid="custom-connected-children">wrapped</div>
      </ConnectionGatedOutlet>,
    );

    expect(screen.getByTestId('custom-connected-children')).toBeTruthy();
    // Default Outlet child from the index route did NOT mount (children
    // replaced it).
    expect(screen.queryByTestId('outlet-child')).toBeNull();
    // And no alert (still connected).
    expect(screen.queryByText(/Not connected to a FHIR server/i)).toBeNull();
  });

  it('children slot + disconnected still renders the canonical alert (children ignored)', () => {
    mocks.connectionState = { status: 'idle' };

    renderWithRoutes(
      <ConnectionGatedOutlet>
        <div data-testid="custom-connected-children">wrapped</div>
      </ConnectionGatedOutlet>,
    );

    // Canonical alert present.
    expect(screen.getByText(/Not connected to a FHIR server/i)).toBeTruthy();
    // Children NOT rendered (disconnected branch uses canonical alert).
    expect(screen.queryByTestId('custom-connected-children')).toBeNull();
  });

  it('render-prop takes precedence over children when both are provided', () => {
    mocks.connectionState = {
      status: 'connected',
      client: {},
      capability: { resourceType: 'CapabilityStatement' },
    };

    renderWithRoutes(
      <ConnectionGatedOutlet
        render={() => <div data-testid="render-wins">r</div>}
      >
        <div data-testid="children-lose">c</div>
      </ConnectionGatedOutlet>,
    );

    expect(screen.getByTestId('render-wins')).toBeTruthy();
    expect(screen.queryByTestId('children-lose')).toBeNull();
  });
});
