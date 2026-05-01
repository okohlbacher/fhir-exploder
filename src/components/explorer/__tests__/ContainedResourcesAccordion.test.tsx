import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { Bundle, Resource } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';
import { ContainedResourcesAccordion } from '../ContainedResourcesAccordion';
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

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ readResource: vi.fn() }),
}));

const wrap = (ui: ReactNode) => <MantineProvider>{ui}</MantineProvider>;

beforeEach(() => {
  __resetReferenceCache();
});

describe('ContainedResourcesAccordion', () => {
  it('returns null when contained is undefined', () => {
    render(
      wrap(
        <ContainedResourcesAccordion
          resource={{ resourceType: 'Bundle', id: 'b' } as Bundle}
        />,
      ),
    );
    // Heading should not appear
    expect(screen.queryByText(/Contained Resources/i)).toBeNull();
  });

  it('returns null when contained is empty array', () => {
    render(
      wrap(
        <ContainedResourcesAccordion
          resource={{ resourceType: 'Bundle', id: 'b', contained: [] } as unknown as Resource}
        />,
      ),
    );
    expect(screen.queryByText(/Contained Resources/i)).toBeNull();
  });

  it('renders single contained with summary header', () => {
    const r = {
      resourceType: 'Bundle',
      id: 'b',
      contained: [
        {
          resourceType: 'Patient',
          id: 'p1',
          name: [{ family: 'Mueller', given: ['Anna'] }],
          gender: 'female',
          birthDate: '1980-01-15',
        },
      ],
    } as unknown as Resource;
    render(wrap(<ContainedResourcesAccordion resource={r} />));
    expect(screen.getByText(/Contained Resources/i)).toBeTruthy();
    // Header text contains summarizeResource(c).primary which yields "Mueller, Anna".
    // Mantine Accordion mounts panels in the DOM, so the same text may also
    // appear inside the (hidden) panel's ResourcePropertyTable name row.
    // getAllByText accepts both header + panel occurrences as a pass.
    expect(screen.getAllByText(/Mueller, Anna/).length).toBeGreaterThan(0);
  });

  it('preserves source order across multiple contained', () => {
    const r = {
      resourceType: 'Bundle',
      id: 'b',
      contained: [
        { resourceType: 'Patient', id: 'a', name: [{ family: 'Anderson' }] },
        { resourceType: 'Practitioner', id: 'p', name: [{ family: 'Becker' }] },
      ],
    } as unknown as Resource;
    render(wrap(<ContainedResourcesAccordion resource={r} />));
    const items = screen.getAllByRole('button'); // accordion controls
    expect(items[0].textContent).toContain('Anderson');
    expect(items[1].textContent).toContain('Becker');
  });

  it('expands panel to reveal ResourcePropertyTable', () => {
    const r = {
      resourceType: 'Bundle',
      id: 'b',
      contained: [
        { resourceType: 'Patient', id: 'pat-001', name: [{ family: 'Doe' }] },
      ],
    } as unknown as Resource;
    render(wrap(<ContainedResourcesAccordion resource={r} />));
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    // ResourcePropertyTable renders the contained Patient's id 'pat-001' as
    // a <Code> in its header. The panel content is in the DOM regardless of
    // expanded state (Mantine 8 Accordion behavior), so this asserts the
    // table mounts with the correct resource — not strictly visibility.
    expect(screen.getAllByText('pat-001').length).toBeGreaterThan(0);
  });

  it('id-fallback for contained without id', () => {
    const r = {
      resourceType: 'Bundle',
      id: 'b',
      contained: [
        { resourceType: 'Practitioner', name: [{ family: 'NoId' }] },
      ],
    } as unknown as Resource;
    expect(() =>
      render(wrap(<ContainedResourcesAccordion resource={r} />)),
    ).not.toThrow();
    // Header + (hidden but mounted) panel both contain "NoId".
    expect(screen.getAllByText(/NoId/).length).toBeGreaterThan(0);
  });

  it('all panels collapsed by default', () => {
    const r = {
      resourceType: 'Bundle',
      id: 'b',
      contained: [
        { resourceType: 'Patient', id: 'a', name: [{ family: 'A' }] },
        { resourceType: 'Patient', id: 'b', name: [{ family: 'B' }] },
      ],
    } as unknown as Resource;
    render(wrap(<ContainedResourcesAccordion resource={r} />));
    // Mantine 8 Accordion mounts panel content in the DOM but reflects
    // collapsed state via aria-expanded="false" on the control buttons.
    // Use that semantic signal instead of DOM-presence checks.
    const buttons = screen.getAllByRole('button');
    for (const b of buttons) {
      expect(b.getAttribute('aria-expanded')).toBe('false');
    }
  });
});
