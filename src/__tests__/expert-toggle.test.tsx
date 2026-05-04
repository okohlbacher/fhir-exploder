/**
 * Expert Toggle tests (SIDE-02 / SIDE-03 / SIDE-04)
 *
 * Describe 1: Sidebar surfaces — Expert Toggle switch, server URL visibility
 * Describe 2: SearchResultsPage ID cell truncation — source-grep contract
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider, AppShell } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { join } from 'path';
import '@testing-library/jest-dom';

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

// Mock useTerminologyHealth so Sidebar doesn't need terminology context
vi.mock('../hooks/useTerminologyHealth', () => ({
  useTerminologyHealth: vi.fn().mockReturnValue('not-configured'),
}));

// Mock useSettingsContext so Sidebar gets settings.fhir.serverUrl
vi.mock('../contexts/SettingsContext', async () => {
  const actual = await vi.importActual<typeof import('../contexts/SettingsContext')>(
    '../contexts/SettingsContext',
  );
  return {
    ...actual,
    useSettingsContext: vi.fn().mockReturnValue({
      settings: { fhir: { serverUrl: 'http://localhost:8080/fhir', auth: { mode: 'open' } } },
      usingDefaults: false,
      loading: false,
      setSettings: vi.fn(),
    }),
  };
});

// Spotlight requires a store; mock openSpotlight to avoid store initialization errors
vi.mock('@mantine/spotlight', async () => {
  const actual = await vi.importActual<typeof import('@mantine/spotlight')>('@mantine/spotlight');
  return { ...actual, openSpotlight: vi.fn() };
});

import * as ConnectionContextModule from '../contexts/ConnectionContext';
import { ExpertModeProvider } from '../contexts/ExpertModeContext';
import { Sidebar } from '../components/layout/Sidebar';

function renderSidebar() {
  // Provide an idle ConnectionContext (no capability → no counts fetch)
  vi.spyOn(ConnectionContextModule, 'useConnectionContext').mockReturnValue({
    state: { status: 'idle' },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  return render(
    <MantineProvider>
      <MemoryRouter>
        <ExpertModeProvider>
          <AppShell navbar={{ width: 240, breakpoint: 0 }}>
            <AppShell.Navbar>
              <Sidebar connectionStatus="connected" />
            </AppShell.Navbar>
          </AppShell>
        </ExpertModeProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('Expert Toggle (SIDE-02 / SIDE-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage so each test starts with expert mode OFF
    localStorage.removeItem('app.expertMode.v1');
  });

  it('defaults to expert mode = false (Switch unchecked)', () => {
    renderSidebar();
    const toggle = screen.getByTestId('expert-mode-switch');
    // The Switch input should be unchecked when expert mode is off
    const input = toggle.querySelector('input[type="checkbox"]') ?? toggle;
    expect(input).not.toBeChecked();
    // useLocalStorage writes defaultValue ('false') on mount — expert mode is off
    const stored = localStorage.getItem('app.expertMode.v1');
    // Either null (not yet written) or 'false' — either way expert mode is off
    expect(stored === null || stored === 'false').toBe(true);
  });

  it('flips state and persists to localStorage when Switch is toggled', () => {
    renderSidebar();
    const toggle = screen.getByTestId('expert-mode-switch');
    const input = (toggle.querySelector('input[type="checkbox"]') ?? toggle) as HTMLInputElement;

    // Initially unchecked
    expect(input).not.toBeChecked();

    // Toggle on
    fireEvent.click(input);
    expect(input).toBeChecked();
    // useLocalStorage persists to localStorage under the key
    expect(localStorage.getItem('app.expertMode.v1')).toBe('true');
  });

  it('hides sidebar-server-url when expert mode is OFF', () => {
    renderSidebar();
    // Expert mode defaults to OFF — server URL should not be visible
    expect(screen.queryByTestId('sidebar-server-url')).not.toBeInTheDocument();
  });

  it('shows sidebar-server-url with correct URL text when expert mode is ON', () => {
    // Pre-set expert mode to ON in localStorage so ExpertModeProvider reads it
    localStorage.setItem('app.expertMode.v1', 'true');
    renderSidebar();
    const urlEl = screen.getByTestId('sidebar-server-url');
    expect(urlEl).toBeInTheDocument();
    expect(urlEl).toHaveTextContent('http://localhost:8080/fhir');
  });
});

describe('Expert Toggle — SearchResultsPage ID cell truncation (SIDE-03)', () => {
  it('source-grep contract: SearchResultsPage contains useExpertMode import and conditional truncation patterns', () => {
    // Read source file as text — avoids needing to fully mount SearchResultsPage
    // (which requires ExplorerLayout outlet context that is difficult to mock)
    const srcPath = join(
      __dirname,
      '../components/explorer/SearchResultsPage.tsx',
    );
    const src = readFileSync(srcPath, 'utf-8');

    // 1. useExpertMode must be imported
    expect(src).toContain("import { useExpertMode } from '../../contexts/ExpertModeContext'");

    // 2. isExpert must be destructured from the hook
    expect(src).toContain('const { isExpert } = useExpertMode()');

    // 3. Cards-mode Text uses conditional truncate
    expect(src).toContain('truncate={isExpert ? undefined : \'end\'}');

    // 4. SearchResultsPage is exported as a function
    expect(src).toContain('export function SearchResultsPage');
  });
});
