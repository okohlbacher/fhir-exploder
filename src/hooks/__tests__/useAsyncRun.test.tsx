/**
 * Integration tests for `useAsyncRun<TIssue>` (FOUND-03, Plan 24-01 Task 2).
 *
 * Covers:
 *   - Initial idle state shape
 *   - start() → running → complete lifecycle
 *   - cancel() mid-run flips isCancelled + blocks post-cancel dispatches
 *   - Rapid start() re-entry: prior runner sees its own cancelled=true
 *   - Runner throw → error status + errorMessage
 *   - autoStart: true fires start() on mount exactly once
 *   - Unmount during run flips the in-flight runner's cancelled
 *   - StrictMode double-mount: cancel wins over late complete
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useAsyncRun } from '../useAsyncRun';

beforeEach(() => {
  vi.useRealTimers();
});

/** Helper: wait a tick so queued microtasks + timers can settle. */
async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useAsyncRun', () => {
  it('returns idle initial state with start + cancel functions', () => {
    const { result } = renderHook(() =>
      useAsyncRun<string>({
        runner: async () => undefined,
      }),
    );
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toEqual({ current: 0, total: 0 });
    expect(result.current.issues).toEqual([]);
    expect(result.current.errorMessage).toBeUndefined();
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
  });

  it('start() transitions idle → running → complete and surfaces appended issues', async () => {
    const runner = vi.fn(async ({ appendIssues }: { appendIssues: (batch: string[]) => void }) => {
      appendIssues(['a', 'b']);
    });

    const { result } = renderHook(() =>
      useAsyncRun<string>({ runner }),
    );

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.issues).toEqual(['a', 'b']);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('cancel() mid-run causes subsequent isCancelled() to return true; final status is cancelled', async () => {
    // Resolvers to step the runner through phases.
    let releaseFirstPhase: (() => void) | null = null;
    const firstPhase = new Promise<void>((resolve) => {
      releaseFirstPhase = resolve;
    });

    const observations: { beforeCancel: boolean | null; afterCancel: boolean | null } = {
      beforeCancel: null,
      afterCancel: null,
    };

    const runner = async ({
      isCancelled,
      setProgress,
      appendIssues,
    }: {
      isCancelled: () => boolean;
      setProgress: (c: number, t: number) => void;
      appendIssues: (b: string[]) => void;
    }) => {
      observations.beforeCancel = isCancelled();
      await firstPhase;
      observations.afterCancel = isCancelled();
      // Post-cancel helpers must be no-ops — these calls should not update state.
      setProgress(99, 100);
      appendIssues(['should-not-appear']);
    };

    const { result } = renderHook(() => useAsyncRun<string>({ runner }));

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('running'));

    act(() => {
      result.current.cancel();
    });
    expect(result.current.status).toBe('cancelled');

    await act(async () => {
      releaseFirstPhase!();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(observations.beforeCancel).toBe(false);
    expect(observations.afterCancel).toBe(true);
    // Post-cancel no-op: progress remains at the {0,0} set by dispatch('start'),
    // and issues never got the 'should-not-appear' entry.
    expect(result.current.progress).toEqual({ current: 0, total: 0 });
    expect(result.current.issues).toEqual([]);
    expect(result.current.status).toBe('cancelled');
  });

  it('rapid start() re-entry cancels the prior run; second run completes cleanly', async () => {
    let firstRunCancelledObserved = false;
    let releaseFirst: (() => void) | null = null;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const runner = vi.fn(
      async ({
        isCancelled,
        appendIssues,
      }: {
        isCancelled: () => boolean;
        appendIssues: (b: string[]) => void;
      }) => {
        const callIndex = runner.mock.calls.length;
        if (callIndex === 1) {
          // First call: wait, then observe cancellation, do not append.
          await firstGate;
          firstRunCancelledObserved = isCancelled();
          return;
        }
        // Second call: proceed normally.
        appendIssues(['second']);
      },
    );

    const { result } = renderHook(() => useAsyncRun<string>({ runner }));

    act(() => {
      result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe('running'));

    // Re-enter start(); this must flip the FIRST runner's cancelled flag.
    act(() => {
      result.current.start();
    });

    // Let the second run complete.
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.issues).toEqual(['second']);

    // Release the first runner so it observes its own cancellation.
    await act(async () => {
      releaseFirst!();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(firstRunCancelledObserved).toBe(true);
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('runner throwing an error dispatches error with the error message', async () => {
    const runner = vi.fn(async () => {
      throw new Error('runner explosion');
    });

    const { result } = renderHook(() => useAsyncRun<string>({ runner }));

    act(() => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe('runner explosion');
  });

  it('autoStart: true fires start() on mount exactly once', async () => {
    const runner = vi.fn(async ({ appendIssues }: { appendIssues: (b: string[]) => void }) => {
      appendIssues(['auto']);
    });

    const { result } = renderHook(() =>
      useAsyncRun<string>({ runner, autoStart: true, deps: [] }),
    );

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.issues).toEqual(['auto']);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('unmount while running flips the in-flight runner cancelled flag', async () => {
    let runnerIsCancelled: (() => boolean) | null = null;
    let releaseRunner: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      releaseRunner = resolve;
    });

    const runner = async ({ isCancelled }: { isCancelled: () => boolean }) => {
      runnerIsCancelled = isCancelled;
      await gate;
    };

    const { result, unmount } = renderHook(() =>
      useAsyncRun<string>({ runner, autoStart: true, deps: [] }),
    );

    await waitFor(() => expect(result.current.status).toBe('running'));
    expect(runnerIsCancelled).not.toBeNull();
    expect(runnerIsCancelled!()).toBe(false);

    unmount();

    expect(runnerIsCancelled!()).toBe(true);

    // Let the runner finish so we don't leak the promise.
    await act(async () => {
      releaseRunner!();
      await Promise.resolve();
    });
  });

  it('StrictMode double-mount: rapid start+cancel never lands status=complete after cancelled', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    let releaseRun: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      releaseRun = resolve;
    });

    const runner = vi.fn(async () => {
      await gate;
    });

    const { result } = renderHook(
      () => useAsyncRun<string>({ runner }),
      { wrapper },
    );

    act(() => {
      result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe('running'));

    act(() => {
      result.current.cancel();
    });
    expect(result.current.status).toBe('cancelled');

    // Release the runner; its promise resolution triggers a 'complete' dispatch
    // that the reducer MUST ignore because the run is cancelled.
    await act(async () => {
      releaseRun!();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushMicrotasks();

    expect(result.current.status).toBe('cancelled');
  });
});
