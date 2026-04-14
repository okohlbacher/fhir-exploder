/**
 * useTrendsHistory — React hook backing the Phase 19 Trends tab.
 *
 * Binds the `quality.trends.v1` localStorage array to React state via
 * Mantine's `useLocalStorage`, applies the Phase 18 WR-04 hydration-gate
 * pattern (mirrors `useThresholds`), defends against corrupt payloads
 * (non-array JSON) by coercing to `[]` + a single `console.warn`, and
 * surfaces `QuotaExceededError` on append as a user-facing red
 * notification (T-19-09 mitigation).
 *
 * HYDRATION GATE: The first render returns `{ hydrated: false, snapshots: [] }`.
 * One `useEffect` tick later, `hydrated` flips to `true`. The `TrendsPanel`
 * consumes this flag to render 7 `Skeleton` blocks instead of the empty
 * state on the first frame — prevents an empty-state flicker on page load
 * for users with existing snapshot history.
 *
 * CORRUPT PAYLOAD HANDLING (T-19-07): `localStorage` can be tampered with
 * externally (dev tools, other apps sharing the origin, old builds). If
 * the stored value is not an array, we warn ONCE and fall back to `[]`.
 * No toast — silent recovery is preferable to alarming the user about
 * something they likely didn't cause.
 *
 * QUOTA HANDLING (T-19-09): `localStorage` caps at ~5 MB per origin. If a
 * snapshot append would exceed that, `setItem` throws a `DOMException` with
 * `name === 'QuotaExceededError'`. We catch, surface a red notification
 * guiding the user to clear history, and swallow the error. Other errors
 * re-throw (unexpected).
 */
import { useLocalStorage } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TRENDS_STORAGE_KEY,
  type QualitySnapshot,
} from '../quality/trendsHistory';

export interface UseTrendsHistoryReturn {
  snapshots: QualitySnapshot[];
  /** True after the first mount microtask — useLocalStorage has hydrated. */
  hydrated: boolean;
  append: (snap: QualitySnapshot) => void;
  clearAll: () => void;
}

export function useTrendsHistory(): UseTrendsHistoryReturn {
  const [stored, setStored] = useLocalStorage<QualitySnapshot[]>({
    key: TRENDS_STORAGE_KEY,
    defaultValue: [],
  });

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Warn exactly once per hook instance on corrupt payload.
  const warnedRef = useRef(false);
  const snapshots = useMemo<QualitySnapshot[]>(() => {
    if (Array.isArray(stored)) return stored;
    if (!warnedRef.current) {
      console.warn('quality.trends.v1 corrupted, resetting to []');
      warnedRef.current = true;
    }
    return [];
  }, [stored]);

  const append = useCallback(
    (snap: QualitySnapshot) => {
      // We probe localStorage.setItem directly before delegating to Mantine's
      // setStored because Mantine's useLocalStorage wraps setItem in its own
      // try/catch and silently logs to console on QuotaExceededError — it
      // never surfaces the error to callers. To honor the T-19-09 mitigation
      // ("user must see a notification when storage is full"), we do the
      // quota check here and let the user know. On success, we delegate to
      // setStored for React-state sync.
      const base = Array.isArray(stored) ? stored : [];
      const next = [...base, snap];
      try {
        // Direct probe — triggers QuotaExceededError synchronously when full.
        window.localStorage.setItem(TRENDS_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          notifications.show({
            color: 'red',
            title: 'Snapshot not saved',
            message:
              'Browser storage is full. Clear history on the Trends tab to make room.',
            autoClose: 6000,
          });
          return;
        }
        throw err;
      }
      // Persisted successfully — sync React state via Mantine.
      setStored(next);
    },
    [stored, setStored],
  );

  const clearAll = useCallback(() => setStored([]), [setStored]);

  return { snapshots, hydrated, append, clearAll };
}
