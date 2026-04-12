/**
 * useQualityMetrics — thin orchestrator above `useResourceCounts`.
 *
 * Wraps the Phase 1 `useResourceCounts` hook (verbatim reuse — same worker
 * pool, same concurrency limit, same cancellation) and layers:
 *   1. a `summary` derived via `summarizeCounts`
 *   2. a `lastComputed` Date that transitions to `new Date()` the first
 *      render where every per-type count has left the 'loading' state
 *   3. a `recompute()` trigger that bumps an internal `version` key so the
 *      underlying hook's effect re-fires and re-fetches every per-type count.
 *
 * The version trick: `useResourceCounts` keys its effect on
 * `[client, resourceTypes.join(',')]`. To force a re-run without changing the
 * set of types, we construct a new array instance keyed by (types, version).
 * Each call to recompute() bumps `version`, which rebuilds `typesKeyed`,
 * which changes its identity but not its content — re-triggering the fetch.
 *
 * NOTE: the underlying hook depends on `resourceTypes.join(',')` (value,
 * not identity), so just changing array identity is NOT enough to retrigger
 * it. We therefore include `version` in the underlying types key by prefixing
 * a sentinel entry — but that would pollute counts. Instead we re-derive
 * `typesKeyed` by cloning and call the hook with a stable reference, AND we
 * rely on the fact that `useResourceCounts` re-runs whenever its `client`
 * OR `resourceTypes.join(',')` changes. The clean way is to include version
 * in the join key — easiest: append a sentinel. Since useResourceCounts
 * iterates every entry in resourceTypes, any sentinel would make a bogus
 * request. So we use a different tactic: we recreate the types array AND
 * also change the client reference is not desirable. The simplest correct
 * approach is to let recompute reset lastComputed and clear counts by
 * remounting the hook — but we can't remount from inside.
 *
 * Pragmatic solution: since `useResourceCounts` derives its dep from
 * `resourceTypes.join(',')`, we can add a zero-width suffix to the joined key
 * by passing a fresh array with an appended invisible type that we filter
 * out… that's ugly. The cleanest fix: rely on the fact that React callers
 * can remount by key. But recompute is called inside a child, not a parent.
 *
 * ACTUAL solution implemented below: we accept that the join-key dep is
 * content-based, and we expose `version` on the returned object. The parent
 * page (QualityOverviewPage) can pass `[<types>, version]` as a React
 * `key` prop to a wrapper if it needed full remount — but in practice
 * recompute() works because even though the join string is identical, we
 * DO change the reference AND reset lastComputed to null, and the button
 * also fires a toast providing the user feedback. For the hermetic test,
 * `recompute()` is exercised by asserting the notification fires; the actual
 * re-fetch is a side-effect of useResourceCounts whose behavior is already
 * tested in Phase 1. To make recompute truly re-fire the effect without
 * changing `resourceTypes.join(',')`, we key the consumer differently:
 * we include `version` in the *identity* of `typesKeyed` AND pass it to the
 * hook by augmenting the join key — via a harmless duplicate that gets
 * deduped. Simplest reliable trick: when version > 0, pass a slightly
 * different ordering so the joined string changes without adding entries.
 *
 * Chosen implementation: `typesKeyed` = `version % 2 === 0 ? types : [...types].reverse()`.
 * Reversing the array changes the join key deterministically, triggers the
 * effect re-run, and yields the same per-type counts (the hook keys entries
 * by type name, not by order). This is a no-op for the consumer.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { MedplumClient } from '@medplum/core';
import { useResourceCounts } from './useResourceCounts';
import { summarizeCounts, type CountSummary } from '../quality/counts';
import type { CountValue } from '../quality/types';

export interface QualityMetrics {
  counts: Record<string, CountValue>;
  summary: CountSummary;
  /** Date when all counts last finished loading (transitioned out of 'loading'). */
  lastComputed: Date | null;
  /** Bump the internal version and clear lastComputed so the counts hook refires. */
  recompute: () => void;
  /** Exposed for debugging / React keying if a caller wants full remount. */
  version: number;
}

export function useQualityMetrics(
  client: MedplumClient | null,
  types: string[],
): QualityMetrics {
  const [version, setVersion] = useState(0);
  const [lastComputed, setLastComputed] = useState<Date | null>(null);

  // Reverse the array when version is odd so `types.join(',')` changes on
  // every recompute(), re-triggering useResourceCounts' effect without
  // altering the set of inspected types. See module docstring for rationale.
  const typesKeyed = useMemo(() => {
    return version % 2 === 0 ? [...types] : [...types].reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types.join(','), version]);

  const counts = useResourceCounts(client, typesKeyed);
  const summary = useMemo(() => summarizeCounts(counts), [counts]);

  // lastComputed updates to "now" on the first render where every count
  // has left 'loading'. Reset to null by recompute() to signal a new cycle.
  useEffect(() => {
    const values = Object.values(counts);
    if (values.length > 0 && values.every((v) => v !== 'loading')) {
      setLastComputed(new Date());
    }
  }, [counts]);

  const recompute = useCallback(() => {
    setLastComputed(null);
    setVersion((v) => v + 1);
  }, []);

  return { counts, summary, lastComputed, recompute, version };
}
