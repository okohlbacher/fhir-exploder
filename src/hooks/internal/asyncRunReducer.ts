/**
 * FOUND-03 pure reducer for the `useAsyncRun<TIssue>` state machine.
 *
 * This module is intentionally React-free so its transitions can be unit-tested
 * in isolation (see `src/hooks/__tests__/asyncRunReducer.test.ts`).
 *
 * Shape is FIXED (generic only on `TIssue`) to prevent the consumer-panel `as`
 * cast leak documented in `.planning/research/PITFALLS.md` §Pitfall 1:
 * a fully-generic `<TState>` reducer forces callers to either reassert narrower
 * accessory shapes at every read or force-cast in their panel components.
 * Keeping `{status, progress, issues, errorMessage}` fixed captures 100% of
 * what the four async report hooks share; caller-specific accessory state
 * stays in the caller's own `useState`.
 *
 * Cancellation rationale: see `src/hooks/useCompletenessReport.ts:71-74` for
 * the load-bearing comment on closure-scoped `let cancelled` vs the
 * `cancelledRef` anti-pattern. This reducer encodes the "cancel wins over
 * complete" rule (T-24-01-02) so downstream runners cannot accidentally mark
 * a cancelled run as complete just by resolving their promise after cancel().
 */

export type AsyncRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

export interface AsyncRunState<TIssue> {
  status: AsyncRunStatus;
  progress: { current: number; total: number };
  issues: TIssue[];
  errorMessage?: string;
}

export type AsyncRunAction<TIssue> =
  | { type: 'start' }
  | { type: 'progress'; current: number; total: number }
  | { type: 'append-issues'; issues: TIssue[] }
  | { type: 'complete' }
  | { type: 'cancel' }
  | { type: 'error'; message: string }
  | { type: 'reset' };

export function initialAsyncRunState<TIssue>(): AsyncRunState<TIssue> {
  return {
    status: 'idle',
    progress: { current: 0, total: 0 },
    issues: [],
    errorMessage: undefined,
  };
}

export function asyncRunReducer<TIssue>(
  state: AsyncRunState<TIssue>,
  action: AsyncRunAction<TIssue>,
): AsyncRunState<TIssue> {
  switch (action.type) {
    case 'start':
      return {
        status: 'running',
        progress: { current: 0, total: 0 },
        issues: [],
        errorMessage: undefined,
      };
    case 'progress':
      return {
        ...state,
        progress: { current: action.current, total: action.total },
      };
    case 'append-issues':
      return {
        ...state,
        issues: [...state.issues, ...action.issues],
      };
    case 'complete':
      // Cancel wins: if the run was cancelled, do not flip to complete even if
      // the runner's promise resolved after cancel() fired (T-24-01-02).
      return state.status === 'cancelled'
        ? state
        : { ...state, status: 'complete' };
    case 'cancel':
      // Idempotent: only running runs transition to cancelled; any other
      // status (idle, complete, cancelled, error) stays as-is.
      return state.status === 'running'
        ? { ...state, status: 'cancelled' }
        : state;
    case 'error':
      return {
        ...state,
        status: 'error',
        errorMessage: action.message,
      };
    case 'reset':
      return {
        status: 'idle',
        progress: { current: 0, total: 0 },
        issues: [],
        errorMessage: undefined,
      };
  }
}
