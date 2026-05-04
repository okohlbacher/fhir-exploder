import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMedplum } from '@medplum/react-hooks';
import { Tabs, Stack, Title, Alert, Skeleton, Button, Group, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconAffiliate } from '@tabler/icons-react';
import type { Resource, ResourceType } from '@medplum/fhirtypes';
import { useBreadcrumbTrail } from '../../hooks/useBreadcrumbTrail';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';
import { HumanReadableView } from './HumanReadableView';
import { DeveloperJsonView } from './DeveloperJsonView';
import { PatientRelatedResources } from './PatientRelatedResources';
import { IncomingReferencesPanel } from './IncomingReferencesPanel';

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

/**
 * Resource detail page with two display modes and reference navigation.
 *
 * Tabs: Human-readable (ResourceTable) and JSON (syntax-highlighted JSON).
 *
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
  const [activeTab, setActiveTab] = useState<string | null>('human-readable');

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

  // Keyboard shortcuts: 1/2 switch tabs when no input is focused
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case '1':
          setActiveTab('human-readable');
          break;
        case '2':
          setActiveTab('developer');
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    [breadcrumbs]
  );

  if (!resourceType || !id) {
    return (
      <Alert color="red" title="Invalid URL">
        Missing resource type or ID in the URL.
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <NavigationBreadcrumbs
        trail={breadcrumbs.trail}
        onNavigate={breadcrumbs.navigateTo}
        currentResourceType={resourceType}
        currentId={id}
        basePath={basePath}
      />

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
        <Tooltip label="Open the reference graph for this resource" withArrow>
          <Button
            variant="light"
            color="indigo"
            size="sm"
            leftSection={<IconAffiliate size={16} />}
            onClick={() =>
              navigate(
                patientId
                  ? `/patients/${patientId}/${resourceType}/${id}/graph`
                  : `/explorer/${resourceType}/${id}/graph`,
              )
            }
          >
            Graph
          </Button>
        </Tooltip>
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
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="human-readable">Human-readable</Tabs.Tab>
            <Tabs.Tab value="developer">JSON</Tabs.Tab>
          </Tabs.List>

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={handleReferenceClick}>
            <Tabs.Panel value="human-readable" pt="md">
              <HumanReadableView resource={resource} />
            </Tabs.Panel>

            <Tabs.Panel value="developer" pt="md">
              <DeveloperJsonView resource={resource} />
            </Tabs.Panel>
          </div>
        </Tabs>
      )}

      {resource && (
        resource.resourceType === 'Patient' && id
          ? <PatientRelatedResources patientId={id} />
          : <IncomingReferencesPanel resource={resource} />
      )}
    </Stack>
  );
}
