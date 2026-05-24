import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMedplum } from '@medplum/react-hooks';
import { Tabs, Stack, Title, Alert, Skeleton, Button, Group } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { Resource, ResourceType } from '@medplum/fhirtypes';
import { useBreadcrumbTrail } from '../../hooks/useBreadcrumbTrail';
import { useShortcuts } from '../../hooks/useShortcuts';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';
import { HumanReadableView } from './HumanReadableView';
import { JsonModeView } from './JsonModeView';
import { KeyFieldsTable } from './KeyFieldsTable';
import { PatientRelatedResources } from './PatientRelatedResources';
import { IncomingReferencesPanel } from './IncomingReferencesPanel';
import { OutgoingReferencesPanel } from './OutgoingReferencesPanel';
import { summarizeResource } from '../../utils/summarizeResource';
import { retry } from '../../utils/lazyRetry';
import { BasePathProvider } from '../../contexts/BasePathContext';

/**
 * Validate that an extracted reference matches the FHIR resource pattern.
 * Only allows known FHIR-style resource type names (PascalCase) and
 * alphanumeric/hyphen IDs to prevent navigation to arbitrary URLs.
 * Mitigates T-02-08 (reference tampering).
 */
const FHIR_REFERENCE_PATTERN = /^[A-Z][a-zA-Z]+$/;
const FHIR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/;

function isValidFhirReference(resourceType: string, id: string): boolean {
  return FHIR_REFERENCE_PATTERN.test(resourceType) && FHIR_ID_PATTERN.test(id);
}

// D-02: URL-driven mode constants
const VALID_MODES = new Set<string>(['summary', 'human', 'graph', 'json']);
type Mode = 'summary' | 'human' | 'graph' | 'json';
const DEFAULT_MODE: Mode = 'summary';

// D-04: lazy-load ResourceGraphView — moves the import here so App.tsx /graph routes
// can redirect to ?mode=graph without keeping the lazy declaration in App.tsx (SHELL-03).
const ResourceGraphView = lazy(() =>
  retry(() => import('./ResourceGraphView')).then((m) => ({ default: m.ResourceGraphView })),
);

/**
 * Resource detail page — 4-mode shell (Phase 54 SHELL-01..04).
 *
 * Modes: Summary | Human | Graph | JSON
 * URL-driven: ?mode= param drives active tab; replace:true so no history
 * entry per mode swap. Default: 'summary'. ?mode=json honored on initial load
 * (Phase 52 drawer Enter key emits this).
 *
 * Keyboard: 1/2/3/4 via useShortcuts (replaces raw document.addEventListener).
 * Reference click interception: Captures clicks on anchor tags pointing
 * to FHIR server URLs and navigates within the Explorer instead.
 * This avoids Pitfall 5 (ReferenceDisplay links leaving the app).
 */
export function ResourceDetailPage() {
  const { resourceType, id, patientId } = useParams<{
    resourceType: string;
    id: string;
    patientId?: string;
  }>();
  const navigate = useNavigate();
  const client = useMedplum();
  const basePath = patientId ? `/patients/${patientId}` : '/explorer';
  const breadcrumbs = useBreadcrumbTrail(basePath);

  const [resource, setResource] = useState<Resource | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // D-02: URL-driven mode (mirrors QualityOverviewPage:131-141 pattern)
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const activeMode: Mode =
    modeParam && VALID_MODES.has(modeParam) ? (modeParam as Mode) : DEFAULT_MODE;

  const handleModeChange = useCallback(
    (value: string | null) => {
      if (!value || !VALID_MODES.has(value)) return;
      const next = new URLSearchParams(searchParams);
      next.set('mode', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // D-03: Replace raw document.addEventListener with shared useShortcuts
  useShortcuts({
    '1': () => handleModeChange('summary'),
    '2': () => handleModeChange('human'),
    '3': () => handleModeChange('graph'),
    '4': () => handleModeChange('json'),
  });

  // Fetch the resource when resourceType or id changes
  useEffect(() => {
    if (!resourceType || !id) return;
    setLoading(true);
    setError(undefined);
    setResource(undefined);
    client
      .readResource(resourceType as ResourceType, id)
      .then((res: Resource) => {
        setResource(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error && err.message.includes('Not found')
            ? `Resource not found: ${resourceType}/${id} does not exist on this server.`
            : `Failed to load resource: Could not retrieve ${resourceType}/${id}. Check your connection and try again.`;
        setError(message);
        setLoading(false);
      });
  }, [client, resourceType, id]);

  /**
   * Intercept clicks on FHIR reference anchor tags rendered by Medplum components.
   *
   * Medplum's ReferenceDisplay renders <a href> pointing to the FHIR server URL
   * (e.g., http://localhost:8080/fhir/Patient/123). We intercept these and navigate
   * within the Explorer instead, preventing navigation away from the app (Pitfall 5).
   *
   * Validates extracted references against FHIR patterns (T-02-08 mitigation).
   */
  const handleReferenceClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      // Match FHIR reference pattern: /ResourceType/id at end of URL
      const match = href.match(/\/([A-Z][a-zA-Z]+)\/([A-Za-z0-9][A-Za-z0-9\-.]{0,63})$/);
      if (match) {
        const [, refType, refId] = match;
        // Validate the extracted reference (T-02-08)
        if (isValidFhirReference(refType, refId)) {
          e.preventDefault();
          breadcrumbs.push({ resourceType: refType, id: refId });
        }
      }
    },
    [breadcrumbs],
  );

  if (!resourceType || !id) {
    return (
      <Alert color="red" title="Invalid URL">
        Missing resource type or ID in the URL.
      </Alert>
    );
  }

  return (
    /* FIX-01: BasePathProvider exposes the computed basePath ('/patients/${patientId}' or '/explorer')
       to descendant ReferenceLink components so middle-click hrefs preserve patient context. */
    <BasePathProvider value={basePath}>
      <Stack gap="lg">
        <NavigationBreadcrumbs
          trail={breadcrumbs.trail}
          onNavigate={breadcrumbs.navigateTo}
          currentResourceType={resourceType}
          currentId={id}
          basePath={basePath}
        />

      {/* D-08: header now contains ONLY Back button + Title; standalone Graph button + Tooltip removed */}
      <Group>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() =>
            navigate(patientId ? `/patients/${patientId}` : `/explorer/${resourceType}`)
          }
        >
          Back to results
        </Button>
        <Title order={2}>
          {resourceType}/{id}
        </Title>
      </Group>

      {loading && (
        <Stack gap="sm">
          <Skeleton height={32} />
          <Skeleton height={200} />
          <Skeleton height={200} />
        </Stack>
      )}

      {error && (
        <Alert color="red" title={error.startsWith('Resource not found') ? 'Resource not found' : 'Error'}>
          {error}
        </Alert>
      )}

      {resource && (
        // D-01: Tabs variant=pills; keepMounted UNSET everywhere (defaults to true on root → all 4 panels stay mounted; per RESEARCH Pitfall 1)
        <Tabs value={activeMode} onChange={handleModeChange} variant="pills">
          <Tabs.List>
            <Tabs.Tab value="summary">Summary</Tabs.Tab>
            <Tabs.Tab value="human">Human</Tabs.Tab>
            <Tabs.Tab value="graph">Graph</Tabs.Tab>
            <Tabs.Tab value="json">JSON</Tabs.Tab>
          </Tabs.List>

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={handleReferenceClick}>
            {/* D-05 + D-09: Summary mode = title + KeyFieldsTable + reverse-references panel (only mount in Summary) */}
            <Tabs.Panel value="summary" pt="md">
              <Stack gap="lg">
                <Title order={3}>{summarizeResource(resource).primary}</Title>
                <KeyFieldsTable resource={resource} />
                {resource.resourceType === 'Patient' && id ? (
                  <PatientRelatedResources patientId={id} />
                ) : (
                  <IncomingReferencesPanel resource={resource} />
                )}
                {resource.resourceType !== 'Patient' && (
                  <OutgoingReferencesPanel resource={resource} />
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="human" pt="md">
              <HumanReadableView resource={resource} />
            </Tabs.Panel>

            {/* D-04: lazy graph view, compact prop suppresses doubled header (RESEARCH Pitfall 2) */}
            <Tabs.Panel value="graph" pt="md">
              <Suspense fallback={<Skeleton h={600} />}>
                <ResourceGraphView compact />
              </Suspense>
            </Tabs.Panel>

            <Tabs.Panel value="json" pt="md">
              <JsonModeView resource={resource} />
            </Tabs.Panel>
          </div>
        </Tabs>
      )}
      {/* D-09 critical: the legacy bottom-mount of PatientRelatedResources/IncomingReferencesPanel (was lines 210-214) is REMOVED.
          Both panels now live ONLY inside the Summary Tabs.Panel above. */}
      </Stack>
    </BasePathProvider>
  );
}
