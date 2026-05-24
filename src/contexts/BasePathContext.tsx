import { createContext, useContext, type ReactNode } from 'react';

/**
 * Phase 59 FIX-01 (NAV-01) — patient-context preservation for middle-click refs.
 *
 * Holds the current navigation base-path prefix:
 *   - `/explorer` (default, when no patient scope active)
 *   - `/patients/${patientId}` (when rendered inside a patient subtree)
 *
 * Consumed by `ReferenceLink` to build hrefs as `${basePath}/${type}/${id}`,
 * so middle-clicking a reference inside a patient-scoped page opens the target
 * in a new tab WITH patient context preserved.
 *
 * Default value is `'/explorer'` — every call site outside ResourceDetailPage's
 * subtree continues to produce `/explorer/${type}/${id}` URLs (D-02).
 */
const BasePathContext = createContext<string>('/explorer');

export interface BasePathProviderProps {
  value: string;
  children: ReactNode;
}

export function BasePathProvider({ value, children }: BasePathProviderProps) {
  return <BasePathContext.Provider value={value}>{children}</BasePathContext.Provider>;
}

export function useBasePath(): string {
  return useContext(BasePathContext);
}
