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
  plausibility: {
    maxAge: 150,
    maxEncounterDays: 365,
  },
  referenceRanges: {},
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
    // Trim incidental whitespace on the validator URL so YAML parsing
    // quirks (e.g., trailing newline, paste indentation) don't produce
    // a "almost-correct" URL that silently fails at fetch time. Empty
    // strings after trim collapse to the default.
    const rawValidatorUrl =
      typeof validation.validatorUrl === 'string'
        ? validation.validatorUrl.trim()
        : undefined;
    const validatorUrl =
      rawValidatorUrl && rawValidatorUrl.length > 0
        ? rawValidatorUrl
        : defaults.validation?.validatorUrl;
    // D-07 + D-18: external validator cascade block. Field-level narrowing
    // mirrors validatorUrl/batchSize pattern — invalid url drops the entire
    // block; invalid timeoutMs falls back to 15000.
    let externalValidator:
      | { url: string; enabled: boolean; timeoutMs: number; label?: string }
      | undefined = undefined;
    if (validation.externalValidator && typeof validation.externalValidator === 'object') {
      const ext = validation.externalValidator as Record<string, unknown>;
      const extUrl = typeof ext.url === 'string' ? ext.url.trim() : '';
      const extEnabled = typeof ext.enabled === 'boolean' ? ext.enabled : false;
      const extTimeoutMs =
        typeof ext.timeoutMs === 'number' && Number.isFinite(ext.timeoutMs) && ext.timeoutMs > 0
          ? ext.timeoutMs
          : 15000;
      const extLabel =
        typeof ext.label === 'string' && ext.label.trim().length > 0
          ? ext.label.trim()
          : undefined;
      if (extUrl.length > 0) {
        externalValidator = { url: extUrl, enabled: extEnabled, timeoutMs: extTimeoutMs };
        if (extLabel) externalValidator.label = extLabel;
      }
    }
    result.validation = {
      ...defaults.validation,
      validatorUrl,
      batchSize:
        typeof validation.batchSize === 'number' && Number.isFinite(validation.batchSize)
          ? validation.batchSize
          : (defaults.validation?.batchSize ?? 25),
      ...(externalValidator ? { externalValidator } : {}),
    };
  }

  if (partial.plausibility && typeof partial.plausibility === 'object') {
    const plaus = partial.plausibility as Record<string, unknown>;
    result.plausibility = {
      maxAge: typeof plaus.maxAge === 'number' && Number.isFinite(plaus.maxAge) && plaus.maxAge > 0
        ? plaus.maxAge : (defaults.plausibility?.maxAge ?? 150),
      maxEncounterDays: typeof plaus.maxEncounterDays === 'number' && Number.isFinite(plaus.maxEncounterDays) && plaus.maxEncounterDays > 0
        ? plaus.maxEncounterDays : (defaults.plausibility?.maxEncounterDays ?? 365),
    };
  }

  if (partial.referenceRanges && typeof partial.referenceRanges === 'object') {
    const ranges = partial.referenceRanges as Record<string, unknown>;
    const validated: Record<string, { low?: number; high?: number; unit?: string }> = {};
    for (const [code, val] of Object.entries(ranges)) {
      if (val && typeof val === 'object') {
        const v = val as Record<string, unknown>;
        const entry: { low?: number; high?: number; unit?: string } = {};
        if (typeof v.low === 'number' && Number.isFinite(v.low)) entry.low = v.low;
        if (typeof v.high === 'number' && Number.isFinite(v.high)) entry.high = v.high;
        if (typeof v.unit === 'string') entry.unit = v.unit;
        validated[code] = entry;
      }
    }
    result.referenceRanges = validated;
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
