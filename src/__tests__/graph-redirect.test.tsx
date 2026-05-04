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

// getBoundingClientRect polyfill (React Flow needs it)
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
}));

describe.skip('NavigateToMode redirect (SHELL-03)', () => {
  it('redirects /explorer/Patient/p1/graph to ?mode=graph', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });

  it('patient graph redirect', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });
});
