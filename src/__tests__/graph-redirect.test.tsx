import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { NavigateToMode } from '../App';

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

// getBoundingClientRect polyfill (React Flow needs it)
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
}));

vi.mock('../components/explorer/ResourceDetailPage', () => ({
  ResourceDetailPage: () => <div data-testid="resource-detail-page" />,
}));

function LocationProbe() {
  const loc = useLocation();
  return (
    <>
      <div data-testid="pathname">{loc.pathname}</div>
      <div data-testid="search">{loc.search}</div>
    </>
  );
}

function SearchParamsProbe() {
  const [params] = useSearchParams();
  return <div data-testid="mode-param">{params.get('mode')}</div>;
}

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/explorer/:resourceType/:id"
          element={
            <>
              <div data-testid="resource-detail-page" />
              <LocationProbe />
              <SearchParamsProbe />
            </>
          }
        />
        <Route
          path="/explorer/:resourceType/:id/graph"
          element={<NavigateToMode mode="graph" />}
        />
        <Route
          path="/patients/:patientId/:resourceType/:id"
          element={
            <>
              <div data-testid="resource-detail-page" />
              <LocationProbe />
              <SearchParamsProbe />
            </>
          }
        />
        <Route
          path="/patients/:patientId/:resourceType/:id/graph"
          element={<NavigateToMode mode="graph" />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('NavigateToMode redirect (SHELL-03)', () => {
  it('redirects /explorer/Patient/p1/graph to ?mode=graph', () => {
    renderAt('/explorer/Patient/p1/graph');
    expect(screen.getByTestId('pathname').textContent).toBe('/explorer/Patient/p1');
    expect(screen.getByTestId('search').textContent).toBe('?mode=graph');
  });

  it('patient graph redirect', () => {
    renderAt('/patients/p1/Encounter/e1/graph');
    expect(screen.getByTestId('pathname').textContent).toBe('/patients/p1/Encounter/e1');
    expect(screen.getByTestId('search').textContent).toBe('?mode=graph');
  });
});
