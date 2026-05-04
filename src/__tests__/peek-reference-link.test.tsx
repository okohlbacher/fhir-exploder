/**
 * PEEK-04 ReferenceLink Cmd+click integration tests.
 * Wave 0 stub created in Plan 01; populated in Plan 02 Task 1
 * (ReferenceLink Cmd+click handler).
 */
import { describe, it, expect } from 'vitest';

describe.skip('ReferenceLink Cmd+click peek (PEEK-04) — Wave 0 stub, populated in Plan 02', () => {
  it('resolved status: Cmd+click opens drawer with resolved resource', () => {
    // Plan 02 Task 1: render ReferenceLink with mocked useReferenceResolver
    // returning { resource, status: 'resolved' }; fireEvent.click(anchor, { metaKey: true });
    // expect drawer title 'Patient/pat-x' visible.
    expect(true).toBe(true);
  });
  it('failed status: Cmd+click opens drawer with "Reference unresolvable" body', () => {
    // Plan 02 Task 1: mock returns { resource: null, status: 'failed' };
    // expect drawer title shows raw reference text + body shows 'Reference unresolvable'.
    expect(true).toBe(true);
  });
  it('plain click (no modifier) does NOT open drawer (regression)', () => {
    // Plan 02 Task 1: assert no drawer title appears when modifier absent.
    expect(true).toBe(true);
  });
});
