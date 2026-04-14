/**
 * useThresholds — binds the localStorage-backed overrides to React state
 * and exposes the resolve/breach helpers curried over current state.
 *
 * Pattern mirrors useSampleSize in src/components/quality/SampleSizeControl.tsx
 * and the cohort useLocalStorage call in QualityOverviewPage.
 */
import { useLocalStorage } from '@mantine/hooks';
import { useCallback } from 'react';
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
  setThreshold: (key: MetricKey, value: number) => void;
  clearThreshold: (key: MetricKey) => void;
  resetThreshold: (key: MetricKey) => void;
  resetAll: () => void;
  isBreached: (key: MetricKey, value: number | undefined) => boolean;
  getActiveThreshold: (key: MetricKey) => number | null;
}

export function useThresholds(): UseThresholdsReturn {
  const [stored, setStored] = useLocalStorage<Thresholds>({
    key: STORAGE_KEY,
    defaultValue: {},
  });

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
      pureIsBreached(value, resolveThreshold(key, stored)),
    [stored],
  );

  const getActiveThreshold = useCallback(
    (key: MetricKey) => resolveThreshold(key, stored),
    [stored],
  );

  return {
    stored,
    defaults: DEFAULT_THRESHOLDS,
    setThreshold,
    clearThreshold,
    resetThreshold,
    resetAll,
    isBreached,
    getActiveThreshold,
  };
}
