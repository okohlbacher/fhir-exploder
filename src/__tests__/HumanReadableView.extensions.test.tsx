import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    // Verify the deduped URL fragments (first-occurrence wins): both unique
    // URLs render exactly once even though `ext1` appears twice in the input.
    expect(screen.getAllByText('example.org/ext1')).toHaveLength(1);
    expect(screen.getAllByText('example.org/ext2')).toHaveLength(1);
    // The two unique extensions produce exactly two [View] buttons.
    expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(2);
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

  it('opens a Modal when [View] button is clicked', async () => {
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
    // Mantine 8 Modal renders via Transition + Portal — body materializes after
    // the transition tick. Use waitFor + screen.* (NEVER within(cell), P-13).
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    // Modal body contains the JSON dump. The same `valueString` / `hello-world`
    // tokens also appear in the row's Value-summary cell, so assert on the
    // pretty-printed JSON shape (`"valueString": "hello-world"`) which only
    // exists in the Modal's <Code block>.
    expect(screen.getByText(/"valueString": "hello-world"/)).toBeTruthy();
  });

  it('Modal closes via close button', async () => {
    const resource: Resource = {
      resourceType: 'Patient',
      id: 'p1',
      extension: [
        { url: 'https://example.org/ext1', valueString: 'hello' },
      ],
    };
    render(<HumanReadableView resource={resource} />, { wrapper: wrap });
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    // Modal close button has explicit aria-label="Close" (set via closeButtonProps)
    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
