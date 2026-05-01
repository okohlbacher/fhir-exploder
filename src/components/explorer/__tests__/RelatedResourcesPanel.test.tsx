/**
 * Phase 48 / Plan 02 / Task 1 — RelatedResourcesPanel (D-15 coverage).
 *
 * Validates the shared render component (D-04):
 *   - parallel fetch + only count > 0 cards render
 *   - all-zero counts → component returns null
 *   - silent failure: one fetch throws → others render, no console.error
 *   - card click → useNavigate called with onCardNavigate(entry) result
 *   - loading state: 4 skeleton cards while populated.length === 0 and any in flight
 *   - title prop: section <Title> renders the passed-in string
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { Bundle } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';
import { RelatedResourcesPanel } from '../RelatedResourcesPanel';
import type { ReverseReferenceEntry } from '../../../utils/reverseReferenceCatalog';

// Polyfill ResizeObserver for jsdom (Pitfall 5)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

const mockGet = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({
    get: mockGet,
    fhirUrl: (p: string) => ({ toString: () => `http://test/fhir/${p}` }),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const wrap = (ui: ReactNode) => (
  <MantineProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </MantineProvider>
);

// Module-scoped stable references (Pitfall 2 — never inline arrays in JSX)
const TWO_ENTRIES: readonly ReverseReferenceEntry[] = [
  { type: 'Observation', param: 'x' },
  { type: 'Condition', param: 'y' },
];

const SIX_ENTRIES: readonly ReverseReferenceEntry[] = [
  { type: 'Observation', param: 'a' },
  { type: 'Condition', param: 'b' },
  { type: 'Encounter', param: 'c' },
  { type: 'Procedure', param: 'd' },
  { type: 'DiagnosticReport', param: 'e' },
  { type: 'AllergyIntolerance', param: 'f' },
];

const ONE_ENTRY: readonly ReverseReferenceEntry[] = [
  { type: 'Observation', param: 'x' },
];

beforeEach(() => {
  mockGet.mockReset();
  mockNavigate.mockReset();
});

describe('RelatedResourcesPanel', () => {
  it('parallel fetch: renders only entries with count > 0', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('Observation?')
        ? Promise.resolve({ resourceType: 'Bundle', total: 5 } as Bundle)
        : Promise.resolve({ resourceType: 'Bundle', total: 0 } as Bundle),
    );
    render(
      wrap(
        <RelatedResourcesPanel
          title="Test"
          entries={TWO_ENTRIES}
          refValue="Patient/p1"
          onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/p1`}
        />,
      ),
    );
    await waitFor(() => expect(screen.getByText('Observation')).toBeTruthy());
    expect(screen.queryByText('Condition')).toBeNull();
  });

  it('all zero counts: returns null', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({ resourceType: 'Bundle', total: 0 } as Bundle),
    );
    const { container } = render(
      wrap(
        <RelatedResourcesPanel
          title="Test"
          entries={TWO_ENTRIES}
          refValue="Patient/p1"
          onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/p1`}
        />,
      ),
    );
    // Wait until all promises settle and component re-renders to null
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('silent failure: one fetch throws → others render, no console.error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGet.mockImplementation((url: string) =>
      url.includes('Observation?')
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ resourceType: 'Bundle', total: 3 } as Bundle),
    );
    render(
      wrap(
        <RelatedResourcesPanel
          title="Test"
          entries={TWO_ENTRIES}
          refValue="Patient/p1"
          onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/p1`}
        />,
      ),
    );
    await waitFor(() => expect(screen.getByText('Condition')).toBeTruthy());
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('card click navigation: useNavigate called with onCardNavigate(entry)', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({ resourceType: 'Bundle', total: 7 } as Bundle),
    );
    const { container } = render(
      wrap(
        <RelatedResourcesPanel
          title="Test"
          entries={ONE_ENTRY}
          refValue="Patient/p1"
          onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/p1`}
        />,
      ),
    );
    await waitFor(() => expect(screen.getByText('Observation')).toBeTruthy());
    const card = container.querySelector('[class*=Card]');
    expect(card).toBeTruthy();
    fireEvent.click(card as Element);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/explorer/Observation?x=Patient/p1');
  });

  it('loading state: 4 skeleton cards while populated.length===0 and any in flight', () => {
    // Never-resolving promise so loading state is observable
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { container } = render(
      wrap(
        <RelatedResourcesPanel
          title="Test"
          entries={SIX_ENTRIES}
          refValue="Patient/p1"
          onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/p1`}
        />,
      ),
    );
    const loaders = container.querySelectorAll('[class*=Loader]');
    expect(loaders.length).toBe(4);
  });

  it('title prop: renders Title with passed-in title string', async () => {
    mockGet.mockImplementation(() =>
      Promise.resolve({ resourceType: 'Bundle', total: 2 } as Bundle),
    );
    render(
      wrap(
        <RelatedResourcesPanel
          title="My Custom Title"
          entries={ONE_ENTRY}
          refValue="Patient/p1"
          onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/p1`}
        />,
      ),
    );
    await waitFor(() => expect(screen.getByText('My Custom Title')).toBeTruthy());
  });
});
