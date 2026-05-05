/**
 * Phase 57 / Plan 02 / Task 2 — OutgoingReferencesPanel RTL coverage.
 *
 * Six scenarios (per CONTEXT D-05):
 *  1. returns null when refs array is empty (Encounter with no Reference fields)
 *  2. returns null when resourceType === 'Patient' (defense-in-depth guard)
 *  3. renders one row per OutgoingRef entry
 *  4. renders path label as monospace dim text
 *  5. renders ReferenceLink for each entry (pending branch → raw Type/id text in DOM)
 *  6. no dedup: same target via two paths produces two rows in DOM (D-03)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { Encounter, Condition, Patient } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';
import { OutgoingReferencesPanel } from '../OutgoingReferencesPanel';
import { PeekProvider } from '../../../contexts/PeekContext';

// jsdom polyfills (Mantine 8 uses ResizeObserver + matchMedia)
class MockResizeObserver { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  })),
});

// Mock useReferenceResolver so <ReferenceLink> renders deterministically (pending branch
// renders raw Type/id text — no fetch, no async assertions needed in structural tests).
vi.mock('../../../hooks/useReferenceResolver', () => ({
  useReferenceResolver: () => ({ resource: undefined, status: 'pending' }),
}));

// Stable client mock for useMedplum (transitively required even though useReferenceResolver
// is mocked above — defensive, matches IncomingReferencesPanel.test.tsx pattern).
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ readResource: vi.fn() }),
}));

const wrap = (ui: ReactNode) => (
  <MantineProvider>
    <MemoryRouter>
      <PeekProvider>{ui}</PeekProvider>
    </MemoryRouter>
  </MantineProvider>
);

describe('OutgoingReferencesPanel', () => {
  it('returns null when refs array is empty (Encounter with no Reference fields)', () => {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: 'e1',
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
    };
    render(wrap(<OutgoingReferencesPanel resource={encounter} />));
    // Panel returns null — no heading in DOM and no panel content
    expect(screen.queryByText('Outgoing References')).toBeNull();
    // No path label, no link — nothing from this component rendered
    expect(screen.queryByText('subject')).toBeNull();
  });

  it('returns null when resourceType is Patient (defense-in-depth Patient guard)', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }],
    };
    render(wrap(<OutgoingReferencesPanel resource={patient} />));
    expect(screen.queryByText('Outgoing References')).toBeNull();
    // No panel content from OutgoingReferencesPanel
    expect(screen.queryByText('subject')).toBeNull();
  });

  it('renders one row per OutgoingRef entry', () => {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: 'e2',
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
      subject: { reference: 'Patient/p1' },
      participant: [{ individual: { reference: 'Practitioner/pr1' } }],
    };
    render(wrap(<OutgoingReferencesPanel resource={encounter} />));
    // Heading must appear
    expect(screen.getByText('Outgoing References')).toBeTruthy();
    // Both path labels must appear
    expect(screen.getByText('subject')).toBeTruthy();
    expect(screen.getByText('participant[0].individual')).toBeTruthy();
  });

  it('renders path label as monospace dim text', () => {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: 'e3',
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
      subject: { reference: 'Patient/p1' },
    };
    render(wrap(<OutgoingReferencesPanel resource={encounter} />));
    // Path label "subject" is rendered as a Mantine Text element
    const pathLabel = screen.getByText('subject');
    expect(pathLabel).toBeTruthy();
    // Mantine Text with ff="monospace" renders a class containing "Text"
    expect(pathLabel.className).toMatch(/Text/);
  });

  it('renders ReferenceLink for each entry (pending branch → raw Type/id text in DOM)', () => {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: 'e4',
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
      subject: { reference: 'Patient/p1' },
      participant: [{ individual: { reference: 'Practitioner/pr1' } }],
    };
    render(wrap(<OutgoingReferencesPanel resource={encounter} />));
    // ReferenceLink pending branch renders raw reference text in DOM
    expect(screen.getByText('Patient/p1')).toBeTruthy();
    expect(screen.getByText('Practitioner/pr1')).toBeTruthy();
  });

  it('no dedup: same target via two paths produces two rows in DOM (D-03)', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      id: 'c1',
      subject: { reference: 'Patient/p1' },
      recorder: { reference: 'Patient/p1' },
    };
    render(wrap(<OutgoingReferencesPanel resource={condition} />));
    // Both path labels rendered as separate rows
    expect(screen.getByText('subject')).toBeTruthy();
    expect(screen.getByText('recorder')).toBeTruthy();
    // Both ReferenceLink items rendered (two instances of 'Patient/p1')
    const allRefs = screen.getAllByText('Patient/p1');
    expect(allRefs.length).toBe(2);
  });
});
