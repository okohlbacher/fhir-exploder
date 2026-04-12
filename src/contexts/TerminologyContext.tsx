import { createContext, useMemo, type ReactNode } from 'react';
import type { AppSettings } from '../config/types';
import { createTerminologyClient } from '../terminology/terminologyClient';
import { TerminologyResolver } from '../terminology/TerminologyResolver';

/**
 * Shared instance of a {@link TerminologyResolver} for the app. Exposed
 * as a module-level export so `useTerminology` in a sibling file can
 * subscribe without a provider relaying the context identity.
 */
export const TerminologyContext = createContext<TerminologyResolver | null>(null);

export interface TerminologyProviderProps {
  settings: AppSettings | null;
  children: ReactNode;
}

/**
 * Wraps the app (or any subtree) with a {@link TerminologyResolver}
 * constructed from the current AppSettings.
 *
 * - When `settings` is null OR `settings.terminology.serverUrl` is missing,
 *   the underlying MedplumClient is null and all `resolveCoding` calls
 *   short-circuit. This lets the app render even before settings load.
 * - The memo key is a JSON snapshot of `settings.terminology`. Any change
 *   anywhere in that sub-object recreates the resolver, so swapping the
 *   terminology URL at runtime (Plan 05) correctly drops in-memory state
 *   along with it (Pitfall 3 / W-1 in RESEARCH.md).
 * - The factory body reads ONLY the parsed terminology snapshot, not the
 *   full `settings` prop, so the memo deps array is minimal and
 *   lint-clean — no `eslint-disable react-hooks/exhaustive-deps` needed.
 *   The synthetic AppSettings we hand to `createTerminologyClient`
 *   carries only the `terminology` block because that's all the factory
 *   reads.
 */
export function TerminologyProvider({ settings, children }: TerminologyProviderProps) {
  const terminologyKey = JSON.stringify(settings?.terminology ?? null);
  const resolver = useMemo(() => {
    const terminology = JSON.parse(terminologyKey) as AppSettings['terminology'] | null;
    const serverUrl = terminology?.serverUrl ?? '__unconfigured__';
    // createTerminologyClient only reads settings.terminology — pass a
    // minimal synthetic AppSettings so we don't need the full `settings`
    // identity in deps.
    const syntheticSettings = {
      fhir: { serverUrl: '', auth: { mode: 'open' as const } },
      terminology: terminology ?? undefined,
    } satisfies AppSettings;
    const client = terminology ? createTerminologyClient(syntheticSettings) : null;
    return new TerminologyResolver(client, {
      displayLanguage: 'de',
      lookupTimeoutMs: 5000,
      negativeTtlMs: 5 * 60_000,
      persistToLocalStorage: true,
      serverUrl,
    });
  }, [terminologyKey]);
  return (
    <TerminologyContext.Provider value={resolver}>
      {children}
    </TerminologyContext.Provider>
  );
}
