import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { ExtensionChip } from '../ExtensionChip';

// Polyfill ResizeObserver / matchMedia for jsdom (Mantine deps)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

const wrap = (ui: ReactNode) => <MantineProvider>{ui}</MantineProvider>;

describe('ExtensionChip', () => {
  it('returns null when extensions array is empty', () => {
    // Mantine injects a <style data-mantine-styles> element at provider mount,
    // so we assert "no rendered ExtensionChip output" by absence of any button.
    render(wrap(<ExtensionChip extensions={[]} />));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('singular label for 1 extension', () => {
    render(
      wrap(
        <ExtensionChip
          extensions={[
            {
              url: 'http://x.org/ext1',
              ext: { url: 'http://x.org/ext1', valueCode: 'asked-unknown' },
            },
          ]}
        />,
      ),
    );
    expect(screen.getByText(/1 extension$/)).toBeTruthy();
  });

  it('plural label for >1 extensions', () => {
    render(
      wrap(
        <ExtensionChip
          extensions={[
            { url: 'http://x/a', ext: { url: 'http://x/a', valueString: 'a' } },
            { url: 'http://x/b', ext: { url: 'http://x/b', valueString: 'b' } },
            { url: 'http://x/c', ext: { url: 'http://x/c', valueString: 'c' } },
          ]}
        />,
      ),
    );
    expect(screen.getByText(/3 extensions$/)).toBeTruthy();
  });

  it('click expands and shows URL + value', () => {
    render(
      wrap(
        <ExtensionChip
          extensions={[
            {
              url: 'http://hl7.org/fhir/StructureDefinition/data-absent-reason',
              ext: {
                url: 'http://hl7.org/fhir/StructureDefinition/data-absent-reason',
                valueCode: 'asked-unknown',
              },
            },
          ]}
        />,
      ),
    );
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(
      screen.getByText('http://hl7.org/fhir/StructureDefinition/data-absent-reason'),
    ).toBeTruthy();
    expect(screen.getByText('asked-unknown')).toBeTruthy();
  });

  it('click again collapses', () => {
    render(
      wrap(
        <ExtensionChip
          extensions={[{ url: 'http://x', ext: { url: 'http://x', valueCode: 'v' } }]}
        />,
      ),
    );
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('http://x')).toBeNull();
  });

  it('indexed primitive shows [i] prefix', () => {
    render(
      wrap(
        <ExtensionChip
          extensions={[
            {
              url: 'http://x',
              ext: { url: 'http://x', valueString: 'v0' },
              index: 0,
            },
            {
              url: 'http://x',
              ext: { url: 'http://x', valueString: 'v1' },
              index: 1,
            },
          ]}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('[0]')).toBeTruthy();
    expect(screen.getByText('[1]')).toBeTruthy();
  });

  it('nested extension recurses', () => {
    render(
      wrap(
        <ExtensionChip
          extensions={[
            {
              url: 'http://parent',
              ext: {
                url: 'http://parent',
                extension: [{ url: 'http://child', valueString: 'child-value' }],
              },
            },
          ]}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('http://parent')).toBeTruthy();
    expect(screen.getByText('http://child')).toBeTruthy();
    expect(screen.getByText('child-value')).toBeTruthy();
  });

  it('chip is keyboard-focusable as button', () => {
    render(
      wrap(
        <ExtensionChip
          extensions={[{ url: 'http://x', ext: { url: 'http://x', valueCode: 'v' } }]}
        />,
      ),
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('hooks-order safety: re-rendering same instance with extension count flipped between 0 and N does not crash (regression for CR-02)', () => {
    const ext = { url: 'http://x', ext: { url: 'http://x', valueCode: 'v' } };
    const { rerender } = render(wrap(<ExtensionChip extensions={[ext]} />));
    expect(screen.getByRole('button')).toBeTruthy();

    // Flip to zero extensions — component returns null. Hooks must still have run unconditionally.
    rerender(wrap(<ExtensionChip extensions={[]} />));
    expect(screen.queryByRole('button')).toBeNull();

    // Flip back — must still render without crashing (hooks count must be stable)
    rerender(wrap(<ExtensionChip extensions={[ext]} />));
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
