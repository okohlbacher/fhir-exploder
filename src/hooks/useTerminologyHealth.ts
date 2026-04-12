import { useEffect, useState } from 'react';
import { useTerminology } from './useTerminology';
import { probeTerminologyHealth } from '../terminology/probe';
import type { TerminologyHealth } from '../terminology/types';

/**
 * Drives the sidebar's second status row (D-08). Returns one of:
 *  - 'not-configured' → settings.terminology.serverUrl is missing/invalid
 *  - 'unknown'        → probe in flight (rendered as "Checking…")
 *  - 'ok'             → /metadata responded
 *  - 'unreachable'    → probe rejected or timed out
 *
 * Re-probes whenever the resolver identity changes (i.e., when the
 * TerminologyProvider rebuilds its resolver due to a settings.terminology
 * change). Never throws — probeTerminologyHealth collapses all failure
 * modes into the union above.
 *
 * Reuses the MedplumClient owned by the resolver instead of constructing
 * a second one per effect run (WR-02). This keeps the probe and the
 * resolver in lockstep and removes the redundant `new URL(...)` parse
 * on each effect (which was a second exposure point for CR-01).
 */
export function useTerminologyHealth(): TerminologyHealth {
  const resolver = useTerminology();
  const [health, setHealth] = useState<TerminologyHealth>('unknown');

  useEffect(() => {
    if (!resolver.client) {
      setHealth('not-configured');
      return;
    }
    setHealth('unknown');
    let cancelled = false;
    probeTerminologyHealth(resolver.client).then((result) => {
      if (!cancelled) setHealth(result);
    });
    return () => {
      cancelled = true;
    };
  }, [resolver]);

  return health;
}
