import { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';

export function createFhirClient(settings: AppSettings): MedplumClient {
  const url = new URL(settings.fhir.serverUrl);
  // Route requests through the page's own origin so the Vite dev proxy can
  // forward them. The proxy reads the `X-Fhir-Target` header (set below) to
  // pick the actual upstream server, which lets us switch FHIR servers at
  // runtime without changing vite.config.ts. Without the proxy, browser CORS
  // would block direct cross-origin requests for any FHIR server that does
  // not allow this dev origin.
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : `${url.protocol}//${url.host}`;
  const fhirUrlPath = url.pathname.replace(/^\//, '').replace(/\/?$/, '/');

  const headers: Record<string, string> = {
    // Tells the Vite dev proxy which upstream FHIR server to forward to.
    // In production builds (no proxy) this header is harmless — the request
    // already goes to the right host because there is no proxy in the path.
    'X-Fhir-Target': url.origin,
  };

  if (settings.fhir.auth.mode === 'basic' && settings.fhir.auth.username) {
    const credentials = btoa(`${settings.fhir.auth.username}:${settings.fhir.auth.password ?? ''}`);
    headers.Authorization = `Basic ${credentials}`;
  }

  const options: Record<string, unknown> = {
    baseUrl,
    fhirUrlPath,
    defaultHeaders: headers,
  };

  if (settings.fhir.auth.mode === 'bearer' && settings.fhir.auth.token) {
    options.accessToken = settings.fhir.auth.token;
  }

  return new MedplumClient(options);
}
