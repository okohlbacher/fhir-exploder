/**
 * FOUND-03 `useAsyncRun<TIssue>` — shared async state-machine primitive for
 * the four async report hooks (`usePlausibilityReport`, `useLabRangesReport`,
 * `useDuplicateReport`, `useReferenceReport`) and the future Phase 25
 * `useSampleWalker`.
 *
 * Shape is FIXED (generic only on `TIssue`) per `.planning/research/PITFALLS.md`
 * §Pitfall 1: a fully-generic `<TState>` hook forces consumer panels to carry
 * `as` casts at every read. Here the `{status, progress, errorMessage, issues}`
 * shape captures 100% of what all four callers share; each caller keeps its
 * own `useState` for accessory state (e.g., `duplicateClusters` in
 * `useDuplicateReport`).
 *
 * Cancellation pattern (load-bearing):
 *   Each call to `start()` creates a FRESH `let cancelled = false` in that
 *   call's closure. The `cancelInFlightRef` holds a FUNCTION handle, not a
 *   boolean flag — it is NOT the `cancelledRef` anti-pattern documented in
 *   PITFALLS §Pitfall 2. Each `start()` call creates a fresh `let cancelled
 *   = false` in its own closure; the ref merely holds a function that flips
 *   THAT closure's variable, enabling out-of-closure cancel() calls.
 *
 *   Rationale precedent: see `src/hooks/useCompletenessReport.ts:71-74` for
 *   the comment that first locked this invariant in this codebase.
 *
 * `autoStart`: opt-in behavior for Phase 25 drill-downs that need the hook
 * to start running on mount and restart on deps change. Phase 24 consumers
 * leave it at the default `false` and call `start()` imperatively. Callers
 * using `autoStart: true` MUST ensure `deps` are primitive or memoized to
 * avoid render-loop restarts (PITFALLS §Pitfall 7).
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  asyncRunReducer,
  initialAsyncRunState,
  type AsyncRunState,
} from './internal/asyncRunReducer';

export interface RunnerHelpers<TIssue> {
  isCancelled: () => boolean;
  setProgress: (current: number, total: number) => void;
  appendIssues: (batch: TIssue[]) => void;
}

export interface UseAsyncRunArgs<TIssue> {
  runner: (helpers: RunnerHelpers<TIssue>) => Promise<void>;
  /** Deps array that refreshes the start() useCallback and the autoStart effect. */
  deps?: unknown[];
  /**
   * If true, start() fires on mount and whenever `deps` change. Callers MUST
   * ensure `deps` are primitive or memoized — otherwise every render restarts
   * the runner (see PITFALLS §Pitfall 7).
   */
  autoStart?: boolean;
}

export interface UseAsyncRunResult<TIssue> extends AsyncRunState<TIssue> {
  start: () => void;
  cancel: () => void;
}

export function useAsyncRun<TIssue>(
  args: UseAsyncRunArgs<TIssue>,
): UseAsyncRunResult<TIssue> {
  const [state, dispatch] = useReducer(
    asyncRunReducer<TIssue>,
    undefined,
    initialAsyncRunState<TIssue>,
  );

  // Holds a function that flips the CURRENT run's closure-scoped `cancelled`
  // variable. NOT a boolean flag — this is not the `cancelledRef` anti-pattern.
  const cancelInFlightRef = useRef<(() => void) | null>(null);

  // The runner is read through a ref so start()'s useCallback does not need
  // to list it as a dep (runner identity changes on every render for inline
  // arrow functions — listing it would thrash the callback).
  const runnerRef = useRef(args.runner);
  runnerRef.current = args.runner;

  const deps = args.deps ?? [];

  const start = useCallback(() => {
    // Cancel any currently-running runner; its closure's own `cancelled`
    // flips to true and its helpers short-circuit.
    cancelInFlightRef.current?.();

    // Fresh closure-scoped flag for THIS run.
    let cancelled = false;
    cancelInFlightRef.current = () => {
      cancelled = true;
    };

    dispatch({ type: 'start' });

    const helpers: RunnerHelpers<TIssue> = {
      isCancelled: () => cancelled,
      setProgress: (current, total) => {
        if (cancelled) return;
        dispatch({ type: 'progress', current, total });
      },
      appendIssues: (issues) => {
        if (cancelled) return;
        dispatch({ type: 'append-issues', issues });
      },
    };

    void (async () => {
      try {
        await runnerRef.current(helpers);
        if (cancelled) {
          // Cancel wins: reducer treats this as a no-op if already cancelled,
          // but dispatching explicitly keeps the transition table total.
          dispatch({ type: 'cancel' });
          return;
        }
        dispatch({ type: 'complete' });
      } catch (err) {
        // Cancellation supersedes error — if the runner threw because we
        // aborted it, stay cancelled rather than flipping to error.
        if (cancelled) return;
        dispatch({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are caller-controlled via args.deps
  }, deps);

  const cancel = useCallback(() => {
    cancelInFlightRef.current?.();
    dispatch({ type: 'cancel' });
  }, []);

  // autoStart wiring: when true, call start() on mount AND whenever deps change.
  // Cleanup cancels the in-flight run on unmount or dep-change.
  useEffect(() => {
    if (args.autoStart) {
      start();
    }
    return () => {
      cancelInFlightRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are caller-controlled via args.deps
  }, deps);

  return { ...state, start, cancel };
}
