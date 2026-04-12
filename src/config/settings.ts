import yaml from 'js-yaml';
import type { AppSettings } from './types';

export const DEFAULTS: AppSettings = {
  fhir: {
    serverUrl: 'http://localhost:8080/fhir',
    auth: {
      mode: 'open',
    },
  },
  terminology: {
    serverUrl: 'https://r4.ontoserver.csiro.au/fhir',
  },
  validation: {
    // No default validatorUrl — structural-only mode unless user opts in.
    batchSize: 25,
  },
};

export interface LoadSettingsResult {
  settings: AppSettings;
  usingDefaults: boolean;
}

function deepMerge(defaults: AppSettings, partial: Record<string, unknown>): AppSettings {
  const result = { ...defaults };

  if (partial.fhir && typeof partial.fhir === 'object') {
    const fhir = partial.fhir as Record<string, unknown>;
    result.fhir = {
      ...defaults.fhir,
      serverUrl: typeof fhir.serverUrl === 'string' ? fhir.serverUrl : defaults.fhir.serverUrl,
      auth: {
        ...defaults.fhir.auth,
        ...(fhir.auth && typeof fhir.auth === 'object' ? fhir.auth as Record<string, unknown> : {}),
      } as AppSettings['fhir']['auth'],
    };
  }

  if (partial.terminology && typeof partial.terminology === 'object') {
    const terminology = partial.terminology as Record<string, unknown>;
    result.terminology = {
      ...defaults.terminology,
      serverUrl:
        typeof terminology.serverUrl === 'string'
          ? terminology.serverUrl
          : defaults.terminology?.serverUrl,
    };
  }

  if (partial.validation && typeof partial.validation === 'object') {
    const validation = partial.validation as Record<string, unknown>;
    result.validation = {
      ...defaults.validation,
      validatorUrl:
        typeof validation.validatorUrl === 'string'
          ? validation.validatorUrl
          : defaults.validation?.validatorUrl,
      batchSize:
        typeof validation.batchSize === 'number' && Number.isFinite(validation.batchSize)
          ? validation.batchSize
          : (defaults.validation?.batchSize ?? 25),
    };
  }

  return result;
}

export async function loadSettings(): Promise<LoadSettingsResult> {
  try {
    const response = await fetch('/settings.yaml');

    if (!response.ok) {
      return { settings: DEFAULTS, usingDefaults: true };
    }

    const text = await response.text();
    const parsed = yaml.load(text);

    if (!parsed || typeof parsed !== 'object') {
      return { settings: DEFAULTS, usingDefaults: true };
    }

    const settings = deepMerge(DEFAULTS, parsed as Record<string, unknown>);
    return { settings, usingDefaults: false };
  } catch {
    return { settings: DEFAULTS, usingDefaults: true };
  }
}
