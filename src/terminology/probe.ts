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

  const { signal, cancel } = buildTimeoutSignal(timeoutMs);
  try {
    await client.get(client.fhirUrl('metadata').toString(), signal ? { signal } : undefined);
    return 'ok';
  } catch {
    return 'unreachable';
  } finally {
    // Always clear any pending fallback timer so the event loop can drain —
    // otherwise repeated probes (D-08 periodic re-probe) accumulate live
    // timers and delay test runner exit.
    cancel();
  }
}

interface TimeoutSignal {
  signal: AbortSignal | undefined;
  cancel: () => void;
}

function buildTimeoutSignal(timeoutMs: number): TimeoutSignal {
  // Prefer the native AbortSignal.timeout when available (modern browsers, Node 18+).
  const maybeTimeout = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal })
    .timeout;
  if (typeof maybeTimeout === 'function') {
    return { signal: maybeTimeout.call(AbortSignal, timeoutMs), cancel: () => {} };
  }

  // Fallback for environments without AbortSignal.timeout: own the timer so we
  // can clear it regardless of whether the request succeeded, failed, or the
  // signal fired first.
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    const handle = setTimeout(() => controller.abort(new Error('Timeout')), timeoutMs);
    return {
      signal: controller.signal,
      cancel: () => clearTimeout(handle),
    };
  }

  return { signal: undefined, cancel: () => {} };
}
