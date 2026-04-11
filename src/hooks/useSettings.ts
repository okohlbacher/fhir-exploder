import { useState, useEffect } from 'react';
import type { AppSettings } from '../config/types';
import { loadSettings } from '../config/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then(({ settings: s, usingDefaults: d }) => {
      setSettings(s);
      setUsingDefaults(d);
      setLoading(false);
    });
  }, []);

  return { settings, usingDefaults, loading };
}
