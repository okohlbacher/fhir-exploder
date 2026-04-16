/**
 * DeleteCohortModal — Plan 22-03 Task 2 RTL tests (CHRT-07 Delete flow).
 *
 * Covers 22-UI-SPEC §S6 (size sm, in-body heading, cohort-name paragraph,
 * optional active sub-line, Discard/Delete buttons) + §Notifications
 * Contract (Cohort deleted / Delete failed toasts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import type { CohortDefinition } from '../../quality/cohorts';

// Mock useCohorts so delete routes through a controllable spy.
const mockDeleteCohort = vi.fn();
let mockActiveCohortId: string | null = null;

vi.mock('../../hooks/useCohorts', () => ({
  useCohorts: () => ({
    cohorts: [],
    activeCohortId: mockActiveCohortId,
    activeCohort: null,
    hydrated: true,
    addCohort: vi.fn(),
    activateCohort: vi.fn(),
    updateCohort: vi.fn(),
    deleteCohort: mockDeleteCohort,
    duplicateCohort: vi.fn(),
  }),
}));

import { DeleteCohortModal } from './DeleteCohortModal';

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
  mockDeleteCohort.mockReset();
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

async function flush(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

const sampleCohort: CohortDefinition = {
  id: 'cohort-del-a',
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

describe('DeleteCohortModal', () => {
  it('renders Modal with aria-labelledby pointing to the in-body heading', () => {
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe(
      'delete-cohort-modal-heading',
    );
  });

  it('body contains <Text fw={600} size="sm" id="delete-cohort-modal-heading">Delete cohort</Text> as first element', () => {
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    const heading = document.getElementById('delete-cohort-modal-heading');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('Delete cohort');
  });

  it('body paragraph renders cohort name and "This cannot be undone."', () => {
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    expect(
      screen.getByText(
        /Delete the cohort "Diabetic adults"\? This cannot be undone\./,
      ),
    ).toBeTruthy();
  });

  it('when cohort.id === activeCohortId, renders extra sub-line about active cohort', () => {
    mockActiveCohortId = sampleCohort.id;
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    expect(
      screen.getByText(
        'This cohort is currently active. Panels will revert to analyzing all patients.',
      ),
    ).toBeTruthy();
  });

  it('when cohort.id !== activeCohortId, does NOT render the active sub-line', () => {
    mockActiveCohortId = 'other-id';
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    expect(
      screen.queryByText(
        'This cohort is currently active. Panels will revert to analyzing all patients.',
      ),
    ).toBeNull();
  });

  it('renders Discard button (variant default) and Delete cohort button (variant filled, color red)', () => {
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );
    const discard = screen.getByRole('button', { name: /^discard$/i });
    const deleteBtn = screen.getByRole('button', { name: /^delete cohort$/i });
    expect(discard).toBeTruthy();
    expect(deleteBtn).toBeTruthy();
  });

  it('on Delete click: calls deleteCohort, fires Cohort deleted toast, calls onClose', async () => {
    const onClose = vi.fn();
    mockDeleteCohort.mockImplementation(() => {});
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={onClose} />
      </Wrap>,
    );

    const deleteBtn = screen.getByRole('button', { name: /^delete cohort$/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    await flush(100);

    expect(mockDeleteCohort).toHaveBeenCalledWith(sampleCohort.id);
    expect(screen.getByText('Cohort deleted')).toBeTruthy();
    expect(onClose).toHaveBeenCalled();
  });

  it('toast message on active deletion mentions panels reverting', async () => {
    mockActiveCohortId = sampleCohort.id;
    mockDeleteCohort.mockImplementation(() => {});
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={() => {}} />
      </Wrap>,
    );

    const deleteBtn = screen.getByRole('button', { name: /^delete cohort$/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    await flush(100);

    expect(
      screen.getByText(
        '"Diabetic adults" was removed. Panels now analyze all patients.',
      ),
    ).toBeTruthy();
  });

  it('on deleteCohort throwing non-quota error: fires Delete failed toast and modal stays open', async () => {
    const onClose = vi.fn();
    mockDeleteCohort.mockImplementation(() => {
      throw new Error('something else');
    });
    render(
      <Wrap>
        <DeleteCohortModal cohort={sampleCohort} onClose={onClose} />
      </Wrap>,
    );

    const deleteBtn = screen.getByRole('button', { name: /^delete cohort$/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    await flush(100);

    expect(screen.getByText('Delete failed')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('when cohort prop is null, renders closed modal (no dialog visible)', () => {
    render(
      <Wrap>
        <DeleteCohortModal cohort={null} onClose={() => {}} />
      </Wrap>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
