/**
 * useQualityMetrics — thin orchestrator above `useResourceCounts`.
 *
 * Wraps the Phase 1 `useResourceCounts` hook (verbatim reuse — same worker
 * pool, same concurrency limit, same cancellation) and layers:
 *   1. a `summary` derived via `summarizeCounts`
 *   2. a `lastComputed` Date that transitions to `new Date()` the first
 *      render where every per-type count has left the 'loading' state
 *   3. a `recompute()` trigger that bumps an internal `version` which is
 *      passed through to `useResourceCounts` as a `refetchKey` dep so the
 *      underlying effect re-fires and re-fetches every per-type count.
 *
 * `useResourceCounts` accepts an optional numeric `refetchKey` parameter
 * that participates in its effect deps. Bumping it re-runs the effect
 * without requiring any array-ordering or identity tricks on
 * `resourceTypes`. This replaces the earlier "reverse array on odd
 * versions" workaround.
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

  const counts = useResourceCounts(client, types, version);
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
