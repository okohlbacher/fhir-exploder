/**
 * QualityLayout regression fence — Plan 26-01 Task 1 (SHELL-01).
 *
 * Wave 0 test created BEFORE any Phase 26 migration. Captures the
 * pre-migration observable behavior of QualityLayout so the SHELL-01
 * refactor (Task 3 — replace the triplicated "Not connected" alert with
 * `<ConnectionGatedOutlet>`) cannot silently break:
 *   1. the legacy-migration useEffect (Plan 21-04 / CHRT-04 — belt-and-suspenders
 *      copy of LEGACY_COHORT_KEY into RESOURCE_TYPES_STORAGE_KEY + removeItem),
 *   2. the disconnected-state "Not connected" alert + link back to dashboard,
 *   3. the connected-state rendering of the Outlet under
 *      QualityMetricsProvider + MedplumProvider.
 *
 * Mirrors DrillDownShell.test.tsx setup (MantineProvider + MemoryRouter,
 * jsdom polyfills). Uses vi.mock on ../../../hooks/useConnection to toggle
 * connection state and on ../../../quality/cohorts to spy on
 * migrateLegacyResourceTypeKey.
 *
 * This test MUST pass unchanged after Task 3's migration — that's the
 * regression fence contract.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

// ----- hoisted mocks -----
// vi.mock factories run BEFORE module top-level imports, so the state
// variable must be defined via vi.hoisted to be in scope when the factory
// is invoked.
const mocks = vi.hoisted(() => ({
  connectionState: { status: 'idle' } as
    | { status: 'idle' }
    | { status: 'connected'; client: object; capability: object }
    | { status: 'error'; error: { type: string; message: string; suggestion: string } },
  migrateSpy: vi.fn(),
}));

vi.mock('../../../hooks/useConnection', () => ({
  useConnection: () => ({
    state: mocks.connectionState,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('../../../quality/cohorts', async () => {
  const actual = await vi.importActual<typeof import('../../../quality/cohorts')>(
    '../../../quality/cohorts',
  );
  return {
    ...actual,
    migrateLegacyResourceTypeKey: mocks.migrateSpy,
  };
});

// MedplumProvider mock — the real one expects a functional MedplumClient;
// we only need the tree under it to render so we stub it as a pass-through.
vi.mock('@medplum/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@medplum/react');
  return {
    ...actual,
    MedplumProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// QualityMetricsProvider — pass-through stub; the connected-state tree
// then renders the outlet child without pulling in the quality metrics
// runtime.
vi.mock('../../../quality/QualityMetricsContext', () => ({
  QualityMetricsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="quality-metrics-provider">{children}</div>
  ),
  useQualityMetrics: () => ({}),
}));

// Import AFTER mocks so the module-under-test picks them up.
import { QualityLayout } from '../QualityLayout';
import { LEGACY_COHORT_KEY, RESOURCE_TYPES_STORAGE_KEY } from '../../../quality/cohorts';

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
  window.localStorage.clear();
  mocks.migrateSpy.mockClear();
  mocks.connectionState = { status: 'idle' };
});

function renderQualityAt(path: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/quality" element={<QualityLayout />}>
            <Route index element={<div data-testid="outlet-child">child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('QualityLayout — pre-migration regression fence', () => {
  it('invokes migrateLegacyResourceTypeKey on mount and clears LEGACY_COHORT_KEY', () => {
    // Connected state so we actually mount the useEffect tree; the
    // effect runs regardless of connection status, but rendering the
    // tree exercises the same mount path as production.
    mocks.connectionState = {
      status: 'connected',
      client: {},
      capability: { resourceType: 'CapabilityStatement' },
    };
    // Seed the legacy key; the belt-and-suspenders inline effect should
    // remove it even if the spied-helper doesn't.
    window.localStorage.setItem(LEGACY_COHORT_KEY, 'Patient,Observation');

    renderQualityAt('/quality');

    // Helper spy called exactly once (mount-only effect, empty deps).
    expect(mocks.migrateSpy).toHaveBeenCalledTimes(1);
    // Belt-and-suspenders block cleared the legacy key.
    expect(window.localStorage.getItem(LEGACY_COHORT_KEY)).toBeNull();
    // And copied the value into the new key (since new key was empty).
    expect(window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY)).toBe(
      'Patient,Observation',
    );
  });

  it('renders the Outlet (connected) without a "Not connected" alert', () => {
    mocks.connectionState = {
      status: 'connected',
      client: {},
      capability: { resourceType: 'CapabilityStatement' },
    };

    renderQualityAt('/quality');

    expect(screen.getByTestId('outlet-child')).toBeTruthy();
    // No "Not connected" alert.
    expect(screen.queryByText(/Not connected to a FHIR server/i)).toBeNull();
    // QualityMetricsProvider is present in the connected tree.
    expect(screen.getByTestId('quality-metrics-provider')).toBeTruthy();
  });

  it('renders the "Not connected" alert with a link back to dashboard when disconnected', () => {
    mocks.connectionState = { status: 'idle' };

    renderQualityAt('/quality');

    // Alert role present.
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    // Copy present.
    expect(screen.getByText(/Not connected to a FHIR server/i)).toBeTruthy();
    // Link back to "/" exists.
    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link.getAttribute('href')).toBe('/');
    // No Outlet child.
    expect(screen.queryByTestId('outlet-child')).toBeNull();
    // No QualityMetricsProvider in the disconnected tree.
    expect(screen.queryByTestId('quality-metrics-provider')).toBeNull();
  });

  it('error connection state also renders the "Not connected" alert (status !== connected)', () => {
    mocks.connectionState = {
      status: 'error',
      error: { type: 'network', message: 'boom', suggestion: 'retry' },
    };

    renderQualityAt('/quality');

    expect(screen.getByText(/Not connected to a FHIR server/i)).toBeTruthy();
    expect(screen.queryByTestId('outlet-child')).toBeNull();
  });
});
