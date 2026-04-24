import { useEffect, useState } from 'react';
import { Alert, Center, Skeleton, Stack, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import type { Resource } from '@medplum/fhirtypes';
import { useNavigate } from 'react-router-dom';

import { MII_MODULES, findModuleForType } from '../../utils/mii-modules';
import {
  extractDate,
  extractSummary,
  type TimelineData,
} from '../../utils/timeline-utils';
import { TimelineEntry } from './TimelineEntry';

interface ClinicalTimelineProps {
  patientId: string;
}

/**
 * FHIR resource types aggregated into the clinical timeline.
 *
 * Chosen to match MII Kerndatensatz "clinical history" modules that
 * carry a clinically-relevant date (D-07). Medikation / Consent are
 * intentionally excluded because their date semantics are more about
 * administration windows than clinical events.
 */
const TIMELINE_RESOURCE_TYPES = [
  'Encounter',
  'Condition',
  'Procedure',
  'Observation',
] as const;

/**
 * Aggregated, chronological clinical timeline for a patient (D-07, D-08).
 *
 * Fetches Encounter, Condition, Procedure, and Observation resources
 * scoped to the patient in parallel, extracts each resource's clinically
 * relevant date via `extractDate`, sorts descending, and renders each as
 * a color-coded TimelineEntry. Clicking an entry navigates to the
 * patient-scoped resource detail view (`/patients/:id/:type/:id`),
 * reusing the Phase 2 ResourceDetailPage.
 *
 * Rendering states follow the 03-UI-SPEC States Matrix: five skeletons
 * while loading, a red Alert on fetch failure, and the UI-SPEC empty
 * state copy when the patient has no dated clinical events.
 */
export function ClinicalTimeline({ patientId }: ClinicalTimelineProps) {
  const client = useMedplum();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          TIMELINE_RESOURCE_TYPES.map((type) =>
            client
              .searchResources(
                type,
                `patient=Patient/${patientId}&_count=100&_sort=-date`
              )
              .catch(() => [] as Resource[])
          )
        );

        if (cancelled) {
          return;
        }

        const allResources: Resource[] = results.flat();
        const timelineEntries: TimelineData[] = allResources
          .map((resource): TimelineData | null => {
            const date = extractDate(resource);
            if (!date) {
              return null;
            }
            const moduleConfig = findModuleForType(
              resource.resourceType,
              MII_MODULES,
            );
            return {
              resourceType: resource.resourceType,
              resourceId: resource.id ?? '',
              date,
              typeLabel: moduleConfig?.germanLabel ?? resource.resourceType,
              summary: extractSummary(resource),
              color: moduleConfig?.badgeColor ?? 'gray',
              resource,
            };
          })
          .filter((e): e is TimelineData => e !== null)
          .sort((a, b) => b.date.localeCompare(a.date));

        setEntries(timelineEntries);
        setLoading(false);
      } catch {
        if (cancelled) {
          return;
        }
        setError('Failed to load timeline data.');
        setLoading(false);
      }
    };

    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [client, patientId]);

  if (loading) {
    return (
      <Stack gap="sm" pt="md">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={60} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" mt="md">
        Failed to load timeline data.
      </Alert>
    );
  }

  if (entries.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">No clinical events recorded for this patient.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="sm" pt="md">
      {entries.map((entry) => (
        <TimelineEntry
          key={`${entry.resourceType}/${entry.resourceId}`}
          entry={entry}
          onClick={() =>
            navigate(
              `/patients/${patientId}/${entry.resourceType}/${entry.resourceId}`
            )
          }
        />
      ))}
    </Stack>
  );
}
