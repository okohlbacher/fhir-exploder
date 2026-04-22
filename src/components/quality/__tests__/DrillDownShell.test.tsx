/**
 * DrillDownShell tests — QDDEP-02 (Plan 25-03 Task 1).
 *
 * Render-parity + state-variant coverage for the unified drill-down chrome
 * that replaces the bespoke Stack/Button/Title/Alert/ResourceIssueTable
 * stanzas in the 5 simple drill-downs (Plausibility, LabRanges, Duplicates,
 * References, Completeness) and is PARTIAL-wrapped by CodingDrillDown.
 *
 * The shell consumes `RunProgress` (Plan 25-02 / QDDEP-06) for its running
 * progress chrome and `ResourceIssueTable` for the issues list.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

import { DrillDownShell } from '../DrillDownShell';
import type { NormalizedIssue } from '../../../quality/types';

// ----- jsdom polyfills required by Mantine 8 -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;

  if (
    !(Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView
  ) {
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      function () {};
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

beforeEach(() => {
  window.localStorage.clear();
});

type ShellProps = React.ComponentProps<typeof DrillDownShell>;

function renderShell(props: ShellProps) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <DrillDownShell {...props} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const ISSUE_FIXTURE: NormalizedIssue[] = [
  {
    resourceId: 'Observation/1',
    resourceType: 'Observation',
    field: 'code',
    description: 'bad',
    severity: 'warning',
  },
];

describe('DrillDownShell', () => {
  it('renders back button, title, and progress chrome when running', () => {
    renderShell({
      title: 'Foo drill-down',
      backHref: '/quality',
      run: { status: 'running', progress: { current: 3, total: 10 } },
      issues: [],
      emptyMessage: 'none',
      progressLabel: 'Checking X',
    });
    // Back button reachable by accessible name.
    expect(screen.getByRole('link', { name: /Back/ })).toBeTruthy();
    expect(screen.getByText('Foo drill-down')).toBeTruthy();
    // RunProgress renders "{label} ({current}/{total})...".
    expect(screen.getByText(/Checking X \(3\/10\)/)).toBeTruthy();
  });

  it('renders error alert when run.status is error', () => {
    renderShell({
      title: 'Foo drill-down',
      backHref: '/quality',
      run: { status: 'error', progress: { current: 0, total: 0 } },
      issues: [],
      emptyMessage: 'none',
      errorMessage: 'Boom',
    });
    // Mantine renders Alert with role="alert".
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Boom/)).toBeTruthy();
  });

  it('renders empty-state alert when complete and no issues', () => {
    renderShell({
      title: 'Foo drill-down',
      backHref: '/quality',
      run: { status: 'complete', progress: { current: 10, total: 10 } },
      issues: [],
      emptyMessage: 'No issues found',
    });
    expect(screen.getByText('No issues found')).toBeTruthy();
  });

  it('renders ResourceIssueTable when complete with issues', () => {
    renderShell({
      title: 'Foo drill-down',
      backHref: '/quality',
      run: { status: 'complete', progress: { current: 10, total: 10 } },
      issues: ISSUE_FIXTURE,
      emptyMessage: 'none',
    });
    // The issue's description appears in the rendered table.
    expect(screen.getByText('bad')).toBeTruthy();
    // The issue's resource reference appears too.
    expect(screen.getByText('Observation/1')).toBeTruthy();
  });

  it('auto-focuses the back button on mount for accessibility', async () => {
    renderShell({
      title: 'Foo drill-down',
      backHref: '/quality',
      run: { status: 'idle', progress: { current: 0, total: 0 } },
      issues: [],
      emptyMessage: 'none',
    });
    const back = screen.getByRole('link', { name: /Back/ });
    await waitFor(() => {
      expect(document.activeElement).toBe(back);
    });
  });

  it('renders static titles verbatim (no interpolation)', () => {
    renderShell({
      title: 'Duplicate Detection -- Drill-down',
      backHref: '/quality',
      run: { status: 'idle', progress: { current: 0, total: 0 } },
      issues: [],
      emptyMessage: 'none',
    });
    expect(screen.getByText('Duplicate Detection -- Drill-down')).toBeTruthy();
  });
});
