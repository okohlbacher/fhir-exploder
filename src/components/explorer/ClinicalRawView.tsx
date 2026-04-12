import { ResourceTable } from '@medplum/react';
import { Grid, ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { JsonSyntaxHighlight } from './JsonSyntaxHighlight';
import { useResolvedResource } from '../../hooks/useResolvedResource';

export interface ClinicalRawViewProps {
  resource: Resource;
}

/**
 * Clinical + Raw split display mode.
 *
 * Left panel: Medplum ResourceTable rendering (human-friendly), wrapped
 *   in {@link useResolvedResource} so Coding.display values resolve to
 *   terminology-server displays (German designations preferred).
 * Right panel: Syntax-highlighted JSON of the **unenriched** resource
 *   so the developer always sees exactly what the FHIR server returned
 *   over the wire (UI-SPEC C-3, Cross-View Consistency).
 * Both panels scroll independently.
 */
export function ClinicalRawView({ resource }: ClinicalRawViewProps) {
  const resolved = useResolvedResource(resource);
  return (
    <Grid>
      <Grid.Col span={6}>
        <ScrollArea h="calc(100vh - 250px)">
          <ResourceTable value={resolved ?? resource} />
        </ScrollArea>
      </Grid.Col>
      <Grid.Col span={6}>
        <ScrollArea h="calc(100vh - 250px)">
          <JsonSyntaxHighlight data={resource} />
        </ScrollArea>
      </Grid.Col>
    </Grid>
  );
}
