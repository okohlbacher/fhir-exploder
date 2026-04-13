/**
 * CodingDrillDown behavioral tests -- Phase 15, Plan 03, Task 4.
 *
 * Verifies tab rendering and cross-filter state wiring:
 *   - Fields tab renders DrillDownTable when hook returns data
 *   - Resources tab renders ResourceIssueTable when clicked
 *   - Clicking a field row cross-filters to Resources tab with field path
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

// ----- jsdom polyfills required by Mantine 8 -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  (
    globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
  ).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

  if (
    !(Element.prototype as unknown as { scrollIntoView?: () => void })
      .scrollIntoView
  ) {
    (
      Element.prototype as unknown as { scrollIntoView: () => void }
    ).scrollIntoView = function () {};
  }

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
});

// ----- mocks -----

const mockCoverageReport = {
  systemCode: 5,
  textOnly: 2,
  empty: 1,
  totalCodedFields: 8,
  sampleSize: 10,
  perPath: {
    'code': { systemCode: 5, textOnly: 2, empty: 1 },
    'category': { systemCode: 3, textOnly: 0, empty: 0 },
  },
  perResource: [
    {
      resourceId: 'Condition/c1',
      resourceType: 'Condition',
      issues: [{ path: 'code', classification: 'textOnly' as const }],
    },
    {
      resourceId: 'Condition/c2',
      resourceType: 'Condition',
      issues: [{ path: 'code', classification: 'empty' as const }],
    },
  ],
};

vi.mock('../hooks/useCodingCoverage', () => ({
  useCodingCoverage: () => ({
    Condition: mockCoverageReport,
  }),
}));

vi.mock('./SampleSizeControl', () => ({
  useSampleSize: () => [10],
}));

vi.mock('../components/quality/SampleSizeControl', () => ({
  useSampleSize: () => [10],
}));

// Mock useOutletContext to provide client
const mockClient = {
  getBaseUrl: () => 'http://localhost:8080',
  searchResources: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue({ entry: [] }),
  get: vi.fn().mockResolvedValue({ entry: [] }),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({ client: mockClient }),
  };
});

// Mock sampleResources to return empty array (avoids real FHIR calls)
vi.mock('../quality/sampling', () => ({
  sampleResources: vi.fn().mockResolvedValue([]),
}));

// Mock codingCoverageWalker
vi.mock('../quality/codingCoverageWalker', () => ({
  classifyCodedFields: vi.fn().mockReturnValue([]),
  aggregateCoverage: vi.fn(),
}));

// Now import the component after mocks are set up
import { CodingDrillDown } from '../components/quality/CodingDrillDown';

// ----- helpers -----

function renderDrillDown() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/quality/coding/Condition']}>
        <Routes>
          <Route path="/quality/coding/:type" element={<CodingDrillDown />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

// ----- tests -----

describe('CodingDrillDown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Fields tab by default with DrillDownTable content', () => {
    renderDrillDown();

    // Fields tab should be active
    const fieldsTab = screen.getByRole('tab', { name: 'Fields' });
    expect(fieldsTab).toBeTruthy();
    expect(fieldsTab.getAttribute('aria-selected')).toBe('true');

    // Field paths from perPath should be visible (use getAllByText since
    // "code" appears as both a field path and potentially in other Code elements)
    const codeElements = screen.getAllByText('code');
    expect(codeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('category')).toBeTruthy();
  });

  it('renders Resources tab when clicked', () => {
    renderDrillDown();

    // Click Resources tab
    const resourcesTab = screen.getByRole('tab', { name: 'Resources' });
    fireEvent.click(resourcesTab);

    // Resources tab should now be active
    expect(resourcesTab.getAttribute('aria-selected')).toBe('true');

    // ResourceIssueTable content should be visible (resource IDs)
    expect(screen.getByText('Condition/c1')).toBeTruthy();
    expect(screen.getByText('Condition/c2')).toBeTruthy();
  });

  it('cross-filter: clicking field row activates Resources tab with filter', () => {
    renderDrillDown();

    // Fields tab should be active initially
    const fieldsTab = screen.getByRole('tab', { name: 'Fields' });
    expect(fieldsTab.getAttribute('aria-selected')).toBe('true');

    // Find and click the row containing "code" field path
    // Use getAllByText since "code" appears multiple times, then find the one in the table
    const codeElements = screen.getAllByText('code');
    const codeInTable = codeElements.find((el) => el.closest('tr'));
    expect(codeInTable).toBeTruthy();
    const row = codeInTable!.closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    // Resources tab should now be active
    const resourcesTab = screen.getByRole('tab', { name: 'Resources' });
    expect(resourcesTab.getAttribute('aria-selected')).toBe('true');

    // The field filter input should contain "code"
    const fieldFilterInput = screen.getByLabelText('Filter by field path') as HTMLInputElement;
    expect(fieldFilterInput.value).toBe('code');
  });
});
