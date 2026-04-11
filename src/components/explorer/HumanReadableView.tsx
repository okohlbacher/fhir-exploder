import { ResourceTable } from '@medplum/react';
import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';

export interface HumanReadableViewProps {
  resource: Resource;
}

/**
 * Human-readable display mode using Medplum's ResourceTable.
 *
 * Renders all properties of a FHIR resource in a structured table
 * with proper data type formatting (HumanName, CodeableConcept, etc.).
 */
export function HumanReadableView({ resource }: HumanReadableViewProps) {
  return (
    <ScrollArea h="calc(100vh - 250px)">
      <ResourceTable value={resource} />
    </ScrollArea>
  );
}
