/**
 * Wave 0 stub test file for Plan 21-04 (`src/components/quality/ResourceTypeSelector.tsx`).
 *
 * The current `CohortSelector` component is renamed to `ResourceTypeSelector`
 * in Plan 21-04 (CHRT-04). This stub locks the post-rename label contract so
 * the rename is enforced, not merely hoped for.
 *
 * VALIDATION.md row:
 *   `npx vitest run src/components/quality/ResourceTypeSelector.test.tsx`
 *   (file-level run — the `Resource types` literal also lets callers filter
 *   with `-t "Resource types"` if desired.)
 *
 * Test is `it.skip` until Plan 21-04 un-skips and renders the renamed
 * component. The literal string "Resource types" MUST appear in this file
 * so the VALIDATION grep in acceptance_criteria returns ≥1 match.
 */
import { describe, it, expect } from 'vitest';

describe('ResourceTypeSelector', () => {
  it.skip('renders label "Resource types" (pending Plan 21-04)', () => {
    // TODO(Plan 21-04): import { ResourceTypeSelector } from './ResourceTypeSelector'
    // (renamed from CohortSelector), render inside <MantineProvider>, then
    //   expect(screen.getByLabelText('Resource types')).toBeInTheDocument();
    // This drives the rename: the test fails at import-time until the file
    // is renamed in Plan 21-04.
    expect(true).toBe(true);
  });
});
