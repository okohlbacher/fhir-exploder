/**
 * PEEK-05 surface 2 PatientListPage J shortcut integration tests.
 * Wave 0 stub created in Plan 01; populated in Plan 02 Task 3
 * (PatientListPage J wiring).
 */
import { describe, it, expect } from 'vitest';

describe.skip('PatientListPage J shortcut (PEEK-05) — Wave 0 stub, populated in Plan 02', () => {
  it('J on focused patient row opens the drawer', () => {
    // Plan 02 Task 3: render PatientListPage with focused row,
    // fireEvent.keyDown(document, { key: 'J' });
    // expect drawer title 'Patient/<id>' visible.
    expect(true).toBe(true);
  });
  it('J without a focused row does nothing (silent no-op)', () => {
    // Plan 02 Task 3: render PatientListPage with no row focus,
    // fireEvent.keyDown(document, { key: 'J' });
    // expect no drawer.
    expect(true).toBe(true);
  });
  it('J does NOT open drawer when an INPUT in filter card is focused (input-focus guard)', () => {
    // Plan 02 Task 3: focus a filter <input>, fireEvent.keyDown(document, { key: 'J' });
    // expect no drawer (useShortcuts INPUT/TEXTAREA/SELECT guard).
    expect(true).toBe(true);
  });
});
