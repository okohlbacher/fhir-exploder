import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Condition, Parameters } from '@medplum/fhirtypes';
import { MedplumClient } from '@medplum/core';
import { MedplumProvider } from '@medplum/react';
import { MantineProvider } from '@mantine/core';
import { TerminologyContext } from '../contexts/TerminologyContext';
import { TerminologyResolver } from '../terminology/TerminologyResolver';
import { HumanReadableView } from '../components/explorer/HumanReadableView';
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
  // Medplum's ResourceTable needs a MedplumClient in context for any Reference
  // resolution or property display that reaches into `useMedplum()`. We build
  // a real MedplumClient with a stubbed fetch so nothing ever hits the network
  // — ResourceTable's pure-rendering path is all we exercise.
  const medplum = new MedplumClient({
    baseUrl: 'https://fhir.example/',
    fhirUrlPath: 'fhir',
    fetch: vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch,
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MantineProvider>
        <MemoryRouter>
          <MedplumProvider medplum={medplum}>
            <TerminologyContext.Provider value={resolver}>
              {children}
            </TerminologyContext.Provider>
          </MedplumProvider>
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
    // Medplum's ResourceTable renders CodeableConcept.coding[0].display once
    // useResolvedResource hands over the enriched resource.
    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes('Diabetes mellitus Typ 2')),
      ).toBeTruthy();
    });
  });

  it('fallback to code', async () => {
    // Resolver fails on every $lookup — UI must render the raw code, no crash.
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
    // Raw code appears via Medplum's native fallback (formatCoding -> code
    // when display is unset). Assert the raw code is somewhere in the DOM
    // and the enriched term never appears.
    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes('E11.9')),
      ).toBeTruthy();
    });
    expect(screen.queryByText('Diabetes mellitus Typ 2')).toBeNull();
  });
});
