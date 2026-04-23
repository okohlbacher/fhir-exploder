import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

// Polyfill ResizeObserver for jsdom (required by Mantine ScrollArea)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill window.matchMedia for jsdom (required by Mantine)
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

// Mock useResourceCounts
const mockUseResourceCounts = vi.fn();
vi.mock('../hooks/useResourceCounts', () => ({
  useResourceCounts: (...args: unknown[]) => mockUseResourceCounts(...args),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useOutletContext: () => ({
    capability: {
      resourceType: 'CapabilityStatement',
      rest: [
        {
          mode: 'server',
          resource: [
            { type: 'Patient', interaction: [{ code: 'read' }], searchParam: [] },
            { type: 'Observation', interaction: [{ code: 'read' }], searchParam: [] },
            { type: 'Condition', interaction: [{ code: 'read' }], searchParam: [] },
          ],
        },
      ],
    },
    client: { search: vi.fn() },
  }),
  useNavigate: () => mockNavigate,
}));

// Mock useMedplum
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ search: vi.fn() }),
}));

import { fireEvent } from '@testing-library/react';
import { ResourceTypeLanding } from '../components/explorer/ResourceTypeLanding';

describe('ResourceTypeLanding count display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays count badges when counts are numbers', () => {
    mockUseResourceCounts.mockReturnValue({
      Patient: 100,
      Observation: 5000,
      Condition: 42,
    });

    render(<MantineProvider><ResourceTypeLanding /></MantineProvider>);

    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('5,000')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('displays loaders when counts are loading', () => {
    mockUseResourceCounts.mockReturnValue({
      Patient: 'loading',
      Observation: 'loading',
      Condition: 'loading',
    });

    render(<MantineProvider><ResourceTypeLanding /></MantineProvider>);

    // Mantine Loader renders with role="presentation" (svg elements)
    const loaders = document.querySelectorAll('.mantine-Loader-root');
    expect(loaders.length).toBeGreaterThanOrEqual(3);
  });

  it('displays error badges when counts fail', () => {
    mockUseResourceCounts.mockReturnValue({
      Patient: 'error',
      Observation: 'error',
      Condition: 'error',
    });

    render(<MantineProvider><ResourceTypeLanding /></MantineProvider>);

    // When countsReady and !showEmpty, error rows are filtered out (empty +
    // non-numeric are both hidden). Click "Show empty" to surface them.
    fireEvent.click(screen.getByRole('button', { name: /Show empty/ }));

    const errorBadges = screen.getAllByText('Error');
    expect(errorBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('calls useResourceCounts with the client and type names', () => {
    mockUseResourceCounts.mockReturnValue({});

    render(<MantineProvider><ResourceTypeLanding /></MantineProvider>);

    expect(mockUseResourceCounts).toHaveBeenCalledTimes(1);
    const [client, typeNames] = mockUseResourceCounts.mock.calls[0];
    expect(client).toBeDefined();
    expect(client.search).toBeDefined();
    expect(typeNames).toEqual(expect.arrayContaining(['Patient', 'Observation', 'Condition']));
  });
});
