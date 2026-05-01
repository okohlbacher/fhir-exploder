/**
 * Phase 49 — Wave 0 test scaffold for the lazy-route page component.
 *
 * Plan 01 Task 03 fills the FIRST `it` ("Graph button mount") with a real
 * RTL test. Plans 02 + 03 fill the rest.
 *
 * The "theme switch invariant" test (D-20.4) is the hardest one: it asserts
 * that the graph DOM root (data-testid="graph-flow-root") retains identity
 * across `useMantineColorScheme().setColorScheme('dark')` — proving CSS-var
 * theming with no React remount.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ResourceDetailPage } from '../ResourceDetailPage';

// jsdom polyfills for Mantine 8 (matches src/__tests__/lazy-routes.test.tsx).
beforeAll(() => {
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
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (
    window as unknown as { ResizeObserver: typeof MockResizeObserver }
  ).ResizeObserver = MockResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
});

// ----- mocks -----
const mockReadResource = vi.fn();
const mockGet = vi.fn();

// Stable client ref so useEffect on the resource fetch doesn't re-fire on
// every render — mirrors the IncomingReferencesPanel.test.tsx pattern.
const stableClient = {
  readResource: mockReadResource,
  get: mockGet,
  fhirUrl: (p: string) => ({ toString: () => `http://test/fhir/${p}` }),
};

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => stableClient,
}));

// Bypass terminology resolution — Phase 47's HumanReadableView pulls
// useTerminology() through useResolvedResource. This test only cares about
// the toolbar Group / Graph button — keep the resource pass-through.
vi.mock('../../../hooks/useResolvedResource', () => ({
  useResolvedResource: <T,>(r: T): T => r,
}));

beforeEach(() => {
  mockReadResource.mockReset();
  mockGet.mockReset();
  mockReadResource.mockResolvedValue({
    resourceType: 'Patient',
    id: 'abc',
    name: [{ given: ['Test'], family: 'Patient' }],
  });
  mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 0, entry: [] });
});

describe('ResourceGraphView mount', () => {
  it('Graph button mount — button visible on ResourceDetailPage with IconAffiliate icon and label "Graph"', async () => {
    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/explorer/Patient/abc']}>
          <Routes>
            <Route
              path="/explorer/:resourceType/:id"
              element={<ResourceDetailPage />}
            />
            <Route
              path="/explorer/:resourceType/:id/graph"
              element={<div data-testid="graph-page">graph</div>}
            />
          </Routes>
        </MemoryRouter>
      </MantineProvider>,
    );

    const graphButton = await screen.findByRole('button', { name: /^Graph$/i });
    expect(graphButton).toBeTruthy();
    // Click and verify route changed
    fireEvent.click(graphButton);
    expect(await screen.findByTestId('graph-page')).toBeTruthy();
  });

  // Other it.skip stubs remain — Plan 02 + 03 fill them.
  it.skip('renders depth-1 graph for a Resource with outgoing references', () => {
    // TODO(49-03): fill in body — Plan 03 Task 02.
  });
  it.skip('node click navigation — clicking a non-root node calls useNavigate with /explorer/{type}/{id}', () => {
    // TODO(49-03): fill in body — Plan 03 Task 03 (Test 3).
  });
  it.skip('node label renders summarizeResource(target).primary', () => {
    // TODO(49-03): fill in body — Plan 03 Task 02.
  });
  it.skip('edge label field name — edges show FHIR reference field name e.g. subject', () => {
    // TODO(49-03): fill in body — Plan 03 Task 02.
  });
  it.skip('theme switch invariant — graph DOM root persists across setColorScheme()', () => {
    // TODO(49-03): fill in body — Plan 03 Task 03 (Test 4 — D-20.4).
  });
  it.skip('parallel fetch fanout — RTL: 5 outgoing refs trigger 5 simultaneous client.get calls', () => {
    // TODO(49-03): fill in body — Plan 03 Task 03 (Test 5).
  });
  it.skip('dagre layout positions — applyDagreLayout returns non-NaN x/y for every node', () => {
    // TODO(49-03): fill in body — Plan 03 Task 02.
  });
});
