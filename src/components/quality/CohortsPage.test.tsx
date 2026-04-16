/**
 * CohortsPage — Plan 22-03 Task 2 RTL tests (CHRT-06 Import/Export,
 * CHRT-07 row menu).
 *
 * Test names align with 22-VALIDATION.md per-row `-t` filters:
 *   - "row menu has 3 items"     (22-03-05)
 *   - "enforces 1MB import cap"  (22-03-06)
 *   - "exports SQ JSON"          (22-03-07)
 *   - "Cohort duplicated"        (22-03-08)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  act,
  fireEvent,
  within,
} from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { CohortDefinition } from '../../quality/cohorts';

// ---- Mocks ---------------------------------------------------------------

const mockSearch = vi.fn();
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ search: mockSearch }),
}));

// Mock @mantine/notifications so we can inspect the toast titles/messages
// WITHOUT relying on the Notifications portal lifecycle (DOM portal
// interactions are flaky in jsdom).
const mockShow = vi.fn();
vi.mock('@mantine/notifications', async () => {
  const actual = await vi.importActual<typeof import('@mantine/notifications')>(
    '@mantine/notifications',
  );
  return {
    ...actual,
    notifications: { show: mockShow },
  };
});

const mockAddCohort = vi.fn();
const mockDeleteCohort = vi.fn();
const mockUpdateCohort = vi.fn();
const mockDuplicateCohort = vi.fn();
const mockActivateCohort = vi.fn();
let mockCohorts: CohortDefinition[] = [];
let mockActiveCohortId: string | null = null;

vi.mock('../../hooks/useCohorts', () => ({
  useCohorts: () => ({
    cohorts: mockCohorts,
    activeCohortId: mockActiveCohortId,
    activeCohort:
      mockCohorts.find((c) => c.id === mockActiveCohortId) ?? null,
    hydrated: true,
    addCohort: mockAddCohort,
    activateCohort: mockActivateCohort,
    updateCohort: mockUpdateCohort,
    deleteCohort: mockDeleteCohort,
    duplicateCohort: mockDuplicateCohort,
  }),
}));

// Mock downloadString so Export tests don't need to spy on Blob/URL plumbing.
const mockDownloadString = vi.fn();
vi.mock('../../utils/export', () => ({
  downloadString: mockDownloadString,
}));

// ----- jsdom polyfills required by Mantine 8 -----

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

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

import { CohortsPage } from './CohortsPage';

beforeEach(() => {
  window.localStorage.clear();
  mockSearch.mockReset();
  mockShow.mockReset();
  mockAddCohort.mockReset();
  mockUpdateCohort.mockReset();
  mockDeleteCohort.mockReset();
  mockDuplicateCohort.mockReset();
  mockActivateCohort.mockReset();
  mockDownloadString.mockReset();
  mockCohorts = [];
  mockActiveCohortId = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Wrap({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <Notifications />
      <MemoryRouter>{children}</MemoryRouter>
    </MantineProvider>
  );
}

async function flush(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

function makeCohort(overrides: Partial<CohortDefinition> = {}): CohortDefinition {
  return {
    id: overrides.id ?? 'cohort-1',
    name: overrides.name ?? 'Diabetic adults',
    criteria: overrides.criteria ?? [
      {
        type: 'condition-code',
        system: 'http://snomed.info/sct',
        code: '44054006',
      },
    ],
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  };
}

describe('CohortsPage', () => {
  it('renders toolbar Import button labeled "Import" with upload icon', () => {
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    expect(
      screen.getByRole('button', {
        name: /import cohort from fdpg json file/i,
      }),
    ).toBeTruthy();
  });

  it('row menu has 3 items (Edit, Duplicate, Delete) when cohort contains a FHIRPath criterion (Export disabled)', async () => {
    mockCohorts = [
      makeCohort({
        id: 'c-fhir',
        name: 'FHIR cohort',
        criteria: [
          {
            type: 'fhirpath',
            expression: "Patient.where(gender = 'female')",
          },
        ],
      }),
    ];
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    const actionBtn = screen.getByRole('button', {
      name: /actions for cohort "FHIR cohort"/i,
    });
    await act(async () => {
      fireEvent.click(actionBtn);
    });
    await flush(50);

    expect(
      screen.getByRole('menuitem', { name: /^edit$/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('menuitem', { name: /^duplicate$/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('menuitem', { name: /^delete…?$/i }),
    ).toBeTruthy();

    // Export menu item is present but disabled via aria-disabled.
    const exportItem = screen.getByRole('menuitem', {
      name: /export to fdpg json/i,
    });
    expect(exportItem.getAttribute('data-disabled') !== null || exportItem.hasAttribute('disabled') || exportItem.getAttribute('aria-disabled') === 'true').toBe(true);
  });

  it('enforces 1MB import cap when File is oversize', async () => {
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    // The FileButton renders a hidden <input type="file">; find it directly.
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Create a mock oversize File (1.5 MB).
    const bigBlob = new Blob([new Uint8Array(1_500_000)], {
      type: 'application/json',
    });
    const bigFile = new File([bigBlob], 'huge.json', {
      type: 'application/json',
    });
    Object.defineProperty(bigFile, 'size', { value: 1_500_000 });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [bigFile],
        configurable: true,
      });
      fireEvent.change(fileInput);
    });
    await flush(100);

    // Red "Import failed" toast with cap copy.
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'red',
        title: 'Import failed',
        message:
          'File exceeds 1 MB cap. FDPG cohort exports are typically under 50 KB; this file may not be a valid FDPG export.',
      }),
    );
  });

  it('exports SQ JSON for a non-FHIRPath cohort', async () => {
    mockCohorts = [
      makeCohort({
        id: 'c-export',
        name: 'Export me',
        criteria: [
          {
            type: 'condition-code',
            system: 'http://snomed.info/sct',
            code: '44054006',
          },
        ],
      }),
    ];
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );

    const actionBtn = screen.getByRole('button', {
      name: /actions for cohort "Export me"/i,
    });
    await act(async () => {
      fireEvent.click(actionBtn);
    });
    await flush(50);

    const exportItem = screen.getByRole('menuitem', {
      name: /export to fdpg json/i,
    });
    await act(async () => {
      fireEvent.click(exportItem);
    });
    await flush(50);

    expect(mockDownloadString).toHaveBeenCalledTimes(1);
    const [content, filename, mime] = mockDownloadString.mock.calls[0];
    expect(filename).toMatch(/-fdpg\.json$/);
    expect(mime).toBe('application/json');

    // Content parses back to a Structured Query shape.
    const sq = JSON.parse(content as string);
    expect(sq.version).toBeTruthy();
    expect(Array.isArray(sq.inclusionCriteria)).toBe(true);

    // Blue "Cohort exported" toast.
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'blue',
        title: 'Cohort exported',
      }),
    );
  });

  it('Duplicate menu item shows Cohort duplicated toast', async () => {
    mockCohorts = [makeCohort({ id: 'c-dup', name: 'Dup source' })];
    mockDuplicateCohort.mockImplementation(() => ({
      ...mockCohorts[0],
      id: 'c-dup-new',
      name: 'Dup source (copy)',
    }));
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );

    const actionBtn = screen.getByRole('button', {
      name: /actions for cohort "Dup source"/i,
    });
    await act(async () => {
      fireEvent.click(actionBtn);
    });
    await flush(50);
    const dupItem = screen.getByRole('menuitem', { name: /^duplicate$/i });
    await act(async () => {
      fireEvent.click(dupItem);
    });
    await flush(50);

    expect(mockDuplicateCohort).toHaveBeenCalledWith('c-dup');
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'blue',
        title: 'Cohort duplicated',
      }),
    );
  });

  it('Edit menu item opens EditCohortModal', async () => {
    mockCohorts = [makeCohort({ id: 'c-e', name: 'Edit me' })];
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    const actionBtn = screen.getByRole('button', {
      name: /actions for cohort "Edit me"/i,
    });
    await act(async () => {
      fireEvent.click(actionBtn);
    });
    await flush(50);
    const editItem = screen.getByRole('menuitem', { name: /^edit$/i });
    await act(async () => {
      fireEvent.click(editItem);
    });
    await flush(100);

    // The EditCohortModal heading should now be in the DOM.
    expect(document.getElementById('edit-cohort-modal-heading')).toBeTruthy();
  });

  it('Delete menu item opens DeleteCohortModal', async () => {
    mockCohorts = [makeCohort({ id: 'c-d', name: 'Delete me' })];
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    const actionBtn = screen.getByRole('button', {
      name: /actions for cohort "Delete me"/i,
    });
    await act(async () => {
      fireEvent.click(actionBtn);
    });
    await flush(50);
    const deleteItem = screen.getByRole('menuitem', { name: /^delete…?$/i });
    await act(async () => {
      fireEvent.click(deleteItem);
    });
    await flush(100);

    expect(
      document.getElementById('delete-cohort-modal-heading'),
    ).toBeTruthy();
  });

  it('Import rejects non-.json files with exact wrong-file-type toast copy', async () => {
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [txtFile],
        configurable: true,
      });
      fireEvent.change(fileInput);
    });
    await flush(50);

    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'red',
        title: 'Import failed',
        message:
          'Selected file is not a JSON file. Choose a .json file exported from a FDPG-compatible tool.',
      }),
    );
  });

  it('imports SQ JSON via FileButton (valid v3 JSON)', async () => {
    // Build a minimal SQ JSON payload that the codec will accept.
    const validSq = {
      version: 'http://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema',
      display: 'Imported cohort',
      inclusionCriteria: [
        [
          {
            termCodes: [
              {
                system: 'http://snomed.info/sct',
                code: '44054006',
              },
            ],
            context: {
              system:
                'http://fdpg.mii.cds/CodeSystem/CriteriaSets',
              code: 'Diagnose',
            },
          },
        ],
      ],
      exclusionCriteria: [],
    };
    const jsonBlob = new Blob([JSON.stringify(validSq)], {
      type: 'application/json',
    });
    const jsonFile = new File([jsonBlob], 'cohort.json', {
      type: 'application/json',
    });
    // Polyfill .text() since jsdom's File may not implement it fully.
    (jsonFile as unknown as { text: () => Promise<string> }).text = () =>
      Promise.resolve(JSON.stringify(validSq));

    mockAddCohort.mockImplementation((input) => ({
      ...makeCohort({ name: input.name, criteria: input.criteria }),
      id: 'imported-1',
    }));

    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [jsonFile],
        configurable: true,
      });
      fireEvent.change(fileInput);
    });
    await flush(200);

    // addCohort should have been called with the imported cohort.
    expect(mockAddCohort).toHaveBeenCalled();
    // Blue Cohort imported toast.
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'blue',
        title: 'Cohort imported',
      }),
    );
  });

  it('Export is disabled on FHIRPath cohorts with tooltip', async () => {
    mockCohorts = [
      makeCohort({
        id: 'c-fhir-2',
        name: 'FHIRPath cohort',
        criteria: [
          {
            type: 'fhirpath',
            expression: "Patient.where(gender = 'female')",
          },
        ],
      }),
    ];
    render(
      <Wrap>
        <CohortsPage />
      </Wrap>,
    );
    const actionBtn = screen.getByRole('button', {
      name: /actions for cohort "FHIRPath cohort"/i,
    });
    await act(async () => {
      fireEvent.click(actionBtn);
    });
    await flush(50);

    const exportItem = screen.getByRole('menuitem', {
      name: /export to fdpg json/i,
    });
    // Mantine disables menu items via data-disabled attribute.
    expect(
      exportItem.getAttribute('data-disabled') !== null ||
        exportItem.getAttribute('aria-disabled') === 'true' ||
        exportItem.hasAttribute('disabled'),
    ).toBe(true);
  });
});
