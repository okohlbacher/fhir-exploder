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
 * renders as `<a href="...">`). Returns null if the row is not rendered —
 * Phase 30 redesign conditionally renders Quality children only when under
 * /quality/*, so callers must tolerate absence on other routes.
 */
function rowFor(container: HTMLElement, href: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`a[href="${href}"]`);
}

function requireRow(container: HTMLElement, href: string): HTMLElement {
  const row = rowFor(container, href);
  if (!row) {
    throw new Error(`No NavLink row with href="${href}" found in Sidebar`);
  }
  return row;
}

function isActive(row: HTMLElement | null): boolean {
  // Mantine 8 NavLink emits data-active="true" on the root <a> element
  // when the `active` prop is truthy, and omits the attribute otherwise.
  // A missing row (null) is trivially "not active".
  return row?.getAttribute('data-active') === 'true';
}

/**
 * When the Quality parent renders both itself and a nested Overview child
 * with identical `to="/quality"`, `querySelector` returns the first anchor.
 * The redesign renders the parent first, so `rowFor(c, '/quality')` continues
 * to resolve to the parent row — preserving the pre-Phase-30 test contract.
 */

describe('Sidebar nested-route activation (SHELL-03 / Option B)', () => {
  it("highlights ONLY Dashboard at '/'", () => {
    const { container } = renderSidebarAt('/');

    expect(isActive(requireRow(container, '/'))).toBe(true);
    expect(isActive(requireRow(container, '/explorer'))).toBe(false);
    expect(isActive(requireRow(container, '/patients'))).toBe(false);
    expect(isActive(requireRow(container, '/quality'))).toBe(false);
    // Cohorts sub-row is NOT rendered outside /quality/* — isActive(null) is
    // false, which preserves the pre-Phase-30 contract (Cohorts inactive here).
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("highlights the Patients section root for '/patients/123'", () => {
    const { container } = renderSidebarAt('/patients/123');

    expect(isActive(requireRow(container, '/patients'))).toBe(true);
    expect(isActive(requireRow(container, '/'))).toBe(false);
    expect(isActive(requireRow(container, '/explorer'))).toBe(false);
    expect(isActive(requireRow(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("highlights the Explorer section root for '/explorer/Patient/1'", () => {
    const { container } = renderSidebarAt('/explorer/Patient/1');

    expect(isActive(requireRow(container, '/explorer'))).toBe(true);
    expect(isActive(requireRow(container, '/'))).toBe(false);
    expect(isActive(requireRow(container, '/patients'))).toBe(false);
    expect(isActive(requireRow(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("highlights the Quality section root for '/quality/plausibility/Observation'", () => {
    const { container } = renderSidebarAt('/quality/plausibility/Observation');

    // Quality parent row is the first <a href="/quality"> in the DOM, so
    // rowFor resolves to it (not the Overview child which also has the same
    // href). The parent is active on any /quality/* descendant that's not a
    // suppressed child path (cohorts/thresholds).
    expect(isActive(requireRow(container, '/quality'))).toBe(true);
    expect(isActive(requireRow(container, '/quality/cohorts'))).toBe(false);
    expect(isActive(requireRow(container, '/'))).toBe(false);
    expect(isActive(requireRow(container, '/explorer'))).toBe(false);
    expect(isActive(requireRow(container, '/patients'))).toBe(false);
  });

  it("Option B: '/quality/cohorts' highlights ONLY Cohorts (Quality suppressed)", () => {
    // Option B committed: '/quality/cohorts' highlights ONLY Cohorts.
    // ROADMAP success criterion #3 says 'section root' (singular). Quality
    // suppresses when a Cohorts descendant is active via the
    // most-specific-wins rule in Sidebar.tsx (suppressParent=true on the
    // Cohorts child).
    const { container } = renderSidebarAt('/quality/cohorts');

    expect(isActive(requireRow(container, '/quality/cohorts'))).toBe(true);
    expect(isActive(requireRow(container, '/quality'))).toBe(false);
    expect(isActive(requireRow(container, '/'))).toBe(false);
    expect(isActive(requireRow(container, '/explorer'))).toBe(false);
    expect(isActive(requireRow(container, '/patients'))).toBe(false);
  });

  it("Option B: '/quality/thresholds' highlights ONLY Thresholds (Quality suppressed)", () => {
    // Phase 30 Step 1 extended the Option B suppression to Thresholds.
    // Children are rendered only when under /quality/*, so the sub-rows
    // appear here.
    const { container } = renderSidebarAt('/quality/thresholds');

    expect(isActive(requireRow(container, '/quality/thresholds'))).toBe(true);
    expect(isActive(requireRow(container, '/quality'))).toBe(false);
    expect(isActive(requireRow(container, '/quality/cohorts'))).toBe(false);
  });

  it("regression guard: '/' does NOT highlight Patients (Dashboard exact-match)", () => {
    const { container } = renderSidebarAt('/');

    expect(isActive(requireRow(container, '/patients'))).toBe(false);
    expect(isActive(requireRow(container, '/explorer'))).toBe(false);
    expect(isActive(requireRow(container, '/quality'))).toBe(false);
    expect(isActive(rowFor(container, '/quality/cohorts'))).toBe(false);
  });

  it("Settings row activates on '/settings' (regression guard on second exact-match site)", () => {
    const { container } = renderSidebarAt('/settings');

    expect(isActive(requireRow(container, '/settings'))).toBe(true);
    expect(isActive(requireRow(container, '/'))).toBe(false);
    expect(isActive(requireRow(container, '/patients'))).toBe(false);
  });
});
