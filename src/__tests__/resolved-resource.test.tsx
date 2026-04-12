import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Condition, Parameters } from '@medplum/fhirtypes';
import { TerminologyContext } from '../contexts/TerminologyContext';
import { TerminologyResolver } from '../terminology/TerminologyResolver';
import { useResolvedResource } from '../hooks/useResolvedResource';
import { mockMedplumClientForTerminology } from './fixtures/terminology';

const TX_URL = 'https://tx.example/fhir';

function wrapWithResolver(resolver: TerminologyResolver) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TerminologyContext.Provider value={resolver}>
        {children}
      </TerminologyContext.Provider>
    );
  };
}

/**
 * Probe component that captures the hook's return value into a ref so tests
 * can inspect the exact resource object (not just DOM text). Also renders
 * the first coding's display so tests can await DOM changes.
 */
function ConditionProbe({
  resource,
  captured,
}: {
  resource: Condition | undefined;
  captured: { current: Condition | undefined };
}) {
  const resolved = useResolvedResource(resource);
  captured.current = resolved;
  const display = resolved?.code?.coding?.[0]?.display ?? '(none)';
  return <div data-testid="display">{display}</div>;
}

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

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('useResolvedResource', () => {
  it('enriches display', async () => {
    const client = mockMedplumClientForTerminology({
      lookupResponses: { 'code=E11.9': E11_9_PARAMETERS },
    });
    const resolver = new TerminologyResolver(client, {
      displayLanguage: 'de',
      persistToLocalStorage: false,
      serverUrl: TX_URL,
    });
    const captured: { current: Condition | undefined } = { current: undefined };
    render(<ConditionProbe resource={makeCondition()} captured={captured} />, {
      wrapper: wrapWithResolver(resolver),
    });

    // First render: raw resource, no display (progressive enhancement baseline).
    expect(screen.getByTestId('display').textContent).toBe('(none)');

    // After resolver settles, hook re-renders with German display.
    await waitFor(() => {
      expect(screen.getByTestId('display').textContent).toBe(
        'Diabetes mellitus Typ 2',
      );
    });
    expect(captured.current?.code?.coding?.[0]?.display).toBe(
      'Diabetes mellitus Typ 2',
    );
  });

  it('returns undefined when resource is undefined', () => {
    const client = mockMedplumClientForTerminology();
    const resolver = new TerminologyResolver(client, {
      persistToLocalStorage: false,
      serverUrl: TX_URL,
    });
    const captured: { current: Condition | undefined } = { current: undefined };
    render(<ConditionProbe resource={undefined} captured={captured} />, {
      wrapper: wrapWithResolver(resolver),
    });
    expect(screen.getByTestId('display').textContent).toBe('(none)');
    expect(captured.current).toBeUndefined();
  });

  it('falls back silently when resolver throws', async () => {
    // Make $lookup path throw; resolveResource catches internally via resolveCoding
    // so the hook should never observe a throw and should keep showing raw resource.
    const client = mockMedplumClientForTerminology({
      errors: { 'CodeSystem/$lookup': new Error('network down') },
    });
    const resolver = new TerminologyResolver(client, {
      displayLanguage: 'de',
      persistToLocalStorage: false,
      serverUrl: TX_URL,
    });
    // Also sanity-check: even when we directly await resolveResource it does not
    // throw — the hook relies on this contract.
    const condition = makeCondition();
    await expect(resolver.resolveResource(condition)).resolves.toBeDefined();

    const captured: { current: Condition | undefined } = { current: undefined };
    render(<ConditionProbe resource={condition} captured={captured} />, {
      wrapper: wrapWithResolver(resolver),
    });

    // Resource visible from first render; never mutates to an error state.
    expect(screen.getByTestId('display').textContent).toBe('(none)');
    // Allow microtasks + effects to settle; display stays unresolved, no throw.
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByTestId('display').textContent).toBe('(none)');
    expect(captured.current?.code?.coding?.[0]?.display).toBeUndefined();
  });

  it('does not refetch for identical input reference', async () => {
    const client = mockMedplumClientForTerminology({
      lookupResponses: { 'code=E11.9': E11_9_PARAMETERS },
    });
    const getSpy = client.get as unknown as ReturnType<typeof vi.fn>;
    const resolver = new TerminologyResolver(client, {
      displayLanguage: 'de',
      persistToLocalStorage: false,
      serverUrl: TX_URL,
    });
    const resource = makeCondition();
    const captured: { current: Condition | undefined } = { current: undefined };
    const { rerender } = render(
      <ConditionProbe resource={resource} captured={captured} />,
      { wrapper: wrapWithResolver(resolver) },
    );
    await waitFor(() => {
      expect(screen.getByTestId('display').textContent).toBe(
        'Diabetes mellitus Typ 2',
      );
    });
    const callsAfterFirst = getSpy.mock.calls.length;
    // Re-render with the SAME resource reference; effect should not re-trigger a lookup.
    rerender(<ConditionProbe resource={resource} captured={captured} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(getSpy.mock.calls.length).toBe(callsAfterFirst);
  });
});
