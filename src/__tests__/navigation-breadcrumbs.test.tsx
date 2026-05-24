/**
 * Phase 59 FIX-03 — NavigationBreadcrumbs bare /patients activation (EDGE-01).
 *
 * Asserts that the Patients root anchor activates on:
 *   - basePath === '/patients' (bare)         → Patients
 *   - basePath === '/patients/...'            → Patients
 *   - basePath === '/explorer'                → Explorer (default)
 *   - basePath === '/patients-admin'          → Explorer (over-match guard)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { NavigationBreadcrumbs } from '../components/explorer/NavigationBreadcrumbs';

// ----- jsdom polyfill required by Mantine 8 MantineProvider color-scheme -----
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

function renderBreadcrumbs(basePath: string) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <NavigationBreadcrumbs
          trail={[]}
          onNavigate={() => {}}
          currentResourceType="Patient"
          currentId="p1"
          basePath={basePath}
        />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('NavigationBreadcrumbs — FIX-03 patient-scope detection', () => {
  it("activates Patients root on bare '/patients' basePath", () => {
    renderBreadcrumbs('/patients');
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.queryByText('Explorer')).not.toBeInTheDocument();
  });

  it("activates Patients root on '/patients/p1' child basePath", () => {
    renderBreadcrumbs('/patients/p1');
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.queryByText('Explorer')).not.toBeInTheDocument();
  });

  it("activates Explorer root on '/explorer' default basePath", () => {
    renderBreadcrumbs('/explorer');
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.queryByText('Patients')).not.toBeInTheDocument();
  });

  it("does NOT over-match '/patients-admin' — falls back to Explorer", () => {
    renderBreadcrumbs('/patients-admin');
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.queryByText('Patients')).not.toBeInTheDocument();
  });
});
