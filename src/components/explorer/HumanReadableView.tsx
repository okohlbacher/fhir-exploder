import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { useResolvedResource } from '../../hooks/useResolvedResource';
import { ResourcePropertyTable } from './ResourcePropertyTable';

export interface HumanReadableViewProps {
  resource: Resource;
}

/**
 * Human-readable display mode using a custom ResourcePropertyTable.
 *
 * Renders all properties of a FHIR resource in a structured table
 * with proper data type formatting (HumanName, CodeableConcept, etc.).
 *
 * Wraps the resource in {@link useResolvedResource} so Coding.display
 * values are progressively enriched from the terminology server without
 * spinners or layout shift (D-12 / UI-SPEC C-3). On resolver failure
 * the raw `resource` remains visible (TERM-03 / V-14).
 */
export function HumanReadableView({ resource }: HumanReadableViewProps) {
  const resolved = useResolvedResource(resource);
  return (
    <ScrollArea h="calc(100vh - 250px)">
      <ResourcePropertyTable resource={resolved ?? resource} />
    </ScrollArea>
  );
}
