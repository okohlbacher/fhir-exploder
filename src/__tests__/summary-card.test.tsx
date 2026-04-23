/**
 * SummaryCard breach props — Plan 18-03 Task 3.
 *
 * Verifies the breach primitive added in Task 2:
 * - `breached` flips ring + value color to red.6
 * - `threshold` renders 'threshold: {N}%' annotation only when breached
 * - `onClick` wraps Card as <button>
 * - `ariaLabel` propagates to the button
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SummaryCard } from '../components/quality/SummaryCard';

// ----- jsdom polyfills required by Mantine 8 -----

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

function renderCard(props: ComponentProps<typeof SummaryCard>) {
  return render(
    <MantineProvider>
      <SummaryCard {...props} />
    </MantineProvider>,
  );
}

/** Scans the rendered output for any reference to Mantine's red color token. */
function hasRedColorReference(container: HTMLElement): boolean {
  const html = container.innerHTML.toLowerCase();
  // Mantine 8 emits `--mantine-color-red-6` either as a CSS var in a style attr,
  // as a class fragment, or as a stroke/fill attribute value.
  return (
    html.includes('red-6') ||
    html.includes('color-red') ||
    html.includes('mantine-color-red') ||
    html.includes('"red.6"') ||
    html.includes('red.6') ||
    /stroke="[^"]*red/i.test(container.innerHTML) ||
    /fill="[^"]*red/i.test(container.innerHTML)
  );
}

describe('SummaryCard breach props', () => {
  it('renders in non-breach state with no red color references', () => {
    // Phase 30 Step 4 dropped the RingProgress in favour of a Progress bar
    // plus big mono value. Assertion changed from "ring SVG present" to
    // "non-breach tile does not leak red colour into the DOM". The breach
    // signal is still carried by `breached` / `threshold` props (see tests
    // below).
    const { container } = renderCard({
      label: 'Test',
      value: '85%',
      icon: <span data-testid="icon" />,
      ringValue: 85,
    });
    expect(screen.getByText('85%')).toBeTruthy();
    expect(hasRedColorReference(container)).toBe(false);
  });

  it('renders in breach state with red color references', () => {
    const { container } = renderCard({
      label: 'Test',
      value: '72%',
      icon: <span />,
      ringValue: 72,
      breached: true,
    });
    // With breached=true, Mantine maps red.6 into the DOM via the value
    // Text colour and the Progress bar colour (Phase 30 Step 4 moved these
    // away from the ring to the bar).
    expect(screen.getByText('72%')).toBeTruthy();
    expect(hasRedColorReference(container)).toBe(true);
  });

  it('renders value Text with red color when breached=true', () => {
    const { container } = renderCard({
      label: 'Completeness',
      value: '72%',
      icon: <span />,
      ringValue: 72,
      breached: true,
    });
    const valueEl = screen.getByText('72%');
    expect(valueEl).toBeTruthy();
    // The breach styling should emit a red color reference in the rendered DOM.
    expect(hasRedColorReference(container)).toBe(true);
  });

  it('renders "threshold: {N}%" annotation when breached=true AND threshold is provided', () => {
    renderCard({
      label: 'Completeness',
      value: '72%',
      icon: <span />,
      ringValue: 72,
      breached: true,
      threshold: 80,
    });
    expect(screen.getByText('threshold: 80%')).toBeTruthy();
  });

  it('does NOT render threshold annotation when breached=false', () => {
    renderCard({
      label: 'Completeness',
      value: '72%',
      icon: <span />,
      ringValue: 72,
      breached: false,
      threshold: 80,
    });
    expect(screen.queryByText('threshold: 80%')).toBeNull();
  });

  it('renders as button when onClick is provided (Card component="button")', () => {
    const onClick = vi.fn();
    const { container } = renderCard({
      label: 'Clickable',
      value: '50',
      icon: <span />,
      onClick,
    });
    // Mantine Card component="button" renders a <button> element at the root
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = renderCard({
      label: 'Clickable',
      value: '50',
      icon: <span />,
      onClick,
    });
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies aria-label when ariaLabel prop is provided', () => {
    const { container } = renderCard({
      label: 'Completeness',
      value: '72%',
      icon: <span />,
      onClick: () => {},
      ariaLabel: 'Completeness: 72%, breached, threshold: 80%.',
    });
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('aria-label')).toBe(
      'Completeness: 72%, breached, threshold: 80%.',
    );
  });
});
