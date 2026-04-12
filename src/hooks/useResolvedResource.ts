import { useEffect, useState } from 'react';
import type { Resource } from '@medplum/fhirtypes';
import { useTerminology } from './useTerminology';

/**
 * Returns a copy of `resource` with all Coding.display fields populated
 * from the terminology server (or cache). The original resource is
 * returned synchronously on first render; the component re-renders once
 * lookups settle. Failures leave display unset; Medplum's formatCoding
 * then falls back to the raw code.
 *
 * Progressive enhancement per D-12 / UI-SPEC C-3: no spinner, no
 * skeleton, no layout shift while resolution is in flight.
 *
 * Dedup guarantees: the effect runs only when the `resource` reference
 * changes. Combined with the resolver's inflight dedup + positive cache,
 * identical renders never re-issue a $lookup.
 *
 * Cancellation: if the component unmounts (or `resource` changes) before
 * resolution settles, the stale setState is skipped so React does not
 * warn about state updates on unmounted components.
 */
export function useResolvedResource<T extends Resource>(
  resource: T | undefined,
): T | undefined {
  const resolver = useTerminology();
  const [resolved, setResolved] = useState<T | undefined>(resource);

  useEffect(() => {
    if (!resource) {
      setResolved(undefined);
      return;
    }
    // Render raw immediately — progressive enhancement baseline.
    setResolved(resource);
    let cancelled = false;
    resolver
      .resolveResource(resource)
      .then((next) => {
        if (!cancelled) setResolved(next as T);
      })
      .catch(() => {
        // Silent per D-07: resolver's public API is non-throwing, but belt-and-braces
        // here keeps the render path untouched even if a future resolver change leaks.
      });
    return () => {
      cancelled = true;
    };
  }, [resource, resolver]);

  return resolved;
}
