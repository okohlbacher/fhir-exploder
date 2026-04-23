/**
 * Wave 0 (RED) test for `src/utils/lazyRetry.ts` — Phase 27, Plan 02.
 *
 * Covers EFF-02 retry semantics:
 *   - returns the resolved value on first success (1 call, no retries)
 *   - retries up to maxAttempts then throws the LAST error
 *   - succeeds on a later attempt and returns its resolution
 *   - default baseDelayMs=100 → 100ms before retry 2
 *   - custom baseDelayMs=50 → 50/150/450 backoff (formula baseDelayMs * 3^attempt)
 *
 * Pitfall 1 mitigation (27-RESEARCH.md): explicit-loop retry, NOT recursion.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retry } from '../lazyRetry';

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the resolved value on first success (1 call)', async () => {
    const fn = vi.fn(async () => 42);
    await expect(retry(fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxAttempts then throws the LAST error', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      throw new Error(`attempt-${n}`);
    });
    const promise = retry(fn, 3);
    // Attach a catch handler immediately so the eventual rejection has a
    // listener while the fake timers are still being advanced.
    const settled = promise.catch((e) => e);
    // Advance through all retry waits (100 + 300 = 400ms total).
    await vi.advanceTimersByTimeAsync(1000);
    const error = (await settled) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('attempt-3');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('succeeds on attempt 2 → 2 calls, returns the second resolution', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n === 1) throw new Error('first');
      return 'ok';
    });
    const promise = retry(fn, 3);
    await vi.advanceTimersByTimeAsync(200);
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('default baseDelayMs=100 → 100ms before retry 2', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n < 2) throw new Error('flaky');
      return 'ok';
    });
    const promise = retry(fn);
    // Let the initial call's microtasks settle so the first invocation is
    // counted before we start advancing timers.
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    // Advance 99ms — still not enough to trigger retry.
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);
    // Advance the remaining 1ms — retry fires.
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('custom baseDelayMs=50 → 50/150/450 backoff (formula baseDelayMs * 3^attempt)', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      throw new Error(`attempt-${n}`);
    });
    const promise = retry(fn, 3, 50);
    const settled = promise.catch((e) => e);
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(49);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(149);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);
    const error = (await settled) as Error;
    expect(error.message).toBe('attempt-3');
  });
});
