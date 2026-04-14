/**
 * useThresholds — binds the localStorage-backed overrides to React state
 * and exposes the resolve/breach helpers curried over current state.
 *
 * Pattern mirrors useSampleSize in src/components/quality/SampleSizeControl.tsx
 * and the cohort useLocalStorage call in QualityOverviewPage.
 *
 * HYDRATION GATE (REVIEW-FIX WR-04): Mantine's `useLocalStorage` is
 * async-hydrating — on first render it returns the `defaultValue` (`{}`)
 * and only after a microtask does it surface the persisted overrides. If
 * a consumer renders breach state directly off `resolveThreshold(stored)`
 * on that first frame, a user who has `validation: null` (disabled) will
 * see a red "breached" tile flash for one frame on every page load
 * before the stored overrides hydrate. That contradicts D-15 (breach
 * signals are stable visual cues, not transient banners).
 *
 * We track a `hydrated` flag that flips true after mount, and `isBreached`
 * returns `false` until then. The raw `stored` object and `getActiveThreshold`
 * are NOT gated — callers that only need the persisted value (e.g., the
 * ThresholdsPage settings UI) see the hydration progression naturally; the
 * gate only suppresses the visual breach signal during the pre-hydration
 * window.
 */
import { useLocalStorage } from '@mantine/hooks';
import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_THRESHOLDS,
  STORAGE_KEY,
  isBreached as pureIsBreached,
  resolveThreshold,
  type MetricKey,
  type Thresholds,
} from '../quality/thresholds';

export interface UseThresholdsReturn {
  stored: Thresholds;
  defaults: Record<MetricKey, number>;
  /** True after the first mount microtask — useLocalStorage has hydrated. */
  hydrated: boolean;
  setThreshold: (key: MetricKey, value: number) => void;
  clearThreshold: (key: MetricKey) => void;
  resetThreshold: (key: MetricKey) => void;
  resetAll: () => void;
  /** Returns `false` until hydrated to prevent one-frame breach flicker. */
  isBreached: (key: MetricKey, value: number | undefined) => boolean;
  getActiveThreshold: (key: MetricKey) => number | null;
}

export function useThresholds(): UseThresholdsReturn {
  const [stored, setStored] = useLocalStorage<Thresholds>({
    key: STORAGE_KEY,
    defaultValue: {},
  });

  // Flips true after the first effect tick — by then Mantine's
  // useLocalStorage has surfaced any persisted overrides.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const setThreshold = useCallback(
    (key: MetricKey, value: number) => {
      setStored((prev) => ({ ...prev, [key]: value }));
    },
    [setStored],
  );

  const clearThreshold = useCallback(
    (key: MetricKey) => {
      setStored((prev) => ({ ...prev, [key]: null }));
    },
    [setStored],
  );

  const resetThreshold = useCallback(
    (key: MetricKey) => {
      setStored((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setStored],
  );

  const resetAll = useCallback(() => setStored({}), [setStored]);

  const isBreached = useCallback(
    (key: MetricKey, value: number | undefined) =>
      hydrated && pureIsBreached(value, resolveThreshold(key, stored)),
    [stored, hydrated],
  );

  const getActiveThreshold = useCallback(
    (key: MetricKey) => resolveThreshold(key, stored),
    [stored],
  );

  return {
    stored,
    defaults: DEFAULT_THRESHOLDS,
    hydrated,
    setThreshold,
    clearThreshold,
    resetThreshold,
    resetAll,
    isBreached,
    getActiveThreshold,
  };
}
