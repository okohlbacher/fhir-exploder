/**
 * Phase 48 / Plan 03 / Task 1 — PatientRelatedResources regression baseline (D-16).
 *
 * This test is written FIRST against the CURRENT (pre-refactor) PatientRelatedResources
 * component. It captures the byte-identical DOM as a snapshot. After Task 2 refactors
 * the component to a thin wrapper around <RelatedResourcesPanel>, this same test must
 * STILL pass unchanged — proving D-19 backwards-compat invariant.
 *
 * Coverage (VALIDATION.md task ID 48-03-01):
 *   - 11 cards render with correct counts when all return total > 0
 *   - emoji icons preserved on all 11 cards
 *   - card click navigates to /explorer/{type}?patient=Patient/p1
 *   - section title is exactly "Related Resources"
 *   - returns null when all counts are 0
 *   - full DOM snapshot match
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { Bundle } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';
import { PatientRelatedResources } from '../PatientRelatedResources';
import { reverseReferenceCatalog } from '../../../utils/reverseReferenceCatalog';

// Polyfill ResizeObserver + matchMedia for jsdom (Pitfall 5)
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

// Stable client reference — required to avoid useEffect re-fire on every render.
// Discovered in Plan 48-02; if useMedplum() returns a fresh object per call,
// the [client, refValue, entries] effect deps churn and infinite-loop.
const stableClient = {
  get: mockGet,
  fhirUrl: (p: string) => ({ toString: () => `http://test/fhir/${p}` }),
};

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => stableClient,
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

const PATIENT_ENTRIES = reverseReferenceCatalog.Patient!;

beforeEach(() => {
  mockGet.mockReset();
  mockNavigate.mockReset();
});

describe('PatientRelatedResources', () => {
  it('byte-identical to baseline: 11 cards render with correct counts when all return total>0', async () => {
    mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 5 } as Bundle);
    const { container } = render(wrap(<PatientRelatedResources patientId="p1" />));

    // Wait until all 11 populated cards have been rendered (one per Patient catalog entry)
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*=Card]');
      // Skeleton cards (4 in flight) eventually disappear, leaving exactly 11 populated cards.
      expect(cards.length).toBe(PATIENT_ENTRIES.length);
    });

    // Each catalog entry's type label is in the document
    for (const entry of PATIENT_ENTRIES) {
      expect(screen.getByText(entry.type)).toBeTruthy();
    }

    // Each populated card carries the count badge value '5'
    const cards = container.querySelectorAll('[class*=Card]');
    for (const card of Array.from(cards)) {
      expect(card.textContent).toContain('5');
    }
  });

  it('byte-identical to baseline: emoji icons preserved on all 11 cards', async () => {
    mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 5 } as Bundle);
    const { container } = render(wrap(<PatientRelatedResources patientId="p1" />));

    await waitFor(() => {
      const cards = container.querySelectorAll('[class*=Card]');
      expect(cards.length).toBe(PATIENT_ENTRIES.length);
    });

    for (const entry of PATIENT_ENTRIES) {
      // Each Patient catalog entry has an icon defined; assert its glyph is in the DOM.
      expect(entry.icon).toBeDefined();
      expect(screen.getByText(entry.icon as string)).toBeTruthy();
    }
  });

  it('byte-identical to baseline: card click navigates to /explorer/{type}?patient=Patient/p1', async () => {
    mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 5 } as Bundle);
    const { container } = render(wrap(<PatientRelatedResources patientId="p1" />));

    await waitFor(() => {
      expect(screen.getByText('Condition')).toBeTruthy();
    });

    const cards = container.querySelectorAll('[class*=Card]');
    const conditionCard = Array.from(cards).find((c) => c.textContent?.includes('Condition'));
    expect(conditionCard).toBeTruthy();
    fireEvent.click(conditionCard as Element);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/explorer/Condition?patient=Patient/p1');
  });

  it('byte-identical to baseline: section title is `Related Resources`', async () => {
    mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 5 } as Bundle);
    render(wrap(<PatientRelatedResources patientId="p1" />));
    await waitFor(() => expect(screen.getByText('Related Resources')).toBeTruthy());
  });

  it('byte-identical to baseline: returns null when all counts are 0', async () => {
    mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 0 } as Bundle);
    const { container } = render(wrap(<PatientRelatedResources patientId="p1" />));

    // Wait until all 11 promises resolve
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(PATIENT_ENTRIES.length);
    });

    // Component returns null. MantineProvider may inject a <style> tag in the container,
    // so assert absence of our DOM contributions instead of container.firstChild === null.
    await waitFor(() => {
      expect(screen.queryByText('Related Resources')).toBeNull();
      expect(container.querySelector('[class*=Card]')).toBeNull();
      expect(container.querySelector('[class*=SimpleGrid]')).toBeNull();
    });
  });

  it('byte-identical to baseline: full DOM snapshot', async () => {
    mockGet.mockResolvedValue({ resourceType: 'Bundle', total: 5 } as Bundle);
    const { container } = render(wrap(<PatientRelatedResources patientId="p1" />));

    // Wait until exactly the 11 populated cards have rendered (skeleton cards gone)
    await waitFor(() => {
      const cards = container.querySelectorAll('[class*=Card]');
      expect(cards.length).toBe(PATIENT_ENTRIES.length);
    });

    // MantineProvider injects <style data-mantine-styles="true"> as container.firstChild;
    // skip it and snapshot only our component's outermost <div> (the panel wrapper).
    const panel = container.querySelector('div:not([data-mantine-styles])');
    expect(panel).toBeTruthy();
    expect(panel).toMatchSnapshot();
  });
});
