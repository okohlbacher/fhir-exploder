import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';
import { ResourcePropertyTable } from '../components/explorer/ResourcePropertyTable';

// Polyfill ResizeObserver for jsdom
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom
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

function wrap({ children }: { children: ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('UAT-FU-02: Identifier system Tooltip', () => {
  it('renders identifier value normally; system URL is NOT in the main row text', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      identifier: [{ system: 'https://example.org/sys', value: 'abc' }],
    };
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    // Value is visible
    expect(screen.getByText('abc')).toBeTruthy();
    // System URL must NOT appear in the main table; it lives in the Tooltip
    // (Tooltip portals to body and is hidden until hover/focus — Mantine 8 default)
    expect(screen.queryByText('https://example.org/sys')).toBeNull();
    // Old dimmed-Text rendering would have stripped 'urn:' and shown the URL inline.
    expect(screen.queryByText('example.org/sys')).toBeNull();
  });

  it('Tooltip wires the full system URL on the identifier value cell', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      identifier: [{ system: 'https://example.org/sys', value: 'abc' }],
    };
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    // Mantine 8 Tooltip uses Floating UI which lazy-renders the content into a
    // portal asynchronously. In jsdom, hovering wires `aria-describedby` on the
    // trigger element synchronously even before the tooltip body materializes.
    // Asserting `aria-describedby` is the most reliable proof that the Tooltip
    // is wired (vs the visual hover content which is async + portaled and
    // unreliable in jsdom). P-13: never use within(cell) for portaled content.
    const valueEl = screen.getByText('abc');
    fireEvent.mouseEnter(valueEl);
    expect(valueEl.getAttribute('aria-describedby')).not.toBeNull();
    // And the cursor:help inline style is the visual-only affordance.
    expect((valueEl as HTMLElement).style.cursor).toBe('help');
  });
});

describe('UAT-FU-02: Resource-level extension SKIP_KEYS', () => {
  it('does NOT render an inline "extension" row for resource-level extension property', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      extension: [{ url: 'http://x', valueString: 'y' }],
    };
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    // 'extension' should NOT appear as a Field-column row label (SKIP_KEYS includes it)
    expect(screen.queryByText('extension')).toBeNull();
  });
});

describe('UAT-FU-02: Address-extension Modal trigger (deep JSON fallback)', () => {
  it('renders a [View] button instead of inline JSON for deeply-nested objects', () => {
    // Construct a fixture that triggers the depth-2+ fallback path. The
    // generic-nested-object branch recurses with depth+1; at depth >= 2 the
    // fallback fires. An address with extension on extension on extension
    // hits the depth limit.
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      address: [
        {
          line: ['Hauptstr 1'],
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/standardpostalcode',
              extension: [
                {
                  url: 'http://example.org/inner',
                  extension: [
                    { url: 'http://example.org/deepest', valueString: '12345' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    // Find at least one [View] button (the deep-JSON fallback should produce one)
    const viewButtons = screen.queryAllByRole('button', { name: 'View' });
    expect(viewButtons.length).toBeGreaterThan(0);
  });
});

describe('Phase 38.2: valueQuantity rendering on Observation', () => {
  it('renders BOTH value and unit when valueQuantity has { value: 98, unit: "mg/dL" }', () => {
    const resource: Resource = {
      resourceType: 'Observation',
      id: 'o1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '2345-7', display: 'Glucose' }] },
      valueQuantity: { value: 98, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' },
    } as Resource;
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    // Headline assertion: BOTH fragments appear together (e.g. "98 mg/dL")
    expect(screen.getByText(/98\s*mg\/dL/)).toBeTruthy();
  });

  it('renders value alone when only valueQuantity.value is present', () => {
    const resource: Resource = {
      resourceType: 'Observation',
      id: 'o2',
      status: 'final',
      code: { coding: [{ code: 'x' }] },
      valueQuantity: { value: 42 },
    } as Resource;
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('does NOT render a bare unit when valueQuantity.value is missing (anti-regression)', () => {
    const resource: Resource = {
      resourceType: 'Observation',
      id: 'o3',
      status: 'final',
      code: { coding: [{ code: 'x' }] },
      valueQuantity: { unit: 'mg/dL' },
    } as Resource;
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    // The unit alone is not a measurement. Assert the valueQuantity row
    // value cell renders an em-dash (—) or is empty — NEVER a bare 'mg/dL'.
    // Locate the Field cell labeled 'valueQuantity' and inspect its sibling.
    const fieldCell = screen.getByText('valueQuantity');
    const row = fieldCell.closest('tr');
    expect(row).not.toBeNull();
    // The bare-unit string MUST NOT appear inside this row.
    expect(row?.textContent ?? '').not.toMatch(/^valueQuantity\s*mg\/dL\s*$/);
    // Acceptable renderings: '—' (em-dash) or empty.
    // Stronger: query for 'mg/dL' inside the row scope.
    expect(row?.querySelector('code')?.textContent ?? '').not.toBe('mg/dL');
  });

  it('renders nothing meaningful when valueQuantity is empty (defensive)', () => {
    const resource: Resource = {
      resourceType: 'Observation',
      id: 'o4',
      status: 'final',
      code: { coding: [{ code: 'x' }] },
      valueQuantity: {},
    } as Resource;
    render(<ResourcePropertyTable resource={resource} />, { wrapper: wrap });
    const fieldCell = screen.getByText('valueQuantity');
    const row = fieldCell.closest('tr');
    expect(row).not.toBeNull();
    // No phantom value or unit should appear.
    expect(row?.textContent ?? '').not.toMatch(/\bmg\/dL\b/);
  });
});
