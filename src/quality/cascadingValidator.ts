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
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from './types';
import { isPhiAcknowledged } from './phiGate';
import { normalizeOperationOutcomeIssue } from './normalizers';
import { validateStructural } from './structuralValidator';
import { createRemoteBackend } from './remoteValidator';
import { getProfileForType } from './profiles';

export type ActiveStrategy = 'external' | 'server' | 'local' | 'probe-failed';
export type ProbeKey = string;

export interface CascadeOptions {
  serverUrl: string;
  resourceType: string;
  externalValidator?: { url: string; enabled: boolean; timeoutMs: number; label?: string };
  probe: Map<ProbeKey, ActiveStrategy>;
  abort: AbortController;
  profile?: StructureDefinition | null;
  settings: AppSettings | null;
  notify?: (
    kind: 'timeout' | 'cors' | 'demote',
    payload: {
      from: ActiveStrategy;
      to: ActiveStrategy;
      timeoutMs?: number;
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
  if (!isPhiAcknowledged(opts.serverUrl, ext.url)) {
    return null;
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
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(resource),
      signal: timeoutController.signal,
    });
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
