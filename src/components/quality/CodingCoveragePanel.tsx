// STUB: replaced in Wave 2 Plan 05-04 (Coding Coverage).
// Keep prop signature stable: { types, client, sampleSize } — Plan 05-04
// will overwrite this file with the real implementation.
import { Text } from '@mantine/core';
import type { MedplumClient } from '@medplum/core';

export interface CodingCoveragePanelProps {
  types: string[];
  client: MedplumClient;
  sampleSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CodingCoveragePanel(_props: CodingCoveragePanelProps) {
  return (
    <Text c="dimmed" data-testid="stub-CodingCoveragePanel">
      Coming in Plan 05-04
    </Text>
  );
}
