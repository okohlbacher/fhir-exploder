/**
 * useReferenceResolver.ts — session-level FHIR reference resolution hook.
 *
 * Phase 47 / READ-01 (D-01..D-05). Mirrors Phase 36 getExtensionProfileForUrl
 * cache + inFlight pattern (src/quality/profiles/index.ts:67-105) but exposes
 * a React hook so consumers observe pending → resolved | failed transitions
 * without managing their own state.
 *
 * Cache shape (D-02): Map<`${type}/${id}`, Resource | null>
 *   - undefined = not tried yet
 *   - Resource  = resolved
 *   - null      = tried, failed (404 / network / validation) — D-02 negative cache, no retry
 *
 * Failures are silenced (D-02): no toast, no console.error, no console.warn.
 * StrictMode-safe via module-scoped inFlight Map (Pitfall 1) + per-effect
 * `cancelled` flag (Pitfall 8).
 *
 * Public API (D-03): useReferenceResolver hook only. The Map is NOT exported.
 * __resetReferenceCache is exported as a TEST hook (called from afterEach).
 */
import { useEffect, useMemo, useReducer } from 'react';
import { useMedplum } from '@medplum/react-hooks';
import type { Resource, ResourceType } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';
import { normalizeReference, isValidFhirReference } from '../utils/referenceUrl';

const referenceCache = new Map<string, Resource | null>();
const referenceInFlight = new Map<string, Promise<Resource | null>>();

export interface ReferenceResolution {
  resource: Resource | null;
  status: 'pending' | 'resolved' | 'failed';
}

/**
 * Test-only export. Clears both cache + inFlight Maps. Production callers
 * MUST NOT use this — server-switch flush is deferred (Phase 47 RESEARCH Q3).
 */
export function __resetReferenceCache(): void {
  referenceCache.clear();
  referenceInFlight.clear();
}

function fetchReference(
  client: MedplumClient,
  key: string,
  type: ResourceType,
  id: string,
): Promise<Resource | null> {
  const existing = referenceInFlight.get(key);
  if (existing) return existing;

  const promise = client
    .readResource(type, id)
    .then((r) => {
      referenceCache.set(key, r as Resource);
      referenceInFlight.delete(key);
      return r as Resource;
    })
    .catch(() => {
      // D-02: silent on 404 / network / any error. Cache null = tried, failed.
      referenceCache.set(key, null);
      referenceInFlight.delete(key);
      return null;
    });

  referenceInFlight.set(key, promise);
  return promise;
}

export function useReferenceResolver(
  rawReference: string | undefined,
): ReferenceResolution {
  const client = useMedplum();
  const normalized = useMemo(
    () => (rawReference ? normalizeReference(rawReference) : null),
    [rawReference],
  );
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!normalized) return; // contained / urn / malformed → status='failed' synchronously below
    if (referenceCache.has(normalized)) return; // cache hit (incl. null negative) — nothing to do

    const slash = normalized.indexOf('/');
    if (slash < 0) return; // defensive — normalizeReference already guards this
    const type = normalized.slice(0, slash);
    const id = normalized.slice(slash + 1);

    // T-47-01 defense-in-depth: validate against FHIR patterns before issuing fetch.
    // Bad input → cache null synchronously, NO network call.
    if (!isValidFhirReference(type, id)) {
      referenceCache.set(normalized, null);
      forceUpdate();
      return;
    }

    let cancelled = false;
    fetchReference(client, normalized, type as ResourceType, id).then(() => {
      if (!cancelled) forceUpdate();
    });
    return () => {
      cancelled = true;
    };
  }, [client, normalized]);

  if (!normalized) return { resource: null, status: 'failed' };
  const cached = referenceCache.get(normalized);
  if (cached === undefined) return { resource: null, status: 'pending' };
  if (cached === null) return { resource: null, status: 'failed' };
  return { resource: cached, status: 'resolved' };
}
