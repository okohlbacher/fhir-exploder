/**
 * Plan 21-04 T-4.1 — `ResourceTypeSelector` rename contract.
 *
 * Asserts the two text contracts locked in UI-SPEC §S8:
 *   - `<MultiSelect label="Resource types" />`
 *   - Helper text reads `Filtering to: {value.join(', ')}` when value is non-empty
 *
 * VALIDATION.md rows (CHRT-04):
 *   `npx vitest run src/components/quality/ResourceTypeSelector.test.tsx`
 *   (file-level run — the `Resource types` literal also lets callers filter
 *   with `-t "Resource types"` if desired.)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { ResourceTypeSelector } from './ResourceTypeSelector';

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

function Wrap({ children }: { children: ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe('ResourceTypeSelector', () => {
  it('renders label "Resource types"', () => {
    render(
      <Wrap>
        <ResourceTypeSelector
          types={['Patient', 'Observation']}
          value={[]}
          onChange={() => {}}
        />
      </Wrap>,
    );
    // Mantine MultiSelect associates the label with both the hidden input and
    // the visible combobox; `getAllByLabelText` returns ≥1 when the label
    // string is wired.
    expect(screen.getAllByLabelText('Resource types').length).toBeGreaterThan(0);
  });

  it('shows "Filtering to:" helper when value is non-empty', () => {
    render(
      <Wrap>
        <ResourceTypeSelector
          types={['Patient', 'Observation', 'Condition']}
          value={['Patient', 'Observation']}
          onChange={() => {}}
        />
      </Wrap>,
    );
    expect(
      screen.getByText('Filtering to: Patient, Observation'),
    ).toBeTruthy();
  });

  it('shows "All resource types" helper when value is empty', () => {
    render(
      <Wrap>
        <ResourceTypeSelector
          types={['Patient', 'Observation']}
          value={[]}
          onChange={() => {}}
        />
      </Wrap>,
    );
    // Two matches: the placeholder and the helper text. getAllByText to avoid
    // flaking on whichever the renderer resolves first.
    expect(screen.getAllByText('All resource types').length).toBeGreaterThan(0);
  });
});
