// STUB: replaced in Wave 2 Plan 05-05 (Profile Validation).
// Keep prop signature stable: { client, sampleSize } — Plan 05-05
// will overwrite this file with the real implementation.
import { Text } from '@mantine/core';
import type { MedplumClient } from '@medplum/core';

export interface ValidationPanelProps {
  client: MedplumClient;
  sampleSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ValidationPanel(_props: ValidationPanelProps) {
  return (
    <Text c="dimmed" data-testid="stub-ValidationPanel">
      Coming in Plan 05-05
    </Text>
  );
}
