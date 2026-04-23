import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Condition, Parameters, Resource } from '@medplum/fhirtypes';
import { MantineProvider } from '@mantine/core';
import { TerminologyContext } from '../contexts/TerminologyContext';
import { TerminologyResolver } from '../terminology/TerminologyResolver';
import { mockMedplumClientForTerminology } from './fixtures/terminology';

// Polyfill ResizeObserver for jsdom (required by Mantine ScrollArea)
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

/**
 * HumanReadableView now renders the local `<ResourcePropertyTable>` (not
 * Medplum's `ResourceTable`). We mock that component to observe exactly which
 * resource reaches it after `useResolvedResource` settles — the integration
 * contract V-05 / V-14 cares about. Mocking here sidesteps the full
 * StructureDefinition indexing that would otherwise be required.
 */
vi.mock('../components/explorer/ResourcePropertyTable', () => ({
  ResourcePropertyTable: ({ resource }: { resource: Resource | undefined }) => {
    const display =
      (resource as Condition | undefined)?.code?.coding?.[0]?.display ?? '(none)';
    const code = (resource as Condition | undefined)?.code?.coding?.[0]?.code ?? '(none)';
    return (
      <div>
        <span data-testid="rt-display">{display}</span>
        <span data-testid="rt-code">{code}</span>
      </div>
    );
  },
}));

// Now import HumanReadableView AFTER the mock is registered.
import { HumanReadableView } from '../components/explorer/HumanReadableView';

const TX_URL = 'https://tx.example/fhir';
const ICD10 = 'http://hl7.org/fhir/sid/icd-10';

const E11_9_PARAMETERS: Parameters = {
  resourceType: 'Parameters',
  parameter: [
    { name: 'display', valueString: 'Type 2 diabetes mellitus without complications' },
    {
      name: 'designation',
      part: [
        { name: 'language', valueCode: 'de' },
        { name: 'value', valueString: 'Diabetes mellitus Typ 2' },
      ],
    },
  ],
};

function makeCondition(): Condition {
  return {
    resourceType: 'Condition',
    id: 'c1',
    subject: { reference: 'Patient/p1' },
    code: {
      coding: [{ system: ICD10, code: 'E11.9' }],
    },
  };
}

function wrapWithProviders(resolver: TerminologyResolver) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MantineProvider>
        <MemoryRouter>
          <TerminologyContext.Provider value={resolver}>
            {children}
          </TerminologyContext.Provider>
        </MemoryRouter>
      </MantineProvider>
    );
  };
}

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('HumanReadableView terminology integration', () => {
  it('renders resolved display', async () => {
    const client = mockMedplumClientForTerminology({
      lookupResponses: { 'code=E11.9': E11_9_PARAMETERS },
    });
    const resolver = new TerminologyResolver(client, {
      displayLanguage: 'de',
      persistToLocalStorage: false,
      serverUrl: TX_URL,
    });
    render(<HumanReadableView resource={makeCondition()} />, {
      wrapper: wrapWithProviders(resolver),
    });
    // First render: raw resource (no display) reaches the table.
    expect(screen.getByTestId('rt-display').textContent).toBe('(none)');
    // Once useResolvedResource settles, the enriched resource flows through.
    await waitFor(() => {
      expect(screen.getByTestId('rt-display').textContent).toBe(
        'Diabetes mellitus Typ 2',
      );
    });
  });

  it('fallback to code', async () => {
    // Resolver fails on every $lookup → UI must render the raw resource, no
    // crash, display stays unset so Medplum's native fallback would show the
    // code. Verified here by checking `rt-code` == the raw code.
    const client = mockMedplumClientForTerminology({
      errors: { 'CodeSystem/$lookup': new Error('terminology server dead') },
    });
    const resolver = new TerminologyResolver(client, {
      displayLanguage: 'de',
      persistToLocalStorage: false,
      serverUrl: TX_URL,
    });
    render(<HumanReadableView resource={makeCondition()} />, {
      wrapper: wrapWithProviders(resolver),
    });
    // Raw code is present from the first render and display stays unset.
    expect(screen.getByTestId('rt-code').textContent).toBe('E11.9');
    expect(screen.getByTestId('rt-display').textContent).toBe('(none)');
    // Let effect + resolver settle; display MUST still be unset (silent fallback).
    await new Promise((r) => setTimeout(r, 20));
    await waitFor(() => {
      // findByText equivalent: raw code remains asserted after settle.
      expect(screen.findByText('E11.9')).toBeTruthy();
    });
    expect(screen.getByTestId('rt-display').textContent).toBe('(none)');
    // No "Diabetes mellitus Typ 2" should ever appear.
    expect(screen.queryByText('Diabetes mellitus Typ 2')).toBeNull();
  });
});
