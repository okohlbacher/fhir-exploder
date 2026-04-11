import { MedplumClient } from '@medplum/core';
import type { AppSettings } from '../config/types';

export function createFhirClient(settings: AppSettings): MedplumClient {
  const url = new URL(settings.fhir.serverUrl);
  const baseUrl = `${url.protocol}//${url.host}`;
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
