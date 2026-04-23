/**
 * PHI acknowledgement gate — extracted from ValidationPanel.tsx for
 * Phase 31 UX-01 (D-04 / D-09). Blocks outbound network calls to
 * external validators until the user explicitly acknowledges that
 * patient identifiers will flow outbound.
 *
 * Keyed per `(serverUrl, externalUrl)` so switching validator URLs
 * forces a re-acknowledgement. The key format is the legacy shape used
 * by the pre-refactor inline gate in ValidationPanel — DO NOT change
 * the format or pre-existing user acknowledgements stop resolving.
 *
 * Invariant (D-09): this gate MUST be re-evaluated before EVERY
 * outbound fetch, never hoisted out of a per-resource loop.
 * See .planning/research/PITFALLS.md §"Pitfall 3" for the refactoring
 * bypass that is prevented by this contract.
 */

export const PHI_ACK_KEY_PREFIX = 'quality.validation.phiAcknowledged.v1';

/** Build the localStorage key. `null` external → `'none'` — matches ValidationPanel legacy shape. */
export function phiAckKey(serverUrl: string, externalUrl: string | null): string {
  return `${PHI_ACK_KEY_PREFIX}:${serverUrl}|${externalUrl ?? 'none'}`;
}

/** Synchronous localStorage read. No network calls. Returns false on any error. */
export function isPhiAcknowledged(serverUrl: string, externalUrl: string | null): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(phiAckKey(serverUrl, externalUrl));
    if (raw === null) return false;
    if (raw === 'true') return true;
    try {
      return JSON.parse(raw) === true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}
