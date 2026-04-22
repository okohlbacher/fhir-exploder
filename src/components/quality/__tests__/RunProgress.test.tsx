/**
 * RunProgress tests — QDDEP-06 (Plan 25-02 Task 3).
 *
 * Covers the three cases that matter for the 9 migrated sites:
 *   - run.status !== 'running' → returns null (no render)
 *   - run.status === 'running' → Stack+Text+Progress with correct pct
 *   - Defensive: total === 0 does not produce NaN
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import { RunProgress } from '../RunProgress';

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

beforeEach(() => {
  window.localStorage.clear();
});

function renderProgress(props: React.ComponentProps<typeof RunProgress>) {
  return render(
    <MantineProvider>
      <RunProgress {...props} />
    </MantineProvider>,
  );
}

describe('RunProgress', () => {
  it('renders null when status is not running', () => {
    renderProgress({
      run: { status: 'idle', progress: { current: 0, total: 10 } },
      label: 'Checking Observation',
    });
    expect(screen.queryByText(/Checking Observation/)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('renders text and progress when status is running', () => {
    renderProgress({
      run: { status: 'running', progress: { current: 3, total: 10 } },
      label: 'Checking Foo',
    });
    expect(screen.getByText(/Checking Foo \(3\/10\)/)).toBeTruthy();
    // Mantine Progress uses role="progressbar" and sets aria-valuenow.
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
  });

  it('guards against total=0: pct is 0, not NaN', () => {
    renderProgress({
      run: { status: 'running', progress: { current: 0, total: 0 } },
      label: 'Matching patients',
    });
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });
});
