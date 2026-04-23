/**
 * Retry a thunk-returning-Promise with exponential backoff.
 *
 * Used by `React.lazy(() => retry(() => import('...')))` in `src/App.tsx` to
 * survive transient chunk-load failures (stale CDN cache after deploy, flaky
 * network). Default 3 attempts, base delay 100ms, exponent 3 → 100/300/900ms
 * backoff, total wait ~1.3s before giving up.
 *
 * Per 27-RESEARCH.md Pitfall 1: explicit-loop form (NOT recursion) avoids
 * infinite-loop footguns and keeps stack depth flat regardless of attempt
 * count.
 *
 * @param fn          Async thunk to invoke; typically `() => import('./X')`.
 * @param maxAttempts Maximum number of attempts (default 3). Must be >= 1.
 * @param baseDelayMs Base delay in milliseconds (default 100). Backoff is
 *                    `baseDelayMs * Math.pow(3, attempt)` — so with the
 *                    defaults, retries wait 100ms then 300ms (no third wait
 *                    because the third attempt is the last and either
 *                    succeeds or rejects with the last error).
 * @returns The first successful resolution, or rejects with the LAST error
 *          after `maxAttempts` failures.
 */
export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
): Promise<T> {
  return (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) break;
        const delay = baseDelayMs * Math.pow(3, attempt);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  })();
}
