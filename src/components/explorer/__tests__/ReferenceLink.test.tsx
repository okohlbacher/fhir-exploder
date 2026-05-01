/**
 * Phase 47 / Plan 01 / Task 3 (Wave 0) — ReferenceLink visual states.
 *
 * Asserts the four visual states (pending / resolved / failed / contained)
 * + Tooltip wrap + href shape + display-prop dim text per UI-SPEC §Component 1.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { ReferenceLink } from '../ReferenceLink';
import { __resetReferenceCache } from '../../../hooks/useReferenceResolver';

// Polyfill ResizeObserver for jsdom
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

const mockUseRefResolver = vi.fn();
vi.mock('../../../hooks/useReferenceResolver', async () => {
  const actual = await vi.importActual<
    typeof import('../../../hooks/useReferenceResolver')
  >('../../../hooks/useReferenceResolver');
  return {
    ...actual,
    useReferenceResolver: (ref: string) => mockUseRefResolver(ref),
  };
});

const wrap = (ui: React.ReactNode) => <MantineProvider>{ui}</MantineProvider>;

beforeEach(() => {
  __resetReferenceCache();
  mockUseRefResolver.mockReset();
});

describe('ReferenceLink', () => {
  it('pending: renders raw text + Skeleton', () => {
    mockUseRefResolver.mockReturnValue({ resource: null, status: 'pending' });
    const { container } = render(wrap(<ReferenceLink reference="Patient/abc" />));
    expect(screen.getByText('Patient/abc')).toBeTruthy();
    // Mantine 8 Skeleton uses class names like "mantine-Skeleton-root"
    expect(
      container.querySelector('[class*="Skeleton"], [class*="skeleton"]'),
    ).toBeTruthy();
  });

  it('resolved: renders summarizeResource(target).primary in Anchor with /explorer href', () => {
    mockUseRefResolver.mockReturnValue({
      resource: {
        resourceType: 'Patient',
        id: 'abc',
        name: [{ family: 'Mueller', given: ['Anna'] }],
        gender: 'female',
        birthDate: '1980-01-01',
      },
      status: 'resolved',
    });
    render(wrap(<ReferenceLink reference="Patient/abc" />));
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/explorer/Patient/abc');
    expect(link.textContent).toContain('Mueller, Anna');
    expect(link.getAttribute('aria-label')).toContain('Patient/abc');
  });

  it('failed: renders raw Type/id with /explorer href intact', () => {
    mockUseRefResolver.mockReturnValue({ resource: null, status: 'failed' });
    render(wrap(<ReferenceLink reference="Patient/missing" />));
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/explorer/Patient/missing');
    expect(link.textContent).toContain('Patient/missing');
  });

  it('absolute URL: href derived from normalized Type/id', () => {
    mockUseRefResolver.mockReturnValue({
      resource: {
        resourceType: 'Encounter',
        id: 'enc1',
        class: { display: 'ambulatory' },
      },
      status: 'resolved',
    });
    render(
      wrap(<ReferenceLink reference="http://blaze:8080/fhir/Encounter/enc1" />),
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/explorer/Encounter/enc1',
    );
  });

  it('fragment ref + matching contained: resolves locally without hook', () => {
    mockUseRefResolver.mockReturnValue({ resource: null, status: 'pending' });
    const parent = {
      resourceType: 'Bundle',
      id: 'b1',
      contained: [
        { resourceType: 'Patient', id: 'sub1', name: [{ family: 'Doe' }] },
      ],
    } as unknown as Resource;
    render(wrap(<ReferenceLink reference="#sub1" parentResource={parent} />));
    expect(mockUseRefResolver).not.toHaveBeenCalled();
    expect(screen.getByText(/Doe/)).toBeTruthy();
  });

  it('fragment ref + no matching contained: shows raw fragment text', () => {
    render(wrap(<ReferenceLink reference="#orphan" parentResource={undefined} />));
    expect(screen.getByText('#orphan')).toBeTruthy();
    expect(mockUseRefResolver).not.toHaveBeenCalled();
  });

  it('display prop is shown only when not resolved', () => {
    mockUseRefResolver.mockReturnValue({ resource: null, status: 'failed' });
    render(wrap(<ReferenceLink reference="Patient/x" display="John Smith" />));
    expect(screen.getByText('(John Smith)')).toBeTruthy();
  });
});
