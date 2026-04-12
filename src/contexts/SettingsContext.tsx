import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { AppSettings } from '../config/types';
import { loadSettings } from '../config/settings';

type SettingsContextValue = {
  settings: AppSettings | null;
  usingDefaults: boolean;
  loading: boolean;
  setSettings: (next: AppSettings, options?: { usingDefaults?: boolean }) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

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

  const setSettings = (next: AppSettings, options?: { usingDefaults?: boolean }) => {
    setSettingsState(next);
    setUsingDefaults(options?.usingDefaults ?? false);
  };

  const value = useMemo(
    () => ({ settings, usingDefaults, loading, setSettings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, usingDefaults, loading],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
