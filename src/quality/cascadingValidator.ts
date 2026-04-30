/**
 * Three-tier cascading FHIR validator for Phase 31 UX-01.
 *
 *   Tier 1: external  — settings.validation.externalValidator.url
 *                       GATED on isPhiAcknowledged(serverUrl, externalUrl)
 *                       AbortController + setTimeout(timeoutMs)
 *                       On timeout: notify('timeout', ...) + demote 'server'
 *                       On TypeError (D-19 CORS heuristic): notify('cors', ...) + demote
 *                       On HTTP 4xx/5xx: notify('demote', ...) + demote
 *   Tier 2: server    — settings.validation.validatorUrl via createRemoteBackend().
 *                       Threads `options.abort.signal` into the server fetch (D-20, VAL-05).
 *                       On exception-coded issues: notify('demote', server→local) + demote.
 *   Tier 3: local     — validateStructural. Always succeeds, offline.
 *
 * Probe cache key: `${serverUrl}::${externalValidatorUrl}::${resourceType}` (D-17 — 3-part).
 * Cache is caller-owned (passed via options.probe). Reset semantics (D-17):
 *   - Full wipe on settings change (caller handles via clearProbeCache).
 *   - Per-type delete on "Validate sample" click (caller handles via resetProbeForType).
 *   - Hook unmount clears the ref (per-session design).
 *
 * PHI gate invariant (D-09 / PITFALLS #3): isPhiAcknowledged() is called BEFORE
 * `new AbortController()`. A failing gate demotes silently (no toast), never throws.
 *
 * Wrapper URL shape deferred to v1.6+ (D-13). HAPI-compatible shape only:
 *   POST {url}/{Type}/$validate?profile={canonical}
 *   Content-Type: application/fhir+json
 */
import type {
  Resource,
  StructureDefinition,
  OperationOutcome,
  OperationOutcomeIssue,
} from '@medplum/fhirtypes';
import type { AppSettings, ValidatorAuthConfig } from '../config/types';
import type { NormalizedIssue } from './types';
import { isPhiAcknowledged } from './phiGate';
import { normalizeOperationOutcomeIssue } from './normalizers';
import { validateStructural } from './structuralValidator';
import { createRemoteBackend } from './remoteValidator';
import { getProfileForType } from './profiles';

export type ActiveStrategy = 'external' | 'server' | 'local' | 'probe-failed';
export type ProbeKey = string;

/**
 * Phase 43 VAL-06 (D-02) — bearer-token storage key.
 *
 * SECURITY: NEVER serialize this key's value to disk. The token lives in
 * localStorage only, written by ValidatorAuthSettingsModal and read fresh
 * per `tryExternal` call. See 43-CONTEXT.md D-01/D-02.
 */
export const VALIDATOR_BEARER_TOKEN_KEY = 'validator.bearerToken.v1';

/** Read the bearer token from localStorage. Returns null on absence/error. */
export function readBearerToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(VALIDATOR_BEARER_TOKEN_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export interface CascadeOptions {
  serverUrl: string;
  resourceType: string;
  /**
   * External validator block — NOTE: never store credentials on this object.
   * `auth` carries TYPE + (basic) username/password only; bearer tokens are
   * read fresh per call from localStorage inside `tryExternal` so the token
   * never crosses the `notify()` boundary (T-43-02).
   */
  externalValidator?: {
    url: string;
    enabled: boolean;
    timeoutMs: number;
    label?: string;
    auth?: ValidatorAuthConfig;
  };
  probe: Map<ProbeKey, ActiveStrategy>;
  abort: AbortController;
  profile?: StructureDefinition | null;
  settings: AppSettings | null;
  /**
   * Phase 43 D-21 — notify payloads carry telemetry only:
   *   `from`, `to`         — tier transition (existing)
   *   `timeoutMs`          — set on `'timeout'` kind only (existing)
   *   `authType`, `status` — set on `'auth-missing'` / `'auth-failed'` kinds
   * Credentials (username, password, base64, raw token) MUST NEVER appear in
   * the payload; the cascade builds the Authorization header LOCALLY inside
   * `tryExternal` and discards it before notify is called.
   */
  notify?: (
    kind: 'timeout' | 'cors' | 'demote' | 'auth-missing' | 'auth-failed',
    payload: {
      from: ActiveStrategy;
      to: ActiveStrategy;
      timeoutMs?: number;
      authType?: 'basic' | 'bearer';
      status?: number;
    },
  ) => void;
}

/** 3-part probe key per D-17. Matches Phase 24's `::` separator convention. */
export function probeKey(
  serverUrl: string,
  externalValidatorUrl: string,
  resourceType: string,
): ProbeKey {
  return `${serverUrl}::${externalValidatorUrl}::${resourceType}`;
}

/** D-17: full-wipe for settings-change reset. */
export function clearProbeCache(probe: Map<ProbeKey, ActiveStrategy>): void {
  probe.clear();
}

/** D-17: per-type delete for "Validate sample" click reset. */
export function resetProbeForType(
  probe: Map<ProbeKey, ActiveStrategy>,
  serverUrl: string,
  externalValidatorUrl: string,
  resourceType: string,
): void {
  probe.delete(probeKey(serverUrl, externalValidatorUrl, resourceType));
}

/**
 * D-18: URL-pattern heuristic, user label wins. Case-insensitive matching.
 * Returns null when nothing matches (status line drops the parenthesized suffix).
 *
 * KNOWN LIMITATION (W-3 from plan-checker revision, deferred to v1.6+):
 * Any host ending in `.fhir.org` is labelled 'HAPI' — including
 * `validator.fhir.org`, which is actually Wrapper-shaped (not HAPI).
 * The heuristic is intentionally left simple because Wrapper URL-shape
 * support (`POST {url}/validate` with resource body, no `/{Type}/$validate`
 * path) is explicitly deferred per CONTEXT.md `<deferred>` list. When
 * Wrapper shape lands in v1.6+, update BOTH this heuristic AND the
 * `tryExternal` URL construction in `validateWithCascade` together.
 *
 * Test file `cascadingValidator.test.ts` Test 13 locks the current
 * mis-identification behavior so the update site is obvious.
 */
export function detectValidatorVariant(url: string, label?: string): string | null {
  if (label && label.trim().length > 0) return label.trim();
  if (!url) return null;
  let host = '';
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    host = '';
  }
  const lower = url.toLowerCase();
  if (lower.includes('/hapi-fhir-jpaserver/') || host.endsWith('.fhir.org')) return 'HAPI';
  if (lower.includes('firely')) return 'Firely';
  if (
    lower.includes('ig-publisher') ||
    lower.includes('/validator-wrapper/') ||
    lower.includes('/matchbox')
  )
    return 'IG-Publisher';
  return null;
}

async function tryExternal(
  resource: Resource,
  opts: CascadeOptions,
): Promise<OperationOutcomeIssue[] | null> {
  const ext = opts.externalValidator;
  if (!ext || !ext.enabled || !ext.url) return null;

  // D-09 PHI GATE — re-evaluated per-fetch (PITFALLS #3). MUST run BEFORE AbortController alloc.
  // Phase 43 D-04 / T-43-05 ORDERING LOCK: this gate is the FIRST guard in
  // tryExternal. The Authorization header build below MUST stay AFTER this
  // call. Reordering opens an auth-without-PHI bypass — see Test 22 +
  // ValidationPanel.phi-gate.integration.test.tsx Tests D + E.
  if (!isPhiAcknowledged(opts.serverUrl, ext.url)) {
    return null;
  }

  // Phase 43 D-04 / D-05 / D-21 — Authorization header injection.
  // Built AFTER PHI gate, BEFORE AbortController allocation. Header is a
  // LOCAL variable; never attached to `opts.externalValidator` or any
  // object that crosses the `notify()` boundary (T-43-02 mitigation).
  // ANTI-PATTERN GUARD: this block lives OUTSIDE the fetch try/catch so
  // header-build errors do not get swallowed by the CORS heuristic (PITFALL).
  // Header formats (D-05): `Authorization: Basic <b64(user:pass)>` (RFC 7617)
  // and `Authorization: Bearer <token>` (RFC 6750).
  let authHeader: string | null = null;
  if (ext.auth?.type === 'basic' && ext.auth.username && ext.auth.password) {
    // RFC 7617 — Basic. Re-encoded per request (no caching of the b64 form).
    authHeader = `Basic ${btoa(`${ext.auth.username}:${ext.auth.password}`)}`;
  } else if (ext.auth?.type === 'bearer') {
    // Read fresh per call so user-driven rotation via the modal takes effect
    // immediately on the next validate. AFTER the PHI gate so the bearer key
    // is never even read when PHI is unacknowledged (T-43-05 lock).
    const token = readBearerToken();
    if (!token) {
      // D-02 / T-43-03: bearer configured but token absent → demote silently
      // to server tier with auth-missing notify (banner copy reflects state).
      opts.notify?.('auth-missing', {
        from: 'external',
        to: 'server',
        authType: 'bearer',
      });
      opts.probe.set(probeKey(opts.serverUrl, ext.url, resource.resourceType), 'server');
      return null;
    }
    // RFC 6750 — Bearer. Token is raw (caller is responsible for encoding).
    authHeader = `Bearer ${token}`;
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), ext.timeoutMs);

  // Chain caller's unmount abort to the timeout controller.
  const chainListener = () => timeoutController.abort();
  opts.abort.signal.addEventListener('abort', chainListener, { once: true });

  try {
    const profileCanonical = opts.profile?.url;
    const query = profileCanonical ? `?profile=${encodeURIComponent(profileCanonical)}` : '';
    const base = ext.url.endsWith('/') ? ext.url : `${ext.url}/`;
    const url = `${base}${resource.resourceType}/$validate${query}`;
    // Build headers object as a local — Authorization is conditionally added.
    const headers: Record<string, string> = {
      'Content-Type': 'application/fhir+json',
    };
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(resource),
      signal: timeoutController.signal,
    });
    // Phase 43 D-13 / T-43-04: 401/403 → demote with auth-failed notify.
    // Auth payload limited to authType + status; NO credential strings.
    if (res.status === 401 || res.status === 403) {
      opts.notify?.('auth-failed', {
        from: 'external',
        to: 'server',
        authType: ext.auth?.type,
        status: res.status,
      });
      opts.probe.set(probeKey(opts.serverUrl, ext.url, resource.resourceType), 'server');
      return null;
    }
    if (!res.ok) {
      opts.notify?.('demote', { from: 'external', to: 'server' });
      return null;
    }
    const outcome = (await res.json()) as OperationOutcome;
    return outcome?.issue ?? [];
  } catch (err) {
    // D-19 CORS heuristic: TypeError + caller-abort NOT fired = network/CORS.
    if (err instanceof TypeError && !opts.abort.signal.aborted) {
      opts.notify?.('cors', { from: 'external', to: 'server' });
      return null;
    }
    // AbortError: distinguish timeout (timeoutController aborted) vs caller-cancel.
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (opts.abort.signal.aborted) {
        // Caller cancellation — bubble via throw so useConformanceRun treats as cancel.
        throw err;
      }
      opts.notify?.('timeout', {
        from: 'external',
        to: 'server',
        timeoutMs: ext.timeoutMs,
      });
      return null;
    }
    opts.notify?.('demote', { from: 'external', to: 'server' });
    return null;
  } finally {
    clearTimeout(timeoutId);
    opts.abort.signal.removeEventListener('abort', chainListener);
  }
}

async function tryServer(
  resource: Resource,
  opts: CascadeOptions,
): Promise<OperationOutcomeIssue[] | null> {
  const validatorUrl = opts.settings?.validation?.validatorUrl;
  if (!validatorUrl || validatorUrl.trim().length === 0) return null;

  const backend = createRemoteBackend(validatorUrl, opts.profile?.url);
  // D-20 / VAL-05: thread caller's abort signal into server-tier fetch.
  const issues = await backend.validate(resource, { signal: opts.abort.signal });
  const hasExceptionIssue = issues.some((i) => i.code === 'exception');
  if (hasExceptionIssue) {
    opts.notify?.('demote', { from: 'server', to: 'local' });
    return null;
  }
  return issues;
}

function tryLocal(resource: Resource, opts: CascadeOptions): OperationOutcomeIssue[] {
  const profile = opts.profile ?? getProfileForType(resource.resourceType);
  return validateStructural(resource, profile);
}

export async function validateWithCascade(
  resource: Resource,
  options: CascadeOptions,
): Promise<NormalizedIssue[]> {
  const resourceId = (resource as { id?: string }).id ?? 'unknown';
  const resourceRef = `${resource.resourceType}/${resourceId}`;

  const extUrl = options.externalValidator?.url ?? '';
  const pk = probeKey(options.serverUrl, extUrl, options.resourceType);
  const cached = options.probe.get(pk);

  let rawIssues: OperationOutcomeIssue[] | null = null;
  let activeStrategy: ActiveStrategy = 'local';

  if (!cached || cached === 'external') {
    rawIssues = await tryExternal(resource, options);
    if (rawIssues !== null) activeStrategy = 'external';
  }
  if (rawIssues === null && (!cached || cached === 'external' || cached === 'server')) {
    rawIssues = await tryServer(resource, options);
    if (rawIssues !== null) activeStrategy = 'server';
  }
  if (rawIssues === null) {
    rawIssues = tryLocal(resource, options);
    activeStrategy = 'local';
  }

  options.probe.set(pk, activeStrategy);

  return rawIssues.map((issue) => normalizeOperationOutcomeIssue(issue, resourceRef));
}
