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

  it('Tooltip wires the full system URL via label prop (rendered when triggered)', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      identifier: [{ system: 'https://example.org/sys', value: 'abc' }],
    };
    const { container } = render(
      <ResourcePropertyTable resource={resource} />,
      { wrapper: wrap },
    );
    // The Tooltip target Code element should be present and have a tooltip wiring;
    // Mantine sets aria-describedby once the trigger has registered with Tooltip.
    // We verify by triggering mouseenter on the code element to open the tooltip.
    const valueEl = screen.getByText('abc');
    fireEvent.mouseEnter(valueEl);
    // After hover, the system URL should render somewhere in the document via portal
    const tooltipContent = screen.queryByText('https://example.org/sys');
    expect(tooltipContent).not.toBeNull();
    // Suppress unused-var lint
    expect(container).toBeTruthy();
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
