import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider, AppShell } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';

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

// Mock the hook so tests can inject any TerminologyHealth value deterministically.
vi.mock('../hooks/useTerminologyHealth', () => ({
  useTerminologyHealth: vi.fn(),
}));

import { useTerminologyHealth } from '../hooks/useTerminologyHealth';
import { Sidebar } from '../components/layout/Sidebar';

function renderSidebar() {
  return render(
    <MemoryRouter>
      <MantineProvider>
        <AppShell navbar={{ width: 240, breakpoint: 0 }}>
          <AppShell.Navbar>
            <Sidebar connectionStatus="connected" />
          </AppShell.Navbar>
        </AppShell>
      </MantineProvider>
    </MemoryRouter>,
  );
}

function findDotForLabel(labelText: string): HTMLElement | null {
  const labelEl = screen.getByText(labelText);
  // Terminology row structure: <Group> > [<Box dot/>, <Text label/>]
  const row = labelEl.parentElement;
  if (!row) return null;
  // The first child of the Group is the dot Box (has inline background style)
  const children = Array.from(row.children) as HTMLElement[];
  for (const child of children) {
    const style = child.getAttribute('style') ?? '';
    if (style.includes('background')) return child;
  }
  return null;
}

describe('Sidebar terminology row (V-15 UI)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders Reachable label with green dot', () => {
    vi.mocked(useTerminologyHealth).mockReturnValue('ok');
    renderSidebar();
    expect(screen.getByText('Terminology: Reachable')).toBeInTheDocument();
    const dot = findDotForLabel('Terminology: Reachable');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('style') ?? '').toMatch(/#40c057/i);
  });

  it('renders Unreachable label with red dot (V-15 primary assertion)', () => {
    vi.mocked(useTerminologyHealth).mockReturnValue('unreachable');
    renderSidebar();
    expect(screen.getByText('Terminology: Unreachable')).toBeInTheDocument();
    const dot = findDotForLabel('Terminology: Unreachable');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('style') ?? '').toMatch(/#fa5252/i);
  });

  it('renders Not configured label with neutral gray dot', () => {
    vi.mocked(useTerminologyHealth).mockReturnValue('not-configured');
    renderSidebar();
    expect(screen.getByText('Terminology: Not configured')).toBeInTheDocument();
    const dot = findDotForLabel('Terminology: Not configured');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('style') ?? '').toMatch(/#adb5bd/i);
  });

  it('renders Checking… label with pulsing neutral dot', () => {
    vi.mocked(useTerminologyHealth).mockReturnValue('unknown');
    renderSidebar();
    expect(screen.getByText('Terminology: Checking…')).toBeInTheDocument();
    const dot = findDotForLabel('Terminology: Checking…');
    expect(dot).not.toBeNull();
    const style = dot?.getAttribute('style') ?? '';
    expect(style).toMatch(/#adb5bd/i);
    expect(style).toMatch(/animation/);
  });
});
