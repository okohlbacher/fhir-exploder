export type TerminologyHealth = 'unknown' | 'ok' | 'unreachable' | 'not-configured';

export interface TerminologyCacheEntry {
  display: string | null;
  resolvedAt: number;
  ttlMs: number;
}

export interface ResolverOptions {
  displayLanguage?: string;
  lookupTimeoutMs?: number;
  negativeTtlMs?: number;
  persistToLocalStorage?: boolean;
  /** Passed through for cache namespacing */
  serverUrl?: string;
}
