import { Badge, Group, Loader, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { ParsedResourceType } from '../../fhir/capability';

interface ResourceTypeRowProps {
  resourceType: ParsedResourceType;
  count: number | 'loading' | 'error';
}

export function ResourceTypeRow({ resourceType, count }: ResourceTypeRowProps) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs" py={4}>
      <Text
        component={Link}
        to={`/explorer/${resourceType.type}`}
        c="blue"
        fw={500}
        size="sm"
        style={{ textDecoration: 'none' }}
      >
        {resourceType.type}
      </Text>

      <Group gap="xs" wrap="nowrap">
        {count === 'loading' && <Loader size="xs" />}
        {count === 'error' && (
          <Badge color="red" size="sm" variant="light">
            Error
          </Badge>
        )}
        {typeof count === 'number' && (
          <Badge color="blue" size="sm" variant="light">
            {count.toLocaleString()}
          </Badge>
        )}

        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {resourceType.searchParams.length} search params
        </Text>
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {resourceType.operations.length} operations
        </Text>
      </Group>
    </Group>
  );
}
