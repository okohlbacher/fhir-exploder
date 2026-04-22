/**
 * Sidebar nested-route activation tests — Plan 26-03 Task 1 (SHELL-03 RED).
 *
 * Establishes the behavioural contract that Task 2's `useMatch` refactor
 * must satisfy. Covers the five section-root rows (Dashboard, Explorer,
 * Patients, Quality, Cohorts) plus the Settings row, across six route
 * scenarios (see §Behaviours below).
 *
 * Option B committed: '/quality/cohorts' highlights ONLY Cohorts. The
 * Quality row suppresses its activation via most-specific-wins. ROADMAP
 * Phase 26 success criterion #3 says "section root" (singular). See Test
 * 5 for the explicit assertion.
 *
 * Active-state selector: Mantine 8's `NavLink` renders `mod={{ active }}`
 * which emits a `data-active="true"` attribute on the root element when
 * the `active` prop is truthy, and omits the attribute otherwise. Tests
 * assert `row.getAttribute('data-active') === 'true'` (active) or
 * `row.getAttribute('data-active') === null` (inactive).
 *
 * Mocks:
 *   - useTerminologyHealth → 'ok' (Sidebar reads health for the status row,
 *     not relevant to route activation)
 *   - useSettings / useConnectionContext → stubs (modals pull from them)
 *
 * Follows DrillDownShell.test.tsx + ConnectionGatedOutlet.test.tsx setup
 * patterns (MantineProvider + MemoryRouter, jsdom polyfills for Mantine 8,
 * vi.hoisted + vi.mock).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell, MantineProvider } from '@mantine/core';

// ----- Mocks (hoisted) -----
vi.mock('../../../hooks/useTerminologyHealth', () => ({
  useTerminologyHealth: () => 'ok',
}));

vi.mock('../../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      fhir: { serverUrl: '', authMode: 'open' },
      terminology: { serverUrl: '' },
    },
    setSettings: vi.fn(),
  }),
}));

vi.mock('../../../contexts/ConnectionContext', () => ({
  useConnectionContext: () => ({
    state: { status: 'idle' },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

import { Sidebar } from '../Sidebar';

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

function renderSidebarAt(path: string) {
  // Sidebar uses `AppShell.Section` internally, which requires an ancestor
  // `AppShell` context. Wrap to mirror the real tree (see AppLayout.tsx).
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppShell navbar={{ width: 240, breakpoint: 0 }}>
          <AppShell.Navbar>
            <Sidebar connectionStatus="idle" />
          </AppShell.Navbar>
          <AppShell.Main>{null}</AppShell.Main>
        </AppShell>
      </MemoryRouter>
    </MantineProvider>,
  );
}

/**
 * Look up a NavLink row by its `href` attribute (React Router's NavLink
 * renders as `<a href="...">`). Walks up to the anchor element that
 * Mantine marks with `data-active` when `active` is true.
 */
function rowFor(container: HTMLElement, href: string): HTMLElement {
  const anchor = container.querySelector<HTMLElement>(`a[href="${href}"]`);
  if (!anchor) {
    throw new Error(`No NavLink row with href="${href}" found in Sidebar`);
  }
  return anchor;
}

function isActive(row: HTMLElement): boolean {
  // Mantine 8 NavLink emits data-active="true" on the root <a> element
  // when the `active` prop is truthy, and omits the attribute otherwise.
  return row.getAttribute('data-active') === 'true';
}

describe('Sidebar nested-route activation (SHELL-03 / Option B)', () => {
  it("highlights ONLY Dashboard at '/'", () => {
    const { container } = renderSidebarAt('/');

    expect(isActive(rowFor(container, '/'))).toBe(true);
    expect(isActive(rowFor(container, '/explorer'))).toBe(false);
    expect(isActive(rowFor(container, '/patients'))).toBe(false);
    expect(isActive(rowFor(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("highlights the Patients section root for '/patients/123'", () => {
    const { container } = renderSidebarAt('/patients/123');

    expect(isActive(rowFor(container, '/patients'))).toBe(true);
    expect(isActive(rowFor(container, '/'))).toBe(false);
    expect(isActive(rowFor(container, '/explorer'))).toBe(false);
    expect(isActive(rowFor(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("highlights the Explorer section root for '/explorer/Patient/1'", () => {
    const { container } = renderSidebarAt('/explorer/Patient/1');

    expect(isActive(rowFor(container, '/explorer'))).toBe(true);
    expect(isActive(rowFor(container, '/'))).toBe(false);
    expect(isActive(rowFor(container, '/patients'))).toBe(false);
    expect(isActive(rowFor(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("highlights the Quality section root for '/quality/plausibility/Observation'", () => {
    const { container } = renderSidebarAt('/quality/plausibility/Observation');

    expect(isActive(rowFor(container, '/quality'))).toBe(true);
    // Cohorts is exact:true and must NOT activate on non-cohorts descendants.
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
    expect(isActive(rowFor(container, '/'))).toBe(false);
    expect(isActive(rowFor(container, '/explorer'))).toBe(false);
    expect(isActive(rowFor(container, '/patients'))).toBe(false);
  });

  it("Option B: '/quality/cohorts' highlights ONLY Cohorts (Quality suppressed)", () => {
    // Option B committed: '/quality/cohorts' highlights ONLY Cohorts.
    // ROADMAP success criterion #3 says 'section root' (singular). Quality
    // suppresses when a Cohorts descendant is active via the
    // most-specific-wins rule in Sidebar.tsx (active = !!qualityMatch &&
    // !cohortsMatch for the Quality row).
    const { container } = renderSidebarAt('/quality/cohorts');

    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(true);
    expect(isActive(rowFor(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/'))).toBe(false);
    expect(isActive(rowFor(container, '/explorer'))).toBe(false);
    expect(isActive(rowFor(container, '/patients'))).toBe(false);
  });

  it("regression guard: '/' does NOT highlight Patients (Dashboard exact-match)", () => {
    // Dashboard is exact:true. Without the exact flag, useMatch({path: '/',
    // end: false}) would match every route; we must assert Patients stays
    // inactive on '/'. This also confirms Patients' end:false match doesn't
    // accidentally fire on '/' (it shouldn't — '/patients' is not a prefix
    // of '/', but belt-and-braces coverage).
    const { container } = renderSidebarAt('/');

    expect(isActive(rowFor(container, '/patients'))).toBe(false);
    expect(isActive(rowFor(container, '/explorer'))).toBe(false);
    expect(isActive(rowFor(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("Settings row activates on '/settings' (regression guard on second exact-match site)", () => {
    // Sidebar.tsx:115 currently uses `location.pathname === '/settings'`.
    // Post-refactor this migrates to `useMatch({ path: '/settings', end:
    // true })`. This test guards that the Settings row still activates on
    // the exact path after the useLocation → useMatch migration.
    const { container } = renderSidebarAt('/settings');

    expect(isActive(rowFor(container, '/settings'))).toBe(true);
    // Sanity: non-settings rows are not active on '/settings'.
    expect(isActive(rowFor(container, '/'))).toBe(false);
    expect(isActive(rowFor(container, '/patients'))).toBe(false);
  });
});
