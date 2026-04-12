// STUB: replaced in Wave 2 Plan 05-03 (Completeness).
// Keep prop signature stable: { types, client, sampleSize } — Plan 05-03
// will overwrite this file with the real implementation.
import { Text } from '@mantine/core';
import type { MedplumClient } from '@medplum/core';

export interface CompletenessPanelProps {
  types: string[];
  client: MedplumClient;
  sampleSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CompletenessPanel(_props: CompletenessPanelProps) {
  return (
    <Text c="dimmed" data-testid="stub-CompletenessPanel">
      Coming in Plan 05-03
    </Text>
  );
}
