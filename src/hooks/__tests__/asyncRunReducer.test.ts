/**
 * Unit tests for the pure `asyncRunReducer` (FOUND-03, Plan 24-01 Task 1).
 *
 * Every test exercises the reducer as a pure function -- no React, no hooks.
 * `<string>` is the chosen `TIssue` parameter for simplicity.
 *
 * Covers the authoritative transition table in 24-01-PLAN.md and the
 * cancel-beats-complete invariant per D-07 / T-24-01-02.
 */
import { describe, it, expect } from 'vitest';
import {
  asyncRunReducer,
  initialAsyncRunState,
  type AsyncRunState,
} from '../internal/asyncRunReducer';

describe('asyncRunReducer', () => {
  it('start transitions any prior state to running with cleared issues + progress + errorMessage', () => {
    const stale: AsyncRunState<string> = {
      status: 'error',
      progress: { current: 7, total: 10 },
      issues: ['stale-1', 'stale-2', 'stale-3'],
      errorMessage: 'prior boom',
    };
    const next = asyncRunReducer(stale, { type: 'start' });
    expect(next.status).toBe('running');
    expect(next.progress).toEqual({ current: 0, total: 0 });
    expect(next.issues).toEqual([]);
    expect(next.errorMessage).toBeUndefined();
  });

  it('progress updates progress.current + progress.total without touching other fields', () => {
    const running = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    const withIssues = asyncRunReducer(running, {
      type: 'append-issues',
      issues: ['a'],
    });
    const next = asyncRunReducer(withIssues, {
      type: 'progress',
      current: 3,
      total: 10,
    });
    expect(next.progress).toEqual({ current: 3, total: 10 });
    expect(next.status).toBe('running');
    expect(next.issues).toEqual(['a']);
    expect(next.errorMessage).toBeUndefined();
  });

  it('append-issues extends issues across multiple calls (["a","b"] then ["c"] → ["a","b","c"])', () => {
    const running = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    const afterAB = asyncRunReducer(running, {
      type: 'append-issues',
      issues: ['a', 'b'],
    });
    const afterC = asyncRunReducer(afterAB, {
      type: 'append-issues',
      issues: ['c'],
    });
    expect(afterC.issues).toEqual(['a', 'b', 'c']);
  });

  it('cancel on running transitions to cancelled and is idempotent (cancel-then-cancel)', () => {
    let state = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    state = asyncRunReducer(state, { type: 'cancel' });
    expect(state.status).toBe('cancelled');
    const afterSecondCancel = asyncRunReducer(state, { type: 'cancel' });
    expect(afterSecondCancel.status).toBe('cancelled');
    // Same shape reference when idempotent (reducer returns existing state unchanged).
    expect(afterSecondCancel).toBe(state);
  });

  it('complete is a NO-OP when state is already cancelled (cancel wins)', () => {
    let state = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    state = asyncRunReducer(state, { type: 'cancel' });
    const afterComplete = asyncRunReducer(state, { type: 'complete' });
    expect(afterComplete.status).toBe('cancelled');
    expect(afterComplete).toBe(state);
  });

  it('complete on running transitions to complete', () => {
    const running = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    const done = asyncRunReducer(running, { type: 'complete' });
    expect(done.status).toBe('complete');
  });

  it('error sets status=error and captures errorMessage', () => {
    const running = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    const errored = asyncRunReducer(running, { type: 'error', message: 'boom' });
    expect(errored.status).toBe('error');
    expect(errored.errorMessage).toBe('boom');
  });

  it('reset returns initial state from any prior state', () => {
    let state = asyncRunReducer(initialAsyncRunState<string>(), { type: 'start' });
    state = asyncRunReducer(state, { type: 'append-issues', issues: ['a', 'b'] });
    state = asyncRunReducer(state, { type: 'progress', current: 5, total: 10 });
    state = asyncRunReducer(state, { type: 'error', message: 'boom' });
    const reset = asyncRunReducer(state, { type: 'reset' });
    expect(reset).toEqual({
      status: 'idle',
      progress: { current: 0, total: 0 },
      issues: [],
      errorMessage: undefined,
    });
  });
});

describe('initialAsyncRunState', () => {
  it('returns a fresh idle state with empty progress + issues + undefined errorMessage', () => {
    const initial = initialAsyncRunState<string>();
    expect(initial).toEqual({
      status: 'idle',
      progress: { current: 0, total: 0 },
      issues: [],
      errorMessage: undefined,
    });
  });
});
