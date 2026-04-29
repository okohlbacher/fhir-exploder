import { useEffect, useRef, useState } from 'react';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle } from '@medplum/fhirtypes';
import {
  MII_MODULES,
  fhirResourceTypesOf,
  getPatientSearchParamForType,
  getExtraQueryForType,
} from '../utils/mii-modules';
import { useEmptyExtensionsCoordinator } from './useEmptyExtensionsCoordinator';

/**
 * Phase 42 (MII-EXT-15): pre-probe extension-module counts.
 *
 * Fans out one `_summary=count` GET per (extension module, FHIR resource
 * type) pair on patient mount, sums per-type totals into a per-module count
 * (D-02), and feeds Phase 34's `useEmptyExtensionsCoordinator` so the
 * "Hide N empty modules" toggle is accurate on mount instead of accumulating
 * after each extension tab is clicked (D-05).
 *
 * Cleanup primitive: cancelled-flag (Claude's discretion per CONTEXT.md +
 * RESEARCH.md §Open Q2). Mirrors `PatientRelatedResources.tsx:37,57`.
 * The abort-controller primitive is intentionally NOT used — Medplum v5.1.7 `client.get()`
 * doesn't accept a `signal` option; switching to raw `fetch()` would lose
 * Medplum's auth/middleware (RESEARCH.md alternatives table).
 *
 * Cache scope: hook-internal `useRef<Map<string, number>>` keyed by
 * `${patientId}:${moduleId}`. Cache lifetime = hook mount; the provider
 * re-keys on `patientId` change (`MiiModuleTabs.tsx:109`
 * `<EmptyExtensionsProvider key={patientId}>`), forcing the hook to remount
 * and the cache to die. No cross-patient leak.
 *
 * Per-type failure → 0 (numeric, NOT empty array, NOT undefined): a single
 * failing type does not blank the whole module's count; the surviving types'
 * totals still sum correctly.
 *
 * @returns Record<moduleKey, number | undefined>
 *   - `undefined` while the per-module fan-out is in flight (D-03)
 *   - `number` once the module's fan-out resolves (sum of per-type totals)
 *   - Keys: ONLY extension modules (no base 7) — D-04
 */
export function useMiiExtensionCounts(
  patientId: string,
): Record<string, number | undefined> {
  const client = useMedplum();
  const { reportEmptiness } = useEmptyExtensionsCoordinator();
  const [counts, setCounts] = useState<Record<string, number | undefined>>(
    () => {
      // Seed initial state synchronously so consumers reading on first render
      // see `undefined` (= "fetching") for every extension module immediately,
      // not an empty record. Matches D-03 contract at first render.
      const initial: Record<string, number | undefined> = {};
      for (const mod of MII_MODULES.filter((m) => m.category === 'extension')) {
        initial[mod.key] = undefined;
      }
      return initial;
    },
  );
  const cacheRef = useRef<Map<string, number>>(new Map());

  // Stable ref for reportEmptiness so the effect depends on patientId only.
  // The no-op fallback returned by `useEmptyExtensionsCoordinator()` outside
  // a Provider creates a fresh function each render — including it in the
  // effect deps would re-fire the fan-out on every render and produce an
  // infinite loop after the first setCounts (cache-hit branch sets the same
  // value but produces a new record reference, re-triggering the effect).
  const reportEmptinessRef = useRef(reportEmptiness);
  reportEmptinessRef.current = reportEmptiness;

  useEffect(() => {
    let cancelled = false;
    const extensionModules = MII_MODULES.filter(
      (m) => m.category === 'extension',
    );

    for (const mod of extensionModules) {
      const cacheKey = `${patientId}:${mod.key}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached !== undefined) {
        // Cache hit — short-circuit. Still publish to the coordinator so the
        // "Hide N empty modules" toggle stays consistent across re-renders.
        // Guard the setState: only update if the value actually changed,
        // otherwise we'd produce a new record reference per render.
        setCounts((prev) =>
          prev[mod.key] === cached ? prev : { ...prev, [mod.key]: cached },
        );
        reportEmptinessRef.current(mod.key, cached === 0);
        continue;
      }

      const types = fhirResourceTypesOf(mod);

      const fetchOneCount = (type: string): Promise<number> => {
        const param = getPatientSearchParamForType(mod, type);
        const extra = getExtraQueryForType(mod, type);
        // Pitfall #2: `_count=0` is mandatory; without it Blaze may return
        // entry[]. Pattern verbatim from PatientRelatedResources.tsx:43.
        let url = `${type}?${param}=Patient/${patientId}&_summary=count&_count=0`;
        if (extra) url += `&${extra}`;
        return client
          .get(client.fhirUrl(url).toString())
          .then((raw) => {
            const bundle: Bundle =
              typeof raw === 'string' ? JSON.parse(raw) : raw;
            return bundle.total ?? 0;
          })
          .catch(() => 0); // Pitfall #3: per-type failure → 0; sum stays defined.
      };

      Promise.all(types.map(fetchOneCount)).then((perType) => {
        if (cancelled) return; // T-42-02: prevent stale setState after unmount.
        const total = perType.reduce((a, b) => a + b, 0); // D-02 multi-type sum
        cacheRef.current.set(cacheKey, total);
        setCounts((prev) =>
          prev[mod.key] === total ? prev : { ...prev, [mod.key]: total },
        );
        reportEmptinessRef.current(mod.key, total === 0); // D-05 idempotent in coordinator.
      });
    }

    return () => {
      cancelled = true;
    };
    // reportEmptiness is intentionally read via ref (above) — see comment
    // on reportEmptinessRef. Including it in deps causes an infinite loop
    // when the coordinator hook returns a fresh no-op fallback per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, patientId]);

  return counts;
}
