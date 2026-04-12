import { useEffect, useState } from 'react';
import { useSettings } from './useSettings';
import { createTerminologyClient } from '../terminology/terminologyClient';
import { probeTerminologyHealth } from '../terminology/probe';
import type { TerminologyHealth } from '../terminology/types';

/**
 * Drives the sidebar's second status row (D-08). Returns one of:
 *  - 'not-configured' → settings.terminology.serverUrl is missing
 *  - 'unknown'        → probe in flight (rendered as "Checking…")
 *  - 'ok'             → /metadata responded
 *  - 'unreachable'    → probe rejected or timed out
 *
 * Re-probes whenever the configured terminology URL changes. Never throws —
 * probeTerminologyHealth collapses all failure modes into the union above.
 */
export function useTerminologyHealth(): TerminologyHealth {
  const { settings } = useSettings();
  const serverUrl = settings?.terminology?.serverUrl;
  const [health, setHealth] = useState<TerminologyHealth>('unknown');

  useEffect(() => {
    if (!settings) return;
    if (!serverUrl) {
      setHealth('not-configured');
      return;
    }
    setHealth('unknown');
    let cancelled = false;
    const client = createTerminologyClient(settings);
    probeTerminologyHealth(client).then((result) => {
      if (!cancelled) setHealth(result);
    });
    return () => {
      cancelled = true;
    };
  }, [settings, serverUrl]);

  return health;
}
