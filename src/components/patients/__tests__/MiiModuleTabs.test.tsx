/**
 * MiiModuleTabs hide-empty toggle tests — Plan 34-05 Task 1 (MII-EXT-14).
 *
 * Locks the per-patient empty-state toggle contract:
 *   10. Toggle hidden when no extension modules have been visited + emptied.
 *   11. Toggle reads "Hide N empty modules" once ≥1 visited extension is empty.
 *   12. Click flips state; localStorage roundtrip; label swaps to "Show N".
 *   13. Hydrated hide=true on mount → "Show N" label + empty pills filtered.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

// Polyfill ResizeObserver for jsdom (required by Mantine components).
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom (required by Mantine).
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
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mocks = vi.hoisted(() => ({
  client: null as null | {
    get: ReturnType<typeof vi.fn>;
    fhirUrl: (s: string) => { toString: () => string };
  },
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mocks.client,
}));

// ClinicalTimeline pulls in its own dependencies; stub it to keep the
// rendering surface focused on MiiModuleTabs.
vi.mock('../ClinicalTimeline', () => ({
  ClinicalTimeline: () => null,
}));

import { MiiModuleTabs } from '../MiiModuleTabs';

const STORAGE_KEY = 'patients.hideEmptyExtensions.v1';

function makeEmptyClient() {
  return {
    get: vi.fn(() =>
      Promise.resolve({ resourceType: 'Bundle', entry: [] }),
    ),
    fhirUrl: (s: string) => ({ toString: () => s }),
  };
}

function renderTabs(patientId: string) {
  return render(
    <MantineProvider>
      <MiiModuleTabs patientId={patientId} />
    </MantineProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mocks.client = makeEmptyClient();
  localStorage.clear();
});

afterEach(() => {
  mocks.client = null;
  localStorage.clear();
});

describe('MiiModuleTabs hide-empty toggle (MII-EXT-14, Plan 34-05)', () => {
  it('when no extension modules have been visited/emptied, toggle button is NOT rendered', async () => {
    await act(async () => {
      renderTabs('p-fresh');
    });
    // Nothing empty until at least one extension tab has been clicked + fetched.
    // Before any visit, emptyCount = 0; toggle hidden.
    expect(screen.queryByText(/Hide \d+ empty modules/)).toBeNull();
    expect(screen.queryByText(/Show \d+ empty modules/)).toBeNull();
  });

  it('when ≥1 extension module has been visited + empty + default state, toggle reads "Hide N empty modules"', async () => {
    await act(async () => {
      renderTabs('p-with-empties');
    });

    // Expand the Collapse to expose extension tab pills:
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    // Click an extension tab to trigger its fan-out (Onkologie):
    const onkologie = await screen.findByText('Onkologie');
    await act(async () => {
      fireEvent.click(onkologie);
    });

    // Wait for the panel to mount + fetch (0 results) + publish:
    const toggle = await screen.findByText(/Hide \d+ empty modules/);
    expect(toggle).toBeTruthy();
  });

  it('clicking toggle flips state; button re-renders as "Show N"; localStorage reflects', async () => {
    await act(async () => {
      renderTabs('p-toggle');
    });
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });
    const onkologie = await screen.findByText('Onkologie');
    await act(async () => {
      fireEvent.click(onkologie);
    });
    const hideBtn = await screen.findByText(/Hide \d+ empty modules/);
    await act(async () => {
      fireEvent.click(hideBtn);
    });
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      expect(stored['p-toggle']).toBe(true);
    });
    const showBtn = await screen.findByText(/Show \d+ empty modules/);
    expect(showBtn).toBeTruthy();
  });

  it('hydrated hide=true on mount → toggle reads "Show N" + empty extension pills filtered out', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'p-hidden': true }));
    await act(async () => {
      renderTabs('p-hidden');
    });
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });
    // Visit Onkologie to register its emptiness.
    const onkologie = await screen.findByText('Onkologie');
    await act(async () => {
      fireEvent.click(onkologie);
    });
    const showBtn = await screen.findByText(/Show \d+ empty modules/);
    expect(showBtn).toBeTruthy();
    // Onkologie pill itself should have been filtered out of the Collapse
    // once its emptiness was published + hide flag is on.
    await waitFor(() => {
      const pills = screen.queryByText('Onkologie');
      expect(pills).toBeNull();
    });
  });
});
