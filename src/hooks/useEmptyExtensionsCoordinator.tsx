/**
 * EmptyExtensionsCoordinator — Phase 34 MII-EXT-14 (Plan 34-05).
 *
 * A light React context that:
 *   1. Holds the per-patient "hide empty extensions" boolean backed by
 *      localStorage.patients.hideEmptyExtensions.v1 (Record<patientId, boolean>).
 *   2. Aggregates per-extension-module emptiness signals published by
 *      MiiModuleTab children via `useEmptyExtensionsPublisher`.
 *
 * Why a publish/subscribe context instead of hoisting the fan-out fetch?
 * (See 34-RESEARCH.md §Plan 34-05 Option B.) Hoisting the 14 fetches into
 * MiiModuleTabs would break Phase 33 D-11's selective keepMounted invariant
 * (14 extension tabs would fire on /patients/:id mount). Publish/subscribe
 * preserves the lazy-mount property: the coordinator only learns about
 * extensions the user actually visited (= mounted). `emptyCount` therefore
 * reflects "visited-and-empty" rather than "all-empty"; this matches user
 * intuition — you can't hide tabs you haven't explored.
 *
 * Persistence: localStorage.patients.hideEmptyExtensions.v1
 *   Schema: Record<patientId, boolean>
 *   Default (missing / malformed): {} → hideEmpty = false for every patient
 *   No migration; Phase 34 is the first write (CONTEXT D-19).
 *
 * Threat mitigations:
 *   - T-34-13 (Tampering): defensive parse of the localStorage payload —
 *     non-object values fall back to {} (fail-safe to VISIBLE).
 *   - T-34-14 (DoS via quota): boolean-per-patient is ~14 bytes/entry; well
 *     under the 5MB localStorage quota even at 10^4 patients.
 *   - T-34-15 (Stale emptiness across patient navigation): emptyMap resets
 *     on patientId change via the useEffect dependency.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocalStorage } from '@mantine/hooks';

const STORAGE_KEY = 'patients.hideEmptyExtensions.v1';

interface CoordinatorValue {
  hideEmpty: boolean;
  setHideEmpty: (next: boolean) => void;
  /** Publish emptiness state for a module (called by MiiModuleTab on fetch-completion). */
  reportEmptiness: (moduleKey: string, isEmpty: boolean) => void;
  emptyCount: number;
  emptyModuleKeys: string[];
  patientId: string;
}

const EmptyExtensionsContext = createContext<CoordinatorValue | null>(null);

interface ProviderProps {
  patientId: string;
  children: ReactNode;
}

export function EmptyExtensionsProvider({ patientId, children }: ProviderProps) {
  // Defensive-parse Record<patientId, boolean> from localStorage.
  const [rawMap, setRawMap] = useLocalStorage<Record<string, boolean>>({
    key: STORAGE_KEY,
    defaultValue: {},
    getInitialValueInEffect: true, // Hydrate post-mount per useCohorts.ts idiom.
  });

  // Defensive guard: if the stored JSON parses to a non-object (string,
  // number, null, array), fall back to {}. Mantine's useLocalStorage covers
  // most cases but a non-JSON string value can round-trip as a string.
  const hideMap: Record<string, boolean> =
    rawMap && typeof rawMap === 'object' && !Array.isArray(rawMap) ? rawMap : {};

  const hideEmpty = hideMap[patientId] === true;

  const setHideEmpty = useCallback(
    (next: boolean) => {
      setRawMap((prev) => {
        const prevMap =
          prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {};
        return { ...prevMap, [patientId]: next };
      });
    },
    [patientId, setRawMap],
  );

  // Emptiness state — per-patient, per-moduleKey.
  // Reset the map when patientId CHANGES (skip the first render: an
  // unconditional reset on mount races with publishers' useEffects, which
  // also fire post-mount and would write into the about-to-be-cleared map).
  const [emptyMap, setEmptyMap] = useState<Record<string, boolean>>({});
  const prevPatientId = useRef(patientId);
  useEffect(() => {
    if (prevPatientId.current !== patientId) {
      prevPatientId.current = patientId;
      setEmptyMap({});
    }
  }, [patientId]);

  const reportEmptiness = useCallback((moduleKey: string, isEmpty: boolean) => {
    setEmptyMap((prev) => {
      if (prev[moduleKey] === isEmpty) return prev; // no-op, avoid render loop
      return { ...prev, [moduleKey]: isEmpty };
    });
  }, []);

  const emptyModuleKeys = useMemo(
    () =>
      Object.entries(emptyMap)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [emptyMap],
  );

  const value = useMemo<CoordinatorValue>(
    () => ({
      hideEmpty,
      setHideEmpty,
      reportEmptiness,
      emptyCount: emptyModuleKeys.length,
      emptyModuleKeys,
      patientId,
    }),
    [hideEmpty, setHideEmpty, reportEmptiness, emptyModuleKeys, patientId],
  );

  return (
    <EmptyExtensionsContext.Provider value={value}>
      {children}
    </EmptyExtensionsContext.Provider>
  );
}

/**
 * Read the coordinator state. Returns a no-op shape if no Provider is
 * mounted so MiiModuleTab can render outside the patient detail surface
 * (e.g. inside Storybook fixtures or unit tests) without crashing.
 */
export function useEmptyExtensionsCoordinator(): CoordinatorValue {
  const ctx = useContext(EmptyExtensionsContext);
  if (ctx) return ctx;
  return {
    hideEmpty: false,
    setHideEmpty: () => {},
    reportEmptiness: () => {},
    emptyCount: 0,
    emptyModuleKeys: [],
    patientId: '',
  };
}

/** Publish emptiness for a given module (call from inside MiiModuleTab). */
export function useEmptyExtensionsPublisher({
  moduleKey,
  isEmpty,
}: {
  moduleKey: string;
  isEmpty: boolean;
}): void {
  const { reportEmptiness } = useEmptyExtensionsCoordinator();
  useEffect(() => {
    reportEmptiness(moduleKey, isEmpty);
  }, [moduleKey, isEmpty, reportEmptiness]);
}
