import yaml from 'js-yaml';
import type { AppSettings, ValidatorAuthConfig } from './types';

// Mirror of SETTINGS_STORAGE_KEY in src/contexts/SettingsContext.tsx.
// Duplicated here to avoid a circular module dependency
// (SettingsContext imports loadSettings from this file).
const SETTINGS_STORAGE_KEY = 'fhirExplorer.settings.v1';

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
    //
    // Phase 43 VAL-06 / D-01 / D-02 / T-43-06: also narrow `auth` and
    // `semanticNearMisses`. CRITICAL: when `auth.type === 'bearer'`, the
    // narrowing produces ONLY `{ type: 'bearer' }`. Any `token`/`credentials`/
    // `password` fields the user may have placed in YAML are silently dropped
    // here — bearer secrets NEVER cross the YAML→runtime boundary.
    let externalValidator:
      | {
          url: string;
          enabled: boolean;
          timeoutMs: number;
          label?: string;
          auth?: ValidatorAuthConfig;
          semanticNearMisses?: boolean;
        }
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

      // Phase 43 D-01/D-02 — auth narrowing. Bearer credentials in YAML are
      // intentionally dropped; the only legitimate channel for a bearer token
      // is the localStorage key managed by ValidatorAuthSettingsModal.
      let auth: ValidatorAuthConfig | undefined;
      if (ext.auth && typeof ext.auth === 'object') {
        const a = ext.auth as Record<string, unknown>;
        if (a.type === 'basic') {
          const u = typeof a.username === 'string' ? a.username : undefined;
          const p = typeof a.password === 'string' ? a.password : undefined;
          if (u && p) auth = { type: 'basic', username: u, password: p };
          // incomplete basic (missing username or password) → auth stays undefined
        } else if (a.type === 'bearer') {
          // T-43-06 lock: bearer credentials in YAML are silently dropped.
          // We deliberately construct the object with NO `token`/`password`/
          // `credentials` fields, regardless of what `a` carries.
          auth = { type: 'bearer' };
        }
        // unknown auth.type → auth stays undefined
      }

      // Phase 43 D-11 — semanticNearMisses narrowing. Default-off; only
      // attach to runtime when YAML explicitly opts in to `true`.
      const semanticNearMisses =
        typeof ext.semanticNearMisses === 'boolean' ? ext.semanticNearMisses : false;

      if (extUrl.length > 0) {
        externalValidator = { url: extUrl, enabled: extEnabled, timeoutMs: extTimeoutMs };
        if (extLabel) externalValidator.label = extLabel;
        if (auth) externalValidator.auth = auth;
        if (semanticNearMisses) externalValidator.semanticNearMisses = true;
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
  // 1) Prefer user-edited settings persisted in localStorage. Survives
  //    page reload and overrides the YAML default. Wrapped in try/catch
  //    because localStorage can throw on quota / private-browsing and
  //    JSON.parse can throw on malformed data — a corrupt entry must
  //    fall through to the YAML default rather than crash the app.
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const settings = deepMerge(DEFAULTS, parsed as Record<string, unknown>);
          return { settings, usingDefaults: false };
        }
      }
    }
  } catch {
    // Corrupt or unreadable localStorage entry — fall through to YAML.
  }

  // 2) Fall back to public/settings.yaml shipped with the app.
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
    // 3) Final fallback: built-in DEFAULTS.
    return { settings: DEFAULTS, usingDefaults: true };
  }
}
