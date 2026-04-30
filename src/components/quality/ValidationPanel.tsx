/**
 * ValidationPanel — Plan 05-05, QUAL-04.
 *
 * The Validation tab of /quality. Replaces the Plan 02 stub.
 *
 * Structure (UI-SPEC lines 308-336):
 *   1. Dismissible Blaze $validate warning banner (T-05-05-01 mitigation)
 *      — shown at the TOP on first visit; dismiss persists via
 *      localStorage under `quality.validation.bannerDismissed.v1:{serverUrl}|{validatorUrl}`.
 *      The backend indicator Badge remains visible so dismissal does not
 *      hide the fact that external validation is configured.
 *   2. Controls row: Resource type Select, Sample size read-only display,
 *      Validate sample button.
 *   3. Backend indicator Badges: Structural (blue) + Remote (configured)/
 *      Remote (not configured) (green/gray).
 *   4. "No MII profile, no remote validator" Alert when both are absent.
 *   5. Progress bar during run with Cancel button.
 *   6. Cancellation footer when status === 'cancelled'.
 *   7. 0-issues Alert on successful completion.
 *   8. <ValidationIssueList> for populated issue list.
 *   9. Export report (JSON) button: disabled until status in {complete,
 *      cancelled}; on click, Blob download with filename
 *      `quality-report-{ISODate}.json`.
 *
 * Prop signature is locked to match Plan 02's stub: { client, sampleSize }.
 * Capability is read from the outlet context (QualityOutletContext).
 * Settings come from useSettings().
 */
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { MedplumClient } from '@medplum/core';
import type { OperationOutcomeIssue } from '@medplum/fhirtypes';
import type { QualityOutletContext } from './QualityLayout';
import { useSettings } from '../../hooks/useSettings';
import { useValidationRollup } from '../../quality/metrics';
import { percentClean } from '../../quality/percent';
import { BUNDLED_PROFILE_TYPES } from '../../quality/profiles';
import { parseResourceTypes } from '../../fhir/capability';
import { resolveBackends } from '../../quality/validationBackends';
import { useConformanceRun } from '../../hooks/useConformanceRun';
import { createTerminologyClient } from '../../terminology/terminologyClient';
import { phiAckKey } from '../../quality/phiGate';
import { ValidationIssueList } from './ValidationIssueList';
import { ResourceIssueTable } from './ResourceIssueTable';
import { RunProgress } from './RunProgress';
import type { NormalizedIssue } from '../../quality/types';

export interface ValidationPanelProps {
  client: MedplumClient;
  sampleSize: number;
  patientIds?: string[];
}

const BANNER_KEY_PREFIX = 'quality.validation.bannerDismissed.v1';
const TERM_BANNER_KEY_PREFIX = 'quality.validation.termBannerDismissed.v1';
const BANNER_COPY =
  'This server does not implement $validate on resources. Phase 5 runs structural validation locally against bundled MII profiles. To run full FHIR validation, set validation.validatorUrl in settings.yaml to a validator that supports $validate (e.g. validator.fhir.org/validator).';
const PHI_BANNER_COPY =
  'Running validation POSTs full resource payloads (including patient identifiers and other PHI) to the configured external validator. The remote validator is an independent service outside this application — review the validator URL in settings.yaml and confirm that sharing PHI with it is permitted by your data governance policy before proceeding.';

export function ValidationPanel(_props: ValidationPanelProps) {
  const { capability, client } = useOutletContext<QualityOutletContext>();
  const { settings } = useSettings();

  const serverUrl = client.getBaseUrl();
  const validatorUrl = settings?.validation?.validatorUrl;
  const externalValidator = settings?.validation?.externalValidator;

  // CR-01 fix (31-02): The PHI ack key MUST match the URL the cascade reads
  // in `cascadingValidator.tryExternal` (isPhiAcknowledged(serverUrl, ext.url)).
  // When the external tier is configured, it fires FIRST (before server tier),
  // so key the acknowledgement against the external URL. Fall back to the
  // server-tier validatorUrl only when the external tier is absent/disabled.
  // See 31-REVIEW.md §CR-01 and 31-VERIFICATION.md Truth #1.
  const phiGateUrl = useMemo<string | null>(() => {
    if (externalValidator?.enabled && externalValidator.url) {
      return externalValidator.url;
    }
    return validatorUrl ?? null;
  }, [externalValidator?.enabled, externalValidator?.url, validatorUrl]);

  // Banner dismissal is scoped per (serverUrl, phiGateUrl) so a user who
  // changes either their external or server validator URL sees the warning again.
  const bannerKey = useMemo(
    () => `${BANNER_KEY_PREFIX}:${serverUrl}|${phiGateUrl ?? 'none'}`,
    [serverUrl, phiGateUrl],
  );
  const [bannerDismissed, setBannerDismissed] = useLocalStorage<boolean>({
    key: bannerKey,
    defaultValue: false,
  });

  // PHI acknowledgement: keyed against the URL that will actually receive
  // outbound PHI. The cascade checks isPhiAcknowledged(serverUrl, ext.url)
  // before any external fetch; this key MUST agree or the external tier is
  // silently skipped (the CR-01 defect this fix resolves).
  const phiAckKeyStr = useMemo(
    () => phiAckKey(serverUrl, phiGateUrl),
    [serverUrl, phiGateUrl],
  );
  const [phiAcknowledged, setPhiAcknowledged] = useLocalStorage<boolean>({
    key: phiAckKeyStr,
    defaultValue: false,
  });

  // Resource type union: bundled profiles + server capability types
  const serverTypes = useMemo(
    () => parseResourceTypes(capability).map((t) => t.type),
    [capability],
  );
  const selectOptions = useMemo(() => {
    const union = new Set<string>();
    for (const t of BUNDLED_PROFILE_TYPES) union.add(t);
    for (const t of serverTypes) union.add(t);
    return Array.from(union).sort();
  }, [serverTypes]);

  // Plan 35-04 (UAT-FU-05 / RESEARCH Q-02): when the QualityByTypeMatrix
  // chevron navigates here with a `?type=<resourceType>` URL param, honor
  // it as the initial selection so the user lands directly on the matched
  // type instead of the bundled-profile default. Falls back to the
  // pre-existing default heuristic when no `?type=` is present.
  const [searchParams] = useSearchParams();
  const [resourceType, setResourceType] = useState<string>(() => {
    const urlType = searchParams.get('type');
    if (urlType && selectOptions.includes(urlType)) {
      return urlType;
    }
    // Default: first bundled type that the server also declares, else
    // first bundled type overall.
    const firstMatch = BUNDLED_PROFILE_TYPES.find((t) => serverTypes.includes(t));
    return firstMatch ?? BUNDLED_PROFILE_TYPES[0] ?? 'Condition';
  });

  // Terminology banner dismissal (scoped per server)
  const termBannerKey = useMemo(
    () => `${TERM_BANNER_KEY_PREFIX}:${serverUrl}`,
    [serverUrl],
  );
  const [termBannerDismissed, setTermBannerDismissed] = useLocalStorage<boolean>({
    key: termBannerKey,
    defaultValue: false,
  });

  const sampleSize = _props.sampleSize;
  const batchSize = settings?.validation?.batchSize ?? 25;

  const terminologyClient = useMemo(
    () => (settings ? createTerminologyClient(settings) : null),
    [settings],
  );

  const run = useConformanceRun({
    client,
    terminologyClient,
    resourceType,
    sampleSize,
    batchSize,
    settings: settings ?? null,
    patientIds: _props.patientIds,
  });

  const { hasRemote, hasProfile } = resolveBackends(
    settings ?? null,
    resourceType,
  );

  const canExport = run.status === 'complete' || run.status === 'cancelled';

  // Normalized issues from the cascade + conformance checker (already NormalizedIssue[]).
  // Post-Phase-31, run.issues is the single canonical source — the cascade
  // (external → server → local) dedupes against validateConformance output
  // inside useConformanceRun before publishing to run.issues (B-2).
  const conformanceIssues = run.issues;

  // Merge conformance issues (dedupe by resourceId + field + description).
  // The cascade pre-dedupes at source, but this pass keeps the invariant
  // explicit so any future producer cannot silently inflate the rollup.
  const allNormalizedIssues = useMemo((): NormalizedIssue[] => {
    const seen = new Set<string>();
    const merged: NormalizedIssue[] = [];
    for (const issue of conformanceIssues) {
      const key = `${issue.resourceId}|${issue.field}|${issue.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(issue);
      }
    }
    return merged;
  }, [conformanceIssues]);

  // B-1 (revision): ValidationIssueList was originally authored against the
  // legacy AttributedIssue shape (OperationOutcomeIssue + _resourceId).
  // Post-cascade, the cascade returns already-normalized issues directly —
  // back-convert the normalized stream into the AttributedIssue shape the
  // existing renderer expects.
  // Severity maps NormalizedIssue's 3-value union ('error'|'warning'|'info')
  // into OperationOutcome's 4-value severity: info stays 'information',
  // warning/error pass through. Code and diagnostics are rebuilt from
  // description by splitting on the ' -- ' separator the normalizer uses.
  const validationIssueListSource = useMemo(() => {
    return allNormalizedIssues.map((n) => {
      const [codePart = '', diagPart = ''] = n.description.split(' -- ');
      const severityForOutcome: OperationOutcomeIssue['severity'] =
        n.severity === 'info' ? 'information' : n.severity;
      return {
        severity: severityForOutcome,
        code: (codePart.trim() || 'informational') as OperationOutcomeIssue['code'],
        diagnostics: diagPart.trim() || undefined,
        expression: n.field ? [n.field] : undefined,
        _resourceId: n.resourceId,
      };
    });
  }, [allNormalizedIssues]);

  // Phase 18 / Plan 18-02: push overallValidation rollup to QualityMetricsContext
  // on terminal status (complete|cancelled). Gate prevents mid-run flicker
  // (pitfall 2 in 18-RESEARCH.md). Numerator uses allNormalizedIssues (conformance
  // + legacy dedup) per pitfall 6.
  //
  // Plan 35-04 (UAT-FU-05): also push the per-type % clean and integer issue
  // count into ValidationContext.byType / .validationIssuesByType for the
  // QualityByTypeMatrix card. Functional-setter form (Pitfall P-04) so each
  // single-type run merges into the prior map without clobbering other types.
  const {
    set: setOverallValidation,
    setByType,
    setValidationIssuesByType,
  } = useValidationRollup();
  useEffect(() => {
    if (run.status !== 'complete' && run.status !== 'cancelled') return;
    const affected = new Set(allNormalizedIssues.map((i) => i.resourceId)).size;
    const pct = percentClean(affected, run.progress.total);
    setOverallValidation(pct);
    if (pct !== undefined) {
      setByType((prev) => ({ ...prev, [resourceType]: pct }));
    }
    setValidationIssuesByType((prev) => ({
      ...prev,
      [resourceType]: allNormalizedIssues.length,
    }));
  }, [
    run.status,
    run.progress.total,
    allNormalizedIssues,
    resourceType,
    setOverallValidation,
    setByType,
    setValidationIssuesByType,
  ]);

  const handleExport = () => {
    const payload = {
      phase: '05-validation',
      resourceType,
      sampleSize,
      batchSize,
      computedAt: new Date().toISOString(),
      status: run.status,
      progress: run.progress,
      issues: allNormalizedIssues, // B-1 (revision): cascade-normalized + conformance merged + deduped
      byResource: run.byResource,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quality-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  // PHI gating applies when EITHER tier will POST PHI outbound:
  //   - server tier active (hasRemote, driven by validation.validatorUrl)
  //   - external tier active (externalValidator.enabled + url)
  // External-only deployments MUST see the banner — CR-01 fix (31-02).
  const hasExternal =
    !!externalValidator?.enabled &&
    typeof externalValidator.url === 'string' &&
    externalValidator.url.trim().length > 0;
  const requiresPhiAck = (hasRemote || hasExternal) && !phiAcknowledged;

  return (
    <Stack gap="md">
      {!bannerDismissed && (
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={20} />}
          title="Blaze $validate unsupported"
          withCloseButton
          closeButtonLabel="Dismiss"
          onClose={() => setBannerDismissed(true)}
        >
          <Text size="sm">{BANNER_COPY}</Text>
        </Alert>
      )}

      {run.status !== 'idle' && !run.terminologyAvailable && !termBannerDismissed && (
        <Alert
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={20} />}
          title="Terminology server unavailable"
          withCloseButton
          closeButtonLabel="Dismiss"
          onClose={() => setTermBannerDismissed(true)}
        >
          <Text size="sm">
            Value set conformance checks skipped. Other conformance checks
            (cardinality, type constraints) ran normally.
          </Text>
        </Alert>
      )}

      {requiresPhiAck && (
        <Alert
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={20} />}
          title="PHI will be sent to an external validator"
        >
          <Stack gap="xs">
            <Text size="sm">{PHI_BANNER_COPY}</Text>
            <Text size="sm" fw={500}>
              Validator URL: <code>{phiGateUrl ?? ''}</code>
            </Text>
            <Group>
              <Button
                variant="filled"
                color="orange"
                size="xs"
                onClick={() => setPhiAcknowledged(true)}
              >
                I acknowledge and want to proceed
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      <Paper withBorder p="md" radius="sm">
        <Stack gap="sm">
          <Group align="flex-end" gap="md">
            <Select
              label="Resource type"
              data={selectOptions}
              value={resourceType}
              onChange={(v) => v && setResourceType(v)}
              searchable
              style={{ minWidth: 240 }}
            />
            <Text size="sm" c="dimmed">
              Sample size: {sampleSize}
            </Text>
            <Button
              variant="filled"
              onClick={run.start}
              disabled={run.status === 'running' || requiresPhiAck}
              title={
                requiresPhiAck
                  ? 'Acknowledge the PHI notice above to enable remote validation'
                  : undefined
              }
            >
              Validate sample
            </Button>
            {run.status === 'running' && (
              <Button
                variant="subtle"
                color="red"
                onClick={run.cancel}
                leftSection={<IconX size={14} />}
              >
                Cancel
              </Button>
            )}
          </Group>

          <Group gap="xs">
            <Badge color="blue" variant="light" size="sm">
              Conformance
            </Badge>
            {run.terminologyAvailable ? (
              <Badge color="green" variant="light" size="sm">
                Terminology
              </Badge>
            ) : (
              <Badge color="gray" variant="light" size="sm">
                Terminology (unavailable)
              </Badge>
            )}
            {hasRemote ? (
              <Badge color="green" variant="light" size="sm">
                Remote (configured)
              </Badge>
            ) : (
              <Badge color="gray" variant="light" size="sm">
                Remote (not configured)
              </Badge>
            )}
          </Group>
        </Stack>
      </Paper>

      {!hasProfile && !hasRemote && (
        <Alert
          variant="light"
          color="orange"
          icon={<IconInfoCircle size={20} />}
        >
          No MII profile for {resourceType}. Configure an external validator
          URL in settings.yaml to validate this type.
        </Alert>
      )}

      {run.status === 'running' && (
        <Paper withBorder p="sm" radius="sm">
          <RunProgress run={run} label={`Validating ${resourceType}`} />
        </Paper>
      )}

      {run.status === 'cancelled' && (
        <Alert
          variant="light"
          color="yellow"
          icon={<IconInfoCircle size={20} />}
        >
          Validation cancelled at {run.progress.current}/{run.progress.total}.
          Results below reflect completed resources only.
        </Alert>
      )}

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          Validation failed: {run.errorMessage ?? 'unknown error'}
        </Alert>
      )}

      {run.status === 'complete' && allNormalizedIssues.length === 0 && (
        <Alert variant="light" color="green" icon={<IconCheck size={20} />}>
          No conformance issues found in the sampled {run.progress.total}{' '}
          resources.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        allNormalizedIssues.length > 0 && (
          <Stack gap="xs">
            {run.activeStrategy && (
              <Text size="xs" c="dimmed">
                Active strategy:{' '}
                {run.activeStrategyVariant
                  ? `${run.activeStrategy} (${run.activeStrategyVariant})`
                  : run.activeStrategy}
              </Text>
            )}
            {/*
              Phase 43 VAL-06 / D-02 / D-13 / D-21 / T-43-07 — auth banner.
              Renders only when an auth.type is configured. Copy reflects
              the current cascade state truthfully (no credentials in DOM).
            */}
            {run.authType && (
              <Text size="xs" c="dimmed" data-testid="validator-auth-banner">
                {run.authBannerState === 'missing'
                  ? `auth: ${run.authType} (token missing — set in Settings)`
                  : run.authBannerState === 'failed'
                    ? `auth: ${run.authType} — failed (server fallback)`
                    : `auth: ${run.authType}`}
              </Text>
            )}
            <Text size="sm" c="dimmed">
              {allNormalizedIssues.length} issues across{' '}
              {Object.keys(run.byResource).length} resources
            </Text>
            <Tabs defaultValue="issues">
              <Tabs.List>
                <Tabs.Tab value="issues">Issue List</Tabs.Tab>
                <Tabs.Tab value="resources">Resources</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="issues" pt="md">
                <ValidationIssueList issues={validationIssueListSource} />
              </Tabs.Panel>
              <Tabs.Panel value="resources" pt="md">
                <ResourceIssueTable issues={allNormalizedIssues} />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}

      <Group justify="flex-end" align="center" gap="sm">
        <Text size="xs" c="dimmed" ta="right" style={{ maxWidth: 420 }}>
          Export includes resource IDs and validator diagnostics drawn
          from the sampled resources. Review before sharing externally.
        </Text>
        <Button
          variant="subtle"
          leftSection={<IconDownload size={16} />}
          disabled={!canExport}
          onClick={handleExport}
        >
          Export report (JSON)
        </Button>
      </Group>
    </Stack>
  );
}
