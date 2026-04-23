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
import { SettingsProvider } from '../contexts/SettingsContext';
import { ConnectionProvider } from '../contexts/ConnectionContext';

function renderSidebar() {
  return render(
    <MemoryRouter>
      <MantineProvider>
        <SettingsProvider>
          <ConnectionProvider>
            <AppShell navbar={{ width: 240, breakpoint: 0 }}>
              <AppShell.Navbar>
                <Sidebar connectionStatus="connected" />
              </AppShell.Navbar>
            </AppShell>
          </ConnectionProvider>
        </SettingsProvider>
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
    expect(screen.getByText('Terminology: Reachable')).toBeTruthy();
    const dot = findDotForLabel('Terminology: Reachable');
    expect(dot).not.toBeNull();
    // jsdom normalizes hex to rgb(); #40c057 → rgb(64, 192, 87)
    expect(dot?.getAttribute('style') ?? '').toMatch(/rgb\(64,\s*192,\s*87\)/i);
  });

  it('renders Unreachable label with red dot (V-15 primary assertion)', () => {
    vi.mocked(useTerminologyHealth).mockReturnValue('unreachable');
    renderSidebar();
    expect(screen.getByText('Terminology: Unreachable')).toBeTruthy();
    const dot = findDotForLabel('Terminology: Unreachable');
    expect(dot).not.toBeNull();
    // #fa5252 → rgb(250, 82, 82)
    expect(dot?.getAttribute('style') ?? '').toMatch(/rgb\(250,\s*82,\s*82\)/i);
  });

  it('renders Not configured label with neutral gray dot', () => {
    vi.mocked(useTerminologyHealth).mockReturnValue('not-configured');
    renderSidebar();
    expect(screen.getByText('Terminology: Not configured')).toBeTruthy();
    const dot = findDotForLabel('Terminology: Not configured');
    expect(dot).not.toBeNull();
    // #adb5bd → rgb(173, 181, 189)
    expect(dot?.getAttribute('style') ?? '').toMatch(/rgb\(173,\s*181,\s*189\)/i);
  });

  it('renders Checking… label with pulsing neutral dot', () => {
    vi.mocked(useTerminologyHealth).mockReturnValue('unknown');
    renderSidebar();
    expect(screen.getByText('Terminology: Checking…')).toBeTruthy();
    const dot = findDotForLabel('Terminology: Checking…');
    expect(dot).not.toBeNull();
    const style = dot?.getAttribute('style') ?? '';
    expect(style).toMatch(/rgb\(173,\s*181,\s*189\)/i);
    expect(style).toMatch(/animation/);
  });
});
