import { useSettingsContext } from '../contexts/SettingsContext';

/**
 * Read (and optionally mutate) the current app settings.
 * Delegates to SettingsContext — requires SettingsProvider in the tree.
 * Backward-compatible: existing consumers that destructure only
 * { settings, usingDefaults, loading } continue to work unchanged.
 */
export function useSettings() {
  return useSettingsContext();
}
