/**
 * QUAL-01 — counts aggregation logic.
 *
 * Wave 2 Plan 02 creates `src/quality/counts.ts` exporting
 * `summarizeCounts(counts: Record<string, CountValue>): { total: number; typeCount: number; loading: number; error: number }`.
 *
 * Until that module exists this file fails at import time with a clear
 * "Cannot find module '../quality/counts'" pointing Wave 2 at the target.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — Wave 2 Plan 02 creates this module.
import { summarizeCounts } from '../quality/counts';

describe('summarizeCounts (QUAL-01)', () => {
  it.todo('returns total=0, typeCount=0 when counts is empty');
  it.todo('sums numeric counts into total and increments typeCount');
  it.todo('counts "loading" entries separately in loading field');
  it.todo('counts "error" entries separately in error field');
  it.todo('excludes loading and error values from total');

  it('is exported from src/quality/counts', () => {
    expect(typeof summarizeCounts).toBe('function');
  });
});
