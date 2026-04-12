import { useEffect, useState } from 'react';
import type { Resource } from '@medplum/fhirtypes';
import { useTerminology } from './useTerminology';

/**
 * Returns a copy of `resource` with all Coding.display fields populated
 * from the terminology server (or cache). The original resource is
 * returned synchronously on first render and whenever the input
 * reference changes; the component re-renders once lookups settle.
 * Failures leave display unset; Medplum's formatCoding then falls back
 * to the raw code.
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
 *
 * Stale-flash guard (WR-03): when the `resource` prop identity changes,
 * the previously-resolved resource is synchronously replaced with the
 * new raw input during render — otherwise the one-frame gap between
 * the old `resolved` value and the next effect tick would flash the
 * previous page's content during navigation. We implement this with
 * the React "derived-state-from-props" idiom (useState + setState in
 * render) so the reset happens in the same commit as the prop change.
 */
export function useResolvedResource<T extends Resource>(
  resource: T | undefined,
): T | undefined {
  const resolver = useTerminology();
  const [resolved, setResolved] = useState<T | undefined>(resource);
  const [lastInput, setLastInput] = useState<T | undefined>(resource);

  // Synchronous reset when the input reference changes. This runs during
  // render, but because React short-circuits same-state setState, it only
  // triggers an extra render when `resource` actually changed (which is
  // exactly the case we need to reset for).
  if (resource !== lastInput) {
    setLastInput(resource);
    setResolved(resource);
  }

  useEffect(() => {
    if (!resource) {
      return;
    }
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

  // During the render where `resource` just changed, `resolved` is still
  // the stale value (setState doesn't update the local var). Return the
  // new input directly to avoid a one-frame stale flash.
  return resource !== lastInput ? resource : resolved;
}
