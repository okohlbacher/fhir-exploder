import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { JsonSyntaxHighlight } from './JsonSyntaxHighlight';

export interface DeveloperJsonViewProps {
  resource: Resource;
}

/**
 * Developer/JSON display mode with full syntax-highlighted JSON.
 *
 * Shows the complete FHIR resource as pretty-printed, color-coded JSON.
 * Wrapped in a scrollable area for large resources.
 */
export function DeveloperJsonView({ resource }: DeveloperJsonViewProps) {
  return (
    <ScrollArea h="calc(100vh - 250px)">
      <JsonSyntaxHighlight data={resource} />
    </ScrollArea>
  );
}
