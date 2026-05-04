/**
 * PEEK-05 surfaces 3+4 RelatedResourcesPanel Cmd+click integration tests.
 * Wave 0 stub created in Plan 01; populated in Plan 02 Task 2
 * (RelatedResourcesPanel Cmd+click handler).
 */
import { describe, it, expect } from 'vitest';

describe.skip('RelatedResourcesPanel Cmd+click peek (PEEK-05) — Wave 0 stub, populated in Plan 02', () => {
  it('Cmd+click on Card opens drawer with first matching resource', () => {
    // Plan 02 Task 2: mock fetch returns array with first resource;
    // fireEvent.click(card, { metaKey: true });
    // expect drawer title shows first resource's '<Type>/<id>'.
    expect(true).toBe(true);
  });
  it('Cmd+click on Card with empty/rejected fetch opens error drawer (no toast)', () => {
    // Plan 02 Task 2: mock fetch rejects or resolves []; Cmd+click;
    // expect drawer body 'Reference unresolvable' AND no toast notification fired.
    expect(true).toBe(true);
  });
  it('plain click (no modifier) navigates to filtered explorer view (regression)', () => {
    // Plan 02 Task 2: plain click; expect navigate called with filter URL,
    // and no drawer opened.
    expect(true).toBe(true);
  });
});
