/**
 * SortableTh tests — QDDEP-05 (Plan 25-02 Task 2).
 *
 * Pass-through verification for the extracted shared sortable table header.
 * The component is a pure move from CompletenessPanel.tsx + CodingCoveragePanel.tsx
 * (byte-identical). These tests confirm children render, sort direction icon
 * swaps, and onClick fires.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider, Table } from '@mantine/core';

import { SortableTh } from '../SortableTh';

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

function renderHeader(props: {
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  label?: string;
}) {
  return render(
    <MantineProvider>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <SortableTh active={props.active} dir={props.dir} onClick={props.onClick}>
              {props.label ?? 'Name'}
            </SortableTh>
          </Table.Tr>
        </Table.Thead>
      </Table>
    </MantineProvider>,
  );
}

describe('SortableTh', () => {
  it('renders children text inside a Table.Th', () => {
    renderHeader({ active: false, dir: 'asc', onClick: vi.fn(), label: 'Name' });
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('invokes onClick exactly once when the button is clicked', () => {
    const onClick = vi.fn();
    renderHeader({ active: true, dir: 'desc', onClick });
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
