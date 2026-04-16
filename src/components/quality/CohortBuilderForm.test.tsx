/**
 * CohortBuilderForm — Plan 21-05 T-5.2 RTL integration tests.
 *
 * Every `it()` name below matches a VALIDATION.md acceptance-criteria filter
 * for the builder form:
 *   - "truncation Alert at 10000"         (S5 truncation warning)
 *   - "disabled button tooltip"           (S3 disabled state)
 *   - "Discard button"                    (S4 modal button label — not "Cancel")
 *   - "duplicate name error"              (T-21-14 uniqueness check)
 *   - "Save flow calls addCohort"         (end-to-end save through useCohorts)
 *
 * Threat T-21-03: all fixture IDs are synthetic (`p-00001`, `p-00002`, ...).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';

// Mock @medplum/react-hooks so FhirpathCriterionCard can resolve useMedplum
// during Edit-mode tests that render the full form.
const mockSearch = vi.fn();
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ search: mockSearch }),
}));

import { CohortBuilderForm } from './CohortBuilderForm';
import type { CohortDefinition } from '../../quality/cohorts';

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
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Wrap({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <Notifications />
      <DatesProvider settings={{ locale: 'en' }}>{children}</DatesProvider>
    </MantineProvider>
  );
}

async function flush(ms = 200) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('CohortBuilderForm', () => {
  it('shows truncation Alert at 10000 parsed patient refs', async () => {
    render(
      <Wrap>
        <CohortBuilderForm existingNames={[]} onSaved={() => {}} />
      </Wrap>,
    );

    // Build a 10001-token string so parsePatientRefs caps at 10_000.
    const ids = Array.from({ length: 10_001 }, (_, i) =>
      `p-${String(i).padStart(5, '0')}`,
    ).join('\n');

    const textarea = screen.getByLabelText(
      'Patient references',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: ids } });
    });

    // Flush the 150ms debounce.
    await flush(250);

    expect(
      screen.getByText('Cohort truncated to 10,000 patients'),
    ).toBeTruthy();
  });

  it('renders a disabled button tooltip when no criteria are filled', () => {
    render(
      <Wrap>
        <CohortBuilderForm existingNames={[]} onSaved={() => {}} />
      </Wrap>,
    );

    const btn = screen.getByRole('button', { name: /save cohort/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.getAttribute('title')).toBe(
      'Add at least one criterion to save.',
    );
  });

  it('uses "Discard" button in the save modal (not "Cancel")', async () => {
    render(
      <Wrap>
        <CohortBuilderForm existingNames={[]} onSaved={() => {}} />
      </Wrap>,
    );

    // Fill a criterion so the save button enables.
    const codeSys = screen.getByLabelText('Code system') as HTMLInputElement;
    const code = screen.getByLabelText('Code') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(codeSys, { target: { value: 'http://snomed.info/sct' } });
      fireEvent.change(code, { target: { value: '44054006' } });
    });
    await flush(50);

    // Open the modal.
    const saveBtn = screen.getByRole('button', { name: /save cohort/i });
    expect(saveBtn.hasAttribute('disabled')).toBe(false);
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    await flush(150);

    // Modal should contain a "Discard" button and NOT a "Cancel" button.
    expect(screen.getByRole('button', { name: /discard/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
  });

  it('shows duplicate name error when a cohort with the same name exists', async () => {
    render(
      <Wrap>
        <CohortBuilderForm existingNames={['Taken']} onSaved={() => {}} />
      </Wrap>,
    );

    // Fill a criterion.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Code system'), {
        target: { value: 'http://loinc.org' },
      });
      fireEvent.change(screen.getByLabelText('Code'), {
        target: { value: '12345-6' },
      });
    });
    await flush(50);

    // Open modal.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save cohort/i }));
    });
    await flush(150);

    // Type duplicate name.
    const nameInput = screen.getByLabelText('Cohort name') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Taken' } });
    });

    // Submit (inside the modal dialog).
    const dialog = await screen.findByRole('dialog');
    const submitBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      /save cohort/i.test(b.textContent ?? ''),
    );
    expect(submitBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(submitBtn!);
    });
    await flush(100);

    expect(
      screen.getByText(
        'A cohort with this name already exists. Choose a different name.',
      ),
    ).toBeTruthy();
  });

  it('Save flow calls addCohort and writes to localStorage', async () => {
    const onSaved = vi.fn();

    render(
      <Wrap>
        <CohortBuilderForm existingNames={[]} onSaved={onSaved} />
      </Wrap>,
    );

    // useCohorts needs the hydration effect to flip before addCohort spreads
    // the (now-hydrated) stored value.
    await flush(50);

    // Fill a condition-code criterion.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Code system'), {
        target: { value: 'http://snomed.info/sct' },
      });
      fireEvent.change(screen.getByLabelText('Code'), {
        target: { value: '44054006' },
      });
    });
    await flush(50);

    // Open modal.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save cohort/i }));
    });
    await flush(150);

    // Type a name.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Cohort name'), {
        target: { value: 'Diabetic adults' },
      });
    });

    // Submit inside the dialog.
    const dialog = await screen.findByRole('dialog');
    const submitBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      /save cohort/i.test(b.textContent ?? ''),
    );
    await act(async () => {
      fireEvent.click(submitBtn!);
    });
    await flush(200);

    // onSaved fired after addCohort resolved.
    expect(onSaved).toHaveBeenCalled();

    // localStorage reflects the write via useCohorts.addCohort.
    const raw = window.localStorage.getItem('quality.cohorts.v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.cohorts.length).toBe(1);
    expect(parsed.cohorts[0].name).toBe('Diabetic adults');
    expect(parsed.cohorts[0].criteria).toEqual([
      {
        type: 'condition-code',
        system: 'http://snomed.info/sct',
        code: '44054006',
      },
    ]);
  });

  // --- Plan 22-03 Task 1: FHIRPath card + Edit-mode extensions ---

  it('includes fhirpath criterion in saved criteria array', async () => {
    mockSearch.mockResolvedValue({ resourceType: 'Bundle', total: 3 });

    render(
      <Wrap>
        <CohortBuilderForm existingNames={[]} onSaved={() => {}} />
      </Wrap>,
    );
    await flush(50);

    // Type a FHIRPath expression.
    const fhirTextarea = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(fhirTextarea, {
        target: { value: "Patient.where(gender = 'female')" },
      });
    });
    // Click Validate.
    const validateBtn = screen.getByRole('button', { name: /^validate$/i });
    await act(async () => {
      fireEvent.click(validateBtn);
    });
    await flush(100);

    // Open Save modal.
    const saveBtn = screen.getByRole('button', { name: /save cohort/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    await flush(150);

    // Type name.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Cohort name'), {
        target: { value: 'FHIRPath cohort' },
      });
    });

    // Submit.
    const dialog = await screen.findByRole('dialog');
    const submitBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      /save cohort/i.test(b.textContent ?? ''),
    );
    await act(async () => {
      fireEvent.click(submitBtn!);
    });
    await flush(200);

    const raw = window.localStorage.getItem('quality.cohorts.v1');
    const parsed = JSON.parse(raw as string);
    const criteria = parsed.cohorts[0].criteria;
    const fhirpath = criteria.find(
      (c: { type: string }) => c.type === 'fhirpath',
    );
    expect(fhirpath).toBeTruthy();
    expect(fhirpath.expression).toBe("Patient.where(gender = 'female')");
  });

  it('pre-fills form in edit mode from initialCohort', () => {
    const cohort: CohortDefinition = {
      id: 'cohort-edit-1',
      name: 'Existing cohort',
      criteria: [
        { type: 'date-range', start: '2024-01-01', end: '2024-06-30' },
        {
          type: 'condition-code',
          system: 'http://snomed.info/sct',
          code: '44054006',
        },
        { type: 'reference-list', patientIds: ['p-001', 'p-002'] },
        {
          type: 'fhirpath',
          expression: 'Patient.where(active = true)',
          translatedQuery: 'Patient?active=true&_elements=id&_count=10000',
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    };

    render(
      <Wrap>
        <CohortBuilderForm
          existingNames={[]}
          onSaved={() => {}}
          mode="edit"
          initialCohort={cohort}
          onSave={() => {}}
        />
      </Wrap>,
    );

    const codeSys = screen.getByLabelText('Code system') as HTMLInputElement;
    expect(codeSys.value).toBe('http://snomed.info/sct');
    const code = screen.getByLabelText('Code') as HTMLInputElement;
    expect(code.value).toBe('44054006');

    const refs = screen.getByLabelText(
      'Patient references',
    ) as HTMLTextAreaElement;
    expect(refs.value).toContain('p-001');
    expect(refs.value).toContain('p-002');

    const fhir = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    expect(fhir.value).toBe('Patient.where(active = true)');
  });

  it('edit mode shows "Save changes" label (not "Save cohort…")', () => {
    const cohort: CohortDefinition = {
      id: 'cohort-edit-2',
      name: 'Edit me',
      criteria: [
        {
          type: 'condition-code',
          system: 'http://loinc.org',
          code: '12345-6',
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    };
    render(
      <Wrap>
        <CohortBuilderForm
          existingNames={[]}
          onSaved={() => {}}
          mode="edit"
          initialCohort={cohort}
          onSave={() => {}}
        />
      </Wrap>,
    );
    expect(
      screen.getByRole('button', { name: /^save changes$/i }),
    ).toBeTruthy();
    // Phase-21 "Save cohort…" button should NOT be present in Edit mode.
    expect(
      screen.queryByRole('button', { name: /save cohort…/i }),
    ).toBeNull();
  });

  it('edit mode calls onSave directly without opening a Save modal', async () => {
    const cohort: CohortDefinition = {
      id: 'cohort-edit-3',
      name: 'Edit me',
      criteria: [
        {
          type: 'condition-code',
          system: 'http://loinc.org',
          code: '12345-6',
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    };
    const onSave = vi.fn();
    render(
      <Wrap>
        <CohortBuilderForm
          existingNames={[]}
          onSaved={() => {}}
          mode="edit"
          initialCohort={cohort}
          onSave={onSave}
        />
      </Wrap>,
    );
    await flush(50);

    const btn = screen.getByRole('button', { name: /^save changes$/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    // Modal should NOT have opened; onSave should have been called directly.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSave).toHaveBeenCalled();
    const arg = onSave.mock.calls[0][0];
    expect(arg.name).toBe('Edit me');
    expect(Array.isArray(arg.criteria)).toBe(true);
    expect(arg.criteria.length).toBeGreaterThanOrEqual(1);
  });

  it('edit mode disables Save when FHIRPath expression is unvalidated', () => {
    const cohort: CohortDefinition = {
      id: 'cohort-edit-4',
      name: 'Has FHIRPath',
      criteria: [
        {
          type: 'fhirpath',
          expression: 'Patient.where(active = true)',
        },
      ],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    };
    render(
      <Wrap>
        <CohortBuilderForm
          existingNames={[]}
          onSaved={() => {}}
          mode="edit"
          initialCohort={cohort}
          onSave={() => {}}
        />
      </Wrap>,
    );
    const btn = screen.getByRole('button', { name: /^save changes$/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.getAttribute('title')).toBe(
      'Click Validate on the FHIRPath card before saving.',
    );
  });
});
