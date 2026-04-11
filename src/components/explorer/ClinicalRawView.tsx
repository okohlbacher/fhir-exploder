import { ResourceTable } from '@medplum/react';
import { Grid, ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { JsonSyntaxHighlight } from './JsonSyntaxHighlight';

export interface ClinicalRawViewProps {
  resource: Resource;
}

/**
 * Clinical + Raw split display mode.
 *
 * Left panel: Medplum ResourceTable rendering (human-friendly).
 * Right panel: Syntax-highlighted JSON (developer-friendly).
 * Both panels scroll independently.
 */
export function ClinicalRawView({ resource }: ClinicalRawViewProps) {
  return (
    <Grid>
      <Grid.Col span={6}>
        <ScrollArea h="calc(100vh - 250px)">
          <ResourceTable value={resource} />
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
