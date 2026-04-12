import { ResourceTable } from '@medplum/react';
import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { useResolvedResource } from '../../hooks/useResolvedResource';

export interface HumanReadableViewProps {
  resource: Resource;
}

/**
 * Human-readable display mode using Medplum's ResourceTable.
 *
 * Renders all properties of a FHIR resource in a structured table
 * with proper data type formatting (HumanName, CodeableConcept, etc.).
 *
 * Wraps the resource in {@link useResolvedResource} so Coding.display
 * values are progressively enriched from the terminology server without
 * spinners or layout shift (D-12 / UI-SPEC C-3). On resolver failure
 * the raw `resource` remains visible and Medplum's native formatter
 * falls back to the code (TERM-03 / V-14).
 */
export function HumanReadableView({ resource }: HumanReadableViewProps) {
  const resolved = useResolvedResource(resource);
  return (
    <ScrollArea h="calc(100vh - 250px)">
      <ResourceTable value={resolved ?? resource} />
    </ScrollArea>
  );
}
