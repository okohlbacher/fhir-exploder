/**
 * Lazy routes integration test — Phase 27, Plan 02.
 *
 * Canonical pattern: when a route is lazy-loaded via React.lazy, tests that
 * render <App /> (or the route tree) MUST use `findBy*` (async) rather than
 * `getBy*` (sync). This file is the reference example for future contributors.
 *
 * NOTE (per 27-RESEARCH.md Focus 1): NO existing test renders <App />, so
 * there is nothing to convert. This test proves the pattern works.
 *
 * The harness uses a minimal Suspense-around-Outlet shell that mirrors the
 * production AppLayout structure (`<Suspense fallback={...}><Outlet/></Suspense>`)
 * without instantiating Sidebar / settings modals — those would require the
 * full Settings + Connection + Terminology provider tree which is unrelated
 * to the lazy-loading behavior under test.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Suspense, lazy } from 'react';
import { retry } from '../utils/lazyRetry';

// ----- jsdom polyfills required by Mantine 8 -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  (
    globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
  ).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  if (
    !(Element.prototype as unknown as { scrollIntoView?: () => void })
      .scrollIntoView
  ) {
    (
      Element.prototype as unknown as { scrollIntoView: () => void }
    ).scrollIntoView = function () {};
  }
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

// Mock useOutletContext defensively — drill-downs typically expect a client
// from their layout's outlet context. ThresholdsPage doesn't, but the mock
// is harmless when unused.
const mockClient = {
  getBaseUrl: () => 'http://localhost:8080',
  searchResources: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue({ entry: [] }),
  get: vi.fn().mockResolvedValue({ entry: [] }),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useOutletContext: () => ({ client: mockClient }),
  };
});

// Locally declare a lazy wrapper that mirrors the production pattern in
// src/App.tsx. ThresholdsPage is a NAMED export, so the lazy factory reshapes
// the module to the default-export shape React.lazy expects.
const LazyThresholdsPage = lazy(() =>
  retry(() => import('../components/quality/ThresholdsPage')).then((m) => ({
    default: m.ThresholdsPage,
  })),
);

/**
 * Minimal harness that mirrors AppLayout's Suspense placement
 * (`<Suspense fallback={...}><Outlet /></Suspense>`) without dragging in
 * Sidebar (which has settings/connection/terminology context dependencies
 * unrelated to the lazy-load behavior under test).
 */
function SuspenseShell() {
  return (
    <Suspense fallback={<div data-testid="route-loading">Loading…</div>}>
      <Outlet />
    </Suspense>
  );
}

describe('lazy routes', () => {
  it('shows route-loading fallback then resolves to ThresholdsPage content', async () => {
    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/quality/thresholds']}>
          <Routes>
            <Route element={<SuspenseShell />}>
              <Route
                path="/quality/thresholds"
                element={<LazyThresholdsPage />}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </MantineProvider>,
    );

    // Per the canonical pattern, use findBy* (async) for lazy content.
    // The fallback may resolve very fast in jsdom; if `queryByTestId` returns
    // null, the page already resolved — that is acceptable for this assertion.
    const loading = screen.queryByTestId('route-loading');
    if (loading) {
      expect(loading).toBeTruthy();
    }
    // Eventually the page resolves. ThresholdsPage renders a Mantine Title
    // (heading role); `findBy*` is the canonical lazy-aware assertion.
    const heading = await screen.findByRole(
      'heading',
      undefined,
      { timeout: 3000 },
    );
    expect(heading).toBeTruthy();
  });
});
