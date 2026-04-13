/**
 * CompletenessDrillDown behavioral tests -- Phase 15, Plan 03, Task 4.
 *
 * Verifies tab rendering and cross-filter state wiring:
 *   - Fields tab renders DrillDownList when hook returns data
 *   - Resources tab renders ResourceIssueTable when clicked
 *   - Clicking a field row cross-filters to Resources tab with field path
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

const mockCompletenessReport = {
  populated: 18,
  total: 20,
  sampleSize: 10,
  totalForType: null,
  profileUrl: null,
  perPath: {
    'Patient.name': 10,
    'Patient.birthDate': 8,
  },
  perResource: [
    {
      resourceId: 'Patient/p1',
      resourceType: 'Patient',
      missingPaths: ['Patient.birthDate'],
    },
    {
      resourceId: 'Patient/p2',
      resourceType: 'Patient',
      missingPaths: ['Patient.birthDate', 'Patient.name'],
    },
  ],
};

vi.mock('../hooks/useCompletenessReport', () => ({
  useCompletenessReport: () => ({
    Patient: mockCompletenessReport,
  }),
}));

vi.mock('./SampleSizeControl', () => ({
  useSampleSize: () => [10],
}));

vi.mock('../components/quality/SampleSizeControl', () => ({
  useSampleSize: () => [10],
}));

// Mock getProfileForType to return null (no profile alert)
vi.mock('../quality/profiles', () => ({
  getProfileForType: () => null,
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

// Now import the component after mocks are set up
import { CompletenessDrillDown } from '../components/quality/CompletenessDrillDown';

// ----- helpers -----

function renderDrillDown() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/quality/completeness/Patient']}>
        <Routes>
          <Route path="/quality/completeness/:type" element={<CompletenessDrillDown />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

// ----- tests -----

describe('CompletenessDrillDown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Fields tab by default with DrillDownList content', () => {
    renderDrillDown();

    // Fields tab should be active
    const fieldsTab = screen.getByRole('tab', { name: 'Fields' });
    expect(fieldsTab).toBeTruthy();
    expect(fieldsTab.getAttribute('aria-selected')).toBe('true');

    // Field paths from perPath should be visible (use getAllByText since
    // paths may appear in both the fields tab and normalized issues)
    const nameElements = screen.getAllByText('Patient.name');
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    const birthDateElements = screen.getAllByText('Patient.birthDate');
    expect(birthDateElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Resources tab when clicked', () => {
    renderDrillDown();

    // Click Resources tab
    const resourcesTab = screen.getByRole('tab', { name: 'Resources' });
    fireEvent.click(resourcesTab);

    // Resources tab should now be active
    expect(resourcesTab.getAttribute('aria-selected')).toBe('true');

    // ResourceIssueTable content should be visible (resource IDs)
    // Patient/p2 has 2 missing paths so it appears twice in the table
    expect(screen.getByText('Patient/p1')).toBeTruthy();
    const p2Elements = screen.getAllByText('Patient/p2');
    expect(p2Elements.length).toBeGreaterThanOrEqual(1);
  });

  it('cross-filter: clicking field row activates Resources tab with filter', () => {
    renderDrillDown();

    // Fields tab should be active initially
    const fieldsTab = screen.getByRole('tab', { name: 'Fields' });
    expect(fieldsTab.getAttribute('aria-selected')).toBe('true');

    // Find and click the group containing "Patient.birthDate" field path.
    // "Patient.birthDate" appears in both the Fields tab (Code element) and
    // the Resources tab (issue field column), so find the one inside a
    // clickable Group (role="button") in the Fields tab panel.
    const birthDateElements = screen.getAllByText('Patient.birthDate');
    const clickableGroup = birthDateElements
      .map((el) => el.closest('[role="button"]'))
      .find((g) => g !== null);
    expect(clickableGroup).toBeTruthy();
    fireEvent.click(clickableGroup!);

    // Resources tab should now be active
    const resourcesTab = screen.getByRole('tab', { name: 'Resources' });
    expect(resourcesTab.getAttribute('aria-selected')).toBe('true');

    // The field filter input should contain "Patient.birthDate"
    const fieldFilterInput = screen.getByLabelText('Filter by field path') as HTMLInputElement;
    expect(fieldFilterInput.value).toBe('Patient.birthDate');
  });
});
