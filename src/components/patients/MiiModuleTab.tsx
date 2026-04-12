import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Stack, Text } from '@mantine/core';
import { SearchControl } from '@medplum/react';
import type {
  SearchChangeEvent,
  SearchClickEvent,
  SearchLoadEvent,
} from '@medplum/react';
import type { Bundle } from '@medplum/fhirtypes';
import type { SearchRequest } from '@medplum/core';
import type { MiiModule } from '../../utils/mii-modules';

interface MiiModuleTabProps {
  module: MiiModule;
  patientId: string;
}

/**
 * Single MII module tab content (D-06).
 *
 * Renders a SearchControl scoped to the current patient via the module's
 * `patientSearchParam` (e.g. `Condition?patient=Patient/{id}`). Row click
 * navigates to the resource detail view within patient context
 * (`/patients/{patientId}/{resourceType}/{resourceId}`) so breadcrumbs and
 * reference navigation stay patient-scoped.
 *
 * Security note (T-03-04): The patient filter value is built from the
 * URL-supplied `patientId` and the hardcoded `module.patientSearchParam`
 * (from MII_MODULES config, not user input). SearchControl/MedplumClient
 * encode the parameter value when executing the FHIR search.
 *
 * Pitfall 6 note: Medikation defaults to MedicationStatement per D-05. If
 * data only exists in MedicationRequest, users can toggle to the FHIR
 * Resources view to see it.
 */
export function MiiModuleTab({ module, patientId }: MiiModuleTabProps) {
  const navigate = useNavigate();

  const [bundle, setBundle] = useState<Bundle | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  const search = useMemo<SearchRequest>(
    () => ({
      resourceType: module.fhirResourceType as SearchRequest['resourceType'],
      filters: [
        {
          code: module.patientSearchParam,
          operator: 'eq',
          value: `Patient/${patientId}`,
        },
      ],
      count: 20,
    }),
    [module.fhirResourceType, module.patientSearchParam, patientId]
  );

  const handleClick = useCallback(
    (e: SearchClickEvent) => {
      const resource = e.resource;
      if (resource.resourceType && resource.id) {
        navigate(
          `/patients/${patientId}/${resource.resourceType}/${resource.id}`
        );
      }
    },
    [navigate, patientId]
  );

  const handleLoad = useCallback((e: SearchLoadEvent) => {
    setBundle(e.response);
    setLoaded(true);
  }, []);

  const handleChange = useCallback(
    (_e: SearchChangeEvent) => {
      // SearchControl may emit definition changes; we ignore them here because
      // the search is driven by the module config, not user-editable filters.
    },
    []
  );

  const entryCount = bundle?.entry?.length ?? 0;
  const isEmpty = loaded && entryCount === 0;

  return (
    <Stack gap="md" pt="md">
      <SearchControl
        search={search}
        hideToolbar={true}
        hideFilters={true}
        onClick={handleClick}
        onLoad={handleLoad}
        onChange={handleChange}
      />

      {isEmpty && (
        <Center py="xl">
          <Text c="dimmed">
            No {module.germanLabel} data found for this patient.
          </Text>
        </Center>
      )}
    </Stack>
  );
}
