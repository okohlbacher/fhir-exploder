/**
 * PEEK-04 ReferenceLink Cmd+click integration tests (Plan 02 Task 1).
 *
 * Covers three end-to-end behaviors:
 *   1. resolved status: Cmd+click → drawer opens with resolved resource
 *   2. failed status: Cmd+click → drawer opens with raw reference text
 *      as monospace title AND "Reference unresolvable" body (D-01 contract)
 *   3. plain click: NO drawer (regression — preserves Phase 47 navigation)
 *
 * Mock harness mirrors src/__tests__/peek-srp-integration.test.tsx +
 * src/components/explorer/__tests__/ReferenceLink.test.tsx (Phase 47).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider } from '../contexts/PeekContext';
import { BasePathProvider } from '../contexts/BasePathContext';
import { JsonPeekDrawer } from '../components/json/JsonPeekDrawer';
import { ReferenceLink } from '../components/explorer/ReferenceLink';

// ---------------------------------------------------------------------------
// Polyfills (Mantine 8 / jsdom)
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({}),
}));

const mockUseRefResolver = vi.fn();
vi.mock('../hooks/useReferenceResolver', async () => {
  const actual = await vi.importActual<
    typeof import('../hooks/useReferenceResolver')
  >('../hooks/useReferenceResolver');
  return {
    ...actual,
    useReferenceResolver: (ref: string | undefined) =>
      mockUseRefResolver(ref),
  };
});

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function renderHarness(reference = 'Patient/pat-x'): React.ReactElement {
  return render(
    <MantineProvider env="test">
      <MemoryRouter>
        <PeekProvider>
          <ReferenceLink reference={reference} />
          <JsonPeekDrawer />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>,
  ) as unknown as React.ReactElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReferenceLink Cmd+click peek (PEEK-04)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseRefResolver.mockReset();
  });

  it('resolved status: Cmd+click opens drawer with resolved resource', () => {
    mockUseRefResolver.mockReturnValue({
      resource: {
        resourceType: 'Patient',
        id: 'pat-x',
        name: [{ family: 'Doe' }],
      },
      status: 'resolved',
    });

    renderHarness();

    const anchor = screen.getByRole('link');
    fireEvent.click(anchor, { metaKey: true });

    // Drawer title = resourceType/id (from openPeek non-error branch).
    // The anchor itself shows the summary (e.g. "Doe"), not the raw "Patient/pat-x",
    // so getByText('Patient/pat-x') uniquely targets the drawer title.
    expect(screen.getByText('Patient/pat-x')).toBeTruthy();

    // Open-full button visible in success state
    expect(
      screen.queryByRole('button', { name: /Open full →/ }),
    ).not.toBeNull();
  });

  it('failed status: Cmd+click opens drawer with raw reference title AND "Reference unresolvable" body', () => {
    mockUseRefResolver.mockReturnValue({
      resource: null,
      status: 'failed',
    });

    renderHarness('Patient/pat-x');

    const anchor = screen.getByRole('link');
    fireEvent.click(anchor, { metaKey: true });

    // D-01 contract: drawer title is the raw reference text. The anchor itself
    // also shows the raw text in failed state (per Phase 47 ReferenceLink), so
    // both the anchor and the drawer title render 'Patient/pat-x'. Use
    // getAllByText and assert >= 2 occurrences (one for anchor, one for title).
    const matches = screen.getAllByText('Patient/pat-x');
    expect(matches.length).toBeGreaterThanOrEqual(2);

    // Body assertion (the literal D-01 unresolvable string)
    expect(screen.getByText('Reference unresolvable')).toBeTruthy();

    // Open-full button hidden in error state (D-05)
    expect(
      screen.queryByRole('button', { name: /Open full →/ }),
    ).toBeNull();
  });

  it('plain click (no modifier) does NOT open drawer (regression)', () => {
    mockUseRefResolver.mockReturnValue({
      resource: {
        resourceType: 'Patient',
        id: 'pat-x',
        name: [{ family: 'Doe' }],
      },
      status: 'resolved',
    });

    renderHarness();

    const anchor = screen.getByRole('link');
    fireEvent.click(anchor); // no modifier

    // Drawer-specific [Open full →] button is NOT present — drawer never opened.
    // (Plain click on an in-app anchor is intercepted by parent ResourceDetailPage
    // in the real app, but in this isolated harness it's a no-op for the drawer.)
    expect(
      screen.queryByRole('button', { name: /Open full →/ }),
    ).toBeNull();
  });
});

describe('ReferenceLink — FIX-01 BasePathContext href construction', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseRefResolver.mockReset();
    // Resolved status so an Anchor (role="link") renders, not a Skeleton.
    mockUseRefResolver.mockReturnValue({
      resource: { resourceType: 'Observation', id: 'o1' },
      status: 'resolved',
    });
  });

  it('builds href with /explorer prefix when no BasePathProvider is present (default)', () => {
    render(
      <MantineProvider env="test">
        <MemoryRouter>
          <PeekProvider>
            <ReferenceLink reference="Observation/o1" />
          </PeekProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    const anchor = screen.getByRole('link');
    expect(anchor).toHaveAttribute('href', '/explorer/Observation/o1');
  });

  it('builds href with /patients/:patientId prefix when wrapped in BasePathProvider', () => {
    render(
      <MantineProvider env="test">
        <MemoryRouter>
          <PeekProvider>
            <BasePathProvider value="/patients/p1">
              <ReferenceLink reference="Observation/o1" />
            </BasePathProvider>
          </PeekProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    const anchor = screen.getByRole('link');
    expect(anchor).toHaveAttribute('href', '/patients/p1/Observation/o1');
  });

  it('middle-click (button=1) on the Anchor does not preventDefault — browser handles new tab; href carries patient context', () => {
    render(
      <MantineProvider env="test">
        <MemoryRouter>
          <PeekProvider>
            <BasePathProvider value="/patients/p1">
              <ReferenceLink reference="Observation/o1" />
            </BasePathProvider>
          </PeekProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    const anchor = screen.getByRole('link');
    const event = new MouseEvent('auxclick', {
      bubbles: true,
      cancelable: true,
      button: 1,
    });
    const defaultPrevented = !anchor.dispatchEvent(event);
    // Our handler only intercepts metaKey/ctrlKey clicks; auxclick falls through.
    expect(defaultPrevented).toBe(false);
    expect(anchor).toHaveAttribute('href', '/patients/p1/Observation/o1');
  });
});
