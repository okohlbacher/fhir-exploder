import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import type { ReactNode } from 'react';

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

// Mock useResolvedResource to bypass the TerminologyProvider requirement —
// these tests focus on the bottom Extensions section, not terminology resolution.
vi.mock('../hooks/useResolvedResource', () => ({
  useResolvedResource: <T,>(r: T): T => r,
}));

import { HumanReadableView } from '../components/explorer/HumanReadableView';

function wrap({ children }: { children: ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('UAT-FU-02: Bottom Extensions section', () => {
  it('does NOT render the section when resource.extension is undefined', () => {
    const resource: Resource = { resourceType: 'Patient', id: 'p1' };
    render(<HumanReadableView resource={resource} />, { wrapper: wrap });
    expect(screen.queryByText('Extensions')).toBeNull();
  });

  it('does NOT render the section when resource.extension is empty array', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      extension: [],
    };
    render(<HumanReadableView resource={resource} />, { wrapper: wrap });
    expect(screen.queryByText('Extensions')).toBeNull();
  });

  it('renders one row per unique extension url (deduped, first-occurrence wins)', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      extension: [
        { url: 'https://example.org/ext1', valueString: 'first' },
        { url: 'https://example.org/ext1', valueString: 'duplicate' },
        { url: 'https://example.org/ext2', valueString: 'second' },
      ],
    };
    render(<HumanReadableView resource={resource} />, { wrapper: wrap });
    // Section heading appears
    expect(screen.getByText('Extensions')).toBeTruthy();
    // 1 header row + 2 data rows for the 2 unique URLs
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
  });

  it('renders the URL fragment as last 2 path segments', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      extension: [
        {
          url: 'https://medizininformatik-initiative.de/fhir/core/modul-person/CodeSystem/foo',
          valueString: 'bar',
        },
      ],
    };
    render(<HumanReadableView resource={resource} />, { wrapper: wrap });
    expect(screen.getByText('CodeSystem/foo')).toBeTruthy();
  });

  it('opens a Modal when [View] button is clicked', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      extension: [
        { url: 'https://example.org/ext1', valueString: 'hello-world' },
      ],
    };
    render(<HumanReadableView resource={resource} />, { wrapper: wrap });
    const viewBtn = screen.getByRole('button', { name: 'View' });
    fireEvent.click(viewBtn);
    // Modal opens (portaled — query via screen.*, NOT within(...))
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Modal body contains the JSON dump including the valueString token
    expect(screen.getByText(/valueString/)).toBeTruthy();
    expect(screen.getByText(/hello-world/)).toBeTruthy();
  });

  it('Modal closes via close button', () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      extension: [
        { url: 'https://example.org/ext1', valueString: 'hello' },
      ],
    };
    render(<HumanReadableView resource={resource} />, { wrapper: wrap });
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Mantine Modal close button has aria-label="Close"
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
