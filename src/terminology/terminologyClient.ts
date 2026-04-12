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

  const u = new URL(url);
  return new MedplumClient({
    baseUrl: `${u.protocol}//${u.host}`,
    fhirUrlPath: u.pathname.replace(/^\//, '').replace(/\/?$/, '/'),
  });
}
