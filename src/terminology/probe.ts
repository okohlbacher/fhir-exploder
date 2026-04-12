import type { MedplumClient } from '@medplum/core';
import type { TerminologyHealth } from './types';

/**
 * Probe the terminology server's /metadata endpoint with a bounded timeout.
 *
 * Resolves to one of:
 *  - 'not-configured'  → caller passed a null client (no URL configured)
 *  - 'ok'              → /metadata responded successfully
 *  - 'unreachable'     → request threw, rejected, or exceeded timeoutMs
 *
 * Never throws. Safe to call on app connect and on a repeating interval for
 * the sidebar status dot (D-08).
 */
export async function probeTerminologyHealth(
  client: MedplumClient | null,
  timeoutMs = 3000,
): Promise<TerminologyHealth> {
  if (!client) return 'not-configured';

  try {
    const signal = buildTimeoutSignal(timeoutMs);
    await client.get('metadata', signal ? { signal } : undefined);
    return 'ok';
  } catch {
    return 'unreachable';
  }
}

function buildTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  // Prefer the native AbortSignal.timeout when available (modern browsers, Node 18+).
  const maybeTimeout = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal })
    .timeout;
  if (typeof maybeTimeout === 'function') {
    return maybeTimeout.call(AbortSignal, timeoutMs);
  }

  // Fallback for environments without AbortSignal.timeout.
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error('Timeout')), timeoutMs);
    return controller.signal;
  }

  return undefined;
}
