import { createContext, useCallback, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { AppSettings } from '../config/types';
import { loadSettings } from '../config/settings';
import { clearQualityCountCache } from '../hooks/useResourceCounts';
import { clearQualityMetricsCache } from '../quality/metricsCache';

export const SETTINGS_STORAGE_KEY = 'fhirExplorer.settings.v1';

type SettingsContextValue = {
  settings: AppSettings | null;
  usingDefaults: boolean;
  loading: boolean;
  setSettings: (next: AppSettings, options?: { usingDefaults?: boolean }) => void;
};

// Exported so consumers that want a graceful no-throw path under a missing
// SettingsProvider (e.g. unit tests that mount a component without wiring
// the full context tree) can read the raw useContext value and fall back
// to undefined. Normal app code keeps using `useSettings()` which throws.
export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then(({ settings: s, usingDefaults: d }) => {
      setSettingsState(s);
      setUsingDefaults(d);
      setLoading(false);
    });
  }, []);

  const setSettings = useCallback(
    (next: AppSettings, options?: { usingDefaults?: boolean }) => {
      // D-04 / D-05: direct-call cache invalidation at save time (no watcher).
      // Any settings save (even sampleSize-only) wipes the current server's
      // metrics + count caches to prevent stale reports from silently
      // accumulating. If the serverUrl also changed, wipe the new URL too.
      const prevUrl = settings?.fhir?.serverUrl;
      const nextUrl = next.fhir?.serverUrl;
      if (prevUrl) {
        clearQualityCountCache(prevUrl);
        clearQualityMetricsCache(prevUrl);
      }
      if (nextUrl && nextUrl !== prevUrl) {
        clearQualityCountCache(nextUrl);
        clearQualityMetricsCache(nextUrl);
      }
      setSettingsState(next);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // localStorage can throw on quota exceeded or in private-browsing
        // contexts. A persistence hiccup must never crash a settings save —
        // the in-memory React state is already updated above.
      }
      setUsingDefaults(options?.usingDefaults ?? false);
    },
    [settings],
  );

  const value = useMemo(
    () => ({ settings, usingDefaults, loading, setSettings }),
    [settings, usingDefaults, loading, setSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
