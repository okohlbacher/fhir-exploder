import { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';

export function createFhirClient(settings: AppSettings): MedplumClient {
  const url = new URL(settings.fhir.serverUrl);
  // Use the configured server's origin (protocol+host+port) directly so the
  // MedplumClient connects to the URL the user actually configured. This
  // requires the FHIR server to send permissive CORS headers for the dev
  // origin (Blaze enables CORS by default; other servers may need
  // Access-Control-Allow-Origin configured — documented as a known limitation).
  const baseUrl = url.origin;
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
