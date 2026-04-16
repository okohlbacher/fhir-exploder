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
  Progress,
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
import { useOutletContext } from 'react-router-dom';
import type { MedplumClient } from '@medplum/core';
import type { QualityOutletContext } from './QualityLayout';
import { useSettings } from '../../hooks/useSettings';
import { useQualityMetrics } from '../../quality/QualityMetricsContext';
import { percentClean } from '../../quality/percent';
import { BUNDLED_PROFILE_TYPES } from '../../quality/profiles';
import { parseResourceTypes } from '../../fhir/capability';
import { resolveBackends } from '../../quality/validationBackends';
import { useConformanceRun } from '../../hooks/useConformanceRun';
import { createTerminologyClient } from '../../terminology/terminologyClient';
import { ValidationIssueList } from './ValidationIssueList';
import { ResourceIssueTable } from './ResourceIssueTable';
import type { NormalizedIssue } from '../../quality/types';

export interface ValidationPanelProps {
  client: MedplumClient;
  sampleSize: number;
  patientIds?: string[];
}

const BANNER_KEY_PREFIX = 'quality.validation.bannerDismissed.v1';
const PHI_ACK_KEY_PREFIX = 'quality.validation.phiAcknowledged.v1';
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

  // Banner dismissal is scoped per (serverUrl, validatorUrl) so a user who
  // changes their validator URL sees the warning again.
  const bannerKey = useMemo(
    () => `${BANNER_KEY_PREFIX}:${serverUrl}|${validatorUrl ?? 'none'}`,
    [serverUrl, validatorUrl],
  );
  const [bannerDismissed, setBannerDismissed] = useLocalStorage<boolean>({
    key: bannerKey,
    defaultValue: false,
  });

  // PHI acknowledgement is independent from the info-banner dismissal and
  // is scoped per (serverUrl, validatorUrl) so a user who switches
  // validator URLs must re-acknowledge before the next remote run.
  const phiAckKey = useMemo(
    () => `${PHI_ACK_KEY_PREFIX}:${serverUrl}|${validatorUrl ?? 'none'}`,
    [serverUrl, validatorUrl],
  );
  const [phiAcknowledged, setPhiAcknowledged] = useLocalStorage<boolean>({
    key: phiAckKey,
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

  const [resourceType, setResourceType] = useState<string>(() => {
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

  const pct =
    run.progress.total > 0
      ? Math.round((run.progress.current / run.progress.total) * 100)
      : 0;

  const canExport = run.status === 'complete' || run.status === 'cancelled';

  // Normalized issues from conformance checker (already NormalizedIssue[])
  const conformanceIssues = run.issues;

  // Normalized issues from legacy backends for the Resources tab
  const legacyNormalizedIssues = useMemo((): NormalizedIssue[] => {
    return run.legacyIssues.map((issue) => ({
      resourceId: issue._resourceId ?? 'unknown/unknown',
      resourceType: (issue._resourceId ?? 'unknown').split('/')[0],
      field: issue.expression?.[0] ?? issue.location?.[0] ?? '',
      description: `${issue.code ?? ''} -- ${issue.diagnostics ?? issue.details?.text ?? ''}`,
      severity: (issue.severity === 'fatal' || issue.severity === 'error'
        ? 'error'
        : issue.severity === 'warning'
          ? 'warning'
          : 'info') as NormalizedIssue['severity'],
    }));
  }, [run.legacyIssues]);

  // Merge conformance + legacy normalized issues for the Resources tab
  const allNormalizedIssues = useMemo((): NormalizedIssue[] => {
    // Dedupe by resourceId + field + description
    const seen = new Set<string>();
    const merged: NormalizedIssue[] = [];
    for (const issue of [...conformanceIssues, ...legacyNormalizedIssues]) {
      const key = `${issue.resourceId}|${issue.field}|${issue.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(issue);
      }
    }
    return merged;
  }, [conformanceIssues, legacyNormalizedIssues]);

  // Phase 18 / Plan 18-02: push overallValidation rollup to QualityMetricsContext
  // on terminal status (complete|cancelled). Gate prevents mid-run flicker
  // (pitfall 2 in 18-RESEARCH.md). Numerator uses allNormalizedIssues (conformance
  // + legacy dedup) per pitfall 6.
  const { setOverallValidation } = useQualityMetrics();
  useEffect(() => {
    if (run.status !== 'complete' && run.status !== 'cancelled') return;
    const affected = new Set(allNormalizedIssues.map((i) => i.resourceId)).size;
    setOverallValidation(percentClean(affected, run.progress.total));
  }, [run.status, run.progress.total, allNormalizedIssues, setOverallValidation]);

  const handleExport = () => {
    const payload = {
      phase: '05-validation',
      resourceType,
      sampleSize,
      batchSize,
      computedAt: new Date().toISOString(),
      status: run.status,
      progress: run.progress,
      issues: run.legacyIssues,
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

  // PHI gating only applies when a remote validator is configured — if the
  // run is structural-only (local), no PHI leaves the browser so no
  // acknowledgement is required. T-05-05-01 mitigation.
  const requiresPhiAck = hasRemote && !phiAcknowledged;

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

      {hasRemote && !phiAcknowledged && (
        <Alert
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={20} />}
          title="PHI will be sent to an external validator"
        >
          <Stack gap="xs">
            <Text size="sm">{PHI_BANNER_COPY}</Text>
            <Text size="sm" fw={500}>
              Validator URL: <code>{validatorUrl}</code>
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
          <Stack gap="xs" aria-live="polite">
            <Text size="sm">
              Validating {resourceType} ({run.progress.current}/
              {run.progress.total})...
            </Text>
            <Progress value={pct} animated />
          </Stack>
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

      {run.status === 'complete' && allNormalizedIssues.length === 0 && run.legacyIssues.length === 0 && (
        <Alert variant="light" color="green" icon={<IconCheck size={20} />}>
          No conformance issues found in the sampled {run.progress.total}{' '}
          resources.
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        (allNormalizedIssues.length > 0 || run.legacyIssues.length > 0) && (
          <Stack gap="xs">
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
                <ValidationIssueList issues={run.legacyIssues} />
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
