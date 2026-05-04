import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { JsonTreeView } from './JsonTreeView';

export interface DeveloperJsonViewProps {
  resource: Resource;
}

/**
 * Developer/JSON display mode with a collapsible JSON tree.
 *
 * Top-level keys are expanded by default. Nested objects and arrays
 * can be expanded/collapsed by clicking. Leaf values are color-coded.
 */
export function DeveloperJsonView({ resource }: DeveloperJsonViewProps) {
  return (
    <ScrollArea h="calc(100vh - 250px)">
      <JsonTreeView data={resource} />
    </ScrollArea>
  );
}
