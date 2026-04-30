/**
 * useConformanceRun -- batch conformance validation runner for Phase 16.
 *
 * State machine:
 *   idle -> (start) -> running -> (complete | cancelled | error)
 *
 * Execution:
 *   1. Sample resources via sampleResources(client, resourceType, sampleSize)
 *   2. Get profile via getProfileForType(resourceType)
 *   3. Expand all needed value sets from profile bindings via ValueSetCache
 *   4. Batch-iterate: validateConformance + normalizeConformanceIssues per resource
 *      AND Phase 31 cascade (external → server → local) via validateWithCascade.
 *      Outputs are deduped per-resource by (resourceId|field|description) before
 *      flow into batchConformanceIssues (B-2).
 *   5. Track terminologyAvailable from ValueSetCache.
 *   6. Expose activeStrategy + activeStrategyVariant for the ValidationPanel
 *      status line (D-11 + D-18).
 *   7. Unmount aborts in-flight external AND server fetches (D-20).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { MedplumClient } from '@medplum/core';
import type { OperationOutcomeIssue, Resource, StructureDefinition } from '@medplum/fhirtypes';
import type { AppSettings } from '../config/types';
import type { NormalizedIssue } from '../quality/types';
import { sampleResources } from '../quality/sampling';
import {
  getProfileForType,
  getExtensionProfileForUrl,
  BUNDLED_EXTENSION_PROFILE_URLS,
} from '../quality/profiles';
import { ValueSetCache } from '../quality/valueSetCache';
import {
  validateConformance,
  normalizeConformanceIssues,
} from '../quality/profileConformanceChecker';
import {
  validateWithCascade,
  probeKey,
  clearProbeCache,
  resetProbeForType,
  detectValidatorVariant,
  type ActiveStrategy,
  type ProbeKey,
} from '../quality/cascadingValidator';
import { toRecord } from '../utils/fhir-helpers';

export type ConformanceRunStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'cancelled'
  | 'error';

/**
 * Phase 43 VAL-06 — auth banner state surfaced from the cascade's notify stream.
 *   'none'    — no auth configured (default; banner hidden)
 *   'ok'      — auth configured, run completed without auth-related demotion
 *   'missing' — bearer auth configured, but localStorage token absent
 *               (cascade demoted via notify('auth-missing'))
 *   'failed'  — auth configured, validator returned 401/403
 *               (cascade demoted via notify('auth-failed'))
 */
export type AuthBannerState = 'none' | 'ok' | 'missing' | 'failed';

/** Issue with attached resource id for UI rendering. */
export type AttributedIssue = OperationOutcomeIssue & {
  _resourceId?: string;
};

export interface ConformanceRunState {
  status: ConformanceRunStatus;
  progress: { current: number; total: number };
  issues: NormalizedIssue[];
  legacyIssues: AttributedIssue[];
  byResource: Record<string, { resourceId: string; issues: OperationOutcomeIssue[] }>;
  terminologyAvailable: boolean;
  errorMessage?: string;
  /** Active cascade strategy (external/server/local) for the last run, or null before first run (D-11). */
  activeStrategy: ActiveStrategy | null;
  /** Detected variant suffix for the Active-strategy status line (D-18). */
  activeStrategyVariant: string | null;
  /** Phase 43 VAL-06 — current auth banner state (driven by cascade notify events). */
  authBannerState: AuthBannerState;
  /** Phase 43 VAL-06 — currently configured auth.type (mirrors settings; convenience). */
  authType: 'basic' | 'bearer' | undefined;
  start: () => void;
  cancel: () => void;
}

interface UseConformanceRunArgs {
  client: MedplumClient | null;
  terminologyClient: MedplumClient | null;
  resourceType: string;
  sampleSize: number;
  batchSize: number;
  settings: AppSettings | null;
  patientIds?: string[];
}

/**
 * Collect all unique valueSet URLs from binding elements in a profile.
 */
function collectBindingUrls(profile: StructureDefinition | null): string[] {
  if (!profile) return [];
  const elements = profile.snapshot?.element ?? [];
  const urls = new Set<string>();
  for (const el of elements) {
    const binding = toRecord(el).binding as
      | { strength: string; valueSet: string }
      | undefined;
    if (binding?.valueSet && binding.strength !== 'example') {
      urls.add(binding.valueSet);
    }
  }
  return Array.from(urls);
}

export function useConformanceRun({
  client,
  terminologyClient,
  resourceType,
  sampleSize,
  batchSize,
  settings,
  patientIds,
}: UseConformanceRunArgs): ConformanceRunState {
  const [status, setStatus] = useState<ConformanceRunStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [issues, setIssues] = useState<NormalizedIssue[]>([]);
  const [legacyIssues, setLegacyIssues] = useState<AttributedIssue[]>([]);
  const [byResource, setByResource] = useState<
    Record<string, { resourceId: string; issues: OperationOutcomeIssue[] }>
  >({});
  const [terminologyAvailable, setTerminologyAvailable] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [activeStrategy, setActiveStrategy] = useState<ActiveStrategy | null>(null);
  const [activeStrategyVariant, setActiveStrategyVariant] = useState<string | null>(null);
  // Phase 43 VAL-06 — auth banner state, driven by cascade notify events.
  // Reset to 'ok' (or 'none' when no auth configured) at the start of each
  // run before notify can fire; transitions to 'missing' / 'failed' if the
  // cascade demotes due to auth-missing or auth-failed.
  const [authBannerState, setAuthBannerState] = useState<AuthBannerState>('none');
  const cancelledRef = useRef(false);
  const valueSetCacheRef = useRef(new ValueSetCache());
  const probeCacheRef = useRef<Map<ProbeKey, ActiveStrategy>>(new Map());
  const abortRef = useRef<AbortController>(new AbortController());

  // D-17: full-wipe probe cache on ANY externalValidator settings change.
  // Serialize via JSON.stringify to detect url/enabled/timeoutMs/label changes.
  const extSerialized = JSON.stringify(settings?.validation?.externalValidator ?? null);
  useEffect(() => {
    clearProbeCache(probeCacheRef.current);
    setActiveStrategy(null);
    setActiveStrategyVariant(null);
  }, [extSerialized]);

  const start = useCallback(() => {
    if (!client || !resourceType || !settings) return;

    cancelledRef.current = false;
    setStatus('running');
    setIssues([]);
    setLegacyIssues([]);
    setByResource({});
    setProgress({ current: 0, total: 0 });
    setErrorMessage(undefined);

    // D-17: per-type reset on every "Validate sample" click.
    const externalValidatorUrl = settings?.validation?.externalValidator?.url ?? '';
    const serverBaseUrl = client.getBaseUrl();
    resetProbeForType(
      probeCacheRef.current,
      serverBaseUrl,
      externalValidatorUrl,
      resourceType,
    );
    // D-20: fresh AbortController per run so prior unmounts don't contaminate.
    abortRef.current = new AbortController();
    setActiveStrategy(null);
    setActiveStrategyVariant(null);
    // Phase 43 VAL-06: reset auth banner state at the start of every run.
    // 'ok' when auth is configured (run-in-progress optimism), else 'none'.
    const configuredAuthType = settings?.validation?.externalValidator?.auth?.type;
    setAuthBannerState(configuredAuthType ? 'ok' : 'none');

    void (async () => {
      try {
        // Step 1: Sample resources
        const sample: Resource[] = await sampleResources(client, resourceType, sampleSize, patientIds);
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }
        setProgress({ current: 0, total: sample.length });

        // Step 2: Get profile
        const profile = getProfileForType(resourceType);

        // Step 2b (Phase 36 / MII-EXT-12 lazy-load consumer): collect canonical
        // URLs from meta.profile[*] across the sampled resources and lazy-load
        // the matching extension SDs in parallel. Failed loads silently skip
        // (extension validation is best-effort). Pre-Step-3 placement keeps the
        // value-set expansion + extension-load latency measurable as one async
        // tick rather than serializing them.
        const extensionUrls = new Set<string>();
        for (const r of sample) {
          const profiles = (r as { meta?: { profile?: string[] } }).meta?.profile;
          if (Array.isArray(profiles)) {
            for (const url of profiles) {
              if (BUNDLED_EXTENSION_PROFILE_URLS.includes(url)) {
                extensionUrls.add(url);
              }
            }
          }
        }
        const extensionProfilesByUrl = new Map<string, StructureDefinition>();
        if (extensionUrls.size > 0) {
          const results = await Promise.all(
            Array.from(extensionUrls).map(async (url) => {
              const sd = await getExtensionProfileForUrl(url);
              return [url, sd] as const;
            }),
          );
          for (const [url, sd] of results) {
            if (sd) extensionProfilesByUrl.set(url, sd);
          }
        }
        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        // Step 3: Expand value sets from profile bindings
        const vsCache = valueSetCacheRef.current;
        const expandedValueSets = new Map<string, Set<string>>();

        if (profile && terminologyClient) {
          const bindingUrls = collectBindingUrls(profile);
          if (bindingUrls.length > 0) {
            const results = await Promise.all(
              bindingUrls.map(async (url) => {
                const codes = await vsCache.expand(terminologyClient, url);
                return { url, codes };
              }),
            );
            for (const { url, codes } of results) {
              if (codes) {
                expandedValueSets.set(url, codes);
              }
            }
          }
        }

        setTerminologyAvailable(vsCache.isAvailable());

        if (cancelledRef.current) {
          setStatus('cancelled');
          return;
        }

        const effectiveBatchSize = Math.max(1, batchSize);

        // W-2 (revision): extract once, guard once. Matches tryExternal's
        // destructuring. Eliminates repeated settings?.validation?.externalValidator?
        // chains that fail strict null-checks.
        const ext = settings?.validation?.externalValidator;
        const cascadeExternalValidator =
          ext?.enabled && ext.url
            ? {
                url: ext.url,
                enabled: ext.enabled,
                timeoutMs: ext.timeoutMs ?? 15000,
                label: ext.label,
              }
            : undefined;

        // Step 5: Batch-iterate resources
        for (let i = 0; i < sample.length; i += effectiveBatchSize) {
          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
          const batch = sample.slice(i, i + effectiveBatchSize);

          const batchConformanceIssues: NormalizedIssue[] = [];
          const batchByResource: Record<
            string,
            { resourceId: string; issues: OperationOutcomeIssue[] }
          > = {};

          await Promise.all(
            batch.map(async (r) => {
              const resourceId = `${r.resourceType}/${toRecord(r).id ?? 'unknown'}`;

              // Conformance checker (existing path — unchanged)
              const conformanceIssues = validateConformance(r, profile, expandedValueSets);
              // Phase 36 / MII-EXT-12: also validate against any bundled
              // extension SDs whose canonical URLs appear in this resource's
              // meta.profile[]. Issues fold into the same conformanceIssues
              // array; the dedup at lines ~285-296 collapses duplicates by
              // (resourceId|field|description).
              const rExtProfiles =
                (r as { meta?: { profile?: string[] } }).meta?.profile ?? [];
              for (const url of rExtProfiles) {
                const extSd = extensionProfilesByUrl.get(url);
                if (extSd) {
                  conformanceIssues.push(
                    ...validateConformance(r, extSd, expandedValueSets),
                  );
                }
              }
              const normalized = normalizeConformanceIssues(conformanceIssues, r);

              // Cascade (external → server → local) replaces the legacy
              // backends loop. Errors inside the cascade demote silently to
              // the next tier; timeout/CORS fire a single blue toast via
              // the notify callback (D-10 + D-19).
              const cascadeResult = await validateWithCascade(r, {
                serverUrl: serverBaseUrl,
                resourceType: r.resourceType,
                externalValidator: cascadeExternalValidator,
                probe: probeCacheRef.current,
                abort: abortRef.current,
                profile,
                settings: settings ?? null,
                notify: (kind, payload) => {
                  if (kind === 'timeout') {
                    notifications.show({
                      color: 'blue',
                      autoClose: 5000,
                      title: 'External validator timeout',
                      message: `External validator timed out after ${Math.round(
                        (payload.timeoutMs ?? 0) / 1000,
                      )}s — falling back to ${payload.to}`,
                    });
                  } else if (kind === 'cors') {
                    notifications.show({
                      color: 'blue',
                      autoClose: 8000,
                      title: 'External validator unreachable',
                      message:
                        `External validator unreachable — falling back to ${payload.to}.\n` +
                        `Likely CORS or network. Check browser console and the validator's Access-Control-Allow-Origin header.`,
                    });
                  } else if (kind === 'auth-missing') {
                    // Phase 43 D-02 — bearer configured but localStorage token absent.
                    // Banner copy in ValidationPanel translates this to
                    // "auth: bearer (token missing — set in Settings)".
                    setAuthBannerState('missing');
                  } else if (kind === 'auth-failed') {
                    // Phase 43 D-13 — validator returned 401/403. Banner copy
                    // becomes "auth: <type> — failed (server fallback)".
                    setAuthBannerState('failed');
                  }
                  // kind === 'demote' is silent — HTTP 4xx/5xx (other than
                  // 401/403) from a reachable validator returns a real
                  // OperationOutcome body; the user sees the issue in the table.
                },
              });

              // B-2 (revision): dedup cascade output against validateConformance
              // output BEFORE pushing to batchConformanceIssues. Key mirrors
              // ValidationPanel's allNormalizedIssues dedup
              // (resourceId|field|description) so a finding emitted by both
              // checkers collapses to one row AND counts once in
              // setOverallValidation's affected-resource denominator.
              const mergedForThisResource: NormalizedIssue[] = [
                ...normalized,
                ...cascadeResult,
              ];
              const seenKeys = new Set<string>();
              const deduped: NormalizedIssue[] = [];
              for (const issue of mergedForThisResource) {
                const key = `${issue.resourceId}|${issue.field}|${issue.description}`;
                if (seenKeys.has(key)) continue;
                seenKeys.add(key);
                deduped.push(issue);
              }
              batchConformanceIssues.push(...deduped);
              batchByResource[resourceId] = {
                resourceId: (toRecord(r).id as string) ?? 'unknown',
                issues: [],
              };
            }),
          );

          // Commit batch results. batchLegacyIssues stays empty because the
          // cascade returns normalized output directly; downstream ValidationPanel
          // consumers migrated to `run.issues` / `allNormalizedIssues` (B-1).
          setIssues((prev) => [...prev, ...batchConformanceIssues]);
          setByResource((prev) => ({ ...prev, ...batchByResource }));
          setProgress({
            current: Math.min(i + batch.length, sample.length),
            total: sample.length,
          });

          if (cancelledRef.current) {
            setStatus('cancelled');
            return;
          }
        }

        // Update Active-strategy state from the probe cache after the run.
        const pk = probeKey(serverBaseUrl, externalValidatorUrl, resourceType);
        const currentStrategy = probeCacheRef.current.get(pk) ?? null;
        setActiveStrategy(currentStrategy);
        setActiveStrategyVariant(
          currentStrategy === 'external'
            ? detectValidatorVariant(
                externalValidatorUrl,
                settings?.validation?.externalValidator?.label,
              )
            : null,
        );

        if (!cancelledRef.current) {
          setStatus('complete');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [client, terminologyClient, resourceType, sampleSize, batchSize, settings, patientIds]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  // Unmount-safety: cancel batch loop AND abort in-flight fetches (D-20).
  useEffect(() => {
    const controller = abortRef.current;
    return () => {
      cancelledRef.current = true;
      controller.abort();
    };
  }, []);

  return {
    status,
    progress,
    issues,
    legacyIssues,
    byResource,
    terminologyAvailable,
    errorMessage,
    activeStrategy,
    activeStrategyVariant,
    authBannerState,
    authType: settings?.validation?.externalValidator?.auth?.type,
    start,
    cancel,
  };
}
