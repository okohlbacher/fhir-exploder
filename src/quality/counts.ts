/**
 * QUAL-01 — pure aggregation and sort helpers for the Data Quality dashboard
 * Counts tab + Overview strip.
 *
 * These functions are deliberately pure (no React, no I/O) so they are cheap
 * to test and reuse. `useQualityMetrics` wraps them around `useResourceCounts`
 * to feed the UI; drill-down panels can also reuse them if needed.
 *
 * Behavior:
 *   - summarizeCounts: numeric values sum into `total`; entries with numeric
 *     count > 0 increment `typeCount` (so a 0-count row does NOT count as a
 *     "type"). "loading" and "error" entries are tallied separately and
 *     excluded from `total`.
 *   - sortCounts: numeric-value rows sort by chosen direction; non-numeric
 *     ("loading" / "error") rows always sort to the END (stably, alphabetical
 *     among themselves). Sort by name is pure alphabetical, ignoring value
 *     state.
 *   - includeEmpty=false filters out rows whose count is exactly numeric 0
 *     before sorting (loading/error rows are still returned).
 */
import type { CountValue } from './types';

export interface CountSummary {
  /** Sum of all numeric counts. `loading` and `error` contribute nothing. */
  total: number;
  /** Number of resource types whose numeric count is > 0. */
  typeCount: number;
  /** Number of types still in the 'loading' state. */
  loadingCount: number;
  /** Number of types that hit the 'error' state. */
  errorCount: number;
}

export interface CountRow {
  type: string;
  count: CountValue;
}

export function summarizeCounts(counts: Record<string, CountValue>): CountSummary {
  let total = 0;
  let typeCount = 0;
  let loadingCount = 0;
  let errorCount = 0;
  for (const v of Object.values(counts)) {
    if (typeof v === 'number') {
      total += v;
      if (v > 0) typeCount++;
    } else if (v === 'loading') {
      loadingCount++;
    } else if (v === 'error') {
      errorCount++;
    }
  }
  return { total, typeCount, loadingCount, errorCount };
}

/**
 * Sort a counts record into an ordered list of rows.
 *
 * Non-numeric rows ('loading' | 'error') always sort to the end regardless
 * of direction; they are ordered alphabetically among themselves. This keeps
 * "real" (settled) numeric rows at the top of the table for scanability.
 *
 * Name sort is pure alphabetical and ignores value state entirely.
 */
export function sortCounts(
  counts: Record<string, CountValue>,
  by: 'count' | 'name',
  direction: 'asc' | 'desc',
  includeEmpty = false,
): CountRow[] {
  const rows: CountRow[] = Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .filter((r) => includeEmpty || r.count !== 0);

  const sign = direction === 'desc' ? -1 : 1;
  rows.sort((a, b) => {
    if (by === 'name') {
      return sign * a.type.localeCompare(b.type);
    }
    // by === 'count': non-numeric always goes to the end
    const an = typeof a.count === 'number';
    const bn = typeof b.count === 'number';
    if (an && !bn) return -1;
    if (!an && bn) return 1;
    if (!an && !bn) return a.type.localeCompare(b.type);
    return sign * ((a.count as number) - (b.count as number));
  });
  return rows;
}
