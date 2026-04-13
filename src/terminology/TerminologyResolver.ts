import type { MedplumClient } from '@medplum/core';
import type {
  Coding,
  CodeableConcept,
  Parameters,
  Resource,
} from '@medplum/fhirtypes';
import type { ResolverOptions, TerminologyCacheEntry } from './types';
import { TerminologyCache } from './TerminologyCache';
import { makeTerminologyKey, UNCONFIGURED_SERVER } from './terminologyKey';
import { collectCodings } from './walker';

const DEFAULT_NEGATIVE_TTL_MS = 5 * 60_000;
const DEFAULT_LOOKUP_TIMEOUT_MS = 5000;

/**
 * Pulls a display string from a CodeSystem/$lookup Parameters response.
 * When `lang` is provided, a matching `designation` (with `language` = lang
 * and a `value` part) wins over the top-level `display` parameter.
 * Returns null when input is not a Parameters resource or no display is
 * present.
 */
export function extractDisplay(params: Parameters, lang?: string): string | null {
  if (!params || params.resourceType !== 'Parameters') return null;
  if (!Array.isArray(params.parameter)) return null;
  if (lang) {
    const desigs = params.parameter?.filter((p) => p.name === 'designation') ?? [];
    for (const d of desigs) {
      const l = d.part?.find((p) => p.name === 'language')?.valueCode;
      const v = d.part?.find((p) => p.name === 'value')?.valueString;
      if (l === lang && v) return v;
    }
  }
  return params.parameter?.find((p) => p.name === 'display')?.valueString ?? null;
}

function isExpired(entry: TerminologyCacheEntry): boolean {
  if (entry.ttlMs === Infinity) return false;
  return Date.now() - entry.resolvedAt > entry.ttlMs;
}

/**
 * Heart of Phase 4: resolves Coding/CodeableConcept/Resource display values
 * by issuing `CodeSystem/$lookup` against a MedplumClient bound to a
 * terminology server. Deduplicates concurrent lookups for the same
 * system|code, caches results (positive and negative), and falls back
 * silently on every error path so the UI never crashes because a
 * terminology server is down or a code is unknown.
 *
 * Contract: every public method is non-throwing. If lookup fails for any
 * reason (network error, 404, bad response shape), the coding is returned
 * unchanged and a negative entry is cached for `negativeTtlMs`.
 */
export class TerminologyResolver {
  readonly cache: TerminologyCache;
  /**
   * Underlying MedplumClient bound to the terminology server, or null when
   * no terminology URL is configured. Exposed read-only so hooks like
   * {@link useTerminologyHealth} can reuse the resolver's client for probes
   * instead of constructing a second one per effect run (WR-02).
   */
  readonly client: MedplumClient | null;
  private inflight = new Map<string, Promise<string | null>>();
  private readonly serverUrl: string;
  private readonly opts: ResolverOptions;

  constructor(client: MedplumClient | null, opts: ResolverOptions = {}) {
    this.client = client;
    this.opts = opts;
    this.serverUrl = opts.serverUrl ?? UNCONFIGURED_SERVER;
    this.cache = new TerminologyCache({
      serverUrl: this.serverUrl,
      persistToLocalStorage: opts.persistToLocalStorage !== false,
    });
  }

  /**
   * Returns a new Coding with `display` populated if resolvable. Returns the
   * input unchanged when `display` is already present (D-03), when `system`
   * or `code` is missing (V-13), or when lookup fails (V-11/V-12).
   */
  async resolveCoding(coding: Coding): Promise<Coding> {
    if (coding.display) return coding; // D-03: preserve server-side display
    if (!coding.system || !coding.code) return coding; // V-13
    const display = await this.lookupDisplay(coding.system, coding.code);
    return display ? { ...coding, display } : coding;
  }

  /**
   * Resolves each Coding in a CodeableConcept in parallel. Returns a new
   * CodeableConcept (input unchanged). No-op for a CC with no coding.
   */
  async resolveCodeableConcept(cc: CodeableConcept): Promise<CodeableConcept> {
    if (!cc.coding?.length) return cc;
    const resolved = await Promise.all(cc.coding.map((c) => this.resolveCoding(c)));
    return { ...cc, coding: resolved };
  }

  /**
   * Deep-resolves every Coding in a resource. Returns a deep clone with
   * `display` populated on each Coding whose system|code resolved. Original
   * resource is never mutated.
   */
  async resolveResource<T extends Resource>(resource: T): Promise<T> {
    const codings = collectCodings(resource);
    // First pass: resolve each coding. Keep the display results locally so
    // the second-pass patch is immune to a concurrent cache.clear() (WR-04):
    // previously, the enrichment re-read from the cache, which could be
    // empty if the user clicked "Clear terminology cache" between the
    // Promise.all and the clone — resulting in an unenriched render
    // despite successful lookups.
    const displays = await Promise.all(
      codings.map((c) => {
        if (c.display || !c.system || !c.code) return Promise.resolve(null);
        return this.lookupDisplay(c.system, c.code);
      }),
    );
    // structuredClone is safer than JSON.parse(JSON.stringify(...)) — it
    // preserves `undefined`, Date, and typed arrays (FHIR doesn't use those
    // today, but the pattern is brittle) and is faster than JSON roundtrip.
    const clone = structuredClone(resource) as T;
    const cloneCodings = collectCodings(clone);
    for (let i = 0; i < cloneCodings.length; i++) {
      const c = cloneCodings[i];
      const d = displays[i];
      if (d && !c.display) c.display = d;
    }
    return clone;
  }

  /**
   * Public lookup for a single system|code pair. Checks cache, coalesces
   * inflight duplicates, issues the $lookup on a miss. Returns the
   * display string or null if unresolvable.
   */
  async lookupDisplay(system: string, code: string): Promise<string | null> {
    const key = makeTerminologyKey(this.serverUrl, system, code);
    const cached = this.cache.get(key);
    if (cached && !isExpired(cached)) return cached.display;
    const running = this.inflight.get(key);
    if (running) return running;
    if (!this.client) return null;

    const p = this.fetchLookup(system, code, key).finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  private async fetchLookup(
    system: string,
    code: string,
    key: string,
  ): Promise<string | null> {
    const timeoutMs = this.opts.lookupTimeoutMs ?? DEFAULT_LOOKUP_TIMEOUT_MS;
    const negativeTtlMs = this.opts.negativeTtlMs ?? DEFAULT_NEGATIVE_TTL_MS;
    const lang = this.opts.displayLanguage;
    try {
      const qs = new URLSearchParams({ system, code });
      if (lang) qs.set('displayLanguage', lang);
      const signal =
        typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(timeoutMs)
          : undefined;
      const result = await this.client!.get<Parameters>(
        `CodeSystem/$lookup?${qs.toString()}`,
        signal ? { signal } : undefined,
      );
      const display = extractDisplay(result, lang);
      this.cache.set(key, {
        display,
        resolvedAt: Date.now(),
        ttlMs: display ? Infinity : negativeTtlMs,
      });
      return display;
    } catch {
      this.cache.set(key, {
        display: null,
        resolvedAt: Date.now(),
        ttlMs: negativeTtlMs,
      });
      return null;
    }
  }
}
