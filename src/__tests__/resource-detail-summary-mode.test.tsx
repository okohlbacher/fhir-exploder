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

describe.skip('Summary mode (SHELL-02)', () => {
  it('primary heading', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });

  it('incoming refs in summary', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });

  it('patient related in summary', () => {
    expect(true).toBe(true); // PLACEHOLDER — Plan 02 replaces with real assertions
  });
});
