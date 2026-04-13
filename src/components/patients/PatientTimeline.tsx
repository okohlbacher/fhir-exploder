import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconStethoscope,
  IconHeartbeat,
  IconScissors,
  IconFlask,
  IconPill,
  IconCamera,
  IconFileCheck,
  IconCalendar,
} from '@tabler/icons-react';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle, Resource } from '@medplum/fhirtypes';
import { toRecord } from '../../utils/fhir-helpers';

interface PatientTimelineProps {
  patientId: string;
}

interface TimelineEvent {
  type: string;
  resourceType: string;
  id: string;
  date: string;
  summary: string;
}

interface TimelineNode {
  date: string;
  events: TimelineEvent[];
}

const TIMELINE_RESOURCE_TYPES = [
  { type: 'Encounter', param: 'patient', icon: IconCalendar, color: 'blue' },
  { type: 'Condition', param: 'patient', icon: IconHeartbeat, color: 'red' },
  { type: 'Procedure', param: 'patient', icon: IconScissors, color: 'green' },
  { type: 'Observation', param: 'patient', icon: IconFlask, color: 'violet' },
  { type: 'MedicationStatement', param: 'patient', icon: IconPill, color: 'orange' },
  { type: 'ImagingStudy', param: 'patient', icon: IconCamera, color: 'cyan' },
  { type: 'DiagnosticReport', param: 'patient', icon: IconFileCheck, color: 'teal' },
  { type: 'AllergyIntolerance', param: 'patient', icon: IconStethoscope, color: 'pink' },
];

/** Extract the best date from a FHIR resource */
function extractDate(resource: Resource): string | null {
  const r = toRecord(resource);
  for (const field of [
    'effectiveDateTime', 'performedDateTime', 'recordedDate', 'onsetDateTime',
    'authoredOn', 'date', 'issued', 'started',
  ]) {
    if (typeof r[field] === 'string') return (r[field] as string).slice(0, 10);
  }
  // Period.start
  for (const field of ['effectivePeriod', 'period', 'performedPeriod']) {
    const period = r[field] as Record<string, unknown> | undefined;
    if (period?.start && typeof period.start === 'string') return (period.start as string).slice(0, 10);
  }
  return null;
}

/** Extract a short summary for display */
function extractSummary(resource: Resource): string {
  const r = toRecord(resource);
  // CodeableConcept: code, type, category
  for (const field of ['code', 'type', 'category', 'class']) {
    const cc = r[field];
    if (cc && typeof cc === 'object') {
      const concept = Array.isArray(cc) ? cc[0] : cc;
      if (concept) {
        const c = concept as Record<string, unknown>;
        if (typeof c.text === 'string') return c.text;
        if (Array.isArray(c.coding) && c.coding[0]) {
          const coding = c.coding[0] as Record<string, unknown>;
          if (coding.display) return coding.display as string;
          if (coding.code) return coding.code as string;
        }
      }
    }
  }
  if (typeof r.description === 'string') return r.description;
  if (typeof r.status === 'string') return r.status;
  return resource.resourceType;
}

/**
 * Horizontal patient timeline showing clinical events grouped by date.
 *
 * Fetches all relevant resource types for a patient, extracts dates,
 * groups by date, and renders a scrollable horizontal ribbon with
 * resource-type icons at each date node.
 */
export function PatientTimeline({ patientId }: PatientTimelineProps) {
  const client = useMedplum();
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEvents([]);

    const fetchAll = async () => {
      const allEvents: TimelineEvent[] = [];

      await Promise.all(
        TIMELINE_RESOURCE_TYPES.map(async (rt) => {
          try {
            const url = `${rt.type}?${rt.param}=Patient/${patientId}&_count=200&_sort=-date`;
            const raw = await client.get(client.fhirUrl(url).toString());
            const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
            for (const entry of bundle.entry ?? []) {
              const resource = entry.resource;
              if (!resource) continue;
              const date = extractDate(resource);
              if (!date) continue;
              allEvents.push({
                type: rt.type,
                resourceType: resource.resourceType,
                id: resource.id ?? '',
                date,
                summary: extractSummary(resource),
              });
            }
          } catch {
            // Skip resource types that fail (may not exist on server)
          }
        })
      );

      if (!cancelled) {
        setEvents(allEvents);
        setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [client, patientId]);

  // Group events by date, sorted chronologically
  const nodes = useMemo<TimelineNode[]>(() => {
    const dateMap = new Map<string, TimelineEvent[]>();
    for (const ev of events) {
      const existing = dateMap.get(ev.date) ?? [];
      existing.push(ev);
      dateMap.set(ev.date, existing);
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evts]) => ({ date, events: evts }));
  }, [events]);

  if (loading) {
    return (
      <Stack gap="xs">
        <Title order={5}>Timeline</Title>
        <Group gap="xs"><Loader size="xs" /><Text size="sm" c="dimmed">Loading timeline...</Text></Group>
      </Stack>
    );
  }

  if (nodes.length === 0) return null;

  const getConfig = (type: string) =>
    TIMELINE_RESOURCE_TYPES.find((rt) => rt.type === type) ?? TIMELINE_RESOURCE_TYPES[0];

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Title order={5}>Timeline</Title>
        <Text size="xs" c="dimmed">{events.length} events across {nodes.length} dates</Text>
      </Group>

      <ScrollArea type="auto" offsetScrollbars>
        <Group gap={0} wrap="nowrap" py="sm" px="xs" style={{ minWidth: nodes.length * 80 }}>
          {nodes.map((node, i) => (
            <Group key={node.date} gap={0} wrap="nowrap" align="flex-start">
              {/* Connector line */}
              {i > 0 && (
                <Box
                  style={{
                    width: 24,
                    height: 2,
                    backgroundColor: 'var(--mantine-color-gray-3)',
                    marginTop: 20,
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Date node */}
              <Stack gap={4} align="center" style={{ flexShrink: 0, minWidth: 56 }}>
                <Group gap={2} wrap="nowrap" justify="center"
                  style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: 8,
                    padding: '6px 8px',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                  }}
                >
                  {/* Deduplicate resource types for this date */}
                  {Array.from(new Set(node.events.map((e) => e.type))).map((type) => {
                    const config = getConfig(type);
                    const Icon = config.icon;
                    const typeEvents = node.events.filter((e) => e.type === type);
                    return (
                      <Tooltip
                        key={type}
                        label={
                          <Stack gap={2}>
                            {typeEvents.map((ev) => (
                              <Text key={ev.id} size="xs">{ev.summary}</Text>
                            ))}
                          </Stack>
                        }
                        multiline
                        w={250}
                      >
                        <UnstyledButton
                          onClick={() => {
                            if (typeEvents.length === 1) {
                              navigate(`/explorer/${typeEvents[0].resourceType}/${typeEvents[0].id}`);
                            } else {
                              navigate(`/explorer/${type}?patient=Patient/${patientId}`);
                            }
                          }}
                        >
                          <Group gap={2}>
                            <Icon size={16} color={`var(--mantine-color-${config.color}-6)`} />
                            {typeEvents.length > 1 && (
                              <Badge size="xs" variant="filled" color={config.color} circle>
                                {typeEvents.length}
                              </Badge>
                            )}
                          </Group>
                        </UnstyledButton>
                      </Tooltip>
                    );
                  })}
                </Group>
                <Text size="xs" c="dimmed" ta="center" style={{ whiteSpace: 'nowrap' }}>
                  {node.date}
                </Text>
              </Stack>
            </Group>
          ))}
        </Group>
      </ScrollArea>
    </Stack>
  );
}
