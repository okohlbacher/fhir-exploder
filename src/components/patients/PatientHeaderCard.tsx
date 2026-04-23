import { useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBraces,
  IconCalendar,
  IconId,
  IconShareplay,
  IconUser,
} from '@tabler/icons-react';
import type { Patient } from '@medplum/fhirtypes';

interface PatientHeaderCardProps {
  patient: Patient;
}

function getPatientName(patient: Patient): string {
  const name = patient.name?.[0];
  if (!name) return patient.id ?? 'Unknown';
  if (name.text) return name.text;
  const parts = [
    ...(name.prefix ?? []),
    ...(name.given ?? []),
    name.family,
  ].filter(Boolean);
  return parts.join(' ') || (patient.id ?? 'Unknown');
}

function getAge(birthDate: string | undefined): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age} years`;
}

function getInitials(patient: Patient): string {
  const name = patient.name?.[0];
  if (!name) return '?';
  const given = name.given?.[0]?.[0] ?? '';
  const family = name.family?.[0] ?? '';
  return (given + family).toUpperCase() || '?';
}

/**
 * Visually appealing patient header card with avatar, demographics, and identifiers.
 * Replaces Medplum's plain PatientHeader which renders bland text.
 */
export function PatientHeaderCard({ patient }: PatientHeaderCardProps) {
  const name = getPatientName(patient);
  const age = getAge(patient.birthDate);
  const identifiers = patient.identifier ?? [];

  const genderColor = patient.gender === 'female' ? 'pink' : patient.gender === 'male' ? 'blue' : 'gray';

  return (
    <Card withBorder padding="lg" radius="md" shadow="sm">
      <Group wrap="nowrap" gap="lg" align="flex-start">
        <Avatar size={64} radius="xl" color={genderColor} variant="filled">
          {getInitials(patient)}
        </Avatar>

        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" align="center">
            <Title order={3}>{name}</Title>
            {patient.gender && (
              <Badge color={genderColor} variant="light" size="lg">
                {patient.gender}
              </Badge>
            )}
            {patient.active === false && (
              <Badge color="red" variant="filled" size="sm">Inactive</Badge>
            )}
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
            {patient.birthDate && (
              <Group gap={6}>
                <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  Born {patient.birthDate}
                  {age && ` (${age})`}
                </Text>
              </Group>
            )}

            {patient.id && (
              <Group gap={6}>
                <IconUser size={14} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  ID: <Code>{patient.id}</Code>
                </Text>
              </Group>
            )}

            {identifiers.length > 0 && (
              <Group gap={6}>
                <IconId size={14} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  {identifiers[0].system?.replace('urn:', '') ?? 'ID'}:{' '}
                  <Code>{identifiers[0].value}</Code>
                </Text>
              </Group>
            )}
          </SimpleGrid>

          {identifiers.length > 1 && (
            <Group gap="xs" mt={4}>
              {identifiers.slice(1).map((ident, i) => (
                <Badge key={i} variant="outline" size="sm" color="gray">
                  {ident.value}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>

        <PatientHeaderActions patient={patient} />
      </Group>
    </Card>
  );
}

/**
 * Action column shown on the right of PatientHeaderCard (Phase 30 Step 6).
 * - Raw JSON button opens a Modal with the pretty-printed Patient resource.
 * - $everything button navigates the browser to
 *   `{fhirUrlPath}/Patient/{id}/$everything` in a new tab — the FHIR
 *   server's native bundle response is handy for debugging/export.
 */
function PatientHeaderActions({ patient }: { patient: Patient }) {
  const [rawOpen, setRawOpen] = useState(false);
  const json = JSON.stringify(patient, null, 2);

  return (
    <Group gap="xs" align="flex-start" wrap="nowrap" style={{ flexShrink: 0 }}>
      <Tooltip label="View raw JSON" withArrow>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconBraces size={14} />}
          onClick={() => setRawOpen(true)}
          aria-label="View raw patient JSON"
        >
          Raw JSON
        </Button>
      </Tooltip>
      <Tooltip label="Open $everything bundle" withArrow>
        <ActionIcon
          variant="light"
          size="lg"
          aria-label="Open Patient $everything in a new tab"
          onClick={() => {
            if (!patient.id) return;
            const base = window.location.origin;
            window.open(
              `${base}/__fhir-passthrough/Patient/${patient.id}/$everything`,
              '_blank',
              'noopener',
            );
          }}
        >
          <IconShareplay size={16} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={rawOpen}
        onClose={() => setRawOpen(false)}
        title={`Raw JSON — Patient/${patient.id}`}
        size="lg"
      >
        <Code block fz="xs" style={{ maxHeight: 500, overflowY: 'auto' }}>
          {json}
        </Code>
      </Modal>
    </Group>
  );
}
