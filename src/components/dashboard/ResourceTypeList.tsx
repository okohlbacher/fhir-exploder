import { Accordion, Stack, Text, Title } from '@mantine/core';
import type { ParsedResourceType } from '../../fhir/capability';
import { groupByCategory, CATEGORY_ORDER } from '../../utils/fhir-categories';
import { ResourceTypeGroup } from './ResourceTypeGroup';

interface ResourceTypeListProps {
  resourceTypes: ParsedResourceType[];
  counts: Record<string, number | 'loading' | 'error'>;
}

export function ResourceTypeList({ resourceTypes, counts }: ResourceTypeListProps) {
  if (resourceTypes.length === 0) {
    return (
      <Stack align="center" py="xl">
        <Title order={3}>No Resource Types Found</Title>
        <Text c="dimmed">
          The server returned an empty CapabilityStatement. Verify the server has data loaded.
        </Text>
      </Stack>
    );
  }

  const grouped = groupByCategory(resourceTypes);

  // Order groups by CATEGORY_ORDER, then append any categories not in the order
  const orderedCategories = CATEGORY_ORDER.filter(cat => grouped.has(cat));
  for (const cat of grouped.keys()) {
    if (!orderedCategories.includes(cat)) {
      orderedCategories.push(cat);
    }
  }

  return (
    <Accordion multiple defaultValue={orderedCategories} variant="separated">
      {orderedCategories.map(category => {
        const types = grouped.get(category)!;
        return (
          <Accordion.Item key={category} value={category}>
            <Accordion.Control>
              <Text fw={600} size="lg">
                {category} ({types.length})
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <ResourceTypeGroup
                category={category}
                resourceTypes={types}
                counts={counts}
              />
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
