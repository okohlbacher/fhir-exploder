/**
 * Wave 0 stub test file for Plan 21-05 (`src/components/quality/CohortBuilderForm.tsx`).
 *
 * Every `it()` name below MUST match a VALIDATION.md `-t "…"` filter so the
 * downstream Plan 21-05 automation command resolves to a concrete spec:
 *   - (no explicit `-t` in VALIDATION — file-level `npx vitest run …tsx` runs all)
 *
 * All tests are `it.skip` until Plan 21-05 un-skips them. Render wrap uses
 * `<MantineProvider>` per Mantine 8 testing guidance (@medplum/react also
 * requires the provider chain).
 *
 * Threat T-21-03: fixture IDs are synthetic.
 */
import { describe, it, expect } from 'vitest';

describe('CohortBuilderForm', () => {
  it.skip('accepts date-range + condition-code + reference-list inputs (pending Plan 21-05)', () => {
    // TODO(Plan 21-05): render <CohortBuilderForm /> within <MantineProvider>
    // (+ <DatesProvider> for DateInput). Populate each of the three criterion
    // inputs. Assert the Save-invoked callback receives a CohortDefinition
    // whose `criteria` array contains all three.
    expect(true).toBe(true);
  });

  it.skip('disables Save when all three criteria empty (pending Plan 21-05)', () => {
    // TODO(Plan 21-05): render form, assert `screen.getByRole('button',
    // { name: /save/i })` has the disabled attribute until at least one
    // criterion yields a non-empty patient set.
    expect(true).toBe(true);
  });
});
