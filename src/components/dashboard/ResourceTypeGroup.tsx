import { SimpleGrid, Text } from '@mantine/core';
import type { ParsedResourceType } from '../../fhir/capability';
import { ResourceTypeRow } from './ResourceTypeRow';

interface ResourceTypeGroupProps {
  category: string;
  resourceTypes: ParsedResourceType[];
  counts: Record<string, number | 'loading' | 'error'>;
}

export function ResourceTypeGroup({ category, resourceTypes, counts }: ResourceTypeGroupProps) {
  return (
    <div>
      <Text fw={600} size="xl" mb="xs">
        {category}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {resourceTypes.map(rt => (
          <ResourceTypeRow
            key={rt.type}
            resourceType={rt}
            count={counts[rt.type] ?? 'loading'}
          />
        ))}
      </SimpleGrid>
    </div>
  );
}
