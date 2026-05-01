import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { Observation, Patient, Resource } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';
import { HumanReadableView } from '../HumanReadableView';
import { __resetReferenceCache } from '../../../hooks/useReferenceResolver';

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

// Bypass terminology resolution — these tests focus on Phase 47 affordances.
vi.mock('../../../hooks/useResolvedResource', () => ({
  useResolvedResource: <T,>(r: T): T => r,
}));

const mockReadResource = vi.fn();
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ readResource: mockReadResource }),
}));

const wrap = (ui: ReactNode) => (
  <MantineProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </MantineProvider>
);

beforeEach(() => {
  __resetReferenceCache();
  mockReadResource.mockReset();
});

describe('HumanReadableView integration (READ-01 + READ-02 + READ-03)', () => {
  it('renders all three new affordances together without errors', () => {
    mockReadResource.mockResolvedValue({
      resourceType: 'Patient',
      id: 'subj1',
      name: [{ family: 'Subject', given: ['Test'] }],
      gender: 'male',
      birthDate: '1970-06-15',
    } as Patient);

    const fixture: Observation = {
      resourceType: 'Observation',
      id: 'obs1',
      status: 'final',
      code: {
        coding: [{ system: 'http://loinc.org', code: '1234-5', display: 'Glucose' }],
      },
      subject: { reference: 'Patient/subj1' }, // → ReferenceLink (READ-01)
      effectiveDateTime: '2026-04-30',
      // → ExtensionChip (READ-02)
      _effectiveDateTime: {
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/data-absent-reason',
            valueCode: 'asked-unknown',
          },
        ],
      } as unknown as undefined,
      // → ContainedResourcesAccordion (READ-03)
      contained: [
        {
          resourceType: 'Practitioner',
          id: 'prac1',
          name: [{ family: 'Performer' }],
        },
      ],
      extension: [
        {
          url: 'http://example.org/resource-level',
          valueString: 'still rendered by bottom section',
        },
      ],
    } as unknown as Observation;

    render(wrap(<HumanReadableView resource={fixture} />));

    // READ-01: subject reference renders (initially the raw text Patient/subj1
    // appears while pending; the resolution may or may not have completed
    // synchronously, but the raw text is always present in pending or failed).
    expect(screen.getByText(/Patient\/subj1/)).toBeTruthy();

    // READ-02: chip for _effectiveDateTime extension
    expect(screen.getByText(/1 extension/)).toBeTruthy();

    // READ-03: contained accordion + Performer header
    expect(screen.getByText(/Contained Resources/i)).toBeTruthy();
    // Mantine Accordion mounts panel content even when collapsed, so the
    // family name "Performer" can appear in both header + (hidden) panel.
    expect(screen.getAllByText(/Performer/).length).toBeGreaterThan(0);

    // Resource-level Extensions section (Phase 35) — STILL renders
    expect(screen.getByText('Extensions')).toBeTruthy();
  });

  it('render order: property table → contained accordion → extensions section', () => {
    mockReadResource.mockResolvedValue(null);
    const fixture = {
      resourceType: 'Observation',
      id: 'obs2',
      code: { coding: [{ display: 'Test' }] },
      contained: [{ resourceType: 'Patient', id: 'p', name: [{ family: 'Z' }] }],
      extension: [{ url: 'http://x.org/e', valueString: 'ext-value' }],
    } as unknown as Resource;

    const { container } = render(wrap(<HumanReadableView resource={fixture} />));

    // Confirm DOM order via textContent positions:
    const html = container.innerHTML;
    // The resource type "Observation" appears as the badge at the top of the
    // ResourcePropertyTable header.
    const idxTable = html.indexOf('Observation');
    const idxAccordion = html.indexOf('Contained Resources');
    const idxExtensions = html.indexOf('ext-value');
    expect(idxTable).toBeGreaterThan(-1);
    expect(idxAccordion).toBeGreaterThan(idxTable);
    expect(idxExtensions).toBeGreaterThan(idxAccordion);
  });

  it('plain resource (no refs / extensions / contained) renders only property table', () => {
    const fixture: Patient = {
      resourceType: 'Patient',
      id: 'plain',
      name: [{ family: 'Plain' }],
    };
    render(wrap(<HumanReadableView resource={fixture} />));
    expect(screen.getByText('Plain')).toBeTruthy();
    expect(screen.queryByText(/Contained Resources/i)).toBeNull();
    // No chip, no resource-level Extensions section.
    // The string 'extension' is NOT a substring of any other rendered text
    // in this fixture (no _K siblings, no resource extension, no contained).
    expect(screen.queryByText(/extension/i)).toBeNull();
  });
});
