import { describe, it, expect, vi } from 'vitest';

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

describe.skip('JsonViewer (PEEK-06 + SHELL-04)', () => {
  it('tree mode renders without showLineNumbers', () => {
    expect(true).toBe(true); // PLACEHOLDER — Task 4 replaces with real assertions
  });

  it('showLineNumbers renders flat <pre> with numbered gutter', () => {
    expect(true).toBe(true); // PLACEHOLDER — Task 4 replaces with real assertions
  });
});
