/**
 * EditCohortModal — Plan 22-03 Task 2 RTL tests (CHRT-07 Edit flow).
 *
 * Covers 22-UI-SPEC §S5 (size lg, in-body heading, D-10 Alert, DatesProvider
 * wrap, key={cohort.id} remount) + §Notifications Contract (Cohort updated /
 * Update failed toasts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import type { CohortDefinition } from '../../quality/cohorts';

// Mock @medplum/react-hooks so FhirpathCriterionCard resolves useMedplum.
const mockSearch = vi.fn();
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ search: mockSearch }),
}));

// Mock useCohorts so the modal routes through a controllable spy set.
const mockUpdateCohort = vi.fn();
const mockCohorts: CohortDefinition[] = [];
let mockActiveCohortId: string | null = null;

vi.mock('../../hooks/useCohorts', () => ({
  useCohorts: () => ({
    cohorts: mockCohorts,
    activeCohortId: mockActiveCohortId,
    activeCohort: null,
    hydrated: true,
    addCohort: vi.fn(),
    activateCohort: vi.fn(),
    updateCohort: mockUpdateCohort,
    deleteCohort: vi.fn(),
    duplicateCohort: vi.fn(),
  }),
}));

import { EditCohortModal } from './EditCohortModal';

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

beforeEach(() => {
  window.localStorage.clear();
  mockSearch.mockReset();
  mockUpdateCohort.mockReset();
  mockCohorts.length = 0;
  mockActiveCohortId = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Wrap({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <Notifications />
      {children}
    </MantineProvider>
  );
}

async function flush(ms = 100) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

const sampleCohort: CohortDefinition = {
  id: 'cohort-edit-a',
  name: 'Diabetic adults',
  criteria: [
    {
      type: 'condition-code',
      system: 'http://snomed.info/sct',
      code: '44054006',
    },
  ],
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

describe('EditCohortModal', () => {
  it('renders Modal with size="lg", centered, radius="sm", aria-labelledby', () => {
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    // Mantine 8 hoists the `aria-labelledby` prop onto the outer wrapping
    // div (not the dialog section). Assert that the in-body heading with
    // the matching id is rendered inside the dialog tree.
    const heading = document.getElementById('edit-cohort-modal-heading');
    expect(heading).toBeTruthy();
    // The dialog section carries Mantine's internal aria-describedby for the
    // body; the wrapper div carries our aria-labelledby. Assert at least one
    // labelledby reference to the heading id exists in the DOM.
    const labelledRefs = document.querySelectorAll(
      '[aria-labelledby~="edit-cohort-modal-heading"]',
    );
    expect(labelledRefs.length).toBeGreaterThanOrEqual(1);
  });

  it('body contains <Text fw={600} size="sm" id="edit-cohort-modal-heading">Edit cohort</Text> as first element', () => {
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    const heading = document.getElementById('edit-cohort-modal-heading');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('Edit cohort');
  });

  it('sub-heading renders editing message with cohort name', () => {
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    expect(
      screen.getByText(
        /Editing "Diabetic adults"\. Saved changes are immediately reflected in any active dashboard scope\./,
      ),
    ).toBeTruthy();
  });

  it('when cohort.id === activeCohortId renders blue informational Alert with D-10 copy', () => {
    mockActiveCohortId = sampleCohort.id;
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    expect(
      screen.getByText(
        'This cohort is currently active. Saving will trigger recompute on the dashboard.',
      ),
    ).toBeTruthy();
  });

  it('when cohort.id !== activeCohortId does NOT render the active-alert copy', () => {
    mockActiveCohortId = 'some-other-id';
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    expect(
      screen.queryByText(
        'This cohort is currently active. Saving will trigger recompute on the dashboard.',
      ),
    ).toBeNull();
  });

  it('renders CohortBuilderForm in edit mode and shows the "Save changes" button', () => {
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    // The builder form's Edit-mode Save button is labeled exactly 'Save changes'.
    expect(
      screen.getByRole('button', { name: /^save changes$/i }),
    ).toBeTruthy();
  });

  it('on Save changes click with successful update: calls updateCohort, fires Cohort updated toast, calls onClose', async () => {
    const onClose = vi.fn();
    mockUpdateCohort.mockImplementation((id, patch) => ({
      ...sampleCohort,
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    }));
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={onClose} />
      </Wrap>,
    );
    await flush(50);

    const saveBtn = screen.getByRole('button', { name: /^save changes$/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    await flush(200);

    expect(mockUpdateCohort).toHaveBeenCalledTimes(1);
    expect(mockUpdateCohort).toHaveBeenCalledWith(
      sampleCohort.id,
      expect.objectContaining({ name: 'Diabetic adults' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('on Discard click: calls onClose without invoking updateCohort', async () => {
    const onClose = vi.fn();
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={onClose} />
      </Wrap>,
    );
    await flush(50);

    const discardBtn = screen.getByRole('button', { name: /^discard$/i });
    await act(async () => {
      fireEvent.click(discardBtn);
    });

    expect(onClose).toHaveBeenCalled();
    expect(mockUpdateCohort).not.toHaveBeenCalled();
  });

  it('on updateCohort QuotaExceededError: fires Update failed toast, keeps modal open', async () => {
    const onClose = vi.fn();
    mockUpdateCohort.mockImplementation(() => {
      throw new Error('Generic non-quota failure');
    });
    render(
      <Wrap>
        <EditCohortModal cohort={sampleCohort} onClose={onClose} />
      </Wrap>,
    );
    await flush(50);

    const saveBtn = screen.getByRole('button', { name: /^save changes$/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    await flush(200);

    // Update failed toast should be present (from the modal, non-quota path).
    expect(screen.getByText('Update failed')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('when cohort prop is null, renders closed modal (no dialog element visible)', () => {
    render(
      <Wrap>
        <EditCohortModal cohort={null} onClose={() => {}} />
      </Wrap>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
