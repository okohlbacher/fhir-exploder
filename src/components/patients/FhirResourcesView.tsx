import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Center,
  Collapse,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react-hooks';
import { SearchControl } from '@medplum/react';
import type { SearchClickEvent } from '@medplum/react';
import type { Bundle, CapabilityStatement } from '@medplum/fhirtypes';
import type { SearchRequest } from '@medplum/core';

type CountState = number | 'loading' | 'error';

interface FhirResourcesViewProps {
  patientId: string;
  capability: CapabilityStatement;
}

/**
 * Discover which resource types accept a `patient` or `subject` search
 * parameter from the server's CapabilityStatement. Also returns a mapping
 * of type -> chosen parameter name (preferring `patient`, falling back
 * to `subject`) so we query the right parameter per type.
 */
function usePatientLinkedTypes(capability: CapabilityStatement): {
  types: string[];
  paramByType: Map<string, 'patient' | 'subject'>;
} {
  return useMemo(() => {
    const types: string[] = [];
    const paramByType = new Map<string, 'patient' | 'subject'>();
    const resources = capability.rest?.[0]?.resource ?? [];

    for (const r of resources) {
      const params = r.searchParam ?? [];
      const hasPatient = params.some((p) => p.name === 'patient');
      const hasSubject = params.some((p) => p.name === 'subject');
      if (!hasPatient && !hasSubject) continue;
      const type = r.type;
      if (!type) continue;
      types.push(type);
      paramByType.set(type, hasPatient ? 'patient' : 'subject');
    }
    types.sort();
    return { types, paramByType };
  }, [capability]);
}

/**
 * Patient-scoped FHIR Resources view (D-09, PTNT-05).
 *
 * Discovers resource types that reference a patient via the
 * CapabilityStatement, fetches the count of each scoped to the current
 * patient (`{Type}?patient=Patient/{id}&_summary=count`), and renders
 * non-zero types as expandable rows. Expanding a row mounts a
 * patient-scoped SearchControl whose row click navigates to
 * `/patients/{patientId}/{resourceType}/{resourceId}` so the user stays
 * in patient context.
 *
 * Security note (T-03-05): The resource type comes from the server's
 * CapabilityStatement (server-provided, not user input); the resource
 * ID is provided by SearchControl's click event (also server-provided).
 * The patient filter is built from `Patient/${patientId}` -- SearchControl
 * encodes the filter value when executing the FHIR search.
 */
export function FhirResourcesView({
  patientId,
  capability,
}: FhirResourcesViewProps) {
  const navigate = useNavigate();
  const client = useMedplum();

  const { types: patientLinkedTypes, paramByType } =
    usePatientLinkedTypes(capability);

  const [counts, setCounts] = useState<Record<string, CountState>>({});
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Fetch counts on mount / when the inputs change.
  useEffect(() => {
    if (patientLinkedTypes.length === 0) {
      setCounts({});
      return;
    }

    // Initialise every type to 'loading' so the UI can show skeletons.
    const initial: Record<string, CountState> = {};
    for (const t of patientLinkedTypes) initial[t] = 'loading';
    setCounts(initial);

    let cancelled = false;

    for (const type of patientLinkedTypes) {
      const param = paramByType.get(type) ?? 'patient';
      const query = `${param}=Patient/${patientId}&_summary=count`;
      client
        .search(type, query)
        .then((bundle: Bundle) => {
          if (cancelled) return;
          setCounts((prev) => ({
            ...prev,
            [type]: typeof bundle.total === 'number' ? bundle.total : 0,
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [type]: 'error' }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [client, patientId, patientLinkedTypes, paramByType]);

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

  const stillLoading = patientLinkedTypes.some(
    (t) => counts[t] === 'loading'
  );

  // A type is "visible" if it has a positive count, is loading, or errored.
  // Types with a known count of 0 are hidden per D-09 (don't show empty).
  const visibleTypes = patientLinkedTypes.filter((t) => {
    const c = counts[t];
    if (c === 'loading' || c === 'error') return true;
    return typeof c === 'number' && c > 0;
  });

  // True empty state: every count is known and zero.
  const allKnownAndEmpty =
    !stillLoading &&
    patientLinkedTypes.length > 0 &&
    patientLinkedTypes.every((t) => counts[t] === 0);

  if (patientLinkedTypes.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">
          No linked resources found for this patient.
        </Text>
      </Center>
    );
  }

  if (allKnownAndEmpty) {
    return (
      <Center py="xl">
        <Text c="dimmed">No linked resources found for this patient.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="sm" pt="md">
      {stillLoading && visibleTypes.length === 0 && (
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      )}

      {visibleTypes.map((type) => {
        const count = counts[type];
        const param = paramByType.get(type) ?? 'patient';
        const search: SearchRequest = {
          resourceType: type as SearchRequest['resourceType'],
          filters: [
            {
              code: param,
              operator: 'eq',
              value: `Patient/${patientId}`,
            },
          ],
          count: 10,
        };
        const isExpanded = expandedType === type;

        return (
          <Paper key={type} p="sm" withBorder>
            <UnstyledButton
              onClick={() =>
                setExpandedType((prev) => (prev === type ? null : type))
              }
              style={{ width: '100%' }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm">
                  {isExpanded ? (
                    <IconChevronDown size={16} />
                  ) : (
                    <IconChevronRight size={16} />
                  )}
                  <Text fw={600} size="sm">
                    {type}
                  </Text>
                </Group>
                {count === 'loading' && <Skeleton height={22} width={40} />}
                {count === 'error' && (
                  <Badge color="red" variant="light">
                    Error
                  </Badge>
                )}
                {typeof count === 'number' && (
                  <Badge color="blue" variant="light">
                    {count}
                  </Badge>
                )}
              </Group>
            </UnstyledButton>
            <Collapse in={isExpanded}>
              <Stack pt="sm">
                <SearchControl
                  search={search}
                  hideToolbar={true}
                  hideFilters={true}
                  onClick={handleClick}
                />
              </Stack>
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
}
