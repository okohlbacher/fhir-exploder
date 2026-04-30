/**
 * IPSPanel — /quality/ips: validate FHIR bundles against the HL7 IPS Composition profile.
 *
 * Phase 44 Plan 44-02 (IPS-01).
 *
 * Two input modes:
 *   - "Paste Bundle JSON" tab: <JsonInput> (D-15)
 *   - "Select from Server" tab: search Composition resources via the connected
 *     MedplumClient and fetch via the Composition/$document operation.
 *
 * Validation: on explicit Validate-button click (D-07), loads IPS profile via
 * getIpsProfileForUrl(IPS_COMPOSITION_PROFILE_URL), calls validateIpsBundle(bundle, profile),
 * normalizes issues via normalizeOperationOutcomeIssue, renders via <ResourceIssueTable>
 * (D-10 — UNCHANGED Phase 15 primitive).
 *
 * No PHI gate (D-08): walker is local; no PHI leaves the browser.
 * The connected FHIR client is consumed via useOutletContext, matching the
 * Phase 5/15/31 panel idiom — but the client is OPTIONAL: paste-mode works
 * without a connected server (the server tab is disabled instead).
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  JsonInput,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconClipboardText,
  IconDatabase,
} from '@tabler/icons-react';
import { useOutletContext } from 'react-router-dom';
import type {
  Bundle,
  Composition,
  OperationOutcomeIssue,
} from '@medplum/fhirtypes';
import type { QualityOutletContext } from './QualityLayout';
import { validateIpsBundle } from '../../quality/ipsBundleValidator';
import { normalizeOperationOutcomeIssue } from '../../quality/normalizers';
import {
  getIpsProfileForUrl,
  IPS_COMPOSITION_PROFILE_URL,
} from '../../quality/profiles/ips/getIpsProfileForUrl';
import { ResourceIssueTable } from './ResourceIssueTable';
import type { NormalizedIssue } from '../../quality/types';

type RunStatus =
  | 'idle'
  | 'loading'
  | 'complete'
  | 'error'
  | 'profile-missing';

interface RunState {
  status: RunStatus;
  issues: NormalizedIssue[];
  resourceRef: string;
  errorMessage?: string;
}

const INITIAL_RUN: RunState = {
  status: 'idle',
  issues: [],
  resourceRef: '',
};

export default function IPSPanel(): JSX.Element {
  // useOutletContext returns the QualityOutletContext (client + capability)
  // when mounted under /quality/*. The cast accepts undefined defensively so
  // standalone unit tests can render without a Router outlet.
  const outletContext = useOutletContext<QualityOutletContext | undefined>();
  const client = outletContext?.client;

  const [pasteValue, setPasteValue] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('paste');
  const [serverCompositionId, setServerCompositionId] = useState<string | null>(
    null,
  );
  const [serverCompositions, setServerCompositions] = useState<Composition[]>(
    [],
  );
  const [run, setRun] = useState<RunState>(INITIAL_RUN);

  // Server-picker: fetch Composition list lazily when tab activated
  const handleServerTabActivate = useCallback(async () => {
    if (!client) return;
    if (serverCompositions.length > 0) return;
    try {
      const list = await client.searchResources('Composition', { _count: '50' });
      setServerCompositions(list as unknown as Composition[]);
    } catch (err) {
      console.warn('[IPSPanel] Composition search failed', err);
    }
  }, [client, serverCompositions.length]);

  const parseBundleFromPaste = useCallback((): Bundle | null => {
    if (!pasteValue.trim()) return null;
    try {
      return JSON.parse(pasteValue) as Bundle;
    } catch {
      return null;
    }
  }, [pasteValue]);

  const fetchBundleFromServer = useCallback(
    async (compositionId: string): Promise<Bundle | null> => {
      if (!client) return null;
      try {
        // RESEARCH §5: prefer Composition/$document; fallback message if server doesn't implement.
        const url = client.fhirUrl(
          'Composition',
          compositionId,
          '$document',
        );
        const bundle = await client.get<Bundle>(url);
        return bundle;
      } catch (err) {
        console.warn(
          `[IPSPanel] $document failed for Composition/${compositionId}`,
          err,
        );
        return null;
      }
    },
    [client],
  );

  const handleValidate = useCallback(async () => {
    setRun({ status: 'loading', issues: [], resourceRef: '' });

    // Step 1: load IPS profile
    const profile = await getIpsProfileForUrl(IPS_COMPOSITION_PROFILE_URL);
    if (!profile) {
      setRun({ status: 'profile-missing', issues: [], resourceRef: '' });
      return;
    }

    // Step 2: load bundle (paste OR server)
    let bundle: Bundle | null = null;
    let resourceRef = 'Composition/unknown';
    if (activeTab === 'paste') {
      bundle = parseBundleFromPaste();
      if (!bundle) {
        setRun({
          status: 'error',
          issues: [],
          resourceRef: '',
          errorMessage:
            'Pasted text is not valid JSON. Check the bundle and try again.',
        });
        return;
      }
    } else {
      if (!serverCompositionId) {
        setRun({
          status: 'error',
          issues: [],
          resourceRef: '',
          errorMessage: 'Select a Composition resource first.',
        });
        return;
      }
      bundle = await fetchBundleFromServer(serverCompositionId);
      if (!bundle) {
        setRun({
          status: 'error',
          issues: [],
          resourceRef: '',
          errorMessage:
            'Server did not return a bundle for this Composition (Composition/$document may not be implemented). Try the Paste tab instead.',
        });
        return;
      }
      resourceRef = `Composition/${serverCompositionId}`;
    }

    // Step 3: locate Composition for resourceRef in paste mode
    if (activeTab === 'paste' && bundle) {
      const compEntry = bundle.entry?.find(
        (e) => e?.resource?.resourceType === 'Composition',
      );
      const id = compEntry?.resource?.id ?? 'unknown';
      resourceRef = `Composition/${id}`;
    }

    // Step 4: walk + normalize
    const rawIssues: OperationOutcomeIssue[] = validateIpsBundle(
      bundle as Bundle,
      profile,
    );
    const normalized: NormalizedIssue[] = rawIssues.map((i) =>
      normalizeOperationOutcomeIssue(i, resourceRef),
    );
    setRun({ status: 'complete', issues: normalized, resourceRef });
  }, [
    activeTab,
    parseBundleFromPaste,
    fetchBundleFromServer,
    serverCompositionId,
  ]);

  const compositionOptions = useMemo(
    () =>
      serverCompositions
        .map((c) => ({
          value: c.id ?? '',
          label: `${c.title ?? '(untitled)'} - ${c.id}`,
        }))
        .filter((o) => o.value),
    [serverCompositions],
  );

  return (
    <Stack gap="md" data-testid="ips-panel">
      <Title order={2}>IPS Validator</Title>
      <Text c="dimmed">
        Validate a FHIR Bundle against the HL7 International Patient Summary
        (IPS) Composition profile (hl7.fhir.uv.ips@2.0.0). Findings show empty
        sections, missing required sections, and unresolvable references.
      </Text>

      <Card withBorder p="md">
        <Tabs
          value={activeTab}
          onChange={(v) => {
            setActiveTab(v);
            if (v === 'server') void handleServerTabActivate();
          }}
        >
          <Tabs.List>
            <Tabs.Tab
              value="paste"
              leftSection={<IconClipboardText size={16} />}
            >
              Paste Bundle JSON
            </Tabs.Tab>
            <Tabs.Tab
              value="server"
              leftSection={<IconDatabase size={16} />}
              disabled={!client}
            >
              Select from Server
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="paste" pt="md">
            <JsonInput
              autosize
              minRows={10}
              maxRows={30}
              placeholder='{"resourceType":"Bundle","type":"document","entry":[...]}'
              value={pasteValue}
              onChange={setPasteValue}
              validationError="Invalid JSON"
              data-testid="ips-paste-input"
            />
          </Tabs.Panel>

          <Tabs.Panel value="server" pt="md">
            <Select
              label="Composition resource"
              placeholder="Select a Composition from the connected FHIR server"
              data={compositionOptions}
              value={serverCompositionId}
              onChange={setServerCompositionId}
              searchable
              data-testid="ips-server-select"
            />
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end" mt="md">
          <Button
            onClick={handleValidate}
            loading={run.status === 'loading'}
            data-testid="ips-validate-button"
          >
            Validate
          </Button>
        </Group>
      </Card>

      {run.status === 'loading' && <Skeleton height={200} />}

      {run.status === 'profile-missing' && (
        <Alert
          color="gray"
          icon={<IconAlertTriangle size={18} />}
          title="IPS profile not loaded"
        >
          The IPS Composition profile is not available locally. Run{' '}
          <code>npm run fetch:ips-profiles</code> (or <code>npm install</code>)
          to populate it.
        </Alert>
      )}

      {run.status === 'error' && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="Validation could not run"
        >
          {run.errorMessage}
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length === 0 && (
        <Alert
          color="green"
          icon={<IconCheck size={18} />}
          title="No IPS conformance issues found"
        >
          The bundle satisfies the structural and section-level checks of the
          IPS Composition profile.
        </Alert>
      )}

      {run.status === 'complete' && run.issues.length > 0 && (
        <Paper withBorder p="md" data-testid="ips-results">
          <ResourceIssueTable issues={run.issues} />
        </Paper>
      )}
    </Stack>
  );
}
