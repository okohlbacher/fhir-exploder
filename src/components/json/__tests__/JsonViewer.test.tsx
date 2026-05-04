import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';

// Polyfill ResizeObserver for jsdom (required by Mantine components)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom (required by Mantine)
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

import { JsonViewer } from '../JsonViewer';

// Small fixture to produce known JSON with a predictable number of lines:
// { "resourceType": "Patient", "id": "p1", "active": true }
// → 4 lines when pretty-printed (open brace, 3 fields, close brace)
const fixture: Resource = {
  resourceType: 'Patient',
  id: 'p1',
  active: true,
};

function renderJsonViewer(props: { resource: Resource; showLineNumbers?: boolean }) {
  return render(
    <MantineProvider>
      <JsonViewer {...props} />
    </MantineProvider>,
  );
}

describe('JsonViewer (PEEK-06 + SHELL-04)', () => {
  it('tree mode renders without showLineNumbers', () => {
    const { container } = renderJsonViewer({ resource: fixture });
    // Default tree mode must NOT render a <pre> element (that's the line-numbers branch)
    expect(container.querySelector('pre')).toBeNull();
  });

  it('showLineNumbers renders flat <pre> with numbered gutter', () => {
    const { container } = renderJsonViewer({ resource: fixture, showLineNumbers: true });
    // Must render a <pre> element
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    // Line numbers 1, 2, 3 must be visible (fixture has at least 4 lines)
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });
});
