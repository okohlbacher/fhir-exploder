import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '@mantine/hooks';

export type ExpertModeContextValue = {
  isExpert: boolean;
  toggle: () => void;
  setExpert: (value: boolean) => void;
};

const ExpertModeContext = createContext<ExpertModeContextValue | null>(null);

/**
 * Phase 56 SIDE-02 — persisted expert-mode flag.
 * Storage key: `app.expertMode.v1`
 * `getInitialValueInEffect: false` avoids hydration flicker.
 */
export function ExpertModeProvider({ children }: { children: ReactNode }) {
  const [isExpert, setIsExpert] = useLocalStorage<boolean>({
    key: 'app.expertMode.v1',
    defaultValue: false,
    getInitialValueInEffect: false,
  });

  const toggle = useCallback(() => setIsExpert((prev) => !prev), [setIsExpert]);
  const setExpert = useCallback((value: boolean) => setIsExpert(value), [setIsExpert]);

  const value = useMemo<ExpertModeContextValue>(
    () => ({ isExpert, toggle, setExpert }),
    [isExpert, toggle, setExpert],
  );

  return (
    <ExpertModeContext.Provider value={value}>{children}</ExpertModeContext.Provider>
  );
}

export function useExpertMode(): ExpertModeContextValue {
  const ctx = useContext(ExpertModeContext);
  if (!ctx) {
    throw new Error('useExpertMode must be used within ExpertModeProvider');
  }
  return ctx;
}
