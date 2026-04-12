import { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';

export function createFhirClient(settings: AppSettings): MedplumClient {
  const url = new URL(settings.fhir.serverUrl);
  // Use the page's own origin as baseUrl so requests go through the Vite
  // dev proxy (which forwards /fhir → the real FHIR server), avoiding CORS.
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : `${url.protocol}//${url.host}`;
  const fhirUrlPath = url.pathname.replace(/^\//, '').replace(/\/?$/, '/');

  const options: Record<string, unknown> = {
    baseUrl,
    fhirUrlPath,
  };

  if (settings.fhir.auth.mode === 'bearer' && settings.fhir.auth.token) {
    options.accessToken = settings.fhir.auth.token;
  } else if (settings.fhir.auth.mode === 'basic' && settings.fhir.auth.username) {
    const credentials = btoa(`${settings.fhir.auth.username}:${settings.fhir.auth.password ?? ''}`);
    options.defaultHeaders = { Authorization: `Basic ${credentials}` };
  }

  return new MedplumClient(options);
}
