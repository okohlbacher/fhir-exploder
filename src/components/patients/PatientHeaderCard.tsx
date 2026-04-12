import { Avatar, Badge, Card, Code, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconCalendar, IconId, IconUser } from '@tabler/icons-react';
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
      <Group wrap="nowrap" gap="lg">
        <Avatar size={72} radius="xl" color={genderColor} variant="filled">
          {getInitials(patient)}
        </Avatar>

        <Stack gap={4} style={{ flex: 1 }}>
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
      </Group>
    </Card>
  );
}
