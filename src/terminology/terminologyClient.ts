import { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';

/**
 * Build a second MedplumClient bound to the terminology server.
 *
 * Returns null when no terminology URL is configured so callers can branch
 * into the 'not-configured' health state without constructing a broken client.
 *
 * Mirrors the baseUrl/fhirUrlPath split used by createFhirClient so relative
 * paths passed to client.get('metadata') / client.get('CodeSystem/$lookup')
 * resolve against the FHIR root of the terminology server.
 */
export function createTerminologyClient(settings: AppSettings): MedplumClient | null {
  const url = settings.terminology?.serverUrl;
  if (!url || typeof url !== 'string' || url.trim() === '') return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    // Invalid URL in settings.yaml — treat as unconfigured rather than crashing
    // the TerminologyProvider's useMemo or useTerminologyHealth's effect, which
    // would blank the entire app render.
    return null;
  }
  // MedplumClient only accepts http/https. A URL like "localhost:8080" parses
  // successfully (protocol = "localhost:") but would cause MedplumClient to
  // throw "Base URL must start with http or https". Guard here too so a user
  // forgetting the scheme sees the "not-configured" health state, not a crash.
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

  // In dev, route through the Vite proxy to avoid CORS / redirect issues.
  // The proxy rewrites /ontoserver/* → the real Ontoserver /fhir/* path.
  const pageOrigin =
    typeof window !== 'undefined' ? window.location.origin : `${u.protocol}//${u.host}`;
  const isSameOrigin = `${u.protocol}//${u.host}` === pageOrigin;

  return new MedplumClient({
    baseUrl: isSameOrigin ? pageOrigin : pageOrigin,
    fhirUrlPath: isSameOrigin
      ? u.pathname.replace(/^\//, '').replace(/\/?$/, '/')
      : 'ontoserver/',
  });
}
