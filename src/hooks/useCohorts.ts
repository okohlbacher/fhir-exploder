/**
 * useCohorts — React state + persistence hook for the interactive cohort
 * builder (Phase 21, CHRT-02). Binds `quality.cohorts.v1` to React state
 * via Mantine's `useLocalStorage`, applies the WR-04 hydration-gate pattern
 * (mirrors `useThresholds` / `useTrendsHistory`), and exposes a minimal
 * mutator surface for Plan 21-05 (Builder UI) and Plan 21-06 (dashboard
 * dropdown).
 *
 * HYDRATION GATE (21-RESEARCH.md §Pitfall 1): Mantine's `useLocalStorage`
 * is async-hydrating — on first render it returns `defaultValue` and only
 * after a microtask does it surface the persisted payload. If the dashboard
 * consumed `stored.activeCohortId` directly on the first frame, a user with
 * a stored active cohort would see "No cohort" flash for one frame on every
 * page load — the same class of bug as REVIEW-FIX WR-04 in `useThresholds.ts`.
 * We track a `hydrated` flag that flips true after the first effect tick and
 * gate the visible cohorts / activeCohortId / activeCohort behind it.
 *
 * QUOTA HANDLING (T-21-06): `localStorage` caps at ~5 MB per origin. If
 * `addCohort` would overflow, `setItem` throws `DOMException('QuotaExceededError')`.
 * We probe `setItem` directly before delegating to Mantine's `setStored`
 * (which silently swallows the error) and surface a red notification.
 * Pattern mirrors `useTrendsHistory.append`.
 *
 * LEGACY MIGRATION: This hook DOES NOT migrate the legacy `quality.cohort.v1`
 * (resource-type list) key — that lives in `QualityLayout.tsx` (Plan 21-04)
 * per 21-RESEARCH.md §"CRITICAL ordering / Option A". The legacy key
 * constants (LEGACY_COHORT_KEY, RESOURCE_TYPES_STORAGE_KEY) are exported
 * from `src/quality/cohorts.ts` for that plan to consume.
 *
 * Threat mitigations:
 *   - T-21-02 (URL injection): criterion values never string-concatenated
 *     into URLs — that's the resolver's concern. This hook stores plain JSON.
 *   - T-21-03 (PHI in logs): error messages reference counts only, never IDs.
 *   - T-21-04 (Tampering): `useLocalStorage` handles JSON-parse errors;
 *     Mantine falls back to `defaultValue` on invalid payloads.
 *   - T-21-06 (DoS quota): try/catch + user-facing notification.
 */
import { useLocalStorage } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  COHORTS_STORAGE_KEY,
  DEFAULT_COHORTS_STORAGE,
  findActiveCohort,
  type CohortCriterion,
  type CohortDefinition,
  type CohortsStorage,
} from '../quality/cohorts';

export interface UseCohortsApi {
  /** All saved cohorts; empty array until hydrated. */
  cohorts: CohortDefinition[];
  /** ID of the currently-active cohort, or null. `null` until hydrated. */
  activeCohortId: string | null;
  /** Resolved active cohort, or null. `null` until hydrated. */
  activeCohort: CohortDefinition | null;
  /** True after the first mount microtask — useLocalStorage has hydrated. */
  hydrated: boolean;
  /**
   * Persists a new cohort with a UUID id + ISO timestamps. Returns the
   * created CohortDefinition so callers can immediately activate it.
   * Throws on `QuotaExceededError` after surfacing a red notification.
   */
  addCohort(input: { name: string; criteria: CohortCriterion[] }): CohortDefinition;
  /** Sets `activeCohortId`; pass `null` to deactivate. */
  activateCohort(id: string | null): void;
  /**
   * Updates an existing cohort's `name` and/or `criteria`. Always bumps
   * `updatedAt` to `new Date().toISOString()` so Phase-21's resolver cache
   * (keyed on `cohort.id + updatedAt`) invalidates automatically (D-10).
   *
   * Throws `Error('Cohort not found: {id}')` on unknown id.
   * Surfaces `'Update failed'` red toast on QuotaExceededError, then
   * re-throws the DOMException.
   */
  updateCohort(
    id: string,
    patch: { name?: string; criteria?: CohortCriterion[] },
  ): CohortDefinition;
  /**
   * Removes a cohort from storage. Clears `activeCohortId` if it matched
   * the deleted cohort's id. Silently no-ops on unknown id (UI should
   * prevent this, but defensive coding avoids noisy failures).
   *
   * Surfaces `'Delete failed'` red toast on QuotaExceededError, then
   * re-throws.
   */
  deleteCohort(id: string): void;
  /**
   * Creates a copy of an existing cohort with a fresh UUID, fresh
   * timestamps, and the name suffixed with `' (copy)'`. Returns the new
   * cohort (useful for UIs that want to immediately scroll/highlight it).
   *
   * Throws `Error('Cohort not found: {id}')` on unknown id.
   * Surfaces `'Duplicate failed'` red toast on QuotaExceededError.
   */
  duplicateCohort(id: string): CohortDefinition;
}

export function useCohorts(): UseCohortsApi {
  const [stored, setStored] = useLocalStorage<CohortsStorage>({
    key: COHORTS_STORAGE_KEY,
    defaultValue: DEFAULT_COHORTS_STORAGE,
  });

  // Flips true after the first effect tick — by then Mantine's
  // useLocalStorage has surfaced the persisted payload.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const addCohort = useCallback(
    (input: { name: string; criteria: CohortCriterion[] }): CohortDefinition => {
      const now = new Date().toISOString();
      const cohort: CohortDefinition = {
        id: crypto.randomUUID(),
        name: input.name,
        criteria: input.criteria,
        createdAt: now,
        updatedAt: now,
      };
      const next: CohortsStorage = {
        ...stored,
        cohorts: [...stored.cohorts, cohort],
      };
      // Probe localStorage.setItem synchronously before delegating to
      // Mantine's setStored — Mantine wraps setItem in its own try/catch
      // and silently logs to console on QuotaExceededError, which would
      // swallow the T-21-06 signal we must surface to the user. Mirrors
      // the pattern established in `useTrendsHistory.append`.
      try {
        window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          notifications.show({
            color: 'red',
            title: 'Cohort not saved',
            message:
              'Browser storage is full. Delete unused cohorts to make room.',
            autoClose: 6000,
          });
        }
        throw err;
      }
      // Persisted successfully — sync React state via Mantine so consumers
      // rerender.
      setStored(next);
      return cohort;
    },
    [stored, setStored],
  );

  const activateCohort = useCallback(
    (id: string | null) => {
      const next: CohortsStorage = { ...stored, activeCohortId: id };
      try {
        window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          notifications.show({
            color: 'red',
            title: 'Activation failed',
            message:
              'Browser storage is full. Delete unused cohorts to make room.',
            autoClose: 6000,
          });
        }
        throw err;
      }
      setStored(next);
    },
    [stored, setStored],
  );

  // -----------------------------------------------------------------------
  // Plan 22-02 — CRUD surface (updateCohort / deleteCohort / duplicateCohort).
  //
  // All three share the same "probe localStorage.setItem before delegating
  // to Mantine's setStored" pattern established by `addCohort`. That probe
  // is the T-21-06 defence: Mantine's useLocalStorage silently swallows the
  // DOMException('QuotaExceededError') and only console.error-s, so we must
  // intercept it here to raise the user-visible red notification.
  // -----------------------------------------------------------------------

  const persist = useCallback(
    (next: CohortsStorage, failureTitle: string, failureMessage: string) => {
      try {
        window.localStorage.setItem(COHORTS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          notifications.show({
            color: 'red',
            title: failureTitle,
            message: failureMessage,
            autoClose: 6000,
          });
        }
        throw err;
      }
      setStored(next);
    },
    [setStored],
  );

  const updateCohort = useCallback(
    (
      id: string,
      patch: { name?: string; criteria?: CohortCriterion[] },
    ): CohortDefinition => {
      const idx = stored.cohorts.findIndex((c) => c.id === id);
      if (idx < 0) {
        throw new Error(`Cohort not found: ${id}`);
      }
      const now = new Date().toISOString();
      const existing = stored.cohorts[idx];
      const updated: CohortDefinition = {
        ...existing,
        name: patch.name ?? existing.name,
        criteria: patch.criteria ?? existing.criteria,
        updatedAt: now,
      };
      const nextCohorts = [...stored.cohorts];
      nextCohorts[idx] = updated;
      const next: CohortsStorage = { ...stored, cohorts: nextCohorts };
      persist(
        next,
        'Update failed',
        'Could not save changes to browser storage. Your browser may be in private mode or out of space.',
      );
      return updated;
    },
    [stored, persist],
  );

  const deleteCohort = useCallback(
    (id: string): void => {
      const exists = stored.cohorts.some((c) => c.id === id);
      if (!exists) return;
      const nextCohorts = stored.cohorts.filter((c) => c.id !== id);
      const nextActiveId =
        stored.activeCohortId === id ? null : stored.activeCohortId;
      const next: CohortsStorage = {
        cohorts: nextCohorts,
        activeCohortId: nextActiveId,
      };
      persist(
        next,
        'Delete failed',
        'Could not delete cohort from browser storage. Try again or reload the page.',
      );
    },
    [stored, persist],
  );

  const duplicateCohort = useCallback(
    (id: string): CohortDefinition => {
      const original = stored.cohorts.find((c) => c.id === id);
      if (!original) {
        throw new Error(`Cohort not found: ${id}`);
      }
      const now = new Date().toISOString();
      const copy: CohortDefinition = {
        id: crypto.randomUUID(),
        name: `${original.name} (copy)`,
        criteria: original.criteria,
        createdAt: now,
        updatedAt: now,
      };
      const next: CohortsStorage = {
        ...stored,
        cohorts: [...stored.cohorts, copy],
      };
      persist(
        next,
        'Duplicate failed',
        'Could not duplicate cohort. Your browser may be in private mode or out of space.',
      );
      return copy;
    },
    [stored, persist],
  );

  const activeCohort = useMemo(() => findActiveCohort(stored), [stored]);

  return {
    cohorts: hydrated ? stored.cohorts : [],
    activeCohortId: hydrated ? stored.activeCohortId : null,
    activeCohort: hydrated ? activeCohort : null,
    hydrated,
    addCohort,
    activateCohort,
    updateCohort,
    deleteCohort,
    duplicateCohort,
  };
}
